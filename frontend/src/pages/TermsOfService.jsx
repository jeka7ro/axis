import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, ShieldCheck, Printer, Building2, Scale, Lock } from 'lucide-react';

const TermsOfService = () => {
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

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Printer size={13} /> Imprimă Termenii
        </button>
      </div>

      {/* Main Card (Mac OS Tahoe Style) */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10 border border-gray-200 dark:border-gray-700 shadow-sm space-y-8">
        <div className="border-b border-gray-100 dark:border-gray-700 pb-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <Scale size={14} /> Termeni și Condiții Contractuale
            </span>
            <span className="text-xs text-gray-400 ">
              Ultima actualizare: 01 Octombrie 2026
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Termeni și Condiții de Utilizare a Platformei Axis Mobility
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Prezentul document stabilește termenii și condițiile în care orice utilizator autorizat, partener de mobilitate sau client corporate poate accesa și utiliza platforma digitală operată de <strong>AXIS MOBILITY S.R.L.</strong>
          </p>
        </div>

        {/* 1. Prevederi Generale */}
        <section className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-extrabold flex items-center justify-center">1</span>
            Prevederi Generale și Părțile Contractante
          </h2>
          <p>
            Platforma digitală Axis este operată de <strong>AXIS MOBILITY S.R.L.</strong>, persoană juridică română cu sediul în București, CUI RO41298450, Reg. Com. J40/8940/2019. Prin crearea unui cont și utilizarea platformei, confirmați că ați luat la cunoștință și acceptați necondiționat acești termeni, precum și Politica de Confidențialitate GDPR asociată.
          </p>
        </section>

        {/* 2. Destinația Serviciului */}
        <section className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-extrabold flex items-center justify-center">2</span>
            Destinația Platformei și Serviciile Furnizate
          </h2>
          <p>
            Platforma Axis pune la dispoziția utilizatorilor autorizați instrumente specializate de:
          </p>
          <ul className="space-y-1.5 ml-4 list-disc">
            <li>Management și monitorizare a parcului auto propriu sau închiriat (telemetrie satelitară, odometru, revizii tehnice periodice, asigurări RCA și CASCO).</li>
            <li>Configurare și generare contracte și oferte de leasing operațional și rent-a-car.</li>
            <li>Analiză faptică a solvabilității financiare și scoring de creditare a clienților corporativi prin interogare autorizată a bazelor publice oficiale (ANAF, ONRC, CIP, BPI, Portalul Instanțelor de Judecată).</li>
            <li>Protocol de securitate activă și asistență telemetrică la distanță.</li>
          </ul>
        </section>

        {/* 3. Confidențialitate & Securitate */}
        <section className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-extrabold flex items-center justify-center">3</span>
            Confidențialitatea Credențialelor și Secretul Comercial
          </h2>
          <p>
            Utilizatorii au obligația strictă de a păstra confidențialitatea numelui de utilizator și parolei de acces. Orice acțiune efectuată prin intermediul unui cont valid este prezumată a fi autorizată de titularul contului. Datele financiare, scoringurile de risc și ofertele comerciale generate prin platformă constituie secret comercial și informații confidențiale aparținând Axis Mobility.
          </p>
        </section>

        {/* 4. Telemetrie și Utilizare Flotă */}
        <section className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-extrabold flex items-center justify-center">4</span>
            Monitorizare GPS, Plafon Kilometric și Securitate Flotă
          </h2>
          <p>
            Autovehiculele din parcul auto Axis sunt echipate cu unități de telemetrie satelitară GPS și CAN-bus destinate protecției patrimoniale și respectării plafoanelor contractuale. Utilizatorul recunoaște și acceptă că:
          </p>
          <ul className="space-y-1.5 ml-4 list-disc">
            <li>Depășirea plafonului kilometric inclus pe contract atrage facturarea automată a tarifului convenit per kilometru suplimentar conform fișei vehiculului.</li>
            <li>Părăsirea teritoriului României fără acordul scris prealabil al Axis Mobility activează automat alerte de securitate transfrontalieră și protocolul de imobilizare a demarorului la oprirea motorului.</li>
          </ul>
        </section>

        {/* 5. Legea Aplicabilă și Jurisdicție */}
        <section className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 size={16} />
            Legea Aplicabilă și Jurisdicția Competentă
          </h2>
          <p>
            Prezenții termeni și condiții sunt guvernați exclusiv de <strong>legislația română</strong>. Orice litigiu decurgând din sau în legătură cu utilizarea platformei va fi soluționat pe cale amiabilă, iar în caz de neînțelegere, competența revine exclusiv <strong>instanțelor judecătorești competente de la sediul Axis Mobility din municipiul București</strong>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
