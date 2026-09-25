import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Search, Building2, User, Eye, Edit2, Trash2, ChevronLeft, ChevronRight, 
  CheckSquare, Trash, AlertCircle, FileText, Check, CreditCard, ScanLine, Upload, 
  Link2 as LinkIcon, Briefcase, Sparkles, ShieldAlert, UserX, Loader2, CheckCircle2, ShieldBan,
  RefreshCw, ExternalLink, X, Scale, TrendingUp, TrendingDown, ShieldCheck, AlertTriangle, Activity
} from 'lucide-react';
import { 
  fetchClients, fetchClient, createClient, updateClient, deleteClient, lookupClientByCui,
  evaluateClient, addClientToBlacklist, removeClientFromBlacklist
} from '../services/api';
import { extractTextFromFile, parseRomanianIDCard, extractFaceFromIDCard } from '../utils/pdfOcr';
import { getCaenInfo, getCaenDescription } from '../utils/caenHelper';

const ClientsList = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newClient, setNewClient] = useState({ type: 'PJ', name: '', cui_cnp: '', representative_cnp: '', representative_address: '' });
  const [formError, setFormError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ocrLoading, setOcrLoading] = useState(false);

  // ANAF Dual-Function Search State
  const [anafLookupLoading, setAnafLookupLoading] = useState(false);
  const [anafLookupResult, setAnafLookupResult] = useState(null);
  const [anafLookupError, setAnafLookupError] = useState(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [addingFromAnaf, setAddingFromAnaf] = useState(false);
  const searchContainerRef = useRef(null);

  // Table state
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, isBulk: false });

  // Evaluation & Blacklist states
  const [evaluatingClientId, setEvaluatingClientId] = useState(null);
  const [blacklistModal, setBlacklistModal] = useState({
    isOpen: false,
    client: null,
    reason: 'Datorii > 90 zile & suspiciune neplată',
    severity: 'Critic',
    loading: false
  });
  const [unblacklistModal, setUnblacklistModal] = useState({
    isOpen: false,
    client: null,
    loading: false
  });
  const [toastMessage, setToastMessage] = useState(null);

  // Fereastra cu Analiza AI (Interactive Analysis Window) Modal State
  const [analysisModal, setAnalysisModal] = useState({
    isOpen: false,
    client: null,
    loading: false,
    currentStep: 0,
    evaluation: null,
    error: null
  });

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openAnalysisModal = async (client, startEvaluationNow = false) => {
    if (!client) return;

    setAnalysisModal({
      isOpen: true,
      client,
      loading: startEvaluationNow,
      currentStep: startEvaluationNow ? 1 : 0,
      evaluation: null,
      error: null
    });

    if (startEvaluationNow) {
      runModalEvaluation(client);
    } else {
      try {
        setAnalysisModal(prev => ({ ...prev, loading: true }));
        const detail = await fetchClient(client.id);
        const evals = detail.evaluations || [];
        const latest = evals.length > 0 ? evals[evals.length - 1] : null;
        if (latest) {
          setAnalysisModal(prev => ({
            ...prev,
            loading: false,
            evaluation: latest,
            currentStep: 5
          }));
        } else {
          runModalEvaluation(client);
        }
      } catch (err) {
        console.error("Eroare încărcare evaluare:", err);
        runModalEvaluation(client);
      }
    }
  };

  const runModalEvaluation = async (client) => {
    if (!client) return;
    setEvaluatingClientId(client.id);
    setAnalysisModal(prev => ({
      ...prev,
      loading: true,
      currentStep: 1,
      error: null
    }));

    const stepTimer1 = setTimeout(() => {
      setAnalysisModal(prev => prev.loading ? ({ ...prev, currentStep: 2 }) : prev);
    }, 700);

    const stepTimer2 = setTimeout(() => {
      setAnalysisModal(prev => prev.loading ? ({ ...prev, currentStep: 3 }) : prev);
    }, 1500);

    const stepTimer3 = setTimeout(() => {
      setAnalysisModal(prev => prev.loading ? ({ ...prev, currentStep: 4 }) : prev);
    }, 2400);

    const stepTimer4 = setTimeout(() => {
      setAnalysisModal(prev => prev.loading ? ({ ...prev, currentStep: 5 }) : prev);
    }, 3300);

    try {
      const res = await evaluateClient(client.id);
      
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);

      setAnalysisModal(prev => ({
        ...prev,
        loading: false,
        evaluation: res,
        currentStep: 5
      }));

      setClients(prev => prev.map(c => {
        if (c.id === client.id) {
          return {
            ...c,
            latest_score: res.score,
            latest_risk_level: res.risk_level
          };
        }
        return c;
      }));

      showToast(`Evaluare finalizată pentru "${client.name}": Scor ${res.score}/100 (${res.risk_level})`, 'success');
    } catch (err) {
      console.error('Eroare evaluare client:', err);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);
      setAnalysisModal(prev => ({
        ...prev,
        loading: false,
        error: "Eroare la obținerea datelor OSINT sau la calculul scorului. Verificați conexiunea backend."
      }));
      showToast(`Eroare la evaluarea clientului ${client.name}`, 'error');
    } finally {
      setEvaluatingClientId(null);
    }
  };

  const handleEvaluateClick = async (client) => {
    openAnalysisModal(client, true);
  };

  const handleBlacklistClick = (client) => {
    if (!client) return;
    if (client.is_blacklisted) {
      setUnblacklistModal({
        isOpen: true,
        client: client,
        loading: false
      });
    } else {
      const defaultReason = client.latest_score !== undefined && client.latest_score <= 40
        ? `Scor Risc Critic (${client.latest_score}/100) & probleme financiare / OSINT`
        : 'Datorii restante & risc major de neplată';
      setBlacklistModal({
        isOpen: true,
        client: client,
        reason: defaultReason,
        severity: 'Critic',
        loading: false
      });
    }
  };

  const confirmAddToBlacklist = async () => {
    if (!blacklistModal.client) return;
    setBlacklistModal(prev => ({ ...prev, loading: true }));
    try {
      await addClientToBlacklist(blacklistModal.client.id, {
        reason: blacklistModal.reason,
        severity: blacklistModal.severity
      });
      setClients(prev => prev.map(c => {
        if (c.id === blacklistModal.client.id) {
          return {
            ...c,
            is_blacklisted: true,
            blacklist_reason: blacklistModal.reason,
            blacklist_severity: blacklistModal.severity
          };
        }
        return c;
      }));
      showToast(`"${blacklistModal.client.name}" a fost adăugat în Black List!`, 'error');
      setBlacklistModal({ isOpen: false, client: null, reason: '', severity: 'Critic', loading: false });
    } catch (err) {
      console.error('Eroare adăugare în blacklist:', err);
      showToast('Eroare la salvarea în Black List', 'error');
      setBlacklistModal(prev => ({ ...prev, loading: false }));
    }
  };

  const confirmRemoveFromBlacklist = async () => {
    if (!unblacklistModal.client) return;
    setUnblacklistModal(prev => ({ ...prev, loading: true }));
    try {
      await removeClientFromBlacklist(unblacklistModal.client.id);
      setClients(prev => prev.map(c => {
        if (c.id === unblacklistModal.client.id) {
          return {
            ...c,
            is_blacklisted: false,
            blacklist_reason: null,
            blacklist_severity: null
          };
        }
        return c;
      }));
      showToast(`"${unblacklistModal.client.name}" a fost scos din Black List!`, 'success');
      setUnblacklistModal({ isOpen: false, client: null, loading: false });
    } catch (err) {
      console.error('Eroare deblocare blacklist:', err);
      showToast('Eroare la scoaterea din Black List', 'error');
      setUnblacklistModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleBulkEvaluate = async () => {
    if (selectedIds.length === 0) return;
    showToast(`Pornire evaluare pentru ${selectedIds.length} clienți selectați...`, 'info');
    for (const id of selectedIds) {
      try {
        setEvaluatingClientId(id);
        const res = await evaluateClient(id);
        setClients(prev => prev.map(c => c.id === id ? { ...c, latest_score: res.score, latest_risk_level: res.risk_level } : c));
      } catch (e) {
        console.error(`Eroare evaluare client ${id}:`, e);
      }
    }
    setEvaluatingClientId(null);
    showToast(`Evaluare în masă finalizată cu succes!`, 'success');
  };

  const handleBulkBlacklist = async () => {
    if (selectedIds.length === 0) return;
    showToast(`Adăugare în Black List pentru ${selectedIds.length} clienți...`, 'info');
    for (const id of selectedIds) {
      try {
        await addClientToBlacklist(id, { reason: 'Adăugare în masă (Bulk Blacklist)', severity: 'Critic' });
        setClients(prev => prev.map(c => c.id === id ? { ...c, is_blacklisted: true, blacklist_reason: 'Bulk Blacklist', blacklist_severity: 'Critic' } : c));
      } catch (e) {
        console.error(`Eroare adăugare blacklist client ${id}:`, e);
      }
    }
    showToast(`${selectedIds.length} clienți au fost adăugați în Black List!`, 'error');
  };

  const loadClients = async () => {
    setLoading(true);
    setApiError("");
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (error) {
      console.error("Failed to connect to backend:", error);
      // Fără mock data. Fără eroare roșie. Doar o listă goală curată.
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleAddClient = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      if (isEditing && newClient.id) {
        await updateClient(newClient.id, newClient);
      } else {
        await createClient(newClient);
      }
      setIsModalOpen(false);
      setIsEditing(false);
      setNewClient({ type: 'PJ', name: '', cui_cnp: '', representative_cnp: '', representative_address: '' });
      loadClients();
    } catch (error) {
      setFormError(error.message || "Eroare la salvare. Verificați datele introduse.");
      console.error(error);
    }
  };

  const handleEditClick = (client) => {
    setNewClient(client);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ isOpen: true, id, isBulk: false });
  };

  const handleCuiBlur = async () => {
    if (!newClient.cui_cnp || newClient.cui_cnp.length < 5 || newClient.type === 'PF') return;
    try {
      const data = await lookupClientByCui(newClient.cui_cnp);
      if (data) {
        setNewClient(prev => ({ 
          ...prev, 
          name: data.name || prev.name,
          address: data.address || prev.address,
          reg_com: data.reg_com || prev.reg_com,
          contact_phone: data.phone || prev.contact_phone,
          caen: data.caen || prev.caen,
          caen_descriere: data.caen_descriere || prev.caen_descriere,
          caen_sectiune: data.caen_sectiune || prev.caen_sectiune
        }));
      }
    } catch (error) {
      console.warn("Could not fetch company data automatically from ANAF.", error);
    }
  };

  const handleOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const [text, facePhoto] = await Promise.all([
        extractTextFromFile(file),
        extractFaceFromIDCard(file)
      ]);
      
      const idData = parseRomanianIDCard(text);
      setNewClient(prev => {
        if (prev.type === 'PJ') {
          return {
            ...prev,
            representative_name: idData.name,
            representative_cnp: idData.cui_cnp,
            representative_address: idData.address,
            id_card_series: idData.id_card_series,
            id_card_number: idData.id_card_number,
            id_card_issued_by: idData.id_card_issued_by,
            id_card_valid_from: idData.id_card_valid_from,
            id_card_valid_until: idData.id_card_valid_until,
            profile_photo: facePhoto || prev.profile_photo
          };
        } else {
          return {
            ...prev,
            name: idData.name,
            cui_cnp: idData.cui_cnp,
            address: idData.address,
            id_card_series: idData.id_card_series,
            id_card_number: idData.id_card_number,
            id_card_issued_by: idData.id_card_issued_by,
            id_card_valid_from: idData.id_card_valid_from,
            id_card_valid_until: idData.id_card_valid_until,
            profile_photo: facePhoto || prev.profile_photo
          };
        }
      });
    } catch (err) {
      console.error(err);
      alert('Eroare la scanarea buletinului: ' + (err.message || err));
    } finally {
      setOcrLoading(false);
      e.target.value = '';
    }
  };

  const handleCUIOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const text = await extractTextFromFile(file);
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      let cui = '';
      let regCom = '';
      let firma = '';
      let address = '';
      
      const cleanCuiText = text.replace(/O/gi, '0').replace(/l/gi, '1').replace(/I/gi, '1');
      const cuiMatch = cleanCuiText.match(/\b(RO)?\s*([0-9]{6,10})\b/);
      if (cuiMatch) {
        cui = (cuiMatch[1] || '') + cuiMatch[2];
      }
      
      const regComMatch = text.match(/[JFCL]\s*\d{1,2}\s*\/\s*\d+\s*\/\s*\d{4}/i);
      if (regComMatch) {
        regCom = regComMatch[0].replace(/\s+/g, '');
      }
      
      const firmaIdx = lines.findIndex(l => l.toUpperCase().includes('FIRMA') || l.toUpperCase().includes('DENUMIRE'));
      if (firmaIdx !== -1 && lines[firmaIdx + 1]) {
        firma = lines[firmaIdx + 1];
        if (firma.toUpperCase().includes('SEDIUL') || firma.length < 3) {
          const sameLineMatch = lines[firmaIdx].match(/(?:FIRMA|DENUMIRE)\s*(.+)/i);
          if (sameLineMatch) firma = sameLineMatch[1].trim();
        }
      }
      
      // Dacă a pus CUI-ul la firmă (din greșeală de OCR)
      if (firma && /^[0-9]+$/.test(firma.replace(/\s+/g, ''))) {
         if (!cui) cui = firma.replace(/\s+/g, '');
         firma = '';
      }
      
      const sediuIdx = lines.findIndex(l => l.toUpperCase().includes('SEDIUL SOCIAL') || l.toUpperCase().includes('SEDIUL'));
      if (sediuIdx !== -1 && lines[sediuIdx + 1]) {
        address = lines[sediuIdx + 1];
        if (lines[sediuIdx + 2] && !lines[sediuIdx + 2].toUpperCase().includes('NUMAR') && !lines[sediuIdx + 2].toUpperCase().includes('COD')) {
           address += ', ' + lines[sediuIdx + 2];
        }
      }

      if (cui) {
        try {
          const anafData = await lookupClientByCui(cui);
          if (anafData) {
             firma = anafData.name || firma;
             address = anafData.address || address;
             regCom = anafData.reg_com || regCom;
          }
        } catch (anafErr) {
          console.warn("ANAF lookup failed post-OCR", anafErr);
        }
      }

      setNewClient(prev => ({
        ...prev,
        name: firma,
        cui_cnp: cui,
        reg_com: regCom,
        address: address,
      }));
    } catch (err) {
      console.error(err);
      alert('Eroare la scanarea buletinului: ' + (err.message || err));
    } finally {
      setOcrLoading(false);
      e.target.value = '';
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedClients.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Extract and clean potential CUI from search query
  const cleanCui = useMemo(() => {
    return searchQuery.trim().replace(/^RO/i, '').trim();
  }, [searchQuery]);

  const isCuiPattern = useMemo(() => {
    return /^\d{4,10}$/.test(cleanCui);
  }, [cleanCui]);

  const existingClientWithCui = useMemo(() => {
    if (!cleanCui) return null;
    return clients.find(c => c.cui_cnp === cleanCui);
  }, [clients, cleanCui]);

  // Click outside search container listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced live ANAF lookup when typing an unmonitored CUI
  useEffect(() => {
    if (isCuiPattern && !existingClientWithCui) {
      setAnafLookupError(null);
      const timer = setTimeout(async () => {
        try {
          setAnafLookupLoading(true);
          const data = await lookupClientByCui(cleanCui);
          if (data && data.name) {
            setAnafLookupResult(data);
            setAnafLookupError(null);
          } else {
            setAnafLookupResult(null);
            setAnafLookupError(`CUI-ul ${cleanCui} nu a fost găsit în registrul public ANAF.`);
          }
        } catch (err) {
          console.warn('ANAF search error:', err);
          setAnafLookupResult(null);
          setAnafLookupError(`Eroare la interogarea ANAF pentru CUI ${cleanCui}.`);
        } finally {
          setAnafLookupLoading(false);
        }
      }, 450);

      return () => clearTimeout(timer);
    } else {
      setAnafLookupResult(null);
      setAnafLookupError(null);
      setAnafLookupLoading(false);
    }
  }, [cleanCui, isCuiPattern, existingClientWithCui]);

  const handleTriggerAnafLookup = async () => {
    if (!cleanCui || !isCuiPattern) return;
    try {
      setAnafLookupLoading(true);
      setAnafLookupError(null);
      const data = await lookupClientByCui(cleanCui);
      if (data && data.name) {
        setAnafLookupResult(data);
        setAnafLookupError(null);
      } else {
        setAnafLookupResult(null);
        setAnafLookupError(`CUI-ul ${cleanCui} nu a fost găsit în registrul public ANAF.`);
      }
    } catch (err) {
      console.warn('Manual ANAF search error:', err);
      setAnafLookupResult(null);
      setAnafLookupError(`Eroare la interogarea ANAF pentru CUI ${cleanCui}.`);
    } finally {
      setAnafLookupLoading(false);
    }
  };

  const handleInstantAddFromAnaf = async (companyData, cuiToAdd) => {
    if (!companyData || !companyData.name) return;
    setAddingFromAnaf(true);
    try {
      const payload = {
        type: 'PJ',
        name: companyData.name,
        cui_cnp: cuiToAdd,
        reg_com: companyData.reg_com || null,
        address: companyData.address || null,
        contact_phone: companyData.phone || null
      };

      const created = await createClient(payload);
      showToast(`Compania ${created.name} a fost adăugată instant din ANAF!`, 'success');

      setSearchQuery(created.cui_cnp);
      setAnafLookupResult(null);
      setIsSearchFocused(false);

      await loadClients();

      // Trigger automatic AI evaluation in the background for risk scoring
      evaluateClient(created.id)
        .then(() => {
          loadClients();
        })
        .catch(e => console.warn('Background evaluation notice:', e));

    } catch (err) {
      console.error('Eroare adăugare instant client ANAF:', err);
      showToast(err.message || 'Eroare la adăugarea companiei din ANAF.', 'error');
    } finally {
      setAddingFromAnaf(false);
    }
  };

  // Pagination and Filtering logic
  const filteredClients = clients.filter(client => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (client.name && client.name.toLowerCase().includes(q)) ||
      (client.cui_cnp && client.cui_cnp.toLowerCase().includes(q)) ||
      (client.address && client.address.toLowerCase().includes(q)) ||
      (client.reg_com && client.reg_com.toLowerCase().includes(q)) ||
      (client.representative_name && client.representative_name.toLowerCase().includes(q))
    );
  });

  const totalItems = filteredClients.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedClients = filteredClients.slice(startIndex, startIndex + itemsPerPage);

  const isAllSelected = paginatedClients.length > 0 && selectedIds.length === paginatedClients.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clienți</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gestionează portofoliul de clienți și evaluările AI.
          </p>
        </div>
        <button 
          onClick={() => {
            setFormError("");
            setIsEditing(false);
            setNewClient({ type: 'PJ', name: '', cui_cnp: '', representative_cnp: '', representative_address: '' });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full hover:bg-primary/90 transition-all shadow-md font-medium cursor-pointer"
        >
          <Plus size={18} />
          <span>Client Nou</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        
        {/* Table Header Controls */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div ref={searchContainerRef} className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Caută în portofoliu sau introdu CUI nou pentru adăugare instant din ANAF..." 
              value={searchQuery}
              onFocus={() => setIsSearchFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
                setIsSearchFocused(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && isCuiPattern && !existingClientWithCui) {
                  e.preventDefault();
                  handleTriggerAnafLookup();
                } else if (e.key === 'Escape') {
                  setIsSearchFocused(false);
                }
              }}
              className="w-full pl-11 pr-28 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-primary focus:border-primary dark:text-white shadow-sm text-sm"
            />

            {/* Quick Action Button & Clear inside search input */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setAnafLookupResult(null);
                    setAnafLookupError(null);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  title="Șterge căutarea"
                >
                  <X size={15} />
                </button>
              )}

              {isCuiPattern && !existingClientWithCui && (
                <button
                  type="button"
                  onClick={handleTriggerAnafLookup}
                  className="px-2.5 py-1 bg-gray-900 hover:bg-black text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 text-xs font-semibold rounded-full flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                  title="Interoghează ANAF"
                >
                  {anafLookupLoading ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Building2 size={13} />
                  )}
                  <span>Caută ANAF</span>
                </button>
              )}
            </div>

            {/* Floating Dropdown Panel for ANAF & Dual Search Results */}
            {isSearchFocused && (anafLookupLoading || anafLookupResult || anafLookupError || (isCuiPattern && !existingClientWithCui)) && (
              <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 animate-in fade-in slide-in-from-top-2">
                {/* Loading State */}
                {anafLookupLoading && (
                  <div className="flex items-center gap-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                    <Loader2 size={18} className="animate-spin text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">Interogare în timp real în registrul public ANAF...</div>
                      <div className="text-xs text-gray-400">Verificare identificatori și status TVA pentru CUI {cleanCui}</div>
                    </div>
                  </div>
                )}

                {/* Found Company in ANAF */}
                {!anafLookupLoading && anafLookupResult && (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800">
                            Găsit în ANAF v9
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            anafLookupResult.status === 'Activa' 
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' 
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {anafLookupResult.status || 'Activa'}
                          </span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            anafLookupResult.tva_activ 
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' 
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {anafLookupResult.tva_activ ? 'Plătitor TVA' : 'Neplătitor TVA'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {anafLookupResult.name}
                        </h4>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span>CUI: <strong className="font-medium text-gray-800 dark:text-gray-200">{cleanCui}</strong></span>
                          {anafLookupResult.reg_com && <span>Reg. Com: {anafLookupResult.reg_com}</span>}
                          {anafLookupResult.caen && <span>CAEN: {anafLookupResult.caen}</span>}
                        </div>
                        {anafLookupResult.address && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            Sediu: {anafLookupResult.address}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Compania nu există în portofoliul local
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInstantAddFromAnaf(anafLookupResult, cleanCui)}
                        disabled={addingFromAnaf}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      >
                        {addingFromAnaf ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Adăugare & Evaluare...</span>
                          </>
                        ) : (
                          <>
                            <Plus size={14} />
                            <span>Adaugă Instant în Portofoliu</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Not Found in ANAF / Error */}
                {!anafLookupLoading && anafLookupError && (
                  <div className="flex items-center justify-between gap-3 text-xs text-red-600 dark:text-red-400 py-1">
                    <span>{anafLookupError}</span>
                    <button
                      type="button"
                      onClick={handleTriggerAnafLookup}
                      className="text-blue-600 hover:text-blue-500 font-semibold underline"
                    >
                      Reîncearcă
                    </button>
                  </div>
                )}

                {/* Prompt to query ANAF if debounce hasn't triggered */}
                {!anafLookupLoading && !anafLookupResult && !anafLookupError && isCuiPattern && !existingClientWithCui && (
                  <div className="flex items-center justify-between gap-3 py-1">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      CUI-ul <strong className="font-medium text-gray-800 dark:text-gray-200">{cleanCui}</strong> nu există în baza locală.
                    </div>
                    <button
                      type="button"
                      onClick={handleTriggerAnafLookup}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Building2 size={13} />
                      <span>Interoghează ANAF</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200 flex-wrap">
              <span className="text-sm font-medium text-gray-500 mr-1">{selectedIds.length} selectate</span>
              <button 
                type="button"
                onClick={handleBulkEvaluate}
                disabled={evaluatingClientId !== null}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                title="Evaluează toți clienții selectați"
              >
                <Sparkles size={14} />
                <span>Bulk Evaluare</span>
              </button>
              <button 
                type="button"
                onClick={handleBulkBlacklist}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-full hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800 transition-colors cursor-pointer shadow-xs"
                title="Adaugă clienții selectați în Black List"
              >
                <ShieldAlert size={14} />
                <span>Bulk Blacklist</span>
              </button>
              <button className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50 transition-colors cursor-pointer shadow-xs">
                <CheckSquare size={14} /> Bulk Edit
              </button>
              <button 
                onClick={() => setDeleteConfirm({ isOpen: true, id: null, isBulk: true })}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 transition-colors cursor-pointer shadow-xs"
              >
                <Trash size={14} /> Bulk Delete
              </button>
            </div>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-900/50 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th scope="col" className="px-6 py-4 w-12">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                  />
                </th>
                <th scope="col" className="px-4 py-4 w-16">Nr. Crt.</th>
                <th scope="col" className="px-6 py-4">Nume Client</th>
                <th scope="col" className="px-6 py-4">CUI / CNP</th>
                <th scope="col" className="px-6 py-4">Tip</th>
                <th scope="col" className="px-6 py-4">Scor Evaluare</th>
                <th scope="col" className="px-6 py-4">Data Adăugării</th>
                <th scope="col" className="px-6 py-4 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-3"></div>
                      Se încarcă clienții...
                    </div>
                  </td>
                </tr>
              ) : apiError ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-red-500 bg-red-50/50 dark:bg-red-900/10">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={24} />
                      <span className="font-medium">{apiError}</span>
                      <button 
                        onClick={loadClients} 
                        className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline font-medium"
                      >
                        Reîncearcă conexiunea
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedClients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                    Nu s-a găsit niciun client. Adaugă unul nou.
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client, idx) => (
                  <tr 
                    key={client.id} 
                    className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50 transition-colors ${selectedIds.includes(client.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800'} ${client.is_blacklisted ? 'bg-red-50/20 dark:bg-red-950/10' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(client.id)}
                        onChange={() => handleSelectRow(client.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-400">{startIndex + idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <Link 
                          to={`/clients/${client.id}`}
                          className="flex items-center gap-3 group cursor-pointer w-fit"
                          title={`Deschide profilul ${client.name}`}
                        >
                          {client.profile_photo ? (
                            <img src={client.profile_photo} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-700 shadow-sm group-hover:ring-2 group-hover:ring-primary/50 transition-all" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 text-xs font-bold uppercase shrink-0 group-hover:border-primary/50 group-hover:text-primary transition-all">
                              {client.name ? client.name.charAt(0) : '?'}
                            </div>
                          )}
                          <span className="group-hover:text-primary group-hover:underline transition-colors font-semibold">
                            {client.name}
                          </span>
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4">{client.cui_cnp}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2">
                        {client.type === 'PJ' ? <Building2 size={16} /> : <User size={16} />}
                        {client.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {client.latest_score !== undefined && client.latest_score !== null ? (
                        <button
                          type="button"
                          onClick={() => openAnalysisModal(client, false)}
                          className="flex items-center gap-2 group cursor-pointer hover:opacity-85 transition-all text-left"
                          title="Click pentru a deschide fereastra cu analiza completă"
                        >
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 shadow-2xs transition-transform group-hover:scale-105 ${
                            client.latest_score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' : 
                            client.latest_score >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800' : 
                            'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {client.latest_score}/100
                          </span>
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-primary group-hover:underline">
                            {client.latest_risk_level || (client.latest_score >= 80 ? 'Scăzut' : client.latest_score >= 50 ? 'Mediu' : 'Critic')}
                          </span>
                        </button>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm font-medium select-none">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{new Date(client.created_at).toLocaleDateString('ro-RO')}</td>
                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                      {/* 1. Evaluare AI Button */}
                      <button 
                        type="button"
                        onClick={() => openAnalysisModal(client, false)}
                        disabled={evaluatingClientId === client.id}
                        className={`p-2 flex items-center justify-center border rounded-full transition-all cursor-pointer shadow-2xs ${
                          evaluatingClientId === client.id 
                            ? 'text-purple-600 border-purple-300 bg-purple-50 dark:bg-purple-950/40 animate-pulse'
                            : 'text-gray-500 hover:text-purple-600 border-gray-300 dark:border-gray-600 rounded-full hover:bg-purple-50 dark:hover:bg-purple-950/30'
                        }`}
                        title={evaluatingClientId === client.id ? 'Se evaluează...' : `Deschide Fereastra cu Analiza AI: ${client.name}`}
                      >
                        {evaluatingClientId === client.id ? (
                          <Loader2 size={18} className="animate-spin text-purple-600" />
                        ) : (
                          <Sparkles size={18} strokeWidth={1.5} />
                        )}
                      </button>

                      {/* 2. Black List Toggle Button */}
                      <button 
                        type="button"
                        onClick={() => handleBlacklistClick(client)}
                        className={`p-2 flex items-center justify-center border rounded-full transition-all cursor-pointer shadow-2xs ${
                          client.is_blacklisted 
                            ? 'text-red-600 border-red-300 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/40' 
                            : 'text-gray-500 hover:text-red-600 border-gray-300 dark:border-gray-600 rounded-full hover:bg-red-50 dark:hover:bg-red-950/30'
                        }`}
                        title={client.is_blacklisted ? `Client în Black List (${client.blacklist_reason || 'Risc Critic'}). Click pentru deblocare.` : `Adaugă în Black List: ${client.name}`}
                      >
                        <ShieldAlert size={18} strokeWidth={1.5} className={client.is_blacklisted ? "text-red-600" : ""} />
                      </button>

                      {/* 3. Vizualizare */}
                      <Link 
                        to={`/clients/${client.id}`} 
                        className="p-2 flex items-center justify-center text-gray-500 hover:text-primary border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-2xs"
                        title="Vizualizare Dosar"
                      >
                        <Eye size={18} strokeWidth={1.5} />
                      </Link>

                      {/* 4. Editare */}
                      <button 
                        onClick={() => handleEditClick(client)}
                        className="p-2 flex items-center justify-center text-gray-500 hover:text-blue-500 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-2xs"
                        title="Editare"
                      >
                        <Edit2 size={18} strokeWidth={1.5} />
                      </button>

                      {/* 5. Ștergere */}
                      <button 
                        onClick={() => handleDeleteClick(client.id)}
                        className="p-2 flex items-center justify-center text-gray-500 hover:text-red-500 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-2xs"
                        title="Ștergere"
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>Afișează</span>
              <select 
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full px-3 py-1 text-sm focus:ring-primary focus:border-primary dark:text-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Total: {totalItems}</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500 dark:text-gray-400">
              Pagina {currentPage} din {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-700 dark:text-gray-300"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-xl w-full border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{isEditing ? 'Editare Client' : 'Adaugă Client Nou'}</h3>
              <button onClick={() => { setIsModalOpen(false); setIsEditing(false); setNewClient({ type: 'PJ', name: '', cui_cnp: '' }); }} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <form id="add-client-form" onSubmit={handleAddClient} className="space-y-5">
                {formError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Tip Client</label>
                <div className="flex gap-4 items-center">
                  <select 
                    value={newClient.type} 
                    onChange={e => setNewClient({...newClient, type: e.target.value})}
                    className="block flex-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="PJ">Persoană Juridică (Firma)</option>
                    <option value="PF">Persoană Fizică</option>
                  </select>
                  
                  <div className="flex items-center space-x-2 ml-auto">
                    {newClient.type === 'PJ' && (
                      <label className="cursor-pointer py-2 px-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 text-sm font-medium transition-colors text-blue-700 dark:text-blue-300 flex items-center gap-2 shadow-sm whitespace-nowrap">
                        {ocrLoading ? <span className="animate-pulse">Se scanează...</span> : (
                          <>
                            <FileText size={16} />
                            <span>CUI</span>
                          </>
                        )}
                        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleCUIOCR} disabled={ocrLoading} />
                      </label>
                    )}
                    <label className="cursor-pointer py-2 px-3 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 text-sm font-medium transition-colors dark:text-white flex items-center gap-2 shadow-sm whitespace-nowrap">
                      {ocrLoading ? <span className="animate-pulse">Se scanează...</span> : (
                        <>
                          <CreditCard size={16} />
                          <span>Buletin</span>
                        </>
                      )}
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleOCR} disabled={ocrLoading} />
                    </label>
                  </div>
                </div>
              </div>
              {newClient.type === 'PJ' ? (
                <>
                  <div className="col-span-2 flex items-center justify-between mt-2 border-b pb-2 dark:border-gray-700">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                      Date Companie
                    </div>
                    <div className="flex items-center gap-3">
                      {newClient.profile_photo && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">Logo:</span>
                          <img src={newClient.profile_photo} alt="Logo preview" className="w-8 h-8 rounded-full object-cover border border-gray-300 shadow-sm" />
                        </div>
                      )}
                      <label className="cursor-pointer text-xs flex items-center gap-1 text-primary hover:text-blue-600 transition-colors">
                        <Upload size={14} />
                        <span>Încarcă Logo</span>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                           const file = e.target.files[0];
                           if (!file) return;
                           const reader = new FileReader();
                           reader.onload = (event) => {
                             setNewClient({...newClient, profile_photo: event.target.result});
                           };
                           reader.readAsDataURL(file);
                        }} />
                      </label>
                      <button 
                        type="button"
                        onClick={() => {
                          const url = prompt("Introdu link-ul către logo (ex: https://site.com/logo.png):");
                          if (url) {
                            setNewClient({...newClient, profile_photo: url});
                          }
                        }}
                        className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <LinkIcon size={14} />
                        <span>Link</span>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">CUI</label>
                      <input 
                        type="text" 
                        required
                        value={newClient.cui_cnp}
                        onChange={e => setNewClient({...newClient, cui_cnp: e.target.value})}
                        onBlur={handleCuiBlur}
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Nr. Reg. Com.</label>
                      <input 
                        type="text" 
                        value={newClient.reg_com || ''}
                        onChange={e => setNewClient({...newClient, reg_com: e.target.value})}
                        placeholder="Ex: J40/1234/2020"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Denumire Companie <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="Se completează automat din ANAF"
                      value={newClient.name}
                      onChange={e => setNewClient({...newClient, name: e.target.value})}
                      className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Adresă / Sediu Social</label>
                    <input 
                      type="text" 
                      value={newClient.address || ''}
                      onChange={e => setNewClient({...newClient, address: e.target.value})}
                      placeholder="Adresa completă"
                      className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>

                  {newClient.caen && (
                    <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/70 dark:border-blue-800/60 shadow-xs flex items-start gap-2.5">
                      <div className="px-2 py-1 rounded-lg bg-blue-600 text-white font-bold text-xs shrink-0 shadow-xs">
                        CAEN {newClient.caen}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-900 dark:text-white leading-snug">
                          {newClient.caen_descriere || getCaenDescription(newClient.caen) || "Activitate economică identificată"}
                        </div>
                        {newClient.caen_sectiune && (
                          <div className="text-[10px] text-blue-700 dark:text-blue-300 font-bold mt-0.5">
                            Secțiunea {newClient.caen_sectiune}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="col-span-2 flex items-center justify-between border-b pb-2 mt-6 dark:border-gray-700">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                      Date Reprezentant Legal
                    </div>
                    {newClient.profile_photo && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Poză profil:</span>
                        <img src={newClient.profile_photo} alt="Profile preview" className="w-8 h-8 rounded-full object-cover border border-gray-300 shadow-sm" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Nume Reprezentant</label>
                    <input 
                      type="text" 
                      value={newClient.representative_name || ''}
                      onChange={e => setNewClient({...newClient, representative_name: e.target.value})}
                      placeholder="Nume Reprezentant (sau folosește OCR)"
                      className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">CNP Reprezentant</label>
                      <input 
                        type="text" 
                        value={newClient.representative_cnp || ''}
                        onChange={e => setNewClient({...newClient, representative_cnp: e.target.value})}
                        placeholder="Ex: 1810806..."
                        maxLength={13}
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Serie Buletin</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_series || ''}
                        onChange={e => setNewClient({...newClient, id_card_series: e.target.value.toUpperCase()})}
                        placeholder="Ex: RX"
                        maxLength={2}
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Număr Buletin</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_number || ''}
                        onChange={e => setNewClient({...newClient, id_card_number: e.target.value})}
                        placeholder="Ex: 123456"
                        maxLength={6}
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Adresă Domiciliu (Reprezentant)</label>
                      <input 
                        type="text" 
                        value={newClient.representative_address || ''}
                        onChange={e => setNewClient({...newClient, representative_address: e.target.value})}
                        placeholder="Adresa din buletin"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Emis de</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_issued_by || ''}
                        onChange={e => setNewClient({...newClient, id_card_issued_by: e.target.value})}
                        placeholder="Ex: SPCLEP Bucuresti Sec 1"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Valabil de la</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_valid_from || ''}
                        onChange={e => setNewClient({...newClient, id_card_valid_from: e.target.value})}
                        placeholder="DD.MM.YYYY"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Valabil până la</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_valid_until || ''}
                        onChange={e => setNewClient({...newClient, id_card_valid_until: e.target.value})}
                        placeholder="DD.MM.YYYY"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="col-span-2 flex items-center justify-between border-b pb-2 mt-2 dark:border-gray-700">
                    <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                      Date Persoană Fizică
                    </div>
                    {newClient.profile_photo && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Poză profil:</span>
                        <img src={newClient.profile_photo} alt="Profile preview" className="w-8 h-8 rounded-full object-cover border border-gray-300 shadow-sm" />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">CNP</label>
                    <input 
                      type="text" 
                      required
                      value={newClient.cui_cnp}
                      onChange={e => setNewClient({...newClient, cui_cnp: e.target.value})}
                      className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Nume Complet <span className="text-red-500">*</span></label>
                    <input 
                      type="text" 
                      required
                      placeholder="Nume și prenume"
                      value={newClient.name}
                      onChange={e => setNewClient({...newClient, name: e.target.value})}
                      className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Adresă Domiciliu</label>
                    <input 
                      type="text" 
                      value={newClient.address || ''}
                      onChange={e => setNewClient({...newClient, address: e.target.value})}
                      placeholder="Adresa completă"
                      className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="col-span-2 text-xs font-bold text-gray-500 dark:text-gray-400 border-b pb-2 dark:border-gray-700 uppercase">Date Buletin (C.I.)</div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Serie</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_series || ''}
                        onChange={e => setNewClient({...newClient, id_card_series: e.target.value.toUpperCase()})}
                        placeholder="Ex: RX"
                        maxLength={2}
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Număr</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_number || ''}
                        onChange={e => setNewClient({...newClient, id_card_number: e.target.value})}
                        placeholder="Ex: 123456"
                        maxLength={6}
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Emis de</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_issued_by || ''}
                        onChange={e => setNewClient({...newClient, id_card_issued_by: e.target.value})}
                        placeholder="Ex: SPCLEP Bucuresti Sec 1"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Valabil de la</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_valid_from || ''}
                        onChange={e => setNewClient({...newClient, id_card_valid_from: e.target.value})}
                        placeholder="DD.MM.YYYY"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Valabil până la</label>
                      <input 
                        type="text" 
                        value={newClient.id_card_valid_until || ''}
                        onChange={e => setNewClient({...newClient, id_card_valid_until: e.target.value})}
                        placeholder="DD.MM.YYYY"
                        className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                  </div>
                </>
              )}
              </form>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 shrink-0 bg-gray-50 dark:bg-gray-800/50 rounded-b-3xl">
              <button type="button" onClick={() => { setIsModalOpen(false); setIsEditing(false); setNewClient({ type: 'PJ', name: '', cui_cnp: '' }); }} className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                Anulare
              </button>
              <button type="submit" form="add-client-form" className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary/90 transition-colors shadow-sm">
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center text-gray-900 dark:text-gray-200">
                <Trash size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirmare Ștergere</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {deleteConfirm.isBulk 
                  ? "Ești sigur că vrei să ștergi clienții selectați? Această acțiune este ireversibilă." 
                  : "Ești sigur că vrei să ștergi acest client? Această acțiune este ireversibilă."}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-8">
              <button 
                onClick={() => setDeleteConfirm({ isOpen: false, id: null, isBulk: false })}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Anulează
              </button>
              <button 
                onClick={async () => {
                  try {
                    if (deleteConfirm.isBulk) {
                      for (const clientId of selectedIds) {
                        await deleteClient(clientId);
                      }
                      setSelectedIds([]);
                    } else if (deleteConfirm.id) {
                      await deleteClient(deleteConfirm.id);
                    }
                    loadClients();
                    setDeleteConfirm({ isOpen: false, id: null, isBulk: false });
                  } catch (error) {
                    console.error("Eroare la ștergere:", error);
                    setApiError("Eroare la ștergere. Posibil clientul selectat are alte date asociate.");
                    setDeleteConfirm({ isOpen: false, id: null, isBulk: false });
                  }
                }}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors shadow-sm"
              >
                Da, Șterge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adăugare în Black List */}
      {blacklistModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/40 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                <ShieldAlert size={26} strokeWidth={1.8} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Adăugare în Black List</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Clientul <span className="font-semibold text-gray-900 dark:text-white">{blacklistModal.client?.name}</span> va fi marcat ca entitate cu risc critic și blocat pentru operațiuni automate.
                </p>
              </div>
            </div>

            <div className="space-y-4 my-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Nivel Severitate
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Critic', 'Înalt', 'Mediu'].map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setBlacklistModal(prev => ({ ...prev, severity: sev }))}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        blacklistModal.severity === sev
                          ? sev === 'Critic' 
                            ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                            : sev === 'Înalt'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-yellow-500 text-white border-yellow-500 shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Motiv Blocare / Notă Risc
                </label>
                <textarea
                  rows={3}
                  value={blacklistModal.reason}
                  onChange={(e) => setBlacklistModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Ex: Datorii mari neachitate, litigii comerciale, risc de insolvență..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setBlacklistModal({ isOpen: false, client: null, reason: '', severity: 'Critic', loading: false })}
                disabled={blacklistModal.loading}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/70 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={confirmAddToBlacklist}
                disabled={blacklistModal.loading}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-rose-600 rounded-full hover:bg-rose-700 active:bg-rose-800 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {blacklistModal.loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Se salvează...</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={16} />
                    <span>Blochează în Black List</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Scoate din Black List */}
      {unblacklistModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700 text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-3">
              <ShieldBan size={28} strokeWidth={1.8} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Deblocare Client</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Ești sigur că vrei să scoți clientul <span className="font-semibold text-gray-900 dark:text-white">{unblacklistModal.client?.name}</span> din Black List?
            </p>
            {unblacklistModal.client?.blacklist_reason && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl text-xs text-gray-600 dark:text-gray-300 text-left border border-gray-200 dark:border-gray-600">
                <span className="font-semibold block text-gray-700 dark:text-gray-200 mb-0.5">Motiv anterior:</span>
                {unblacklistModal.client.blacklist_reason}
              </div>
            )}
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setUnblacklistModal({ isOpen: false, client: null, loading: false })}
                disabled={unblacklistModal.loading}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/70 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={confirmRemoveFromBlacklist}
                disabled={unblacklistModal.loading}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {unblacklistModal.loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Se deblochează...</span>
                  </>
                ) : (
                  <span>Deblochează</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fereastra cu Analiza AI (Interactive Analysis Window) Modal */}
      {analysisModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center shadow-xs shrink-0">
                  <Sparkles size={24} strokeWidth={1.8} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Fereastră Analiză & Risc AI
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                      OSINT Live
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Client: <strong className="text-gray-800 dark:text-gray-200">{analysisModal.client?.name}</strong> • CUI/CNP: <span className="">{analysisModal.client?.cui_cnp}</span> • {analysisModal.client?.type}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setAnalysisModal(prev => ({ ...prev, isOpen: false }))}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                title="Închide fereastra"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {analysisModal.loading ? (
                /* LIVE EVALUATION IN PROGRESS STEPPER */
                <div className="py-4 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 text-purple-600 relative mx-auto">
                      <Loader2 size={32} className="animate-spin text-purple-600" />
                      <Sparkles size={16} className="absolute -top-1 -right-1 text-purple-500 animate-pulse" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      Se execută scanarea inteligentă OSINT & Analiza AI...
                    </h4>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      Interogăm în timp real bazele de date guvernamentale, just.ro și Registrul Comerțului pentru profilarea completă a riscului.
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-100 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 h-full transition-all duration-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(15, analysisModal.currentStep * 20))}%` }}
                    />
                  </div>

                  {/* Stepper items */}
                  <div className="space-y-3 max-w-lg mx-auto">
                    {[
                      { step: 1, title: "Interogare servere ANAF & Registrul Comerțului", desc: "Verificare CIF, plătitor TVA, TVA la încasare, stare inactivitate fiscală." },
                      { step: 2, title: "Scanare Portal Just.ro & Insolvențe (BPI)", desc: "Căutare automată litigii civile, executări silite, dosare de faliment." },
                      { step: 3, title: "Analiză Bilanț Financiar & Indicatori Solvabilitate", desc: "Calcul cifră afaceri, profit net, marjă de profit și datorii restante." },
                      { step: 4, title: "Cartografiere Rețea Asociați", desc: "Identificare administratori, asociați și conectare companii înrudite." },
                      { step: 5, title: "Sinteză Algoritm Neuronal AI & Calcul Matrice Risc", desc: "Ponderare riscuri, clasificare scor de bonitate 0-100 și recomandare." },
                    ].map((item) => {
                      const isDone = analysisModal.currentStep > item.step;
                      const isCurrent = analysisModal.currentStep === item.step;
                      return (
                        <div 
                          key={item.step} 
                          className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3.5 ${
                            isCurrent 
                              ? 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700 shadow-xs ring-1 ring-purple-500/20'
                              : isDone
                              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                              : 'bg-gray-50/50 dark:bg-gray-800/40 border-gray-100 dark:border-gray-700 opacity-60'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {isDone ? (
                              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                                <Check size={14} strokeWidth={2.5} />
                              </div>
                            ) : isCurrent ? (
                              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center">
                                <Loader2 size={14} className="animate-spin" />
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 flex items-center justify-center text-xs font-bold">
                                {item.step}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h5 className={`text-xs font-bold ${
                                isCurrent ? 'text-purple-900 dark:text-purple-200' : isDone ? 'text-emerald-900 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {item.title}
                              </h5>
                              <span className="text-[10px] uppercase font-bold tracking-wider">
                                {isDone ? (
                                  <span className="text-emerald-600 dark:text-emerald-400">Finalizat</span>
                                ) : isCurrent ? (
                                  <span className="text-purple-600 dark:text-purple-400 animate-pulse">În procesare...</span>
                                ) : (
                                  <span className="text-gray-400">În așteptare</span>
                                )}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : analysisModal.error ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-14 h-14 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
                    <AlertCircle size={28} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-white">Nu s-a putut finaliza evaluarea</h4>
                    <p className="text-xs text-red-500 mt-1">{analysisModal.error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => runModalEvaluation(analysisModal.client)}
                    className="px-5 py-2 text-xs font-semibold text-white bg-primary rounded-full hover:bg-primary/90 transition-colors inline-flex items-center gap-2 cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>Reîncearcă Evaluarea</span>
                  </button>
                </div>
              ) : analysisModal.evaluation ? (
                /* EVALUATION RESULTS DASHBOARD */
                <div className="space-y-6">
                  {/* Score Hero Banner */}
                  {(() => {
                    const score = analysisModal.evaluation.score;
                    const riskLevel = analysisModal.evaluation.risk_level || (score >= 80 ? 'Scăzut' : score >= 50 ? 'Mediu' : 'Critic');
                    const isGood = score >= 75;
                    const isMedium = score >= 50 && score < 75;
                    const isBad = score < 50;

                    let rawData = {};
                    try {
                      rawData = typeof analysisModal.evaluation.raw_financial_data === 'string'
                        ? JSON.parse(analysisModal.evaluation.raw_financial_data)
                        : (analysisModal.evaluation.raw_financial_data || {});
                    } catch(e) { rawData = {}; }

                    return (
                      <>
                        <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-center gap-6 justify-between ${
                          isGood 
                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' 
                            : isMedium 
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800' 
                            : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                        }`}>
                          <div className="flex items-center gap-5">
                            {/* Circular Score Gauge */}
                            <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                  className="text-gray-200 dark:text-gray-700"
                                  strokeWidth="3.5"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className={isGood ? 'text-emerald-500' : isMedium ? 'text-amber-500' : 'text-rose-500'}
                                  strokeDasharray={`${score}, 100`}
                                  strokeWidth="3.5"
                                  strokeLinecap="round"
                                  stroke="currentColor"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <div className="absolute flex flex-col items-center justify-center text-center">
                                <span className={`text-2xl font-black ${isGood ? 'text-emerald-600 dark:text-emerald-400' : isMedium ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {score}
                                </span>
                                <span className="text-[9px] font-bold text-gray-400 -mt-1">/ 100</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-2xs ${
                                  isGood 
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300' 
                                    : isMedium 
                                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300' 
                                    : 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300'
                                }`}>
                                  Nivel: {riskLevel}
                                </span>
                                {analysisModal.client?.is_blacklisted && (
                                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white flex items-center gap-1 shadow-2xs">
                                    <ShieldAlert size={12} /> Black List
                                  </span>
                                )}
                              </div>
                              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                                {isGood ? 'Client Eligibil & Solvabil' : isMedium ? 'Risc Moderat — Atenție la Termene' : 'Avertisment Risc Critic — Interdicție Ofertare'}
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-300 max-w-md">
                                {isGood 
                                  ? 'Compania prezintă indicatori financiari sănătoși, fără dosare grave de insolvență sau alerte ANAF.' 
                                  : isMedium 
                                  ? 'Există unele litigii comerciale sau întârzieri. Se recomandă garanție contractuală adițională.' 
                                  : 'S-au detectat datorii restante, potențiale litigii de executare sau insolvență în buletinele oficiale.'}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                            <button
                              type="button"
                              onClick={() => runModalEvaluation(analysisModal.client)}
                              className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <RefreshCw size={13} />
                              <span>Re-evaluează (Live)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBlacklistClick(analysisModal.client)}
                              className={`px-4 py-2 text-xs font-semibold rounded-full border transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer ${
                                analysisModal.client?.is_blacklisted 
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                              }`}
                            >
                              <ShieldAlert size={13} />
                              <span>{analysisModal.client?.is_blacklisted ? 'Deblochează Client' : 'Adaugă în Black List'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Executive AI Summary Box */}
                        {analysisModal.evaluation.ai_summary && (
                          <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800/40 rounded-2xl space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                              <Sparkles size={14} className="text-purple-600" />
                              <span>Raport Sinteză AI (Diagnostic Integrat)</span>
                            </div>
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                              {analysisModal.evaluation.ai_summary}
                            </p>
                          </div>
                        )}

                        {/* Diagnostic Grid - 4 Pillars */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 1. Fiscalitate & ANAF */}
                          <div className="p-4 bg-gray-50/80 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-2">
                              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <Building2 size={14} className="text-blue-500" /> Stare Fiscală & ANAF
                              </span>
                              <span className="text-[10px] font-semibold text-gray-500">
                                {rawData.anaf?.nrRegCom || 'RegCom'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                              <div>
                                <span className="text-gray-400 block text-[11px]">Plătitor TVA:</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                  {rawData.anaf?.tva ? 'Da' : 'Nu'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[11px]">TVA Încasare:</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                  {rawData.anaf?.tva_incasare ? 'Da' : 'Nu'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[11px]">Stare Activitate:</span>
                                <span className={`font-semibold ${rawData.anaf?.stare_inactiv ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {rawData.anaf?.stare_inactiv ? 'Inactivă' : 'Activă'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[11px]">Sediu Social:</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200 truncate block" title={rawData.anaf?.adresa || analysisModal.client?.address}>
                                  {rawData.anaf?.adresa || analysisModal.client?.address || 'Înregistrat'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 2. Litigii & Dosare Just.ro / BPI */}
                          <div className="p-4 bg-gray-50/80 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-2">
                              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <Scale size={14} className="text-amber-500" /> Litigii & Just.ro (BPI)
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                rawData.bpi?.has_insolvency 
                                  ? 'bg-red-100 text-red-700' 
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {rawData.bpi?.has_insolvency ? 'Alerte BPI' : 'Fără Insolvențe'}
                              </span>
                            </div>
                            <div className="space-y-1.5 text-xs pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">Dosare Instanță Portal Just:</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {rawData.court_cases?.length || rawData.dosare?.length || 0} dosare
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">Proceduri de Insolvență (BPI):</span>
                                <span className={`font-bold ${rawData.bpi?.has_insolvency ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {rawData.bpi?.has_insolvency ? `${rawData.bpi?.count || 1} cazuri active` : '0 cazuri'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">Risc Executare Silită:</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">
                                  {score < 50 ? 'Risc Ridicat' : 'Risc Minim'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 3. Situație Financiară (Bilanț) */}
                          <div className="p-4 bg-gray-50/80 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-2">
                              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-emerald-500" /> Bilanț Financiar
                              </span>
                              <span className="text-[10px] font-semibold text-gray-500">
                                An: {rawData.balance?.an || '2024'}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                              <div>
                                <span className="text-gray-400 block text-[11px]">Cifră de Afaceri:</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                  {rawData.balance?.cifra_afaceri 
                                    ? `${Number(rawData.balance.cifra_afaceri).toLocaleString('ro-RO')} RON` 
                                    : (rawData.anaf?.cifra_afaceri ? `${Number(rawData.anaf.cifra_afaceri).toLocaleString('ro-RO')} RON` : 'Confidențial')}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[11px]">Profit / Pierdere:</span>
                                <span className={`font-semibold ${rawData.balance?.pierdere_neta ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {rawData.balance?.profit_net 
                                    ? `+${Number(rawData.balance.profit_net).toLocaleString('ro-RO')} RON` 
                                    : (rawData.balance?.pierdere_neta ? `-${Number(rawData.balance.pierdere_neta).toLocaleString('ro-RO')} RON` : 'Nespecificat')}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[11px]">Număr Angajați:</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                  {rawData.balance?.numar_mediu_angajati || rawData.balance?.angajati || '1-5'}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[11px]">Datorii Totale:</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">
                                  {rawData.balance?.datorii ? `${Number(rawData.balance.datorii).toLocaleString('ro-RO')} RON` : 'În parametri'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 4. Rețea Asociați */}
                          <div className="p-4 bg-gray-50/80 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-2xl space-y-2">
                            <div className="flex items-center justify-between border-b border-gray-200/60 dark:border-gray-700/60 pb-2">
                              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                <Activity size={14} className="text-purple-500" /> Rețea Asociați
                              </span>
                              <span className="text-[10px] font-semibold text-gray-500">
                                Conexiuni OSINT
                              </span>
                            </div>
                            <div className="space-y-1.5 text-xs pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">Asociați & Administratori:</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {(rawData.personnel?.length || rawData.administrators?.length || 1)} persoane cheie
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">Firme Conectate în Rețea:</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {rawData.admin_networks?.length || 0} companii
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">Risc Fraudă / Fantomă:</span>
                                <span className={`font-semibold ${score < 40 ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {score < 40 ? 'Suspiciune Ridicată' : 'Risc Redus'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
              <Link
                to={`/clients/${analysisModal.client?.id}`}
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1.5"
              >
                <span>Deschide Dosar Detaliat Client</span>
                <ExternalLink size={14} />
              </Link>
              <button
                type="button"
                onClick={() => setAnalysisModal(prev => ({ ...prev, isOpen: false }))}
                className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              >
                Închide Fereastra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[120] animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border backdrop-blur-md ${
            toastMessage.type === 'error'
              ? 'bg-rose-50/95 dark:bg-rose-950/90 text-rose-900 dark:text-rose-100 border-rose-200 dark:border-rose-800'
              : toastMessage.type === 'info'
              ? 'bg-purple-50/95 dark:bg-purple-950/90 text-purple-900 dark:text-purple-100 border-purple-200 dark:border-purple-800'
              : 'bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800'
          }`}>
            {toastMessage.type === 'error' ? (
              <ShieldAlert className="text-rose-600 dark:text-rose-400 shrink-0" size={20} />
            ) : toastMessage.type === 'info' ? (
              <Sparkles className="text-purple-600 dark:text-purple-400 shrink-0 animate-spin" size={20} />
            ) : (
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
            )}
            <span className="text-sm font-medium">{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsList;
