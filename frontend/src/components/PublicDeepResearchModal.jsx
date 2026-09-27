import React, { useState, useEffect } from 'react';
import { 
  X, RefreshCw, ShieldCheck, AlertTriangle,
  FileText, CheckCircle2, Copy, Check, ExternalLink,
  ChevronLeft, ChevronRight, Activity, Calendar, Users, TrendingUp, Building2
} from 'lucide-react';
import { fetchClientPublicDeepResearch } from '../services/api';

const PublicDeepResearchModal = ({ 
  isOpen, 
  onClose, 
  clientId, 
  clientName, 
  clientCui,
  onOpenCompany 
}) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('insolvency'); // 'financials' | 'insolvency' | 'payments' | 'admin' | 'fiscal'

  // Table state for Financials table
  const [selectedFinRows, setSelectedFinRows] = useState([]);
  const [finPage, setFinPage] = useState(1);
  const [finPerPage, setFinPerPage] = useState(5);

  // Table state for Admin Network table
  const [selectedAdminRows, setSelectedAdminRows] = useState([]);
  const [adminPage, setAdminPage] = useState(1);
  const [adminPerPage, setAdminPerPage] = useState(5);

  // Table state for TVA Periods table
  const [selectedTvaRows, setSelectedTvaRows] = useState([]);
  const [tvaPage, setTvaPage] = useState(1);
  const [tvaPerPage, setTvaPerPage] = useState(5);

  const [copiedSummary, setCopiedSummary] = useState(false);

  const loadData = async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchClientPublicDeepResearch(clientId);
      setData(res);
    } catch (err) {
      console.error('Audit BPI & Plati load error:', err);
      setError(err.message || 'Nu s-au putut încărca datele din sursele deschise.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && clientId) {
      loadData();
    } else {
      setData(null);
      setSelectedFinRows([]);
      setSelectedAdminRows([]);
      setSelectedTvaRows([]);
    }
  }, [isOpen, clientId]);

  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const insolvency = data?.insolvency || {};
  const payments = data?.payment_discipline || {};
  const companyInfo = data?.company_info || {};
  const financials = data?.financials || [];
  const adminNetwork = data?.admin_network || [];
  const tvaPeriods = companyInfo?.perioadeTVA || [];
  const representativeName = data?.representative || '';

  const formatCurrency = (val) => {
    if (val === undefined || val === null || val === '') return '—';
    const num = Number(val);
    if (isNaN(num)) return val;
    return new Intl.NumberFormat('ro-RO').format(num) + ' RON';
  };

  const handleCopySummary = () => {
    if (!data) return;
    const summaryText = `[AUDIT SOLVABILITATE & BPI AXIS]
Companie: ${data.company_name} (CUI ${data.cui})
Data interogare: ${new Date(data.fetched_at).toLocaleDateString('ro-RO')}
Insolvență / Faliment (BPI): ${insolvency?.inInsolventa ? 'ALERTA: IN INSOLVENTA' : 'NEGATIV (Fara dosare BPI)'}
Buletine BPI publicate: ${insolvency?.nrBuletineBPI ?? 0}
Disciplină Plăți: ${payments?.scor_plati ?? 100}/100 (Incidente active: ${payments?.are_incidente ? 'DA' : '0'})
Sold depășit raportat: ${formatCurrency(payments?.sold_depasit || 0)}
Firme afiliate administrator (${representativeName}): ${adminNetwork.length} companii
RO e-Factura: ${companyInfo?.statusEFactura || 'INROLAT'}`;
    navigator.clipboard.writeText(summaryText);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  const handleOpenCompanyFromNetwork = (comp) => {
    if (!comp) return;
    const targetCui = comp.cui || comp.cui_cnp;
    const targetName = comp.name || comp.denumire;
    if (onOpenCompany && targetCui) {
      onOpenCompany(targetCui, targetName);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-gray-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-5xl 2xl:max-w-6xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex items-start justify-between gap-4 bg-gray-50/50 dark:bg-gray-900/40">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-full border border-blue-200 dark:border-blue-800">
                OSINT Open Data • Gratuit
              </span>
              <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                0 Credite Consumate
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>Deep Research Public:</span>
              <span className="text-primary truncate">{clientName || data?.company_name || 'Companie'}</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              CUI: <strong className="text-gray-700 dark:text-gray-300">{clientCui || data?.cui}</strong> • Date agregate din ANAF, ONRC, BPI și PulsPlăți
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer text-gray-600 dark:text-gray-300 disabled:opacity-50"
              title="Reîmprospătează datele"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer text-gray-500 hover:text-gray-900 dark:hover:text-white"
              title="Închide fereastra (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-x-auto">
          {financials.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('financials')}
              className={`px-3 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'financials'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <TrendingUp size={14} />
              <span>Bilanțuri Anuale Istorice ({financials.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('insolvency')}
            className={`px-3 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'insolvency'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Insolvență &amp; BPI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'payments'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Activity size={14} />
            <span>Disciplină Plăți &amp; Incidente</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`px-3 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'admin'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Users size={14} />
            <span>Rețea Firme Administrator ({adminNetwork.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fiscal')}
            className={`px-3 py-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'fiscal'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Calendar size={14} />
            <span>Regim Fiscal &amp; Istoric TVA ({tvaPeriods.length})</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/30 dark:bg-gray-900/20">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw size={28} className="animate-spin mx-auto text-primary opacity-80" />
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Se agregă datele din BPI, ONRC, PulsPlăți și ANAF...
              </p>
              <p className="text-xs text-gray-400">
                Interogare fără consum de credite
              </p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-center space-y-2">
              <AlertTriangle size={24} className="mx-auto text-red-500" />
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="mt-2 px-4 py-1.5 bg-red-600 text-white rounded-full text-xs font-semibold hover:bg-red-700 cursor-pointer"
              >
                Reîncearcă
              </button>
            </div>
          ) : (
            <>
              {/* TAB 1: Bilanțuri Anuale Istorice */}
              {activeTab === 'financials' && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          Istoric Bilanțuri Depuse la Ministerul Finanțelor
                        </h4>
                        <p className="text-xs text-gray-400">
                          Evoluția cifrei de afaceri, profitului net și numărului de salariați
                        </p>
                      </div>
                      {selectedFinRows.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{selectedFinRows.length} selectate</span>
                          <button
                            type="button"
                            onClick={() => setSelectedFinRows([])}
                            className="px-3 py-1 text-xs font-semibold rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            Deselectează
                          </button>
                        </div>
                      )}
                    </div>

                    {financials.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-500">
                        Nu sunt disponibile bilanțuri istorice pentru această companie.
                      </div>
                    ) : (
                      (() => {
                        const totalFin = financials.length;
                        const totalFinPages = Math.ceil(totalFin / finPerPage) || 1;
                        const curFinPage = Math.min(finPage, totalFinPages);
                        const startFinIdx = (curFinPage - 1) * finPerPage;
                        const paginatedFin = financials.slice(startFinIdx, startFinIdx + finPerPage);
                        const allCurFinSelected = paginatedFin.length > 0 && paginatedFin.every((_, i) => selectedFinRows.includes(startFinIdx + i));

                        return (
                          <div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 border-b border-gray-100 dark:border-gray-700 uppercase tracking-wider text-[10px]">
                                  <tr>
                                    <th className="w-10 px-3 py-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={allCurFinSelected}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            const newIds = paginatedFin.map((_, i) => startFinIdx + i);
                                            setSelectedFinRows(prev => Array.from(new Set([...prev, ...newIds])));
                                          } else {
                                            const pageIds = paginatedFin.map((_, i) => startFinIdx + i);
                                            setSelectedFinRows(prev => prev.filter(id => !pageIds.includes(id)));
                                          }
                                        }}
                                        className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary/30 cursor-pointer"
                                      />
                                    </th>
                                    <th className="px-3 py-2.5 text-center w-14">Nr. Crt.</th>
                                    <th className="px-3 py-2.5">An Fiscal</th>
                                    <th className="px-3 py-2.5 text-right">Cifră Afaceri</th>
                                    <th className="px-3 py-2.5 text-right">Profit Net</th>
                                    <th className="px-3 py-2.5 text-center">Angajați</th>
                                    <th className="px-3 py-2.5 text-right">Datorii Totale</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {paginatedFin.map((fin, relIdx) => {
                                    const absIdx = startFinIdx + relIdx;
                                    const isSelected = selectedFinRows.includes(absIdx);
                                    
                                    const caVal = fin.cifraAfaceri ?? fin.cifra_afaceri ?? fin.ca;
                                    
                                    let profitVal = null;
                                    const pNet = fin.profitNet ?? fin.profit_net ?? fin.profit;
                                    const lossNet = fin.pierdereNeta ?? fin.pierdere_neta ?? fin.pierdere;
                                    if (pNet !== undefined && pNet !== null && Number(pNet) > 0) {
                                      profitVal = Number(pNet);
                                    } else if (lossNet !== undefined && lossNet !== null && Number(lossNet) > 0) {
                                      profitVal = -Number(lossNet);
                                    } else if (pNet !== undefined && pNet !== null) {
                                      profitVal = Number(pNet);
                                    } else if (lossNet !== undefined && lossNet !== null) {
                                      profitVal = -Number(lossNet);
                                    }

                                    const angajatiVal = fin.nrAngajati ?? fin.numar_angajati ?? fin.angajati ?? '0';
                                    const datoriiVal = fin.datorii ?? fin.datorii_totale;

                                    return (
                                      <tr
                                        key={absIdx}
                                        className={`hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors ${
                                          isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                                        }`}
                                      >
                                        <td className="px-3 py-2.5 text-center">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {
                                              setSelectedFinRows(prev => 
                                                prev.includes(absIdx) ? prev.filter(x => x !== absIdx) : [...prev, absIdx]
                                              );
                                            }}
                                            className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary/30 cursor-pointer"
                                          />
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-gray-400 font-medium tabular-nums">
                                          {absIdx + 1}
                                        </td>
                                        <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white">
                                          {fin.an || fin.year || '—'}
                                        </td>
                                        <td className="px-3 py-2.5 text-right font-medium text-gray-800 dark:text-gray-200 tabular-nums">
                                          {formatCurrency(caVal)}
                                        </td>
                                        <td className={`px-3 py-2.5 text-right font-bold tabular-nums ${
                                          profitVal !== null && profitVal > 0 ? 'text-emerald-600 dark:text-emerald-400' : 
                                          profitVal !== null && profitVal < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
                                        }`}>
                                          {profitVal === null ? '—' : formatCurrency(profitVal)}
                                        </td>
                                        <td className="px-3 py-2.5 text-center font-medium text-gray-700 dark:text-gray-300 tabular-nums">
                                          {angajatiVal}
                                        </td>
                                        <td className="px-3 py-2.5 text-right text-gray-600 dark:text-gray-400 tabular-nums">
                                          {formatCurrency(datoriiVal)}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination Footer */}
                            <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 bg-gray-50/40 dark:bg-gray-900/20">
                              <div className="flex items-center gap-2">
                                <span>Afișează</span>
                                <select
                                  value={finPerPage}
                                  onChange={(e) => {
                                    setFinPerPage(Number(e.target.value));
                                    setFinPage(1);
                                  }}
                                  className="px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs focus:outline-none cursor-pointer"
                                >
                                  <option value={5}>5</option>
                                  <option value={10}>10</option>
                                </select>
                                <span>pe pagină</span>
                                <span className="mx-2">•</span>
                                <span>Total: <strong>{totalFin}</strong> bilanțuri înregistrate</span>
                              </div>

                              {totalFinPages > 1 && (
                                <div className="flex items-center gap-2">
                                  <span>Pagină {curFinPage} din {totalFinPages}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={curFinPage <= 1}
                                      onClick={() => setFinPage(p => Math.max(1, p - 1))}
                                      className="p-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                                    >
                                      <ChevronLeft size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={curFinPage >= totalFinPages}
                                      onClick={() => setFinPage(p => Math.min(totalFinPages, p + 1))}
                                      className="p-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                                    >
                                      <ChevronRight size={13} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: Insolvență & BPI */}
              {activeTab === 'insolvency' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-full ${insolvency?.inInsolventa ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60'}`}>
                          <ShieldCheck size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            Buletinul Procedurilor de Insolvență (BPI)
                          </h4>
                          <p className="text-xs text-gray-400">
                            Verificare directă în registrul judiciar de insolvență și faliment
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {insolvency?.inInsolventa ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300">
                            ALERTA: În Procedură de Insolvență
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                            Curat: Fără Dosare de Insolvență Active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/60">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                          Buletine BPI
                        </span>
                        <span className="text-base font-bold text-gray-900 dark:text-white tabular-nums">
                          {insolvency?.nrBuletineBPI ?? 0} publicate
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/60">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                          Stare Juridică
                        </span>
                        <span className="text-base font-bold text-gray-900 dark:text-white">
                          {insolvency?.inInsolventa ? 'În procedură' : 'Solvabil conform BPI'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/60">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                          Risc Executare
                        </span>
                        <span className={`text-base font-bold ${insolvency?.inInsolventa ? 'text-red-600' : 'text-emerald-600'}`}>
                          {insolvency?.inInsolventa ? 'Critic' : 'Scăzut'}
                        </span>
                      </div>
                    </div>

                    {insolvency?.buletine && insolvency.buletine.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <h5 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                          Extrase din Buletinele Publicate:
                        </h5>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {insolvency.buletine.map((b, idx) => (
                            <div key={idx} className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/50 text-xs border border-gray-200/50 dark:border-gray-700/50 flex justify-between gap-2">
                              <span className="font-semibold text-gray-800 dark:text-gray-200">{b.titlu || b.nr || `Buletin #${idx + 1}`}</span>
                              <span className="text-gray-400">{b.data || ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: Disciplină Plăți & Incidente (PulsPlăți) */}
              {activeTab === 'payments' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-full ${payments?.are_incidente ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60'}`}>
                          <Activity size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                            Monitorizare Incidente de Plată &amp; Restanțe (PulsPlăți)
                          </h4>
                          <p className="text-xs text-gray-400">
                            Comportament istoric de decontare cu furnizorii și instituțiile de credit
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          (payments?.scor_plati ?? 100) >= 80 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' 
                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          Scor Plăți: {payments?.scor_plati ?? 100}/100
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/60">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                          Incidente Majore Raportate
                        </span>
                        <span className={`text-base font-bold tabular-nums ${payments?.are_incidente ? 'text-rose-600' : 'text-gray-900 dark:text-white'}`}>
                          {payments?.numar_incidente || 0}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/60">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                          Sold Depășit Raportat
                        </span>
                        <span className={`text-base font-bold tabular-nums ${payments?.sold_depasit > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {formatCurrency(payments?.sold_depasit || 0)}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/60">
                        <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider block">
                          Grad de Conformare
                        </span>
                        <span className="text-base font-bold text-gray-900 dark:text-white">
                          {payments?.are_incidente ? 'Restanțier semnalat' : 'Excelent (Fără refuzuri)'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Rețea Firme Administrator */}
              {activeTab === 'admin' && (
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          Companii Afiliate Administratorului / Reprezentantului
                        </h4>
                        <p className="text-xs text-gray-400">
                          Reprezentant analizat: <strong className="text-gray-700 dark:text-gray-300">{representativeName || 'Nespecificat în ONRC'}</strong>
                        </p>
                      </div>
                      {selectedAdminRows.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{selectedAdminRows.length} selectate</span>
                          <button
                            type="button"
                            onClick={() => setSelectedAdminRows([])}
                            className="px-3 py-1 text-xs font-semibold rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            Deselectează
                          </button>
                        </div>
                      )}
                    </div>

                    {adminNetwork.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-500">
                        Nu au fost identificate alte companii asociate reprezentantului în registrul public.
                      </div>
                    ) : (
                      (() => {
                        const totalAdmin = adminNetwork.length;
                        const totalAdminPages = Math.ceil(totalAdmin / adminPerPage) || 1;
                        const curAdminPage = Math.min(adminPage, totalAdminPages);
                        const startAdminIdx = (curAdminPage - 1) * adminPerPage;
                        const paginatedAdmin = adminNetwork.slice(startAdminIdx, startAdminIdx + adminPerPage);
                        const allCurAdminSelected = paginatedAdmin.length > 0 && paginatedAdmin.every((_, i) => selectedAdminRows.includes(startAdminIdx + i));

                        return (
                          <div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 border-b border-gray-100 dark:border-gray-700 uppercase tracking-wider text-[10px]">
                                  <tr>
                                    <th className="w-10 px-3 py-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={allCurAdminSelected}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            const newIds = paginatedAdmin.map((_, i) => startAdminIdx + i);
                                            setSelectedAdminRows(prev => Array.from(new Set([...prev, ...newIds])));
                                          } else {
                                            const pageIds = paginatedAdmin.map((_, i) => startAdminIdx + i);
                                            setSelectedAdminRows(prev => prev.filter(id => !pageIds.includes(id)));
                                          }
                                        }}
                                        className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary/30 cursor-pointer"
                                      />
                                    </th>
                                    <th className="px-3 py-2.5 text-center w-14">Nr. Crt.</th>
                                    <th className="px-3 py-2.5">CUI</th>
                                    <th className="px-3 py-2.5">Denumire Companie</th>
                                    <th className="px-3 py-2.5">Județ / Localitate</th>
                                    <th className="px-3 py-2.5 text-center">Rol / Calitate</th>
                                    <th className="px-3 py-2.5 text-right">Acțiuni</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {paginatedAdmin.map((comp, relIdx) => {
                                    const absIdx = startAdminIdx + relIdx;
                                    const isSelected = selectedAdminRows.includes(absIdx);
                                    const compCui = comp.cui || comp.cui_cnp;
                                    const compName = comp.name || comp.denumire;
                                    const locality = comp.locality || comp.localitate || '';
                                    const county = comp.county || comp.judet || '';

                                    return (
                                      <tr
                                        key={absIdx}
                                        className={`hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors ${
                                          isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                                        }`}
                                      >
                                        <td className="px-3 py-2.5 text-center">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {
                                              setSelectedAdminRows(prev => 
                                                prev.includes(absIdx) ? prev.filter(x => x !== absIdx) : [...prev, absIdx]
                                              );
                                            }}
                                            className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary/30 cursor-pointer"
                                          />
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-gray-400 font-medium tabular-nums">
                                          {absIdx + 1}
                                        </td>
                                        <td className="px-3 py-2.5 font-bold text-gray-900 dark:text-white tabular-nums">
                                          {compCui || '—'}
                                        </td>
                                        <td className="px-3 py-2.5 font-semibold text-gray-900 dark:text-white">
                                          {compName || 'Companie'}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">
                                          {locality ? `${locality}${county ? `, ${county}` : ''}` : county || 'România'}
                                        </td>
                                        <td className="px-3 py-2.5 text-center">
                                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                            {comp.calitate || comp.role || 'Administrator'}
                                          </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right">
                                          <button
                                            type="button"
                                            onClick={() => handleOpenCompanyFromNetwork(comp)}
                                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-primary transition-colors cursor-pointer inline-flex items-center justify-center shadow-2xs"
                                            title={`Deschide dosarul companiei ${compName}`}
                                          >
                                            <ExternalLink size={14} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination Footer */}
                            <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 bg-gray-50/40 dark:bg-gray-900/20">
                              <div className="flex items-center gap-2">
                                <span>Afișează</span>
                                <select
                                  value={adminPerPage}
                                  onChange={(e) => {
                                    setAdminPerPage(Number(e.target.value));
                                    setAdminPage(1);
                                  }}
                                  className="px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs focus:outline-none cursor-pointer"
                                >
                                  <option value={5}>5</option>
                                  <option value={10}>10</option>
                                </select>
                                <span>pe pagină</span>
                                <span className="mx-2">•</span>
                                <span>Total: <strong>{totalAdmin}</strong> companii identificate</span>
                              </div>

                              {totalAdminPages > 1 && (
                                <div className="flex items-center gap-2">
                                  <span>Pagină {curAdminPage} din {totalAdminPages}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={curAdminPage <= 1}
                                      onClick={() => setAdminPage(p => Math.max(1, p - 1))}
                                      className="p-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                                    >
                                      <ChevronLeft size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={curAdminPage >= totalAdminPages}
                                      onClick={() => setAdminPage(p => Math.min(totalAdminPages, p + 1))}
                                      className="p-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                                    >
                                      <ChevronRight size={13} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: Regim Fiscal & Istoric TVA */}
              {activeTab === 'fiscal' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          Înrolare RO e-Factura &amp; Mențiuni ANAF
                        </h4>
                        <p className="text-xs text-gray-400">
                          Date extrase direct din registrul național al contribuabililor
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {companyInfo?.statusEFactura || 'Înrolat e-Factura'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/60">
                        <span className="text-gray-400 block mb-0.5">TVA la Încasare</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {companyInfo?.statusTvaIncasare || 'Neaplicabil (TVA Normal)'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-700/60">
                        <span className="text-gray-400 block mb-0.5">Split TVA</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {companyInfo?.statusSplitTva || 'Inactiv'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tabel Perioade TVA */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          Istoric Perioade Înregistrare în Scopuri de TVA
                        </h4>
                        <p className="text-xs text-gray-400">
                          Toate intervalele fiscale comunicate către ANAF
                        </p>
                      </div>
                      {selectedTvaRows.length > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">{selectedTvaRows.length} selectate</span>
                          <button
                            type="button"
                            onClick={() => setSelectedTvaRows([])}
                            className="px-3 py-1 text-xs font-semibold rounded-full border border-gray-200 hover:bg-gray-100 transition-colors"
                          >
                            Deselectează
                          </button>
                        </div>
                      )}
                    </div>

                    {tvaPeriods.length === 0 ? (
                      <div className="p-8 text-center text-xs text-gray-500">
                        Nu există perioade de TVA înregistrate în baza oficială.
                      </div>
                    ) : (
                      (() => {
                        const totalTva = tvaPeriods.length;
                        const totalTvaPages = Math.ceil(totalTva / tvaPerPage) || 1;
                        const curTvaPage = Math.min(tvaPage, totalTvaPages);
                        const startTvaIdx = (curTvaPage - 1) * tvaPerPage;
                        const paginatedTva = tvaPeriods.slice(startTvaIdx, startTvaIdx + tvaPerPage);
                        const allCurTvaSelected = paginatedTva.length > 0 && paginatedTva.every((_, i) => selectedTvaRows.includes(startTvaIdx + i));

                        return (
                          <div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 border-b border-gray-100 dark:border-gray-700 uppercase tracking-wider text-[10px]">
                                  <tr>
                                    <th className="w-10 px-3 py-2.5 text-center">
                                      <input
                                        type="checkbox"
                                        checked={allCurTvaSelected}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            const newIds = paginatedTva.map((_, i) => startTvaIdx + i);
                                            setSelectedTvaRows(prev => Array.from(new Set([...prev, ...newIds])));
                                          } else {
                                            const pageIds = paginatedTva.map((_, i) => startTvaIdx + i);
                                            setSelectedTvaRows(prev => prev.filter(id => !pageIds.includes(id)));
                                          }
                                        }}
                                        className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary/30 cursor-pointer"
                                      />
                                    </th>
                                    <th className="px-3 py-2.5 text-center w-14">Nr. Crt.</th>
                                    <th className="px-3 py-2.5">Dată Început</th>
                                    <th className="px-3 py-2.5">Dată Sfârșit</th>
                                    <th className="px-3 py-2.5">Dată Anulare</th>
                                    <th className="px-3 py-2.5">Mențiuni Oficiale ANAF</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {paginatedTva.map((item, relIdx) => {
                                    const absIdx = startTvaIdx + relIdx;
                                    const isSelected = selectedTvaRows.includes(absIdx);
                                    const isCancelled = Boolean(item.dataAnulare);

                                    return (
                                      <tr 
                                        key={absIdx}
                                        className={`hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-colors ${
                                          isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                                        }`}
                                      >
                                        <td className="px-3 py-2.5 text-center">
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => {
                                              setSelectedTvaRows(prev => 
                                                prev.includes(absIdx) ? prev.filter(x => x !== absIdx) : [...prev, absIdx]
                                              );
                                            }}
                                            className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary/30 cursor-pointer"
                                          />
                                        </td>
                                        <td className="px-3 py-2.5 text-center text-gray-400 font-medium tabular-nums">
                                          {absIdx + 1}
                                        </td>
                                        <td className="px-3 py-2.5 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                                          {item.dataStart || '—'}
                                        </td>
                                        <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                          {item.dataEnd || 'Prezent'}
                                        </td>
                                        <td className="px-3 py-2.5 whitespace-nowrap">
                                          {item.dataAnulare ? (
                                            <span className="text-red-600 dark:text-red-400 font-medium">
                                              {item.dataAnulare}
                                            </span>
                                          ) : (
                                            <span className="text-gray-400">—</span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2.5 max-w-xs text-gray-600 dark:text-gray-300">
                                          {item.mesaj ? (
                                            <span className="line-clamp-2" title={item.mesaj}>
                                              {item.mesaj}
                                            </span>
                                          ) : isCancelled ? (
                                            <span className="text-red-600 dark:text-red-400">Înregistrare TVA anulată</span>
                                          ) : (
                                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Activă conform legii</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* Pagination Footer */}
                            <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500 bg-gray-50/40 dark:bg-gray-900/20">
                              <div className="flex items-center gap-2">
                                <span>Afișează</span>
                                <select
                                  value={tvaPerPage}
                                  onChange={(e) => {
                                    setTvaPerPage(Number(e.target.value));
                                    setTvaPage(1);
                                  }}
                                  className="px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs focus:outline-none cursor-pointer"
                                >
                                  <option value={5}>5</option>
                                  <option value={10}>10</option>
                                </select>
                                <span>pe pagină</span>
                                <span className="mx-2">•</span>
                                <span>Total: <strong>{totalTva}</strong> perioade înregistrate</span>
                              </div>

                              {totalTvaPages > 1 && (
                                <div className="flex items-center gap-2">
                                  <span>Pagină {curTvaPage} din {totalTvaPages}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={curTvaPage <= 1}
                                      onClick={() => setTvaPage(p => Math.max(1, p - 1))}
                                      className="p-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                                    >
                                      <ChevronLeft size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={curTvaPage >= totalTvaPages}
                                      onClick={() => setTvaPage(p => Math.min(totalTvaPages, p + 1))}
                                      className="p-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 disabled:opacity-40 cursor-pointer"
                                    >
                                      <ChevronRight size={13} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-900/40">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Surse live: BPI • ONRC • PulsPlăți • ANAF Open Data</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              disabled={!data}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {copiedSummary ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedSummary ? 'Copiat în Clipboard' : 'Copiază Sumar'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full text-xs font-semibold bg-gray-900 hover:bg-black text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors cursor-pointer shadow-2xs"
            >
              Închide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicDeepResearchModal;
