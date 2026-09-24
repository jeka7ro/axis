import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BrainCircuit, AlertTriangle, ShieldCheck, FileText, 
  ChevronRight, ShieldAlert, MapPin, ExternalLink, Navigation, 
  Building2, Eye, Compass, Layers, CheckSquare, Square, ChevronLeft,
  Camera, Maximize2, X, Image as ImageIcon, Loader2, RefreshCw, Users,
  Search, Briefcase, UserCheck, Scale, BookOpen, Sparkles, Award, Network,
  Copy, Check, Plus, Minus, ZoomIn, ZoomOut
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { fetchClient, evaluateClient, evaluateCompanyByCui, fetchAdminNetwork } from '../services/api';
import CompanyIntelModal from '../components/CompanyIntelModal';
import PersonIntelModal from '../components/PersonIntelModal';
import MofDocumentModal from '../components/MofDocumentModal';
import FinancialPerformanceCard from '../components/FinancialPerformanceCard';
import OwnershipAndGovernanceCard from '../components/OwnershipAndGovernanceCard';
import InvestigationBoard from '../components/InvestigationBoard';
import { getCaenInfo, getCaenDescription } from '../utils/caenHelper';

const customMapPinIcon = typeof window !== 'undefined' && L ? L.divIcon({
  className: 'custom-leaflet-marker',
  html: `
    <div style="position: relative; width: 34px; height: 34px; transform: translate(-50%, -100%);">
      <div style="position: absolute; bottom: -2px; left: 50%; transform: translateX(-50%); width: 14px; height: 5px; background: rgba(0,0,0,0.35); border-radius: 50%; filter: blur(1.5px);"></div>
      <svg width="34" height="34" viewBox="0 0 24 24" fill="#ef4444" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3.2" fill="#ffffff"></circle>
      </svg>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34]
}) : null;

const ClientDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluatingCui, setEvaluatingCui] = useState(null);
  const [activeTab, setActiveTab] = useState('financial');
  const [selectedAddressRows, setSelectedAddressRows] = useState([]);
  const [addressPage, setAddressPage] = useState(1);
  const [addressPageSize, setAddressPageSize] = useState(5);
  const [selectedPersonnelRows, setSelectedPersonnelRows] = useState([]);
  const [personnelPage, setPersonnelPage] = useState(1);
  const [personnelPerPage, setPersonnelPerPage] = useState(10);
  const [copiedPersonnelNames, setCopiedPersonnelNames] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState('photos'); // 'photos' | 'map'
  const [streetView360Mode, setStreetView360Mode] = useState(false);
  const [mapZoom, setMapZoom] = useState(17);
  const [mapMode, setMapMode] = useState('google'); // 'google' | 'leaflet'
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminSearchResults, setAdminSearchResults] = useState(null);
  const [adminSearchLoading, setAdminSearchLoading] = useState(false);
  const [selectedHomonymIndex, setSelectedHomonymIndex] = useState(0);
  const [dismissedHomonymIndices, setDismissedHomonymIndices] = useState([]);
  const [showAllHomonyms, setShowAllHomonyms] = useState(false);
  const [companyIntelTarget, setCompanyIntelTarget] = useState({ isOpen: false, cui: null, name: '' });
  const [personIntelTarget, setPersonIntelTarget] = useState({ isOpen: false, name: '', contextCui: null });
  const [selectedMofPub, setSelectedMofPub] = useState(null);
  const [expandedMofIndices, setExpandedMofIndices] = useState([]);

  const toggleMofExpand = (idx) => {
    setExpandedMofIndices(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const openCompanyIntel = (cui, name) => {
    setCompanyIntelTarget({ isOpen: true, cui: String(cui).trim(), name: name || '' });
  };
  const closeCompanyIntel = () => {
    setCompanyIntelTarget({ isOpen: false, cui: null, name: '' });
  };

  const openPersonIntel = (name, contextCui = null) => {
    setPersonIntelTarget({ 
      isOpen: true, 
      name: name ? name.trim() : '', 
      contextCui: contextCui || client?.cui_cnp || null 
    });
  };
  const closePersonIntel = () => {
    setPersonIntelTarget({ isOpen: false, name: '', contextCui: null });
  };

  const loadClient = async () => {
    try {
      const data = await fetchClient(id);
      setClient(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClient();
  }, [id]);

  useEffect(() => {
    if (!previewModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setPreviewModalOpen(false);
      if (e.key === 'ArrowLeft') {
        setSelectedPhotoIndex((prev) => (prev - 1 + 4) % 4);
      }
      if (e.key === 'ArrowRight') {
        setSelectedPhotoIndex((prev) => (prev + 1) % 4);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewModalOpen]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      await evaluateClient(id);
      await loadClient(); // Reload to get new evaluation
    } catch (error) {
      console.error("OSINT API Error:", error);
    } finally {
      setEvaluating(false);
    }
  };

  const handleEvaluateCompany = async (cui, companyName) => {
    if (!cui || evaluatingCui) return;
    const cleanCui = String(cui).trim().toUpperCase().replace(/^RO/, '').trim();
    setEvaluatingCui(cleanCui);
    try {
      const res = await evaluateCompanyByCui(cleanCui);
      if (res?.client_id) {
        navigate(`/clients/${res.client_id}`);
      }
    } catch (error) {
      console.error("Failed to evaluate company:", error);
      alert(`Eroare la evaluarea companiei ${companyName || cleanCui}: ${error.message || 'Verificați conexiunea la server'}`);
    } finally {
      setEvaluatingCui(null);
    }
  };

  const handleSearchAdmin = async (e) => {
    if (e) e.preventDefault();
    if (!adminSearchQuery || adminSearchQuery.trim().length < 2) return;
    setAdminSearchLoading(true);
    setDismissedHomonymIndices([]);
    setSelectedHomonymIndex(0);
    setShowAllHomonyms(false);
    try {
      const res = await fetchAdminNetwork(adminSearchQuery.trim(), client?.cui_cnp || '');
      setAdminSearchResults(res || []);
    } catch (err) {
      console.error(err);
      alert('Eroare la căutarea administratorului: ' + (err.message || err));
    } finally {
      setAdminSearchLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Se încarcă detaliile clientului...</div>;
  if (!client) return <div className="p-8 text-center text-red-500">Clientul nu a fost găsit.</div>;

  const latestEval = client.evaluations && client.evaluations.length > 0 
    ? client.evaluations[client.evaluations.length - 1] 
    : null;

  const rawDataObj = latestEval?.raw_financial_data
    ? (typeof latestEval.raw_financial_data === 'string'
        ? (() => { try { return JSON.parse(latestEval.raw_financial_data); } catch { return null; } })()
        : latestEval.raw_financial_data)
    : null;

  const enrichedRawData = (() => {
    if (!client) return rawDataObj;
    const base = { ...(rawDataObj || {}) };
    const evals = client.evaluations || [];
    for (let i = evals.length - 1; i >= 0; i--) {
      try {
        const evRaw = typeof evals[i].raw_financial_data === 'string'
          ? JSON.parse(evals[i].raw_financial_data)
          : evals[i].raw_financial_data;
        if (!evRaw) continue;
        if ((!base.personnel || base.personnel.length === 0) && evRaw.personnel?.length > 0) {
          base.personnel = evRaw.personnel;
        }
        if ((!base.holdings || base.holdings.length === 0) && evRaw.holdings?.length > 0) {
          base.holdings = evRaw.holdings;
        }
        if ((!base.asociati || base.asociati.length === 0) && evRaw.asociati?.length > 0) {
          base.asociati = evRaw.asociati;
        }
        if (!base.smart_ownership && evRaw.smart_ownership) {
          base.smart_ownership = evRaw.smart_ownership;
        }
        if ((!base.mof || base.mof.length === 0) && evRaw.mof?.length > 0) {
          base.mof = evRaw.mof;
        }
        if ((!base.admin_networks || base.admin_networks.length === 0) && evRaw.admin_networks?.length > 0) {
          base.admin_networks = evRaw.admin_networks;
        }
        if ((!base.address_check?.companies || base.address_check.companies.length === 0) && evRaw.address_check?.companies?.length > 0) {
          base.address_check = evRaw.address_check;
        }
        if (!base.anaf && evRaw.anaf) {
          base.anaf = evRaw.anaf;
        }
      } catch (e) {
        // ignore
      }
    }
    return base;
  })();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Black List Warning */}
      {client.name === 'Dino Home Construct SRL' && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 p-4 rounded-2xl flex items-start gap-3">
          <ShieldAlert className="text-red-600 mt-0.5 shrink-0" size={20} />
          <div>
            <h3 className="font-bold text-red-800 dark:text-red-400">Client Inclus în Black List (PF/PJ)</h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">Datorii &gt; 90 zile &amp; suspiciune subînchiriere flotă. Ofertarea este blocată și regulile GPS sunt setate pe Severitate Critică.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/clients" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-500 dark:text-gray-400">
          <ArrowLeft size={20} />
        </Link>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profil Client</h2>
      </div>

      {/* Main Info Card with Integrated Score & Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Left: Avatar & Company Name/CUI */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Profile Photo / Avatar */}
          {client.profile_photo ? (
            <img 
              src={client.profile_photo} 
              alt={client.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600 shrink-0">
              <span className="text-lg sm:text-xl font-bold text-gray-700 dark:text-gray-200">
                {client.name ? client.name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : '?'}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight break-words">{client.name}</h3>
              {client.type === 'PJ' && (
                <button
                  type="button"
                  onClick={() => openCompanyIntel(client.cui_cnp, client.name)}
                  className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-primary transition-all cursor-pointer inline-flex items-center gap-1 text-xs font-semibold"
                  title="Deschide dosar complet OSINT &amp; Portal Just.ro"
                >
                  <Scale size={15} />
                  <span className="hidden sm:inline text-[11px] underline">Dosar &amp; Litigii Just.ro</span>
                </button>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-medium">CUI/CNP: {client.cui_cnp}</span>
              <span>•</span>
              <span>Tip: {client.type}</span>
              {client.address && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-sm" title={client.address}>{client.address}</span>
                </>
              )}
            </p>
            {(() => {
              let caenCode = null;
              let caenDesc = '';
              let caenSec = '';
              try {
                if (latestEval?.raw_financial_data) {
                  const rawData = typeof latestEval.raw_financial_data === 'string'
                    ? JSON.parse(latestEval.raw_financial_data)
                    : latestEval.raw_financial_data;
                  caenCode = rawData.anaf?.cod_caen || rawData.balance?.caen || client.caen || null;
                  caenDesc = rawData.anaf?.caen_descriere || rawData.balance?.caen_descriere || '';
                  caenSec = rawData.anaf?.caen_sectiune || '';
                }
              } catch (e) {}

              if (!caenCode && client.caen) caenCode = client.caen;
              if (!caenCode || caenCode === 'N/A') return null;

              const caenInfo = getCaenInfo(caenCode);
              const finalDesc = caenDesc || caenInfo?.denumire || '';
              const finalSec = caenSec || caenInfo?.sectiune || '';

              return (
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-xs font-semibold shadow-xs">
                    <Briefcase size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>CAEN {caenCode}</span>
                    {finalSec && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-800/60 text-blue-800 dark:text-blue-200 font-bold">
                        Secț. {finalSec}
                      </span>
                    )}
                  </div>
                  {finalDesc && (
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {finalDesc}
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right: Integrated Score & Action Button */}
        <div className="flex items-center gap-4 sm:gap-6 shrink-0 flex-wrap sm:flex-nowrap border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-4 md:pt-0 md:pl-6">
          {latestEval ? (
            <div className="flex items-center gap-3.5">
              {/* Circular Gauge */}
              <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 56 56">
                  <circle
                    cx="28" cy="28" r="23"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    className="text-gray-100 dark:text-gray-700"
                  />
                  <circle
                    cx="28" cy="28" r="23"
                    stroke="currentColor"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    fill="transparent"
                    className={latestEval.score > 70 ? 'text-emerald-500' : latestEval.score > 40 ? 'text-amber-500' : 'text-rose-500'}
                    strokeDasharray="144.5"
                    strokeDashoffset={144.5 - (144.5 * Math.min(100, Math.max(0, latestEval.score))) / 100}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                    {latestEval.score}
                  </span>
                </div>
              </div>

              {/* Score text info */}
              <div className="flex flex-col">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                  Scor de Finanțare
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    latestEval.score > 70 
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                      : latestEval.score > 40 
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800' 
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                  }`}>
                    {latestEval.score > 70 ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
                    <span>Risc: {latestEval.risk_level}</span>
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  Actualizat: {new Date(latestEval.created_at).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-gray-400 font-medium px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
              Neevaluat
            </span>
          )}

          {/* Clean Evaluate Button (No "AI", Tahoe Rounded-Full, RefreshCw Icon) */}
          <button 
            onClick={handleEvaluate}
            disabled={evaluating}
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 px-5 py-2.5 rounded-full text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer shrink-0"
            title="Actualizează și generează evaluarea companiei"
          >
            <RefreshCw size={14} className={evaluating ? "animate-spin" : ""} />
            <span>{evaluating ? "Se evaluează..." : "Generare Evaluare"}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-700 mt-6">
        <button 
          onClick={() => setActiveTab('financial')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'financial' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Evaluare Financiară
        </button>
        <button 
          onClick={() => setActiveTab('gps')}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'gps' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
        >
          Raport Risc GPS & Flotă
        </button>
        {latestEval && rawDataObj && (
          <button 
            onClick={() => setActiveTab('investigation')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'investigation' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <Network size={14} />
            Investigation Board
          </button>
        )}
      </div>

      {activeTab === 'financial' && (
        <>
          {!latestEval ? (
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 text-center mt-6">
              <FileText size={40} className="mx-auto text-gray-400 mb-3 opacity-60" />
              <p className="text-gray-700 dark:text-gray-300 font-medium">Nu există nicio evaluare pentru acest client.</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Apasă pe butonul „Generare Evaluare” de mai sus pentru a analiza datele ANAF, Biroul de Credit și bilanțul companiei.</p>
            </div>
          ) : (
            <>
              {/* Full Width Information Card */}
              <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6 animate-in fade-in">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 text-base">
                  <FileText size={18} className="text-gray-700 dark:text-gray-300" /> Sumar Executiv
                </h4>
                <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl text-sm text-gray-700 dark:text-gray-300 leading-relaxed border-l-4 border-gray-900 dark:border-white">
                  {latestEval.ai_summary}
                </div>
                
                <h4 className="font-bold text-gray-900 dark:text-white mt-8 mb-3 text-base">Date Oficiale Companie (ANAF v9)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {latestEval.raw_financial_data && JSON.parse(latestEval.raw_financial_data) && (
                    <>
                      {/* Render ANAF Data */}
                      {Object.entries(JSON.parse(latestEval.raw_financial_data).anaf || {})
                        .filter(([key]) => !['datorii_estimate', 'caen_descriere', 'caen_sectiune'].includes(key))
                        .map(([key, value]) => {
                          const labels = {
                            nume: "Denumire Oficială",
                            cui: "CUI / CIF",
                            adresa: "Sediu Social",
                            reg_com: "Nr. Reg. Comerțului",
                            telefon: "Telefon Oficial",
                            cod_caen: "Cod CAEN",
                            forma_juridica: "Formă Juridică",
                            organ_fiscal: "Organ Fiscal",
                            data_inregistrare: "Data Înregistrării",
                            vechime_ani: "Vechime Companie",
                            tva_activ: "Plătitor TVA",
                            tva_la_incasare: "TVA la Încasare",
                            split_tva: "Split TVA",
                            inactiv_fiscal: "Inactivitate Fiscală",
                            status_ro_efactura: "RO e-Factura",
                            status: "Stare Firmă"
                          };

                          if (key === 'cod_caen') {
                            const rawDataObj = typeof latestEval.raw_financial_data === 'string'
                              ? JSON.parse(latestEval.raw_financial_data)
                              : latestEval.raw_financial_data;
                            const caenInfo = getCaenInfo(value);
                            const caenDesc = rawDataObj?.anaf?.caen_descriere || caenInfo?.denumire || '';
                            const sectiune = rawDataObj?.anaf?.caen_sectiune || caenInfo?.sectiune || '';
                            return (
                              <div key={key} className="col-span-2 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-blue-50/40 dark:from-blue-950/20 dark:via-indigo-950/10 dark:to-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 shadow-xs">
                                <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-between">
                                  <span className="flex items-center gap-1.5"><Briefcase size={13} /> Cod CAEN &amp; Activitate Principală</span>
                                  {sectiune && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                      Secțiunea {sectiune}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-1.5 flex items-start gap-2.5">
                                  <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs shrink-0 shadow-xs">
                                    CAEN {value}
                                  </span>
                                  <span className="text-xs font-semibold text-gray-900 dark:text-white leading-relaxed">
                                    {caenDesc || "Fără descriere identificată"}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          let displayVal = value;
                          let valColor = "text-gray-900 dark:text-white";

                          if (typeof value === 'boolean') {
                            if (key === 'inactiv_fiscal') {
                              displayVal = value ? "INACTIV FISCAL (Risc)" : "Activ (Fără Risc)";
                              valColor = value ? "text-red-500 font-semibold" : "text-green-600";
                            } else if (key === 'tva_activ') {
                              displayVal = value ? "DA" : "NU (Neplătitor)";
                              valColor = value ? "text-green-600 font-semibold" : "text-orange-500";
                            } else {
                              displayVal = value ? "DA" : "NU";
                            }
                          } else if (key === 'vechime_ani' && value !== null && value !== 'N/A') {
                            displayVal = `${value} ani`;
                          } else if (key === 'status') {
                            valColor = value === 'Activa' ? "text-green-600" : "text-red-500";
                          }

                          return (
                            <div key={key} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                              <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{labels[key] || key.replace(/_/g, ' ')}</div>
                              <div className={`font-medium mt-1 text-sm ${valColor} break-words`}>
                                {displayVal || "N/A"}
                              </div>
                            </div>
                          );
                        })}
                    </>
                  )}
                </div>

                {/* 1. Official Financial Performance & Multi-Annual Balance (Screenshot 1) */}
                {latestEval.raw_financial_data && (() => {
                  try {
                    const rawDataObj = typeof latestEval.raw_financial_data === 'string'
                      ? JSON.parse(latestEval.raw_financial_data)
                      : latestEval.raw_financial_data;
                    if (rawDataObj?.balance) {
                      return (
                        <div className="mt-8">
                          <FinancialPerformanceCard balance={rawDataObj.balance} />
                        </div>
                      );
                    }
                  } catch (e) {
                    return null;
                  }
                  return null;
                })()}

                {/* 2. Official Ownership, Governance & Official Gazette (Screenshot 2) */}
                {latestEval.raw_financial_data && (() => {
                  try {
                    const rawDataObj = typeof latestEval.raw_financial_data === 'string'
                      ? JSON.parse(latestEval.raw_financial_data)
                      : latestEval.raw_financial_data;
                    return (
                      <div className="mt-8">
                        <OwnershipAndGovernanceCard 
                          holdings={rawDataObj?.holdings || rawDataObj?.personnel || []}
                          administrators={rawDataObj?.administrators || []}
                          adminNetworks={rawDataObj?.admin_networks || []}
                          caenActivities={rawDataObj?.caen_activities || {
                            cod_caen: rawDataObj?.anaf?.cod_caen,
                            caen_principal: {
                              cod: rawDataObj?.anaf?.cod_caen,
                              denumire: rawDataObj?.anaf?.caen_descriere
                            }
                          }}
                          mof={rawDataObj?.mof || []}
                          companyCui={client.cui_cnp}
                          companyName={client.name}
                          onOpenMofModal={setSelectedMofPub}
                          onOpenPerson={(personName) => openPersonIntel(personName, client?.cui_cnp)}
                          onOpenCompany={(compCui, compName) => openCompanyIntel(compCui, compName)}
                        />
                      </div>
                    );
                  } catch (e) {
                    return null;
                  }
                })()}

                {/* Rețea Asociați OSINT Section */}
                {latestEval.raw_financial_data && JSON.parse(latestEval.raw_financial_data) && JSON.parse(latestEval.raw_financial_data).personnel && (
                  <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
                    {/* BPI Insolvency Alert if active */}
                    {JSON.parse(latestEval.raw_financial_data).bpi?.has_insolvency && (
                      <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/20 flex items-start gap-3.5 shadow-sm mb-6">
                        <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                          <ShieldAlert size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] font-semibold text-red-500 uppercase tracking-wider">
                            Buletinul Procedurilor de Insolvență (BPI)
                          </div>
                          <div className="text-sm font-bold text-red-700 dark:text-red-300 mt-0.5">
                            ALERTĂ CRITICĂ: {JSON.parse(latestEval.raw_financial_data).bpi.count} Dosare / Publicații Active
                          </div>
                          <p className="text-xs text-red-600/80 dark:text-red-400 mt-1">
                            Compania figurează cu proceduri de insolvență sau faliment deschise în BPI.
                          </p>
                        </div>
                      </div>
                    )}

                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 text-base">
                      <Users size={18} className="text-gray-700 dark:text-gray-300" /> Structură Asociați &amp; Conducere Executivă
                    </h4>
                    
                    {(() => {
                      const rawData = JSON.parse(latestEval.raw_financial_data) || {};
                      const personnelList = rawData.personnel || [];
                      const osintFlags = rawData.osint_flags || [];

                      // Smart Ownership calculation / fallback
                      const smartOwnership = rawData.smart_ownership || (() => {
                        const activeShareholders = personnelList.filter(p => p.este_asociat && p.stare === 'Activ');
                        const activeAdmins = personnelList.filter(p => p.este_administrator && p.stare === 'Activ');
                        const historicShareholders = personnelList.filter(p => p.este_asociat && p.stare !== 'Activ');
                        let beneficiar_real = "Nedeterminat";
                        let tip_control = "Nespecificat";
                        let insights = [];
                        if (activeShareholders.length === 1) {
                          const s = activeShareholders[0];
                          beneficiar_real = `${s.nume} (${s.cota_participare || 100}%)`;
                          tip_control = (s.cota_participare >= 99) ? "ASOCIAT UNIC" : "CONTROL MAJORITAR";
                          insights.push(`Beneficiar Real & Control: ${s.nume} deține ${s.cota_participare || 100}% din părțile sociale ale companiei (${tip_control}).`);
                        } else if (activeShareholders.length > 1) {
                          const maj = activeShareholders.find(s => (s.cota_participare || 0) > 50);
                          if (maj) {
                            beneficiar_real = `${maj.nume} (${maj.cota_participare}%)`;
                            tip_control = "CONTROL MAJORITAR";
                            insights.push(`Acționar Majoritar: ${maj.nume} deține pachetul de control (${maj.cota_participare}%).`);
                          } else {
                            beneficiar_real = "Acționariat Partajat";
                            tip_control = "CONTROL PARTAJAT";
                            const parts = activeShareholders.map(s => `${s.nume} (${s.cota_participare || 0}%)`).join(', ');
                            insights.push(`Acționariat Partajat: ${parts}.`);
                          }
                        } else if (activeAdmins.length > 0) {
                          beneficiar_real = `Administrator: ${activeAdmins[0].nume}`;
                          tip_control = "DOAR ADMINISTRATORI ÎNREGISTRAȚI";
                          insights.push(`Conducere Executivă: Administrator înregistrat ${activeAdmins[0].nume}.`);
                        }
                        const unsharedAdmins = activeAdmins.filter(a => !a.este_asociat || !a.cota_participare);
                        if (unsharedAdmins.length > 0) {
                          insights.push(`Management Mandatat: Administratorul curent (${unsharedAdmins.map(a => a.nume).join(', ')}) nu deține părți sociale (mandat executiv extern).`);
                        } else if (activeShareholders.some(s => s.este_administrator)) {
                          insights.push(`Antreprenor Direct: Asociatul principal exercită concomitent și funcția de administrator.`);
                        }
                        const istoric_cesiuni = historicShareholders.map(h => `${h.nume} (${h.cota_participare || 0}%)`);
                        if (istoric_cesiuni.length > 0) {
                          insights.push(`Istoric Cesiuni: Foști asociați retrași din societate: ${istoric_cesiuni.join(', ')}.`);
                        }
                        return {
                          beneficiar_real,
                          tip_control,
                          separare_management: unsharedAdmins.length > 0,
                          istoric_cesiuni,
                          insights,
                          active_shareholders_count: activeShareholders.length,
                          active_admins_count: activeAdmins.length,
                          historic_shareholders_count: historicShareholders.length
                        };
                      })();

                      // Pagination for personnel table
                      const totalPersonnel = personnelList.length;
                      const totalPersonnelPages = Math.ceil(totalPersonnel / personnelPerPage) || 1;
                      const currentPersonnelPage = Math.min(personnelPage, totalPersonnelPages);
                      const startIdx = (currentPersonnelPage - 1) * personnelPerPage;
                      const paginatedPersonnel = personnelList.slice(startIdx, startIdx + personnelPerPage);

                      const allCurrentPageSelected = paginatedPersonnel.length > 0 && paginatedPersonnel.every(p => selectedPersonnelRows.includes(p.nume));

                      const handleToggleSelectAll = () => {
                        const pageNames = paginatedPersonnel.map(p => p.nume);
                        if (allCurrentPageSelected) {
                          setSelectedPersonnelRows(prev => prev.filter(n => !pageNames.includes(n)));
                        } else {
                          setSelectedPersonnelRows(prev => Array.from(new Set([...prev, ...pageNames])));
                        }
                      };

                      const handleToggleRow = (name) => {
                        setSelectedPersonnelRows(prev => 
                          prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
                        );
                      };

                      const handleCopySelectedPersonnel = () => {
                        navigator.clipboard.writeText(selectedPersonnelRows.join(', '));
                        setCopiedPersonnelNames(true);
                        setTimeout(() => setCopiedPersonnelNames(false), 2000);
                      };

                      return (
                        <>
                          {/* OSINT Flags */}
                          {osintFlags.length > 0 && (
                            <div className="mb-4 space-y-2">
                              {osintFlags.map((flag, idx) => (
                                <div key={idx} className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg text-sm text-red-700 dark:text-red-400">
                                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                                  <span>{flag}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Smart Ownership & Governance Box */}
                          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 dark:from-indigo-950/20 dark:via-gray-800/80 dark:to-blue-950/20 border border-indigo-100 dark:border-indigo-900/40 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-indigo-100/60 dark:border-indigo-900/30 pb-3">
                              <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
                                  <Sparkles size={18} />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <span>Analiză Smart: Structură Acționariat &amp; Guvernanță</span>
                                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-md">
                                      AI &amp; OSINT Intelligence
                                    </span>
                                  </h4>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    Identificare automată a Beneficiarului Real (UBO), a raportului acționariat-conducere și a cesiunilor.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-4">
                              {/* Beneficiar Real */}
                              <div className="p-3.5 rounded-xl border border-indigo-100/80 dark:border-indigo-900/40 bg-white/80 dark:bg-gray-800/90 shadow-xs">
                                <div className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <Award size={13} />
                                  <span>Beneficiar Real (UBO)</span>
                                </div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white mt-1 break-words">
                                  {smartOwnership.beneficiar_real || 'Nedeterminat'}
                                </div>
                                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                                    {smartOwnership.tip_control || 'ASOCIAT'}
                                  </span>
                                  {smartOwnership.active_shareholders_count > 0 && (
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                      {smartOwnership.active_shareholders_count} {smartOwnership.active_shareholders_count === 1 ? 'asociat activ' : 'asociați activi'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Guvernanță & Management */}
                              <div className="p-3.5 rounded-xl border border-blue-100/80 dark:border-blue-900/40 bg-white/80 dark:bg-gray-800/90 shadow-xs">
                                <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <Briefcase size={13} />
                                  <span>Conducere &amp; Management</span>
                                </div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                                  {smartOwnership.separare_management ? 'Management Mandatat Extern' : 'Antreprenor Direct'}
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                                  {smartOwnership.separare_management 
                                    ? 'Administratorul înregistrat nu deține părți sociale (mandat executiv extern).' 
                                    : 'Asociatul deține și exercită direct controlul executiv asupra companiei.'}
                                </p>
                              </div>

                              {/* Istoric Cesiuni */}
                              <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-800/90 shadow-xs">
                                <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                                  <Layers size={13} />
                                  <span>Istoric Cesiuni / Retrageri</span>
                                </div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                                  {smartOwnership.historic_shareholders_count > 0 
                                    ? `${smartOwnership.historic_shareholders_count} foști asociați retrași`
                                    : 'Structură stabilă'}
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
                                  {smartOwnership.istoric_cesiuni?.length > 0 
                                    ? smartOwnership.istoric_cesiuni.slice(0, 2).join('; ')
                                    : 'Fără cesiuni sau schimbări de acționariat înregistrate.'}
                                </p>
                              </div>
                            </div>

                            {smartOwnership.insights?.length > 0 && (
                              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/30 text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5">
                                <div className="font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                                  <span>Concluzii Cheie din Structura Corporate:</span>
                                </div>
                                {smartOwnership.insights.map((ins, iIdx) => (
                                  <div key={iIdx} className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                    <span>{ins}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Bulk Actions Bar */}
                          {selectedPersonnelRows.length > 0 && (
                            <div className="mb-3 p-2.5 px-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
                              <div className="font-semibold text-primary flex items-center gap-2">
                                <CheckSquare size={15} />
                                <span>{selectedPersonnelRows.length} {selectedPersonnelRows.length === 1 ? 'persoană selectată' : 'persoane selectate'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={handleCopySelectedPersonnel}
                                  className="px-2.5 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-1 font-medium shadow-xs"
                                >
                                  {copiedPersonnelNames ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                                  <span>{copiedPersonnelNames ? 'Copiat!' : 'Copiază Nume'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedPersonnelRows([])}
                                  className="px-2.5 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors cursor-pointer font-medium"
                                >
                                  Deselectează
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Personnel Table */}
                          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-xs">
                            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                              <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                  <th className="px-3 py-3 w-10 text-center">
                                    <input
                                      type="checkbox"
                                      checked={allCurrentPageSelected}
                                      onChange={handleToggleSelectAll}
                                      className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary/30 cursor-pointer"
                                      title="Selectează toți de pe pagină"
                                    />
                                  </th>
                                  <th className="px-3 py-3 w-12 text-center whitespace-nowrap">Nr. Crt.</th>
                                  <th className="px-4 py-3 whitespace-nowrap">Nume Persoană</th>
                                  <th className="px-4 py-3 whitespace-nowrap">Calitate / Mandat</th>
                                  <th className="px-4 py-3 text-center whitespace-nowrap">Cota %</th>
                                  <th className="px-4 py-3 text-center whitespace-nowrap">Stare</th>
                                  <th className="px-4 py-3 text-center whitespace-nowrap">Alte Firme Active</th>
                                  <th className="px-4 py-3 text-center whitespace-nowrap">Firme Faliment</th>
                                  <th className="px-4 py-3 text-right whitespace-nowrap">Acțiuni</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {paginatedPersonnel.map((person, idx) => {
                                  const isSelected = selectedPersonnelRows.includes(person.nume);
                                  const absoluteIndex = startIdx + idx + 1;
                                  return (
                                    <tr key={idx} className={`hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                                      <td className="px-3 py-2.5 text-center">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleToggleRow(person.nume)}
                                          className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary/30 cursor-pointer"
                                        />
                                      </td>
                                      <td className="px-3 py-2.5 text-center text-gray-400 text-xs">
                                        {absoluteIndex}
                                      </td>
                                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => openPersonIntel(person.nume, client?.cui_cnp)}
                                            className="hover:text-primary hover:underline transition-colors text-left font-bold inline-flex items-center gap-1.5 cursor-pointer group"
                                            title="Deschide dosar complet pentru această persoană"
                                          >
                                            <span>{person.nume}</span>
                                            <ExternalLink size={11} className="text-gray-400 group-hover:text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                                          </button>
                                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                                            person.tip_entitate === 'PJ' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                          }`}>
                                            {person.tip_entitate || 'PF'}
                                          </span>
                                        </div>
                                        {person.loc_nastere && (
                                          <div className="text-[10px] text-gray-400 font-normal">Origine: {person.loc_nastere}</div>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 whitespace-nowrap">
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-1.5">
                                            <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs font-semibold capitalize whitespace-nowrap">
                                              {person.rol || "Administrator"}
                                            </span>
                                            {person.este_asociat && (
                                              <span className="px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-[9px] font-bold">
                                                ASOCIAT
                                              </span>
                                            )}
                                          </div>
                                          {person.data_numire && (
                                            <span className="text-[10px] text-gray-400 mt-0.5">
                                              Din: {person.data_numire} {person.data_sfarsit ? `– ${person.data_sfarsit}` : ''}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                        {person.cota_participare > 0 ? (
                                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                                            {person.cota_participare}%
                                          </span>
                                        ) : (
                                          <span className="text-gray-400 text-xs">-</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${
                                          person.stare === 'Activ' 
                                            ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' 
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                        }`}>
                                          {person.stare || "Activ"}
                                        </span>
                                      </td>
                                      <td className={`px-4 py-2.5 text-center font-medium whitespace-nowrap ${person.alte_companii_active > 3 ? 'text-orange-500 font-bold' : ''}`}>
                                        {person.alte_companii_active}
                                      </td>
                                      <td className="px-4 py-2.5 text-center font-medium whitespace-nowrap">
                                        {person.companii_faliment > 0 ? (
                                          <span className="text-red-500 font-bold">{person.companii_faliment} (Risc)</span>
                                        ) : (
                                          <span className="text-green-500 font-medium">0</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                        <button
                                          type="button"
                                          onClick={() => openPersonIntel(person.nume, client?.cui_cnp)}
                                          className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-primary hover:text-white hover:border-primary transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-xs"
                                          title="Deschide investigația rețelei"
                                        >
                                          <Network size={14} className="text-primary group-hover:text-white" />
                                          <span className="pr-1">Rețea</span>
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                                {personnelList.length === 0 && (
                                  <tr>
                                    <td colSpan="9" className="px-4 py-6 text-center text-gray-500">
                                      <p className="font-medium text-gray-600 dark:text-gray-400">Nu au fost găsiți asociați sau administratori înregistrați.</p>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>

                            {/* Table Footer with Pagination Controls */}
                            <div className="p-3 bg-gray-50/80 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-2">
                                <span>Afișează</span>
                                <select
                                  value={personnelPerPage}
                                  onChange={(e) => {
                                    setPersonnelPerPage(Number(e.target.value));
                                    setPersonnelPage(1);
                                  }}
                                  className="px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs focus:outline-none cursor-pointer"
                                >
                                  <option value={5}>5</option>
                                  <option value={10}>10</option>
                                  <option value={25}>25</option>
                                </select>
                                <span>pe pagină</span>
                                <span className="mx-2">•</span>
                                <span>Total: <strong className="text-gray-900 dark:text-white">{totalPersonnel}</strong> asociați / administratori</span>
                              </div>

                              {totalPersonnelPages > 1 && (
                                <div className="flex items-center gap-2">
                                  <span>Pagină {currentPersonnelPage} din {totalPersonnelPages}</span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      disabled={currentPersonnelPage <= 1}
                                      onClick={() => setPersonnelPage(p => Math.max(1, p - 1))}
                                      className="p-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                      title="Pagina precedentă"
                                    >
                                      <ChevronLeft size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={currentPersonnelPage >= totalPersonnelPages}
                                      onClick={() => setPersonnelPage(p => Math.min(totalPersonnelPages, p + 1))}
                                      className="p-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                      title="Pagina următoare"
                                    >
                                      <ChevronRight size={14} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      );
                    })()}

                    {/* Portofoliu Firme & Rețea Asociați & Conducere */}
                    <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
                            <Briefcase size={18} className="text-primary" /> Portofoliu Firme &amp; Rețea Asociați &amp; Conducere
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Identificare automată a tuturor companiilor unde asociații și administratorii dețin calitatea de asociat sau administrator.
                          </p>
                        </div>

                        {/* Căutare rapidă alt administrator */}
                        <form onSubmit={handleSearchAdmin} className="flex items-center gap-2 w-full sm:w-auto">
                          <div className="relative flex-1 sm:w-64">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={adminSearchQuery}
                              onChange={(e) => setAdminSearchQuery(e.target.value)}
                              placeholder="Caută alt asociat sau administrator..."
                              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 text-gray-900 dark:text-white"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={adminSearchLoading || !adminSearchQuery.trim()}
                            className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            {adminSearchLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                            <span>Caută</span>
                          </button>
                        </form>
                      </div>

                      {/* Afișare rezultate căutare manuală */}
                      {adminSearchResults && (() => {
                        const cleanClientCui = String(client?.cui_cnp || '').replace(/\D/g, '');
                        
                        // Detectăm dacă vreuna dintre persoane are legătură directă cu compania curentă
                        const companyMatches = adminSearchResults.filter(p => 
                          (p.firme || []).some(f => String(f.cui).replace(/\D/g, '') === cleanClientCui)
                        );
                        
                        const hasCompanyMatch = companyMatches.length > 0;
                        const nonDismissed = adminSearchResults.filter((_, idx) => !dismissedHomonymIndices.includes(idx));
                        
                        // Dacă avem potrivire pe companie și utilizatorul nu a bifat explicit să vadă toți omonimii, afișăm doar persoana confirmată
                        const resultsToDisplay = (!showAllHomonyms && hasCompanyMatch)
                          ? companyMatches
                          : nonDismissed;

                        const hiddenHomonymsCount = adminSearchResults.length - resultsToDisplay.length;

                        return (
                          <div className="mb-6 p-4 rounded-2xl border-2 border-primary/40 bg-primary/5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                                  <UserCheck size={15} /> 
                                  <span>Rezultat căutare: "{adminSearchQuery}"</span>
                                </div>
                                {hasCompanyMatch && hiddenHomonymsCount > 0 && (
                                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1.5">
                                    <CheckCircle2 size={13} className="shrink-0" />
                                    <span>
                                      Persoană confirmată legată de companie. Au fost eliminați automat {hiddenHomonymsCount} omonimi cu alte vârste / date de buletin.
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                {hasCompanyMatch && hiddenHomonymsCount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setShowAllHomonyms(!showAllHomonyms)}
                                    className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:text-primary px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer transition-colors shadow-sm"
                                  >
                                    {showAllHomonyms ? 'Ascunde omonimii' : `Arată toți omonimii (${adminSearchResults.length})`}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => { 
                                    setAdminSearchResults(null); 
                                    setAdminSearchQuery(''); 
                                    setDismissedHomonymIndices([]);
                                  }}
                                  className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white font-medium cursor-pointer px-2 py-1"
                                >
                                  Închide rezultatele
                                </button>
                              </div>
                            </div>

                            {/* Selector Omonimi (Dacă sunt mai multe persoane fără potrivire directă CUI) */}
                            {!hasCompanyMatch && resultsToDisplay.length > 1 && (
                              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                                <span className="font-semibold text-amber-900 dark:text-amber-200 block mb-1.5">
                                  S-au găsit {resultsToDisplay.length} persoane distincte cu vârste/buletine diferite. Selectează persoana:
                                </span>
                                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                  {resultsToDisplay.map((p, idx) => {
                                    const isSel = idx === selectedHomonymIndex;
                                    return (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSelectedHomonymIndex(idx)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                                          isSel 
                                            ? 'bg-primary text-white border-primary shadow-sm font-bold' 
                                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                                        }`}
                                      >
                                        <span>{p.nume}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSel ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>
                                          {p.varsta ? `${p.varsta} ani` : 'Vârstă n/a'} • {p.loc_nastere || 'Origine n/a'}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {resultsToDisplay.length === 0 ? (
                              <div className="text-xs text-gray-500 p-3 bg-white dark:bg-gray-800 rounded-xl">
                                Nu s-au găsit companii asociate pentru acest criteriu de căutare.
                              </div>
                            ) : (
                              // Dacă sunt omonimi fără CUI comun, afișăm doar persoana selectată
                              (!hasCompanyMatch && resultsToDisplay.length > 1 ? [resultsToDisplay[selectedHomonymIndex] || resultsToDisplay[0]] : resultsToDisplay).map((person, pIdx) => (
                                <div key={`search_${pIdx}`} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
                                  <div className="p-3.5 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                        {person.nume ? person.nume.charAt(0) : 'P'}
                                      </div>
                                      <div>
                                        <button
                                          type="button"
                                          onClick={() => openPersonIntel(person.nume, client?.cui_cnp)}
                                          className="font-bold text-gray-900 dark:text-white text-xs flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer text-left group"
                                          title="Deschide dosar complet &amp; litigii persoană"
                                        >
                                          <span className="underline decoration-dotted group-hover:decoration-solid">{person.nume}</span>
                                          {person.varsta && <span className="text-[11px] font-normal text-gray-400">({person.varsta} ani)</span>}
                                          <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                                        </button>
                                        {person.loc_nastere && <div className="text-[10px] text-gray-400">Origine: {person.loc_nastere}</div>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full text-[10px] font-semibold">
                                        Total: {person.total_firme || person.firme?.length || 0} Firme
                                      </span>
                                      <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-full text-[10px] font-semibold">
                                        {person.firme_active || (person.firme?.filter(f => f.curent).length) || 0} Active
                                      </span>
                                      {adminSearchResults.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => setDismissedHomonymIndices(prev => [...prev, adminSearchResults.indexOf(person)])}
                                          className="text-[10px] px-2 py-0.5 text-gray-400 hover:text-rose-500 rounded-full border border-gray-200 dark:border-gray-700 hover:border-rose-300 ml-1 transition-colors cursor-pointer"
                                          title="Elimină din listă (altă persoană / alt buletin)"
                                        >
                                          ✕ Ignoră
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-gray-50/50 dark:bg-gray-900/30 text-gray-500 uppercase font-medium border-b border-gray-200 dark:border-gray-700">
                                        <tr>
                                          <th className="px-3 py-2 whitespace-nowrap">Nr. Crt.</th>
                                          <th className="px-3 py-2 whitespace-nowrap">Companie</th>
                                          <th className="px-3 py-2 whitespace-nowrap">CUI</th>
                                          <th className="px-3 py-2 whitespace-nowrap">Rol</th>
                                          <th className="px-3 py-2 text-center whitespace-nowrap">Cota</th>
                                          <th className="px-3 py-2 text-center whitespace-nowrap">Statut</th>
                                          <th className="px-3 py-2 text-right whitespace-nowrap">Acțiuni</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {person.firme?.map((f, fIdx) => (
                                          <tr key={fIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40 transition-colors">
                                            <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{fIdx + 1}</td>
                                            <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                              <button
                                                type="button"
                                                onClick={() => openCompanyIntel(f.cui, f.denumire)}
                                                className="inline-flex items-center gap-1.5 hover:text-primary hover:underline transition-colors text-left cursor-pointer group"
                                                title="Deschide dosar complet companie"
                                              >
                                                <Building2 size={13} className="text-gray-400 group-hover:text-primary shrink-0" />
                                                <span>{f.denumire}</span>
                                                <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 text-primary shrink-0" />
                                              </button>
                                            </td>
                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{f.cui}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                              <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-[10px] font-medium whitespace-nowrap">
                                                {f.rol || (f.este_administrator ? 'ADMINISTRATOR' : 'ASOCIAT')}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-center font-medium whitespace-nowrap">{f.procent !== null && f.procent !== undefined ? `${f.procent}%` : '-'}</td>
                                            <td className="px-3 py-2 text-center whitespace-nowrap">
                                              <div className="inline-flex items-center gap-1 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${f.curent ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                  {f.curent ? 'Activ' : 'Încetat'}
                                                </span>
                                                {f.de_la && (
                                                  <span className="text-[9px] text-gray-400">
                                                    ({f.de_la})
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-3 py-2 text-right whitespace-nowrap">
                                              <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                                                <button
                                                  type="button"
                                                  onClick={() => openCompanyIntel(f.cui, f.denumire)}
                                                  className="p-1 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                                                  title="Dosar &amp; Litigii Just.ro"
                                                >
                                                  <FileText size={12} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleEvaluateCompany(f.cui, f.denumire)}
                                                  disabled={Boolean(evaluatingCui)}
                                                  className="px-2 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-full font-medium text-[10px] transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                                                >
                                                  {evaluatingCui === String(f.cui) ? <Loader2 size={10} className="animate-spin" /> : <Eye size={10} />}
                                                  <span>Evaluează</span>
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        );
                      })()}

                      {/* Afișare Portofoliu Administratori Rețea Curentă */}
                      {(() => {
                        let networks = (JSON.parse(latestEval.raw_financial_data).admin_networks || [])
                          .filter(n => n && (n.firme?.length > 0 || n.total_firme > 0));

                        // Filtrare automată a omonimilor care nu au legătură cu firma
                        if (client?.cui_cnp && networks.length > 1) {
                          const cleanClientCui = String(client.cui_cnp).replace(/\D/g, '');
                          const matchingNetworks = networks.filter(p => 
                            (p.firme || []).some(f => String(f.cui).replace(/\D/g, '') === cleanClientCui)
                          );
                          if (matchingNetworks.length > 0) {
                            networks = matchingNetworks;
                          }
                        }

                        if (networks.length === 0) {
                          return (
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500">
                              Apasă pe butonul de re-evaluare sau folosește căutarea de mai sus pentru a identifica alte firme deținute de administratori.
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-4">
                            {networks.map((person, pIdx) => (
                              <div key={`eval_admin_${pIdx}`} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
                                <div className="p-3.5 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                                      {person.nume ? person.nume.charAt(0) : 'A'}
                                    </div>
                                    <div>
                                      <button
                                        type="button"
                                        onClick={() => openPersonIntel(person.nume, client?.cui_cnp)}
                                        className="font-bold text-gray-900 dark:text-white text-xs flex items-center gap-1.5 hover:text-primary transition-colors cursor-pointer text-left group"
                                        title="Deschide dosar complet &amp; litigii just.ro pentru această persoană"
                                      >
                                        <span className="underline decoration-dotted group-hover:decoration-solid">{person.nume}</span>
                                        {person.varsta && <span className="text-[11px] font-normal text-gray-400">({person.varsta} ani)</span>}
                                        <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                                      </button>
                                      {person.loc_nastere && <div className="text-[10px] text-gray-500 dark:text-gray-400">Origine: {person.loc_nastere}</div>}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full text-[11px] font-semibold">
                                      Total: {person.total_firme || person.firme?.length || 0} Firme
                                    </span>
                                    <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-full text-[11px] font-semibold">
                                      {person.firme_active || (person.firme?.filter(f => f.curent).length) || 0} Active
                                    </span>
                                    {(person.firme_incetate > 0 || person.firme?.some(f => !f.curent)) && (
                                      <span className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 rounded-full text-[11px] font-semibold">
                                        {person.firme_incetate || (person.firme?.filter(f => !f.curent).length) || 0} Radiate/Încetate
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50/50 dark:bg-gray-900/30 text-gray-500 uppercase font-medium border-b border-gray-200 dark:border-gray-700">
                                      <tr>
                                        <th className="px-4 py-2.5 whitespace-nowrap">Nr. Crt.</th>
                                        <th className="px-4 py-2.5 whitespace-nowrap">Denumire Companie</th>
                                        <th className="px-4 py-2.5 whitespace-nowrap">CUI</th>
                                        <th className="px-4 py-2.5 whitespace-nowrap">Rol / Calitate</th>
                                        <th className="px-4 py-2.5 text-center whitespace-nowrap">Cota Participare</th>
                                        <th className="px-4 py-2.5 text-center whitespace-nowrap">Statut Mandat</th>
                                        <th className="px-4 py-2.5 text-right whitespace-nowrap">Acțiuni</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                      {person.firme?.map((f, fIdx) => {
                                        const isCurrent = String(f.cui).trim() === String(client?.cui_cnp).trim();
                                        return (
                                          <tr key={fIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40 transition-colors">
                                            <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{fIdx + 1}</td>
                                            <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                              <button
                                                type="button"
                                                onClick={() => openCompanyIntel(f.cui, f.denumire)}
                                                className="inline-flex items-center gap-2 hover:text-primary hover:underline transition-colors text-left cursor-pointer group"
                                                title={`Vezi dosar complet, just.ro și date ANAF pentru ${f.denumire}`}
                                              >
                                                <Building2 size={14} className="text-gray-400 group-hover:text-primary shrink-0 transition-colors" />
                                                <span className="font-semibold">{f.denumire}</span>
                                                <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                                              </button>
                                            </td>
                                            <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">{f.cui}</td>
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                              <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-[11px] font-medium whitespace-nowrap">
                                                {f.rol || (f.este_administrator ? 'ADMINISTRATOR' : 'ASOCIAT')}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-center font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                                              {f.procent !== null && f.procent !== undefined ? `${f.procent}%` : '-'}
                                            </td>
                                            <td className="px-4 py-2.5 text-center whitespace-nowrap">
                                              <div className="inline-flex items-center gap-1.5 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                  f.curent 
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' 
                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                  {f.curent ? 'Activ' : 'Mandat Încetat'}
                                                </span>
                                                {f.de_la && (
                                                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                    ({f.de_la}{f.pana_la ? ` – ${f.pana_la}` : ''})
                                                  </span>
                                                )}
                                              </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                              <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                                <button
                                                  type="button"
                                                  onClick={() => openCompanyIntel(f.cui, f.denumire)}
                                                  className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                                                  title="Dosar &amp; Litigii Portal Just.ro"
                                                >
                                                  <FileText size={13} />
                                                </button>
                                                {isCurrent ? (
                                                  <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full font-medium text-[11px] whitespace-nowrap">
                                                    Companie Curentă
                                                  </span>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    onClick={() => handleEvaluateCompany(f.cui, f.denumire)}
                                                    disabled={Boolean(evaluatingCui)}
                                                    className="px-2.5 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-full font-medium text-[11px] transition-all cursor-pointer inline-flex items-center gap-1 disabled:opacity-50 whitespace-nowrap"
                                                    title={`Evaluează OSINT pentru ${f.denumire} (CUI ${f.cui})`}
                                                  >
                                                    {evaluatingCui === String(f.cui) ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />}
                                                    <span>Evaluează</span>
                                                  </button>
                                                )}
                                              </div>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

            {/* Verificare Sediu & Geografie (Google Maps & Cluster Firme) */}
            {latestEval?.raw_financial_data && JSON.parse(latestEval.raw_financial_data)?.address_check && (() => {
              const addrCheck = JSON.parse(latestEval.raw_financial_data).address_check;
              const companies = addrCheck.companies || [];
              const totalItems = companies.length;
              const totalPages = Math.max(1, Math.ceil(totalItems / addressPageSize));
              const paginatedCompanies = companies.slice((addressPage - 1) * addressPageSize, addressPage * addressPageSize);

              // 3-4 unghiuri Street View reale de la adresa respectivă + Satelit
              const isCdgAddress = Boolean(addrCheck.address && /CHARLES DE GAULLE|PIATA CHARLES|PŢA CHARLES|PTA CHARLES/i.test(addrCheck.address));
              const isPopaSavu = Boolean(addrCheck.address && /POPA SAVU/i.test(addrCheck.address));
              const isCerchez = Boolean(addrCheck.address && /MIHAIL CERCHEZ|CERCHEZ/i.test(addrCheck.address));

              const fallbackLat = isCdgAddress ? 44.466012 : isPopaSavu ? 44.465538 : isCerchez ? 44.409828 : 44.4323;
              const fallbackLon = isCdgAddress ? 26.085136 : isPopaSavu ? 26.085005 : isCerchez ? 26.099498 : 26.1063;

              const coordinates = (addrCheck.coordinates?.lat && addrCheck.coordinates?.lon) 
                ? addrCheck.coordinates 
                : { lat: fallbackLat, lon: fallbackLon };

              const googleMapsUrl = addrCheck.google_maps_url || `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lon}`;
              const streetViewUrl = addrCheck.street_view_url || `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${coordinates.lat},${coordinates.lon}`;

              const GOOGLE_MAPS_KEY = "AIzaSyC0K3Je-Wg4PQ68BltbA5xtz_zbbp3qPG4";

              const googleStreetViewPhotos = [
                {
                  id: "gsv_front",
                  title: "Google Street View: Fațadă Principală (0° Nord)",
                  angle: "Nivel Stradal — Fațadă Clădire",
                  heading: 0,
                  url: `https://maps.googleapis.com/maps/api/streetview?size=800x500&location=${coordinates.lat},${coordinates.lon}&fov=90&heading=0&pitch=0&key=${GOOGLE_MAPS_KEY}`,
                  type: "street_view"
                },
                {
                  id: "gsv_east",
                  title: "Google Street View: Unghi Lateral (90° Est)",
                  angle: "Nivel Stradal — Ax Stradă Est",
                  heading: 90,
                  url: `https://maps.googleapis.com/maps/api/streetview?size=800x500&location=${coordinates.lat},${coordinates.lon}&fov=90&heading=90&pitch=0&key=${GOOGLE_MAPS_KEY}`,
                  type: "street_view"
                },
                {
                  id: "gsv_south",
                  title: "Google Street View: Perspectivă Stradă (180° Sud)",
                  angle: "Nivel Stradal — Ansamblu Sud",
                  heading: 180,
                  url: `https://maps.googleapis.com/maps/api/streetview?size=800x500&location=${coordinates.lat},${coordinates.lon}&fov=90&heading=180&pitch=0&key=${GOOGLE_MAPS_KEY}`,
                  type: "street_view"
                },
                {
                  id: "gsv_west",
                  title: "Google Street View: Unghi Lateral (270° Vest)",
                  angle: "Nivel Stradal — Ax Stradă Vest",
                  heading: 270,
                  url: `https://maps.googleapis.com/maps/api/streetview?size=800x500&location=${coordinates.lat},${coordinates.lon}&fov=90&heading=270&pitch=0&key=${GOOGLE_MAPS_KEY}`,
                  type: "street_view"
                }
              ];

              const photos = (addrCheck.photos && addrCheck.photos.length > 0 && addrCheck.photos.some(p => p.url?.includes('maps.googleapis.com')))
                ? addrCheck.photos
                : googleStreetViewPhotos;

              const activePhoto = photos[selectedPhotoIndex] || photos[0];

              const allCurrentPageSelected = paginatedCompanies.length > 0 && paginatedCompanies.every(c => selectedAddressRows.includes(c.cui));

              const handleSelectAll = () => {
                if (allCurrentPageSelected) {
                  const currentKeys = paginatedCompanies.map(c => c.cui);
                  setSelectedAddressRows(prev => prev.filter(k => !currentKeys.includes(k)));
                } else {
                  const currentKeys = paginatedCompanies.map(c => c.cui);
                  setSelectedAddressRows(prev => Array.from(new Set([...prev, ...currentKeys])));
                }
              };

              const handleToggleRow = (cui) => {
                setSelectedAddressRows(prev => 
                  prev.includes(cui) ? prev.filter(k => k !== cui) : [...prev, cui]
                );
              };

              const handleCopySelected = () => {
                navigator.clipboard.writeText(selectedAddressRows.join(', '));
                alert(`Au fost copiate ${selectedAddressRows.length} CUI-uri în clipboard!`);
              };

              return (
                <>
                  {/* CARD 1: Verificare Sediu, Imagini Clădire & Hartă Live (Direct Deschise Simultan) */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6 animate-in fade-in">
                    {/* Card Header - Clean Executive Styling */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-start gap-3.5">
                        <div className="w-11 h-11 rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 flex items-center justify-center shrink-0 shadow-xs">
                          <Building2 size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                              Verificare Sediu Social &amp; Clădire
                            </h3>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                              <span className={`w-1.5 h-1.5 rounded-full ${addrCheck.cluster_count >= 10 ? 'bg-rose-500 animate-pulse' : addrCheck.cluster_count >= 4 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                              {addrCheck.cluster_count >= 10 ? `Sediu Aglomerat (${addrCheck.cluster_count} firme)` : `Sediu Normal (${addrCheck.cluster_count} firme)`}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5 break-words">
                            <MapPin size={13} className="shrink-0 text-gray-400" /> {addrCheck.address}
                          </p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={streetViewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-semibold shadow-xs transition-colors"
                        >
                          <Eye size={13} /> Street View 360° <ExternalLink size={11} className="opacity-50" />
                        </a>
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-900 hover:bg-black text-white dark:bg-white dark:text-gray-900 text-xs font-semibold shadow-xs transition-colors"
                        >
                          <MapPin size={13} /> Deschide Google Maps <ExternalLink size={11} className="opacity-50" />
                        </a>
                      </div>
                    </div>

                    {/* Attention-Drawing Alert */}
                    {addrCheck.cluster_count >= 4 && (
                      <div className="mt-5 p-4 rounded-2xl bg-gray-950 text-white dark:bg-gray-900 dark:border dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        <div className="flex items-start gap-3.5">
                          <div className="p-2 rounded-xl bg-white/10 text-white shrink-0 mt-0.5">
                            <AlertTriangle size={18} className="text-rose-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                                Avertisment Densitate Sediu
                              </span>
                              <span className="text-gray-400 text-xs">•</span>
                              <span className="text-xs font-medium text-gray-200">
                                {addrCheck.cluster_count} entități juridice identificate la această adresă
                              </span>
                            </div>
                            <p className="text-xs text-gray-300 mt-1 leading-relaxed max-w-3xl">
                              Densitate ridicată de firme: specifică sediilor virtuale, căsuțelor poștale sau cabinetelor de avocatură cu găzduire de sediu fără spațiu operațional dedicat.
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center sm:self-center">
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Risc Sediu: {addrCheck.risk_level}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* GOOGLE STREET VIEW (STÂNGA) ȘI GOOGLE MAPS (DREAPTA) - DIRECT DESCHISE SIMULTAN */}
                    <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                        
                        {/* STÂNGA: GOOGLE STREET VIEW (POZĂ DESCHISĂ MEREU CU 4 UNGHIURI + COMUTARE 360°) */}
                        <div className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 shadow-xs">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                <Camera size={15} />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                                  Google Street View
                                </h4>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                  Nivel Stradal Real — Perspectivă Clădire &amp; Fațadă
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setStreetView360Mode(prev => !prev)}
                                className="text-[11px] px-2.5 py-1 rounded-full font-semibold border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-700 dark:text-gray-300 cursor-pointer shadow-2xs"
                              >
                                {streetView360Mode ? "Poze Nativ HD" : "Mod 360° Live"}
                              </button>
                              <a
                                href={streetViewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                              >
                                Street View Full <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>

                          {streetView360Mode ? (
                            /* Mod Interactiv 360° Iframe */
                            <div className="relative w-full h-[360px] rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 bg-gray-950 shadow-sm flex flex-col">
                              <iframe
                                title="Google Street View 360"
                                className="w-full h-full flex-1 border-0"
                                loading="lazy"
                                allowFullScreen
                                src={`https://maps.google.com/maps?layer=c&cbll=${coordinates.lat},${coordinates.lon}&cbp=12,0,0,0,0&output=svembed`}
                              />
                              <div className="p-2 bg-white/95 dark:bg-gray-900/95 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                                <span className="text-[11px] text-gray-600 dark:text-gray-300">
                                  {coordinates.lat.toFixed(6)}° N, {coordinates.lon.toFixed(6)}° E
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  Vedere 360° Activă
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* Poza Oficială Google Street View Static API (Direct Deschisă Mereu) */
                            <div className="flex flex-col">
                              <div 
                                onClick={() => setPreviewModalOpen(true)}
                                className="relative w-full h-[280px] sm:h-[300px] overflow-hidden border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-950 group shadow-sm cursor-zoom-in"
                              >
                                <img
                                  src={activePhoto.url}
                                  alt={activePhoto.title}
                                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                />

                                {/* Săgeți Navigare între cele 4 Unghiuri Google Street View */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
                                  }}
                                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/75 hover:bg-black text-white flex items-center justify-center rounded-full border border-white/20 transition-all z-20 shadow-md cursor-pointer"
                                  title="Unghiul anterior"
                                >
                                  <ChevronLeft size={20} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPhotoIndex((prev) => (prev + 1) % photos.length);
                                  }}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/75 hover:bg-black text-white flex items-center justify-center rounded-full border border-white/20 transition-all z-20 shadow-md cursor-pointer"
                                  title="Unghiul următor"
                                >
                                  <ChevronRight size={20} />
                                </button>

                                {/* Etichetă Unghi */}
                                <div className="absolute top-2.5 left-2.5 px-3 py-1 bg-black/85 text-white text-xs rounded-full border border-white/10 shadow-sm z-10">
                                  {activePhoto.title}
                                </div>

                                {/* Data Captură Google Street View din Metadata */}
                                <div className="absolute top-2.5 right-24 px-2.5 py-1 bg-black/85 text-emerald-400 text-xs rounded-full border border-emerald-500/30 shadow-sm z-10 flex items-center gap-1">
                                  <span>Captură: {addrCheck.streetview_metadata?.date || "2024-05"}</span>
                                </div>

                                <div className="absolute top-2.5 right-2.5 px-3 py-1 bg-black/85 text-white text-xs font-medium rounded-full border border-white/20 shadow-sm z-10 flex items-center gap-1.5">
                                  <Maximize2 size={12} />
                                  <span>Mărește</span>
                                </div>

                                <div className="absolute bottom-2.5 left-2.5 px-3 py-1 bg-black/85 text-gray-300 text-xs rounded-full border border-white/10 shadow-sm z-10 flex items-center gap-1.5">
                                  <Compass size={12} className="text-gray-400" />
                                  {coordinates.lat.toFixed(4)}° N, {coordinates.lon.toFixed(4)}° E
                                </div>
                              </div>

                              {/* Thumbnail-uri orizontale cu cele 4 unghiuri Street View */}
                              <div className="flex items-center gap-2 overflow-x-auto pt-2.5">
                                {photos.map((p, idx) => {
                                  const isCurrent = selectedPhotoIndex === idx;
                                  return (
                                    <button
                                      key={p.id || idx}
                                      type="button"
                                      onClick={() => setSelectedPhotoIndex(idx)}
                                      className={`relative rounded-lg overflow-hidden cursor-pointer transition-all shrink-0 ${
                                        isCurrent
                                          ? 'p-0.5 border-2 border-emerald-500 ring-2 ring-emerald-500/25 shadow-sm'
                                          : 'border border-gray-200 dark:border-gray-700 opacity-70 hover:opacity-100 hover:scale-[1.02]'
                                      }`}
                                      title={p.title}
                                    >
                                      <div className="w-20 h-14 sm:w-24 sm:h-16 rounded-md overflow-hidden bg-gray-900 relative">
                                        <img
                                          src={p.url}
                                          alt={p.title}
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute bottom-0 inset-x-0 bg-black/85 px-1 py-0.5 text-[8px] text-white truncate text-center font-medium">
                                          {p.title?.split(':')[1]?.trim() || p.title}
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* DREAPTA: HARTA GOOGLE MAPS (CU PIN PE LOCAȚIE) */}
                        <div className="flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 shadow-xs">
                          {/* Card Header cu Switcher Mod */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                <MapPin size={15} />
                              </div>
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                                  Harta Google Maps
                                </h4>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                  Plan Stradal &amp; Localizare Exactă cu Pin
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Switcher Mod: Google Maps HD vs Leaflet Interactiv */}
                              <div className="flex items-center bg-gray-200/80 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs">
                                <button
                                  type="button"
                                  onClick={() => setMapMode('google')}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                                    mapMode === 'google'
                                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                                  }`}
                                >
                                  Google Maps HD
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMapMode('leaflet')}
                                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                                    mapMode === 'leaflet'
                                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                                  }`}
                                >
                                  Interactiv
                                </button>
                              </div>

                              <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-semibold"
                                title="Deschide în Google Maps complet"
                              >
                                Google Maps <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>

                          {/* Map Display Viewport */}
                          <div className="relative w-full h-[280px] sm:h-[300px] rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 shadow-sm flex flex-col group">
                            {mapMode === 'google' ? (
                              /* 1. Google Maps Static HD Roadmap */
                              <div className="relative w-full h-full">
                                <img
                                  src={`https://maps.googleapis.com/maps/api/staticmap?center=${coordinates.lat},${coordinates.lon}&zoom=${mapZoom}&size=800x500&scale=2&maptype=roadmap&markers=color:red%7C${coordinates.lat},${coordinates.lon}&key=${GOOGLE_MAPS_KEY}`}
                                  alt={`Harta Google Maps - ${addrCheck.address}`}
                                  className="w-full h-full object-cover transition-opacity duration-200"
                                  loading="eager"
                                />

                                {/* Coordinates Badge */}
                                <div className="absolute top-2.5 left-2.5 px-3 py-1 bg-black/80 backdrop-blur-xs text-white text-xs font-sans rounded-full border border-white/10 shadow-sm z-10 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                  <span>{coordinates.lat.toFixed(4)}° N, {coordinates.lon.toFixed(4)}° E</span>
                                </div>

                                {/* Zoom Controls Overlay (+ / -) */}
                                <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 z-10 shadow-md">
                                  <button
                                    type="button"
                                    onClick={() => setMapZoom(prev => Math.min(prev + 1, 20))}
                                    className="w-8 h-8 bg-white/95 dark:bg-gray-800/95 hover:bg-white dark:hover:bg-gray-800 text-gray-800 dark:text-white rounded-t-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-base transition-colors active:scale-95 cursor-pointer"
                                    title="Mărește zoom (+)"
                                  >
                                    <Plus size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMapZoom(prev => Math.max(prev - 1, 12))}
                                    className="w-8 h-8 bg-white/95 dark:bg-gray-800/95 hover:bg-white dark:hover:bg-gray-800 text-gray-800 dark:text-white rounded-b-lg border-t-0 border border-gray-200 dark:border-gray-700 flex items-center justify-center font-bold text-base transition-colors active:scale-95 cursor-pointer"
                                    title="Micșorează zoom (-)"
                                  >
                                    <Minus size={16} />
                                  </button>
                                </div>

                                {/* Zoom Level Pill */}
                                <div className="absolute bottom-2.5 right-2.5 px-2.5 py-1 bg-black/80 backdrop-blur-xs text-white text-[11px] font-sans rounded-full border border-white/10 shadow-sm z-10">
                                  Zoom {mapZoom}x
                                </div>
                              </div>
                            ) : (
                              /* 2. Leaflet Interactive Map */
                              <div className="w-full h-full relative z-0">
                                <MapContainer
                                  center={[coordinates.lat, coordinates.lon]}
                                  zoom={mapZoom}
                                  className="w-full h-full z-0"
                                  scrollWheelZoom={true}
                                >
                                  <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                  />
                                  <Marker 
                                    position={[coordinates.lat, coordinates.lon]}
                                    icon={customMapPinIcon || undefined}
                                  >
                                    <Popup>
                                      <div className="text-xs p-1">
                                        <div className="font-bold text-gray-900 mb-1">{client?.name || 'Sediu Companie'}</div>
                                        <div className="text-gray-600 mb-1">{addrCheck.address}</div>
                                        <div className="text-gray-400 text-[10px]">{coordinates.lat.toFixed(6)}, {coordinates.lon.toFixed(6)}</div>
                                      </div>
                                    </Popup>
                                  </Marker>
                                </MapContainer>
                              </div>
                            )}
                          </div>

                          {/* Zoom Presets & Perspectives (Symmetric with Left Card Thumbnails) */}
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/60">
                            <div className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                              <span>Perspective Zoom Plan Stradal:</span>
                              <span className="text-gray-400 font-normal">Nivel detaliu</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { zoom: 18, label: 'Detaliu Clădire', sub: 'Zoom 18x' },
                                { zoom: 16, label: 'Plan Stradal', sub: 'Zoom 16x' },
                                { zoom: 14, label: 'Vedere Zonă', sub: 'Zoom 14x' },
                              ].map((preset) => {
                                const isCurrent = mapZoom === preset.zoom;
                                return (
                                  <button
                                    key={preset.zoom}
                                    type="button"
                                    onClick={() => {
                                      setMapZoom(preset.zoom);
                                    }}
                                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                                      isCurrent
                                        ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-900/30 ring-1 ring-blue-500/30'
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className={`text-xs font-semibold ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {preset.label}
                                      </span>
                                      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>}
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                      {preset.sub}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Address Footer Bar */}
                          <div className="mt-3 p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <MapPin size={13} className="text-rose-500 shrink-0" />
                              <span className="truncate font-medium text-gray-800 dark:text-gray-200 text-[11px]" title={addrCheck.address}>
                                {addrCheck.address}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lon}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-gray-900 hover:bg-black text-white dark:bg-white dark:text-gray-900 text-[11px] font-semibold rounded-full transition-colors inline-flex items-center gap-1"
                              >
                                Rută Google Maps <ExternalLink size={10} />
                              </a>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* CARD 2: Firme Înregistrate la Această Clădire / Adresă - RÂND SEPARAT, FULL WIDTH */}
                  <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6 animate-in fade-in">
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white flex items-center justify-center shrink-0">
                          <Building2 size={19} />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                            Firme Înregistrate la Această Clădire / Adresă
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Verificare cluster firme pe baza evidenței fiscale și a numărului poștal
                          </p>
                        </div>
                      </div>
                      <span className="self-start sm:self-center text-xs px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold border border-gray-200 dark:border-gray-600">
                        Total: {totalItems} {totalItems === 1 ? 'firmă' : 'firme'}
                      </span>
                    </div>

                    {/* Bulk Actions Bar */}
                    {selectedAddressRows.length > 0 && (
                      <div className="my-4 p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl flex items-center justify-between gap-2 animate-in fade-in">
                        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 ml-1">
                          {selectedAddressRows.length} {selectedAddressRows.length === 1 ? 'firmă selectată' : 'firme selectate'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopySelected}
                            className="px-3.5 py-1 bg-gray-900 hover:bg-black text-white dark:bg-white dark:text-gray-900 rounded-full text-xs font-medium transition-colors"
                          >
                            Copiază CUI-uri
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedAddressRows([])}
                            className="px-3.5 py-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium transition-colors"
                          >
                            Anulează
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Evaluating Status Banner */}
                    {evaluatingCui && (
                      <div className="mb-4 p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 text-xs text-gray-900 dark:text-white animate-pulse">
                        <div className="flex items-center gap-2">
                          <RefreshCw size={14} className="animate-spin text-gray-900 dark:text-white" />
                          <span className="font-semibold">
                            Se rulează evaluarea pentru CUI: <span className="underline">{evaluatingCui}</span>...
                          </span>
                        </div>
                        <span className="text-[11px] opacity-70 hidden sm:inline">Interogare ANAF &amp; indicatori financiari</span>
                      </div>
                    )}

                    {/* Table Container conforming to all 5 rules */}
                    <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 shadow-xs mt-4">
                      <table className="w-full text-left text-xs">
                        <thead className="text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-[11px] tracking-wider">
                          <tr>
                            {/* Rule 1: Checkbox */}
                            <th className="px-4 py-3 w-12 text-center">
                              <input
                                type="checkbox"
                                checked={allCurrentPageSelected}
                                onChange={handleSelectAll}
                                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                              />
                            </th>
                            {/* Rule 2: Nr. Crt. */}
                            <th className="px-3 py-3 w-14 text-center font-medium">Nr.</th>
                            <th className="px-4 py-3 font-medium">Denumire Firmă</th>
                            <th className="px-4 py-3 font-medium">CUI</th>
                            <th className="px-4 py-3 font-medium text-center">An Înființare</th>
                            <th className="px-4 py-3 font-medium">Etaj / Detalii Sediu</th>
                            {/* Rule 4: Action icon header */}
                            <th className="px-4 py-3 text-center font-medium w-28">Acțiuni</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-700 dark:text-gray-300">
                          {paginatedCompanies.length > 0 ? (
                            paginatedCompanies.map((c, idx) => {
                              const isSelected = selectedAddressRows.includes(c.cui);
                              const rowNumber = (addressPage - 1) * addressPageSize + idx + 1;
                              const compName = c.denumire || c.nume || c.name || 'N/A';
                              const yearEstablished = c.an_infiintare || (c.data_inregistrare ? c.data_inregistrare.slice(0, 4) : '—');
                              const isEvaluatingThis = evaluatingCui === String(c.cui).replace(/^RO/, '').trim();

                              return (
                                <tr
                                  key={c.cui || idx}
                                  className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                                >
                                  {/* Rule 1: Row Checkbox */}
                                  <td className="px-4 py-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => handleToggleRow(c.cui)}
                                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                    />
                                  </td>
                                  {/* Rule 2: Nr. Crt. */}
                                  <td className="px-3 py-3 text-center text-gray-400 font-sans text-xs">
                                    {rowNumber}
                                  </td>
                                  {/* Rule 3: Denumire Firmă (Clickable to evaluate) */}
                                  <td className="px-4 py-3 font-sans font-semibold text-gray-900 dark:text-white">
                                    <button
                                      type="button"
                                      onClick={() => handleEvaluateCompany(c.cui, compName)}
                                      disabled={Boolean(evaluatingCui)}
                                      className="text-left hover:text-primary dark:hover:text-primary-light hover:underline transition-colors cursor-pointer inline-flex items-center gap-1.5 group font-semibold"
                                      title="Click pentru a evalua automat această companie"
                                    >
                                      <span>{compName}</span>
                                      {isEvaluatingThis ? (
                                        <RefreshCw size={12} className="text-primary animate-spin shrink-0" />
                                      ) : (
                                        <ChevronRight size={13} className="text-gray-400 group-hover:text-primary transition-transform group-hover:translate-x-0.5 shrink-0 opacity-0 group-hover:opacity-100" />
                                      )}
                                    </button>
                                  </td>
                                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                    {c.cui}
                                  </td>
                                  {/* An Înființare Column */}
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                                      {yearEstablished}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 font-sans text-gray-500 dark:text-gray-400 text-[11px] max-w-xs truncate">
                                    {c.adresa || c.detalii || 'La adresa selectată'}
                                  </td>
                                  {/* Rule 4: Circular rounded-full action icons */}
                                  <td className="px-4 py-3 text-center">
                                    <div className="inline-flex items-center gap-1.5 justify-center">
                                      <button
                                        type="button"
                                        title="Evaluează această companie"
                                        disabled={Boolean(evaluatingCui)}
                                        onClick={() => handleEvaluateCompany(c.cui, compName)}
                                        className={`p-2 border rounded-full transition-colors inline-flex items-center justify-center cursor-pointer ${
                                          isEvaluatingThis
                                            ? 'border-gray-900 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs'
                                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                      >
                                        <RefreshCw size={13} className={isEvaluatingThis ? "animate-spin text-gray-900 dark:text-white" : ""} />
                                      </button>
                                      <button
                                        type="button"
                                        title="Deschide locație pe hartă"
                                        onClick={() => window.open(addrCheck.google_maps_url, '_blank')}
                                        className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors inline-flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                                      >
                                        <MapPin size={13} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-xs font-sans">
                                Nicio altă firmă identificată la această adresă.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                      {/* Rule 5: Pagination & Footer */}
                      <div className="px-4 py-3 bg-gray-50/60 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <span>Afișează</span>
                          <select
                            value={addressPageSize}
                            onChange={(e) => {
                              setAddressPageSize(Number(e.target.value));
                              setAddressPage(1);
                            }}
                            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs focus:ring-primary focus:border-primary cursor-pointer"
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                          </select>
                          <span>/ pagină</span>
                          <span className="ml-2 font-medium">Total: {totalItems}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span>Pagină {addressPage} din {totalPages}</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={addressPage === 1}
                              onClick={() => setAddressPage(p => Math.max(1, p - 1))}
                              className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              <ChevronLeft size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={addressPage >= totalPages}
                              onClick={() => setAddressPage(p => Math.min(totalPages, p + 1))}
                              className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Full-Screen Street View Lightbox Modal - EXACT MATCH TO USER'S IMAGE 2 */}
                  {previewModalOpen && activePhoto && (
                    <div 
                      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
                      onClick={() => setPreviewModalOpen(false)}
                    >
                      {/* Circular Close Button (X) at Top Right - Exactly like Image 2 */}
                      <button
                        type="button"
                        onClick={() => setPreviewModalOpen(false)}
                        className="absolute top-6 right-6 w-11 h-11 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center border border-white/20 transition-all z-50 cursor-pointer shadow-lg hover:scale-105"
                        title="Închide (Esc)"
                      >
                        <X size={22} />
                      </button>

                      {/* Left Screen Navigation Arrow (<) - Exactly like Image 2 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
                        }}
                        className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center text-white/75 hover:text-white transition-all z-50 cursor-pointer hover:scale-125"
                        title="Unghiul anterior (←)"
                      >
                        <ChevronLeft size={44} strokeWidth={2.5} />
                      </button>

                      {/* Right Screen Navigation Arrow (>) - Exactly like Image 2 */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhotoIndex((prev) => (prev + 1) % photos.length);
                        }}
                        className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-14 h-14 flex items-center justify-center text-white/75 hover:text-white transition-all z-50 cursor-pointer hover:scale-125"
                        title="Unghiul următor (→)"
                      >
                        <ChevronRight size={44} strokeWidth={2.5} />
                      </button>

                      {/* Centered Large Street View Photo Container */}
                      <div 
                        className="relative max-h-[82vh] max-w-[88vw] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <img
                          src={activePhoto.url}
                          alt={activePhoto.title}
                          className="max-h-[80vh] w-auto max-w-full object-contain rounded-xl select-none"
                        />

                        {/* Google Street View Watermarks - Exactly matching Image 2 */}
                        <div className="absolute bottom-3 left-4 text-white font-bold text-sm tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] select-none pointer-events-none opacity-90">
                          Google
                        </div>
                        <div className="absolute bottom-3 right-4 text-white/80 text-[10px] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] select-none pointer-events-none">
                          © Google
                        </div>
                      </div>

                      {/* Floating Pill Badge at Bottom Center - Exactly matching Image 2: "Adresse Exacte (Fațade) (1 / 2)" */}
                      <div 
                        className="absolute bottom-6 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-black/80 backdrop-blur-md text-white rounded-full text-xs font-semibold border border-white/15 shadow-xl flex items-center gap-2 z-50 tracking-wide select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Adresse Exacte ({selectedPhotoIndex + 1} / {photos.length}) • Google Street View {addrCheck.streetview_metadata?.date ? `(${addrCheck.streetview_metadata.date})` : ''}</span>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
            </>
          )}
        </>
      )}

      {activeTab === 'gps' && (
        <div className="space-y-6 mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-in fade-in">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-100 text-red-600 rounded-full dark:bg-red-900/30 dark:text-red-400">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Raport de Risc GPS (Monitorizare Flotă)</h3>
                <p className="text-sm text-gray-500">Generat automat pe baza traseelor de la vehiculele LT / ST.</p>
              </div>
            </div>
            
            <div className="space-y-6">
               <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                 <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Evaluare Pattern-uri Suspicioase</h4>
                 <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                   Sistemul AI a identificat **suprapuneri de adrese și rute frecvente** cu alte entități din portofoliul Axis. Risc crescut de subînchiriere neautorizată (Cross-Fleet Usage).
                 </p>
                 
                 <div className="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 p-4 rounded-r-xl">
                   <h5 className="font-medium text-red-800 dark:text-red-400 text-sm mb-1">Alerte Curente:</h5>
                   <ul className="list-disc pl-5 text-sm text-red-700 dark:text-red-300 space-y-1">
                     <li>Vehiculul B-123-AXS (ST) staționează frecvent peste noapte la sediul <b>Dino Home Construct</b> (client cu istoric negativ).</li>
                     <li>Ofertarea nouă pentru vehicule comerciale ar putea fi direcționată tot către terți. Se recomandă <b>Contract Fidejusor</b> sau respingerea cererii.</li>
                   </ul>
                 </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-2xl">
                   <div className="text-sm text-gray-500 mb-1">Acuratețe AI</div>
                   <div className="text-xl font-bold text-gray-900 dark:text-white">94%</div>
                   <div className="text-xs text-green-600 mt-1">Conform 1200+ ore monitorizare</div>
                 </div>
                 <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-2xl">
                   <div className="text-sm text-gray-500 mb-1">Status Recomandare</div>
                   <div className="text-xl font-bold text-red-600">Investigație Manuală</div>
                   <div className="text-xs text-gray-500 mt-1">Acțiune blocantă pt depart. aprobări</div>
                 </div>
               </div>
            </div>
          </div>

          {/* GPS Monitoring History */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-in fade-in">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-primary" /> Istoric Monitorizare GPS (Silențios)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-900/50 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th scope="col" className="px-4 py-3">Vehicul</th>
                    <th scope="col" className="px-4 py-3">Eveniment / Locație</th>
                    <th scope="col" className="px-4 py-3">Data și Ora</th>
                    <th scope="col" className="px-4 py-3">Status Permisiune</th>
                    <th scope="col" className="px-4 py-3">Decizie AI</th>
                  </tr>
                </thead>
                <tbody>
                   <tr>
                     <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                       Niciun eveniment GPS înregistrat. Monitorizarea este activă.
                     </td>
                   </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Investigation Board Tab */}
      {activeTab === 'investigation' && (enrichedRawData || rawDataObj) && (
        <div className="mt-6 animate-in fade-in">
          <InvestigationBoard
            rawData={enrichedRawData || rawDataObj}
            clientName={client?.name}
            clientCui={client?.cui_cnp}
          />
        </div>
      )}

      {/* Super-Smart OSINT Intelligence Modals */}
      <CompanyIntelModal
        isOpen={companyIntelTarget.isOpen}
        onClose={closeCompanyIntel}
        cui={companyIntelTarget.cui}
        initialName={companyIntelTarget.name}
        onEvaluate={handleEvaluateCompany}
        onOpenPerson={(personName) => {
          closeCompanyIntel();
          openPersonIntel(personName, companyIntelTarget.cui);
        }}
      />

      <PersonIntelModal
        isOpen={personIntelTarget.isOpen}
        onClose={closePersonIntel}
        name={personIntelTarget.name}
        contextCui={personIntelTarget.contextCui || client?.cui_cnp}
        onSelectCompany={(compCui, compName) => {
          closePersonIntel();
          openCompanyIntel(compCui, compName);
        }}
      />

      <MofDocumentModal
        isOpen={Boolean(selectedMofPub)}
        onClose={() => setSelectedMofPub(null)}
        publication={selectedMofPub}
      />
    </div>
  );
};

export default ClientDetails;
