import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  X, Send, Sparkles, RefreshCw, 
  TrendingUp, ShieldAlert, FileText, ArrowRight,
  Trash2, Building2, Maximize2, Minimize2,
  Car, Layers, Search, PanelRight, CornerDownLeft, MapPin, ChevronRight, Plus,
  Copy, Check, FileDown, Gauge, Wrench, Lock, Activity, Compass, FileCheck,
  ExternalLink
} from 'lucide-react';
import { AxisAiIcon } from './AxisAiLogo';
import { sendAssistantMessage, fetchSuggestedPrompts, evaluateCompanyByCui } from '../services/api';
import CompanyIntelModal from './CompanyIntelModal';
import PublicDeepResearchModal from './PublicDeepResearchModal';
import { exportCopilotMessagePdf } from '../utils/copilotPdfExport';
import useAuthStore from '../store/authStore';

const stripEmojis = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA70}-\u{1FAFF}\u{2300}-\u{23FF}\u{2B50}\u{FE0F}\u{200D}]/gu, '').replace(/[ \t]{2,}/g, ' ');
};

const INITIAL_MESSAGES = [
  {
    id: 'welcome',
    sender: 'assistant',
    text: 'Salut! Sunt **Axis Copilot**, ofițerul tău executiv de analiză faptică, risc financiar, securitate transfrontalieră și telemetrie flotă.\n\nCu ce te pot ajuta astăzi?\n* **Securitate Flotă & Graniță:** Supraveghere Watchlist, detecție ieșiri neautorizate din țară și alerte de frontieră.\n* **Analiză Comportamentală AI:** Monitorizare tipare deplasare, rute nocturne atipice și risc de sustragere.\n* **Audit Kilometraj Contracte:** Telemetrie live pe contracte și identificare depășiri de plafon facturabile.\n* **Protocol Imobilizare Motor:** Ghid de securitate telemetrică și decuplare demaror la distanță (CAN-bus Safe-Cut).\n* **Briefing Executiv Matinal:** Rata de utilizare flotă, unități disponibile și sinteza de risc pe ziua în curs.\n* **Mentenanță & Service Care:** Revizii corelate cu odometrul GPS și alerte polițe ITP/RCA/CASCO.\n* **Analiză Financiară Faptică:** Verificare instant ANAF, ONRC, BPI, bilanțuri 5 ani și dosare comitet credit.',
    actions: [
      { label: "Risc Graniță & Watchlist", type: "PROMPT", prompt: "Ce mașini sunt pe Watchlist și ce alerte de graniță avem active?" },
      { label: "Analiză Comportamentală", type: "PROMPT", prompt: "Analizează anomaliile de comportament ale șoferilor, rutele atipice și riscul de sustragere" },
      { label: "Briefing Executiv Flotă", type: "PROMPT", prompt: "Fă un briefing executiv matinal pentru conducerea flotei și starea generală de azi" },
      { label: "Audit Kilometraj Contracte", type: "PROMPT", prompt: "Fă un audit de kilometraj pe contractele active și arată-mi depășirile de plafon" },
      { label: "Protocol Imobilizare Motor", type: "PROMPT", prompt: "Care este procedura și starea de imobilizare motor la distanță pentru vehiculele cu risc?" },
      { label: "Scadențe Service & Revizii", type: "PROMPT", prompt: "Ce revizii sunt depășite și ce scadențe de service avem la flotă?" }
    ]
  }
];


export const AxisAiCopilot = () => {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);
  
  // Modal states for direct in-app action execution
  const [companyModal, setCompanyModal] = useState(null); // { cui, name }
  const [deepResearchTarget, setDeepResearchTarget] = useState(null); // { id, name, cui }
  const [copiedId, setCopiedId] = useState(null);
  const [exportingPdfId, setExportingPdfId] = useState(null);

  const handleCopyText = async (text, id) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleExportPdf = async (text, id) => {
    try {
      setExportingPdfId(id);
      await exportCopilotMessagePdf(text, {
        clientName: companyModal?.name,
        clientCui: companyModal?.cui
      });
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Eroare la exportul PDF. Te rugăm să reîncerci.');
    } finally {
      setExportingPdfId(null);
    }
  };

  const handleCloseCopilot = () => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {
        // ignore
      }
    }
    setIsOpen(false);
    setLoading(false);
    setInputValue('');
    setMessages(INITIAL_MESSAGES);
    setCompanyModal(null);
  };

  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const conversationContainerRef = useRef(null);
  const latestMessageRef = useRef(null);
  const lastUserMessageRef = useRef(null);
  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Progressive loading steps
  useEffect(() => {
    let interval = null;
    if (loading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % 3);
      }, 3000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Extract client ID if user is on /clients/:id
  const clientId = useMemo(() => {
    const match = location.pathname.match(/\/clients\/(\d+)/);
    return match ? Number(match[1]) : null;
  }, [location.pathname]);

  // Load contextual prompts
  useEffect(() => {
    fetchSuggestedPrompts(clientId)
      .then(res => setSuggestedPrompts(res.prompts || []))
      .catch(() => setSuggestedPrompts([]));
  }, [clientId, location.pathname]);

  // Global vehicle click navigation handler
  useEffect(() => {
    window.__axisNavigateVehicle = (plate) => {
      if (plate) {
        navigate(`/vehicles/${encodeURIComponent(plate.trim())}`);
      }
    };
    return () => {
      delete window.__axisNavigateVehicle;
    };
  }, [navigate]);

  // Scroll so the new message starts at the top (without jumping to the bottom or scrolling window)
  useEffect(() => {
    if (!isOpen || messages.length <= 1) return;

    const frameId = requestAnimationFrame(() => {
      const container = conversationContainerRef.current;
      if (!container) return;

      const lastMsg = messages[messages.length - 1];

      // When assistant responds with analysis, scroll to the BEGINNING of the message
      // so the user reads from the top instead of being pushed to the bottom of the page
      if (lastMsg.sender === 'assistant' && latestMessageRef.current) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = latestMessageRef.current.getBoundingClientRect();
        const targetScrollTop = container.scrollTop + (targetRect.top - containerRect.top) - 24;
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
      } else if (lastMsg.sender === 'user' && lastUserMessageRef.current) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = lastUserMessageRef.current.getBoundingClientRect();
        const targetScrollTop = container.scrollTop + (targetRect.top - containerRect.top) - 16;
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        });
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [messages.length, isOpen]);

  // Focus textarea when opened without scrolling the page
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus({ preventScroll: true });
      }, 150);
    }
  }, [isOpen]);

  // Reset conversation and close copilot when navigating away/changing page
  useEffect(() => {
    handleCloseCopilot();
  }, [location.pathname]);

  // Global keyboard shortcuts (Escape to close, Cmd+K / Ctrl+K to toggle)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleCloseCopilot();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          handleCloseCopilot();
        } else {
          setIsOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputValue;
    if (!textToSend || !textToSend.trim()) return;

    // Anulăm cererea anterioară dacă există una în derulare
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (e) {
        // ignore
      }
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputValue('');
    setLoading(true);

    try {
      const response = await sendAssistantMessage({
        query: textToSend.trim(),
        clientId: clientId,
        context: {
          current_route: location.pathname,
          client_id: clientId,
          history: messages.slice(-8).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            text: m.text
          }))
        },
        signal: controller.signal
      });

      const assistantMsg = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: response.reply || 'Am procesat solicitarea ta.',
        actions: response.actions || [],
        dataSummary: response.data_summary || null,
        matchedCompanies: response.matched_companies || null
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `A apărut o problemă la interogare: ${err.message || 'Eroare necunoscută'}.`,
          actions: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateCompany = async (targetCui, targetName = '') => {
    try {
      const cleanCui = String(targetCui).trim().toUpperCase().replace(/^RO/, '').trim();
      const res = await evaluateCompanyByCui(cleanCui, false);
      if (res?.client_id) {
        setCompanyModal(null);
        handleCloseCopilot();
        navigate(`/clients/${res.client_id}?tab=investigation`);
      }
      return res;
    } catch (err) {
      console.error('Eroare evaluare companie:', err);
      throw err;
    }
  };

  const handleActionClick = (action) => {
    if (!action) return;

    if (action.type === 'NAVIGATE') {
      navigate(action.url);
    } else if (action.type === 'OPEN_VEHICLE') {
      navigate(`/vehicles/${encodeURIComponent(action.vehicleId || action.plate)}`);
    } else if (action.type === 'OPEN_TAB') {
      const targetId = action.clientId || clientId;
      if (targetId) {
        navigate(`/clients/${targetId}?tab=${action.tab}`);
      }
    } else if (action.type === 'OPEN_COMPANY_MODAL') {
      handleCloseCopilot();
      setCompanyModal({ cui: action.cui, name: action.name });
    } else if (action.type === 'OPEN_DEEP_RESEARCH') {
      handleCloseCopilot();
      setDeepResearchTarget({
        id: action.clientId || clientId,
        name: action.name,
        cui: action.cui
      });
    } else if (action.type === 'CREATE_CLIENT') {
      handleEvaluateCompany(action.cui, action.name);
    } else if (action.type === 'PROMPT') {
      const lowerPrompt = action.prompt?.toLowerCase() || '';
      const lowerLabel = action.label?.toLowerCase() || '';
      
      if (lowerLabel.includes('deschide parcul auto') || lowerPrompt.includes('deschide parcul auto')) {
        navigate('/vehicles');
        return;
      }
      if (lowerLabel.includes('configurează ofertă') || lowerLabel.includes('ofertă nouă')) {
        navigate('/offers/new');
        return;
      }
      if (lowerLabel.startsWith('ofertă ') || lowerLabel.startsWith('oferta ')) {
        const modelName = action.label.replace(/^ofert[aă]\s+/i, '').trim();
        navigate(`/offers/new?model=${encodeURIComponent(modelName)}`);
        return;
      }
      handleSendMessage(action.prompt);
    }
  };

  // Structured Markdown Parser for executive reports and data tables
  const renderFormattedText = (raw) => {
    if (!raw) return null;
    const cleanRaw = stripEmojis(raw);
    const lines = cleanRaw.split('\n');
    const elements = [];
    let tableRows = [];
    let inTable = false;

    const flushTable = (keyIdx) => {
      if (tableRows.length > 0) {
        const header = tableRows[0];
        const body = tableRows.slice(1).filter(r => !r.every(c => /^:?-+:?$/.test(c.trim())));
        
        // Helper: check column indices for multi-entity tables
        let cuiColIdx = -1;
        let nameColIdx = -1;
        let regColIdx = -1;
        let addrColIdx = -1;
        let statusColIdx = -1;

        header.forEach((h, idx) => {
          const cleanH = h.trim().toLowerCase();
          if (/cui|cif/i.test(cleanH)) cuiColIdx = idx;
          else if (/num[aă]r\s*(?:[iî]nmatriculare)?|nr\.?\s*[iî]nmat|nr\.?\s*auto|pl[aă]cu[tț][aă]/i.test(cleanH)) plateColIdx = idx;
          else if (/model|vehicul|autovehicul|autoturism|versiune/i.test(cleanH)) modelColIdx = idx;
          else if (/denumire|firma|companie|nume/i.test(cleanH)) nameColIdx = idx;
          else if (/reg|orc/i.test(cleanH)) regColIdx = idx;
          else if (/adres|locati|judet|oras|strada/i.test(cleanH)) addrColIdx = idx;
          else if (/sediu|punct/i.test(cleanH) && addrColIdx === -1) addrColIdx = idx;
          else if (/statut|stare/i.test(cleanH)) statusColIdx = idx;
        });

        // Helper: check if row has a CUI
        const extractCui = (row) => {
          if (cuiColIdx !== -1 && row[cuiColIdx]) {
            const m = row[cuiColIdx].match(/\b(?:RO)?(\d{6,10})\b/i);
            if (m) return m[1];
          }
          for (const cell of row) {
            const m = cell.match(/\b(?:RO)?(\d{6,10})\b/i);
            if (m) return m[1];
          }
          return null;
        };

        // Helper: check if row has a Romanian vehicle license plate
        const extractPlate = (row) => {
          const plateRegex = /\b([A-Z]{1,2})\s*[-]?\s*(\d{2,3})\s*[-]?\s*([A-Z]{3})\b/;
          if (plateColIdx !== -1 && row[plateColIdx]) {
            const m = row[plateColIdx].replace(/[`*]/g, '').trim().match(plateRegex);
            if (m) return `${m[1]} ${m[2]} ${m[3]}`.trim();
          }
          for (const cell of row) {
            const m = cell.replace(/[`*]/g, '').trim().match(plateRegex);
            if (m) return `${m[1]} ${m[2]} ${m[3]}`.trim();
          }
          return null;
        };

        const isMultiCompanyTable = (cuiColIdx !== -1 && (nameColIdx !== -1 || addrColIdx !== -1)) && body.length > 0;

        if (isMultiCompanyTable) {
          elements.push(
            <div key={`multi-comp-${keyIdx}`} className="my-3 space-y-2">
              <div className="flex items-center justify-between px-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Firme identificate ({body.length}) — Click pe oricare pentru dosar complet:
                </span>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-gray-900/80 overflow-hidden shadow-2xs">
                {body.map((row, rIdx) => {
                  const rowCui = extractCui(row);
                  const name = nameColIdx !== -1 ? row[nameColIdx]?.replace(/\*\*/g, '').trim() : '';
                  const address = addrColIdx !== -1 ? row[addrColIdx]?.replace(/\*\*/g, '').trim() : '';
                  const regCom = regColIdx !== -1 ? row[regColIdx]?.replace(/\*\*/g, '').trim() : '';
                  const status = statusColIdx !== -1 ? row[statusColIdx]?.replace(/\*\*/g, '').trim() : '';
                  const isPrincipal = row.some(cell => /principal/i.test(cell));
                  const displayAddress = address && address !== '—' && !/^sediu$/i.test(address.trim()) && address !== name ? address : '';

                  return (
                    <div
                      key={rIdx}
                      onClick={() => {
                        if (rowCui) handleSendMessage(`Verifică CUI ${rowCui}`);
                      }}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors group ${
                        isPrincipal
                          ? 'bg-emerald-50/50 dark:bg-emerald-950/30'
                          : 'hover:bg-primary/5 dark:hover:bg-primary/10'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                            {name || `Companie CUI ${rowCui}`}
                          </span>
                          {rowCui && (
                            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                              CUI {rowCui}
                            </span>
                          )}
                          {regCom && regCom !== '—' && (
                            <span className="text-[10px] text-gray-400">
                              {regCom}
                            </span>
                          )}
                          {status && status !== '—' && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full ${
                              /activ|inregistrat/i.test(status)
                                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50'
                                : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50'
                            }`}>
                              {status}
                            </span>
                          )}
                          {isPrincipal && (
                            <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-full">
                              Sediu Principal
                            </span>
                          )}
                        </div>
                        {displayAddress && (
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {displayAddress}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 flex items-center text-gray-400 group-hover:text-primary transition-colors">
                        <ChevronRight size={15} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        } else {
          elements.push(
            <div key={`table-${keyIdx}`} className="my-3 overflow-x-auto rounded-2xl border border-gray-200/90 dark:border-gray-700/80 shadow-2xs bg-white dark:bg-gray-900/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 font-bold uppercase tracking-wider text-[11px] border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {header.map((col, cIdx) => (
                      <th key={cIdx} className="px-3.5 py-2.5 whitespace-nowrap">
                        {col.trim().replace(/\*\*/g, '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                  {body.map((row, rIdx) => {
                    const rowCui = extractCui(row);
                    const rowPlate = extractPlate(row);

                    return (
                      <tr
                        key={rIdx}
                        onClick={() => {
                          if (rowPlate) {
                            navigate(`/vehicles/${encodeURIComponent(rowPlate)}`);
                          } else if (rowCui) {
                            handleSendMessage(`Verifică CUI ${rowCui}`);
                          }
                        }}
                        className={`transition-colors ${
                          rowPlate || rowCui
                            ? 'hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer group'
                            : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/40 even:bg-gray-50/30 dark:even:bg-gray-800/20'
                        }`}
                        title={
                          rowPlate 
                            ? `Click pentru fișa completă, acte, poze și revizii pentru ${rowPlate}` 
                            : rowCui 
                            ? `Click pentru dosarul complet al CUI ${rowCui}` 
                            : undefined
                        }
                      >
                        {row.map((col, cIdx) => {
                          const cleanCol = col.trim().replace(/\*\*(.*?)\*\*/g, '$1');
                          const rawCellText = col.replace(/[`*]/g, '').trim();
                          const plateMatch = rawCellText.match(/\b([A-Z]{1,2})\s*[-]?\s*(\d{2,3})\s*[-]?\s*([A-Z]{3})\b/);
                          const isPlateCell = (cIdx === plateColIdx) || (plateMatch && rawCellText.length <= 15);
                          const isModelCell = (cIdx === modelColIdx) || (modelColIdx === -1 && cIdx === 0 && rowPlate);

                          return (
                            <td key={cIdx} className="px-3.5 py-2 whitespace-nowrap tabular-nums text-xs">
                              {isPlateCell && plateMatch ? (
                                <span className="inline-flex items-center gap-1.5 font-bold bg-white dark:bg-gray-900 px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white shadow-2xs group-hover:border-primary transition-colors">
                                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1 rounded select-none">RO</span>
                                  <span>{`${plateMatch[1]} ${plateMatch[2]} ${plateMatch[3]}`}</span>
                                  <ExternalLink size={10} className="text-gray-400 group-hover:text-primary transition-colors" />
                                </span>
                              ) : isModelCell ? (
                                <span className="font-bold text-gray-900 dark:text-white group-hover:text-primary group-hover:underline inline-flex items-center gap-1.5 transition-colors">
                                  <Car size={13} className="text-gray-400 shrink-0" />
                                  {cleanCol}
                                </span>
                              ) : (
                                cleanCol
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        }
        tableRows = [];
      }
      inTable = false;
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Table line detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        const cols = trimmed.slice(1, -1).split('|');
        tableRows.push(cols);
        return;
      } else if (inTable) {
        flushTable(idx);
      }

      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={idx} className="font-bold text-sm text-gray-900 dark:text-white mt-3.5 mb-1.5 pb-1 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            {trimmed.replace('### ', '').replace(/\*\*(.*?)\*\*/g, '$1')}
          </h4>
        );
      } else if (trimmed.startsWith('#### ')) {
        elements.push(
          <h5 key={idx} className="font-semibold text-xs text-gray-800 dark:text-gray-200 mt-2 mb-1">
            {trimmed.replace('#### ', '').replace(/\*\*(.*?)\*\*/g, '$1')}
          </h5>
        );
      } else if (trimmed.startsWith('> ')) {
        elements.push(
          <div key={idx} className="p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border-l-4 border-amber-500 text-xs text-amber-900 dark:text-amber-200 my-2 shadow-2xs">
            {trimmed.replace('> ', '').replace(/\*\*(.*?)\*\*/g, '$1')}
          </div>
        );
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const itemText = trimmed.slice(2);
        const formatInlinePlates = (str) => {
          return str.replace(/`([A-Z]{1,2}\s*[-]?\s*\d{2,3}\s*[-]?\s*[A-Z]{3})`/g, (m, plate) => {
            const clean = plate.trim();
            return `<button type="button" onclick="window.__axisNavigateVehicle && window.__axisNavigateVehicle('${clean}')" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[11px] font-bold text-gray-900 dark:text-white hover:border-primary hover:text-primary cursor-pointer shadow-2xs mx-0.5 select-none" title="Deschide dosar complet ${clean}"><span class="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-0.5 rounded">RO</span>${clean}</button>`;
          });
        };

        elements.push(
          <li key={idx} className="text-xs md:text-sm text-gray-700 dark:text-gray-300 ml-4 list-disc my-1 leading-relaxed">
            <span dangerouslySetInnerHTML={{
              __html: formatInlinePlates(itemText)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-gray-200/80 dark:bg-gray-800 text-[11px] text-gray-900 dark:text-gray-100">$1</code>')
            }} />
          </li>
        );
      } else if (trimmed.length > 0) {
        const formatInlinePlates = (str) => {
          return str.replace(/`([A-Z]{1,2}\s*[-]?\s*\d{2,3}\s*[-]?\s*[A-Z]{3})`/g, (m, plate) => {
            const clean = plate.trim();
            return `<button type="button" onclick="window.__axisNavigateVehicle && window.__axisNavigateVehicle('${clean}')" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[11px] font-bold text-gray-900 dark:text-white hover:border-primary hover:text-primary cursor-pointer shadow-2xs mx-0.5 select-none" title="Deschide dosar complet ${clean}"><span class="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-0.5 rounded">RO</span>${clean}</button>`;
          });
        };

        elements.push(
          <p key={idx} className="text-xs md:text-sm text-gray-700 dark:text-gray-300 leading-relaxed my-1.5">
            <span dangerouslySetInnerHTML={{
              __html: formatInlinePlates(trimmed)
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-gray-200/80 dark:bg-gray-800 text-[11px] text-gray-900 dark:text-gray-100">$1</code>')
            }} />
          </p>
        );
      }
    });

    if (inTable) {
      flushTable('end');
    }

    return elements;
  };

  // 6 Executive Quick Actions for Empty State (Sober Enterprise Styling)
  const quickActions = [
    {
      title: 'Risc Graniță & Watchlist',
      desc: 'Supraveghere frontieră, alerte transfrontaliere și unități cu risc',
      prompt: 'Ce mașini sunt pe Watchlist și ce alerte de graniță avem active?',
      isPrefill: false,
      icon: ShieldAlert,
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-100 dark:bg-gray-800'
    },
    {
      title: 'Anomalii & Comportament AI',
      desc: 'Analiză rute nocturne atipice, devieri și risc de sustragere',
      prompt: 'Analizează anomaliile de comportament ale șoferilor, rutele atipice și riscul de sustragere',
      isPrefill: false,
      icon: Activity,
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-100 dark:bg-gray-800'
    },
    {
      title: 'Briefing Executiv Matinal',
      desc: 'Rata de utilizare flotă, unități disponibile și priorități zilnice',
      prompt: 'Fă un briefing executiv matinal pentru conducerea flotei și starea generală de azi',
      isPrefill: false,
      icon: FileText,
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-100 dark:bg-gray-800'
    },
    {
      title: 'Audit Kilometraj Live GPS',
      desc: 'Monitorizare contracte active și calculare depășiri de plafon',
      prompt: 'Fă un audit de kilometraj pe contractele active și arată-mi depășirile de plafon',
      isPrefill: false,
      icon: Gauge,
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-100 dark:bg-gray-800'
    },
    {
      title: 'Investighează CUI Oficial',
      desc: 'Interogare live ANAF, ONRC, acționari și dosare de insolvență',
      prompt: 'Investighează CUI ',
      isPrefill: true,
      icon: Building2,
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-100 dark:bg-gray-800'
    },
    {
      title: 'Management Flotă & Mașini',
      desc: 'Disponibilitate mașini libere, revizii și tarife de leasing',
      prompt: 'Ce mașini avem libere în flotă pentru ofertare?',
      isPrefill: false,
      icon: Car,
      color: 'text-gray-700 dark:text-gray-300',
      bgColor: 'bg-gray-100 dark:bg-gray-800'
    }
  ];

  return (
    <>
      {/* Floating Launcher Pill (Mac OS Tahoe Style) */}
      {!isOpen && !deepResearchTarget && (
        <div className="fixed bottom-6 right-6 z-[120]">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="animate-floating group flex items-center gap-3 px-5 py-3 bg-gray-950/95 dark:bg-white/95 text-white dark:text-gray-900 backdrop-blur-xl rounded-full border border-gray-800/80 dark:border-gray-200/80 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer select-none shadow-2xl"
            title="Deschide Centrul Executiv Axis AI Copilot (⌘K)"
          >
            <AxisAiIcon size="sm" showAiBadge={false} />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold tracking-wide">Axis Copilot</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-white/20 dark:bg-gray-900/10 text-gray-200 dark:text-gray-800 uppercase tracking-wider">
              AI
            </span>
            <span className="hidden sm:inline-block text-[10px] text-gray-400 dark:text-gray-500 ml-1 ">
              ⌘K
            </span>
          </button>
        </div>
      )}

      {/* Main Centered Executive AI Copilot Window */}
      {isOpen && !deepResearchTarget && (
        <div 
          className={`fixed inset-0 z-[120] flex items-center justify-center bg-black/55 backdrop-blur-md animate-in fade-in duration-200 ${
            isMaximized ? 'p-0' : 'p-3 sm:p-5 md:p-8'
          }`}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isMaximized) {
              handleCloseCopilot();
            }
          }}
        >
          <div 
            className={`bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl shadow-2xl border border-gray-200/90 dark:border-gray-700/80 flex flex-col overflow-hidden transition-all duration-200 pointer-events-auto ${
              isMaximized
                ? 'w-screen h-screen !rounded-none !border-none'
                : 'w-full max-w-5xl md:max-w-6xl h-[88vh] max-h-[920px] rounded-3xl'
            }`}
          >
            {/* Header: Ultra-clean Single Row without Mac dots */}
            <div className="h-14 px-5 border-b border-gray-200/80 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-800/60 flex items-center justify-between gap-3 select-none shrink-0 whitespace-nowrap">
              
              {/* Left: Brand Identity */}
              <div className="flex items-center gap-2.5 min-w-0">
                <AxisAiIcon size="sm" showAiBadge={false} />
                <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight whitespace-nowrap">
                  Axis Copilot
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
                {clientId && (
                  <span className="hidden sm:inline-block text-[11px] font-medium text-gray-400 dark:text-gray-500 truncate max-w-[200px]">
                    Client #{clientId}
                  </span>
                )}
              </div>

              {/* Right: Quick Action Round Icons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const lastAssistant = [...messages].reverse().find(m => m.sender === 'assistant' && m.id !== 'welcome') || messages[messages.length - 1];
                    if (lastAssistant) {
                      handleExportPdf(lastAssistant.text, 'header-export');
                    }
                  }}
                  disabled={exportingPdfId === 'header-export' || messages.length <= 1}
                  className="p-2 rounded-full text-gray-400 hover:text-rose-500 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                  title="Exportă raportul curent în format PDF"
                >
                  {exportingPdfId === 'header-export' ? <RefreshCw size={16} className="animate-spin text-primary" /> : <FileDown size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (abortControllerRef.current) {
                      try { abortControllerRef.current.abort(); } catch (e) {}
                    }
                    setLoading(false);
                    setInputValue('');
                    setMessages(INITIAL_MESSAGES);
                  }}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Conversație nouă (curăță ecranul)"
                >
                  <Trash2 size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsMaximized(prev => !prev)}
                  className="p-2 rounded-full text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors cursor-pointer active:scale-95"
                  title={isMaximized ? 'Restabilește fereastra' : 'Mărește la ecran complet'}
                >
                  {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>

                <button
                  type="button"
                  onClick={handleCloseCopilot}
                  className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                  title="Închide fereastra și resetează conversația (Esc)"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Conversation Stream */}
            <div ref={conversationContainerRef} className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto space-y-5">
              
              {/* Executive Command Hub (Rendered when starting / empty state) */}
              {messages.length <= 1 && (
                <div className="max-w-2xl mx-auto space-y-5 py-4 animate-in fade-in duration-300">
                  <div className="text-center space-y-1.5">
                    <div className="inline-flex p-2.5 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary mb-1">
                      <AxisAiIcon size="md" showAiBadge={false} />
                    </div>
                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                      Centru Executiv Axis Copilot
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                      Asistent executiv pentru investigații companii, analiză de risc și flotă.
                    </p>
                  </div>

                  {/* 6 Clean Executive Action Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                    {quickActions.map((action, idx) => {
                      const Icon = action.icon;
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (action.isPrefill) {
                              setInputValue(action.prompt);
                              setTimeout(() => {
                                textareaRef.current?.focus();
                                textareaRef.current?.setSelectionRange(action.prompt.length, action.prompt.length);
                              }, 50);
                            } else {
                              handleSendMessage(action.prompt);
                            }
                          }}
                          className="p-3 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200/90 dark:border-gray-700/80 hover:border-primary/50 hover:bg-primary/5 dark:hover:bg-primary/10 transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-2 rounded-xl shrink-0 ${action.bgColor} ${action.color}`}>
                              <Icon size={15} />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors truncate">
                                {action.title}
                              </h4>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                {action.desc}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-gray-400 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Messages Thread (Active Conversation) */}
              {messages.length > 1 && messages.map((msg, mIdx) => {
                const isLatest = mIdx === messages.length - 1;
                const isLastUser = msg.sender === 'user' && (mIdx === messages.length - 1 || (mIdx === messages.length - 2 && messages[messages.length - 1]?.sender === 'assistant'));
                return (
                <div
                  key={msg.id}
                  ref={isLatest ? latestMessageRef : (isLastUser ? lastUserMessageRef : null)}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-4xl mx-auto`}
                >
                  {/* Sender Label & Timestamp */}
                  <div className={`flex items-center gap-2 mb-1 px-2 text-[11px] text-gray-400 font-semibold ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    {msg.sender === 'assistant' ? (
                      <>
                        <AxisAiIcon size="sm" showAiBadge={false} />
                        <span className="text-gray-700 dark:text-gray-300 font-bold">Axis Copilot</span>
                        <span>•</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Verificat Faptic</span>
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-900 dark:text-gray-100 font-bold">
                          {user?.full_name || 'Eugeniu Cazmal'}
                        </span>
                        {user?.role && (
                          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                            ({user.role})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`rounded-3xl shadow-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'p-3.5 sm:p-4 bg-primary text-primary-foreground font-medium rounded-tr-sm max-w-[85%] text-xs md:text-sm shadow-md'
                        : 'p-4 sm:p-5.5 bg-gray-50/90 dark:bg-gray-800/70 text-gray-800 dark:text-gray-200 border border-gray-200/90 dark:border-gray-700/80 rounded-tl-sm w-full'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div className="space-y-2">
                        {renderFormattedText(msg.text)}

                        {/* Fallback direct list if message has matchedCompanies and wasn't rendered as a markdown table */}
                        {msg.matchedCompanies && msg.matchedCompanies.length > 1 && !msg.text?.includes('| CUI |') && (
                          <div className="mt-3.5 pt-3 border-t border-gray-200/80 dark:border-gray-700/80 space-y-2">
                            <div className="flex items-center justify-between px-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                Entități identificate ({msg.matchedCompanies.length}) — Click pe oricare pentru dosar complet:
                              </span>
                            </div>
                            <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white dark:bg-gray-900/80 overflow-hidden shadow-2xs">
                              {msg.matchedCompanies.map((comp, cIdx) => (
                                <div
                                  key={cIdx}
                                  onClick={() => {
                                    if (comp.cui) handleSendMessage(`Verifică CUI ${comp.cui}`);
                                  }}
                                  className="px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors group"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                                        {comp.denumire || comp.name || `Companie CUI ${comp.cui}`}
                                      </span>
                                      {comp.cui && (
                                        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                                          CUI {comp.cui}
                                        </span>
                                      )}
                                      {comp.nr_reg_com && comp.nr_reg_com !== '—' && (
                                        <span className="text-[10px] text-gray-400">
                                          {comp.nr_reg_com}
                                        </span>
                                      )}
                                    </div>
                                    {(comp.adresa || comp.address) && (
                                      <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                        {comp.adresa || comp.address}
                                      </div>
                                    )}
                                  </div>
                                  <div className="shrink-0 flex items-center text-gray-400 group-hover:text-primary transition-colors">
                                    <ChevronRight size={15} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Interactive Context Action Buttons (Mac OS Tahoe Style) */}
                        {msg.actions && msg.actions.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-gray-200/60 dark:border-gray-700/60">
                            {msg.actions.map((act, aIdx) => (
                              <button
                                key={aIdx}
                                type="button"
                                onClick={() => handleActionClick(act)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer shadow-2xs active:scale-95"
                              >
                                <span>{stripEmojis(act.label)}</span>
                                <ArrowRight size={12} className="text-gray-400" />
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Assistant Action Bar: Copy Text & Export PDF (Mac OS Tahoe Style) */}
                        <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-gray-200/60 dark:border-gray-700/60 select-none">
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.text, msg.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-all border border-gray-200/80 dark:border-gray-700/70 shadow-2xs cursor-pointer active:scale-95"
                            title="Copiază textul răspunsului în clipboard"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check size={12} className="text-emerald-500 stroke-[2.5]" />
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copiat!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} className="text-gray-400 dark:text-gray-400" />
                                <span>Copiază text</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExportPdf(msg.text, msg.id)}
                            disabled={exportingPdfId === msg.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-all border border-gray-200/80 dark:border-gray-700/70 shadow-2xs cursor-pointer active:scale-95 disabled:opacity-50"
                            title="Descarcă raportul oficial în format PDF"
                          >
                            {exportingPdfId === msg.id ? (
                              <>
                                <RefreshCw size={12} className="animate-spin text-primary" />
                                <span>Generare PDF...</span>
                              </>
                            ) : (
                              <>
                                <FileDown size={12} className="text-rose-500" />
                                <span>Exportă PDF</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
              })}

              {/* Progressive Loading Status Card */}
              {loading && (
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center gap-3 p-4 bg-gray-50/95 dark:bg-gray-800/90 rounded-3xl border border-gray-200/90 dark:border-gray-700/80 shadow-md">
                    <RefreshCw size={16} className="animate-spin text-primary shrink-0" />
                    <div className="flex flex-col flex-1">
                      <span className="text-xs md:text-sm font-bold text-gray-800 dark:text-gray-200">
                        {loadingStep === 0 && 'Interoghez registrele oficiale (ANAF, ONRC, BPI)...'}
                        {loadingStep === 1 && 'Analizez bilanțul contabil, insolvența și litigiile...'}
                        {loadingStep === 2 && 'Sintetizez dosarul faptic de risc și structura de grup...'}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        Date furnizate în timp real din surse oficiale guvernamentale
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (abortControllerRef.current) abortControllerRef.current.abort();
                        setLoading(false);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/60 shadow-2xs"
                    >
                      Anulează
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Clean Business Input Bar */}
            <div className="p-3 sm:p-4 border-t border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-2.5">
              {/* Sleek Quick Commands Bar (Single Row, Rounded Mac OS Tahoe Style - Monochrome Enterprise) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 select-none">
                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 whitespace-nowrap flex items-center gap-1 shrink-0 mr-1">
                  <Sparkles size={11} className="text-gray-400 dark:text-gray-500" />
                  Comenzi rapide:
                </span>

                <button
                  type="button"
                  onClick={() => handleSendMessage('Ce mașini sunt pe Watchlist și ce alerte de graniță avem active?')}
                  className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200/90 dark:border-gray-700/80 bg-gray-50/90 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Auditează alerte de graniță și vehiculele de pe Watchlist"
                >
                  <ShieldAlert size={12} className="text-gray-500 dark:text-gray-400" />
                  <span>Risc Graniță</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('Analizează anomaliile de comportament ale șoferilor, rutele atipice și riscul de sustragere')}
                  className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200/90 dark:border-gray-700/80 bg-gray-50/90 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Analiză AI tipare de deplasare nocturnă atipică și devieri de rută"
                >
                  <Activity size={12} className="text-gray-500 dark:text-gray-400" />
                  <span>Anomalii AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('Fă un briefing executiv matinal pentru conducerea flotei și starea generală de azi')}
                  className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200/90 dark:border-gray-700/80 bg-gray-50/90 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Briefing executiv de dimineață pentru Directorul General"
                >
                  <FileText size={12} className="text-gray-500 dark:text-gray-400" />
                  <span>Briefing Flotă</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('Fă un audit de kilometraj pe contractele active și arată-mi depășirile de plafon')}
                  className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200/90 dark:border-gray-700/80 bg-gray-50/90 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Audit kilometraj live GPS și depășire plafon contractat"
                >
                  <Gauge size={12} className="text-gray-500 dark:text-gray-400" />
                  <span>Audit Km</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('Care este procedura și starea de imobilizare motor la distanță pentru vehiculele cu risc?')}
                  className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200/90 dark:border-gray-700/80 bg-gray-50/90 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Protocol de securitate imobilizare motor la distanță"
                >
                  <Lock size={12} className="text-gray-500 dark:text-gray-400" />
                  <span>Imobilizare</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('Ce revizii sunt depășite și ce scadențe de service avem la flotă?')}
                  className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200/90 dark:border-gray-700/80 bg-gray-50/90 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Alerte revizii depășite și polițe ITP/RCA/CASCO"
                >
                  <Wrench size={12} className="text-gray-500 dark:text-gray-400" />
                  <span>Service & Revizii</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInputValue('Investighează CUI ');
                    setTimeout(() => {
                      textareaRef.current?.focus();
                      textareaRef.current?.setSelectionRange(18, 18);
                    }, 50);
                  }}
                  className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200/90 dark:border-gray-700/80 bg-gray-50/90 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Investighează CUI în registre oficiale"
                >
                  <Building2 size={12} className="text-gray-500 dark:text-gray-400" />
                  <span>Investighează CUI</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendMessage('Ce mașini avem libere în flotă pentru ofertare?')}
                  className="px-2.5 py-1 text-xs font-medium rounded-full border border-gray-200/90 dark:border-gray-700/80 bg-gray-50/90 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-200 transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Verifică mașini libere în flotă"
                >
                  <Car size={12} className="text-gray-500 dark:text-gray-400" />
                  <span>Flotă liberă</span>
                </button>
              </div>


              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative bg-gray-50/90 dark:bg-gray-800/80 rounded-2xl border border-gray-200/90 dark:border-gray-700/80 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all p-1.5 sm:p-2 flex items-center gap-2 shadow-xs"
              >
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={1}
                  placeholder="Scrie un mesaj sau o cerință..."
                  className="w-full px-3 py-1.5 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none resize-none leading-relaxed"
                />

                <button
                  type="submit"
                  disabled={!inputValue.trim() || loading}
                  className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-25 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs active:scale-95 shrink-0 flex items-center justify-center"
                  title="Trimite"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Render Direct Action Modals if triggered by chat */}
      {companyModal && (
        <CompanyIntelModal
          isOpen={true}
          cui={companyModal.cui}
          initialName={companyModal.name}
          onClose={() => setCompanyModal(null)}
          onEvaluate={handleEvaluateCompany}
        />
      )}

      {deepResearchTarget && (
        <PublicDeepResearchModal
          isOpen={true}
          clientId={deepResearchTarget.id}
          clientName={deepResearchTarget.name}
          clientCui={deepResearchTarget.cui}
          onClose={() => setDeepResearchTarget(null)}
          onOpenCompany={(cui, name) => setCompanyModal({ cui, name })}
        />
      )}
    </>
  );
};

export default AxisAiCopilot;
