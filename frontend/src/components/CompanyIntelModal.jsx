import { useState, useEffect } from 'react';
import { 
  X, Building2, ExternalLink, Scale, FileText, Users, 
  TrendingUp, AlertTriangle, ShieldCheck, CheckCircle2, 
  MapPin, Phone, Hash, Calendar, Loader2, Eye, RefreshCw,
  Sparkles, Award, Briefcase, Layers, Network, ArrowLeft, ChevronRight
} from 'lucide-react';
import { fetchCompanyFullIntel } from '../services/api';
import { Link } from 'react-router-dom';
import MofDocumentModal from './MofDocumentModal';
import FinancialPerformanceCard from './FinancialPerformanceCard';
import OwnershipAndGovernanceCard from './OwnershipAndGovernanceCard';
import { getCaenInfo, getCaenDescription } from '../utils/caenHelper';

const CompanyIntelModal = ({ 
  isOpen, 
  onClose, 
  cui, 
  initialName, 
  onEvaluate, 
  onOpenPerson, 
  onOpenCompany,
  history = [],
  onBack 
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');
  const [expandedCase, setExpandedCase] = useState(null);
  const [selectedMofPub, setSelectedMofPub] = useState(null);

  useEffect(() => {
    if (!isOpen || !cui) return;
    
    let isMounted = true;
    setLoading(true);
    setData(null);
    setActiveTab('general');
    setExpandedCase(null);

    fetchCompanyFullIntel(cui, initialName || '')
      .then(res => {
        if (isMounted) setData(res);
      })
      .catch(err => {
        console.error('Eroare fetchCompanyFullIntel:', err);
        if (isMounted) setData({ error: 'Nu s-au putut prelua datele complete.' });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [isOpen, cui]);

  const handleRefreshApi = () => {
    if (!cui || loading) return;
    setLoading(true);
    fetchCompanyFullIntel(cui, initialName || '', true)
      .then(res => {
        setData(res);
      })
      .catch(err => {
        console.error('Eroare reîmprospătare API:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  if (!isOpen) return null;

  const general = data?.general || {};
  const balance = data?.balance || {};
  const personnel = data?.personnel || [];
  const courtCases = data?.court_cases || [];
  const mof = data?.mof || [];
  const bpi = data?.bpi || { has_insolvency: false, count: 0, records: [] };

  const companyName = data?.denumire || general.denumire || initialName || `CUI ${cui}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Navigation Breadcrumb History Trail */}
        {history && history.length > 0 && (
          <div className="px-5 py-2.5 bg-gray-100/90 dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-700/80 flex items-center justify-between gap-3 text-xs shrink-0">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-2xs transition-all cursor-pointer text-xs"
            >
              <ArrowLeft size={13} />
              <span>Înapoi ({history[history.length - 1].name || history[history.length - 1].cui})</span>
            </button>
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 overflow-x-auto text-[11px] truncate">
              <span className="font-semibold text-gray-500 dark:text-gray-400">Traseu:</span>
              {history.map((step, idx) => (
                <span key={idx} className="flex items-center gap-1 shrink-0 font-medium text-gray-600 dark:text-gray-300">
                  <span>{step.name || step.cui}</span>
                  <ChevronRight size={10} className="text-gray-400" />
                </span>
              ))}
              <span className="font-bold text-primary shrink-0 truncate max-w-[180px]">
                {companyName}
              </span>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/60 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-gray-900 dark:text-white truncate">
                  {companyName}
                </h3>
                {general.stare && (
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    general.stare.includes('INREGISTRAT') || general.stare.includes('ACTIVA')
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/30 dark:text-rose-300'
                  }`}>
                    {general.stare}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1 flex-wrap">
                <span>CUI: <strong className="text-gray-700 dark:text-gray-200">{cui}</strong></span>
                {general.nr_reg_com && <span>• ONRC: <strong className="text-gray-700 dark:text-gray-200">{general.nr_reg_com}</strong></span>}
                {(general.data_inregistrare || general.data_inreg) && (
                  <span>• Înregistrată: <strong className="text-gray-700 dark:text-gray-200">{general.data_inregistrare || general.data_inreg}</strong></span>
                )}
                {general.cod_caen && (() => {
                  const caenInfo = getCaenInfo(general.cod_caen);
                  const caenDesc = general.caen_descriere || caenInfo?.denumire;
                  return (
                    <span className="inline-flex items-center gap-1">
                      <span>• CAEN:</span>
                      <strong className="text-gray-700 dark:text-gray-200">{general.cod_caen}</strong>
                      {caenDesc && <span className="text-gray-500 font-normal">({caenDesc})</span>}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {data?.cached ? (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800 shadow-2xs">
                Baza Axis (0 credite)
              </span>
            ) : data && !loading && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800 shadow-2xs">
                Salvat în Baza Axis
              </span>
            )}

            <button
              type="button"
              onClick={handleRefreshApi}
              disabled={loading}
              title="Re-interoghează sursele externe API (consumă 1 credit)"
              className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>

            {data?.existing_client_id ? (
              <Link
                to={`/clients/${data.existing_client_id}`}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap"
              >
                <Eye size={13} />
                <span>Profil Client Axis</span>
              </Link>
            ) : onEvaluate && (
              <button
                type="button"
                onClick={() => {
                  onEvaluate(cui, companyName);
                  onClose();
                }}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm whitespace-nowrap cursor-pointer"
              >
                <RefreshCw size={13} />
                <span>Evaluează în Axis</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-5 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'general'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <FileText size={14} />
            <span>Date Fiscale &amp; Sediu</span>
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
            <span>Dosare Instanță (Portal Just)</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${
              courtCases.length > 0 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
            }`}>
              {courtCases.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('financial')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'financial'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <TrendingUp size={14} />
            <span>Bilanț &amp; Finanțe</span>
            {balance.an && <span className="text-[10px] text-gray-400">({balance.an})</span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('personnel')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'personnel'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Users size={14} />
            <span>Administratori &amp; Asociați</span>
            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-500">
              {personnel.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bpi_mof')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'bpi_mof'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <ShieldCheck size={14} />
            <span>BPI &amp; Monitorul Oficial</span>
            {bpi.has_insolvency && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[350px]">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Preluare date în timp real din FirmeAPI &amp; Portal Just.ro...
              </p>
            </div>
          ) : data?.error ? (
            <div className="p-6 text-center text-sm text-red-500">
              {data.error}
            </div>
          ) : (
            <>
              {/* TAB 1: DATE FISCALE & SEDIU */}
              {activeTab === 'general' && (
                <div className="space-y-4">
                  {/* Activitate Principală & Domeniu CAEN */}
                  {(general.cod_caen || general.caen_descriere) && (() => {
                    const caenInfo = getCaenInfo(general.cod_caen);
                    const caenDesc = general.caen_descriere || caenInfo?.denumire || 'Nespecificat';
                    const caenSec = general.caen_sectiune || caenInfo?.sectiune || '';
                    const caenGrupa = caenInfo?.grupa || '';
                    return (
                      <div className="p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 dark:from-blue-950/20 dark:via-gray-800/80 dark:to-indigo-950/20 shadow-xs">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                            <Briefcase size={13} />
                            <span>Activitate Principală &amp; Domeniu CAEN</span>
                          </div>
                          {caenSec && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              Secțiunea {caenSec}
                            </span>
                          )}
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs shrink-0 shadow-xs">
                            CAEN {general.cod_caen}
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-bold text-gray-900 dark:text-white leading-relaxed">
                              {caenDesc}
                            </div>
                            {caenGrupa && (
                              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                Grupa CAEN: {caenGrupa}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40">
                      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <MapPin size={12} /> Adresă Sediu Social
                      </div>
                      <div className="text-xs font-semibold text-gray-900 dark:text-white leading-relaxed">
                        {general.adresa || general.adresa_sediu_social || 'Nespecificat'}
                      </div>
                      {general.adresa && (
                        <a
                          href={`https://maps.google.com/?q=${encodeURIComponent(general.adresa)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <span>Deschide în Google Maps</span>
                          <ExternalLink size={10} />
                        </a>
                      )}
                    </div>

                    <div className="p-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40">
                      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                        Organ Fiscal &amp; Înregistrare
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Organ Fiscal:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{general.organ_fiscal || 'ANAF'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Formă Juridică:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{general.forma_juridica || 'SRL'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Data Înregistrării:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{general.data_inregistrare || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status TVA & Conformitate Fiscală */}
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">
                      Regim TVA &amp; Conformitate Fiscală
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                        <span className="text-gray-400 block text-[10px]">Plătitor TVA</span>
                        <span className={`font-bold inline-flex items-center gap-1 mt-0.5 ${
                          general.tva?.platitor ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {general.tva?.platitor ? 'DA (Activ)' : 'NU (Neplătitor)'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                        <span className="text-gray-400 block text-[10px]">TVA la Încasare</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 mt-0.5 block">
                          {general.tva_incasare ? 'Activ' : 'Inactiv'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                        <span className="text-gray-400 block text-[10px]">Split TVA</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 mt-0.5 block">
                          {general.split_tva ? 'Activ' : 'Inactiv'}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800">
                        <span className="text-gray-400 block text-[10px]">e-Factura SPV</span>
                        <span className={`font-bold mt-0.5 block ${general.e_factura ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500'}`}>
                          {general.e_factura ? 'Înregistrat' : 'Standard'}
                        </span>
                      </div>
                    </div>

                    {/* Istoric TVA dacă există anulări */}
                    {general.tva?.perioade?.length > 1 && (
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px]">
                        <span className="text-gray-400 font-medium">Istoric Mențiuni TVA:</span>
                        <div className="mt-1 space-y-1">
                          {general.tva.perioade.map((p, pIdx) => (
                            <div key={pIdx} className="text-gray-500 dark:text-gray-400">
                              • Din {p.data_inceput_ScpTVA} {p.data_sfarsit_ScpTVA ? `până la ${p.data_sfarsit_ScpTVA}` : '(Prezent)'} 
                              {p.mesaj_ScpTVA && <span className="text-orange-500 dark:text-orange-400 block ml-2 text-[10px]">{p.mesaj_ScpTVA}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: DOSARE ÎN INSTANȚĂ (PORTAL JUST.RO) */}
              {activeTab === 'just' && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
                    <div className="flex items-center gap-2">
                      <Scale size={16} className="text-blue-600 shrink-0" />
                      <span>Verificare oficială în timp real via <strong>portalquery.just.ro</strong> (Ministerul Justiției).</span>
                    </div>
                    <span className="font-bold whitespace-nowrap">{courtCases.length} Dosare Găsite</span>
                  </div>

                  {courtCases.length === 0 ? (
                    <div className="p-8 text-center rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Nu au fost găsite litigii pe rol</p>
                      <p className="text-xs text-gray-500 mt-1">Compania nu are dosare active sau insolvențe înregistrate pe portal.just.ro.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50/70 dark:bg-gray-900/40 text-gray-500 uppercase font-medium border-b border-gray-200 dark:border-gray-700">
                            <tr>
                              <th className="px-3.5 py-2.5 whitespace-nowrap">Nr. Crt.</th>
                              <th className="px-3.5 py-2.5 whitespace-nowrap">Număr Dosar</th>
                              <th className="px-3.5 py-2.5 whitespace-nowrap">Dată</th>
                              <th className="px-3.5 py-2.5 whitespace-nowrap">Instanță</th>
                              <th className="px-3.5 py-2.5 whitespace-nowrap">Obiect / Categorie</th>
                              <th className="px-3.5 py-2.5 whitespace-nowrap">Stadiu</th>
                              <th className="px-3.5 py-2.5 whitespace-nowrap text-right">Detalii Soluție</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {courtCases.map((c, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40 transition-colors">
                                <td className="px-3.5 py-2.5 text-gray-400 whitespace-nowrap">{idx + 1}</td>
                                <td className="px-3.5 py-2.5 font-semibold text-primary whitespace-nowrap">
                                  <a
                                    href={c.url_portal}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline inline-flex items-center gap-1 text-xs"
                                    title="Deschide dosarul pe portal.just.ro"
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

              {/* TAB 3: BILANȚ & FINANȚE */}
              {activeTab === 'financial' && (
                <div className="space-y-4">
                  <FinancialPerformanceCard balance={balance} />
                </div>
              )}

              {/* TAB 4: ADMINISTRATORI & ASOCIAȚI */}
              {activeTab === 'personnel' && (
                <div className="space-y-6">
                  <OwnershipAndGovernanceCard 
                    holdings={data?.holdings || []}
                    administrators={data?.administrators || []}
                    adminNetworks={data?.admin_networks || []}
                    caenActivities={data?.caen_activities || {
                      cod_caen: general.cod_caen,
                      caen_principal: {
                        cod: general.cod_caen,
                        denumire: general.caen_descriere
                      }
                    }}
                    mof={mof}
                    companyCui={cui}
                    companyName={companyName}
                    registrationDate={general.data_inregistrare || general.data_inreg || ""}
                    regComNumber={general.nr_reg_com || general.nrRegCom || ""}
                    fiscalStatus={general.stare || ""}
                    onOpenMofModal={setSelectedMofPub}
                    onOpenPerson={(personName) => onOpenPerson && onOpenPerson(personName, cui)}
                    onOpenCompany={(compCui, compName) => onOpenCompany ? onOpenCompany(compCui, compName) : (onEvaluate && onEvaluate(compCui, compName))}
                  />

                  {/* Smart Ownership & Corporate Governance Box */}
                  {data?.smart_ownership && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 dark:from-indigo-950/20 dark:via-gray-800/80 dark:to-blue-950/20 border border-indigo-100 dark:border-indigo-900/40">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                          <Sparkles size={14} />
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          Analiză Smart: Beneficiar Real &amp; Guvernanță
                        </span>
                        <span className="px-2 py-0.2 rounded-md text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 ml-auto">
                          OSINT Intelligence
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
                        <div className="p-2.5 rounded-lg bg-white/90 dark:bg-gray-800/90 border border-indigo-100/80 dark:border-indigo-900/30">
                          <div className="text-[10px] uppercase font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                            <Award size={11} /> Beneficiar Real (UBO)
                          </div>
                          <div className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                            {data.smart_ownership.beneficiar_real || 'Nedeterminat'}
                          </div>
                          <span className="inline-block mt-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                            {data.smart_ownership.tip_control || 'ASOCIAT'}
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-white/90 dark:bg-gray-800/90 border border-blue-100/80 dark:border-blue-900/30">
                          <div className="text-[10px] uppercase font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                            <Briefcase size={11} /> Conducere Executivă
                          </div>
                          <div className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                            {data.smart_ownership.separare_management ? 'Management Mandatat' : 'Antreprenor Direct'}
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                            {data.smart_ownership.separare_management ? 'Administrator fără părți sociale' : 'Asociatul conduce direct'}
                          </div>
                        </div>

                        <div className="p-2.5 rounded-lg bg-white/90 dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/60">
                          <div className="text-[10px] uppercase font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                            <Layers size={11} /> Dinamică / Cesiuni
                          </div>
                          <div className="text-xs font-bold text-gray-900 dark:text-white mt-1">
                            {data.smart_ownership.historic_shareholders_count > 0 
                              ? `${data.smart_ownership.historic_shareholders_count} foști asociați retrași`
                              : 'Structură stabilă'}
                          </div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {data.smart_ownership.istoric_cesiuni?.[0] || 'Fără cesiuni înregistrate'}
                          </div>
                        </div>
                      </div>

                      {data.smart_ownership.insights?.length > 0 && (
                        <div className="space-y-1 text-[11px] text-indigo-950 dark:text-indigo-200">
                          {data.smart_ownership.insights.map((ins, iIdx) => (
                            <div key={iIdx} className="flex items-start gap-1.5">
                              <span className="text-indigo-500">•</span>
                              <span>{ins}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {personnel.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-500">
                      Nu au fost identificați asociați sau administratori înregistrați pentru acest CUI.
                    </div>
                  ) : (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50/60 dark:bg-gray-900/40 text-gray-500 uppercase font-medium border-b border-gray-200 dark:border-gray-700">
                          <tr>
                            <th className="px-3 py-2.5 whitespace-nowrap text-center w-12">Nr.</th>
                            <th className="px-4 py-2.5 whitespace-nowrap">Nume Persoană</th>
                            <th className="px-4 py-2.5 whitespace-nowrap">Calitate / Mandat</th>
                            <th className="px-4 py-2.5 whitespace-nowrap text-center">Cota %</th>
                            <th className="px-4 py-2.5 whitespace-nowrap text-center">Stare</th>
                            <th className="px-4 py-2.5 whitespace-nowrap text-center">Alte Firme Active</th>
                            <th className="px-4 py-2.5 whitespace-nowrap text-right">Dosar &amp; Rețea</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                          {personnel.map((p, pIdx) => (
                            <tr key={pIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40 transition-colors">
                              <td className="px-3 py-2.5 text-center text-gray-400 text-[11px]">
                                {pIdx + 1}
                              </td>
                              <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  {p.tip_entitate === 'PJ' || p.cui ? (
                                    <button
                                      type="button"
                                      onClick={() => onOpenCompany ? onOpenCompany(p.cui, p.nume) : (onOpenPerson && onOpenPerson(p.nume, cui))}
                                      className="hover:text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer text-left font-bold"
                                      title="Deschide dosar companie asociată (PJ)"
                                    >
                                      <Building2 size={13} className="text-indigo-500" />
                                      <span>{p.nume}</span>
                                      <ExternalLink size={11} className="text-gray-400 hover:text-primary" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => onOpenPerson && onOpenPerson(p.nume, cui)}
                                      className="hover:text-primary hover:underline inline-flex items-center gap-1.5 cursor-pointer text-left font-bold"
                                      title="Deschide profil persoană &amp; dosare just.ro"
                                    >
                                      <span>{p.nume}</span>
                                      <ExternalLink size={11} className="text-gray-400 hover:text-primary" />
                                    </button>
                                  )}
                                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                    p.tip_entitate === 'PJ' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                  }`}>
                                    {p.tip_entitate || 'PF'}
                                  </span>
                                </div>
                                {p.loc_nastere && <div className="text-[10px] text-gray-400 font-normal">Origine: {p.loc_nastere}</div>}
                              </td>
                              <td className="px-4 py-2.5 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold text-[11px] w-fit">
                                    {p.rol}
                                  </span>
                                  {p.data_numire && (
                                    <span className="text-[10px] text-gray-400 mt-0.5">
                                      Din: {p.data_numire} {p.data_sfarsit ? `– ${p.data_sfarsit}` : ''}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-center font-bold whitespace-nowrap">
                                {p.cota_participare ? (
                                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold">
                                    {p.cota_participare}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                  p.stare === 'Activ' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {p.stare || 'Activ'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-center font-bold whitespace-nowrap">
                                {p.alte_companii_active || 0}
                              </td>
                              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (p.tip_entitate === 'PJ' || p.cui) {
                                      if (onOpenCompany) onOpenCompany(p.cui, p.nume);
                                    } else {
                                      if (onOpenPerson) onOpenPerson(p.nume, cui);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-white font-medium transition-colors cursor-pointer"
                                  title="Lansează investigația Rețea / Caracatiță"
                                >
                                  <Network size={12} />
                                  <span>Rețea</span>
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

              {/* TAB 5: BPI & MOF */}
              {activeTab === 'bpi_mof' && (
                <div className="space-y-4">
                  {/* BPI Section */}
                  <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40">
                    <h5 className="font-bold text-xs text-gray-900 dark:text-white mb-2 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={14} className={bpi.has_insolvency ? 'text-rose-500' : 'text-emerald-500'} />
                      Buletinul Procedurilor de Insolvență (BPI)
                    </h5>
                    {bpi.has_insolvency ? (
                      <div className="space-y-2">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800">
                          {bpi.count} Publicații de Insolvență Detectate
                        </span>
                        <div className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                          Compania figurează în BPI cu proceduri de concordat, insolvență sau faliment.
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        <CheckCircle2 size={16} />
                        <span>Fără înregistrări de insolvență sau faliment în BPI.</span>
                      </div>
                    )}
                  </div>

                  {/* MOF Publications Section */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                    <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <span className="font-bold text-xs text-gray-900 dark:text-white">
                        Publicații în Monitorul Oficial Partea a IV-a
                      </span>
                      <span className="text-[11px] text-gray-500 font-medium">Total: {mof.length}</span>
                    </div>
                    {mof.length === 0 ? (
                      <div className="p-4 text-center text-xs text-gray-400">
                        Nu sunt publicații recente înregistrate în baza de date.
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto">
                        {mof.map((pub, mIdx) => (
                          <div 
                            key={mIdx} 
                            className="p-3.5 text-xs hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div 
                                className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-primary transition-colors flex items-center gap-1.5"
                                onClick={() => setSelectedMofPub(pub)}
                                title="Click pentru a deschide actul complet"
                              >
                                <span>{pub.titlu_publicatie || pub.denumire}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-900/60 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700 whitespace-nowrap">
                                  Nr. {pub.publicatieNr} • {pub.data}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedMofPub(pub)}
                                  className="px-2.5 py-1 bg-primary hover:bg-primary/90 text-white rounded-lg font-semibold text-[10px] transition-all cursor-pointer inline-flex items-center gap-1 shadow-sm whitespace-nowrap"
                                  title="Deschide actul integral"
                                >
                                  <Eye size={11} />
                                  <span>Deschide Actul</span>
                                </button>
                              </div>
                            </div>
                            {pub.continut && (
                              <p 
                                onClick={() => setSelectedMofPub(pub)}
                                className="mt-1.5 text-[11px] text-gray-500 hover:text-gray-900 dark:hover:text-white line-clamp-2 leading-relaxed cursor-pointer"
                                dangerouslySetInnerHTML={{ __html: pub.continut }}
                                title="Click pentru a deschide actul complet"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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

        <MofDocumentModal
          isOpen={Boolean(selectedMofPub)}
          onClose={() => setSelectedMofPub(null)}
          publication={selectedMofPub}
        />
      </div>
    </div>
  );
};

export default CompanyIntelModal;
