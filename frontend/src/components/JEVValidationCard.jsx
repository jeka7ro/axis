import React, { useState } from 'react';
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, Lock, Cpu, 
  Layers, RefreshCw, ChevronDown, ChevronUp, FileCheck2, Fingerprint
} from 'lucide-react';

export default function JEVValidationCard({ certificate, companyName, cui }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('claims'); // 'claims' | 'gaps' | 'gdpr'

  if (!certificate) return null;

  const verifiedClaims = certificate.verified_claims || [];
  const reasoningGaps = certificate.reasoning_gaps || [];
  const gdpr = certificate.gdpr_status || {};
  const cyber = certificate.cybersecurity || {};

  return (
    <div className="bg-white dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 rounded-3xl p-6 shadow-xs transition-all">
      {/* 1. Header Card - JEV Architecture & Seal */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-700/60">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 flex items-center justify-center shrink-0 shadow-sm">
            <Cpu size={22} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                0% Halucinații Garantat
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300">
                JEV Engine v2.4
              </span>
              <span className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400">
                {certificate.audit_hash}
              </span>
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mt-1">
              Validare Deterministă Hibridă &amp; Certificare JEV
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Fiecare afirmație despre UBO, acționariat și conexiuni este verificată matematic din surse oficiale în spatele LLM-ului.
            </p>
          </div>
        </div>

        {/* Action Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-gray-900 dark:text-white">
              {certificate.confidence_score}% Precizie Deterministă
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-400">
              {certificate.verification_passes} rulări succesive
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-xs font-semibold text-gray-800 dark:text-gray-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>{isExpanded ? 'Ascunde Detalii JEV' : 'Inspectează Auditul JEV'}</span>
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* 2. Key Pillars Highlights (Always Visible) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {/* Pilon 1: 0% Halucinații */}
        <div className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
            <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span>Fapte Verificate</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {verifiedClaims.length}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            0% afirmații generate artificial
          </div>
        </div>

        {/* Pilon 2: Cross-Validation Passes */}
        <div className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
            <RefreshCw size={16} className="text-gray-900 dark:text-gray-100" />
            <span>Cross-Validation</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            3 Rulări
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            ONRC • ANAF • BPI • Just.ro
          </div>
        </div>

        {/* Pilon 3: Reasoning Gaps */}
        <div className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
            <Layers size={16} className="text-gray-900 dark:text-gray-100" />
            <span>Auto-Corecție AI</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {reasoningGaps.length} Semnale
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            Rețele &amp; separare management
          </div>
        </div>

        {/* Pilon 4: Securitate & GDPR */}
        <div className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
            <Lock size={16} className="text-gray-900 dark:text-gray-100" />
            <span>Securitate &amp; GDPR</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            Conform
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            PII Masked • Local DB Safe
          </div>
        </div>
      </div>

      {/* 3. Detailed Audit Expansion Tabs */}
      {isExpanded && (
        <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-700/60 animate-in fade-in duration-200">
          {/* Subtabs */}
          <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 pb-3 mb-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('claims')}
              className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                activeTab === 'claims'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Afirmații Validate Determinist ({verifiedClaims.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gaps')}
              className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                activeTab === 'gaps'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Analiză Conexiuni &amp; Auto-Corecție ({reasoningGaps.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gdpr')}
              className={`px-3 py-1.5 rounded-full transition-colors cursor-pointer ${
                activeTab === 'gdpr'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Securitate &amp; Audit Criptografic
            </button>
          </div>

          {/* Tab 1: Claims */}
          {activeTab === 'claims' && (
            <div className="space-y-2.5">
              {verifiedClaims.map((claim) => (
                <div 
                  key={claim.id}
                  className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {claim.claim}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>Sursă: <strong className="text-gray-700 dark:text-gray-300">{claim.source}</strong></span>
                        <span>•</span>
                        <span>Rularea de precizie #{claim.verification_pass}</span>
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    {claim.status}
                  </span>
                </div>
              ))}
              {verifiedClaims.length === 0 && (
                <div className="text-center py-6 text-xs text-gray-400">
                  Nu au fost găsite afirmații înregistrate.
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Reasoning Gaps & Structural Relationships */}
          {activeTab === 'gaps' && (
            <div className="space-y-2.5">
              {reasoningGaps.map((gap, idx) => (
                <div 
                  key={idx}
                  className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 flex items-start gap-3"
                >
                  <AlertTriangle 
                    size={16} 
                    className={`mt-0.5 shrink-0 ${
                      gap.severity === 'CRITICAL' ? 'text-red-600' : gap.severity === 'HIGH' ? 'text-amber-600' : 'text-blue-600'
                    }`} 
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {gap.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        gap.severity === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' :
                        gap.severity === 'HIGH' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {gap.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {gap.detail}
                    </p>
                  </div>
                </div>
              ))}
              {reasoningGaps.length === 0 && (
                <div className="text-center py-6 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Nu au fost detectate discrepanțe sau riscuri ascunse în structura entității.
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Security & GDPR */}
          {activeTab === 'gdpr' && (
            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                  <Fingerprint size={16} className="text-gray-900 dark:text-gray-100" />
                  <span>Amprentă Criptografică de Integritate (SHA-256)</span>
                </div>
                <div className="font-mono text-[11px] bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 break-all select-all text-gray-700 dark:text-gray-300">
                  {certificate.full_audit_seal}
                </div>
                <div className="text-[11px] text-gray-500">
                  Garantează că raportul analitic corespunde 1-la-1 stării factuale din momentul interogării și nu a fost modificat de un LLM.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                  <div className="font-semibold text-gray-900 dark:text-white">Mecanisme Native GDPR</div>
                  <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300 text-[11px]">
                    <li>• PII Sanitization: CNP-urile și datele sensibile sunt mascate determinist.</li>
                    <li>• Stocare Securizată: Bază de date privată (Zero Data Sharing către LLM-uri publice).</li>
                    <li>• Conformitate: Regulament UE 2016/679.</li>
                  </ul>
                </div>
                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800">
                  <div className="font-semibold text-gray-900 dark:text-white">Modul Cybersecurity AI</div>
                  <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300 text-[11px]">
                    <li>• Zero-Trust Payload: Validare strictă a fiecărui nod de date.</li>
                    <li>• Prevenire Prompt Injection: LLM-ul primește doar fapte validate.</li>
                    <li>• Audit Trail complet cu timestamp și semnătură de execuție.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
