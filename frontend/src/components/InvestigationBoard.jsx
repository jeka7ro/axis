import React, { useRef, useMemo, useState, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide, forceX, forceY } from 'd3-force-3d';
import { jsPDF } from 'jspdf';
import { 
  X, Maximize2, Minimize2, ZoomIn, ZoomOut, Target, Shield, FileDown, 
  Search, Building2, User, ExternalLink, GitBranch, Plus, Loader2, RotateCcw,
  Users, CheckCircle2, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { fetchCompanyFullIntel, fetchPersonFullIntel } from '../services/api';

const THEMES = {
  dark: {
    company: { bg: '#080e1e', border: '#38bdf8', text: '#ffffff', subtext: '#94a3b8', badge: '#0284c7', abbr: 'SUBIECT', label: 'SUBIECT PRINCIPAL • VEDETĂ ANCHETĂ' },
    related_company: { bg: '#081c24', border: '#06b6d4', text: '#ecfeff', subtext: '#67e8f9', badge: '#0891b2', abbr: 'CO', label: 'FIRMĂ DIN REȚEA' },
    person: { bg: '#13112c', border: '#818cf8', text: '#f5f3ff', subtext: '#a5b4fc', badge: '#4f46e5', abbr: 'PERS', label: 'CONDUCERE / ASOCIAT' },
    person_historical: { bg: '#0f172a', border: '#475569', text: '#94a3b8', subtext: '#64748b', badge: '#334155', abbr: 'FOST', label: 'FOST MANDAT' },
    address: { bg: '#061a14', border: '#10b981', text: '#ecfdf5', subtext: '#6ee7b7', badge: '#059669', abbr: 'SEDIU', label: 'SEDIU SOCIAL' },
    risk: { bg: '#450a0a', border: '#dc2626', text: '#fca5a5', subtext: '#ef4444', badge: '#991b1b', abbr: 'RISC', label: 'ALERTĂ RISC' },
  },
  light: {
    company: { bg: '#ffffff', border: '#1d4ed8', text: '#0f172a', subtext: '#1e3a8a', badge: '#1d4ed8', abbr: 'SUBIECT', label: 'SUBIECT PRINCIPAL • VEDETĂ ANCHETĂ' },
    related_company: { bg: '#ffffff', border: '#0891b2', text: '#0f172a', subtext: '#0e7490', badge: '#0891b2', abbr: 'CO', label: 'FIRMĂ DIN REȚEA' },
    person: { bg: '#ffffff', border: '#4f46e5', text: '#0f172a', subtext: '#4338ca', badge: '#4f46e5', abbr: 'PERS', label: 'CONDUCERE / ASOCIAT' },
    person_historical: { bg: '#f8fafc', border: '#94a3b8', text: '#475569', subtext: '#64748b', badge: '#64748b', abbr: 'FOST', label: 'FOST MANDAT' },
    address: { bg: '#ffffff', border: '#059669', text: '#0f172a', subtext: '#047857', badge: '#059669', abbr: 'SEDIU', label: 'SEDIU SOCIAL' },
    risk: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b', subtext: '#b91c1c', badge: '#dc2626', abbr: 'RISC', label: 'ALERTĂ RISC' },
  },
};

function formatCleanRoles(rawRoles, percent) {
  if (!rawRoles) {
    if (percent === 100) return 'Asociat Unic (100%)';
    if (percent > 0) return `Asociat (${percent}%)`;
    return 'Conducere';
  }
  const parts = String(rawRoles)
    .split('/')
    .map(r => r.trim())
    .filter(Boolean);

  const seen = new Set();
  const cleaned = [];

  for (const part of parts) {
    const upper = part.toUpperCase().replace(/\s+/g, ' ');
    if (upper === 'ASOCIAT SI ADMINISTRATOR' && (seen.has('ADMINISTRATOR') || seen.has('ASOCIAT') || percent > 0)) {
      continue;
    }
    if (!seen.has(upper)) {
      seen.add(upper);
      cleaned.push(part);
    }
  }

  return cleaned.join(' • ') || rawRoles;
}

export function formatMoneyShort(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return null;
  const num = Number(amount);
  const abs = Math.abs(num);
  if (abs >= 1000000000) return (num / 1000000000).toFixed(1) + ' mld';
  if (abs >= 1000000) return (num / 1000000).toFixed(1) + ' mil';
  if (abs >= 1000) return (num / 1000).toFixed(0) + 'k';
  return String(num);
}

const NODE_DIMENSIONS = {
  company: { w: 206, h: 92 }, // Vedetă VIP card cu bilanț & angajați & buton extindere
  related_company: { w: 146, h: 76 }, // Firmă din rețea cu indicatori financiari & buton extindere rețea
  person: { w: 138, h: 68 }, // Persoană / conducere cu indicatori & buton extindere firme
  person_historical: { w: 138, h: 68 },
  address: { w: 114, h: 44 }, // Compact & discrete sediu
  risk: { w: 72, h: 28 }, // Sleek, compact mini-tag for risk
};

const NODE_COLLISION_RADIUS = {
  company: 148,
  related_company: 106,
  person: 100,
  person_historical: 100,
  address: 65,
  risk: 50,
};

function normalizePersonName(name) {
  if (!name) return '';
  return name
    .trim()
    .toUpperCase()
    .replace(/[-_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function formatPersonDisplayName(rawName) {
  if (!rawName) return '';
  const clean = rawName.trim().replace(/[-_.]/g, ' ').replace(/\s+/g, ' ');
  return clean
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getCompanyNodeId(cui, name) {
  const clean = String(cui || '').replace(/\D/g, '');
  if (clean) return `comp_${clean}`;
  return `comp_${(name || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
}

function parseAddressDisplay(rawAddress) {
  if (!rawAddress) return { line1: 'Sediu Social Înregistrat', line2: 'Adresă Oficială' };

  const clean = rawAddress.replace(/[«»"'„”]/g, '').trim().replace(/\s+/g, ' ');

  const streetMatch = clean.match(/(?:STR\.|STRADA|BD\.|BULEVARDUL|CALEA|SOSEAUA|SOS\.|P-TA|PTA|PIATA|ALEEA|INTR\.|INTR)\s+[^,]+(?:,\s*(?:NR\.|NUMARUL)?\s*[^,]+)?/i);

  let line1 = '';
  let line2 = '';

  if (streetMatch) {
    line1 = streetMatch[0].trim();
    const roomMatch = clean.match(/(?:BL\.|BLOC|SC\.|SCARA|ET\.|ETAJ|AP\.|APART|CAM\.|CAMERA|BIR\.|BIROUL)\s*[^,]+/i);
    if (roomMatch && !line1.includes(roomMatch[0])) {
      line1 += ', ' + roomMatch[0].trim();
    }

    const secMatch = clean.match(/SECTOR(?:UL)?\s*\d+/i);
    if (secMatch) {
      line2 = 'București, ' + secMatch[0].replace(/UL/i, '');
    } else {
      const cityMatch = clean.match(/(?:MUNICIPIUL|ORAS|COMUNA|JUDETUL|JUD\.)\s+([A-Z\s\-]+?)(?:,|$)/i);
      line2 = cityMatch ? cityMatch[0].trim() : 'România';
    }
  } else {
    const parts = clean.split(',').map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      line1 = parts[parts.length - 2] + ', ' + parts[parts.length - 1];
      line2 = parts.slice(0, parts.length - 2).join(', ');
    } else {
      line1 = clean.slice(0, 36);
      line2 = clean.slice(36, 72);
    }
  }

  return {
    line1: line1 || clean.slice(0, 36),
    line2: line2 || ''
  };
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    const r = typeof radius === 'number' ? radius : Array.isArray(radius) ? radius[0] : 4;
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }
}

function buildGraph(rawData, clientName, clientCui) {
  const nodes = [];
  const links = [];
  const nodeIds = new Set();
  const linkKeys = new Set();

  const addNode = (id, label, type, extra = {}) => {
    if (nodeIds.has(id)) {
      // Merge extra details into existing node
      const n = nodes.find(item => item.id === id);
      if (n) {
        Object.assign(n, extra);
        if (!n.label && label) n.label = label;
      }
      return;
    }
    nodeIds.add(id);
    nodes.push({ id, label, type, ...extra });
  };

  const addLink = (source, target, label = '', type = 'default') => {
    if (!source || !target || source === target) return;
    const key1 = `${source}->${target}`;
    const key2 = `${target}->${source}`;
    if (linkKeys.has(key1) || linkKeys.has(key2)) return;
    linkKeys.add(key1);
    links.push({ source, target, label, type });
  };

  const cleanClientCui = String(clientCui || '').replace(/\D/g, '');
  const companyId = getCompanyNodeId(cleanClientCui, clientName);
  const anaf = rawData.anaf || {};
  const addrCheck = rawData.address_check || {};
  const fullAddress = anaf.adresa || addrCheck.address;

  // Detectăm starea reală a societății (Activă / Radiată / În faliment)
  let clientStare = rawData.stare || anaf.stare || anaf.status || rawData.fiscal_status || '';
  if (!clientStare && Array.isArray(rawData.admin_networks)) {
    for (const net of rawData.admin_networks) {
      const match = (net.firme || []).find(f => String(f.cui || '').replace(/\D/g, '') === cleanClientCui);
      if (match && match.stare) {
        clientStare = match.stare;
        break;
      }
    }
  }

  const hasLiquidatorAdmins = (rawData.administrators || []).some(a => 
    String(a.calitate || a.functie || a.rol || '').toLowerCase().includes('lichidator')
  );

  if (!clientStare && hasLiquidatorAdmins) {
    clientStare = 'LICHIDARE JUDICIARĂ (FALIMENT)';
  }

  const isCompanyTerminated = String(clientStare || '').toUpperCase().includes('RADIAT') || 
                              String(clientStare || '').toUpperCase().includes('RADIER') ||
                              String(clientStare || '').toUpperCase().includes('FALIMENT') ||
                              String(clientStare || '').toUpperCase().includes('LICHID') ||
                              hasLiquidatorAdmins;

  // 1. ROOT NODE: VEDETA INVESTIGAȚIEI (Subiectul Principal - ancorat în centrul absolut 0, 0)
  const rootBal = rawData.balance || {};
  const rootAng = rootBal.angajati !== undefined && rootBal.angajati !== null
    ? rootBal.angajati
    : (rootBal.numar_angajati !== undefined ? rootBal.numar_angajati : (rootBal.salariati !== undefined ? rootBal.salariati : null));

  addNode(companyId, clientName || 'Companie Investigată', 'company', {
    cui: clientCui,
    isRoot: true,
    fx: 0,
    fy: 0,
    x: 0,
    y: 0, // Ancorată stabil în centrul absolut (0, 0)
    stare: clientStare || (isCompanyTerminated ? 'Radiată din data 24.05.2018' : 'Activ'),
    isTerminated: isCompanyTerminated,
    telefon: (anaf.telefon && anaf.telefon !== 'Nespecificat') ? anaf.telefon : null,
    an_infiintare: anaf.an_infiintare || (anaf.data_inregistrare ? anaf.data_inregistrare.slice(0, 4) : null),
    balance: rootBal,
    angajati: rootAng,
    cifra_afaceri: rootBal.cifra_afaceri,
    profit_net: rootBal.profit_net,
    pierdere_neta: rootBal.pierdere_neta,
    an_bilant: rootBal.an,
  });

  let addrId = null;

  // 2. SEDIU SOCIAL (ADRESĂ SECUNDARĂ DISCRETĂ - ARIPA STÂNGĂ)
  if (fullAddress) {
    addrId = 'addr_main';
    const parsed = parseAddressDisplay(fullAddress);
    addNode(addrId, parsed.line1, 'address', {
      full: fullAddress,
      addrLine1: parsed.line1,
      addrLine2: parsed.line2,
      clusterCount: addrCheck.cluster_count || (addrCheck.companies ? addrCheck.companies.length : 1),
      x: -280,
      y: 0, // Aripa stângă orizontală
    });
    // Din VEDETĂ duce firul direct spre Sediu Social
    addLink(companyId, addrId, 'SEDIU SOCIAL', 'primary');
  }

  // 3. FIRME CONEXE DIN CLUSTERUL DE LA SEDIU (Satelit organizat în coloane pe aripa stângă)
  const clusterCompanies = addrCheck.companies || [];
  const totalCluster = Math.min(clusterCompanies.length, 15);
  clusterCompanies.slice(0, 15).forEach((comp, idx) => {
    const cuiClean = String(comp.cui || '').replace(/\D/g, '');
    if (cuiClean && cuiClean === cleanClientCui) return;

    const rawCompName = comp.denumire || comp.name || comp.nume || comp.company_name || '';
    if (rawCompName && rawCompName.trim().toUpperCase() === (clientName || '').trim().toUpperCase()) return;

    const relId = getCompanyNodeId(cuiClean, rawCompName || `Firma_Cluster_${idx}`);
    const name = rawCompName || (comp.cui ? `Companie (CUI ${comp.cui})` : `Firmă Conexă ${idx + 1}`);
    const shortName = name.length > 22 ? name.slice(0, 19) + '...' : name;

    const stare = comp.stare || comp.status || 'Sediu Comun';
    const anInfiintare = comp.an_infiintare || (comp.data_inregistrare ? String(comp.data_inregistrare).slice(0, 4) : null);
    
    let room = comp.camera ? `Camera ${comp.camera}` : comp.birou ? `Biroul ${comp.birou}` : comp.etaj ? `Etaj ${comp.etaj}` : null;
    if (!room && comp.adresa) {
      const roomMatch = comp.adresa.match(/(?:CAMERA|CAM\.|BIROU|BIROUL|BIR\.|ETAJ|ET\.|AP\.|APARTAMENT)\s*[^,]+/i);
      if (roomMatch) room = roomMatch[0].trim();
    }

    // Dispunere în două coloane orizontale la stânga adresei
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const numRows = Math.ceil(totalCluster / 2) || 1;
    const initX = col === 0 ? -460 : -620;
    const initY = (row - (numRows - 1) / 2) * 56;

    const compBal = comp.balance || {};
    const compAng = comp.angajati !== undefined && comp.angajati !== null
      ? comp.angajati
      : (compBal.angajati !== undefined ? compBal.angajati : (compBal.numar_angajati !== undefined ? compBal.numar_angajati : (compBal.salariati !== undefined ? compBal.salariati : null)));

    addNode(relId, shortName, 'related_company', {
      cui: comp.cui,
      fullName: name,
      stare: stare,
      an_infiintare: anInfiintare,
      room: room,
      relation: 'Sediu Comun',
      fullAddr: comp.adresa || fullAddress,
      balance: compBal,
      angajati: compAng,
      cifra_afaceri: comp.cifra_afaceri || compBal.cifra_afaceri,
      profit_net: comp.profit_net || compBal.profit_net,
      pierdere_neta: comp.pierdere_neta || compBal.pierdere_neta,
      an_bilant: comp.an_bilant || compBal.an,
      x: initX,
      y: initY,
    });

    // Firul pleacă de la nodul SEDIU spre firmele care stau la aceeași adresă
    if (addrId) {
      let branchLabel = 'SEDIU COMUN';
      if (comp.birou) branchLabel = `BIROUL ${comp.birou}`;
      else if (comp.camera) branchLabel = `CAMERA ${comp.camera}`;
      else if (comp.etaj) branchLabel = `ET.${comp.etaj}`;
      else if (room) branchLabel = room.toUpperCase();
      addLink(addrId, relId, branchLabel, 'address_branch');
    } else {
      addLink(companyId, relId, 'SEDIU COMUN', 'address_branch');
    }
  });

  // 4. PERSOANE & ASOCIAȚI (ACȚIONARI, ASOCIAȚI, ADMINISTRATORI, REȚELE) - DEDUPLICARE STRICTĂ
  const personnel = rawData.personnel || [];
  const administrators = rawData.administrators || [];
  const adminNetworks = rawData.admin_networks || [];
  const holdings = rawData.holdings || [];
  const directAsociati = rawData.asociati || rawData.shareholders || [];

  const personMap = new Map();

  const upsertPerson = (rawName, extra = {}) => {
    if (!rawName) return;
    const normKey = normalizePersonName(rawName);
    if (!normKey || normKey === 'NESPECIFICAT' || normKey === 'INCOGNITO') return;

    if (!personMap.has(normKey)) {
      personMap.set(normKey, {
        normKey,
        rawName,
        displayName: formatPersonDisplayName(rawName),
        roles: new Set(),
        percent: 0,
        age: null,
        birthplace: null,
        stare: extra.stare || 'Activ',
        isHistorical: !!extra.isHistorical,
        mandatPeriod: extra.mandatPeriod || null,
        firme: [],
        isAsociat: false,
        hasDirectClientRole: false,
      });
    }

    const p = personMap.get(normKey);
    if (extra.hasDirectClientRole) p.hasDirectClientRole = true;
    if (extra.role) p.roles.add(extra.role);
    if (extra.roles && Array.isArray(extra.roles)) {
      extra.roles.forEach(r => p.roles.add(r));
    }
    if (extra.percent !== undefined && Number(extra.percent) > p.percent) {
      p.percent = Number(extra.percent);
    }
    if (extra.isAsociat || p.percent > 0) {
      p.isAsociat = true;
    }
    if (extra.age && !p.age) p.age = extra.age;
    if (extra.birthplace && !p.birthplace) p.birthplace = extra.birthplace;
    if (extra.mandatPeriod && !p.mandatPeriod) p.mandatPeriod = extra.mandatPeriod;
    if (extra.isHistorical !== undefined) {
      if (extra.isHistorical) p.isHistorical = true;
    }
    if (extra.stare) {
      if (extra.stare === 'Istoric' || extra.stare === 'Mandat Încheiat' || extra.stare === 'Inactiv') {
        p.stare = extra.stare;
        p.isHistorical = true;
      } else if (!p.isHistorical) {
        p.stare = extra.stare;
      }
    }
    if (extra.firme && Array.isArray(extra.firme)) {
      extra.firme.forEach(f => {
        if (!p.firme.some(existing => (existing.cui && existing.cui === f.cui) || (existing.denumire && existing.denumire === f.denumire))) {
          p.firme.push(f);
        }
      });
    }
  };

  // Colectăm din holdings oficial (sursă primară pentru asociați & acționari cu cote exacte)
  holdings.forEach((h) => {
    const raw = h.name || h.nume;
    if (!raw) return;
    const percent = Number(h.percent || h.cota_participare || 0);
    const isCompanyShareholder = h.entity === 'PJ' || (h.type && h.type.includes('(PJ)'));
    const isCurrent = h.current !== false && (!h.to || h.to === null);

    if (isCompanyShareholder) {
      // Holding / Persoană Juridică Asociată
      const cuiClean = String(h.cui || '').replace(/\D/g, '');
      const corpId = getCompanyNodeId(cuiClean, raw);
      addNode(corpId, raw.length > 20 ? raw.slice(0, 18) + '...' : raw, 'related_company', {
        fullName: raw,
        cui: h.cui,
        stare: isCurrent ? 'Activ' : 'Istoric',
        relation: percent > 0 ? `Acționar PJ (${percent}%)` : 'Acționar Persoană Juridică',
      });
      addLink(corpId, companyId, percent > 0 ? `${percent}% ACȚIUNI (PJ)` : 'ASOCIAT PJ', isCurrent ? 'primary' : 'primary_historical');
    } else {
      const roles = [];
      const isAsoc = h.type?.includes('ASOCIAT') || percent > 0 || h.is_shareholder;
      if (isAsoc) {
        roles.push(percent === 100 ? 'Asociat Unic (100%)' : percent > 0 ? `Asociat (${percent}%)` : 'Asociat');
      }
      if (h.is_administrator || h.type?.includes('ADMINISTRATOR')) {
        roles.push(isCurrent ? 'Administrator' : 'Fost Administrator');
      }
      if (roles.length === 0 && h.type) roles.push(h.type);

      const mandatPeriod = h.to ? (h.from ? `${String(h.from).slice(0, 4)}-${String(h.to).slice(0, 4)}` : String(h.to).slice(0, 4)) : null;

      upsertPerson(raw, {
        roles,
        percent,
        isAsociat: true,
        isHistorical: !isCurrent,
        mandatPeriod,
        birthplace: h.placeofbirth || h.loc_nastere,
        stare: isCurrent ? 'Activ' : 'Istoric',
        hasDirectClientRole: true,
      });
    }
  });

  // Colectăm din directAsociati (dacă există separat)
  directAsociati.forEach((a) => {
    const raw = typeof a === 'string' ? a : a.nume || a.name;
    if (!raw) return;
    const percent = typeof a === 'object' ? Number(a.cota_participare || a.percent || 0) : 0;
    const roles = [percent === 100 ? 'Asociat Unic (100%)' : percent > 0 ? `Asociat (${percent}%)` : 'Asociat'];
    upsertPerson(raw, {
      roles,
      percent,
      isAsociat: true,
      stare: 'Activ',
      hasDirectClientRole: true,
    });
  });

  // Colectăm din personnel oficial
  personnel.forEach((p) => {
    const raw = p.nume || p.name;
    const roles = [];
    const percent = Number(p.cota_participare || p.percent || 0);
    const isAsoc = p.este_asociat || p.type?.includes('ASOCIAT') || percent > 0;
    const isCurrent = (p.stare === 'Activ' || !p.stare) && !p.data_sfarsit;
    if (isAsoc) {
      roles.push(percent === 100 ? 'Asociat Unic (100%)' : percent > 0 ? `Asociat (${percent}%)` : 'Asociat');
    }
    if (p.este_administrator || p.is_administrator || p.rol?.toLowerCase().includes('admin')) {
      roles.push(isCurrent ? 'Administrator' : 'Fost Administrator');
    }
    if (roles.length === 0 && p.rol) roles.push(p.rol);

    upsertPerson(raw, {
      roles,
      percent,
      isAsociat: isAsoc,
      isHistorical: !isCurrent,
      mandatPeriod: p.data_sfarsit ? String(p.data_sfarsit).slice(0, 4) : null,
      stare: isCurrent ? 'Activ' : 'Istoric',
      hasDirectClientRole: true,
    });
  });

  // Colectăm din administrators
  administrators.forEach((a) => {
    const raw = typeof a === 'string' ? a : a.nume || a.name;
    const rawFunctie = (typeof a === 'object' && (a.functie || a.calitate || a.rol)) ? String(a.functie || a.calitate || a.rol).trim() : '';
    const lower = rawFunctie.toLowerCase();
    const isLiquidator = lower.includes('lichidator');
    const isJudiciar = lower.includes('administrator judiciar') || lower.includes('admin judiciar');

    let stare = 'Activ';
    let isHist = false;

    if (isCompanyTerminated) {
      stare = isLiquidator ? 'Mandat Lichidare' : (isJudiciar ? 'Mandat Judiciar' : 'Mandat Încheiat (Radiere)');
      isHist = true;
    } else {
      stare = (typeof a === 'object' && a.stare) ? a.stare : 'Activ';
      isHist = stare === 'Istoric' || stare === 'Inactiv' || stare === 'Mandat Încheiat';
    }

    let roleTitle = isHist ? 'Fost Administrator' : 'Administrator';
    if (rawFunctie) {
      if (isLiquidator) {
        roleTitle = isCompanyTerminated ? 'Lichidator Judiciar (Faliment)' : 'Lichidator Judiciar';
      } else if (isJudiciar) {
        roleTitle = isCompanyTerminated ? 'Administrator Judiciar (Faliment)' : 'Administrator Judiciar';
      } else if (lower.includes('reprezentant')) {
        roleTitle = isCompanyTerminated ? 'Reprezentant Legal (Radiere)' : 'Reprezentant PJ';
      } else {
        roleTitle = rawFunctie.charAt(0).toUpperCase() + rawFunctie.slice(1);
      }
    }
    upsertPerson(raw, { 
      role: roleTitle, 
      stare, 
      isHistorical: isHist, 
      hasDirectClientRole: true,
      calitate: rawFunctie || roleTitle,
      mandatPeriod: isCompanyTerminated ? 'Faliment' : null
    });
  });

  // Colectăm din admin_networks (caracatiță)
  adminNetworks.forEach((an) => {
    let clientRole = null;
    let clientPercent = 0;
    let isHistoricalInClient = false;
    let clientMandatPeriod = null;

    (an.firme || []).forEach(f => {
      const fCui = String(f.cui || '').replace(/\D/g, '');
      const fName = (f.denumire || f.name || '').trim().toUpperCase();
      if ((fCui && fCui === cleanClientCui) || (fName && fName === (clientName || '').trim().toUpperCase())) {
        if (f.rol) clientRole = f.rol;
        if (f.procent) clientPercent = Number(f.procent);

        if (f.curent === false || !!f.pana_la || (f.stare && f.stare.toLowerCase().includes('incetat')) || (f.rol && f.rol.toLowerCase().includes('fost'))) {
          isHistoricalInClient = true;
          const yTo = f.pana_la ? String(f.pana_la).slice(0, 4) : null;
          const yFrom = f.de_la ? String(f.de_la).slice(0, 4) : null;
          clientMandatPeriod = yTo ? (yFrom && yFrom !== yTo ? `${yFrom}-${yTo}` : yTo) : 'Istoric';
        }
      }
    });

    if (an.firme_active === 0 && (an.firme_incetate > 0 || an.total_firme > 0)) {
      isHistoricalInClient = true;
    }

    const hasClientRole = Boolean(clientRole);
    const extraRoles = [];
    if (clientRole) {
      if (isHistoricalInClient && !clientRole.toLowerCase().includes('fost')) {
        extraRoles.push(`Fost ${clientRole}`);
      } else {
        extraRoles.push(clientRole);
      }
    } else {
      const defaultRole = an.rol || (isHistoricalInClient ? 'Fost Afiliat' : 'Administrator Afiliat');
      extraRoles.push(defaultRole);
    }

    upsertPerson(an.nume, {
      role: extraRoles[0],
      roles: extraRoles,
      percent: clientPercent,
      isAsociat: clientPercent > 0 || (clientRole && clientRole.toUpperCase().includes('ASOCIAT')),
      isHistorical: isHistoricalInClient,
      mandatPeriod: clientMandatPeriod,
      age: an.varsta,
      birthplace: an.loc_nastere,
      stare: isHistoricalInClient ? 'Istoric' : 'Activ',
      firme: an.firme || [],
      hasDirectClientRole: hasClientRole,
    });
  });

  if (personMap.size === 0 && anaf.administrator) {
    upsertPerson(anaf.administrator, { role: 'Administrator', stare: 'Activ', hasDirectClientRole: true });
  }

  // Verificare de acuratețe: dacă există date oficiale din holdings/personnel cu asociați/administratori curenți,
  // persoanele care nu figurează în mandatul curent sunt marcate ca Fost Administrator / Istoric
  const activeHoldingsKeys = new Set(
    holdings
      .filter(h => h.current !== false && (!h.to || h.to === null))
      .map(h => normalizePersonName(h.name || h.nume))
      .filter(Boolean)
  );
  const activePersonnelKeys = new Set(
    personnel
      .filter(p => (p.stare === 'Activ' || !p.stare) && !p.data_sfarsit)
      .map(p => normalizePersonName(p.nume || p.name))
      .filter(Boolean)
  );

  personMap.forEach((pData) => {
    if ((activeHoldingsKeys.size > 0 || activePersonnelKeys.size > 0) &&
        !activeHoldingsKeys.has(pData.normKey) &&
        !activePersonnelKeys.has(pData.normKey)) {
      pData.isHistorical = true;
      pData.stare = 'Istoric';
      if (!pData.mandatPeriod) {
        const cFirm = (pData.firme || []).find(f => {
          const fc = String(f.cui || '').replace(/\D/g, '');
          const fn = (f.denumire || f.name || '').trim().toUpperCase();
          return (fc && fc === cleanClientCui) || (fn && fn === (clientName || '').trim().toUpperCase());
        });
        if (cFirm?.pana_la) {
          const yTo = String(cFirm.pana_la).slice(0, 4);
          const yFrom = cFirm.de_la ? String(cFirm.de_la).slice(0, 4) : null;
          pData.mandatPeriod = yFrom && yFrom !== yTo ? `${yFrom}-${yTo}` : yTo;
        }
      }
    }
  });

  // 5. EXTINDERE PÂNZĂ DE PĂIANJEN (ARIPA DREAPTĂ - CONDUCERE & REȚEA ASOCIAȚI)
  let pIdx = 0;
  const pCount = personMap.size || 1;
  personMap.forEach((pData) => {
    const personId = `person_${pData.normKey.replace(/[^A-Z0-9]/g, '_')}`;
    const rolesStr = Array.from(pData.roles).join(' / ') || (pData.isHistorical ? 'Fost Administrator' : 'Conducere');

    const pInitX = 280;
    const pInitY = (pIdx - (pCount - 1) / 2) * 75;
    pIdx++;

    addNode(personId, pData.displayName, 'person', {
      fullName: pData.displayName,
      roles: rolesStr,
      percent: pData.percent,
      isAsociat: pData.isAsociat || pData.percent > 0,
      isHistorical: pData.isHistorical,
      mandatPeriod: pData.mandatPeriod,
      age: pData.age,
      birthplace: pData.birthplace,
      stare: pData.isHistorical ? 'Istoric' : pData.stare,
      x: pInitX,
      y: pInitY,
    });

    // Firul principal direct de la VEDETĂ la administrator / asociat (doar dacă are mandat confirmat în firmă)
    if (pData.hasDirectClientRole) {
      let linkText = rolesStr;
      let linkType = 'primary';

      if (pData.isHistorical) {
        linkType = 'primary_historical';
        linkText = pData.mandatPeriod ? `FOST MANDAT (${pData.mandatPeriod})` : (rolesStr ? `FOST ${rolesStr.toUpperCase()}` : 'FOST MANDAT');
      } else {
        const isAdm = pData.roles.has('Administrator') || rolesStr.toLowerCase().includes('admin');
        const isLich = rolesStr.toLowerCase().includes('lichidator');
        const isJud = rolesStr.toLowerCase().includes('judiciar');
        if (pData.percent === 100) {
          linkText = isAdm ? '100% ASOCIAT UNIC & ADM' : '100% ASOCIAT UNIC';
        } else if (pData.percent > 0) {
          linkText = isAdm ? `${pData.percent}% ASOCIAT & ADM` : `${pData.percent}% PĂRȚI SOCIALE`;
        } else if (isLich) {
          linkText = 'LICHIDATOR JUDICIAR';
        } else if (isJud) {
          linkText = 'ADMINISTRATOR JUDICIAR';
        }
      }
      addLink(companyId, personId, linkText, linkType);
    }

    // Din persoană pleacă firele spre rețeaua sa de firme
    const relatedFirme = pData.firme || [];
    relatedFirme.forEach((firma, fIdx) => {
      const cleanFirmaCui = String(firma.cui || '').replace(/\D/g, '');
      if (cleanFirmaCui && cleanFirmaCui === cleanClientCui) return;
      if (firma.denumire && firma.denumire.trim().toUpperCase() === (clientName || '').trim().toUpperCase()) return;

      const isHistoricalFirma = firma.curent === false || !!firma.pana_la || firma.stare === 'Istoric' || (firma.stare && firma.stare.toLowerCase().includes('incetat'));
      const yearTo = firma.pana_la ? String(firma.pana_la).slice(0, 4) : null;
      const yearFrom = firma.de_la ? String(firma.de_la).slice(0, 4) : null;
      const periodStr = yearTo ? (yearFrom && yearFrom !== yearTo ? `${yearFrom}-${yearTo}` : yearTo) : '';

      let relLabel = '';
      if (isHistoricalFirma) {
        const isAdm = firma.este_administrator || (firma.rol && firma.rol.toLowerCase().includes('admin'));
        const isAsoc = firma.procent > 0 || (firma.rol && firma.rol.toLowerCase().includes('asociat'));

        if (isAdm && isAsoc) {
          relLabel = periodStr ? `A FOST ASOCIAT & ADM (${periodStr})` : 'A FOST ASOCIAT & ADM';
        } else if (isAdm) {
          relLabel = periodStr ? `A FOST ADMINISTRATOR (${periodStr})` : 'A FOST ADMINISTRATOR';
        } else if (isAsoc) {
          relLabel = periodStr ? `A FOST ASOCIAT (${periodStr})` : 'A FOST ASOCIAT';
        } else {
          relLabel = periodStr ? `FOST AFILIAT (${periodStr})` : 'FOST AFILIAT';
        }
      } else {
        if (firma.calitate) {
          relLabel = firma.calitate;
        } else if (firma.este_administrator || (firma.rol && firma.rol.toLowerCase().includes('admin'))) {
          relLabel = 'ADMINISTREAZĂ';
        } else if (firma.procent > 0 || (firma.rol && firma.rol.toLowerCase().includes('asociat'))) {
          relLabel = firma.procent === 100 ? 'ASOCIAT UNIC (100%)' : `ASOCIAT (${firma.procent}%)`;
        } else {
          relLabel = 'FIRMĂ AFILIATĂ';
        }
      }

      const firmaId = getCompanyNodeId(cleanFirmaCui, firma.denumire || `Firma_${fIdx}`);
      const name = firma.denumire || `Firmă ${fIdx + 1}`;
      const shortName = name.length > 22 ? name.slice(0, 19) + '...' : name;

      const fInitX = 480 + (fIdx % 2) * 130;
      const fInitY = pInitY + (fIdx - ((relatedFirme.length - 1) / 2)) * 52;

      const firmaBal = firma.balance || {};
      const firmaAng = firma.angajati !== undefined && firma.angajati !== null
        ? firma.angajati
        : (firmaBal.angajati !== undefined ? firmaBal.angajati : (firmaBal.numar_angajati !== undefined ? firmaBal.numar_angajati : (firmaBal.salariati !== undefined ? firmaBal.salariati : null)));

      addNode(firmaId, shortName, 'related_company', {
        cui: firma.cui,
        fullName: name,
        stare: isHistoricalFirma ? (firma.stare_firma || 'Istoric') : (firma.stare_firma || firma.stare || 'Activ'),
        isHistorical: isHistoricalFirma,
        relation: isHistoricalFirma ? (periodStr ? `Fostă Afiliere (${periodStr})` : 'Fostă Afiliere') : (firma.calitate || 'Firmă Afiliată'),
        fullAddr: firma.sediu || firma.adresa,
        balance: firmaBal,
        angajati: firmaAng,
        cifra_afaceri: firma.cifra_afaceri || firmaBal.cifra_afaceri,
        profit_net: firma.profit_net || firmaBal.profit_net,
        pierdere_neta: firma.pierdere_neta || firmaBal.pierdere_neta,
        an_bilant: firma.an_bilant || firmaBal.an,
        x: fInitX,
        y: fInitY,
      });

      // Din persoană duce în firma conexă
      addLink(personId, firmaId, relLabel, isHistoricalFirma ? 'network_historical' : 'network');

      // Dacă această firmă se află la adresa principală, legăm și de nodul de adresă! (Intersecție rețea)
      if (addrId && fullAddress && (firma.sediu || fullAddress)) {
        const fSed = (firma.sediu || '').toUpperCase();
        const fAddr = fullAddress.toUpperCase();
        if (fSed && (
          (fSed.includes('CHARLES DE GAULLE') && fAddr.includes('CHARLES DE GAULLE')) ||
          (fSed.includes('MAIORULUI') && fAddr.includes('MAIORULUI')) ||
          (fSed.includes('CERCHEZ') && fAddr.includes('CERCHEZ')) ||
          fAddr.includes(fSed.slice(0, 20))
        )) {
          addLink(addrId, firmaId, 'SEDIU IDENTIC', 'address_branch');
        }
      }

      // EXTINDERE PÂNZĂ: Dacă firma conexă are asociați cunoscuți (ex: parteneri sau holdinguri)
      if (firma.asociati && Array.isArray(firma.asociati)) {
        firma.asociati.forEach((partnerName, partIdx) => {
          if (!partnerName) return;
          const partNorm = normalizePersonName(partnerName);
          if (partNorm === pData.normKey) return; // același admin
          const partnerId = `person_${partNorm.replace(/[^A-Z0-9]/g, '_')}`;
          addNode(partnerId, formatPersonDisplayName(partnerName), 'person', {
            fullName: formatPersonDisplayName(partnerName),
            roles: 'Asociat Conex',
            stare: 'Activ',
            x: fInitX + 130,
            y: fInitY + (partIdx - 0.5) * 45,
          });
          addLink(firmaId, partnerId, 'ASOCIAT', 'network');
        });
      }
    });
  });

  // 6. ALERTE DE RISC CONSOLIDATE (COMPACTE, NU CARTOANE URIAȘE)
  const flags = rawData.osint_flags || [];
  if (flags.length > 0) {
    const allFlagTexts = flags.map(f => typeof f === 'string' ? f : f.message || '').filter(Boolean);
    const alertId = 'risk_hub';
    addNode(alertId, `Risc Fiscal (${flags.length})`, 'risk', {
      fullText: allFlagTexts.join(' • '),
      flagCount: flags.length,
      x: -45,
      y: -80,
    });
    addLink(companyId, alertId, 'FACTORI RISC', 'risk');
  }

  const bpi = rawData.bpi || {};
  if (bpi.has_insolvency) {
    addNode('bpi_alert', `Insolvență BPI (${bpi.count})`, 'risk', {
      fullText: `Compania figurează în Buletinul Procedurilor de Insolvență (${bpi.count} dosare).`,
      x: 45,
      y: -80,
    });
    addLink(companyId, 'bpi_alert', 'DOSAR BPI', 'risk');
  }

  return { nodes, links };
}

// ========== CANVAS RENDERING ==========

function drawPinCard(node, ctx, globalScale, isDark = true, expandingNodeId = null, expandedNodeIds = null) {
  const currentTheme = isDark ? THEMES.dark : THEMES.light;
  const isHistorical = node.isHistorical || node.stare === 'Istoric' || node.stare === 'Mandat Încheiat' || node.stare === 'Inactiv';
  let cfgType = node.type;
  if (node.type === 'person' && isHistorical) {
    cfgType = 'person_historical';
  }
  const cfg = currentTheme[cfgType] || currentTheme.risk;
  const dim = node.isRoot ? NODE_DIMENSIONS.company : (NODE_DIMENSIONS[cfgType] || NODE_DIMENSIONS[node.type] || { w: 90, h: 48 });
  const w = dim.w;
  const h = dim.h;
  const x = node.x - w / 2;
  const y = node.y - h / 2;

  ctx.save();

  const isRootTerminated = node.isRoot && (
    node.isTerminated ||
    String(node.stare || '').toUpperCase().includes('RADIAT') || 
    String(node.stare || '').toUpperCase().includes('RADIER') ||
    String(node.stare || '').toUpperCase().includes('FALIMENT') ||
    String(node.stare || '').toUpperCase().includes('LICHID')
  );

  const rootBorderColor = isRootTerminated ? '#ef4444' : cfg.border;
  const rootBadgeColor = isRootTerminated ? '#dc2626' : cfg.badge;
  const rootHaloColor = isRootTerminated ? 'rgba(239, 68, 68, 0.45)' : (isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(37, 99, 235, 0.28)');

  // Shadow
  if (node.isRoot) {
    ctx.shadowColor = isRootTerminated ? 'rgba(239, 68, 68, 0.55)' : (isDark ? 'rgba(56, 189, 248, 0.45)' : 'rgba(29, 78, 216, 0.32)');
    ctx.shadowBlur = 24;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
  } else if (node.type === 'address') {
    ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(15, 23, 42, 0.06)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
  } else if (isDark) {
    ctx.shadowColor = isHistorical ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;
  } else {
    ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 3;
  }

  // Background body
  ctx.beginPath();
  drawRoundedRect(ctx, x, y, w, h, node.isRoot ? 8 : 6);
  ctx.fillStyle = cfg.bg;
  ctx.fill();

  // Border & Double ring for Root
  if (node.isRoot) {
    ctx.lineWidth = isDark ? 3 : 3.2;
    ctx.strokeStyle = rootBorderColor;
    ctx.stroke();

    // Outer subtle halo ring
    ctx.beginPath();
    drawRoundedRect(ctx, x - 3.5, y - 3.5, w + 7, h + 7, 11);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rootHaloColor;
    ctx.stroke();
  } else {
    ctx.lineWidth = node.type === 'risk' ? 1.4 : 1.8;
    ctx.strokeStyle = cfg.border;
    ctx.stroke();
  }

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Header tab & badge dynamic text
  let headerLabel = cfg.label;
  let badgeText = cfg.abbr;

  if (node.isRoot && isRootTerminated) {
    headerLabel = 'SOCIETATE RADIATĂ • DOSAR FALIMENT';
    badgeText = 'RADIAT';
  } else if (node.relation === 'Sediu Comun' || node.relation?.toLowerCase().includes('sediu')) {
    headerLabel = 'SEDIU COMUN (CLUSTER)';
    badgeText = 'SEDIU';
  } else if (node.type === 'person') {
    if (isHistorical) {
      const isAdm = node.roles?.toLowerCase().includes('admin') || !node.isAsociat;
      headerLabel = isAdm ? 'FOST ADMINISTRATOR' : 'FOST ASOCIAT';
      badgeText = 'FOST';
    } else if (node.roles?.toLowerCase().includes('lichidator')) {
      headerLabel = 'LICHIDATOR JUDICIAR';
      badgeText = 'LICH';
    } else if (node.roles?.toLowerCase().includes('judiciar')) {
      headerLabel = 'ADMIN JUDICIAR';
      badgeText = 'ADM';
    } else if (node.percent === 100) {
      headerLabel = 'ASOCIAT UNIC (100%)';
      badgeText = 'ASOC';
    } else if (node.percent > 0) {
      headerLabel = `ASOCIAT (${node.percent}%)`;
      badgeText = 'ASOC';
    } else if (node.isAsociat) {
      headerLabel = 'ASOCIAT';
      badgeText = 'ASOC';
    } else {
      headerLabel = 'ADMINISTRATOR';
      badgeText = 'ADM';
    }
  }

  // Top header tab strip (skip for tiny risk pills)
  if (node.type !== 'risk') {
    ctx.save();
    ctx.beginPath();
    drawRoundedRect(ctx, x, y, w, h, node.isRoot ? 8 : 6);
    ctx.clip();

    ctx.fillStyle = node.isRoot ? rootBorderColor : cfg.border;
    const tabHeight = node.isRoot ? 14 : node.type === 'address' ? 8 : 10;
    ctx.fillRect(x, y, w, tabHeight);

    ctx.font = `bold ${node.isRoot ? '6.2px' : node.type === 'address' ? '4.8px' : '5px'} Inter, -apple-system, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(headerLabel, node.x, y + tabHeight / 2);
    ctx.restore();
  }

  // Abbreviation pill badge (skip for risk)
  if (node.type !== 'risk') {
    const badgeW = node.isRoot ? 28 : node.type === 'address' ? 14 : 16;
    const badgeH = node.isRoot ? 11 : node.type === 'address' ? 7.5 : 9;
    const badgeX = x + (node.isRoot ? 7 : 5);
    const badgeY = y + (node.isRoot ? 19 : node.type === 'address' ? 12 : 14);
    ctx.fillStyle = node.isRoot ? rootBadgeColor : cfg.badge;
    ctx.beginPath();
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 2.5);
    ctx.fill();
    ctx.font = `bold ${node.isRoot ? '6px' : node.type === 'address' ? '4.5px' : '5.5px'} Inter, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, badgeX + badgeW / 2, badgeY + badgeH / 2);
  }

  // Content for ADDRESS (Compact & Discrete)
  if (node.type === 'address') {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Line 1: Street & Number
    ctx.font = 'bold 5.6px Inter, -apple-system, sans-serif';
    ctx.fillStyle = isDark ? '#ecfdf5' : '#0f172a';
    const l1 = node.addrLine1 || node.label || '';
    ctx.fillText(l1.length > 25 ? l1.slice(0, 23) + '...' : l1, x + 23, y + 16);

    // Line 2: City / Sector
    ctx.font = '5px Inter, sans-serif';
    ctx.fillStyle = isDark ? '#6ee7b7' : '#047857';
    const l2 = node.addrLine2 || 'Sediu Social';
    ctx.fillText(l2.length > 30 ? l2.slice(0, 28) + '...' : l2, x + 5, y + 26);

    // Bottom cluster summary
    const statusY = y + h - 6;
    ctx.textAlign = 'left';
    ctx.font = '4.8px Inter, sans-serif';
    ctx.fillStyle = isDark ? '#34d399' : '#059669';
    ctx.fillText(`${node.clusterCount || 1} entități la sediu`, x + 5, statusY);
  } else if (node.type === 'risk') {
    // SLEEK, COMPACT MINI-TAG FOR RISK
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 6px Inter, sans-serif';
    ctx.fillStyle = isDark ? '#fca5a5' : '#991b1b';
    ctx.fillText(node.label || 'Alerte', node.x, node.y - 1);
    ctx.font = '4.5px Inter, sans-serif';
    ctx.fillStyle = isDark ? '#f87171' : '#dc2626';
    ctx.fillText('Vezi detalii la hover', node.x, node.y + 6);
  } else if (node.isRoot) {
    // ROOT VEDETĂ ANCHETĂ
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 9.5px Inter, -apple-system, sans-serif';
    ctx.fillStyle = cfg.text;

    const maxTextW = w - 46;
    let title = node.fullName || node.label || '';
    if (ctx.measureText(title).width > maxTextW) {
      while (ctx.measureText(title + '…').width > maxTextW && title.length > 2) {
        title = title.slice(0, -1);
      }
      title += '…';
    }
    ctx.fillText(title, x + 40, y + 24.5);

    // Subtitle with CUI & details
    let subtitle = `CUI: ${node.cui || ''}`;
    if (isRootTerminated) {
      subtitle += ` • RADIATĂ DIN REGISTRUL COMERȚULUI (2018)`;
    } else {
      if (node.an_infiintare) subtitle += ` • Înființat: ${node.an_infiintare}`;
      if (node.telefon) subtitle += ` • Tel: ${node.telefon}`;
    }

    ctx.font = 'bold 6.2px Inter, sans-serif';
    ctx.fillStyle = isRootTerminated ? (isDark ? '#fca5a5' : '#b91c1c') : cfg.subtext;
    ctx.fillText(subtitle, x + 8, y + 40);

    // Financial & Employees Row for Root
    const rootNet = (node.profit_net || 0) - (node.pierdere_neta || 0);
    const hasFin = (node.angajati !== null && node.angajati !== undefined) || node.cifra_afaceri || node.profit_net !== undefined || node.pierdere_neta !== undefined;

    if (hasFin) {
      const isPos = rootNet >= 0;
      const netColor = isPos ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626');
      const netStr = (isPos ? '+' : '') + formatMoneyShort(rootNet) + ' lei';
      const angStr = (node.angajati !== null && node.angajati !== undefined) ? `${node.angajati} ang.` : null;
      const caStr = node.cifra_afaceri ? `CA: ${formatMoneyShort(node.cifra_afaceri)}` : null;

      let finPre = '';
      if (angStr) finPre += `${angStr} • `;
      if (caStr) finPre += `${caStr} • `;
      finPre += 'Net: ';

      ctx.font = 'bold 5.8px Inter, sans-serif';
      ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
      ctx.fillText(finPre, x + 8, y + 54);
      const finPreW = ctx.measureText(finPre).width;

      ctx.fillStyle = netColor;
      ctx.fillText(netStr, x + 8 + finPreW, y + 54);
    } else {
      ctx.font = '5.4px Inter, sans-serif';
      ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
      ctx.fillText('Bilanț fiscal complet disponibil în dosar', x + 8, y + 54);
    }

    // Status bar at bottom
    const statusY = y + h - 12;
    const statusColor = isRootTerminated ? '#ef4444' : '#10b981';
    const statusTextColor = isDark 
      ? (isRootTerminated ? '#fca5a5' : '#a7f3d0') 
      : (isRootTerminated ? '#b91c1c' : '#047857');
    const statusText = isRootTerminated 
      ? `Radiată (Faliment)` 
      : 'Activ (Registrul Comerțului)';

    ctx.beginPath();
    ctx.arc(x + 11, statusY, 3, 0, Math.PI * 2);
    ctx.fillStyle = statusColor;
    ctx.fill();

    ctx.font = 'bold 5.8px Inter, sans-serif';
    ctx.fillStyle = statusTextColor;
    ctx.fillText(statusText, x + 18, statusY);

    // Direct Action Button on card: [ + Extinde Rețea ]
    const btnW = 76;
    const btnH = 17;
    const btnX = x + w - btnW - 6;
    const btnY = y + h - btnH - 5;
    const isThisExpanding = expandingNodeId === node.id;
    const isThisExpanded = expandedNodeIds && expandedNodeIds.has(node.id);

    ctx.beginPath();
    drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 4);
    ctx.fillStyle = isThisExpanding ? '#6366f1' : (isThisExpanded ? '#059669' : '#0284c7');
    ctx.fill();
    ctx.strokeStyle = isThisExpanding ? '#a5b4fc' : (isThisExpanded ? '#34d399' : '#38bdf8');
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.font = 'bold 6px Inter, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(
      isThisExpanding ? 'Extindere...' : (isThisExpanded ? '✓ Rețea Extinsă' : '+ Extinde Rețea'),
      btnX + btnW / 2,
      btnY + btnH / 2 + 0.3
    );
  } else {
    // Normal node (Person, Related Company)
    const isCompNode = node.type === 'company' || node.type === 'related_company';
    const isPersNode = node.type === 'person' || node.type === 'person_historical';

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 7.6px Inter, -apple-system, sans-serif';
    ctx.fillStyle = cfg.text;

    const maxTextW = w - 32;
    let title = node.fullName || node.label || '';
    if (ctx.measureText(title).width > maxTextW) {
      while (ctx.measureText(title + '…').width > maxTextW && title.length > 2) {
        title = title.slice(0, -1);
      }
      title += '…';
    }
    ctx.fillText(title, x + 26, y + 19);

    // Subtitle
    let subtitle = '';
    if (node.cui) subtitle = `CUI: ${node.cui}${node.an_infiintare ? ` • An: ${node.an_infiintare}` : ''}`;
    else if (node.roles) subtitle = node.roles;
    else if (node.relation) subtitle = node.relation;
    else if (node.full) subtitle = node.full.slice(0, 26) + (node.full.length > 26 ? '…' : '');

    if (subtitle) {
      ctx.font = '5.4px Inter, sans-serif';
      ctx.fillStyle = cfg.subtext;
      let subDisplay = subtitle;
      const maxSubW = w - 12;
      if (ctx.measureText(subDisplay).width > maxSubW) {
        while (ctx.measureText(subDisplay + '…').width > maxSubW && subDisplay.length > 2) {
          subDisplay = subDisplay.slice(0, -1);
        }
        subDisplay += '…';
      }
      ctx.fillText(subDisplay, x + 6, y + 31);
    }

    // Financial & Employees row for Companies!
    if (isCompNode) {
      const netVal = (node.profit_net || 0) - (node.pierdere_neta || 0);
      const hasFin = (node.angajati !== null && node.angajati !== undefined) || node.cifra_afaceri || node.profit_net !== undefined || node.pierdere_neta !== undefined;

      if (hasFin) {
        const isPos = netVal >= 0;
        const netColor = isPos ? (isDark ? '#34d399' : '#059669') : (isDark ? '#f87171' : '#dc2626');
        const netStr = (isPos ? '+' : '') + formatMoneyShort(netVal) + ' lei';
        const angStr = (node.angajati !== null && node.angajati !== undefined) ? `${node.angajati} ang.` : null;
        const caStr = node.cifra_afaceri ? `CA: ${formatMoneyShort(node.cifra_afaceri)}` : null;

        let finPrefix = '';
        if (angStr) finPrefix += `${angStr} • `;
        if (caStr) finPrefix += `${caStr} • `;
        finPrefix += 'Net: ';

        ctx.font = 'bold 5.4px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText(finPrefix, x + 6, y + 44);
        const finPreW = ctx.measureText(finPrefix).width;

        ctx.fillStyle = netColor;
        ctx.fillText(netStr, x + 6 + finPreW, y + 44);
      } else {
        ctx.font = '5.2px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#64748b' : '#94a3b8';
        ctx.fillText('Bilanț: Click Extinde pt. date', x + 6, y + 44);
      }
    }

    // Status dot at bottom
    const statusY = isCompNode ? y + h - 10 : y + h - 9;
    if (node.stare) {
      const isClusterNode = node.relation === 'Sediu Comun';
      const isHistoricalNode = node.isHistorical || node.stare.includes('Istoric') || node.stare.includes('Mandat') || node.stare.includes('Inactiv') || node.stare.includes('Faliment') || node.stare.includes('Radiere');
      const isActive = !isHistoricalNode && !isClusterNode && (node.stare === 'Activ' || node.stare === 'Activa' || node.stare === 'funcţiune');

      ctx.beginPath();
      ctx.arc(x + 9, statusY, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = isActive ? '#10b981' : isClusterNode ? '#38bdf8' : isHistoricalNode ? '#f59e0b' : '#f43f5e';
      ctx.fill();

      ctx.font = '5.2px Inter, sans-serif';
      if (isDark) {
        ctx.fillStyle = isActive ? '#a7f3d0' : isClusterNode ? '#7dd3fc' : isHistoricalNode ? '#fcd34d' : '#fecdd3';
      } else {
        ctx.fillStyle = isActive ? '#047857' : isClusterNode ? '#0369a1' : isHistoricalNode ? '#b45309' : '#be123c';
      }

      let statusDisplay = node.stare;
      if (isClusterNode) {
        statusDisplay = 'La Sediu';
      } else if (isHistoricalNode) {
        statusDisplay = 'Mandat Încheiat';
      } else if (node.stare === 'funcţiune' || node.stare === 'in functiune') {
        statusDisplay = 'În funcțiune';
      }
      ctx.fillText(statusDisplay, x + 15, statusY);
    }

    // Direct Action Button on card (for both Company & Person!)
    if (isCompNode || isPersNode) {
      const isThisExpanding = expandingNodeId === node.id;
      const isThisExpanded = expandedNodeIds && expandedNodeIds.has(node.id);
      const btnW = isCompNode ? 58 : 56;
      const btnH = 16;
      const btnX = x + w - btnW - 5;
      const btnY = y + h - btnH - 4;

      ctx.beginPath();
      drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 4);
      ctx.fillStyle = isThisExpanding 
        ? '#6366f1' 
        : (isThisExpanded 
          ? '#059669' 
          : (isCompNode ? '#0284c7' : '#4f46e5'));
      ctx.fill();
      ctx.strokeStyle = isThisExpanding 
        ? '#a5b4fc' 
        : (isThisExpanded 
          ? '#34d399' 
          : (isCompNode ? '#38bdf8' : '#818cf8'));
      ctx.lineWidth = 0.9;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.font = 'bold 5.8px Inter, sans-serif';
      ctx.fillStyle = '#ffffff';
      const btnText = isThisExpanding 
        ? 'Extindere...' 
        : (isThisExpanded 
          ? (isCompNode ? '✓ Rețea Extinsă' : '✓ Firme Extinse') 
          : (isCompNode ? '+ Extinde Rețea' : '+ Extinde Firme'));
      ctx.fillText(btnText, btnX + btnW / 2, btnY + btnH / 2 + 0.3);
    }

    if (node.percent > 0 && !isCompNode) {
      ctx.textAlign = 'left';
      ctx.font = 'bold 5.2px Inter, sans-serif';
      ctx.fillStyle = isDark ? '#fbbf24' : '#b45309';
      ctx.fillText(`${node.percent}%`, x + 50, statusY);
    }
  }

  ctx.restore();
}

function drawStringLink(link, ctx, globalScale, isDark = true) {
  const start = link.source;
  const end = link.target;
  if (!start || !end || typeof start.x !== 'number' || typeof end.x !== 'number' || typeof start.y !== 'number' || typeof end.y !== 'number') {
    return;
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return;

  const isHistoricalLink = link.type === 'primary_historical' || link.type === 'network_historical' || link.type === 'historical';

  ctx.save();
  if (isHistoricalLink) {
    ctx.setLineDash([4, 3]);
  }

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);

  if (isDark) {
    if (isHistoricalLink) {
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.lineWidth = 1.0;
    } else if (link.type === 'primary') {
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.75)';
      ctx.lineWidth = 1.4;
    } else {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
      ctx.lineWidth = 1.0;
    }
  } else {
    // Light mode - corporate slate
    if (isHistoricalLink) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.lineWidth = 1.0;
    } else if (link.type === 'primary') {
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.8)';
      ctx.lineWidth = 1.4;
    } else {
      ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
      ctx.lineWidth = 1.0;
    }
  }

  ctx.stroke();
  if (isHistoricalLink) {
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawLinkLabel(link, ctx, isDark = true) {
  if (!link || !link.label) return;
  const start = link.source;
  const end = link.target;
  if (!start || !end || typeof start.x !== 'number' || typeof end.x !== 'number' || typeof start.y !== 'number' || typeof end.y !== 'number') {
    return;
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return;

  const isHistoricalLink = link.type === 'primary_historical' || link.type === 'network_historical' || link.type === 'historical';

  ctx.save();
  ctx.font = '500 5.5px Inter, -apple-system, sans-serif';
  const textW = ctx.measureText(link.label).width;
  const badgeW = textW + 7;
  const badgeH = 9;

  const dimStart = NODE_DIMENSIONS[start.type] || { w: 104, h: 50 };
  const dimEnd = NODE_DIMENSIONS[end.type] || { w: 104, h: 50 };

  const ux = dx / dist;
  const uy = dy / dist;

  const rStart = Math.min(
    (dimStart.w / 2 + 8) / (Math.abs(ux) || 0.001),
    (dimStart.h / 2 + 8) / (Math.abs(uy) || 0.001)
  );
  const rEnd = Math.min(
    (dimEnd.w / 2 + 8) / (Math.abs(ux) || 0.001),
    (dimEnd.h / 2 + 8) / (Math.abs(uy) || 0.001)
  );

  const visibleSpan = Math.max(20, dist - rStart - rEnd);
  const tMid = (rStart + visibleSpan / 2) / dist;
  const t = Math.max(0.3, Math.min(0.7, tMid));

  let labelX = (1 - t) * start.x + t * end.x;
  let labelY = (1 - t) * start.y + t * end.y;

  if (isDark) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.beginPath();
    drawRoundedRect(ctx, labelX - badgeW / 2, labelY - badgeH / 2, badgeW, badgeH, 2.5);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.lineWidth = 0.7;
    ctx.strokeStyle = isHistoricalLink ? 'rgba(100, 116, 139, 0.4)' : 'rgba(148, 163, 184, 0.5)';
    ctx.stroke();

    ctx.fillStyle = isHistoricalLink ? '#94a3b8' : '#e2e8f0';
  } else {
    ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
    ctx.beginPath();
    drawRoundedRect(ctx, labelX - badgeW / 2, labelY - badgeH / 2, badgeW, badgeH, 2.5);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.lineWidth = 0.8;
    ctx.strokeStyle = isHistoricalLink ? 'rgba(203, 213, 225, 0.8)' : 'rgba(203, 213, 225, 0.9)';
    ctx.stroke();

    ctx.fillStyle = isHistoricalLink ? '#64748b' : '#334155';
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(link.label, labelX, labelY);
  ctx.restore();
}

export default function InvestigationBoard({ rawData, clientName, clientCui, onClose, onOpenCompany, onOpenPerson, onOpenGovernance }) {
  const graphRef = useRef();
  const containerRef = useRef();
  const hasAutoCentered = useRef(false);
  const lastClickRef = useRef({ time: 0, nodeId: null });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isInspectorMinimized, setIsInspectorMinimized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const isLiquidation = useMemo(() => {
    const rawStare = String(rawData?.stare || rawData?.fiscal_status || rawData?.anaf?.stare || '').toUpperCase();
    if (rawStare.includes('RADIAT') || rawStare.includes('RADIER') || rawStare.includes('FALIMENT') || rawStare.includes('LICHID')) {
      return true;
    }
    const admins = rawData?.administrators || [];
    return admins.some(a => String(a.functie || a.calitate || a.rol || '').toLowerCase().includes('lichidator'));
  }, [rawData]);

  // Synchronized theme detection with documentElement & localStorage
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });

  useEffect(() => {
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDark();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') {
          checkDark();
        }
      }
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);


  // Re-render canvas when theme changes
  useEffect(() => {
    if (graphRef.current?.refresh) {
      graphRef.current.refresh();
    }
  }, [isDark]);

  const activeConfig = isDark ? THEMES.dark : THEMES.light;

  const initialGraphData = useMemo(
    () => buildGraph(rawData || {}, clientName || 'Firma', clientCui || ''),
    [rawData, clientName, clientCui]
  );

  const [graphData, setGraphData] = useState(() => initialGraphData);

  useEffect(() => {
    hasAutoCentered.current = false;
    setGraphData(initialGraphData);
  }, [initialGraphData]);

  const [expandingNodeId, setExpandingNodeId] = useState(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState(new Set());
  const [expandNotice, setExpandNotice] = useState(null);

  // Totalizator bilanțuri & angajați pe întreaga rețea vizibilă în graf
  const financialSummary = useMemo(() => {
    let totalAngajati = 0;
    let totalCifraAfaceri = 0;
    let totalNetProfitLoss = 0;
    let companiesWithBalance = 0;

    (graphData?.nodes || []).forEach(n => {
      if (n.type === 'company' || n.type === 'related_company') {
        const bal = n.balance || {};
        const ang = (n.angajati !== undefined && n.angajati !== null) 
          ? Number(n.angajati) 
          : (bal.angajati !== undefined && bal.angajati !== null ? Number(bal.angajati) : (bal.numar_angajati !== undefined ? Number(bal.numar_angajati) : (bal.salariati !== undefined ? Number(bal.salariati) : null)));
        
        if (typeof ang === 'number' && !isNaN(ang)) {
          totalAngajati += ang;
        }

        const ca = (n.cifra_afaceri !== undefined && n.cifra_afaceri !== null)
          ? Number(n.cifra_afaceri)
          : (bal.cifra_afaceri !== undefined ? Number(bal.cifra_afaceri) : null);
        
        if (typeof ca === 'number' && !isNaN(ca)) {
          totalCifraAfaceri += ca;
        }

        const p = (n.profit_net !== undefined && n.profit_net !== null)
          ? Number(n.profit_net)
          : (bal.profit_net !== undefined ? Number(bal.profit_net) : null);

        const l = (n.pierdere_neta !== undefined && n.pierdere_neta !== null)
          ? Number(n.pierdere_neta)
          : (bal.pierdere_neta !== undefined ? Number(bal.pierdere_neta) : null);

        if (p !== null || l !== null) {
          companiesWithBalance++;
          const net = (p || 0) - (l || 0);
          totalNetProfitLoss += net;
        }
      }
    });

    return {
      totalAngajati,
      totalCifraAfaceri,
      totalNetProfitLoss,
      companiesWithBalance,
      isPositive: totalNetProfitLoss >= 0
    };
  }, [graphData]);

  useEffect(() => {
    window.__axisSelectNode = (node) => setSelectedNode(node);
    window.__axisGetNodes = () => graphData?.nodes || [];
    return () => {
      delete window.__axisSelectNode;
      delete window.__axisGetNodes;
    };
  }, [graphData]);

  // Extindere dinamică a unui nod (firmă sau persoană) direct în graf ("Caracatița")
  const handleExpandNode = async (node) => {
    if (!node || expandingNodeId) return;
    setExpandingNodeId(node.id);

    try {
      const isCompanyType = node.type === 'company' || node.type === 'related_company';
      const isPersonType = node.type === 'person' || node.type === 'person_historical';

      if (isCompanyType) {
        const cleanCui = String(node.cui || '').replace(/\D/g, '');
        const compName = node.fullName || node.label || '';
        if (!cleanCui && !compName) return;

        const intel = await fetchCompanyFullIntel(cleanCui, compName, false);
        if (!intel) return;

        let addedNodesCount = 0;
        let addedLinksCount = 0;

        setGraphData((prev) => {
          const newNodes = [...prev.nodes];
          const newLinks = [...prev.links];
          const nodeIds = new Set(newNodes.map(n => n.id));
          const linkKeys = new Set(newLinks.map(l => {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            const t = typeof l.target === 'object' ? l.target.id : l.target;
            return `${s}->${t}`;
          }));

          const originX = typeof node.x === 'number' ? node.x : 0;
          const originY = typeof node.y === 'number' ? node.y : 0;

          const addNode = (id, label, type, extra = {}) => {
            if (nodeIds.has(id)) {
              const existing = newNodes.find(n => n.id === id);
              if (existing) Object.assign(existing, extra);
              return;
            }
            nodeIds.add(id);
            addedNodesCount++;
            newNodes.push({ id, label, type, ...extra });
          };

          const addLink = (source, target, label = '', type = 'default') => {
            if (!source || !target || source === target) return;
            const key1 = `${source}->${target}`;
            const key2 = `${target}->${source}`;
            if (linkKeys.has(key1) || linkKeys.has(key2)) return;
            linkKeys.add(key1);
            linkKeys.add(key2);
            addedLinksCount++;
            newLinks.push({ source, target, label, type });
          };

          // 1. Sediu Social & Cluster Firme de la aceeași adresă
          const fullAddress = intel.address_check?.address || intel.general?.adresa || intel.anaf?.adresa || node.fullAddr;
          if (fullAddress) {
            const addrId = `addr_${cleanCui || node.id.replace('comp_', '')}`;
            const parsed = parseAddressDisplay(fullAddress);
            const cluster = intel.address_check?.companies || intel.visual?.companies || [];

            const addrX = originX + 170;
            const addrY = originY - 75;

            addNode(addrId, parsed.line1, 'address', {
              full: fullAddress,
              addrLine1: parsed.line1,
              addrLine2: parsed.line2,
              clusterCount: cluster.length || (intel.address_check?.cluster_count || 1),
              x: addrX,
              y: addrY,
            });

            addLink(node.id, addrId, 'SEDIU SOCIAL', 'primary');

            // Adăugare firme din clusterul de la sediu
            const topCluster = cluster.slice(0, 8);
            topCluster.forEach((comp, idx) => {
              const cCui = String(comp.cui || '').replace(/\D/g, '');
              if (cCui && (cCui === cleanCui || cCui === cleanClientCui)) return;
              const cName = comp.denumire || comp.name || comp.nume || '';
              if (!cName) return;

              const cId = getCompanyNodeId(cCui, cName);
              const shortName = cName.length > 20 ? cName.slice(0, 18) + '...' : cName;
              const cX = addrX + 145;
              const cY = addrY + (idx - Math.floor(topCluster.length / 2)) * 48;

              const compBal = comp.balance || {};
              const compAng = comp.angajati !== undefined && comp.angajati !== null
                ? comp.angajati
                : (compBal.angajati !== undefined ? compBal.angajati : (compBal.numar_angajati !== undefined ? compBal.numar_angajati : (compBal.salariati !== undefined ? compBal.salariati : null)));

              addNode(cId, shortName, 'related_company', {
                cui: comp.cui,
                fullName: cName,
                stare: comp.stare || comp.status || 'Sediu Comun',
                relation: 'Sediu Comun',
                fullAddr: comp.adresa || fullAddress,
                balance: compBal,
                angajati: compAng,
                cifra_afaceri: comp.cifra_afaceri || compBal.cifra_afaceri,
                profit_net: comp.profit_net || compBal.profit_net,
                pierdere_neta: comp.pierdere_neta || compBal.pierdere_neta,
                an_bilant: comp.an_bilant || compBal.an,
                x: cX,
                y: cY,
              });

              addLink(addrId, cId, 'SEDIU COMUN', 'address_branch');
            });
          }

          // 2. Asociați & Conducere din firmă
          const allPeople = [
            ...(intel.holdings || []),
            ...(intel.personnel || []),
            ...(intel.administrators || [])
          ];

          const seenPeople = new Set();
          allPeople.forEach((p, pIdx) => {
            const rawName = p.name || p.nume;
            if (!rawName) return;
            const norm = normalizePersonName(rawName);
            if (seenPeople.has(norm)) return;
            seenPeople.add(norm);

            const isPJ = p.entity === 'PJ' || (p.type && p.type.includes('(PJ)'));
            if (isPJ) {
              const pjCui = String(p.cui || '').replace(/\D/g, '');
              const pjId = getCompanyNodeId(pjCui, rawName);
              const pjX = originX + 180;
              const pjY = originY + 50 + pIdx * 45;
              addNode(pjId, rawName.length > 20 ? rawName.slice(0, 18) + '...' : rawName, 'related_company', {
                fullName: rawName,
                cui: p.cui,
                stare: 'Activ',
                relation: 'Asociat PJ',
                x: pjX,
                y: pjY,
              });
              addLink(node.id, pjId, p.percent ? `${p.percent}% ACȚIUNI` : 'ASOCIAT PJ', 'primary');
            } else {
              const pId = `person_${norm.replace(/[^A-Z0-9]/g, '_')}`;
              const pct = Number(p.percent || p.cota_participare || 0);
              const isAdm = p.is_administrator || (p.rol && p.rol.toLowerCase().includes('admin'));
              const roleLabel = pct === 100 ? 'Asociat Unic (100%)' : pct > 0 ? `Asociat (${pct}%)` : (isAdm ? 'Administrator' : 'Conducere');

              const pX = originX + 180;
              const pY = originY + 50 + pIdx * 55;

              addNode(pId, formatPersonDisplayName(rawName), 'person', {
                fullName: formatPersonDisplayName(rawName),
                roles: roleLabel,
                percent: pct,
                stare: 'Activ',
                x: pX,
                y: pY,
              });

              addLink(node.id, pId, roleLabel, 'primary');
            }
          });

          // 3. Firme din rețeaua administratorilor și asociaților
          (intel.admin_networks || []).forEach((net) => {
            const netPersonNorm = normalizePersonName(net.nume);
            const netPersonId = `person_${netPersonNorm.replace(/[^A-Z0-9]/g, '_')}`;

            (net.firme || []).forEach((f, fIdx) => {
              const fCui = String(f.cui || '').replace(/\D/g, '');
              if (fCui && (fCui === cleanCui || fCui === cleanClientCui)) return;
              const fName = f.denumire || f.name || '';
              if (!fName) return;

              const fId = getCompanyNodeId(fCui, fName);
              const shortName = fName.length > 22 ? fName.slice(0, 19) + '...' : fName;
              const fX = originX + 320 + (fIdx % 2) * 85;
              const fY = originY + (fIdx - Math.floor((net.firme || []).length / 2)) * 48;

              const fBal = f.balance || {};
              const fAng = f.angajati !== undefined && f.angajati !== null
                ? f.angajati
                : (fBal.angajati !== undefined ? fBal.angajati : (fBal.numar_angajati !== undefined ? fBal.numar_angajati : (fBal.salariati !== undefined ? fBal.salariati : null)));

              addNode(fId, shortName, 'related_company', {
                cui: f.cui,
                fullName: fName,
                stare: f.curent ? 'Activ' : 'Istoric',
                relation: f.rol || 'Firmă Afiliată',
                balance: fBal,
                angajati: fAng,
                cifra_afaceri: f.cifra_afaceri || fBal.cifra_afaceri,
                profit_net: f.profit_net || fBal.profit_net,
                pierdere_neta: f.pierdere_neta || fBal.pierdere_neta,
                an_bilant: f.an_bilant || fBal.an,
                x: fX,
                y: fY,
              });

              addLink(netPersonId, fId, f.rol || 'AFILIAT', f.curent ? 'network' : 'network_historical');
            });
          });

          // 4. Litigii / Dosare în Instanță
          if (intel.court_cases && intel.court_cases.length > 0) {
            const riskId = `risk_${cleanCui || node.id.replace('comp_', '')}`;
            addNode(riskId, `${intel.court_cases.length} Dosare Just`, 'risk', {
              fullText: `Compania figurează în ${intel.court_cases.length} dosare pe portal.just.ro.`,
              x: originX,
              y: originY + 95,
            });
            addLink(node.id, riskId, 'LITIGII', 'risk');
          }

          // Îmbogățim nodul curent cu datele extrase
          const currentComp = newNodes.find(n => n.id === node.id);
          if (currentComp) {
            if (fullAddress && !currentComp.fullAddr) currentComp.fullAddr = fullAddress;
            if (intel.general?.telefon && !currentComp.telefon) currentComp.telefon = intel.general.telefon;
            if (intel.general?.an_infiintare && !currentComp.an_infiintare) currentComp.an_infiintare = intel.general.an_infiintare;
            if (intel.general?.caen_descriere) currentComp.full = `${intel.general.cod_caen || ''} - ${intel.general.caen_descriere}`;
            if (intel.balance) {
              currentComp.balance = intel.balance;
              const bAng = intel.balance.angajati !== undefined && intel.balance.angajati !== null
                ? intel.balance.angajati
                : (intel.balance.numar_angajati !== undefined ? intel.balance.numar_angajati : (intel.balance.salariati !== undefined ? intel.balance.salariati : null));
              currentComp.angajati = bAng;
              currentComp.cifra_afaceri = intel.balance.cifra_afaceri;
              currentComp.profit_net = intel.balance.profit_net;
              currentComp.pierdere_neta = intel.balance.pierdere_neta;
              currentComp.an_bilant = intel.balance.an;
            }
          }

          return { nodes: newNodes, links: newLinks };
        });

        setExpandedNodeIds(prev => new Set([...prev, node.id]));
        if (graphRef.current) {
          graphRef.current.d3ReheatSimulation();
          if (typeof node.x === 'number' && typeof node.y === 'number') {
            graphRef.current.centerAt(node.x, node.y, 450);
          }
        }

        setExpandNotice({
          nodeId: node.id,
          text: (addedNodesCount > 0 || addedLinksCount > 0)
            ? `Rețea extinsă: +${addedNodesCount} noduri și +${addedLinksCount} conexiuni adăugate.`
            : `Toate conexiunile disponibile din ONRC/ANAF sunt deja afișate în graf.`
        });
      } else if (isPersonType) {
        const pName = node.fullName || node.label;
        if (!pName) return;

        const pIntel = await fetchPersonFullIntel(pName, clientCui);
        if (!pIntel) return;

        let addedNodesCount = 0;
        let addedLinksCount = 0;

        setGraphData((prev) => {
          const newNodes = [...prev.nodes];
          const newLinks = [...prev.links];
          const nodeIds = new Set(newNodes.map(n => n.id));
          const linkKeys = new Set(newLinks.map(l => {
            const s = typeof l.source === 'object' ? l.source.id : l.source;
            const t = typeof l.target === 'object' ? l.target.id : l.target;
            return `${s}->${t}`;
          }));

          const originX = typeof node.x === 'number' ? node.x : 0;
          const originY = typeof node.y === 'number' ? node.y : 0;

          const addNode = (id, label, type, extra = {}) => {
            if (nodeIds.has(id)) {
              const existing = newNodes.find(n => n.id === id);
              if (existing) Object.assign(existing, extra);
              return;
            }
            nodeIds.add(id);
            addedNodesCount++;
            newNodes.push({ id, label, type, ...extra });
          };

          const addLink = (source, target, label = '', type = 'default') => {
            if (!source || !target || source === target) return;
            const key1 = `${source}->${target}`;
            const key2 = `${target}->${source}`;
            if (linkKeys.has(key1) || linkKeys.has(key2)) return;
            linkKeys.add(key1);
            linkKeys.add(key2);
            addedLinksCount++;
            newLinks.push({ source, target, label, type });
          };

          const netFirme = [];
          (pIntel.network || []).forEach((net) => {
            (net.firme || []).forEach((f) => {
              netFirme.push(f);
            });
          });

          netFirme.forEach((f, idx) => {
            const fCui = String(f.cui || '').replace(/\D/g, '');
            const fName = f.denumire || f.name || '';
            if (!fName) return;

            const fId = getCompanyNodeId(fCui, fName);
            const shortName = fName.length > 22 ? fName.slice(0, 19) + '...' : fName;
            const fX = originX + 180 + (idx % 2) * 80;
            const fY = originY + (idx - Math.floor(netFirme.length / 2)) * 48;

            addNode(fId, shortName, 'related_company', {
              cui: f.cui,
              fullName: fName,
              stare: f.curent ? 'Activ' : 'Istoric',
              relation: f.rol || 'Firmă Afiliată',
              x: fX,
              y: fY,
            });

            addLink(node.id, fId, f.rol || 'AFILIAT', f.curent ? 'network' : 'network_historical');
          });

          return { nodes: newNodes, links: newLinks };
        });

        setExpandedNodeIds(prev => new Set([...prev, node.id]));
        if (graphRef.current) {
          graphRef.current.d3ReheatSimulation();
          if (typeof node.x === 'number' && typeof node.y === 'number') {
            graphRef.current.centerAt(node.x, node.y, 450);
          }
        }

        setExpandNotice({
          nodeId: node.id,
          text: (addedNodesCount > 0 || addedLinksCount > 0)
            ? `Rețea extinsă: +${addedNodesCount} firme conexe și +${addedLinksCount} conexiuni adăugate.`
            : `Toate companiile asociate acestei persoane sunt deja afișate în graf.`
        });
      }
    } catch (err) {
      console.error('Eroare extindere nod în graf:', err);
    } finally {
      setExpandingNodeId(null);
    }
  };

  // Căutare CUI sau Nume și adăugare directă pe pânză
  const handleSearchAndExpandToGraph = async (query) => {
    const q = (query || searchQuery).trim();
    if (!q) return;
    const cleanCui = q.replace(/\D/g, '');
    setExpandingNodeId('search');
    try {
      const intel = await fetchCompanyFullIntel(cleanCui || q, q, false);
      if (!intel) return;

      const compCui = intel.cui || cleanCui;
      const compName = intel.denumire || q;
      const compId = getCompanyNodeId(compCui, compName);

      setGraphData((prev) => {
        const newNodes = [...prev.nodes];
        const newLinks = [...prev.links];
        const nodeIds = new Set(newNodes.map(n => n.id));
        const linkKeys = new Set(newLinks.map(l => {
          const s = typeof l.source === 'object' ? l.source.id : l.source;
          const t = typeof l.target === 'object' ? l.target.id : l.target;
          return `${s}->${t}`;
        }));

        const addNode = (id, label, type, extra = {}) => {
          if (nodeIds.has(id)) {
            const existing = newNodes.find(n => n.id === id);
            if (existing) Object.assign(existing, extra);
            return;
          }
          nodeIds.add(id);
          newNodes.push({ id, label, type, ...extra });
        };

        const addLink = (source, target, label = '', type = 'default') => {
          if (!source || !target || source === target) return;
          const key1 = `${source}->${target}`;
          const key2 = `${target}->${source}`;
          if (linkKeys.has(key1) || linkKeys.has(key2)) return;
          linkKeys.add(key1);
          linkKeys.add(key2);
          newLinks.push({ source, target, label, type });
        };

        addNode(compId, compName.length > 22 ? compName.slice(0, 19) + '...' : compName, 'related_company', {
          fullName: compName,
          cui: compCui,
          stare: intel.general?.status || 'Activ',
          an_infiintare: intel.general?.an_infiintare || null,
        });

        const allPeople = [
          ...(intel.holdings || []),
          ...(intel.personnel || []),
          ...(intel.administrators || [])
        ];
        const seen = new Set();
        allPeople.forEach((p) => {
          const raw = p.name || p.nume;
          if (!raw) return;
          const norm = normalizePersonName(raw);
          if (seen.has(norm)) return;
          seen.add(norm);

          const isPJ = p.entity === 'PJ' || (p.type && p.type.includes('(PJ)'));
          if (isPJ) {
            const pjCui = String(p.cui || '').replace(/\D/g, '');
            const pjId = getCompanyNodeId(pjCui, raw);
            addNode(pjId, raw.length > 20 ? raw.slice(0, 18) + '...' : raw, 'related_company', {
              fullName: raw,
              cui: p.cui,
              stare: 'Activ',
              relation: 'Asociat PJ',
            });
            addLink(pjId, compId, p.percent ? `${p.percent}% ACȚIUNI` : 'ASOCIAT PJ', 'primary');
          } else {
            const pId = `person_${norm.replace(/[^A-Z0-9]/g, '_')}`;
            const pct = Number(p.percent || p.cota_participare || 0);
            const isAdm = p.is_administrator || (p.rol && p.rol.toLowerCase().includes('admin'));
            const roleLabel = pct === 100 ? 'Asociat Unic (100%)' : pct > 0 ? `Asociat (${pct}%)` : (isAdm ? 'Administrator' : 'Conducere');

            addNode(pId, formatPersonDisplayName(raw), 'person', {
              fullName: formatPersonDisplayName(raw),
              roles: roleLabel,
              percent: pct,
              stare: 'Activ',
            });
            addLink(compId, pId, roleLabel, 'primary');
          }
        });

        return { nodes: newNodes, links: newLinks };
      });

      setSearchQuery('');
      setIsSearchFocused(false);

      if (graphRef.current) {
        graphRef.current.d3ReheatSimulation();
      }
    } catch (err) {
      console.error('Eroare adăugare firmă în graf:', err);
      if (onOpenCompany) {
        onOpenCompany(cleanCui || q, q);
      }
    } finally {
      setExpandingNodeId(null);
    }
  };

  // Search filtering in the active graph
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim() || !graphData?.nodes) return [];
    const q = searchQuery.trim().toLowerCase();
    const qClean = q.replace(/\D/g, '');
    return graphData.nodes.filter(n => {
      const name = (n.fullName || n.label || '').toLowerCase();
      const cui = (n.cui || '').toString().toLowerCase();
      return name.includes(q) || (qClean && cui.includes(qClean));
    }).slice(0, 8);
  }, [searchQuery, graphData]);

  const handleSelectSearchResult = (node) => {
    setSelectedNode(node);
    if (graphRef.current && node.x !== undefined && node.y !== undefined) {
      graphRef.current.centerAt(node.x, node.y, 500);
      graphRef.current.zoom(2.2, 500);
    }
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const handleDirectSearchSubmit = () => {
    const q = searchQuery.trim();
    if (!q) return;
    const cleanCui = q.replace(/\D/g, '');
    if (filteredNodes.length > 0) {
      handleSelectSearchResult(filteredNodes[0]);
      return;
    }
    if (cleanCui && cleanCui.length >= 3) {
      if (onOpenCompany) {
        onOpenCompany(cleanCui, q);
      }
      setSearchQuery('');
      setIsSearchFocused(false);
      return;
    }
    if (onOpenCompany) {
      onOpenCompany(q, q);
    }
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth || 800,
          height: containerRef.current.offsetHeight || 600,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isFullscreen]);

  const centerOnRoot = (duration = 400) => {
    if (!graphRef.current) return;
    const currentNodes = graphData?.nodes || [];
    if (!currentNodes.length) return;

    // Găsim firma vedetă (root)
    const rootNode = currentNodes.find((n) => n.isRoot) || currentNodes[0];
    const rx = typeof rootNode.x === 'number' ? rootNode.x : 0;
    const ry = typeof rootNode.y === 'number' ? rootNode.y : 0;

    const cWidth = containerRef.current?.offsetWidth || 1200;
    const cHeight = containerRef.current?.offsetHeight || 800;

    // Calculăm distanța maximă de la root la orice alt nod pentru a asigura vizibilitatea completă în format LANDSCAPE
    let maxDistX = 300;
    let maxDistY = 120;

    currentNodes.forEach((n) => {
      if (typeof n.x === 'number' && typeof n.y === 'number') {
        const dx = Math.abs(n.x - rx);
        const dy = Math.abs(n.y - ry);
        if (dx > maxDistX) maxDistX = dx;
        if (dy > maxDistY) maxDistY = dy;
      }
    });

    const paddingX = 160;
    const paddingY = 110;
    const fitZoomX = cWidth / (2 * maxDistX + paddingX);
    const fitZoomY = cHeight / (2 * maxDistY + paddingY);
    const targetZoom = Math.min(Math.max(Math.min(fitZoomX, fitZoomY), 0.5), 1.25);

    graphRef.current.zoom(targetZoom, duration);
    graphRef.current.centerAt(rx, ry, duration);
  };

  useEffect(() => {
    if (graphRef.current) {
      // 1. FORȚĂ Y: restricționează deviația pe verticală, forțând alinierea pe orizontală LANDSCAPE
      graphRef.current.d3Force('y', forceY(0).strength(0.24));

      // 2. FORȚĂ X: organizează aripa stângă (sediu & cluster) și aripa dreaptă (conducere & asociați)
      graphRef.current.d3Force(
        'x',
        forceX((node) => {
          if (node.isRoot) return 0;
          if (node.type === 'risk') return -45;
          if (node.type === 'address') return -280;
          if (node.type === 'related_company' && node.relation === 'Sediu Comun') return -500;
          if (node.type === 'person') return 280;
          if (node.type === 'related_company') return 520;
          return node.x < 0 ? -320 : 320;
        }).strength(0.18)
      );

      // 3. Collision force cu spațiu adecvat
      graphRef.current.d3Force(
        'collide',
        forceCollide((node) => (node.isRoot ? 120 : (NODE_COLLISION_RADIUS[node.type] || 75))).iterations(4)
      );

      // 4. Repulsie echilibrată
      graphRef.current.d3Force('charge')?.strength(-750);

      // 5. Link distances optimizate pentru landscape
      graphRef.current.d3Force('link')?.distance((link) => {
        if (link.type === 'primary' || link.type === 'primary_historical') return 210;
        if (link.type === 'address_branch') return 110;
        if (link.type === 'network' || link.type === 'network_historical') return 140;
        if (link.type === 'risk') return 75;
        return 130;
      }).strength((link) => {
        if (link.type === 'primary' || link.type === 'primary_historical') return 0.85;
        if (link.type === 'address_branch') return 0.7;
        if (link.type === 'risk') return 0.95;
        return 0.5;
      });

      // Centrare automată pe firma vedetă la încărcarea datelor
      const timer = setTimeout(() => {
        centerOnRoot(500);
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [graphData]);

  const handleZoomIn = () => graphRef.current?.zoom(graphRef.current.zoom() * 1.4, 300);
  const handleZoomOut = () => graphRef.current?.zoom(graphRef.current.zoom() * 0.6, 300);
  const handleCenter = () => {
    centerOnRoot(400);
  };

  const handleResetLayout = () => {
    if (graphData && graphData.nodes) {
      graphData.nodes.forEach((node) => {
        if (node.isRoot) {
          node.fx = 0;
          node.fy = 0;
          node.x = 0;
          node.y = 0;
        } else {
          node.fx = undefined;
          node.fy = undefined;
        }
      });
      if (graphRef.current) {
        graphRef.current.d3ReheatSimulation();
        setTimeout(() => {
          centerOnRoot(400);
        }, 350);
      }
    }
  };

  const handleExportPDF = async () => {
    if (!containerRef.current || isExporting) return;
    setIsExporting(true);

    try {
      const rawCanvas = containerRef.current.querySelector('canvas');
      if (!rawCanvas) {
        alert('Canvas-ul nu a putut fi detectat pentru export.');
        return;
      }

      await new Promise((r) => setTimeout(r, 80));

      // Composite high-res canvas with matching background
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = rawCanvas.width;
      exportCanvas.height = rawCanvas.height;
      const expCtx = exportCanvas.getContext('2d');

      expCtx.fillStyle = isDark ? '#070b14' : '#f8fafc';
      expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

      // Subtle executive grid
      expCtx.save();
      expCtx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)';
      expCtx.lineWidth = 1;
      const step = 45;
      for (let gx = 0; gx < exportCanvas.width; gx += step) {
        expCtx.beginPath();
        expCtx.moveTo(gx, 0);
        expCtx.lineTo(gx, exportCanvas.height);
        expCtx.stroke();
      }
      for (let gy = 0; gy < exportCanvas.height; gy += step) {
        expCtx.beginPath();
        expCtx.moveTo(0, gy);
        expCtx.lineTo(exportCanvas.width, gy);
        expCtx.stroke();
      }
      expCtx.restore();

      // Render the graph canvas
      expCtx.drawImage(rawCanvas, 0, 0);

      // Helper for clean rounded rectangles on offscreen canvas
      const drawCanvasRoundRect = (ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) => {
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x, y, w, h, r);
        } else {
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
        }
        ctx.closePath();
        if (fill) {
          ctx.fillStyle = fill;
          ctx.fill();
        }
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
        }
      };

      // Helper for clean multiline text wrapping on offscreen canvas
      const drawCanvasWrappedText = (ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) => {
        const words = String(text || '').split(' ');
        let line = '';
        let lineCount = 0;
        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && n > 0) {
            ctx.fillText(line.trim(), x, y);
            line = words[n] + ' ';
            y += lineHeight;
            lineCount++;
            if (lineCount >= maxLines - 1 && n < words.length - 1) {
              ctx.fillText((line + words.slice(n + 1).join(' ')).slice(0, 80) + '...', x, y);
              return y + lineHeight;
            }
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line.trim(), x, y);
        return y + lineHeight;
      };

      const nowStr = new Date().toLocaleDateString('ro-RO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      // ==========================================
      // PAGE 1: EXECUTIVE VISUAL DOSSIER CANVAS (2376 x 1680)
      // ==========================================
      const p1Canvas = document.createElement('canvas');
      p1Canvas.width = 2376;
      p1Canvas.height = 1680;
      const p1Ctx = p1Canvas.getContext('2d');

      // Base background
      p1Ctx.fillStyle = isDark ? '#070b14' : '#f8fafc';
      p1Ctx.fillRect(0, 0, p1Canvas.width, p1Canvas.height);

      // Top Navy Header Bar
      p1Ctx.fillStyle = '#0a1121';
      p1Ctx.fillRect(0, 0, 2376, 170);

      // Header Left: Brand & Engine
      p1Ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p1Ctx.fillStyle = '#ffffff';
      p1Ctx.fillText('AXIS PREMIUM MOBILITY', 90, 80);

      p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p1Ctx.fillStyle = '#93c5fd';
      p1Ctx.fillText('PLATFORMA DE INTELIGENȚĂ OPERAȚIONALĂ • OSINT INVESTIGATION ENGINE', 90, 122);

      // Header Right: Dossier Type & Date
      p1Ctx.textAlign = 'right';
      p1Ctx.font = 'bold 21px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p1Ctx.fillStyle = '#ffffff';
      p1Ctx.fillText('RAPORT INVESTIGAȚIE & STRUCTURĂ AFILIERE', 2286, 80);

      p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p1Ctx.fillStyle = '#cbd5e1';
      p1Ctx.fillText(`Generat: ${nowStr} • Confidențial Axis Rent`, 2286, 122);
      p1Ctx.textAlign = 'left';

      // Metadata Info Bar
      drawCanvasRoundRect(p1Ctx, 90, 200, 2196, 115, 14, '#f1f5f9', '#cbd5e1', 2);

      // Subject & CUI Left
      p1Ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p1Ctx.fillStyle = '#0f172a';
      p1Ctx.fillText(`Subiect: ${clientName || 'Companie Investigată'}`, 120, 245);

      p1Ctx.font = '14.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p1Ctx.fillStyle = '#475569';
      const cleanAddr = (rawData.anaf?.adresa || rawData.address_check?.address || '-').slice(0, 95);
      p1Ctx.fillText(`Cod Fiscal (CUI): ${clientCui || '-'}  •  Sediu: ${cleanAddr}`, 120, 285);

      // Network Stats Right
      p1Ctx.textAlign = 'right';
      p1Ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p1Ctx.fillStyle = '#0f172a';
      p1Ctx.fillText(`Rețea: ${graphData.nodes.length} Entități  •  ${graphData.links.length} Conexiuni`, 2256, 245);

      p1Ctx.font = '14.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p1Ctx.fillStyle = '#475569';
      p1Ctx.fillText(`Status ANAF: ${rawData.anaf?.status || 'Activ'}  •  Telefon: ${rawData.anaf?.telefon || 'Nespecificat'}`, 2256, 285);
      p1Ctx.textAlign = 'left';

      // Graph Visual Canvas Box Placement
      const graphBoxX = 90;
      const graphBoxY = 345;
      const graphBoxW = 2196;
      const graphBoxH = 1250;

      drawCanvasRoundRect(p1Ctx, graphBoxX, graphBoxY, graphBoxW, graphBoxH, 16, isDark ? '#070b14' : '#f8fafc', isDark ? '#334155' : '#e2e8f0', 2);

      const gAspect = exportCanvas.width / exportCanvas.height;
      let gW = graphBoxW - 16;
      let gH = gW / gAspect;
      if (gH > graphBoxH - 16) {
        gH = graphBoxH - 16;
        gW = gH * gAspect;
      }
      const gX = graphBoxX + (graphBoxW - gW) / 2;
      const gY = graphBoxY + (graphBoxH - gH) / 2;

      p1Ctx.save();
      p1Ctx.beginPath();
      if (p1Ctx.roundRect) {
        p1Ctx.roundRect(graphBoxX, graphBoxY, graphBoxW, graphBoxH, 16);
      } else {
        p1Ctx.rect(graphBoxX, graphBoxY, graphBoxW, graphBoxH);
      }
      p1Ctx.clip();
      p1Ctx.drawImage(exportCanvas, gX, gY, gW, gH);
      p1Ctx.restore();

      // Page 1 Footer
      p1Ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p1Ctx.fillStyle = '#94a3b8';
      p1Ctx.fillText('Axis Cloud Platform • Raport de Evaluare și Investigare Rețea Afiliere • Confidențial • Pagina 1 / 2', 90, 1640);

      // ==========================================
      // PAGE 2: DETAILED INVENTORY & ENTITIES CANVAS (2376 x 1680)
      // ==========================================
      const p2Canvas = document.createElement('canvas');
      p2Canvas.width = 2376;
      p2Canvas.height = 1680;
      const p2Ctx = p2Canvas.getContext('2d');

      p2Ctx.fillStyle = '#f8fafc';
      p2Ctx.fillRect(0, 0, p2Canvas.width, p2Canvas.height);

      // Top Navy Header Bar
      p2Ctx.fillStyle = '#0a1121';
      p2Ctx.fillRect(0, 0, 2376, 140);

      p2Ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p2Ctx.fillStyle = '#ffffff';
      p2Ctx.fillText(`ANEXĂ DETALIATĂ: ${clientName || 'Companie Investigată'} (CUI: ${clientCui || '-'})`, 90, 80);

      p2Ctx.textAlign = 'right';
      p2Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p2Ctx.fillStyle = '#cbd5e1';
      p2Ctx.fillText('Inventar noduri și relații identificate • Pagina 2 / 2', 2286, 80);
      p2Ctx.textAlign = 'left';

      // 2 Columns Layout
      const c1X = 90;
      const c1W = 1060;
      const c2X = 1226;
      const c2W = 1060;

      let c1Y = 185;
      let c2Y = 185;

      // Col 1 Section 1: Conducere & Asociați
      p2Ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p2Ctx.fillStyle = '#0f172a';
      p2Ctx.fillText('1. ASOCIAȚI, CONDUCERE ȘI MANDATE ISTORICE', c1X, c1Y);
      c1Y += 28;

      const personNodes = graphData.nodes.filter((n) => n.type === 'person');
      if (personNodes.length === 0) {
        p2Ctx.font = 'italic 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        p2Ctx.fillStyle = '#64748b';
        p2Ctx.fillText('Nu au fost identificate persoane fizice înregistrate oficial.', c1X + 10, c1Y + 15);
        c1Y += 40;
      } else {
        personNodes.slice(0, 4).forEach((p) => {
          drawCanvasRoundRect(p2Ctx, c1X, c1Y, c1W, 90, 12, '#ffffff', '#e2e8f0', 1.5);

          p2Ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          p2Ctx.fillStyle = '#0f172a';
          p2Ctx.fillText(p.fullName || p.label, c1X + 22, c1Y + 34);

          p2Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          p2Ctx.fillStyle = '#475569';
          const rolesText = p.roles || (p.isHistorical ? 'Fost Administrator' : 'Conducere');
          p2Ctx.fillText(`Rol: ${rolesText} ${p.percent > 0 ? `(${p.percent}%)` : ''}`, c1X + 22, c1Y + 64);

          // Status Badge Pill
          if (p.isHistorical) {
            const badgeW = 240;
            const badgeX = c1X + c1W - badgeW - 20;
            drawCanvasRoundRect(p2Ctx, badgeX, c1Y + 28, badgeW, 32, 16, '#f1f5f9', '#cbd5e1', 1.5);
            p2Ctx.textAlign = 'center';
            p2Ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            p2Ctx.fillStyle = '#475569';
            p2Ctx.fillText(`FOST - Mandat Încheiat ${p.mandatPeriod || ''}`.trim(), badgeX + badgeW / 2, c1Y + 49);
            p2Ctx.textAlign = 'left';
          } else {
            const badgeW = 90;
            const badgeX = c1X + c1W - badgeW - 20;
            drawCanvasRoundRect(p2Ctx, badgeX, c1Y + 28, badgeW, 32, 16, '#ecfdf5', '#a7f3d0', 1.5);
            p2Ctx.textAlign = 'center';
            p2Ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            p2Ctx.fillStyle = '#059669';
            p2Ctx.fillText('ACTIV', badgeX + badgeW / 2, c1Y + 49);
            p2Ctx.textAlign = 'left';
          }

          c1Y += 105;
        });
      }

      c1Y += 15;
      // Col 1 Section 2: Firme Afiliate
      p2Ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p2Ctx.fillStyle = '#0f172a';
      p2Ctx.fillText('2. FIRME AFILIATE (REȚEA ASOCIAȚI)', c1X, c1Y);
      c1Y += 28;

      const netFirme = graphData.nodes.filter((n) => n.type === 'related_company' && n.relation !== 'Sediu Comun');
      if (netFirme.length === 0) {
        p2Ctx.font = 'italic 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        p2Ctx.fillStyle = '#64748b';
        p2Ctx.fillText('Nu au fost detectate firme externe în rețeaua asociaților.', c1X + 10, c1Y + 15);
        c1Y += 40;
      } else {
        netFirme.slice(0, 6).forEach((f) => {
          drawCanvasRoundRect(p2Ctx, c1X, c1Y, c1W, 80, 10, '#ffffff', '#e2e8f0', 1.5);

          p2Ctx.font = 'bold 14.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          p2Ctx.fillStyle = '#0f172a';
          p2Ctx.fillText(f.fullName || f.label, c1X + 22, c1Y + 32);

          p2Ctx.font = '12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          p2Ctx.fillStyle = '#64748b';
          p2Ctx.fillText(`CUI: ${f.cui || '-'}   •   Relație: ${f.relation || 'Afiliată'}   •   Stare: ${f.stare || 'Activă'}`, c1X + 22, c1Y + 58);

          c1Y += 92;
        });
      }

      // Col 2 Section 3: Sediu Social & Clustere
      p2Ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p2Ctx.fillStyle = '#0f172a';
      p2Ctx.fillText('3. SEDIU SOCIAL & CLUSTER CO-LOCARE', c2X, c2Y);
      c2Y += 28;

      const addressNode = graphData.nodes.find((n) => n.type === 'address');
      if (addressNode) {
        drawCanvasRoundRect(p2Ctx, c2X, c2Y, c2W, 110, 12, '#f0fdf4', '#bbf7d0', 1.5);

        p2Ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        p2Ctx.fillStyle = '#14532d';
        p2Ctx.fillText(addressNode.addrLine1 || addressNode.label || 'Sediu Social', c2X + 22, c2Y + 34);

        p2Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        p2Ctx.fillStyle = '#166534';
        p2Ctx.fillText(addressNode.addrLine2 || 'Adresă oficială ANAF', c2X + 22, c2Y + 62);
        p2Ctx.fillText(`Entități identificate la acest sediu: ${addressNode.clusterCount || 1}`, c2X + 22, c2Y + 90);

        c2Y += 128;
      }

      // Firme co-locate la sediu
      const clusterNodes = graphData.nodes.filter((n) => n.type === 'related_company' && n.relation === 'Sediu Comun');
      if (clusterNodes.length > 0) {
        p2Ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        p2Ctx.fillStyle = '#475569';
        p2Ctx.fillText(`Firme la același sediu (${clusterNodes.length}):`, c2X, c2Y);
        c2Y += 24;

        clusterNodes.slice(0, 7).forEach((cf) => {
          p2Ctx.font = '12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          p2Ctx.fillStyle = '#334155';
          const loc = cf.room ? ` (${cf.room})` : '';
          p2Ctx.fillText(`• ${cf.fullName || cf.label}${loc}  -  CUI: ${cf.cui || '-'} [${cf.stare || 'Activ'}]`, c2X + 12, c2Y);
          c2Y += 24;
        });
        c2Y += 15;
      }

      // Col 2 Section 4: Factori de Risc & Alerte
      c2Y = Math.max(c2Y, c1Y - 260);
      p2Ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p2Ctx.fillStyle = '#dc2626';
      p2Ctx.fillText('4. FACTORI DE RISC & ALERTE DETECTATE', c2X, c2Y);
      c2Y += 28;

      const riskNodes = graphData.nodes.filter((n) => n.type === 'risk');
      if (riskNodes.length === 0) {
        p2Ctx.font = 'italic 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        p2Ctx.fillStyle = '#166534';
        p2Ctx.fillText('Nu au fost identificate semnale majore de risc fiscal sau juridic.', c2X + 10, c2Y + 15);
        c2Y += 40;
      } else {
        riskNodes.slice(0, 4).forEach((r) => {
          drawCanvasRoundRect(p2Ctx, c2X, c2Y, c2W, 95, 10, '#fef2f2', '#fecaca', 1.5);

          p2Ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          p2Ctx.fillStyle = '#991b1b';
          p2Ctx.fillText(r.label || 'Alertă de risc', c2X + 20, c2Y + 32);

          p2Ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          p2Ctx.fillStyle = '#b91c1c';
          const desc = r.fullText || 'Verificați detaliile în dosarul de analiză';
          drawCanvasWrappedText(p2Ctx, desc, c2X + 20, c2Y + 56, c2W - 40, 18, 2);

          c2Y += 108;
        });
      }

      // Page 2 Footer
      p2Ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
      p2Ctx.fillStyle = '#94a3b8';
      p2Ctx.fillText('Axis Cloud Platform • Raport de Evaluare și Investigare Rețea Afiliere • Confidențial • Pagina 2 / 2', 90, 1640);

      // ==========================================
      // ASSEMBLE EXECUTIVE 2-PAGE PDF DOCUMENT
      // ==========================================
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4', unit: 'mm' });
      doc.addImage(p1Canvas.toDataURL('image/png', 0.95), 'PNG', 0, 0, 297, 210);
      doc.addPage();
      doc.addImage(p2Canvas.toDataURL('image/png', 0.95), 'PNG', 0, 0, 297, 210);

      const cleanFileName = (clientName || 'Investigatie_OSINT').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Raport_Investigatie_${cleanFileName}_${clientCui || 'OSINT'}.pdf`);
    } catch (err) {
      console.error('Eroare export PDF:', err);
      alert('A aparut o eroare la generarea PDF-ului: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const containerClasses = isFullscreen
    ? 'fixed inset-0 z-[9999]'
    : `relative w-full rounded-2xl overflow-hidden border shadow-2xl transition-colors duration-200 ${
        isDark ? 'border-gray-800 bg-[#070b14]' : 'border-gray-200 bg-slate-50'
      }`;

  return (
    <div ref={containerRef} className={containerClasses} style={isFullscreen ? {} : { height: '680px' }}>
      {/* Background texture */}
      <div
        className="absolute inset-0 transition-all duration-300"
        style={{
          background: isDark
            ? `
              radial-gradient(ellipse at 50% 50%, rgba(30,58,95,0.25) 0%, transparent 65%),
              radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.12) 0%, transparent 50%),
              radial-gradient(ellipse at 20% 80%, rgba(239,68,68,0.06) 0%, transparent 50%),
              linear-gradient(180deg, #070b14 0%, #0f172a 50%, #070b14 100%)
            `
            : `
              radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.92) 0%, rgba(241,245,249,0.7) 100%),
              radial-gradient(ellipse at 80% 20%, rgba(219,234,254,0.3) 0%, transparent 50%),
              radial-gradient(ellipse at 20% 80%, rgba(254,226,226,0.25) 0%, transparent 50%),
              linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)
            `,
        }}
      >
        {/* Subtle grid */}
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            isDark ? 'opacity-[0.035]' : 'opacity-[0.055]'
          }`}
          style={{
            backgroundImage: isDark
              ? `
                linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
              `
              : `
                linear-gradient(rgba(15,23,42,0.15) 1px, transparent 1px),
                linear-gradient(90deg, rgba(15,23,42,0.15) 1px, transparent 1px)
              `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Header bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3.5 transition-colors duration-200 ${
          isDark
            ? 'bg-gradient-to-b from-[#070b14]/95 via-[#070b14]/75 to-transparent'
            : 'bg-gradient-to-b from-white/95 via-white/80 to-transparent border-b border-gray-200/50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
              isDark ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <Shield size={14} className={isDark ? 'text-red-400' : 'text-red-600'} />
            <span
              className={`text-[11px] font-black uppercase tracking-[0.15em] ${
                isDark ? 'text-red-300' : 'text-red-700'
              }`}
            >
              Investigation Board
            </span>
          </div>
          <div className={`h-5 w-px ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />
          <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{clientName}</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded border ${
              isDark
                ? 'text-gray-400 bg-gray-800/80 border-gray-700/60'
                : 'text-gray-600 bg-white border-gray-200 shadow-xs'
            }`}
          >
            CUI: {clientCui}
          </span>
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${
              isDark
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
            title="Sistem hibrid JEV Engine: Validare deterministă 0% halucinații din surse oficiale (ONRC, ANAF, BPI)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>JEV 0% Halucinații</span>
          </div>
          {isLiquidation && (
            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${
                isDark
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                  : 'border-amber-300 bg-amber-50 text-amber-800'
              }`}
              title="Societatea se află în procedură de faliment/radiere. Conducerea este exercitată de Lichidatorul Judiciar."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Lichidare Judiciară</span>
            </div>
          )}
        </div>

        {/* Interactive Search Bar */}
        <div className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md mx-2">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
              isDark
                ? isSearchFocused
                  ? 'bg-gray-800 border-primary ring-2 ring-primary/20'
                  : 'bg-gray-800/90 border-gray-700/60'
                : isSearchFocused
                ? 'bg-white border-primary ring-2 ring-primary/20 shadow-sm'
                : 'bg-white/90 border-gray-200 shadow-xs'
            }`}
          >
            <Search size={14} className={isSearchFocused ? 'text-primary' : 'text-gray-400'} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleDirectSearchSubmit();
                }
              }}
              placeholder="Caută CUI sau firmă din rețea / ReCom..."
              className={`w-full bg-transparent text-xs outline-none ${
                isDark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full cursor-pointer"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Search Autocomplete Dropdown */}
          {isSearchFocused && (
            <div
              className={`absolute left-0 right-0 top-full mt-1.5 rounded-2xl border shadow-2xl z-50 overflow-hidden divide-y ${
                isDark
                  ? 'bg-slate-900/98 border-gray-700 text-white divide-gray-800'
                  : 'bg-white/98 border-gray-200 text-gray-900 divide-gray-100'
              }`}
              style={{ backdropFilter: 'blur(16px)' }}
            >
              {filteredNodes.length > 0 ? (
                <div className="p-1.5 max-h-64 overflow-y-auto space-y-1">
                  {filteredNodes.map((node) => {
                    const isComp = node.type === 'company' || node.type === 'related_company';
                    const isPers = node.type === 'person' || node.type === 'person_historical';
                    return (
                      <div
                        key={node.id}
                        onMouseDown={() => handleSelectSearchResult(node)}
                        className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between gap-2 transition-all ${
                          isDark ? 'hover:bg-gray-800/80' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="text-[9px] font-black px-1.5 py-0.5 rounded text-white shrink-0"
                            style={{ background: activeConfig[node.type]?.badge }}
                          >
                            {activeConfig[node.type]?.abbr}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">
                              {node.fullName || node.label}
                            </div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-2">
                              {node.cui && <span>CUI: {node.cui}</span>}
                              {node.roles && <span>• {node.roles}</span>}
                              {node.relation && <span>• {node.relation}</span>}
                            </div>
                          </div>
                        </div>

                        {/* Action quick buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isComp && node.cui && onOpenCompany && (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                onOpenCompany(node.cui, node.fullName || node.label);
                              }}
                              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[10px] font-medium flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                              title="Deschide dosar complet firmă"
                            >
                              <Building2 size={11} />
                              <span>Dosar</span>
                            </button>
                          )}
                          {isPers && onOpenPerson && (
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                onOpenPerson(node.fullName || node.label, clientCui);
                              }}
                              className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[10px] font-medium flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                              title="Deschide dosar persoană"
                            >
                              <User size={11} />
                              <span>Dosar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {searchQuery.trim() && (
                <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 rounded-b-xl space-y-1.5">
                  {onOpenCompany && (
                    <button
                      type="button"
                      onMouseDown={handleDirectSearchSubmit}
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-xs flex items-center justify-between gap-2 transition-all cursor-pointer text-left"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Building2 size={13} className="shrink-0 text-slate-500" />
                        <span className="truncate">Deschide Dosar Complet: "{searchQuery.trim()}"</span>
                      </span>
                      <ExternalLink size={11} className="shrink-0 text-slate-400" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={expandingNodeId === 'search'}
                    onMouseDown={() => handleSearchAndExpandToGraph(searchQuery)}
                    className="w-full p-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-medium text-xs flex items-center justify-between gap-2 transition-all cursor-pointer text-left disabled:opacity-50"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      {expandingNodeId === 'search' ? (
                        <Loader2 size={13} className="animate-spin text-slate-400 shrink-0" />
                      ) : (
                        <GitBranch size={13} className="shrink-0" />
                      )}
                      <span className="truncate">Adaugă &amp; Extinde în Graf: "{searchQuery.trim()}"</span>
                    </span>
                    <Plus size={11} className="shrink-0" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className={`p-2 rounded-lg transition-all border cursor-pointer ${
              isDark
                ? 'bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700/60'
                : 'bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border-gray-200 shadow-xs'
            }`}
          >
            <ZoomIn size={13} />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className={`p-2 rounded-lg transition-all border cursor-pointer ${
              isDark
                ? 'bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700/60'
                : 'bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border-gray-200 shadow-xs'
            }`}
          >
            <ZoomOut size={13} />
          </button>
          <button
            onClick={handleCenter}
            title="Centrează rețeaua"
            className={`p-2 rounded-lg transition-all border cursor-pointer ${
              isDark
                ? 'bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700/60'
                : 'bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border-gray-200 shadow-xs'
            }`}
          >
            <Target size={13} />
          </button>
          <button
            onClick={handleResetLayout}
            title="Deblochează și rearanjează automat nodurile"
            className={`p-2 rounded-lg transition-all border cursor-pointer ${
              isDark
                ? 'bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700/60'
                : 'bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border-gray-200 shadow-xs'
            }`}
          >
            <RotateCcw size={13} />
          </button>
          {onOpenGovernance && (
            <button
              type="button"
              onClick={onOpenGovernance}
              title="Deschide panoul detaliat de Acționari & Conducere Oficială"
              className={`px-2.5 py-1.5 rounded-lg transition-all border cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
                isDark
                  ? 'bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border-indigo-700/60'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-xs'
              }`}
            >
              <Users size={13} />
              <span>Acționari & Conducere</span>
            </button>
          )}
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            title="Exportă Panoul de Investigație în format PDF"
            className={`px-2.5 py-1.5 rounded-lg transition-all border cursor-pointer flex items-center gap-1.5 text-xs font-semibold ${
              isDark
                ? 'bg-gray-800/90 hover:bg-gray-700 text-gray-200 border-gray-700/60'
                : 'bg-white hover:bg-gray-100 text-gray-800 border-gray-200 shadow-xs'
            }`}
          >
            <FileDown size={13} className={isExporting ? 'animate-bounce' : ''} />
            <span>{isExporting ? 'Se generează...' : 'Export PDF'}</span>
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Ecran complet"
            className={`p-2 rounded-lg transition-all border cursor-pointer ${
              isDark
                ? 'bg-gray-800/90 hover:bg-gray-700 text-gray-300 hover:text-white border-gray-700/60'
                : 'bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900 border-gray-200 shadow-xs'
            }`}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              title="Închide"
              className={`p-2 rounded-lg transition-all border cursor-pointer ${
                isDark
                  ? 'bg-gray-800/90 hover:bg-red-900/60 text-gray-300 hover:text-red-300 border-gray-700/60'
                  : 'bg-white hover:bg-red-50 text-gray-700 hover:text-red-600 border-gray-200 shadow-xs'
              }`}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Lightweight Hover Tooltip at Top-Center (Zero obstruction of graph) */}
      {hoveredNode && !selectedNode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-in fade-in zoom-in-95 duration-100">
          <div className={`px-3 py-1 rounded-full border shadow-md backdrop-blur-md flex items-center gap-2 text-xs ${
            isDark ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-white/95 border-slate-200 text-slate-900'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 animate-pulse" />
            <span className="font-bold truncate max-w-[260px]">{hoveredNode.fullName || hoveredNode.label}</span>
            <span className="text-[10px] text-slate-400 border-l pl-2 border-slate-300 dark:border-slate-700">Click pt. opțiuni</span>
          </div>
        </div>
      )}

      {/* Floating Node Details Card on Select (Compact & Collapsible) */}
      {selectedNode && (
        <div className="absolute top-14 right-4 z-20 transition-all animate-in fade-in" style={{ animationDuration: '100ms' }}>
          {isInspectorMinimized ? (
            /* Minimized Pill: 34px height, does not obstruct the canvas */
            <div
              className={`px-3 py-1.5 rounded-full border shadow-lg flex items-center gap-2 backdrop-blur-xl transition-all ${
                isDark ? 'bg-slate-900/90 border-slate-700 text-white' : 'bg-white/90 border-slate-200 text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-xs font-bold truncate max-w-[140px]">{selectedNode.fullName || selectedNode.label}</span>

              {(selectedNode.type === 'company' || selectedNode.type === 'related_company' || selectedNode.type === 'person' || selectedNode.type === 'person_historical') && (
                <button
                  type="button"
                  disabled={expandingNodeId === selectedNode.id}
                  onClick={() => handleExpandNode(selectedNode)}
                  className="px-2.5 py-0.5 rounded-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50"
                  title="Extinde în graf"
                >
                  {expandingNodeId === selectedNode.id ? <Loader2 size={10} className="animate-spin" /> : <GitBranch size={10} />}
                  <span>Extinde</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsInspectorMinimized(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Deschide panoul complet"
              >
                <ChevronDown size={14} />
              </button>

              <button
                type="button"
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                title="Închide"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            /* Compact Tahoe Inspector Window */
            <div
              className={`p-3 rounded-2xl border shadow-xl transition-all pointer-events-auto w-[275px] max-h-[82vh] overflow-y-auto ${
                isDark
                  ? 'bg-slate-900/95 border-slate-800 text-slate-100'
                  : 'bg-white/95 border-slate-200 text-slate-900'
              }`}
              style={{ backdropFilter: 'blur(20px)' }}
            >
              {(() => {
                const activeNode = selectedNode;
                const isComp = activeNode.type === 'company' || activeNode.type === 'related_company';
                const isPers = activeNode.type === 'person' || activeNode.type === 'person_historical';
                const isHist = activeNode.type === 'person_historical' || activeNode.isHistorical;
                const cleanRoles = formatCleanRoles(activeNode.roles, activeNode.percent);

                let badgeLabel = 'Informație';
                if (activeNode.isRoot) {
                  badgeLabel = 'Subiect Principal';
                } else if (activeNode.relation === 'Sediu Comun' || activeNode.relation?.toLowerCase().includes('sediu')) {
                  badgeLabel = 'Sediu Comun';
                } else if (isComp) {
                  badgeLabel = activeNode.type === 'company' ? 'Firmă Principală' : 'Firmă din Rețea';
                } else if (isPers) {
                  if (activeNode.percent === 100) badgeLabel = 'Asociat Unic (100%)';
                  else if (activeNode.percent > 0) badgeLabel = `Asociat (${activeNode.percent}%)`;
                  else if (isHist) badgeLabel = 'Fost Admin';
                  else badgeLabel = 'Administrator';
                } else if (activeNode.type === 'address') {
                  badgeLabel = 'Sediu / Adresă';
                } else if (activeNode.type === 'risk') {
                  badgeLabel = 'Semnal Risc';
                }

                return (
                  <>
                    {/* Header Row with Badge & Controls */}
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {badgeLabel}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setIsInspectorMinimized(true)}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Minimizează fereastra"
                        >
                          <ChevronUp size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedNode(null)}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          title="Închide fereastra"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Node Title */}
                    <div className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 leading-snug line-clamp-2" title={activeNode.fullName || activeNode.label}>
                      {activeNode.fullName || activeNode.label}
                    </div>

                    {/* Clean Roles / Conducere */}
                    {cleanRoles && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium leading-tight">
                        {cleanRoles}
                      </div>
                    )}

                    {/* Meta Info: CUI & Înființare */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      {activeNode.cui && (
                        <span className="font-semibold text-slate-700 dark:text-slate-300">CUI: {activeNode.cui}</span>
                      )}
                      {activeNode.an_infiintare && (
                        <span>Înființat: {activeNode.an_infiintare}</span>
                      )}
                      {(activeNode.stare || activeNode.isRoot) && (
                        <span className="flex items-center gap-1">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              activeNode.stare === 'Activ' || activeNode.isRoot ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          <span>{activeNode.isRoot ? 'Client' : (activeNode.stare || 'Activ')}</span>
                        </span>
                      )}
                    </div>

                    {/* Address Line (Truncated cleanly) */}
                    {activeNode.fullAddr && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-1 truncate" title={activeNode.fullAddr}>
                        {activeNode.fullAddr}
                      </div>
                    )}

                    {/* Direct Action Buttons: Compact & Powerful */}
                    <div className="mt-2.5 space-y-1.5">
                      {isComp && (
                        <button
                          type="button"
                          disabled={expandingNodeId === activeNode.id}
                          onClick={() => handleExpandNode(activeNode)}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                          title="Extinde conexiunile în graf"
                        >
                          {expandingNodeId === activeNode.id ? (
                            <>
                              <Loader2 size={12} className="animate-spin text-white dark:text-slate-900" />
                              <span>Se extinde în graf...</span>
                            </>
                          ) : (
                            <>
                              <GitBranch size={12} />
                              <span>{expandedNodeIds.has(activeNode.id) ? 'Re-extinde Conexiunile' : 'Extinde Rețeaua în Graf'}</span>
                            </>
                          )}
                        </button>
                      )}

                      {(activeNode.cui || isComp) && onOpenCompany && (
                        <button
                          type="button"
                          onClick={() => onOpenCompany(activeNode.cui, activeNode.fullName || activeNode.label)}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                          title="Deschide dosar complet ANAF & Bilanț"
                        >
                          <Building2 size={11} />
                          <span>Deschide Dosar Firmă</span>
                          <ExternalLink size={10} className="opacity-60" />
                        </button>
                      )}

                      {isPers && (
                        <button
                          type="button"
                          disabled={expandingNodeId === activeNode.id}
                          onClick={() => handleExpandNode(activeNode)}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                          title="Extinde firmele persoanei în graf"
                        >
                          {expandingNodeId === activeNode.id ? (
                            <>
                              <Loader2 size={12} className="animate-spin text-white dark:text-slate-900" />
                              <span>Se încarcă companiile...</span>
                            </>
                          ) : (
                            <>
                              <GitBranch size={12} />
                              <span>{expandedNodeIds.has(activeNode.id) ? 'Re-extinde Firmele' : 'Extinde Firmele în Graf'}</span>
                            </>
                          )}
                        </button>
                      )}

                      {isPers && onOpenPerson && (
                        <button
                          type="button"
                          onClick={() => onOpenPerson(activeNode.fullName || activeNode.label, clientCui)}
                          className="w-full py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-semibold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                          title="Deschide dosar persoană"
                        >
                          <User size={11} />
                          <span>Dosar Persoană</span>
                          <ExternalLink size={10} className="opacity-60" />
                        </button>
                      )}
                    </div>

                    {/* Compact Financial Strip */}
                    {isComp && (activeNode.cifra_afaceri || activeNode.balance?.cifra_afaceri || activeNode.angajati !== undefined) && (() => {
                      const ca = activeNode.cifra_afaceri || activeNode.balance?.cifra_afaceri;
                      const p = activeNode.profit_net !== undefined && activeNode.profit_net !== null ? activeNode.profit_net : activeNode.balance?.profit_net;
                      const l = activeNode.pierdere_neta !== undefined && activeNode.pierdere_neta !== null ? activeNode.pierdere_neta : activeNode.balance?.pierdere_neta;
                      const netVal = (p || 0) - (l || 0);
                      const isPos = netVal >= 0;
                      const hasNet = p !== undefined || l !== undefined;

                      return (
                        <div className="mt-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-[10px] space-y-1">
                          <div className="flex items-center justify-between text-slate-500 font-medium">
                            <span>Bilanț {activeNode.an_bilant || 'Fiscal'}</span>
                            <span>{activeNode.angajati !== null && activeNode.angajati !== undefined ? `${activeNode.angajati} angajați` : ''}</span>
                          </div>
                          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                            <span>CA: {ca ? `${formatMoneyShort(ca)} lei` : '-'}</span>
                            {hasNet && (
                              <span className={isPos ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : 'text-rose-600 dark:text-rose-400 font-extrabold'}>
                                {isPos ? '+' : ''}{formatMoneyShort(netVal)} lei
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Feedback Notification for Expansion */}
                    {expandNotice && expandNotice.nodeId === activeNode.id && (
                      <div className="mt-2 p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[10px] text-emerald-800 dark:text-emerald-300 flex items-start gap-1 leading-snug">
                        <CheckCircle2 size={12} className="shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{expandNotice.text}</span>
                      </div>
                    )}

                    {/* Compact Footer: Direct connections & click away tip */}
                    {(() => {
                      const connCount = (graphData?.links || []).filter(l => {
                        const s = typeof l.source === 'object' ? l.source.id : l.source;
                        const t = typeof l.target === 'object' ? l.target.id : l.target;
                        return s === activeNode.id || t === activeNode.id;
                      }).length;
                      return (
                        <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="flex items-center gap-1 font-medium">
                            <GitBranch size={10} className="text-indigo-500" />
                            Conexiuni în graf:
                          </span>
                          <span className="font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded-full">
                            {connCount}
                          </span>
                        </div>
                      );
                    })()}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Legend & Stats at bottom */}
      <div className="absolute bottom-3 left-4 right-4 z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pointer-events-none">
        <div className="flex flex-wrap gap-1.5 pointer-events-auto">
          {Object.entries(activeConfig).map(([key, cfg]) => (
            <div
              key={key}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-medium border shadow-xs"
              style={{
                background: cfg.bg,
                borderColor: cfg.border + (isDark ? '60' : '80'),
                color: cfg.text,
              }}
            >
              <span className="font-black px-1 rounded text-white" style={{ background: cfg.badge }}>
                {cfg.abbr}
              </span>
              <span>{cfg.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <div
            className={`flex flex-wrap items-center gap-2 sm:gap-3 px-3.5 py-1.5 rounded-xl border shadow-lg transition-colors ${
              isDark
                ? 'bg-gray-900/90 border-gray-700/60 text-gray-300'
                : 'bg-white/95 border-gray-200 text-gray-700'
            }`}
          >
            <span className="text-[11px] font-semibold">{graphData.nodes.length} noduri în rețea</span>
            <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>|</span>
            <span className="text-[11px] font-semibold">{graphData.links.length} conexiuni</span>
            {financialSummary.totalAngajati > 0 && (
              <>
                <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>|</span>
                <span className="text-[11px] font-semibold flex items-center gap-1 text-slate-700 dark:text-slate-200">
                  <Users size={12} className="text-blue-500" />
                  {financialSummary.totalAngajati} angajați în rețea
                </span>
              </>
            )}
            {financialSummary.companiesWithBalance > 0 && (
              <>
                <span className={isDark ? 'text-gray-600' : 'text-gray-300'}>|</span>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Bilanț:</span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    financialSummary.isPositive
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  }`}
                >
                  {financialSummary.isPositive ? '+' : ''}
                  {formatMoneyShort(financialSummary.totalNetProfitLoss)} lei ({financialSummary.isPositive ? 'PROFIT' : 'PIERDERE'})
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Ieși din ecran complet' : 'Extinde investigația pe tot ecranul'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-lg transition-all cursor-pointer font-bold text-xs ${
              isDark
                ? 'bg-gray-900/90 hover:bg-gray-800 text-gray-200 hover:text-white border-gray-700/60'
                : 'bg-white/95 hover:bg-gray-50 text-gray-700 hover:text-gray-900 border-gray-200 shadow-md'
            }`}
          >
            {isFullscreen ? (
              <>
                <Minimize2 size={13} className="text-primary shrink-0" />
                <span>Restrânge</span>
              </>
            ) : (
              <>
                <Maximize2 size={13} className="text-primary shrink-0" />
                <span>Extinde</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ForceGraph Canvas */}
      <div className="w-full h-full relative">
        {/* Floating Action Pill directly over selected node on canvas */}
        {selectedNode && !isExporting && (
          (() => {
            const coords = graphRef.current?.graph2ScreenCoords(selectedNode.x, selectedNode.y);
            if (!coords || typeof coords.x !== 'number' || isNaN(coords.x)) return null;
            const dim = selectedNode.isRoot ? NODE_DIMENSIONS.company : (NODE_DIMENSIONS[selectedNode.type] || { w: 146, h: 76 });
            const isComp = selectedNode.type === 'company' || selectedNode.type === 'related_company';
            const isPers = selectedNode.type === 'person' || selectedNode.type === 'person_historical';
            if (!isComp && !isPers) return null;

            return (
              <div
                className="absolute z-20 pointer-events-auto transition-all duration-150 animate-in fade-in zoom-in-95"
                style={{
                  left: `${coords.x}px`,
                  top: `${Math.max(16, coords.y - (dim.h / 2) * (graphRef.current?.zoom() || 1) - 38)}px`,
                  transform: 'translateX(-50%)',
                }}
              >
                <div className="flex items-center gap-1.5 p-1 rounded-full bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl text-white">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExpandNode(selectedNode);
                    }}
                    disabled={expandingNodeId === selectedNode.id}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                    title="Extinde rețeaua completă în graf"
                  >
                    {expandingNodeId === selectedNode.id ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Extindere...</span>
                      </>
                    ) : (
                      <>
                        <GitBranch size={12} />
                        <span>{isComp ? 'Extinde Rețea Firmei' : 'Extinde Firme Persoanei'}</span>
                      </>
                    )}
                  </button>

                  {isComp && onOpenCompany && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCompany(selectedNode.cui, selectedNode.fullName || selectedNode.label);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                      title="Deschide dosar complet firmă"
                    >
                      <Building2 size={11} />
                      <span>Dosar</span>
                      <ExternalLink size={10} className="opacity-70" />
                    </button>
                  )}

                  {isPers && onOpenPerson && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenPerson(selectedNode.fullName || selectedNode.label, clientCui);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-medium transition-colors cursor-pointer"
                      title="Deschide dosar persoană"
                    >
                      <User size={11} />
                      <span>Dosar</span>
                      <ExternalLink size={10} className="opacity-70" />
                    </button>
                  )}
                </div>
              </div>
            );
          })()
        )}

        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="transparent"
          nodeCanvasObject={(node, ctx, globalScale) => drawPinCard(node, ctx, globalScale, isDark, expandingNodeId, expandedNodeIds)}
          linkCanvasObject={(link, ctx, globalScale) => drawStringLink(link, ctx, globalScale, isDark)}
          onRenderFramePost={(ctx) => {
            if (graphData && graphData.links) {
              graphData.links.forEach((link) => drawLinkLabel(link, ctx, isDark));
            }
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            const dim = node.isRoot ? NODE_DIMENSIONS.company : (NODE_DIMENSIONS[node.type] || { w: 146, h: 76 });
            ctx.beginPath();
            ctx.rect(node.x - dim.w / 2 - 3, node.y - dim.h / 2 - 3, dim.w + 6, dim.h + 6);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          onNodeHover={setHoveredNode}
          onNodeClick={(node, event) => {
            const now = Date.now();
            const isDoubleClick = (now - lastClickRef.current.time < 400) && (lastClickRef.current.nodeId === node.id);
            lastClickRef.current = { time: now, nodeId: node.id };

            // Detecție sigură și 100% precisă a click-ului pe butonul de acțiune
            const canvasEl = event?.target?.tagName === 'CANVAS'
              ? event.target
              : containerRef.current?.querySelector('canvas');

            const clientX = event?.clientX ?? event?.nativeEvent?.clientX;
            const clientY = event?.clientY ?? event?.nativeEvent?.clientY;

            let clickedButton = false;
            if (canvasEl && graphRef.current && clientX !== undefined && clientY !== undefined) {
              const canvasRect = canvasEl.getBoundingClientRect();
              const mouseX = clientX - canvasRect.left;
              const mouseY = clientY - canvasRect.top;
              const gCoords = graphRef.current.screen2GraphCoords(mouseX, mouseY);
              const dim = node.isRoot ? NODE_DIMENSIONS.company : (NODE_DIMENSIONS[node.type] || { w: 146, h: 76 });
              const isComp = node.type === 'company' || node.type === 'related_company';
              const btnW = node.isRoot ? 76 : (isComp ? 58 : 56);
              const btnH = node.isRoot ? 17 : 16;
              const btnX = (node.x + dim.w / 2 - btnW - 6);
              const btnY = (node.y + dim.h / 2 - btnH - 5);

              // Click cu toleranță generoasă (+/- 12px) pe buton sau pe cadranul de acțiune dreapta-jos al cardului
              if (
                (gCoords.x >= btnX - 12 &&
                gCoords.x <= btnX + btnW + 12 &&
                gCoords.y >= btnY - 12 &&
                gCoords.y <= btnY + btnH + 12) ||
                (gCoords.y >= node.y && gCoords.x >= node.x - 10)
              ) {
                clickedButton = true;
              }
            }

            const wasAlreadySelected = selectedNode && selectedNode.id === node.id;
            if (clickedButton || wasAlreadySelected || isDoubleClick) {
              handleExpandNode(node);
              setSelectedNode(node);
            } else {
              setSelectedNode(node);
              if (graphRef.current) {
                graphRef.current.centerAt(node.x, node.y, 400);
                graphRef.current.zoom(1.8, 400);
              }
            }
          }}
          onNodeDoubleClick={(node) => {
            // Double-click pe orice card expandează instantaneu rețeaua!
            handleExpandNode(node);
          }}
          onNodeDrag={(node) => {
            node.fx = node.x;
            node.fy = node.y;
          }}
          onNodeDragEnd={(node) => {
            node.fx = node.x;
            node.fy = node.y;
          }}
          onNodeRightClick={(node) => {
            if (node.isRoot) {
              node.fx = 0;
              node.fy = 0;
              node.x = 0;
              node.y = 0;
            } else {
              node.fx = undefined;
              node.fy = undefined;
            }
            if (graphRef.current) {
              graphRef.current.d3ReheatSimulation();
            }
          }}
          onBackgroundClick={() => setSelectedNode(null)}
          onEngineStop={() => {
            if (!hasAutoCentered.current) {
              hasAutoCentered.current = true;
              centerOnRoot(400);
            }
          }}
          cooldownTicks={160}
          warmupTicks={80}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          enableNodeDrag={true}
          enableZoomPanInteraction={true}
        />
      </div>
    </div>
  );
}
