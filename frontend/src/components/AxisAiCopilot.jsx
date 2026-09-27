import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { 
  X, Send, Sparkles, ChevronRight, ExternalLink, RefreshCw, 
  TrendingUp, ShieldAlert, FileText, ArrowRight, CheckCircle2, AlertTriangle,
  MinusCircle, CornerDownLeft, Trash2, Building2, Sliders, Key, Cpu, Check, Info
} from 'lucide-react';
import { AxisAiIcon } from './AxisAiLogo';
import { sendAssistantMessage, fetchSuggestedPrompts, fetchAssistantConfig } from '../services/api';
import CompanyIntelModal from './CompanyIntelModal';
import PublicDeepResearchModal from './PublicDeepResearchModal';

export const AxisAiCopilot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aiProvider, setAiProvider] = useState(localStorage.getItem('axis_ai_provider') || 'groq');
  const [apiKey, setApiKey] = useState(localStorage.getItem('axis_ai_api_key') || '');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [serverConfigured, setServerConfigured] = useState(false);
  const [serverProvider, setServerProvider] = useState(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Salut! Sunt **Axis Copilot**, ofițerul tău executiv de analiză faptică, risc financiar și management de flotă.\n\nÎmi poți cere orice verificare oficială (ANAF, ONRC, BPI, bilanțuri), calcule de rate de leasing, proceduri de recuperare clienți rău-platnici sau verificarea mașinilor disponibile în flotă.',
      actions: []
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);
  
  // Modal states for direct in-app action execution
  const [companyModal, setCompanyModal] = useState(null); // { cui, name }
  const [deepResearchTarget, setDeepResearchTarget] = useState(null); // { id, name, cui }

  const location = useLocation();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Extract client ID if user is on /clients/:id
  const clientId = useMemo(() => {
    const match = location.pathname.match(/\/clients\/(\d+)/);
    return match ? Number(match[1]) : null;
  }, [location.pathname]);

  // Load contextual prompts and server AI configuration
  useEffect(() => {
    fetchAssistantConfig()
      .then(data => {
        if (data && data.configured) {
          setServerConfigured(true);
          setServerProvider(data.active_provider);
        }
      })
      .catch(() => {});

    fetchSuggestedPrompts(clientId)
      .then(res => setSuggestedPrompts(res.prompts || []))
      .catch(() => setSuggestedPrompts([]));
  }, [clientId, location.pathname]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    localStorage.setItem('axis_ai_provider', aiProvider);
    localStorage.setItem('axis_ai_api_key', apiKey.trim());
    try {
      await fetch('/api/assistant/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey.trim(), provider: aiProvider })
      });
    } catch (err) {
      // LocalStorage persistat oricum
    }
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setShowSettings(false);
    }, 1000);
  };

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputValue;
    if (!textToSend || !textToSend.trim() || loading) return;

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
          api_key: apiKey.trim() || localStorage.getItem('axis_ai_api_key') || '',
          ai_provider: aiProvider || localStorage.getItem('axis_ai_provider') || 'auto',
          history: messages.slice(-8).map(m => ({
            role: m.sender === 'user' ? 'user' : 'assistant',
            text: m.text
          }))
        }
      });

      const assistantMsg = {
        id: `a-${Date.now()}`,
        sender: 'assistant',
        text: response.reply || 'Am procesat solicitarea ta.',
        actions: response.actions || [],
        dataSummary: response.data_summary || null
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `A apărut o problemă la interogare: ${err.message || 'Eroare necunoscută'}. Verifică dacă backend-ul este conectat.`,
          actions: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (action) => {
    if (!action) return;

    if (action.type === 'NAVIGATE') {
      navigate(action.url);
    } else if (action.type === 'OPEN_TAB') {
      const targetId = action.clientId || clientId;
      if (targetId) {
        navigate(`/clients/${targetId}?tab=${action.tab}`);
      }
    } else if (action.type === 'OPEN_COMPANY_MODAL') {
      setIsOpen(false);
      setCompanyModal({ cui: action.cui, name: action.name });
    } else if (action.type === 'OPEN_DEEP_RESEARCH') {
      setIsOpen(false);
      setDeepResearchTarget({
        id: action.clientId || clientId,
        name: action.name,
        cui: action.cui
      });
    } else if (action.type === 'CREATE_CLIENT') {
      navigate('/clients', { state: { prefillCui: action.cui, prefillName: action.name } });
    } else if (action.type === 'PROMPT') {
      handleSendMessage(action.prompt);
    }
  };

  // Simple clean markdown parser for bot messages (supports tables, lists, bold, blockquotes)
  const renderFormattedText = (raw) => {
    if (!raw) return null;
    const lines = raw.split('\n');
    const elements = [];
    let tableRows = [];
    let inTable = false;

    const flushTable = (keyIdx) => {
      if (tableRows.length > 0) {
        const header = tableRows[0];
        const body = tableRows.slice(1).filter(r => !r.every(c => /^:?-+:?$/.test(c.trim())));
        elements.push(
          <div key={`table-${keyIdx}`} className="my-2.5 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {header.map((col, cIdx) => (
                    <th key={cIdx} className="px-2.5 py-1.5 whitespace-nowrap">
                      {col.trim().replace(/\*\*/g, '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 bg-white dark:bg-gray-900/40">
                {body.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40">
                    {row.map((col, cIdx) => (
                      <td key={cIdx} className="px-2.5 py-1.5 whitespace-nowrap text-gray-800 dark:text-gray-200 tabular-nums">
                        {col.trim().replace(/\*\*(.*?)\*\*/g, '$1')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
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
          <h4 key={idx} className="font-bold text-xs text-gray-900 dark:text-white mt-2 mb-1">
            {trimmed.replace('### ', '').replace(/\*\*(.*?)\*\*/g, '$1')}
          </h4>
        );
      } else if (trimmed.startsWith('#### ')) {
        elements.push(
          <h5 key={idx} className="font-semibold text-[11px] text-gray-700 dark:text-gray-300 mt-1.5 mb-0.5">
            {trimmed.replace('#### ', '').replace(/\*\*(.*?)\*\*/g, '$1')}
          </h5>
        );
      } else if (trimmed.startsWith('> ')) {
        elements.push(
          <div key={idx} className="p-2 rounded-lg bg-gray-100/80 dark:bg-gray-800/80 border-l-2 border-primary text-[11px] text-gray-600 dark:text-gray-300 my-1.5">
            {trimmed.replace('> ', '').replace(/\*\*(.*?)\*\*/g, '$1')}
          </div>
        );
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const itemText = trimmed.slice(2);
        elements.push(
          <li key={idx} className="text-xs text-gray-700 dark:text-gray-300 ml-3 list-disc my-0.5">
            <span dangerouslySetInnerHTML={{
              __html: itemText
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px]">$1</code>')
            }} />
          </li>
        );
      } else if (trimmed.length > 0) {
        elements.push(
          <p key={idx} className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed my-1">
            <span dangerouslySetInnerHTML={{
              __html: trimmed
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.*?)`/g, '<code class="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px]">$1</code>')
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

  return (
    <>
      {/* Floating Toggle Button (Mac OS Tahoe sleek floating pill) */}
      {!isOpen && !deepResearchTarget && !companyModal && (
        <div className="fixed bottom-6 right-6 z-[120]">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="animate-floating group flex items-center gap-2.5 px-4 py-2.5 bg-gray-950/95 dark:bg-white/95 text-white dark:text-gray-900 backdrop-blur-md rounded-full border border-gray-800/80 dark:border-gray-200/80 hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer select-none"
            title="Deschide Axis AI Copilot"
          >
            <AxisAiIcon size="sm" showAiBadge={false} />
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold tracking-wide">Axis Copilot</span>
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-white/15 dark:bg-gray-900/10 text-gray-300 dark:text-gray-700 uppercase tracking-wider">
              AI
            </span>
          </button>
        </div>
      )}

      {/* Main Copilot Drawer / Window */}
      {isOpen && !deepResearchTarget && !companyModal && (
        <div className="fixed bottom-6 right-6 z-[120] w-[460px] max-w-[calc(100vw-32px)] h-[620px] max-h-[calc(100vh-80px)] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700/80 flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
          
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AxisAiIcon size="md" showAiBadge={true} />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Axis AI Copilot
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60">
                    Live OSINT &amp; Audit
                  </span>
                </div>
                <p className="text-[10px] text-gray-400">
                  {clientId ? `Context activ: Client ID #${clientId}` : '0% halucinații • Răspunsuri directe din date oficiale'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  showSettings || apiKey || serverConfigured
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title="Configurare Motor AI & Cheie API"
              >
                <Sliders size={14} />
              </button>
              <button
                type="button"
                onClick={() => setMessages([messages[0]])}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Resetează conversația"
              >
                <Trash2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                title="Închide fereastra"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Settings Panel if active */}
          {showSettings && (
            <div className="p-4 bg-gray-50/95 dark:bg-gray-800/95 border-b border-gray-200 dark:border-gray-700 space-y-3 animate-in fade-in duration-150 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Cpu size={14} className="text-emerald-500" />
                  Configurare Inteligență AI (LLM)
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {apiKey ? 'Cheie activă' : 'Mod local activ'}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Furnizor Inteligență Artificială:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'gemini', label: 'Google Gemini', note: 'Flash 2.0 / 1.5' },
                    { id: 'groq', label: 'Groq (Llama 3.3)', note: 'Gratuit & Rapid' },
                    { id: 'openai', label: 'OpenAI (GPT-4o)', note: 'API Key' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setAiProvider(p.id)}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        aiProvider === p.id
                          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="text-[11px]">{p.label}</div>
                      <div className="text-[9px] opacity-75">{p.note}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                  <span>Cheie API ({aiProvider === 'groq' ? 'gsk_...' : aiProvider === 'openai' ? 'sk-...' : 'AIza...'}):</span>
                  {aiProvider === 'gemini' && (
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 dark:text-blue-400 underline hover:no-underline font-medium"
                    >
                      Obține cheie gratuită Gemini &rarr;
                    </a>
                  )}
                  {aiProvider === 'groq' && (
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-emerald-600 dark:text-emerald-400 underline hover:no-underline font-medium"
                    >
                      Obține cheie gratuită Groq &rarr;
                    </a>
                  )}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={aiProvider === 'groq' ? 'Lipește cheia gsk_...' : (aiProvider === 'gemini' ? 'Lipește cheia AIzaSy... de la Google AI Studio' : 'Lipește cheia API...')}
                  className="w-full px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight pr-2">
                  Cu Google Gemini conectat, asistentul răspunde fluid la orice întrebare, reține contextul conversației și raționează inteligent.
                </p>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shrink-0 flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                >
                  {saveSuccess ? (
                    <>
                      <Check size={12} />
                      Salvat!
                    </>
                  ) : (
                    'Salvează'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Quick Gemini Banner when offline */}
          {!apiKey && !serverConfigured && !showSettings && (
            <div className="px-3.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border-b border-blue-200/70 dark:border-blue-800/40 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-[11px] text-blue-950 dark:text-blue-200 font-medium">
                  Activează <strong>Google Gemini</strong> pentru dialog fluid și inteligență deplină
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setAiProvider('gemini'); setShowSettings(true); }}
                className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg font-bold transition-all shadow-xs cursor-pointer shrink-0 ml-2"
              >
                Conectează &rarr;
              </button>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`p-3.5 rounded-2xl max-w-[90%] text-xs shadow-2xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground font-medium rounded-tr-xs'
                      : 'bg-gray-50 dark:bg-gray-800/90 text-gray-800 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700/80 rounded-tl-xs'
                  }`}
                >
                  {msg.sender === 'user' ? (
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  ) : (
                    <div>{renderFormattedText(msg.text)}</div>
                  )}
                </div>

                {/* In-App Direct Action Buttons (dacă ceva se cere să ducă direct acolo) */}
                {msg.sender === 'assistant' && msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-1">
                    {msg.actions.map((act, aIdx) => (
                      <button
                        key={aIdx}
                        type="button"
                        onClick={() => handleActionClick(act)}
                        className="px-3 py-1.5 bg-white dark:bg-gray-800 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full text-[11px] font-semibold transition-all duration-150 flex items-center gap-1.5 shadow-2xs cursor-pointer group"
                      >
                        {act.type === 'NAVIGATE' && <ArrowRight size={12} className="text-primary group-hover:text-white" />}
                        {act.type === 'OPEN_TAB' && <TrendingUp size={12} className="text-emerald-600 group-hover:text-white" />}
                        {act.type === 'OPEN_COMPANY_MODAL' && <Building2 size={12} className="text-blue-600 group-hover:text-white" />}
                        {act.type === 'OPEN_DEEP_RESEARCH' && <ShieldAlert size={12} className="text-amber-600 group-hover:text-white" />}
                        {act.type === 'PROMPT' && <Sparkles size={12} className="text-purple-600 group-hover:text-white" />}
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Contextual Suggestions Grid (Aranjat comod, fără bară de scroll orizontală) */}
            {messages.length <= 1 && suggestedPrompts.length > 0 && (
              <div className="pt-1 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 mb-2 px-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                  <Sparkles size={12} className="text-primary" />
                  <span>Sugestii de pornire & comenzi rapide:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestedPrompts.slice(0, 4).map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(p)}
                      disabled={loading}
                      className="p-3 bg-white dark:bg-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-700/80 border border-gray-200 dark:border-gray-700/80 rounded-2xl text-left transition-all hover:border-primary/40 shadow-2xs group cursor-pointer flex flex-col justify-between"
                    >
                      <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">
                        {p}
                      </span>
                      <div className="flex items-center justify-between mt-2.5 pt-1.5 border-t border-gray-100 dark:border-gray-700/50 text-[10px] text-gray-400 group-hover:text-primary transition-colors">
                        <span className="font-semibold">Execută</span>
                        <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 w-fit">
                <RefreshCw size={14} className="animate-spin text-primary" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Interoghez registrele oficiale și baza de date...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Întreabă despre profit, insolvență sau scrie 'Verifică CUI'..."
                className="flex-1 px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || loading}
                className="p-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                title="Trimite mesaj"
              >
                <Send size={14} />
              </button>
            </form>
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
          onEvaluate={(c, n) => {
            navigate('/clients', { state: { prefillCui: c, prefillName: n } });
            setCompanyModal(null);
          }}
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
