import { useState, useMemo } from 'react';
import { Users, Briefcase, Award, BookOpen, ExternalLink, FileDown, Eye, Check } from 'lucide-react';
import { getCaenInfo, getCaenDescription } from '../utils/caenHelper';
import { API_URL } from '../services/api';

export const OwnershipAndGovernanceCard = ({ 
  holdings = [], 
  administrators = [], 
  caenActivities = {}, 
  mof = [],
  companyCui = "",
  companyName = "",
  onOpenMofModal = null 
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(null);

  // Normalize holdings (acționari / asociați cu istoric)
  const normalizedHoldings = useMemo(() => {
    if (Array.isArray(holdings) && holdings.length > 0) {
      return holdings;
    }
    // Fallback from administrators if holdings is empty
    if (Array.isArray(administrators) && administrators.length > 0) {
      return administrators.map((a, idx) => ({
        name: a.nume || a.name,
        type: a.calitate ? `${a.calitate.toUpperCase()} (PF)` : "ASOCIAT SI ADMINISTRATOR (PF)",
        percent: administrators.length === 1 ? 100 : Math.round(100 / administrators.length),
        from: a.data || "2020-01-01",
        to: null,
        current: a.stare === "Activ" || true,
        placeofbirth: a.loc_nastere || "",
        entity: "PF"
      }));
    }
    return [];
  }, [holdings, administrators]);

  // Normalize administrators
  const normalizedAdmins = useMemo(() => {
    if (Array.isArray(administrators) && administrators.length > 0) {
      return administrators;
    }
    // Fallback from holdings if is_administrator is true
    const adminHoldings = normalizedHoldings.filter(h => h.is_administrator || (h.type && h.type.includes("ADMINISTRATOR")));
    if (adminHoldings.length > 0) {
      return adminHoldings.map(h => ({
        nume: h.name,
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

                return (
                  <div 
                    key={idx} 
                    className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/40 dark:bg-gray-900/30 hover:border-gray-200 dark:hover:border-gray-600 transition-all shadow-2xs"
                  >
                    {/* Top Row: Name, Badge, Percent */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 dark:text-white text-sm">
                          {h.name}
                        </span>
                        {isCurrent ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60">
                            Activ
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            Istoric
                          </span>
                        )}
                      </div>
                      <div className={`font-black font-mono text-sm ${isCurrent ? 'text-emerald-500' : 'text-gray-400'}`}>
                        {percent}%
                      </div>
                    </div>

                    {/* Subtitle Row: Role & Period */}
                    <div className="flex items-center justify-between gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500 font-mono">
                      <span className="uppercase text-[11px] font-medium tracking-wider">
                        {h.type || "ASOCIAT (PF)"}
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
                  </div>
                );
              })}

              {normalizedHoldings.length === 0 && (
                <div className="p-4 text-center text-xs text-gray-400">
                  Nu există date înregistrate despre asociați.
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
              {normalizedAdmins.map((a, idx) => (
                <div 
                  key={idx} 
                  className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/40 dark:bg-gray-900/30 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 dark:text-white text-sm">
                        {a.nume}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200/60">
                        {a.stare || "Activ"}
                      </span>
                    </div>
                    {a.data && (
                      <span className="text-xs font-bold font-mono text-gray-900 dark:text-white">
                        Data numirii <span className="text-gray-600 dark:text-gray-300 font-semibold">{a.data}</span>
                      </span>
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
                </div>
              ))}

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
                  <div className="px-3 py-1 rounded-xl bg-amber-500 text-white font-bold font-mono text-sm shrink-0 shadow-xs">
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
                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold font-mono text-[10px]">
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
                  <span className="font-bold text-xs font-mono text-emerald-600 dark:text-emerald-400">
                    Publicația Nr. {item.publicatieNr || idx + 1}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
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
