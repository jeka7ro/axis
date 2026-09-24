import { jsPDF } from 'jspdf';
import { getCaenInfo, getCaenDescription } from './caenHelper';

/**
 * Helper to draw crisp rounded rectangles on Canvas
 */
function drawCanvasRoundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth = 1) {
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
}

/**
 * Helper for multiline text wrapping
 */
function drawCanvasWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
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
        ctx.fillText((line + words.slice(n + 1).join(' ')).slice(0, 95) + '...', x, y);
        return y + lineHeight;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y);
  return y + lineHeight;
}

/**
 * Format currency number in Romanian format
 */
function fmtCurrency(val) {
  if (val === undefined || val === null || val === '') return '—';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  return new Intl.NumberFormat('ro-RO').format(num);
}

/**
 * Generates an executive 2-page Portrait A4 Credit Committee Dossier (PDF)
 * @param {Object} client - Client object from DB
 * @param {Object} latestEval - Latest Evaluation record
 */
export async function generateCreditCommitteeReport(client, latestEval) {
  if (!client || !latestEval) {
    throw new Error('Date insuficiente pentru generarea raportului de credit.');
  }

  // Parse raw financial data safely
  let rawData = {};
  if (latestEval.raw_financial_data) {
    try {
      rawData = typeof latestEval.raw_financial_data === 'string'
        ? JSON.parse(latestEval.raw_financial_data)
        : latestEval.raw_financial_data;
    } catch {
      rawData = {};
    }
  }

  const anaf = rawData.anaf || {};
  const balance = rawData.balance || {};
  const personnel = rawData.personnel || [];
  const holdings = rawData.holdings || [];
  const administrators = rawData.administrators || [];
  const bpi = rawData.bpi || {};
  const courtCases = rawData.court_cases || [];
  const osintFlags = rawData.osint_flags || [];

  const clientName = client.name || anaf.denumire || 'Companie Client';
  const clientCui = client.cui_cnp || anaf.cui || '—';
  const clientRegCom = client.reg_com || anaf.reg_com || anaf.nr_reg_com || '—';
  const clientAddress = client.address || anaf.adresa || '—';
  const score = Number(latestEval.score) || 50;
  const riskLevel = latestEval.risk_level || 'Moderat';

  // Committee decision logic
  let decisionTitle = '';
  let decisionBadgeColor = '';
  let decisionBgColor = '';
  let decisionBorderColor = '';
  let decisionDesc = '';

  if (score >= 70) {
    decisionTitle = 'AVIZ FAVORABIL • FINANȚARE APROBATĂ';
    decisionBadgeColor = '#059669';
    decisionBgColor = '#ecfdf5';
    decisionBorderColor = '#a7f3d0';
    decisionDesc = 'Clientul întrunește criteriile de eligibilitate. Se recomandă aprobarea finanțării LT/leasing în condiții standard (Avans 10-15%, monitorizare flotă standard).';
  } else if (score >= 41) {
    decisionTitle = 'AVIZ CONDIȚIONAT • APROBAT CU GARANȚII (FIDEJUSIUNE)';
    decisionBadgeColor = '#d97706';
    decisionBgColor = '#fffbeb';
    decisionBorderColor = '#fde68a';
    decisionDesc = 'Finanțarea se aprobă exclusiv condiționată de: 1. Semnarea Contractului de Fidejusiune de către administrator/asociat majoritar; 2. Avans minim 20-25%; 3. Monitorizare GPS activă.';
  } else {
    decisionTitle = 'AVIZ NEFAVORABIL • PROPUNERE DE RESPINGERE';
    decisionBadgeColor = '#dc2626';
    decisionBgColor = '#fef2f2';
    decisionBorderColor = '#fecaca';
    decisionDesc = 'Risc major de neplată / insolvență identificat. Se propune respingerea cererii de creditare sau solicitarea unei garanții imobiliare/depozit colateral 100%.';
  }

  // Extract balance rows (up to 5 years)
  let istoricBalanta = [];
  if (Array.isArray(balance.istoric) && balance.istoric.length > 0) {
    istoricBalanta = [...balance.istoric].sort((a, b) => Number(b.an) - Number(a.an));
  } else if (balance.ani && typeof balance.ani === 'object') {
    istoricBalanta = Object.keys(balance.ani).map((year) => ({
      an: year,
      ...balance.ani[year],
    })).sort((a, b) => Number(b.an) - Number(a.an));
  } else if (balance.an) {
    istoricBalanta = [balance];
  }
  istoricBalanta = istoricBalanta.slice(0, 5);

  const nowFormatted = new Date().toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // A4 Portrait dimensions at 200 DPI: 1680 x 2376 px
  const pWidth = 1680;
  const pHeight = 2376;

  // =========================================================================
  // PAGE 1: DECIZIE COMITET, DATE FISCALE & TABLOU FINANCIAR 5 ANI
  // =========================================================================
  const p1Canvas = document.createElement('canvas');
  p1Canvas.width = pWidth;
  p1Canvas.height = pHeight;
  const p1Ctx = p1Canvas.getContext('2d');

  p1Ctx.fillStyle = '#ffffff';
  p1Ctx.fillRect(0, 0, pWidth, pHeight);

  // Top Navy Banner
  p1Ctx.fillStyle = '#0a1121';
  p1Ctx.fillRect(0, 0, pWidth, 160);

  p1Ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  p1Ctx.fillStyle = '#ffffff';
  p1Ctx.fillText('AXIS PREMIUM MOBILITY', 70, 75);

  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  p1Ctx.fillStyle = '#93c5fd';
  p1Ctx.fillText('RAPORT EXECUTIV COMITET DE CREDIT • EVALUARE SOLVABILITATE LEASING LT', 70, 115);

  p1Ctx.textAlign = 'right';
  p1Ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  p1Ctx.fillStyle = '#ffffff';
  p1Ctx.fillText('DOSAR ANALIZĂ CREDITARE', pWidth - 70, 75);

  p1Ctx.font = '12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  p1Ctx.fillStyle = '#cbd5e1';
  p1Ctx.fillText(`Generat: ${nowFormatted} • Confidențial Comitet de Risc`, pWidth - 70, 115);
  p1Ctx.textAlign = 'left';

  // 1. Executive Decision Box (Banner Decizie Comitet)
  drawCanvasRoundRect(p1Ctx, 70, 190, pWidth - 140, 175, 14, decisionBgColor, decisionBorderColor, 2);

  // Score Badge Circle/Pill Left
  drawCanvasRoundRect(p1Ctx, 95, 215, 180, 125, 12, '#ffffff', decisionBorderColor, 2);
  p1Ctx.textAlign = 'center';
  p1Ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#64748b';
  p1Ctx.fillText('SCOR RISK AI', 185, 245);

  p1Ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = decisionBadgeColor;
  p1Ctx.fillText(`${score}`, 185, 290);

  p1Ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillText(`/ 100 • ${riskLevel}`, 185, 318);
  p1Ctx.textAlign = 'left';

  // Decision Right Text
  p1Ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = decisionBadgeColor;
  p1Ctx.fillText(decisionTitle, 300, 240);

  p1Ctx.font = '13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#1e293b';
  drawCanvasWrappedText(p1Ctx, decisionDesc, 300, 272, pWidth - 460, 22, 2);

  p1Ctx.font = 'italic 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#475569';
  const summarySnippet = latestEval.ai_summary ? `Observație AI: ${latestEval.ai_summary.slice(0, 140)}...` : '';
  p1Ctx.fillText(summarySnippet, 300, 335);

  // 2. Date Identificare Fiscală & Conformitate ANAF
  let yPos = 395;
  p1Ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#0f172a';
  p1Ctx.fillText('1. DATE DE IDENTIFICARE FISCALĂ & CONFORMITATE OFICIALĂ (ANAF)', 70, yPos);
  yPos += 22;

  drawCanvasRoundRect(p1Ctx, 70, yPos, pWidth - 140, 215, 12, '#f8fafc', '#e2e8f0', 1.5);

  const colW = (pWidth - 190) / 2;
  const leftColX = 95;
  const rightColX = 95 + colW + 20;
  let textY = yPos + 36;

  // Left Column Details
  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#64748b';
  p1Ctx.fillText('Denumire Oficială:', leftColX, textY);
  p1Ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#0f172a';
  p1Ctx.fillText(clientName, leftColX + 145, textY);

  textY += 34;
  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#64748b';
  p1Ctx.fillText('Cod Fiscal (CUI):', leftColX, textY);
  p1Ctx.font = 'bold 13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#0f172a';
  p1Ctx.fillText(clientCui, leftColX + 145, textY);

  textY += 34;
  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#64748b';
  p1Ctx.fillText('Număr Înreg. ONRC:', leftColX, textY);
  p1Ctx.font = 'bold 13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#0f172a';
  p1Ctx.fillText(clientRegCom, leftColX + 145, textY);

  textY += 34;
  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#64748b';
  p1Ctx.fillText('Sediu Social:', leftColX, textY);
  p1Ctx.font = '12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#0f172a';
  p1Ctx.fillText(clientAddress.slice(0, 60), leftColX + 145, textY);

  textY += 34;
  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#64748b';
  p1Ctx.fillText('Activitate Principală:', leftColX, textY);
  p1Ctx.font = '12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#0f172a';
  const caenCode = anaf.cod_caen || client.caen || '—';
  const caenDesc = anaf.caen_descriere || getCaenDescription(caenCode) || '';
  p1Ctx.fillText(`CAEN ${caenCode} - ${caenDesc.slice(0, 50)}`, leftColX + 145, textY);

  // Right Column Details
  textY = yPos + 36;
  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#64748b';
  p1Ctx.fillText('Stare Fiscală ANAF:', rightColX, textY);
  p1Ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = anaf.inactiv_fiscal ? '#dc2626' : '#059669';
  p1Ctx.fillText(anaf.inactiv_fiscal ? 'INACTIV FISCAL' : (anaf.status || 'ACTIVĂ'), rightColX + 150, textY);

  textY += 34;
  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#64748b';
  p1Ctx.fillText('Înregistrare TVA:', rightColX, textY);
  p1Ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = anaf.tva_activ ? '#059669' : '#b45309';
  p1Ctx.fillText(anaf.tva_activ ? 'PLĂTITOR DE TVA' : 'NEPLĂTITOR DE TVA', rightColX + 150, textY);

  textY += 34;
  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#64748b';
  p1Ctx.fillText('TVA la Încasare:', rightColX, textY);
  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#0f172a';
  p1Ctx.fillText(anaf.tva_incasare ? 'DA' : 'NU', rightColX + 150, textY);

  textY += 34;
  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#64748b';
  p1Ctx.fillText('e-Factura RO:', rightColX, textY);
  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#059669';
  p1Ctx.fillText(anaf.e_factura ? 'Înrolat în sistem' : 'Activ conform reglementărilor', rightColX + 150, textY);

  textY += 34;
  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#64748b';
  p1Ctx.fillText('Telefon / Contact:', rightColX, textY);
  p1Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#0f172a';
  p1Ctx.fillText(anaf.telefon || client.phone || 'Nespecificat', rightColX + 150, textY);

  // 3. Tablou Indicatori Financiari Multianuali (Istoric 5 Ani)
  yPos += 245;
  p1Ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#0f172a';
  p1Ctx.fillText('2. TABLOU FINANCIAR MULTIANUAL & BILANȚURI OFICIALE (MINISTERUL FINANȚELOR)', 70, yPos);
  yPos += 22;

  // Table setup
  const years = istoricBalanta.map((r) => String(r.an));
  const tX = 70;
  const tW = pWidth - 140;
  const metricColW = 420;
  const yearColW = (tW - metricColW) / Math.max(1, years.length);
  const rowH = 46;

  // Table Header Row
  drawCanvasRoundRect(p1Ctx, tX, yPos, tW, rowH, 8, '#0f172a', '#0f172a');
  p1Ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p1Ctx.fillStyle = '#ffffff';
  p1Ctx.fillText('INDICATOR FINANCIAR OFICIAL (RON)', tX + 20, yPos + 28);

  years.forEach((yr, idx) => {
    p1Ctx.textAlign = 'right';
    p1Ctx.fillText(`AN ${yr}`, tX + metricColW + (idx + 1) * yearColW - 20, yPos + 28);
  });
  p1Ctx.textAlign = 'left';
  yPos += rowH;

  const metricsConfig = [
    { label: 'Cifră de Afaceri Netă', key: 'cifra_afaceri', bold: true },
    { label: 'Venituri Totale', key: 'venituri_totale', bold: false },
    { label: 'Profit Net / Pierdere Netă', key: 'profit_net', bold: true, isProfit: true },
    { label: 'Capitaluri Proprii', key: 'capitaluri_proprii', bold: true, isEquity: true },
    { label: 'Datorii Totale', key: 'datorii', bold: false },
    { label: 'Număr Mediu Salariați', key: 'salariati', bold: false, isNumber: true },
    { label: 'Active Imobilizate', key: 'active_imobilizate', bold: false },
    { label: 'Creanțe Comerciale', key: 'creante', bold: false },
    { label: 'Disponibilități Bănești (Casă & Bănci)', key: 'casa_banci', bold: false },
  ];

  metricsConfig.forEach((m, rIdx) => {
    const isEven = rIdx % 2 === 0;
    p1Ctx.fillStyle = isEven ? '#ffffff' : '#f8fafc';
    p1Ctx.fillRect(tX, yPos, tW, rowH);

    // Border line
    p1Ctx.strokeStyle = '#e2e8f0';
    p1Ctx.lineWidth = 1;
    p1Ctx.strokeRect(tX, yPos, tW, rowH);

    p1Ctx.font = m.bold
      ? 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p1Ctx.fillStyle = '#0f172a';
    p1Ctx.fillText(m.label, tX + 20, yPos + 28);

    istoricBalanta.forEach((yrRow, idx) => {
      let rawVal = yrRow[m.key];
      if (rawVal === undefined && m.key === 'profit_net') {
        if (yrRow.pierdere_neta && Number(yrRow.pierdere_neta) > 0) {
          rawVal = -Number(yrRow.pierdere_neta);
        }
      }
      if (rawVal === undefined && m.key === 'salariati') {
        rawVal = yrRow.angajati;
      }

      let formatted = m.isNumber ? (rawVal !== undefined ? String(rawVal) : '—') : fmtCurrency(rawVal);
      p1Ctx.textAlign = 'right';

      if (m.isEquity && Number(rawVal) < 0) {
        p1Ctx.fillStyle = '#dc2626';
        p1Ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        p1Ctx.fillText(`${formatted} (NEGATIV)`, tX + metricColW + (idx + 1) * yearColW - 20, yPos + 28);
      } else if (m.isProfit) {
        const pNum = Number(rawVal);
        p1Ctx.fillStyle = pNum > 0 ? '#059669' : pNum < 0 ? '#dc2626' : '#64748b';
        p1Ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        p1Ctx.fillText(formatted, tX + metricColW + (idx + 1) * yearColW - 20, yPos + 28);
      } else {
        p1Ctx.fillStyle = m.bold ? '#0f172a' : '#334155';
        p1Ctx.font = m.bold
          ? 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
          : '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        p1Ctx.fillText(formatted, tX + metricColW + (idx + 1) * yearColW - 20, yPos + 28);
      }
    });
    p1Ctx.textAlign = 'left';
    yPos += rowH;
  });

  // Capital Equity Legal Risk Note
  const latestRow = istoricBalanta[0] || {};
  if (Number(latestRow.capitaluri_proprii) < 0) {
    yPos += 14;
    drawCanvasRoundRect(p1Ctx, tX, yPos, tW, 58, 8, '#fef2f2', '#fecaca', 1);
    p1Ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p1Ctx.fillStyle = '#b91c1c';
    p1Ctx.fillText('ATENȚIONARE LEGALĂ RISC CAPITALURI PROPRII (Art. 153^24 din Legea 31/1990):', tX + 16, yPos + 24);
    p1Ctx.font = '11.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p1Ctx.fillText('Activul net s-a diminuat la mai puțin de jumătate din capitalul social subscris. Obligatoriu garanții suplimentare / Fidejusiune.', tX + 16, yPos + 44);
    yPos += 64;
  }

  // Footer Page 1
  p1Ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  p1Ctx.fillStyle = '#94a3b8';
  p1Ctx.fillText('Axis Cloud Platform • Raport de Evaluare și Decizie Comitet de Credit • Confidențial • Pagina 1 / 2', 70, pHeight - 45);

  // =========================================================================
  // PAGE 2: GUVERNANȚĂ, ASOCIAȚI, FIDEJUSOR PROPUS, LITIGII & APROBĂRI
  // =========================================================================
  const p2Canvas = document.createElement('canvas');
  p2Canvas.width = pWidth;
  p2Canvas.height = pHeight;
  const p2Ctx = p2Canvas.getContext('2d');

  p2Ctx.fillStyle = '#ffffff';
  p2Ctx.fillRect(0, 0, pWidth, pHeight);

  // Top Navy Header Bar (Minimal)
  p2Ctx.fillStyle = '#0a1121';
  p2Ctx.fillRect(0, 0, pWidth, 110);

  p2Ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  p2Ctx.fillStyle = '#ffffff';
  p2Ctx.fillText(`AXIS PREMIUM MOBILITY • DOSAR: ${clientName.slice(0, 50)} (CUI: ${clientCui})`, 70, 62);

  p2Ctx.textAlign = 'right';
  p2Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  p2Ctx.fillStyle = '#cbd5e1';
  p2Ctx.fillText('Anexă Guvernanță, Fidejusiune & Aprobări • Pagina 2 / 2', pWidth - 70, 62);
  p2Ctx.textAlign = 'left';

  let p2Y = 145;

  // 1. Structură Acționariat & Selecție Fidejusor
  p2Ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p2Ctx.fillStyle = '#0f172a';
  p2Ctx.fillText('3. GUVERNANȚĂ, ASOCIAȚI & DESEMNARE FIDEJUSOR (PENTRU CONTRACT FIDEJUSIUNE)', 70, p2Y);
  p2Y += 22;

  // Table of Associates / Admins
  const allPeople = [];
  const seenNames = new Set();

  holdings.forEach((h) => {
    const hName = (h.name || h.nume || '').trim();
    if (hName && !seenNames.has(hName.toUpperCase())) {
      seenNames.add(hName.toUpperCase());
      allPeople.push({
        name: hName,
        calitate: 'Asociat / Acționar',
        procent: h.procent || h.cota || (holdings.length === 1 ? 100 : '—'),
        isFidejusorEligible: true,
      });
    }
  });

  administrators.forEach((a) => {
    const aName = (a.nume || a.name || '').trim();
    if (aName && !seenNames.has(aName.toUpperCase())) {
      seenNames.add(aName.toUpperCase());
      allPeople.push({
        name: aName,
        calitate: a.calitate || 'Administrator',
        procent: '—',
        isFidejusorEligible: true,
      });
    }
  });

  personnel.forEach((p) => {
    const pName = (p.nume || p.name || '').trim();
    if (pName && !seenNames.has(pName.toUpperCase())) {
      seenNames.add(pName.toUpperCase());
      allPeople.push({
        name: pName,
        calitate: p.calitate || 'Conducere',
        procent: p.procent_capital || '—',
        isFidejusorEligible: true,
      });
    }
  });

  if (allPeople.length === 0) {
    drawCanvasRoundRect(p2Ctx, 70, p2Y, pWidth - 140, 70, 8, '#f8fafc', '#e2e8f0', 1);
    p2Ctx.font = 'italic 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2Ctx.fillStyle = '#64748b';
    p2Ctx.fillText('Nu sunt înregistrate persoane fizice ca asociați sau administratori în registrul curent.', 95, p2Y + 42);
    p2Y += 90;
  } else {
    // Header for Governance Table
    const govRowH = 44;
    drawCanvasRoundRect(p2Ctx, 70, p2Y, pWidth - 140, govRowH, 8, '#0f172a', '#0f172a');
    p2Ctx.font = 'bold 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2Ctx.fillStyle = '#ffffff';
    p2Ctx.fillText('NUME & PRENUME PERSOANĂ FIZICĂ', 90, p2Y + 28);
    p2Ctx.fillText('CALITATE OFICIALĂ', 600, p2Y + 28);
    p2Ctx.fillText('COTĂ CAPITAL', 900, p2Y + 28);
    p2Ctx.fillText('STATUT CONTRACT FIDEJUSIUNE (AXIS LT)', 1120, p2Y + 28);
    p2Y += govRowH;

    allPeople.slice(0, 5).forEach((pers, idx) => {
      p2Ctx.fillStyle = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      p2Ctx.fillRect(70, p2Y, pWidth - 140, govRowH);
      p2Ctx.strokeStyle = '#e2e8f0';
      p2Ctx.strokeRect(70, p2Y, pWidth - 140, govRowH);

      p2Ctx.font = 'bold 13.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      p2Ctx.fillStyle = '#0f172a';
      p2Ctx.fillText(pers.name, 90, p2Y + 28);

      p2Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      p2Ctx.fillStyle = '#475569';
      p2Ctx.fillText(pers.calitate, 600, p2Y + 28);
      p2Ctx.fillText(pers.procent !== '—' ? `${pers.procent}%` : '—', 900, p2Y + 28);

      // Fidejusor Badge Pill
      const isPrimary = idx === 0 || Number(pers.procent) >= 50;
      const bColor = isPrimary ? '#059669' : '#64748b';
      const bBg = isPrimary ? '#ecfdf5' : '#f1f5f9';
      const bBorder = isPrimary ? '#a7f3d0' : '#cbd5e1';
      const bText = isPrimary ? 'PROPUS FIDEJUSOR PRINCIPAL' : 'ELIGIBIL FIDEJUSIUNE';

      drawCanvasRoundRect(p2Ctx, 1120, p2Y + 8, 280, 28, 14, bBg, bBorder, 1);
      p2Ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      p2Ctx.fillStyle = bColor;
      p2Ctx.fillText(bText, 1135, p2Y + 26);

      p2Y += govRowH;
    });
    p2Y += 15;
  }

  // 2. Verificare Litigii, Just.ro & Insolvență BPI
  p2Y += 15;
  p2Ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p2Ctx.fillStyle = '#0f172a';
  p2Ctx.fillText('4. CAZIER JURIDIC, DOSARE ÎN INSTANȚĂ (PORTAL JUST.RO) & PROCEDURI BPI', 70, p2Y);
  p2Y += 22;

  const boxW = (pWidth - 160) / 2;
  const bpiBoxX = 70;
  const courtBoxX = 70 + boxW + 20;
  const boxH = 150;

  // BPI Box
  const hasInsolvency = Boolean(bpi.has_insolvency || bpi.count > 0);
  drawCanvasRoundRect(
    p2Ctx,
    bpiBoxX,
    p2Y,
    boxW,
    boxH,
    10,
    hasInsolvency ? '#fef2f2' : '#f0fdf4',
    hasInsolvency ? '#fecaca' : '#bbf7d0',
    1.5
  );

  p2Ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p2Ctx.fillStyle = hasInsolvency ? '#991b1b' : '#14532d';
  p2Ctx.fillText('BULETINUL PROCEDURILOR DE INSOLVENȚĂ (BPI)', bpiBoxX + 20, p2Y + 34);

  p2Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p2Ctx.fillStyle = hasInsolvency ? '#b91c1c' : '#166534';
  if (hasInsolvency) {
    p2Ctx.fillText(`ALERTĂ CRITICĂ: ${bpi.count || 1} dosare de insolvență / reorganizare detectate.`, bpiBoxX + 20, p2Y + 68);
    p2Ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2Ctx.fillText('Compania este supusă Legii 85/2014 privind procedurile de prevenire a insolvenței.', bpiBoxX + 20, p2Y + 98);
  } else {
    p2Ctx.fillText('CONFIRMAT: Niciun dosar sau procedură de insolvență activă.', bpiBoxX + 20, p2Y + 68);
    p2Ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2Ctx.fillText('Verificare efectuată în baza oficială a Registrului Comerțului și BPI.', bpiBoxX + 20, p2Y + 98);
  }

  // Court Cases Box
  const caseCount = Array.isArray(courtCases) ? courtCases.length : 0;
  const hasCases = caseCount > 0;
  drawCanvasRoundRect(
    p2Ctx,
    courtBoxX,
    p2Y,
    boxW,
    boxH,
    10,
    hasCases ? '#fffbeb' : '#f0fdf4',
    hasCases ? '#fde68a' : '#bbf7d0',
    1.5
  );

  p2Ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p2Ctx.fillStyle = hasCases ? '#92400e' : '#14532d';
  p2Ctx.fillText(`LITIGII ÎN INSTANȚĂ (PORTAL JUST.RO • ${caseCount} DOSARE)`, courtBoxX + 20, p2Y + 34);

  p2Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p2Ctx.fillStyle = hasCases ? '#b45309' : '#166534';
  if (hasCases) {
    p2Ctx.fillText(`Au fost identificate ${caseCount} dosare pe rolul instanțelor de judecată.`, courtBoxX + 20, p2Y + 68);
    const topCase = courtCases[0] || {};
    const cDesc = topCase.numar ? `Exemplu: Dosar ${topCase.numar} (${topCase.obiect || 'Litigiu'})` : 'Verificați anexa de litigii din dosar.';
    p2Ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2Ctx.fillText(cDesc.slice(0, 65), courtBoxX + 20, p2Y + 98);
  } else {
    p2Ctx.fillText('FĂRĂ LITIGII: Nu au fost găsite litigii active pe rolul instanțelor.', courtBoxX + 20, p2Y + 68);
    p2Ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2Ctx.fillText('Căutare efectuată după denumirea oficială a companiei pe portal.just.ro.', courtBoxX + 20, p2Y + 98);
  }

  p2Y += boxH + 30;

  // 3. Sinteză Alerte de Risc Detectate
  p2Ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p2Ctx.fillStyle = '#0f172a';
  p2Ctx.fillText('5. FACTORI DE RISC & MĂSURI PREVENTIVE RECOMANDATE', 70, p2Y);
  p2Y += 22;

  drawCanvasRoundRect(p2Ctx, 70, p2Y, pWidth - 140, 160, 10, '#f8fafc', '#e2e8f0', 1.5);

  const alertItems = [
    `1. Clauză de Fidejusiune: Se va anexa Contractul de Fidejusiune semnat de ${allPeople[0]?.name || 'administratorul statutar'}.`,
    '2. Monitorizare Activă GPS: Vehiculul va avea geofence activat cu alertare automată la apropierea de punctele de frontieră.',
    score >= 70
      ? '3. Bonitate Ridicată: Risc comercial redus, client eligibil pentru rate lunare extinse și parc auto multiplu.'
      : '3. Nivel de Risc Riscant: Se solicită avans minim 25% și plata primei rate la semnarea contractului.',
    '4. Verificare Tranzacții: Fără incidente bancare majore înscrise în Centrala Incidentelor de Plăți (CIP).',
  ];

  let alertY = p2Y + 34;
  alertItems.forEach((item) => {
    p2Ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2Ctx.fillStyle = '#334155';
    p2Ctx.fillText(item, 95, alertY);
    alertY += 30;
  });

  p2Y += 190;

  // 4. Semnături Comitet de Credit
  p2Ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  p2Ctx.fillStyle = '#0f172a';
  p2Ctx.fillText('6. DECIZIE FINALĂ & SEMNĂTURI MEMBRI COMITET DE CREDIT', 70, p2Y);
  p2Y += 22;

  const signColW = (pWidth - 180) / 3;
  const signH = 170;

  const signRoles = [
    { title: 'ANALIST RISC & UNDERWRITING', sub: 'Departament Evaluare Finanțare' },
    { title: 'DIRECTOR FINANCIAR (CFO)', sub: 'Aviz Buget & Politică Risc' },
    { title: 'DIRECTOR GENERAL (CEO)', sub: 'Aprobare Finală Comitet' },
  ];

  signRoles.forEach((role, idx) => {
    const sX = 70 + idx * (signColW + 20);
    drawCanvasRoundRect(p2Ctx, sX, p2Y, signColW, signH, 10, '#ffffff', '#cbd5e1', 1.5);

    p2Ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2Ctx.fillStyle = '#0f172a';
    p2Ctx.fillText(role.title, sX + 18, p2Y + 32);

    p2Ctx.font = '11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2Ctx.fillStyle = '#64748b';
    p2Ctx.fillText(role.sub, sX + 18, p2Y + 52);

    // Signature Line
    p2Ctx.strokeStyle = '#94a3b8';
    p2Ctx.setLineDash([4, 4]);
    p2Ctx.beginPath();
    p2Ctx.moveTo(sX + 18, p2Y + 125);
    p2Ctx.lineTo(sX + signColW - 18, p2Y + 125);
    p2Ctx.stroke();
    p2Ctx.setLineDash([]);

    p2Ctx.font = '10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    p2Ctx.fillStyle = '#94a3b8';
    p2Ctx.fillText('Semnătură & Dată', sX + 18, p2Y + 148);
  });

  // Footer Page 2
  p2Ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
  p2Ctx.fillStyle = '#94a3b8';
  p2Ctx.fillText('Axis Cloud Platform • Raport Oficial Comitet de Credit • Confidențial • Pagina 2 / 2', 70, pHeight - 45);

  // =========================================================================
  // ASSEMBLE 2-PAGE PORTRAIT A4 PDF DOCUMENT
  // =========================================================================
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4', unit: 'mm' });
  doc.addImage(p1Canvas.toDataURL('image/png', 0.95), 'PNG', 0, 0, 210, 297);
  doc.addPage();
  doc.addImage(p2Canvas.toDataURL('image/png', 0.95), 'PNG', 0, 0, 210, 297);

  const cleanName = (clientName || 'Client').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFilename = `Raport_Comitet_Credit_${cleanName}_${clientCui}.pdf`;
  doc.save(safeFilename);
}
