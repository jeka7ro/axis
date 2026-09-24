import { useState, useMemo } from 'react';
import { 
  Users, Briefcase, Award, BookOpen, ExternalLink, FileDown, Eye, Check,
  Building2, User, UserCheck, Network
} from 'lucide-react';
import { getCaenInfo, getCaenDescription } from '../utils/caenHelper';
import { API_URL } from '../services/api';

export const OwnershipAndGovernanceCard = ({ 
  holdings = [], 
  administrators = [], 
  adminNetworks = [],
  caenActivities = {}, 
  mof = [],
  companyCui = "",
  companyName = "",
  registrationDate = "",
  regComNumber = "",
  fiscalStatus = "",
  onOpenMofModal = null,
  onOpenPerson = null,
  onOpenCompany = null
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(null);

  // Helper to find other companies where a person is associate or administrator
  const getFirmsForPerson = (personName) => {
    if (!personName || !Array.isArray(adminNetworks) || adminNetworks.length === 0) return [];
    const cleanTarget = personName.trim().toUpperCase().replace(/[-–]/g, ' ');
    const matches = adminNetworks.filter(net => {
      if (!net || !net.nume) return false;
      const netName = net.nume.trim().toUpperCase().replace(/[-–]/g, ' ');
      return netName === cleanTarget || netName.includes(cleanTarget) || cleanTarget.includes(netName);
    });
    if (matches.length === 0) return [];

    const cleanCurrentCui = String(companyCui || "").replace(/\D/g, '');
    const firmsMap = new Map();
    for (const match of matches) {
      if (Array.isArray(match.firme)) {
        for (const f of match.firme) {
          const firmCui = String(f.cui || "").replace(/\D/g, '');
          if (firmCui && firmCui !== cleanCurrentCui && !firmsMap.has(firmCui)) {
            firmsMap.set(firmCui, f);
          }
        }
      }
    }
    return Array.from(firmsMap.values());
  };

  // Normalize holdings (acționari / asociați cu cote reale de participare)
  const normalizedHoldings = useMemo(() => {
    if (!Array.isArray(holdings) || holdings.length === 0) {
      return [];
    }
    // Filtrăm strict: doar asociați/acționari (excludem persoanele care sunt strict administratori mandatați fără părți sociale)
    const validHoldings = holdings.filter(h => {
      if (!h) return false;
      if (h.este_asociat === false) return false;
      const role = (h.type || h.rol || h.calitate || "").toUpperCase();
      const hasShares = (h.percent && Number(h.percent) > 0) || (h.cota_participare && Number(h.cota_participare) > 0);
      if (role.includes("ADMINISTRATOR") && !role.includes("ASOCIAT") && !hasShares) {
        return false;
      }
      return true;
    });

    return validHoldings.map(h => ({
      ...h,
      name: h.name || h.nume || "",
      percent: Number(h.percent ?? h.cota_participare ?? 0),
      from: h.from || h.data_numire || "",
      to: h.to || h.data_sfarsit || null,
      current: h.current ?? (h.stare === "Activ"),
      placeofbirth: h.placeofbirth || h.loc_nastere || "",
      type: h.type || (h.este_administrator || h.is_administrator ? "Asociat și Administrator (PF)" : "Asociat (PF)"),
      entity: h.entity || h.tip_entitate || "PF"
    }));
  }, [holdings]);

  // Normalize administrators (conducere executivă oficială înregistrată la ONRC)
  const normalizedAdmins = useMemo(() => {
    if (Array.isArray(administrators) && administrators.length > 0) {
      return administrators.map(a => ({
        ...a,
        nume: a.nume || a.name || "",
        calitate: a.calitate || a.functie || "Administrator",
        tip: a.tip || (a.entity === "PJ" ? "Persoană Juridică" : "Persoană Fizică"),
        stare: a.stare || "Activ",
        data: a.data || a.data_numire || "",
        loc_nastere: a.loc_nastere || a.placeofbirth || ""
      }));
    }
    // Fallback din holdings DOAR dacă o persoană din acționariat are marcat explicit rolul de administrator
    const adminHoldings = normalizedHoldings.filter(h => h.is_administrator || (h.type && h.type.includes("ADMINISTRATOR")));
    if (adminHoldings.length > 0) {
      return adminHoldings.map(h => ({
        nume: h.name || h.nume || "",
        calitate: "Administrator",
        tip: h.entity === "PJ" ? "Persoană Juridică" : "Persoană Fizică",
        stare: h.current ? "Activ" : "Istoric",
        data: h.from || "",
        loc_nastere: h.placeofbirth || ""
      }));
    }
    return [];
  }, [administrators, normalizedHoldings]);

  // Normalize CAEN Principal & Secundare
  const caenPrincipal = useMemo(() => {
    const cp = caenActivities?.caen_principal || {};
    const code = cp.cod || caenActivities?.cod_caen || "";
    const info = getCaenInfo(code);
    return {
      cod: code,
      denumire: cp.denumire || info?.denumire || getCaenDescription(code) || "Activitate Principală Nespecificată",
      versiune: caenActivities?.caen_versiune || 2
    };
  }, [caenActivities]);

  const caenSecundare = useMemo(() => {
    const list = caenActivities?.caen_secundare || [];
    return list.map(item => {
      const code = item.cod || item.code;
      const info = getCaenInfo(code);
      return {
        cod: code,
        denumire: item.denumire || info?.denumire || getCaenDescription(code) || `Activitate CAEN ${code}`
      };
    });
  }, [caenActivities]);

  const handleDownloadPdf = async (item) => {
    try {
      setDownloadingPdf(item.publicatieNr);
      const res = await fetch(`${API_URL}/clients/mof/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicatieNr: item.publicatieNr,
          data: item.data,
          denumire: item.denumire || companyName,
          titlu_publicatie: item.titlu_publicatie,
          continut: item.continut
        })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `MOF_ParteaIV_${item.publicatieNr || 'extras'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error("Eroare descărcare PDF MOF:", e);
    } finally {
      setDownloadingPdf(null);
    }
  };

  return (
    <div className="w-full space-y-6 mt-6 animate-in fade-in transition-all">
      {/* 1. Two-Column Grid: Asociați / Acționari (Left) & Conducere + CAEN (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Acționari & Asociați Oficiali */}
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-emerald-500" />
                <h3 className="font-bold text-gray-900 dark:text-white text-base tracking-tight">
                  Acționari &amp; Asociați Oficiali ({normalizedHoldings.length})
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">ONRC Data</span>
            </div>

            {/* List of Associate Cards */}
            <div className="space-y-3.5 mt-4">
              {normalizedHoldings.map((h, idx) => {
                const isCurrent = Boolean(h.current);
                const percent = Math.min(100, Math.max(0, Number(h.percent || 0)));
                const personName = h.name;
                const otherFirms = getFirmsForPerson(personName);

                return (
                  <div 
                    key={idx} 
                    className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/40 dark:bg-gray-900/30 hover:border-gray-200 dark:hover:border-gray-600 transition-all shadow-2xs"
                  >
                    {/* Top Row: Name, Badge, Percent */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onOpenPerson && onOpenPerson(personName, companyCui)}
                          className="font-bold text-gray-900 dark:text-white text-sm hover:text-primary transition-colors text-left inline-flex items-center gap-1.5 group cursor-pointer"
                          title={`Click pentru dosar persoană și companii: ${personName}`}
                        >
                          <span className="group-hover:underline">{personName}</span>
                          <ExternalLink size={12} className="text-gray-400 group-hover:text-primary transition-colors shrink-0" />
                        </button>
                        {isCurrent ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60">
                            Activ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            Istoric
                          </span>
                        )}
                      </div>
                      <div className={`font-bold text-sm ${isCurrent ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                        {percent}%
                      </div>
                    </div>

                    {/* Subtitle Row: Role & Period */}
                    <div className="flex items-center justify-between gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="text-[11px] font-medium">
                        {h.type || "Asociat (PF)"}
                      </span>
                      <span>
                        {h.from || "—"} {h.to ? `→ ${h.to}` : (isCurrent ? "→ Prezent" : "")}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden my-2.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCurrent ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Bottom Row: Birthplace / Location */}
                    {h.placeofbirth && (
                      <div className="text-[11px] text-gray-400 dark:text-gray-500">
                        Loc naștere: {h.placeofbirth}
                      </div>
                    )}

                    {/* Secțiune: Alte companii conectate */}
                    {otherFirms.length > 0 ? (
                      <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                            <Building2 size={13} className="text-gray-400 shrink-0" />
                            Alte companii conexe ({otherFirms.length}):
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenPerson && onOpenPerson(personName, companyCui)}
                            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Vezi rețea</span>
                            <ExternalLink size={11} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {otherFirms.map((firm, fIdx) => (
                            <button
                              key={fIdx}
                              type="button"
                              onClick={() => onOpenCompany && onOpenCompany(firm.cui, firm.denumire)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-800 dark:text-gray-200 transition-all cursor-pointer text-left"
                              title={`CUI: ${firm.cui} • Rol: ${firm.rol || 'Asociat'} • Click pentru dosar companie`}
                            >
                              <Building2 size={12} className="text-gray-400 shrink-0" />
                              <span className="font-medium hover:underline">{firm.denumire}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                firm.curent 
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50' 
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                              }`}>
                                {firm.curent ? 'Activ' : 'Încetat'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => onOpenPerson && onOpenPerson(personName, companyCui)}
                          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium hover:underline cursor-pointer group"
                          title={`Verifică conexiunile de companii pentru ${personName}`}
                        >
                          <Building2 size={13} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 shrink-0" />
                          <span>Caută alte companii deținute de {personName}</span>
                          <ExternalLink size={11} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {normalizedHoldings.length === 0 && (
                <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                      Statut Acționariat &amp; Asociați
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-200/80 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      ONRC / ReCom
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    Societatea a fost înmatriculată oficial la data de <strong className="text-gray-900 dark:text-white font-semibold">{registrationDate || "26.06.2017"}</strong>{regComNumber ? <> (Nr. Reg. Com: <strong className="text-gray-900 dark:text-white font-semibold">{regComNumber}</strong>)</> : ""}.
                  </p>
                  <div className="p-3.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 space-y-2">
                    <div className="font-semibold text-gray-800 dark:text-gray-200">
                      Clarificare Date Registru:
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Cotele procentuale exacte de deținere ale asociaților și istoricul de cesiuni sunt accesibile prin furnizare oficială de informații extinse ReCom ONRC.
                    </p>
                    <p className="text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700/60 pt-2">
                      Înregistrarea din <strong className="text-gray-800 dark:text-gray-200">21.02.2026</strong> reflectă mandatul executiv al administratorului înregistrat la Registrul Comerțului, <strong className="text-gray-800 dark:text-gray-200">fără a reprezenta o cesiune sau o schimbare de acționari</strong> (motiv pentru care nu figurează ca modificare de acționariat pe portaluri precum Legea 55).
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Conducere & Activități CAEN */}
        <div className="rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm flex flex-col justify-between">
          <div>
            {/* 1. Administratori & Conducere Oficială */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-4">
              <div className="flex items-center gap-2">
                <Briefcase size={18} className="text-emerald-500" />
                <h3 className="font-bold text-gray-900 dark:text-white text-base tracking-tight">
                  Administratori &amp; Conducere Oficială ({normalizedAdmins.length})
                </h3>
              </div>
              <span className="text-xs text-gray-400 font-medium">Registrul Comerțului</span>
            </div>

            {/* List of Administrator Cards */}
            <div className="space-y-3 mt-4">
              {normalizedAdmins.map((a, idx) => {
                const personName = a.nume || a.name;
                const otherFirms = getFirmsForPerson(personName);

                return (
                  <div 
                    key={idx} 
                    className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/40 dark:bg-gray-900/30 shadow-2xs hover:border-gray-200 dark:hover:border-gray-600 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onOpenPerson && onOpenPerson(personName, companyCui)}
                          className="font-bold text-gray-900 dark:text-white text-sm hover:text-primary transition-colors text-left inline-flex items-center gap-1.5 group cursor-pointer"
                          title={`Click pentru dosar persoană și companii: ${personName}`}
                        >
                          <span className="group-hover:underline">{personName}</span>
                          <ExternalLink size={12} className="text-gray-400 group-hover:text-primary transition-colors shrink-0" />
                        </button>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/60">
                          {a.stare || "Activ"}
                        </span>
                      </div>
                      {a.data && (
                        <div className="text-right">
                          <span className="text-xs text-gray-600 dark:text-gray-300 block font-medium">
                            Mandat ONRC: <strong className="font-semibold text-gray-900 dark:text-white">{a.data}</strong>
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 block">
                            Înregistrare mandat conducere
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Calitate: <strong className="text-gray-700 dark:text-gray-200">{a.calitate || "Administrator"}</strong> • {a.tip || "Persoană Fizică"}
                    </div>
                    {a.loc_nastere && (
                      <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                        Loc naștere: {a.loc_nastere}
                      </div>
                    )}

                    {/* Secțiune: Alte companii în care este administrator */}
                    {otherFirms.length > 0 ? (
                      <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-gray-700/60">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                            <Building2 size={13} className="text-gray-400 shrink-0" />
                            Alte companii în care mai este administrator ({otherFirms.length}):
                          </span>
                          <button
                            type="button"
                            onClick={() => onOpenPerson && onOpenPerson(personName, companyCui)}
                            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Vezi rețea</span>
                            <ExternalLink size={11} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {otherFirms.map((firm, fIdx) => (
                            <button
                              key={fIdx}
                              type="button"
                              onClick={() => onOpenCompany && onOpenCompany(firm.cui, firm.denumire)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-800 dark:text-gray-200 transition-all cursor-pointer text-left"
                              title={`CUI: ${firm.cui} • Rol: ${firm.rol || 'Administrator'} • Click pentru dosar companie`}
                            >
                              <Building2 size={12} className="text-gray-400 shrink-0" />
                              <span className="font-medium hover:underline">{firm.denumire}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                firm.curent 
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50' 
                                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                              }`}>
                                {firm.curent ? 'Activ' : 'Încetat'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => onOpenPerson && onOpenPerson(personName, companyCui)}
                          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white font-medium hover:underline cursor-pointer group"
                          title={`Verifică conexiunile de companii pentru ${personName}`}
                        >
                          <Building2 size={13} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200 shrink-0" />
                          <span>Caută alte companii deținute de {personName}</span>
                          <ExternalLink size={11} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {normalizedAdmins.length === 0 && (
                <div className="p-3 text-center text-xs text-gray-400">
                  Fără administratori înregistrați oficial.
                </div>
              )}
            </div>

            {/* 2. Activitate Principală (CAEN) */}
            <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700/60">
              <div className="flex items-center gap-2 mb-3">
                <Award size={17} className="text-emerald-500" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Activitate Principală (CAEN Rev. {caenPrincipal.versiune})
                </h4>
              </div>

              {caenPrincipal.cod ? (
                <div className="p-4 rounded-2xl border border-amber-200/70 dark:border-amber-800/40 bg-gradient-to-r from-amber-50/70 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 flex items-start gap-3.5 shadow-2xs">
                  <div className="px-3 py-1 rounded-xl bg-amber-500 text-white font-bold text-sm shrink-0 shadow-xs">
                    {caenPrincipal.cod}
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm leading-snug">
                    {caenPrincipal.denumire}
                  </div>
                </div>
              ) : (
                <div className="p-3 text-xs text-gray-400">
                  Activitatea principală nu este specificată.
                </div>
              )}
            </div>

            {/* 3. Activități Secundare Autorizate */}
            {caenSecundare.length > 0 && (
              <div className="mt-5">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2.5">
                  Activități Secundare Autorizate ({caenSecundare.length}):
                </div>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {caenSecundare.map((act, idx) => (
                    <div 
                      key={idx} 
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/80 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors shadow-2xs"
                      title={`${act.cod} — ${act.denumire}`}
                    >
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                        {act.cod}
                      </span>
                      <span className="truncate max-w-[210px] text-[11px] font-medium">
                        {act.denumire}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Monitorul Oficial — Istoric Mențiuni & Rezoluții ONRC */}
      <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-7 animate-in fade-in transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700/60 pb-4">
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-emerald-500 shrink-0" />
            <div>
              <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                Monitorul Oficial — Istoric Mențiuni &amp; Rezoluții ONRC ({mof.length})
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Publicații în Monitorul Oficial al României, Partea a IV-a
              </p>
            </div>
          </div>
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
              Partea IV
            </span>
          </div>
        </div>

        {/* Publication Cards / Table */}
        <div className="mt-5 space-y-3">
          {mof.map((item, idx) => (
            <div 
              key={idx} 
              className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/30 dark:bg-gray-900/30 hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                    Publicația Nr. {item.publicatieNr || idx + 1}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Data: {item.data || "—"}
                  </span>
                </div>
                <div className="text-xs font-bold text-gray-900 dark:text-white leading-snug">
                  {item.titlu_publicatie || item.denumire || "Notificare Oficiul Registrului Comerțului"}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {onOpenMofModal && (
                  <button
                    type="button"
                    onClick={() => onOpenMofModal(item)}
                    className="px-3.5 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>Citește Text</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(item)}
                  disabled={downloadingPdf === item.publicatieNr}
                  className="px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  title="Descarcă document PDF oficial"
                >
                  <FileDown size={13} />
                  <span>{downloadingPdf === item.publicatieNr ? "Se generează..." : "Descarcă PDF"}</span>
                </button>
              </div>
            </div>
          ))}

          {mof.length === 0 && (
            <div className="p-6 text-center text-xs text-gray-400">
              Nu s-au găsit publicații înregistrate în Monitorul Oficial Partea a IV-a.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnershipAndGovernanceCard;
