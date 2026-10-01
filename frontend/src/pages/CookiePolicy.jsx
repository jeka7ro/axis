import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Cookie, ArrowLeft, ShieldCheck, Printer, Settings2 } from 'lucide-react';

const CookiePolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 pt-2 animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shadow-2xs"
        >
          <ArrowLeft size={14} /> Înapoi
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Printer size={13} /> Imprimă Politica
          </button>

          <button
            onClick={() => window.__axisOpenCookiePreferences && window.__axisOpenCookiePreferences()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-all shadow-xs"
          >
            <Settings2 size={13} /> Modifică Preferințele Cookie
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10 border border-gray-200 dark:border-gray-700 shadow-sm space-y-8">
        <div className="border-b border-gray-100 dark:border-gray-700 pb-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Cookie size={14} /> Directiva ePrivacy & Legea nr. 506/2004
            </span>
            <span className="text-xs text-gray-400 ">
              Versiunea 2.4 • Octombrie 2026
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Politica privind Modulele Cookie și Tehnologiile de Stocare
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Această politică explică în mod transparent ce sunt fișierele cookie, cum le utilizează <strong>AXIS MOBILITY S.R.L.</strong> și cum poți controla opțiunile tale în conformitate cu <strong>Regulamentul (UE) 2016/679</strong> și <strong>Legea nr. 506/2004</strong> privind prelucrarea datelor în comunicații electronice.
          </p>
        </div>

        {/* 1. Ce sunt cookie-urile */}
        <section className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-extrabold flex items-center justify-center">1</span>
            Ce Sunt Modulele Cookie?
          </h2>
          <p>
            Un modul cookie este un fișier text de mici dimensiuni pe care un site web îl salvează pe computerul sau dispozitivul dumneavoastră mobil atunci când îl vizitați. Datorită cookie-urilor, platforma reține acțiunile și preferințele dumneavoastră (autentificare, limbă, dimensiunea caracterelor și alte preferințe de afișare) pe o perioadă de timp.
          </p>
        </section>

        {/* 2. Tabel detaliat cookie-uri */}
        <section className="space-y-4 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-extrabold flex items-center justify-center">2</span>
            Tabelul Modulelor Cookie Utilizate pe Platforma Axis
          </h2>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3">Denumire / Cheie</th>
                  <th className="px-4 py-3">Categorie</th>
                  <th className="px-4 py-3">Scopul Utilizării</th>
                  <th className="px-4 py-3">Durată Stocare</th>
                  <th className="px-4 py-3">Tip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">axis_token</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">Strict Necesar</td>
                  <td className="px-4 py-3 text-gray-500">Autentificare sesiune utilizator și verificare securizată a tokenului JWT.</td>
                  <td className="px-4 py-3">7 zile / Sesiune</td>
                  <td className="px-4 py-3">First-party</td>
                </tr>
                <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">axis_cookie_consent_v1</td>
                  <td className="px-4 py-3 font-semibold text-emerald-600">Strict Necesar</td>
                  <td className="px-4 py-3 text-gray-500">Înregistrează opțiunile de consimțământ GDPR pentru a nu afișa repetat bannerul.</td>
                  <td className="px-4 py-3">12 luni</td>
                  <td className="px-4 py-3">First-party</td>
                </tr>
                <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">theme_mode</td>
                  <td className="px-4 py-3 font-semibold text-blue-600">Funcțional</td>
                  <td className="px-4 py-3 text-gray-500">Reține tema selectată de utilizator (Mod Întunecat sau Mod Luminos).</td>
                  <td className="px-4 py-3">Permanent</td>
                  <td className="px-4 py-3">First-party</td>
                </tr>
                <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">user_active_role</td>
                  <td className="px-4 py-3 font-semibold text-blue-600">Funcțional</td>
                  <td className="px-4 py-3 text-gray-500">Memorează rolul activ selectat în comutatorul executiv din interfață.</td>
                  <td className="px-4 py-3">Sesiune</td>
                  <td className="px-4 py-3">First-party</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Controlul cookie-urilor */}
        <section className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Settings2 size={16} />
            Cum Poți Controla și Modifica Oricând Preferințele?
          </h2>
          <p>
            Ai dreptul deplin de a modifica sau revoca oricând consimțământul acordat pentru cookie-urile opționale. Poți accesa oricând panoul de control dând click pe butonul de mai jos sau pe link-ul <strong>„Setări Cookie”</strong> aflat în subsolul oricărei pagini din platforma Axis.
          </p>
          <div className="pt-1">
            <button
              onClick={() => window.__axisOpenCookiePreferences && window.__axisOpenCookiePreferences()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-all shadow-xs"
            >
              Deschide Panoul de Preferințe Cookie
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CookiePolicy;
