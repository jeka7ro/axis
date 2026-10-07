import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Network, ShieldAlert, Building2, Search, ArrowRight, FileText, 
  Layers, Sparkles, ChevronLeft, ChevronRight, Eye, RefreshCw, 
  BarChart3, AlertOctagon, Check, X, AlertCircle, TrendingUp, 
  Car, Briefcase, Key, Calendar, Wrench, ShieldCheck, ArrowUpRight, 
  Clock, Plus, ExternalLink, SlidersHorizontal, AlertTriangle, PieChart, Activity
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { fetchClients, fetchClient, evaluateCompanyByCui, fetchVehicles } from '../services/api';
import { fetchOffers } from '../services/apiOffers';
import CompanyIntelModal from '../components/CompanyIntelModal';
import PersonIntelModal from '../components/PersonIntelModal';
import ZoomPieChart from '../components/ZoomPieChart';
import ZoomBarChart from '../components/ZoomBarChart';
import VehicleProfitabilityChart from '../components/VehicleProfitabilityChart';
import PortfolioRiskMatrixChart from '../components/PortfolioRiskMatrixChart';

const formatRon = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(val);
};

const formatEur = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
};

const getRiskStyle = (score, riskLevel) => {
  if (riskLevel === 'Critic' || (score !== null && score < 40)) {
    return {
      bg: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800',
      badge: 'bg-red-500 text-white',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-400',
      label: 'Risc Critic'
    };
  }
  if (riskLevel === 'Ridicat' || (score !== null && score < 60)) {
    return {
      bg: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      badge: 'bg-orange-500 text-white',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-700 dark:text-orange-400',
      label: 'Risc Ridicat'
    };
  }
  if (riskLevel === 'Mediu' || (score !== null && score < 80)) {
    return {
      bg: 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      badge: 'bg-amber-500 text-white',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-400',
      label: 'Risc Mediu'
    };
  }
  return {
    bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    badge: 'bg-emerald-500 text-white',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'Risc Scăzut'
  };
};

const Dashboard = () => {
  const { user, currency } = useAuthStore();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [selectedFleetFilter, setSelectedFleetFilter] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // OSINT Intelligence Modals
  const [companyIntelTarget, setCompanyIntelTarget] = useState({ isOpen: false, cui: '', name: '' });
  const [personIntelTarget, setPersonIntelTarget] = useState({ isOpen: false, name: '', contextCui: '' });
  const [intelHistory, setIntelHistory] = useState([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rawClients, rawVehicles, rawOffers] = await Promise.all([
        fetchClients().catch(() => []),
        fetchVehicles().catch(() => []),
        fetchOffers().catch(() => [])
      ]);

      setVehicles(rawVehicles);
      setOffers(rawOffers);

      // Parallel enrichment with latest detailed evaluations
      const enriched = await Promise.all(
        rawClients.map(async (client) => {
          try {
            const detail = await fetchClient(client.id);
            const evals = detail.evaluations || [];
            const latest = evals[0] || null;
            let rawFinancial = null;
            if (latest?.raw_financial_data) {
              try {
                rawFinancial = typeof latest.raw_financial_data === 'string'
                  ? JSON.parse(latest.raw_financial_data)
                  : latest.raw_financial_data;
              } catch {
                rawFinancial = null;
              }
            }

            const clientOffers = rawOffers.filter(o => o.client_id === client.id);

            return {
              ...client,
              evaluations: evals,
              latestEval: latest,
              rawFinancial,
              score: latest?.score ?? client.latest_score ?? null,
              riskLevel: latest?.risk_level ?? client.latest_risk_level ?? null,
              offersCount: clientOffers.length,
              activeOffers: clientOffers.filter(o => o.status === 'Transformat în Contract' || o.contract)
            };
          } catch {
            return {
              ...client,
              evaluations: [],
              latestEval: null,
              rawFinancial: null,
              score: client.latest_score ?? null,
              riskLevel: client.latest_risk_level ?? null,
              offersCount: 0,
              activeOffers: []
            };
          }
        })
      );

      setClients(enriched);
    } catch (err) {
      console.error('Eroare încărcare date dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Modal navigation handlers
  const openCompanyIntel = (cui, name = '') => {
    setIntelHistory(prev => [...prev, { type: 'company', cui, name }]);
    setCompanyIntelTarget({ isOpen: true, cui, name });
    setPersonIntelTarget(prev => ({ ...prev, isOpen: false }));
  };

  const closeCompanyIntel = () => {
    setCompanyIntelTarget({ isOpen: false, cui: '', name: '' });
    setIntelHistory([]);
  };

  const openPersonIntel = (name, contextCui = '') => {
    setIntelHistory(prev => [...prev, { type: 'person', name, contextCui }]);
    setPersonIntelTarget({ isOpen: true, name, contextCui });
    setCompanyIntelTarget(prev => ({ ...prev, isOpen: false }));
  };

  const closePersonIntel = () => {
    setPersonIntelTarget({ isOpen: false, name: '', contextCui: '' });
    setIntelHistory([]);
  };

  const handleIntelBack = () => {
    if (intelHistory.length <= 1) {
      setIntelHistory([]);
      setCompanyIntelTarget({ isOpen: false, cui: '', name: '' });
      setPersonIntelTarget({ isOpen: false, name: '', contextCui: '' });
      return;
    }
    const newHistory = [...intelHistory];
    newHistory.pop();
    const prevItem = newHistory[newHistory.length - 1];
    setIntelHistory(newHistory);

    if (prevItem.type === 'company') {
      setCompanyIntelTarget({ isOpen: true, cui: prevItem.cui, name: prevItem.name });
      setPersonIntelTarget({ isOpen: false, name: '', contextCui: '' });
    } else {
      setPersonIntelTarget({ isOpen: true, name: prevItem.name, contextCui: prevItem.contextCui });
      setCompanyIntelTarget({ isOpen: false, cui: '', name: '' });
    }
  };

  const handleEvaluateCompany = async (targetCui, targetName = '') => {
    try {
      const res = await evaluateCompanyByCui(targetCui, targetName);
      loadData();
      return res;
    } catch (err) {
      console.error('Eroare evaluare companie:', err);
      throw err;
    }
  };

  // ==========================================
  // EXECUTIVE BUSINESS KPIS CALCULATIONS
  // ==========================================
  const totalVehiclesCount = vehicles.length;
  const rentedVehicles = vehicles.filter(v => v.status === 'Închiriat');
  const reservedVehicles = vehicles.filter(v => v.status === 'Rezervat');
  const availableVehicles = vehicles.filter(v => v.status === 'Disponibil');
  const maintenanceVehicles = vehicles.filter(v => v.status === 'În Service');
  const damageVehicles = vehicles.filter(v => v.status === 'Daună');

  // Fleet Utilization Rate
  const activeFleetCount = rentedVehicles.length + reservedVehicles.length;
  const utilizationPercent = totalVehiclesCount > 0 ? Math.round((activeFleetCount / totalVehiclesCount) * 100) : 0;

  // Monthly Recurring Revenue (MRR)
  const contractsMRR = offers
    .filter(o => o.status === 'Transformat în Contract' || o.contract?.status === 'Semnat Axis' || o.contract?.status === 'Activ')
    .reduce((sum, o) => sum + (o.monthly_rate || 0), 0);

  const rentedVehiclesMRR = rentedVehicles.reduce((sum, v) => {
    const rate = v.rental_price_long_term ? v.rental_price_long_term / 4.97 : 650;
    return sum + rate;
  }, 0);

  const totalMRR = Math.round(contractsMRR + rentedVehiclesMRR);

  // Financial Risk Exposure
  const criticalClients = clients.filter(c => c.riskLevel === 'Critic' || (c.score !== null && c.score < 40) || c.is_blacklisted);
  const highRiskClients = clients.filter(c => c.riskLevel === 'Ridicat' || (c.score !== null && c.score >= 40 && c.score < 60));

  const totalExposureAtRisk = useMemo(() => {
    return criticalClients.reduce((acc, c) => {
      const balance = c.rawFinancial?.balance;
      const debtExposure = balance?.datorii ? Math.min(balance.datorii / 4.97 * 0.05, 50000) : 15000;
      return acc + debtExposure;
    }, 0);
  }, [criticalClients]);

  // Commercial Pipeline (Offers in progress)
  const draftOffers = offers.filter(o => o.status === 'Draft' || o.status === 'În Așteptare (Axis)');
  const convertedOffers = offers.filter(o => o.status === 'Transformat în Contract');
  const pipelinePotentialValue = offers.reduce((sum, o) => sum + (o.vehicle_price || 0), 0);

  // Total Fleet Assets Value
  const totalFleetAssetsValue = useMemo(() => {
    return vehicles.reduce((sum, v) => sum + (v.purchase_price ? Math.round(v.purchase_price / 4.97) : 45000), 0);
  }, [vehicles]);

  // ==========================================
  // ZOOMCHARTS 3D DATASETS
  // ==========================================
  const fleetPieData = useMemo(() => [
    { id: 'Închiriat', label: 'Închiriate', value: rentedVehicles.length, color: '#10b981', secondaryText: 'Generatoare venit activ' },
    { id: 'Rezervat', label: 'Rezervate', value: reservedVehicles.length, color: '#2563eb', secondaryText: 'Pregătire predare client' },
    { id: 'Disponibil', label: 'Disponibile', value: availableVehicles.length, color: '#64748b', secondaryText: 'Stoc liber imediat' },
    { id: 'În Service', label: 'În Service', value: maintenanceVehicles.length, color: '#f59e0b', secondaryText: 'Revizii mecanică' },
    { id: 'Daună', label: 'Daune CASCO', value: damageVehicles.length, color: '#ef4444', secondaryText: 'Dosare daună deschise' },
  ], [rentedVehicles.length, reservedVehicles.length, availableVehicles.length, maintenanceVehicles.length, damageVehicles.length]);

  const financialBarData = useMemo(() => [
    { label: 'Venit Lunar Recurent (MRR)', value: totalMRR, formattedValue: totalMRR.toLocaleString('ro-RO'), color: '#10b981', subtext: 'Chirii & Contracte', tooltip: 'Încasare lunară recurentă din leasing operațional' },
    { label: 'Pipeline Oportunități', value: Math.round(pipelinePotentialValue / 10), formattedValue: Math.round(pipelinePotentialValue / 10).toLocaleString('ro-RO'), color: '#6366f1', subtext: 'MRR estimat pipeline', tooltip: 'Rată lunară potențială dacă se semnează ofertele' },
    { label: 'Expunere sub Risc', value: Math.round(totalExposureAtRisk), formattedValue: Math.round(totalExposureAtRisk).toLocaleString('ro-RO'), color: '#ef4444', subtext: 'Companii semnalate', tooltip: 'Capital estimat expus la clienți cu semnale critice' },
    { label: 'Valoare Parc Auto Flotă', value: Math.round(totalFleetAssetsValue / 100), formattedValue: Math.round(totalFleetAssetsValue / 100).toLocaleString('ro-RO'), color: '#0ea5e9', subtext: 'Index Patrimoniu', tooltip: 'Valoarea de achiziție raportată a flotei din patrimoniu' },
  ], [totalMRR, pipelinePotentialValue, totalExposureAtRisk, totalFleetAssetsValue]);

  // Operational Fleet Urgencies (ITP, RCA, CASCO, Service)
  const fleetUrgencies = useMemo(() => {
    const list = [];

    vehicles.forEach(v => {
      if (selectedFleetFilter && v.status !== selectedFleetFilter) {
        return;
      }

      if (v.is_high_risk) {
        list.push({
          id: `wl-${v.id}`,
          vehicleId: v.id,
          plate: v.license_plate,
          name: `${v.make} ${v.model}`,
          badge: 'Supraveghere Risc',
          severity: 'critical',
          detail: 'Vehicul pe Watchlist de Risc Sporit / Verificare GPS recomandată'
        });
      }

      if (v.mileage && v.last_service_km && v.service_interval_km) {
        const kmUntil = v.service_interval_km - (v.mileage - v.last_service_km);
        if (kmUntil <= 1000) {
          list.push({
            id: `srv-${v.id}`,
            vehicleId: v.id,
            plate: v.license_plate,
            name: `${v.make} ${v.model}`,
            badge: kmUntil <= 0 ? 'Revizie Depășită' : 'Revizie Iminentă',
            severity: kmUntil <= 0 ? 'critical' : 'warning',
            detail: kmUntil <= 0 
              ? `Depășire revizie cu ${Math.abs(kmUntil)} km (${v.mileage} km actuali)`
              : `Mai sunt ${kmUntil} km până la revizie`
          });
        }
      }

      if (v.status === 'Daună') {
        list.push({
          id: `dmg-${v.id}`,
          vehicleId: v.id,
          plate: v.license_plate,
          name: `${v.make} ${v.model}`,
          badge: 'Daună Activă',
          severity: 'critical',
          detail: v.damage_notes || 'Dosar daună deschis · Imobilizat pentru reparații'
        });
      } else if (v.status === 'În Service') {
        list.push({
          id: `mnt-${v.id}`,
          vehicleId: v.id,
          plate: v.license_plate,
          name: `${v.make} ${v.model}`,
          badge: 'În Mentenanță',
          severity: 'info',
          detail: 'Intervenție mecanică în desfășurare la service partener'
        });
      }
    });

    return list.slice(0, 4);
  }, [vehicles, selectedFleetFilter]);

  // Critical discoveries feed
  const activeAlertItems = useMemo(() => {
    const list = [];
    clients.forEach(c => {
      const balance = c.rawFinancial?.balance;
      const debts = balance?.datorii || 0;
      const turnover = balance?.cifra_afaceri || 0;
      const netProfit = balance?.profit_net;

      if (c.is_blacklisted) {
        list.push({
          id: `${c.id}-bl`,
          clientId: c.id,
          clientName: c.name,
          cui: c.cui_cnp,
          score: c.score,
          riskLevel: 'Critic',
          title: 'Listă Neagră Activă',
          description: (c.blacklist_reason || 'Risc critic de neplată sau litigii semnalate în instanță.').replace('neplatăRisc', 'neplată. Risc'),
          severity: 'critical'
        });
      }

      if (turnover > 0 && debts > turnover * 1.5) {
        list.push({
          id: `${c.id}-debt`,
          clientId: c.id,
          clientName: c.name,
          cui: c.cui_cnp,
          score: c.score,
          riskLevel: c.riskLevel,
          title: 'Îndatorare Peste 150% din C.A.',
          description: `Datorii totale de ${formatRon(debts)} raportate la o cifră de afaceri de ${formatRon(turnover)}.`,
          severity: 'critical'
        });
      } else if (turnover === 0 && debts > 1000000) {
        list.push({
          id: `${c.id}-debt-idle`,
          clientId: c.id,
          clientName: c.name,
          cui: c.cui_cnp,
          score: c.score,
          riskLevel: c.riskLevel,
          title: 'Datorii Semnificative Fără Activitate',
          description: `Datorii de ${formatRon(debts)} fără cifră de afaceri înregistrată.`,
          severity: 'critical'
        });
      }

      if (netProfit !== null && netProfit !== undefined && netProfit < -100000) {
        list.push({
          id: `${c.id}-loss`,
          clientId: c.id,
          clientName: c.name,
          cui: c.cui_cnp,
          score: c.score,
          riskLevel: c.riskLevel,
          title: 'Rezultat Financiar Negativ',
          description: `Pierdere netă raportată în ultimul bilanț: ${formatRon(Math.abs(netProfit))}.`,
          severity: 'high'
        });
      }
    });

    return list.slice(0, 4);
  }, [clients]);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchCui = c.cui_cnp?.toLowerCase().includes(q);
        const matchReg = c.reg_com?.toLowerCase().includes(q);
        if (!matchName && !matchCui && !matchReg) return false;
      }

      if (riskFilter === 'CRITICAL') {
        return c.riskLevel === 'Critic' || (c.score !== null && c.score < 40);
      }
      if (riskFilter === 'HIGH') {
        return c.riskLevel === 'Ridicat' || (c.score !== null && c.score >= 40 && c.score < 60);
      }
      if (riskFilter === 'BLACKLIST') {
        return c.is_blacklisted;
      }
      if (riskFilter === 'LOW') {
        return c.riskLevel === 'Scăzut' || (c.score !== null && c.score >= 80);
      }

      return true;
    });
  }, [clients, searchQuery, riskFilter]);

  // Table pagination calculations
  const totalPages = Math.ceil(filteredClients.length / pageSize) || 1;
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, currentPage, pageSize]);

  // Bulk selection logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(paginatedClients.map(c => c.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedRows(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const isAllSelected = paginatedClients.length > 0 && paginatedClients.every(c => selectedRows.includes(c.id));

  return (
    <div className="space-y-6 pb-12">
      {/* TOP 4 EXECUTIVE BUSINESS KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Monthly Recurring Revenue (MRR) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
              Venit Lunar Recurent (MRR)
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {loading ? '...' : formatEur(totalMRR)}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 whitespace-nowrap shrink-0">
              +14.8% MoM
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{rentedVehicles.length} mașini închiriate</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{convertedOffers.length} contracte semnate</span>
          </div>
        </div>

        {/* KPI 2: Fleet Utilization Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
              Utilizare Flotă Activă
            </span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
              <Car size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {loading ? '...' : `${utilizationPercent}%`}
            </span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate">
              ({activeFleetCount} din {totalVehiclesCount} unități)
            </span>
          </div>
          
          {/* Mini Utilization Multi-bar */}
          <div className="mt-3 w-full bg-gray-100 dark:bg-gray-700 rounded-lg h-2 flex overflow-hidden">
            <div 
              style={{ width: `${(rentedVehicles.length / (totalVehiclesCount || 1)) * 100}%` }} 
              className="bg-emerald-500" 
              title={`Închiriate: ${rentedVehicles.length}`}
            />
            <div 
              style={{ width: `${(reservedVehicles.length / (totalVehiclesCount || 1)) * 100}%` }} 
              className="bg-blue-500" 
              title={`Rezervate: ${reservedVehicles.length}`}
            />
            <div 
              style={{ width: `${(availableVehicles.length / (totalVehiclesCount || 1)) * 100}%` }} 
              className="bg-gray-300 dark:bg-gray-600" 
              title={`Disponibile: ${availableVehicles.length}`}
            />
            <div 
              style={{ width: `${(maintenanceVehicles.length / (totalVehiclesCount || 1)) * 100}%` }} 
              className="bg-amber-400" 
              title={`În Service: ${maintenanceVehicles.length}`}
            />
            <div 
              style={{ width: `${(damageVehicles.length / (totalVehiclesCount || 1)) * 100}%` }} 
              className="bg-red-500" 
              title={`Daune: ${damageVehicles.length}`}
            />
          </div>
          <div className="mt-2 text-[11px] text-gray-500 flex justify-between">
            <span className="text-emerald-600 font-semibold">{availableVehicles.length} disponibile</span>
            <span className="text-amber-600">{maintenanceVehicles.length + damageVehicles.length} imobilizate</span>
          </div>
        </div>

        {/* KPI 3: Portfolio Exposure & Critical Risk */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
              Expunere Portofoliu sub Risc
            </span>
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 shrink-0">
              <ShieldAlert size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-red-600 dark:text-red-400">
              {loading ? '...' : formatEur(totalExposureAtRisk)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="font-bold text-red-600 dark:text-red-400">
              {criticalClients.length} companii semnalate
            </span>
            <span className="text-gray-500 dark:text-gray-400">
              {highRiskClients.length} sub atenție
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1 truncate">
            Necesită garanții fidejusori & limită credit
          </p>
        </div>

        {/* KPI 4: Commercial Pipeline & Offers */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
              Pipeline Oportunități Leasing
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Briefcase size={18} />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {loading ? '...' : offers.length}
            </span>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              oferte în sistem
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{draftOffers.length} în negociere / draft</span>
            <span className="font-bold text-gray-800 dark:text-gray-200">{formatEur(pipelinePotentialValue)} vol.</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1 truncate">
            Conversie medie: 72 ore de la verificare
          </p>
        </div>
      </div>

      {/* Operational Fleet Donut & Financial Multi-Bar Suite */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <ZoomPieChart
          data={fleetPieData}
          title="Distribuție & Utilizare Flotă"
          subtitle="Segmentare vehicule active în funcție de status operațional"
          centerLabel="Flotă Totală"
          unit="mașini"
          selectedId={selectedFleetFilter}
          onSliceClick={(id) => setSelectedFleetFilter(id)}
        />

        {/* ZoomCharts Multi-Bar: Financial Performance & Risk Exposure */}
        <ZoomBarChart
          items={financialBarData}
          title="Analiză Fluxuri Financiare & Expunere"
          subtitle="Corelație între MRR încasat, pipeline de contracte și expunerea de risc"
          currencySymbol="€"
        />
      </div>

      {/* Top Performing Vehicles & Portfolio Risk Intelligence Suite (2 Coloane Identice) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <VehicleProfitabilityChart
          vehicles={vehicles}
          currencySymbol={currency === 'RON' ? 'lei ' : '€'}
        />
        <PortfolioRiskMatrixChart
          clients={clients}
          currencySymbol={currency === 'RON' ? 'lei ' : '€'}
        />
      </div>

      {/* CORE OPERATIONAL & RISK COCKPIT (GRID 2 COLOANE IDENTICE CU CELE DE SUS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Left Column: Fleet Operational Status & Urgencies */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-full">
            <div>
              <div className="flex items-start sm:items-center justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Wrench size={18} className="text-amber-500 shrink-0" />
                      <span>Alerte Operaționale Flotă & Scadențe</span>
                    </h3>
                    {selectedFleetFilter && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 whitespace-nowrap">
                        Filtru: {selectedFleetFilter}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    Vehicule ce necesită revizie mecanică, inspecție daună sau monitorizare specială
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-md whitespace-nowrap shrink-0">
                  {fleetUrgencies.length} Acțiuni Imediate
                </span>
              </div>

              <div className="space-y-3">
                {fleetUrgencies.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    {selectedFleetFilter 
                      ? `Nu există alerte active pentru categoria "${selectedFleetFilter}".` 
                      : 'Toate vehiculele sunt în parametri operaționali optimi.'}
                  </div>
                ) : (
                  fleetUrgencies.map(u => (
                    <div
                      key={u.id}
                      className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/70 dark:border-gray-700/70 hover:border-gray-300 dark:hover:border-gray-600 transition-colors flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          u.severity === 'critical' ? 'bg-red-100 text-red-600 dark:bg-red-900/40' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/40'
                        }`}>
                          {u.severity === 'critical' ? <AlertTriangle size={17} /> : <Wrench size={17} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-gray-900 dark:text-white whitespace-nowrap">
                              {u.plate}
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate">
                              · {u.name}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap shrink-0 ${
                              u.severity === 'critical'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                                : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            }`}>
                              {u.badge}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                            {u.detail}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/vehicles/${u.vehicleId}`)}
                        className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors shrink-0 cursor-pointer"
                        title="Deschide Dosar Vehicul"
                      >
                        <Eye size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs text-gray-500">Parc Auto Axis:</span>
              <button
                onClick={() => navigate('/vehicles')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Gestionează Toate Cele {totalVehiclesCount} Vehicule</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

        {/* Right Column: Credit & Risk Committee Radar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between h-full">
            <div>
              <div className="flex items-start sm:items-center justify-between gap-4 mb-4">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert size={18} className="text-red-500 shrink-0" />
                    <span>Comitet de Risc & Alertă Default</span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    Clienți din portofoliu ce prezintă risc de neplată sau datorii fiscale
                  </p>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-bold rounded-md whitespace-nowrap shrink-0">
                  {activeAlertItems.length} Dosare Critice
                </span>
              </div>

              <div className="space-y-3">
                {activeAlertItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    Nu există semnale critice în acest moment.
                  </div>
                ) : (
                  activeAlertItems.map(item => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/70 dark:border-gray-700/70 hover:border-gray-300 dark:hover:border-gray-600 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-gray-900 dark:text-white text-xs truncate">
                            {item.clientName}
                          </span>
                          <span className="text-[11px] text-gray-500 shrink-0">
                            (CUI {item.cui})
                          </span>
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap shrink-0 ${
                          item.severity === 'critical' 
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200 dark:border-red-800'
                            : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        }`}>
                          {item.title}
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          onClick={() => navigate(`/clients/${item.clientId}?tab=financial`)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        >
                          Dosar Financiar
                        </button>
                        <button
                          onClick={() => navigate(`/clients/${item.clientId}?tab=investigation`)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors cursor-pointer"
                        >
                          Investigație
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <span className="text-xs text-gray-500">Comitet de Credit Axis:</span>
              <button
                onClick={() => navigate('/blacklist')}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
              >
                <span>Registru Listă Neagră</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>

      {/* PIPELINE COMERCIAL: OFERTE & CONTRACTE RECENTE */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Briefcase size={18} className="text-primary" />
              <span>Pipeline Comercial & Contractare Rapidă</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Ultimele oferte de leasing operațional configurate în platformă
            </p>
          </div>
          <button
            onClick={() => navigate('/offers')}
            className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 self-start sm:self-center cursor-pointer whitespace-nowrap"
          >
            <span>Toate Ofertele ({offers.length})</span>
            <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.slice(0, 3).map(offer => {
            const isContract = offer.status === 'Transformat în Contract' || offer.contract;
            return (
              <div 
                key={offer.id} 
                className="p-4 rounded-xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/70 dark:border-gray-700/70 hover:border-gray-300 dark:hover:border-gray-600 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {offer.client?.name || `Client #${offer.client_id}`}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap shrink-0 ${
                      isContract 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                    }`}>
                      {offer.status}
                    </span>
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 font-medium truncate">
                    {offer.vehicle_make ? `${offer.vehicle_make} ${offer.vehicle_model}` : 'Vehicul din Flotă / Nomenclator'}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs bg-white dark:bg-gray-800/80 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Rată Lunară</span>
                      <strong className="text-gray-900 dark:text-white font-bold">{formatEur(offer.monthly_rate)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Preț Finanțat</span>
                      <strong className="text-gray-700 dark:text-gray-300 font-medium">{formatEur(offer.vehicle_price)}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between text-xs">
                  <span className="text-gray-400 text-[11px]">
                    Perioadă: {offer.period_months} luni
                  </span>
                  <button
                    onClick={() => navigate('/offers')}
                    className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                    title="Vezi detalii ofertă"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REGISTRU EXECUTIV PORTOFOLIU & DIAGNOSTIC SOLVABILITATE (100% REGULI AGENTS.MD) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              <span>Registru Portofoliu Clienți & Diagnostic Solvabilitate</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Selectează companiile pentru acțiuni în masă sau lansează graful relațional
            </p>
          </div>

          {/* Search & Filters with sharp rectangular tags */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Caută companie, CUI, Reg..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-8 pr-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-primary w-48 sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-lg text-xs">
              <button
                onClick={() => { setRiskFilter('ALL'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  riskFilter === 'ALL'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Toate ({clients.length})
              </button>
              <button
                onClick={() => { setRiskFilter('CRITICAL'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  riskFilter === 'CRITICAL'
                    ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-red-600'
                }`}
              >
                Risc Critic ({criticalClients.length})
              </button>
              <button
                onClick={() => { setRiskFilter('HIGH'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded-md font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  riskFilter === 'HIGH'
                    ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-2xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-orange-600'
                }`}
              >
                Risc Ridicat ({highRiskClients.length})
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Header (Rule #3 AGENTS.md) */}
        {selectedRows.length > 0 && (
          <div className="bg-gray-100 dark:bg-gray-800 px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-100 font-medium">
              <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white"></span>
              <span>{selectedRows.length} {selectedRows.length === 1 ? 'companie selectată' : 'companii selectate'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const first = clients.find(c => c.id === selectedRows[0]);
                  if (first) navigate(`/clients/${first.id}?tab=investigation`);
                }}
                className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Network size={14} />
                <span>Deschide Graf Relațional</span>
              </button>
              <button
                onClick={() => setSelectedRows([])}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                Deselectează Tot
              </button>
            </div>
          </div>
        )}

        {/* Table Component */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50/75 dark:bg-gray-900/40 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {/* Column 1: Checkbox (Rule #1 AGENTS.md) */}
                <th scope="col" className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                {/* Column 2: Nr. Crt. (Rule #2 AGENTS.md) */}
                <th scope="col" className="px-3 py-3 w-16 text-center">
                  Nr. Crt.
                </th>
                {/* Column 3: Company */}
                <th scope="col" className="px-4 py-3">
                  Companie & CUI
                </th>
                {/* Column 4: Contracts & Fleet */}
                <th scope="col" className="px-4 py-3">
                  Flotă & Contracte
                </th>
                {/* Column 5: Financial Indicators */}
                <th scope="col" className="px-4 py-3">
                  Cifră Afaceri / Datorii
                </th>
                {/* Column 6: AI Score */}
                <th scope="col" className="px-4 py-3 text-center">
                  Scor AI & Grad Risc
                </th>
                {/* Column 7: Key OSINT Flags */}
                <th scope="col" className="px-4 py-3">
                  Diagnostic Solvabilitate
                </th>
                {/* Column 8: Actions */}
                <th scope="col" className="px-4 py-3 text-right">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-400 text-sm">
                    Nu s-au găsit companii conform filtrelor selectate.
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client, index) => {
                  const rowIndex = (currentPage - 1) * pageSize + index + 1;
                  const isSelected = selectedRows.includes(client.id);
                  const risk = getRiskStyle(client.score, client.riskLevel);
                  const balance = client.rawFinancial?.balance;
                  const flags = client.rawFinancial?.osint_flags || [];

                  return (
                    <tr
                      key={client.id}
                      className={`hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors ${
                        isSelected ? 'bg-blue-50/40 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      {/* Column 1: Checkbox */}
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(client.id)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                        />
                      </td>

                      {/* Column 2: Nr. Crt. */}
                      <td className="px-3 py-4 text-center text-xs text-gray-400 font-medium">
                        {rowIndex}
                      </td>

                      {/* Column 3: Company */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {client.name}
                            </span>
                            {client.is_blacklisted && (
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-md whitespace-nowrap">
                                BLACKLIST
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span>CUI: <strong className="font-medium text-gray-800 dark:text-gray-200">{client.cui_cnp}</strong></span>
                            {client.reg_com && <span>Reg: {client.reg_com}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Contracts & Fleet */}
                      <td className="px-4 py-4">
                        <div className="text-xs space-y-0.5">
                          <div className="font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                            <FileText size={13} className="text-blue-500 shrink-0" />
                            <span>{client.offersCount || 0} oferte / contracte</span>
                          </div>
                          <div className="text-gray-500 text-[11px]">
                            {client.activeOffers?.length > 0 ? (
                              <span className="text-emerald-600 font-semibold">{client.activeOffers.length} contracte semnate</span>
                            ) : (
                              <span>Fără contracte active</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 5: Financial Indicators */}
                      <td className="px-4 py-4">
                        {balance ? (
                          <div className="text-xs space-y-0.5">
                            <div className="text-gray-700 dark:text-gray-300">
                              CA: <span className="font-medium text-gray-900 dark:text-white">{formatRon(balance.cifra_afaceri)}</span>
                            </div>
                            <div className="text-red-600 dark:text-red-400">
                              Datorii: <span className="font-medium">{formatRon(balance.datorii)}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Fără bilanț extras</span>
                        )}
                      </td>

                      {/* Column 6: AI Score with sharp rounded-md tag */}
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border whitespace-nowrap ${risk.bg}`}>
                            {client.score !== null ? `${client.score} / 100` : 'Necesită Evaluare'}
                          </span>
                          <span className="text-[11px] text-gray-500 mt-0.5 font-medium">
                            {risk.label}
                          </span>
                        </div>
                      </td>

                      {/* Column 7: Key OSINT Flags */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {client.is_blacklisted && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[10px] font-bold rounded-md whitespace-nowrap">
                              Listă Neagră
                            </span>
                          )}
                          {flags.slice(0, 2).map((flag, fIdx) => {
                            const isCrit = flag.toLowerCase().includes('pierderi') || flag.toLowerCase().includes('dator') || flag.toLowerCase().includes('tva');
                            return (
                              <span
                                key={fIdx}
                                className={`px-2 py-0.5 text-[10px] rounded-md font-semibold truncate max-w-[190px] whitespace-nowrap ${
                                  isCrit 
                                    ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                                title={flag}
                              >
                                {flag}
                              </span>
                            );
                          })}
                          {flags.length === 0 && !client.is_blacklisted && (
                            <span className="text-xs text-gray-400">Dosar curat fără semnale</span>
                          )}
                        </div>
                      </td>

                      {/* Column 8: Actions (Mac OS Tahoe Style rounded-full buttons - Rule #4 AGENTS.md) */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => navigate(`/clients/${client.id}?tab=investigation`)}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                            title="Deschide Graf Relațional"
                          >
                            <Network size={15} />
                          </button>

                          <button
                            onClick={() => navigate(`/clients/${client.id}?tab=financial`)}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                            title="Deschide Dosar Financiar"
                          >
                            <FileText size={15} />
                          </button>

                          <button
                            onClick={() => openCompanyIntel(client.cui_cnp, client.name)}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                            title="Deschide Panou OSINT Intel"
                          >
                            <Sparkles size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination Controls (Rule #5 AGENTS.md) */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          {/* Items per page selector */}
          <div className="flex items-center gap-2">
            <span>Afișează</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            <span>pe pagină</span>
          </div>

          {/* Total results */}
          <div>
            Total: <strong className="text-gray-800 dark:text-gray-200 font-semibold">{filteredClients.length}</strong> companii monitorizate
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            <span>Pagină {currentPage} din {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Pagina Anterioară"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Pagina Următoare"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OSINT Modals on Dashboard */}
      <CompanyIntelModal
        isOpen={companyIntelTarget.isOpen}
        onClose={closeCompanyIntel}
        cui={companyIntelTarget.cui}
        initialName={companyIntelTarget.name}
        onEvaluate={handleEvaluateCompany}
        onOpenPerson={(personName, ctxCui) => openPersonIntel(personName, ctxCui || companyIntelTarget.cui)}
        onOpenCompany={(compCui, compName) => openCompanyIntel(compCui, compName)}
        history={intelHistory}
        onBack={handleIntelBack}
      />

      <PersonIntelModal
        isOpen={personIntelTarget.isOpen}
        onClose={closePersonIntel}
        name={personIntelTarget.name}
        contextCui={personIntelTarget.contextCui}
        onSelectCompany={(compCui, compName) => openCompanyIntel(compCui, compName)}
        history={intelHistory}
        onBack={handleIntelBack}
      />
    </div>
  );
};

export default Dashboard;
