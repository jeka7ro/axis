import { useState, useEffect } from 'react';
import { 
  X, User, Building2, Scale, ExternalLink, ShieldAlert, 
  CheckCircle2, Loader2, Eye, UserCheck, AlertTriangle
} from 'lucide-react';
import { fetchPersonFullIntel } from '../services/api';

const PersonIntelModal = ({ isOpen, onClose, name, contextCui, onSelectCompany }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('network');
  const [expandedCase, setExpandedCase] = useState(null);
  const [selectedPersonIndex, setSelectedPersonIndex] = useState(0);

  useEffect(() => {
    if (!isOpen || !name) return;

    let isMounted = true;
    setLoading(true);
    setData(null);
    setActiveTab('network');
    setExpandedCase(null);
    setSelectedPersonIndex(0);

    fetchPersonFullIntel(name, contextCui || '')
      .then(res => {
        if (isMounted) setData(res);
      })
      .catch(err => {
        console.error('Eroare fetchPersonFullIntel:', err);
        if (isMounted) setData({ error: 'Nu s-au putut prelua datele pentru această persoană.' });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [isOpen, name, contextCui]);

  if (!isOpen) return null;

  const courtCases = data?.court_cases || [];
  const network = data?.network || [];
  
  // Persoana curent selectată (fără amestecare de vârste sau date de buletin diferite)
  const currentPerson = network[selectedPersonIndex] || network[0] || {};
  const currentFirme = currentPerson.firme || [];

  const totalFirme = currentFirme.length;
  const activeFirme = currentFirme.filter(f => f.curent).length;
  const ceasedFirme = totalFirme - activeFirme;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <User size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                  {currentPerson.nume || name}
                </h3>
                {currentPerson.varsta && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                    {currentPerson.varsta} ani
                  </span>
                )}
                {currentPerson.loc_nastere && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Origine: {currentPerson.loc_nastere}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-xs font-semibold">
                  Total: {totalFirme} Firme
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-md text-xs font-semibold">
                  {activeFirme} Active
                </span>
                {ceasedFirme > 0 && (
                  <span className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-md text-xs font-semibold">
                    {ceasedFirme} Radiate/Încetate
                  </span>
                )}
                <span className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                  courtCases.length > 0 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                }`}>
                  {courtCases.length} Dosare Just.ro
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Banner Credite API epuizate */}
        {data?.api_credits_exhausted && (
          <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 shrink-0">
            <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Căutarea extinsă națională în Registrul Comerțului prin FirmeAPI este limitată (credite Premium epuizate pe cont). Sunt afișate companiile confirmate din dosar și evidența internă.
            </span>
          </div>
        )}

        {/* Homonym Disambiguation Bar (Dacă s-au găsit mai multe persoane cu același nume dar vârstă/buletin diferit) */}
        {network.length > 1 && (
          <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400" />
                S-au identificat {network.length} persoane distincte cu acest nume (vârste/buletine diferite). Selectează persoana:
              </span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {network.map((p, idx) => {
                const isSelected = idx === selectedPersonIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedPersonIndex(idx)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all text-xs shrink-0 cursor-pointer border flex items-center gap-2 ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-sm font-bold'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span>{p.nume}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                      {p.varsta ? `${p.varsta} ani` : 'N/A'} • {p.loc_nastere || 'Origine N/A'}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      ({p.firme?.length || 0} firme)
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="px-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('network')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'network'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Building2 size={14} />
            <span>Firme &amp; Participații</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500">
              {currentFirme.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('just')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'just'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Scale size={14} />
            <span>Dosare Personale (Portal Just.ro)</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
              courtCases.length > 0 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
            }`}>
              {courtCases.length}
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[350px]">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Preluare date administrator din FirmeAPI &amp; Portal Just.ro...
              </p>
            </div>
          ) : data?.error ? (
            <div className="p-6 text-center text-sm text-red-500">
              {data.error}
            </div>
          ) : (
            <>
              {/* TAB 1: FIRME & PARTICIPAȚII */}
              {activeTab === 'network' && (
                <div className="space-y-4">
                  {currentFirme.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-500 space-y-2">
                      <p className="font-medium text-gray-700 dark:text-gray-300">
                        Nu au fost identificate companii asociate acestei persoane în registrul curent.
                      </p>
                      {data?.api_credits_exhausted && (
                        <p className="text-amber-600 dark:text-amber-400">
                          Notă: Căutarea națională extinsă ReCom prin FirmeAPI necesită reîncărcarea creditelor Premium.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50/70 dark:bg-gray-900/40 text-gray-500 uppercase font-medium border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="px-4 py-2.5 whitespace-nowrap">Nr. Crt.</th>
                            <th className="px-4 py-2.5 whitespace-nowrap">Denumire Companie</th>
                            <th className="px-4 py-2.5 whitespace-nowrap">CUI</th>
                            <th className="px-4 py-2.5 whitespace-nowrap">Rol</th>
                            <th className="px-4 py-2.5 whitespace-nowrap text-center">Cota %</th>
                            <th className="px-4 py-2.5 whitespace-nowrap text-center">Statut Mandat</th>
                            <th className="px-4 py-2.5 whitespace-nowrap text-right">Dosar Firmă</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {currentFirme.map((f, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40 transition-colors">
                              <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{idx + 1}</td>
                              <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => onSelectCompany && onSelectCompany(f.cui, f.denumire)}
                                  className="hover:text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer text-left group"
                                  title="Deschide dosar complet companie"
                                >
                                  <Building2 size={13} className="text-gray-400 group-hover:text-primary" />
                                  <span>{f.denumire}</span>
                                  <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 text-primary" />
                                </button>
                              </td>
                              <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">{f.cui}</td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[11px] font-semibold whitespace-nowrap">
                                  {f.rol || (f.este_administrator ? 'ADMINISTRATOR' : 'ASOCIAT')}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center font-bold whitespace-nowrap">
                                {f.procent !== null && f.procent !== undefined ? `${f.procent}%` : '-'}
                              </td>
                              <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                    f.curent 
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {f.curent ? 'Activ' : 'Încetat'}
                                  </span>
                                  {f.de_la && (
                                    <span className="text-[10px] text-gray-400">
                                      ({f.de_la}{f.pana_la ? ` – ${f.pana_la}` : ''})
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => onSelectCompany && onSelectCompany(f.cui, f.denumire)}
                                  className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                                  title="Dosar &amp; Litigii Portal Just.ro"
                                >
                                  <Eye size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: LITIGII JUST.RO */}
              {activeTab === 'just' && (
                <div className="space-y-4">
                  {courtCases.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 dark:bg-gray-900/40 rounded-lg border border-gray-200 dark:border-gray-700">
                      <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-2" />
                      <h5 className="font-bold text-gray-900 dark:text-white text-sm">Fără Dosare sau Litigii Înregistrate</h5>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        Nu au fost identificate dosare civile, comerciale sau penale pe numele acestei persoane pe portalquery.just.ro.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50/70 dark:bg-gray-900/40 text-gray-500 uppercase font-medium border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="px-3.5 py-2.5 whitespace-nowrap">Număr Dosar</th>
                              <th className="px-3.5 py-2.5 whitespace-nowrap">Data</th>
                              <th className="px-3.5 py-2.5 whitespace-nowrap">Instanță</th>
                              <th className="px-3.5 py-2.5 whitespace-nowrap">Obiect / Categorie</th>
                              <th className="px-3.5 py-2.5 whitespace-nowrap">Stadiu</th>
                              <th className="px-3.5 py-2.5 whitespace-nowrap text-right">Detalii</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {courtCases.map((c, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40 transition-colors">
                                <td className="px-3.5 py-2.5 font-bold text-primary whitespace-nowrap">
                                  <a 
                                    href={`https://portal.just.ro/SitePages/cautare.aspx?k=${encodeURIComponent(c.numar)}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="hover:underline inline-flex items-center gap-1 text-xs"
                                  >
                                    <span>{c.numar}</span>
                                    <ExternalLink size={10} />
                                  </a>
                                </td>
                                <td className="px-3.5 py-2.5 text-gray-500 whitespace-nowrap">{c.data || '-'}</td>
                                <td className="px-3.5 py-2.5 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{c.institutie}</td>
                                <td className="px-3.5 py-2.5 whitespace-nowrap">
                                  <span className="text-gray-900 dark:text-white font-medium">{c.obiect}</span>
                                  {c.categorie && (
                                    <span className="text-[10px] text-gray-400 ml-1">({c.categorie})</span>
                                  )}
                                </td>
                                <td className="px-3.5 py-2.5 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                    {c.stadiu || 'Fond'}
                                  </span>
                                </td>
                                <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedCase(expandedCase === idx ? null : idx)}
                                    className="px-2.5 py-1 text-[11px] rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
                                  >
                                    {expandedCase === idx ? 'Ascunde' : 'Vezi Părți & Soluție'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Expandable Case Drawer/Details */}
                      {expandedCase !== null && courtCases[expandedCase] && (
                        <div className="p-4 bg-gray-50 dark:bg-gray-900/70 border-t border-gray-200 dark:border-gray-700 text-xs space-y-3 animate-in fade-in rounded-lg">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                              <span>Părți în dosarul {courtCases[expandedCase].numar}</span>
                            </h5>
                            <button onClick={() => setExpandedCase(null)} className="text-gray-400 hover:text-gray-600 text-xs cursor-pointer flex items-center gap-1">
                              <X size={14} /> Închide
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {courtCases[expandedCase].parti?.map((p, pIdx) => (
                              <div key={pIdx} className="px-2.5 py-1 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center gap-1.5 text-[11px]">
                                <span className="font-medium text-gray-800 dark:text-gray-200">{p.nume}</span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold">
                                  {p.calitate}
                                </span>
                              </div>
                            ))}
                          </div>

                          {courtCases[expandedCase].sedinte?.length > 0 && (
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Soluție Ședință ({courtCases[expandedCase].sedinte[0].data}):</span>
                              <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                                {courtCases[expandedCase].sedinte[0].sumar || courtCases[expandedCase].sedinte[0].solutie || 'Fără sumar publicat.'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-gray-400">
            Sursă: FirmeAPI.ro • ONRC • Ministerul Justiției (Portal Just)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
          >
            Închide
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonIntelModal;
