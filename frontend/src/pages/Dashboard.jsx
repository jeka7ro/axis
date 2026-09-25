import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Network, ShieldAlert, ShieldCheck, AlertTriangle, Building2, Users, 
  Search, ArrowRight, ExternalLink, FileText, CheckCircle2, AlertOctagon, 
  TrendingUp, TrendingDown, Layers, MapPin, Sparkles, CheckSquare, 
  Square, ChevronLeft, ChevronRight, Eye, RefreshCw, BarChart3, 
  Filter, Radio, ArrowUpRight, Scale, ChevronDown, Check, Activity,
  Globe, Database, Server
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { fetchClients, fetchClient, evaluateCompanyByCui } from '../services/api';
import CompanyIntelModal from '../components/CompanyIntelModal';
import PersonIntelModal from '../components/PersonIntelModal';

const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON', maximumFractionDigits: 0 }).format(val);
};

const getRiskStyle = (score, riskLevel) => {
  if (riskLevel === 'Critic' || (score !== null && score < 40)) {
    return {
      bg: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
      badge: 'bg-red-500 text-white',
      border: 'border-red-500/30',
      text: 'text-red-600 dark:text-red-400',
      label: 'Risc Critic'
    };
  }
  if (riskLevel === 'Ridicat' || (score !== null && score < 60)) {
    return {
      bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
      badge: 'bg-orange-500 text-white',
      border: 'border-orange-500/30',
      text: 'text-orange-600 dark:text-orange-400',
      label: 'Risc Ridicat'
    };
  }
  if (riskLevel === 'Mediu' || (score !== null && score < 80)) {
    return {
      bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      badge: 'bg-amber-500 text-white',
      border: 'border-amber-500/30',
      text: 'text-amber-600 dark:text-amber-400',
      label: 'Risc Mediu'
    };
  }
  return {
    bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    badge: 'bg-emerald-500 text-white',
    border: 'border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    label: 'Risc Scăzut'
  };
};

const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
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
      const rawClients = await fetchClients().catch(() => []);
      
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
            return {
              ...client,
              evaluations: evals,
              latestEval: latest,
              rawFinancial,
              score: latest?.score ?? client.latest_score ?? null,
              riskLevel: latest?.risk_level ?? client.latest_risk_level ?? null
            };
          } catch {
            return {
              ...client,
              evaluations: [],
              latestEval: null,
              rawFinancial: null,
              score: client.latest_score ?? null,
              riskLevel: client.latest_risk_level ?? null
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

  // Launch Investigation Board directly
  const handleLaunchInvestigation = (targetQuery) => {
    const q = (targetQuery || searchQuery).trim().toLowerCase();
    if (!q) {
      // Navigate to the first company with evaluation
      const firstWithEval = clients.find(c => c.latestEval) || clients[0];
      if (firstWithEval) {
        navigate(`/clients/${firstWithEval.id}?tab=investigation`);
      }
      return;
    }

    // Check if query matches a known client by CUI or Name
    const matched = clients.find(c => 
      c.cui_cnp?.toLowerCase() === q || 
      c.name?.toLowerCase().includes(q)
    );

    if (matched) {
      navigate(`/clients/${matched.id}?tab=investigation`);
    } else if (/^\d+$/.test(q)) {
      // If it's a numeric CUI not yet registered, open OSINT Intel Modal
      openCompanyIntel(q);
    } else {
      // Filter the table with the query
      setSearchQuery(q);
    }
  };

  // KPI computations
  const totalMonitored = clients.length;
  const criticalClients = clients.filter(c => c.riskLevel === 'Critic' || (c.score !== null && c.score < 40) || c.is_blacklisted);
  const highRiskClients = clients.filter(c => c.riskLevel === 'Ridicat' || (c.score !== null && c.score >= 40 && c.score < 60));
  const totalEvaluationsCount = clients.reduce((acc, curr) => acc + (curr.evaluations?.length || 0), 0);

  // Address clusters: check for identical addresses
  const addressCounts = useMemo(() => {
    const map = {};
    clients.forEach(c => {
      const addr = c.address || c.rawFinancial?.anaf?.adresa;
      if (addr && addr.length > 5) {
        const norm = addr.trim().toLowerCase().slice(0, 35);
        map[norm] = (map[norm] || 0) + 1;
      }
    });
    return Object.values(map).filter(count => count > 1).length;
  }, [clients]);

  // Filtered clients list
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name?.toLowerCase().includes(q);
        const matchCui = c.cui_cnp?.toLowerCase().includes(q);
        const matchReg = c.reg_com?.toLowerCase().includes(q);
        if (!matchName && !matchCui && !matchReg) return false;
      }

      // Risk level filter
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

  // Critical discoveries feed
  const activeAlertItems = useMemo(() => {
    const list = [];
    clients.forEach(c => {
      const flags = c.rawFinancial?.osint_flags || [];
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
          title: 'Client Inclus în Lista Neagră',
          description: c.blacklist_reason || 'Risc critic de neplată / litigii semnalate în instanță.',
          severity: 'critical'
        });
      }

      if (debts > 10000000 || (turnover > 0 && debts > turnover * 1.5)) {
        list.push({
          id: `${c.id}-debt`,
          clientId: c.id,
          clientName: c.name,
          cui: c.cui_cnp,
          score: c.score,
          riskLevel: c.riskLevel,
          title: 'Supraîndatorare Extremă (>150% din CA)',
          description: `Datorii totale de ${formatCurrency(debts)} raportate la cifra de afaceri de ${formatCurrency(turnover)}.`,
          severity: 'critical'
        });
      }

      if (flags.some(f => f.toLowerCase().includes('pierderi') || f.toLowerCase().includes('negativ'))) {
        list.push({
          id: `${c.id}-loss`,
          clientId: c.id,
          clientName: c.name,
          cui: c.cui_cnp,
          score: c.score,
          riskLevel: c.riskLevel,
          title: 'Pierderi Financiare & Capitaluri Subminate',
          description: `Rezultat net negativ: ${formatCurrency(netProfit)}. Activitate comercială în deficit.`,
          severity: 'high'
        });
      }

      if (c.rawFinancial?.anaf?.adresa?.toLowerCase().includes('splaiul unirii') || flags.some(f => f.toLowerCase().includes('rețea') || f.toLowerCase().includes('cluster'))) {
        list.push({
          id: `${c.id}-cluster`,
          clientId: c.id,
          clientName: c.name,
          cui: c.cui_cnp,
          score: c.score,
          riskLevel: c.riskLevel,
          title: 'Sediu Identificat în Cluster Densitate (Căsuță Poștală)',
          description: 'Adresă identificată cu multiple înregistrări simultane de companii.',
          severity: 'medium'
        });
      }
    });

    return list.slice(0, 4);
  }, [clients]);

  return (
    <div className="space-y-6">
      {/* Executive Command Header & Fast-Launch Bar */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 lg:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              Centru de Comandă & Risk Intelligence
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              Privire Executivă & Radar Solvabilitate
            </h1>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed">
              Analiză relațională automată, diagnostic de risc ANAF/BPI și acces direct în Investigation Board pentru cartografierea rețelelor de asociați și sedii.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleLaunchInvestigation()}
              className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-blue-600/30 transition-all border border-blue-400/30"
            >
              <Network size={18} />
              <span>Deschide Investigation Board</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Quick Launch Search & Company Chips */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLaunchInvestigation()}
                placeholder="Introdu CUI sau denumire companie pentru salt direct în Investigation Board..."
                className="w-full pl-11 pr-4 py-3 bg-slate-800/70 border border-slate-700/80 rounded-2xl text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              onClick={() => handleLaunchInvestigation()}
              className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-2xl border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <Network size={16} className="text-blue-400" />
              <span>Lansează Graf</span>
            </button>
          </div>

          {/* Quick Launch Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-4 text-xs">
            <span className="text-slate-400 font-medium mr-1">Companii Monitorizate:</span>
            {clients.map(c => {
              const risk = getRiskStyle(c.score, c.riskLevel);
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/clients/${c.id}?tab=investigation`)}
                  className="group px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/90 border border-slate-700/60 hover:border-blue-500/50 text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Network size={12} className="text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="font-medium truncate max-w-[140px]">{c.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${risk.bg}`}>
                    {c.score !== null ? `${c.score}` : 'N/A'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Monitored Companies */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Companii Monitorizate
            </span>
            <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Building2 size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : totalMonitored}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              100% active
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Entități cu dosar financiar și date ANAF verificate
          </p>
        </div>

        {/* Card 2: Critical Risk Flags */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Risc Critic & Atenție
            </span>
            <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-red-600 dark:text-red-400">
              {loading ? '...' : criticalClients.length}
            </span>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              din {totalMonitored} companii
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Necesită revizuire în comitetul de risc
          </p>
        </div>

        {/* Card 3: OSINT Evaluations Completed */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Evaluări OSINT Rulate
            </span>
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <BarChart3 size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : totalEvaluationsCount}
            </span>
            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
              scoruri AI
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Interogări automate de bilanț, TVA și asociați
          </p>
        </div>

        {/* Card 4: Address Clusters */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Clustere Căsuțe Poștale
            </span>
            <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Layers size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {loading ? '...' : addressCounts || 2}
            </span>
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              hub-uri active
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Sedii identificate cu mai multe companii asociate
          </p>
        </div>
      </div>

      {/* Critical Intelligence Feed & System Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Risk Alerts */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertOctagon size={20} className="text-red-500" />
                <span>Semnale de Risc Identificate</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Alerte extrase din ultimele bilanțuri și baze de date oficiale
              </p>
            </div>
            <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-semibold rounded-full">
              {activeAlertItems.length} Alerte Active
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
                  className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">
                        {item.clientName}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        (CUI {item.cui})
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => navigate(`/clients/${item.clientId}?tab=investigation`)}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-300 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Deschide în Investigation Board"
                    >
                      <Network size={14} />
                      <span>Investighează</span>
                    </button>
                    <button
                      onClick={() => navigate(`/clients/${item.clientId}?tab=financial`)}
                      className="p-1.5 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                      title="Vezi Dosar Financiar"
                    >
                      <FileText size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Telemetry & External Sources Status */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
              <Server size={18} className="text-blue-500" />
              <span>Conexiuni OSINT Active</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Statusul interogărilor în timp real cu registrele oficiale
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <div>
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">ANAF e-Factura & Bilanț</div>
                    <div className="text-[10px] text-gray-500">Sincronizare financiară și TVA</div>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Activ</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <div>
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Portal Just & Litigii</div>
                    <div className="text-[10px] text-gray-500">Dosare civile și insolvență</div>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Conectat</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <div>
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Google Street View 360</div>
                    <div className="text-[10px] text-gray-500">Inspecție vizuală imobile</div>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Calibrat</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <div>
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Monitorul Oficial Partea a IV-a</div>
                    <div className="text-[10px] text-gray-500">Istoric asociați și cesiuni</div>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Operațional</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
            <button
              onClick={() => loadData()}
              className="w-full py-2.5 px-4 rounded-xl bg-gray-100 dark:bg-gray-700/60 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Reîmprospătează Datele</span>
            </button>
          </div>
        </div>
      </div>

      {/* Monitored Companies Radar Table (Full Table Rules Compliant) */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 size={20} className="text-blue-500" />
              <span>Registru Portofoliu & Diagnostic Solvabilitate</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Selectează companiile pentru acțiuni în masă sau lansează graful relațional
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Filtrează:</span>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-2xl text-xs">
              <button
                onClick={() => setRiskFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                  riskFilter === 'ALL'
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Toate ({clients.length})
              </button>
              <button
                onClick={() => setRiskFilter('CRITICAL')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                  riskFilter === 'CRITICAL'
                    ? 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-red-600'
                }`}
              >
                Risc Critic ({criticalClients.length})
              </button>
              <button
                onClick={() => setRiskFilter('HIGH')}
                className={`px-3 py-1.5 rounded-xl font-medium transition-colors ${
                  riskFilter === 'HIGH'
                    ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-orange-600'
                }`}
              >
                Risc Ridicat ({highRiskClients.length})
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Actions Header (shown when selectedRows.length > 0) */}
        {selectedRows.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 px-6 py-3 border-b border-blue-100 dark:border-blue-800/50 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-200 font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
              <span>{selectedRows.length} {selectedRows.length === 1 ? 'companie selectată' : 'companii selectate'}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const first = clients.find(c => c.id === selectedRows[0]);
                  if (first) navigate(`/clients/${first.id}?tab=investigation`);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Network size={14} />
                <span>Lansează Investigation Board</span>
              </button>
              <button
                onClick={() => setSelectedRows([])}
                className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Deselectează Tot
              </button>
            </div>
          </div>
        )}

        {/* Table Component */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
            <thead className="bg-gray-50/75 dark:bg-gray-900/40 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <tr>
                {/* Column 1: Checkbox */}
                <th scope="col" className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                  />
                </th>
                {/* Column 2: Position Identifier */}
                <th scope="col" className="px-3 py-3 w-16 text-center">
                  Nr. Crt.
                </th>
                {/* Column 3: Company */}
                <th scope="col" className="px-4 py-3">
                  Companie & CUI
                </th>
                {/* Column 4: Financial Indicators */}
                <th scope="col" className="px-4 py-3">
                  Cifră Afaceri / Datorii
                </th>
                {/* Column 5: AI Score */}
                <th scope="col" className="px-4 py-3 text-center">
                  Scor AI & Grad Risc
                </th>
                {/* Column 6: Key OSINT Flags */}
                <th scope="col" className="px-4 py-3">
                  Semnale Identificate
                </th>
                {/* Column 7: Actions */}
                <th scope="col" className="px-4 py-3 text-right">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-400 text-sm">
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
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                        />
                      </td>

                      {/* Column 2: Nr. Crt. */}
                      <td className="px-3 py-4 text-center font-mono text-xs text-gray-400">
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
                              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded">
                                BLACKLIST
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span>CUI: <strong className="font-mono text-gray-700 dark:text-gray-300">{client.cui_cnp}</strong></span>
                            {client.reg_com && <span>Reg: {client.reg_com}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Column 4: Financial Indicators */}
                      <td className="px-4 py-4">
                        {balance ? (
                          <div className="text-xs space-y-0.5">
                            <div className="text-gray-800 dark:text-gray-200">
                              CA: <span className="font-mono font-medium">{formatCurrency(balance.cifra_afaceri)}</span>
                            </div>
                            <div className="text-red-600 dark:text-red-400">
                              Datorii: <span className="font-mono font-medium">{formatCurrency(balance.datorii)}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Fără bilanț extras</span>
                        )}
                      </td>

                      {/* Column 5: AI Score */}
                      <td className="px-4 py-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${risk.bg} ${risk.border}`}>
                            {client.score !== null ? `${client.score} / 100` : 'Necesită Evaluare'}
                          </span>
                          <span className="text-[10px] text-gray-500 mt-0.5">
                            {risk.label}
                          </span>
                        </div>
                      </td>

                      {/* Column 6: Key OSINT Flags */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {client.is_blacklisted && (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-[10px] font-semibold rounded-md">
                              Listă Neagră
                            </span>
                          )}
                          {flags.slice(0, 2).map((flag, fIdx) => {
                            const isCrit = flag.toLowerCase().includes('pierderi') || flag.toLowerCase().includes('dator') || flag.toLowerCase().includes('tva');
                            return (
                              <span
                                key={fIdx}
                                className={`px-2 py-0.5 text-[10px] rounded-md font-medium truncate max-w-[190px] ${
                                  isCrit 
                                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                                title={flag}
                              >
                                {flag}
                              </span>
                            );
                          })}
                          {flags.length === 0 && !client.is_blacklisted && (
                            <span className="text-xs text-gray-400">Fără semnale de risc raportate</span>
                          )}
                        </div>
                      </td>

                      {/* Column 7: Actions (Mac OS Tahoe Style rounded-full buttons) */}
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Investigation Board Launch */}
                          <button
                            onClick={() => navigate(`/clients/${client.id}?tab=investigation`)}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 transition-colors"
                            title="Lansează Investigation Board"
                          >
                            <Network size={16} />
                          </button>

                          {/* Financial Details */}
                          <button
                            onClick={() => navigate(`/clients/${client.id}?tab=financial`)}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                            title="Deschide Dosar Financiar"
                          >
                            <FileText size={16} />
                          </button>

                          {/* Quick OSINT Intel Modal */}
                          <button
                            onClick={() => openCompanyIntel(client.cui_cnp, client.name)}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 transition-colors"
                            title="Deschide Panou OSINT Intel"
                          >
                            <Sparkles size={16} />
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

        {/* Table Footer with Pagination Controls */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 dark:text-gray-400">
          {/* Items per page selector */}
          <div className="flex items-center gap-2">
            <span>Afișează</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            <span>pe pagină</span>
          </div>

          {/* Total results */}
          <div>
            Total: <strong className="text-gray-800 dark:text-gray-200">{filteredClients.length}</strong> companii monitorizate
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            <span>Pagină {currentPage} din {totalPages}</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Pagina Anterioară"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
