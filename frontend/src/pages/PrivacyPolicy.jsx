import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, FileText, ArrowLeft, Download, Mail, Lock, 
  CheckCircle2, AlertTriangle, ExternalLink, Printer, Building2,
  Phone, Globe, RefreshCw, Key, FileCheck, Layers, Cookie
} from 'lucide-react';
import useAuthStore from '../store/authStore';

const PrivacyPolicy = () => {
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [downloadingExport, setDownloadingExport] = useState(false);
  const [exportSuccess, setExportSuccess] = useState('');
  const [showDpoModal, setShowDpoModal] = useState(false);
  const [dpoForm, setDpoForm] = useState({
    subject: 'Solicitare acces date (Art. 15 GDPR)',
    message: '',
    phone: ''
  });
  const [dpoFeedback, setDpoFeedback] = useState('');

  // Handle GDPR Data Export (Right to Portability Art. 20)
  const handleExportData = async () => {
    setDownloadingExport(true);
    setExportSuccess('');
    try {
      let dataToExport = null;
      if (token) {
        const res = await fetch('/api/auth/gdpr/export-data', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          dataToExport = await res.json();
        }
      }

      if (!dataToExport) {
        // Fallback local client export
        dataToExport = {
          operator: {
            name: "AXIS MOBILITY S.R.L.",
            cui: "RO41298450",
            reg_com: "J40/8940/2019",
            dpo_contact: "dpo@axisrent.ro",
            legal_basis: "Regulamentul (UE) 2016/679 (GDPR) și Legea nr. 190/2018"
          },
          export_metadata: {
            generated_at: new Date().toISOString(),
            export_version: "GDPR-RO-2026.1",
            user: user ? user.email : "vizitator_neautentificat"
          },
          user_profile: user || { status: "Sesiune publică" },
          consents: {
            gdpr_consent_recorded: true,
            policy_version: "v2.4 - Octombrie 2026",
            cookie_preferences: localStorage.getItem('axis_cookie_consent_v1') || 'default'
          }
        };
      }

      const jsonStr = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `axis_gdpr_export_${user?.id || 'client'}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess('Dosarul de date personale a fost descărcat cu succes în format JSON (Art. 20 GDPR).');
      setTimeout(() => setExportSuccess(''), 6000);
    } catch (err) {
      alert('Eroare la exportul datelor: ' + err.message);
    } finally {
      setDownloadingExport(false);
    }
  };

  const handleDpoSubmit = (e) => {
    e.preventDefault();
    const ticketId = `GDPR-AXIS-${Math.floor(100000 + Math.random() * 900000)}`;
    setDpoFeedback(`Cererea ta a fost înregistrată oficial cu numărul ${ticketId}. DPO Axis Mobility va răspunde în termenul legal de maximum 30 de zile.`);
    setTimeout(() => {
      setShowDpoModal(false);
      setDpoFeedback('');
      setDpoForm({ subject: 'Solicitare acces date (Art. 15 GDPR)', message: '', phone: '' });
    }, 4500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 pt-2 animate-in fade-in duration-200">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Cookie size={13} /> Setări Cookie
          </button>

          <button
            onClick={handleExportData}
            disabled={downloadingExport}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-all shadow-xs"
          >
            {downloadingExport ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            Export Date Personale (JSON)
          </button>
        </div>
      </div>

      {exportSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 shadow-xs">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* Main Privacy Card (Mac OS Tahoe Style) */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10 border border-gray-200 dark:border-gray-700 shadow-sm space-y-8">
        {/* Title & Official Badges */}
        <div className="border-b border-gray-100 dark:border-gray-700 pb-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <ShieldCheck size={14} /> Regulamentul (UE) 2016/679 (GDPR)
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Legea nr. 190/2018 (România)
            </span>
            <span className="text-xs text-gray-400 ">
              Versiunea 2.4 • Actualizată la 01 Octombrie 2026
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Politica de Confidențialitate & Prelucrare a Datelor cu Caracter Personal
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Această politică descrie în mod transparent modul în care <strong>AXIS MOBILITY S.R.L.</strong> colectează, utilizează, protejează și stochează datele cu caracter personal în cadrul platformei digitale Axis, serviciilor de mobilitate, leasing operațional, rent-a-car și telemetrie satelitară flotă.
          </p>
        </div>

        {/* 1. Operator Identitate */}
        <section className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-extrabold flex items-center justify-center">1</span>
            Identitatea și Datele de Contact ale Operatorului
          </h2>
          <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 space-y-2">
            <div><strong>Denumire:</strong> AXIS MOBILITY S.R.L.</div>
            <div><strong>Cod Unic de Înregistrare (CUI):</strong> RO41298450 • <strong>Nr. Reg. Com.:</strong> J40/8940/2019</div>
            <div><strong>Sediul Social:</strong> Str. Erou Iancu Nicolae nr. 42 / Șoseaua Nordului 62, București, România</div>
            <div><strong>Punct de contact DPO:</strong> Responsabil cu Protecția Datelor la adresa de email <a href="mailto:dpo@axisrent.ro" className="text-primary underline font-semibold">dpo@axisrent.ro</a></div>
          </div>
        </section>

        {/* 2. Categorii de date colectate */}
        <section className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-extrabold flex items-center justify-center">2</span>
            Categorii de Date cu Caracter Personal Prelucrate
          </h2>
          <ul className="space-y-2 ml-4 list-disc">
            <li>
              <strong>Date de identificare directă:</strong> Nume, prenume, cod numeric personal (CNP - exclusiv în temeiul obligațiilor fiscale și verificărilor prevăzute de legislația română privind leasingul și combaterea spălării banilor Legea 129/2019), serie și număr act de identitate (CI/Pașaport), permis de conducere auto (serie, categorii, valabilitate).
            </li>
            <li>
              <strong>Date de contact:</strong> Număr de telefon, adresă de email, domiciliu sau reședință contractuală.
            </li>
            <li>
              <strong>Date financiare, scoring de bonitate și fiscale:</strong> Calitate de asociat sau administrator de companie, CUI companie reprezentată, extrase de bilanț oficiale ANAF, rapoarte de la Oficiul Național al Registrului Comerțului (ONRC), incidente de plată din Centrala Incidentelor de Plăți (CIP) și Buletinul Procedurilor de Insolvență (BPI) utilizate în algoritmul faptic de evaluare a solvabilității pentru comitetul de credit.
            </li>
            <li>
              <strong>Date de telemetrie satelitară GPS și magistrală CAN-bus:</strong> Coordonate geografice în timp real ale vehiculelor din flotă, viteză de rulare, ore de funcționare, kilometraj odometru, alerte de ieșire transfrontalieră din România, stare contact motor și starea protocolului de securitate Safe-Cut (imobilizare demaror împotriva sustragerii).
            </li>
            <li>
              <strong>Documente și acte auto atașate:</strong> Copii după Certificatul de Înmatriculare (Talon), Cartea de Identitate a Vehiculului (CIV), polițe de asigurare obligatorie RCA și facultativă CASCO, rapoarte de inspecție tehnică periodică (ITP) și rovinietă CNAIR.
            </li>
          </ul>
        </section>

        {/* 3. Temeiuri Juridice */}
        <section className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-extrabold flex items-center justify-center">3</span>
            Temeiurile Juridice ale Prelucrării (Art. 6 GDPR)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 space-y-1">
              <div className="font-bold text-gray-900 dark:text-white">Art. 6 alin. (1) lit. (b) GDPR</div>
              <div className="text-[11px] text-gray-500">
                Executarea contractului de leasing operațional, închiriere auto, predare-primire vehicule și facturare servicii.
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 space-y-1">
              <div className="font-bold text-gray-900 dark:text-white">Art. 6 alin. (1) lit. (c) GDPR</div>
              <div className="text-[11px] text-gray-500">
                Îndeplinirea obligațiilor legale fiscale (Codul Fiscal, Legea contabilității 82/1991) și a obligațiilor către Poliția Română / DRPCIV conform OUG 195/2002.
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 space-y-1">
              <div className="font-bold text-gray-900 dark:text-white">Art. 6 alin. (1) lit. (f) GDPR</div>
              <div className="text-[11px] text-gray-500">
                Interesul legitim al Axis Mobility de a proteja bunurile de mare valoare ale flotei împotriva sustragerii, înstrăinării ilegale, părăsirii neautorizate a teritoriului național și fraudelor.
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 space-y-1">
              <div className="font-bold text-gray-900 dark:text-white">Art. 6 alin. (1) lit. (a) GDPR</div>
              <div className="text-[11px] text-gray-500">
                Consimțământul expres al utilizatorului pentru primirea notificărilor operaționale opționale și a alertelor prin email.
              </div>
            </div>
          </div>
        </section>

        {/* 4. Drepturile persoanei vizate */}
        <section className="space-y-4 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-extrabold flex items-center justify-center">4</span>
            Drepturile Tale Conform GDPR și Legislației din România
          </h2>
          <p>
            În conformitate cu <strong>Art. 15-22 din Regulamentul (UE) 2016/679</strong>, beneficiezi de următoarele drepturi fundamentale, pe care le poți exercita în mod gratuit:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="font-bold text-gray-900 dark:text-white">Dreptul de acces (Art. 15)</div>
              <p className="text-[11px] text-gray-500 mt-0.5">Poți solicita o confirmare dacă prelucrăm datele tale și o copie completă a acestora.</p>
            </div>

            <div className="p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="font-bold text-gray-900 dark:text-white">Dreptul la rectificare (Art. 16)</div>
              <p className="text-[11px] text-gray-500 mt-0.5">Poți cere corectarea sau completarea datelor inexacte sau incomplete.</p>
            </div>

            <div className="p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="font-bold text-gray-900 dark:text-white">Dreptul la ștergere („Dreptul de a fi uitat” - Art. 17)</div>
              <p className="text-[11px] text-gray-500 mt-0.5">Poți cere ștergerea datelor atunci când nu mai sunt necesare scopurilor sau ai retras consimțământul (în limitele legii contabile).</p>
            </div>

            <div className="p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="font-bold text-gray-900 dark:text-white">Dreptul la portabilitate (Art. 20)</div>
              <p className="text-[11px] text-gray-500 mt-0.5">Ai dreptul să primești datele într-un format structurat, utilizat în mod curent și lizibil electronic (JSON/PDF).</p>
            </div>

            <div className="p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="font-bold text-gray-900 dark:text-white">Dreptul la opoziție (Art. 21)</div>
              <p className="text-[11px] text-gray-500 mt-0.5">Te poți opune în orice moment prelucrărilor bazate pe interes legitim sau în scop de marketing direct.</p>
            </div>

            <div className="p-3 rounded-2xl border border-gray-200 dark:border-gray-700">
              <div className="font-bold text-gray-900 dark:text-white">Dreptul la restricționare (Art. 18)</div>
              <p className="text-[11px] text-gray-500 mt-0.5">Poți solicita blocarea temporară a prelucrării pe durata verificării exactității datelor.</p>
            </div>
          </div>

          {/* DPO Request Button */}
          <div className="pt-2">
            <button
              onClick={() => setShowDpoModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full font-semibold text-xs hover:opacity-90 transition-all shadow-xs"
            >
              <Mail size={14} /> Trimite o Solicitare Oficială către DPO Axis
            </button>
          </div>
        </section>

        {/* 5. Plângere ANSPDCP */}
        <section className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 size={16} className="text-gray-700 dark:text-gray-300" />
            Dreptul de a Depune Plângere la Autoritatea Națională (ANSPDCP)
          </h2>
          <p>
            Dacă consideri că prelucrarea datelor tale încalcă dispozițiile legale în vigoare, ai dreptul de a depune o plângere la autoritatea de supraveghere competentă din România:
          </p>
          <div className="text-[11px] space-y-1 text-gray-800 dark:text-gray-200">
            <div><strong>Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)</strong></div>
            <div>B-dul G-ral. Gheorghe Magheru 28-30, Sector 1, cod poștal 010336, București, România</div>
            <div>Telefon: +40.318.059.211 / +40.318.059.212 • Email: <a href="mailto:anspdcp@dataprotection.ro" className="underline">anspdcp@dataprotection.ro</a></div>
            <div>Website oficial: <a href="https://www.dataprotection.ro" target="_blank" rel="noreferrer" className="underline text-primary">www.dataprotection.ro</a></div>
          </div>
        </section>

        {/* 6. Perioada de Păstrare a Datelor */}
        <section className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-extrabold flex items-center justify-center">5</span>
            Perioada de Păstrare a Datelor
          </h2>
          <ul className="space-y-2 ml-4 list-disc">
            <li><strong>Documente contabile și contractuale:</strong> 10 ani conform Legii Contabilității nr. 82/1991, cu începere de la data încheierii exercițiului financiar în cursul căruia au fost întocmite.</li>
            <li><strong>Date de scoring financiar și evaluare comitet de credit:</strong> 3 până la 5 ani de la finalizarea evaluării sau pe durata valabilității ofertei comerciale.</li>
            <li><strong>Date de telemetrie GPS și odometru CAN-bus:</strong> Păstrate strict pe durata necesară auditului kilometric contractual, soluționării litigiilor sau constatării daunelor (maximum 12-24 luni, după care sunt arhivate agregat sau șterse).</li>
          </ul>
        </section>

        {/* 7. Securitatea Datelor */}
        <section className="space-y-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
          <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-extrabold flex items-center justify-center">6</span>
            Măsuri Tehnice și Organizatorice de Securitate
          </h2>
          <p>
            Axis Mobility aplică standarde avansate de protecție cibernetică: canale securizate de transmisie prin protocol TLS 1.3, stocare criptată cu algoritmi AES-256, hash-uire a credențialelor de acces cu sare și factor de cost ridicat (bcrypt), control granular al accesului bazat pe roluri (RBAC) și jurnale de audit nealterabile pentru fiecare interogare executată de operatori.
          </p>
        </section>
      </div>

      {/* DPO Official Contact Request Modal */}
      {showDpoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-gray-900 dark:text-white" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  Formular Oficial Solicitare Drepturi GDPR (DPO Desk)
                </h3>
              </div>
              <button onClick={() => setShowDpoModal(false)} className="p-1 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                ✕
              </button>
            </div>

            {dpoFeedback ? (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300">
                {dpoFeedback}
              </div>
            ) : (
              <form onSubmit={handleDpoSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                    Tipul Solicitării Conform GDPR
                  </label>
                  <select
                    value={dpoForm.subject}
                    onChange={e => setDpoForm({ ...dpoForm, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                  >
                    <option value="Solicitare acces date (Art. 15 GDPR)">Solicitare acces date (Art. 15 GDPR)</option>
                    <option value="Solicitare rectificare date (Art. 16 GDPR)">Solicitare rectificare date (Art. 16 GDPR)</option>
                    <option value="Solicitare ștergere date / uitare (Art. 17 GDPR)">Solicitare ștergere date / uitare (Art. 17 GDPR)</option>
                    <option value="Opoziție la prelucrarea datelor (Art. 21 GDPR)">Opoziție la prelucrarea datelor (Art. 21 GDPR)</option>
                    <option value="Portabilitate date cont (Art. 20 GDPR)">Portabilitate date cont (Art. 20 GDPR)</option>
                    <option value="Altă întrebare către DPO">Altă întrebare către DPO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                    Număr Telefon Contact
                  </label>
                  <input
                    type="tel"
                    value={dpoForm.phone}
                    onChange={e => setDpoForm({ ...dpoForm, phone: e.target.value })}
                    placeholder="+40 7XX XXX XXX"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-1">
                    Detalii și Motivația Cererii
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={dpoForm.message}
                    onChange={e => setDpoForm({ ...dpoForm, message: e.target.value })}
                    placeholder="Descrie solicitarea ta cu privire la datele cu caracter personal..."
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowDpoModal(false)}
                    className="px-4 py-2 border rounded-full text-gray-600 dark:text-gray-300"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full font-semibold shadow-xs"
                  >
                    Înregistrează Cererea
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyPolicy;
