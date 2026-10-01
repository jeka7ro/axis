import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Cookie, Settings2, X, Check, ExternalLink } from 'lucide-react';

const STORAGE_KEY = 'axis_cookie_consent_v1';

export const CookieBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);

  // Cookie categories state
  const [preferences, setPreferences] = useState({
    necessary: true, // Always true and cannot be disabled
    functional: true,
    analytics: false
  });

  useEffect(() => {
    // Check if consent has already been given
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      // Delay showing banner slightly for smooth UX
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    } else {
      try {
        const parsed = JSON.parse(saved);
        setPreferences({
          necessary: true,
          functional: Boolean(parsed.functional),
          analytics: Boolean(parsed.analytics)
        });
      } catch (e) {
        // Invalid json, reset
        setIsVisible(true);
      }
    }
  }, []);

  // Allow global opening of cookie preferences from footer or privacy policy
  useEffect(() => {
    window.__axisOpenCookiePreferences = () => {
      setIsPreferencesOpen(true);
    };
    return () => {
      delete window.__axisOpenCookiePreferences;
    };
  }, []);

  const saveConsent = (settings) => {
    const payload = {
      necessary: true,
      functional: Boolean(settings.functional),
      analytics: Boolean(settings.analytics),
      timestamp: new Date().toISOString(),
      policyVersion: 'v2.4 - Octombrie 2026'
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    setPreferences(payload);
    setIsVisible(false);
    setIsPreferencesOpen(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ necessary: true, functional: true, analytics: true });
  };

  const handleAcceptNecessaryOnly = () => {
    saveConsent({ necessary: true, functional: false, analytics: false });
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  if (!isVisible && !isPreferencesOpen) return null;

  return (
    <>
      {/* Floating Bottom Cookie Consent Banner (Mac OS Tahoe Style) */}
      {isVisible && !isPreferencesOpen && (
        <aside 
          aria-label="Consimțământ Cookie-uri"
          className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-xl z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
        >
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-gray-200/90 dark:border-gray-700/90 shadow-2xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-gray-100 dark:bg-gray-800 rounded-2xl text-gray-900 dark:text-white shrink-0 mt-0.5">
                <Cookie size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Protecția Datelor & Utilizare Cookie-uri</span>
                  <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    GDPR • ANSPDCP
                  </span>
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  Platforma Axis utilizează module cookie strict necesare pentru autentificare securizată, sesiune și protecție CSRF. Opțional, folosim preferințe funcționale pentru a-ți asigura o experiență optimă conform <strong>Regulamentului (UE) 2016/679 (GDPR)</strong> și <strong>Legii nr. 190/2018</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1 border-t border-gray-100 dark:border-gray-800 text-xs">
              <div className="flex items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
                <Link to="/privacy" className="hover:text-gray-900 dark:hover:text-white underline">
                  Politica GDPR
                </Link>
                <span>•</span>
                <Link to="/cookies" className="hover:text-gray-900 dark:hover:text-white underline">
                  Politica Cookie
                </Link>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsPreferencesOpen(true)}
                  className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Preferințe
                </button>

                <button
                  type="button"
                  onClick={handleAcceptNecessaryOnly}
                  className="px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Doar Necesare
                </button>

                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-1.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-all shadow-xs"
                >
                  Acceptă Toate
                </button>
              </div>
            </div>
          </div>
        </aside>
      )}

      {/* Detailed Cookie Preferences Modal (Mac OS Tahoe Style) */}
      {isPreferencesOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden flex flex-col my-8">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full">
                  <Settings2 size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                    Centrul de Preferințe Confidențialitate & Cookie-uri
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Conform Regulamentului (UE) 2016/679 și Legii nr. 506/2004
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPreferencesOpen(false)}
                className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body: Categories */}
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto text-xs">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Când vizitezi platforma Axis Mobility, stocăm informații în browserul tău sub formă de module cookie și localStorage. Poți configura liber categoriile opționale:
              </p>

              {/* 1. Necessary (Locked) */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-gray-900 dark:text-white">Strict Necesare (Esențiale)</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                    Întotdeauna Active
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-relaxed">
                  Necesare pentru funcționarea platformei: autentificare token JWT, menținere sesiune, securitate împotriva atacurilor CSRF și integritatea datelor. Nu pot fi dezactivate.
                </p>
              </div>

              {/* 2. Functional & Preferences */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 dark:text-white">Funcționale & Preferințe</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={preferences.functional}
                      onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-gray-900"></div>
                  </label>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-relaxed">
                  Permit memorarea opțiunilor tale personalizate: tema interfeței (Dark Mode / Light Mode), starea panourilor de lucru și rolul activ selectat.
                </p>
              </div>

              {/* 3. Analytics & Performance */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 dark:text-white">Analitice & Performanță</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-gray-900"></div>
                  </label>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-[11px] leading-relaxed">
                  Ne ajută să măsurăm viteza de răspuns a cererilor și stabilitatea platformei prin metrici agregate anonime, fără a identifica direct utilizatorii.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="text-xs text-gray-600 dark:text-gray-300 hover:underline"
              >
                Activează Toate
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreferencesOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Anulează
                </button>
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="px-5 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-all shadow-xs"
                >
                  Salvează Preferințele
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieBanner;
