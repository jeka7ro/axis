import React, { useState } from 'react';
import { 
  Users, Briefcase, ExternalLink, Network, Search, Check, Copy, CheckSquare, 
  Layers, Building2, Eye, Loader2, UserCheck, CheckCircle2, ShieldAlert, 
  ChevronLeft, ChevronRight, X, FileText 
} from 'lucide-react';
import { fetchAdminNetwork } from '../services/api';

export default function CorporateGovernanceTable({
  rawData = {},
  client = {},
  openPersonIntel,
  openCompanyIntel,
  evaluatingCui = null,
  onEvaluateCompany = null,
}) {
  const [selectedPersonnelRows, setSelectedPersonnelRows] = useState([]);
  const [personnelPage, setPersonnelPage] = useState(1);
  const [personnelPerPage, setPersonnelPerPage] = useState(10);
  const [copiedPersonnelNames, setCopiedPersonnelNames] = useState(false);

  // Căutare manuală administrator / asociat
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminSearchResults, setAdminSearchResults] = useState(null);
  const [adminSearchLoading, setAdminSearchLoading] = useState(false);
  const [selectedHomonymIndex, setSelectedHomonymIndex] = useState(0);
  const [dismissedHomonymIndices, setDismissedHomonymIndices] = useState([]);
  const [showAllHomonyms, setShowAllHomonyms] = useState(false);

  const cleanClientCui = String(client?.cui_cnp || '').replace(/\D/g, '');

  const companyStare = String(
    client?.stare || 
    client?.status || 
    rawData?.anaf?.stare || 
    rawData?.stare || 
    rawData?.fiscal_status || 
    ''
  ).toUpperCase();

  const isCompanyRadiated = companyStare.includes('RADIAT') || companyStare.includes('RADIER');
  const isCompanyInsolvencyOrBankruptcy = companyStare.includes('FALIMENT') || companyStare.includes('LICHID') || companyStare.includes('INSOLVEN');

  const isLiquidatorRole = (person) => {
    const name = String(person?.nume || '').toUpperCase();
    const rol = String(person?.rol || '').toUpperCase();
    return (
      name.includes('SPRL') ||
      name.includes('IPURL') ||
      name.includes('LICHIDATOR') ||
      name.includes('INSOLV') ||
      rol.includes('LICHIDATOR') ||
      rol.includes('CURATOR') ||
      rol.includes('ADMINISTRATOR JUDICIAR') ||
      rol.includes('PRACTICIAN')
    );
  };

  // Colectăm lista de persoane cu fallback pe administrators și holdings
  const personnel = rawData?.personnel || [];
  const administrators = rawData?.administrators || [];
  const holdings = rawData?.holdings || [];
  const adminNetworks = rawData?.admin_networks || [];
  const bpi = rawData?.bpi || null;

  let personnelList = Array.isArray(personnel) && personnel.length > 0 
    ? [...personnel] 
    : [];

  if (personnelList.length === 0) {
    administrators.forEach(a => {
      const name = a.nume || a.name;
      if (!name) return;
      const netMatch = adminNetworks.find(n => n.nume && n.nume.trim().toUpperCase() === name.trim().toUpperCase());
      const rawFunctie = a.calitate || a.functie || (a.rol ? a.rol : "Administrator");
      personnelList.push({
        nume: name,
        rol: rawFunctie,
        este_administrator: true,
        este_asociat: false,
        cota_participare: 0,
        stare: a.stare || "Activ",
        data_numire: a.data || a.data_numire || "",
        data_sfarsit: a.data_sfarsit || "",
        tip_entitate: a.tip === "Persoană Juridică" || a.entity === "PJ" ? "PJ" : "PF",
        loc_nastere: a.loc_nastere || a.placeofbirth || "",
        alte_companii_active: netMatch ? (netMatch.firme_active || 0) : 0,
        companii_faliment: netMatch ? (netMatch.firme_incetate || 0) : 0
      });
    });

    holdings.forEach(h => {
      const name = h.name || h.nume;
      if (!name) return;
      const existing = personnelList.find(p => p.nume.toUpperCase() === name.toUpperCase());
      if (existing) {
        existing.este_asociat = true;
        existing.cota_participare = Number(h.percent || h.cota_participare || 0);
      } else {
        const netMatch = adminNetworks.find(n => n.nume && n.nume.trim().toUpperCase() === name.trim().toUpperCase());
        personnelList.push({
          nume: name,
          rol: h.type || (h.is_administrator ? "Asociat și Administrator" : "Asociat"),
          este_administrator: Boolean(h.is_administrator),
          este_asociat: true,
          cota_participare: Number(h.percent || h.cota_participare || 0),
          stare: h.current ? "Activ" : (h.stare || "Activ"),
          data_numire: h.from || h.data_numire || "",
          data_sfarsit: h.to || h.data_sfarsit || "",
          tip_entitate: h.entity || "PF",
          loc_nastere: h.placeofbirth || h.loc_nastere || "",
          alte_companii_active: netMatch ? (netMatch.firme_active || 0) : 0,
          companii_faliment: netMatch ? (netMatch.firme_incetate || 0) : 0
        });
      }
    });
  }

  // Smart Ownership calculation
  const smartOwnership = rawData?.smart_ownership || (() => {
    const activeShareholders = personnelList.filter(p => p.este_asociat && p.stare === 'Activ');
    const activeAdmins = personnelList.filter(p => p.este_administrator && p.stare === 'Activ');
    const historicShareholders = personnelList.filter(p => p.este_asociat && p.stare !== 'Activ');
    let beneficiar_real = "Nedeterminat";
    let tip_control = "Nespecificat";
    let insights = [];

    if (isCompanyRadiated) {
      beneficiar_real = client?.name || "Societate Radiată";
      tip_control = "SOCIETATE RADIATĂ";
      insights.push("Companie Radiată: Societatea este radiată oficial din evidențele Registrului Comerțului. Toate mandatele de administrare sunt stinse de drept.");
    } else if (isCompanyInsolvencyOrBankruptcy) {
      const liquidator = personnelList.find(isLiquidatorRole);
      if (liquidator) {
        beneficiar_real = `${liquidator.nume} (Lichidator Judiciar)`;
        tip_control = "LICHIDARE JUDICIARĂ";
        insights.push(`Procedură de Lichidare / Faliment: Controlul și administrarea patrimoniului sunt exercitate de ${liquidator.nume} (Lichidator Judiciar Desemnat).`);
      } else {
        tip_control = "PROCEDURĂ DE INSOLVENȚĂ";
        insights.push("Compania se află în procedură de insolvență sau faliment deschis în evidențele oficiale.");
      }
    } else if (activeShareholders.length === 1) {
      const s = activeShareholders[0];
      beneficiar_real = `${s.nume} (${s.cota_participare || 100}%)`;
      tip_control = (s.cota_participare >= 99) ? "ASOCIAT UNIC" : "CONTROL MAJORITAR";
      insights.push(`Beneficiar Real & Control: ${s.nume} deține ${s.cota_participare || 100}% din părțile sociale ale companiei (${tip_control}).`);
    } else if (activeShareholders.length > 1) {
      const maj = activeShareholders.find(s => (s.cota_participare || 0) > 50);
      if (maj) {
        beneficiar_real = `${maj.nume} (${maj.cota_participare}%)`;
        tip_control = "CONTROL MAJORITAR";
        insights.push(`Acționar Majoritar: ${maj.nume} deține pachetul de control (${maj.cota_participare}%).`);
      } else {
        beneficiar_real = "Acționariat Partajat";
        tip_control = "CONTROL PARTAJAT";
        const parts = activeShareholders.map(s => `${s.nume} (${s.cota_participare || 0}%)`).join(', ');
        insights.push(`Acționariat Partajat: ${parts}.`);
      }
    } else if (activeAdmins.length > 0) {
      const firstAdmin = activeAdmins[0];
      const roleText = firstAdmin.rol || "Administrator";
      beneficiar_real = `${firstAdmin.nume} (${roleText})`;
      tip_control = isLiquidatorRole(firstAdmin) ? "LICHIDARE JUDICIARĂ" : "CONDUCERE MANDATATĂ";
      insights.push(`Conducere Oficială: ${firstAdmin.nume} exercită funcția de ${roleText}.`);
    }

    const unsharedAdmins = activeAdmins.filter(a => !a.este_asociat || !a.cota_participare);
    if (!isCompanyRadiated && unsharedAdmins.length > 0) {
      insights.push(`Management Mandatat: Administratorul curent (${unsharedAdmins.map(a => a.nume).join(', ')}) nu deține părți sociale (mandat executiv extern / desemnare judiciară).`);
    } else if (!isCompanyRadiated && activeShareholders.some(s => s.este_administrator)) {
      insights.push(`Antreprenor Direct: Asociatul principal exercită concomitent și funcția de administrator.`);
    }

    const istoric_cesiuni = historicShareholders.map(h => `${h.nume} (${h.cota_participare || 0}%)`);
    if (istoric_cesiuni.length > 0) {
      insights.push(`Istoric Cesiuni: Foști asociați retrași din societate: ${istoric_cesiuni.join(', ')}.`);
    }

    return {
      beneficiar_real,
      tip_control,
      separare_management: unsharedAdmins.length > 0,
      istoric_cesiuni,
      insights,
      active_shareholders_count: activeShareholders.length,
      active_admins_count: activeAdmins.length,
      historic_shareholders_count: historicShareholders.length
    };
  })();

  // Pagination for personnel table
  const totalPersonnel = personnelList.length;
  const totalPersonnelPages = Math.ceil(totalPersonnel / personnelPerPage) || 1;
  const currentPersonnelPage = Math.min(personnelPage, totalPersonnelPages);
  const startIdx = (currentPersonnelPage - 1) * personnelPerPage;
  const paginatedPersonnel = personnelList.slice(startIdx, startIdx + personnelPerPage);

  const allCurrentPageSelected = paginatedPersonnel.length > 0 && paginatedPersonnel.every(p => selectedPersonnelRows.includes(p.nume));

  const handleToggleSelectAll = () => {
    const pageNames = paginatedPersonnel.map(p => p.nume);
    if (allCurrentPageSelected) {
      setSelectedPersonnelRows(prev => prev.filter(n => !pageNames.includes(n)));
    } else {
      setSelectedPersonnelRows(prev => Array.from(new Set([...prev, ...pageNames])));
    }
  };

  const handleToggleRow = (name) => {
    setSelectedPersonnelRows(prev => 
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleCopySelectedPersonnel = () => {
    navigator.clipboard.writeText(selectedPersonnelRows.join(', '));
    setCopiedPersonnelNames(true);
    setTimeout(() => setCopiedPersonnelNames(false), 2000);
  };

  const handleSearchAdminSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!adminSearchQuery || adminSearchQuery.trim().length < 2) return;
    setAdminSearchLoading(true);
    setDismissedHomonymIndices([]);
    setSelectedHomonymIndex(0);
    setShowAllHomonyms(false);
    try {
      const res = await fetchAdminNetwork(adminSearchQuery.trim(), client?.cui_cnp || '');
      setAdminSearchResults(res || []);
    } catch (err) {
      console.error(err);
      alert('Eroare la căutarea administratorului: ' + (err.message || err));
    } finally {
      setAdminSearchLoading(false);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-in fade-in">
      {/* Radiated Company Alert if applicable */}
      {isCompanyRadiated && (
        <div className="p-4 rounded-2xl border border-gray-300 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800/90 flex items-start gap-3.5 shadow-sm mb-6">
          <div className="p-2.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            <FileText size={20} />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
              Statut Juridic Companie
            </div>
            <div className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">
              SOCIETATE RADIATĂ DIN REGISTRUL COMERȚULUI
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Toate mandatele executive ale administratorilor și calitatea de asociat sunt consemnate ca stinse în evidențele oficiale.
            </p>
          </div>
        </div>
      )}

      {/* BPI Insolvency Alert if active */}
      {bpi?.has_insolvency && (
        <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50/70 dark:bg-red-950/20 flex items-start gap-3.5 shadow-sm mb-6">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
            <ShieldAlert size={20} />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-semibold text-red-500 uppercase tracking-wider">
              Buletinul Procedurilor de Insolvență (BPI)
            </div>
            <div className="text-sm font-bold text-red-700 dark:text-red-300 mt-0.5">
              ALERTĂ CRITICĂ: {bpi.count} Dosare / Publicații Active
            </div>
            <p className="text-xs text-red-600/80 dark:text-red-400 mt-1">
              Compania figurează cu proceduri de insolvență sau faliment deschise în BPI.
            </p>
          </div>
        </div>
      )}

      <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2 text-base">
        <Users size={18} className="text-gray-700 dark:text-gray-300" /> Structură Asociați &amp; Conducere Executivă
      </h4>

      {/* Smart Ownership Summary Strip */}
      <div className="mb-6 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/20 dark:bg-indigo-950/10 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Beneficiar Real */}
          <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-800/90 shadow-xs">
            <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Users size={13} />
              <span>Beneficiar Real &amp; Control</span>
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white mt-1 truncate" title={smartOwnership.beneficiar_real}>
              {smartOwnership.beneficiar_real}
            </div>
            <div className="inline-block mt-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
              {smartOwnership.tip_control}
            </div>
          </div>

          {/* Separare Management */}
          <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-800/90 shadow-xs">
            <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase size={13} />
              <span>Separare Management</span>
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">
              {smartOwnership.separare_management ? 'Management Mandatat Extern' : 'Antreprenor Direct'}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
              {smartOwnership.separare_management 
                ? 'Administratorul înregistrat nu deține părți sociale (mandat executiv extern sau numire judiciară).' 
                : 'Asociatul deține și exercită direct controlul executiv asupra companiei.'}
            </p>
          </div>

          {/* Istoric Cesiuni */}
          <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-800/90 shadow-xs">
            <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} />
              <span>Istoric Cesiuni / Retrageri</span>
            </div>
            <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">
              {smartOwnership.historic_shareholders_count > 0 
                ? `${smartOwnership.historic_shareholders_count} foști asociați retrași`
                : 'Structură stabilă'}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5">
              {smartOwnership.istoric_cesiuni?.length > 0 
                ? smartOwnership.istoric_cesiuni.slice(0, 2).join('; ')
                : 'Fără cesiuni sau schimbări de acționariat recente.'}
            </p>
          </div>
        </div>

        {smartOwnership.insights?.length > 0 && (
          <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/30 text-xs text-indigo-950 dark:text-indigo-200 space-y-1.5">
            <div className="font-semibold flex items-center gap-1 text-[11px] uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              <span>Concluzii Cheie din Structura Corporate:</span>
            </div>
            {smartOwnership.insights.map((ins, iIdx) => (
              <div key={iIdx} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                <span>{ins}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedPersonnelRows.length > 0 && (
        <div className="mb-3 p-2.5 px-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between text-xs animate-in fade-in duration-150">
          <div className="font-semibold text-primary flex items-center gap-2">
            <CheckSquare size={15} />
            <span>{selectedPersonnelRows.length} {selectedPersonnelRows.length === 1 ? 'persoană selectată' : 'persoane selectate'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySelectedPersonnel}
              className="px-2.5 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer flex items-center gap-1 font-medium shadow-xs"
            >
              {copiedPersonnelNames ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              <span>{copiedPersonnelNames ? 'Copiat!' : 'Copiază Nume'}</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPersonnelRows([])}
              className="px-2.5 py-1 text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors cursor-pointer font-medium"
            >
              Deselectează
            </button>
          </div>
        </div>
      )}

      {/* Personnel Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-xs">
        <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-3 py-3 w-10 text-center">
                <input
                  type="checkbox"
                  checked={allCurrentPageSelected}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary/30 cursor-pointer"
                />
              </th>
              <th className="px-3 py-3 w-12 text-center font-bold text-gray-700 dark:text-gray-300">
                Nr. Crt.
              </th>
              <th className="px-4 py-3">Nume &amp; Calitate Oficială</th>
              <th className="px-4 py-3">Funcție / Rol</th>
              <th className="px-4 py-3 text-center">Cota Participare</th>
              <th className="px-4 py-3 text-center">Stare Mandat</th>
              <th className="px-4 py-3 text-center" title="Firme active înregistrate la Registrul Comerțului">Firme Active</th>
              <th className="px-4 py-3 text-center" title="Firme în insolvență, faliment sau radiate">Firme Faliment</th>
              <th className="px-4 py-3 text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
            {paginatedPersonnel.map((person, idx) => {
              const isSelected = selectedPersonnelRows.includes(person.nume);
              const absoluteIndex = startIdx + idx + 1;
              const isLiquidator = isLiquidatorRole(person);

              let displayStare = person.stare || "Activ";
              let stareBadgeClass = "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60";

              if (isCompanyRadiated) {
                displayStare = person.data_sfarsit ? "Mandat Expirat" : "Stins (Firmă Radiată)";
                stareBadgeClass = "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700";
              } else if (isCompanyInsolvencyOrBankruptcy) {
                if (isLiquidator) {
                  displayStare = "Desemnat Judiciar";
                  stareBadgeClass = "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800";
                } else if (person.este_administrator) {
                  displayStare = "Mandat Suspendat";
                  stareBadgeClass = "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800";
                } else if (displayStare === 'Activ') {
                  stareBadgeClass = "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60";
                } else {
                  stareBadgeClass = "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700";
                }
              } else if (displayStare !== 'Activ') {
                stareBadgeClass = "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700";
              }

              return (
                <tr key={idx} className={`hover:bg-gray-50/60 dark:hover:bg-gray-700/30 transition-colors ${isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''}`}>
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleRow(person.nume)}
                      className="w-4 h-4 rounded text-primary border-gray-300 focus:ring-primary/30 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-400 text-xs">
                    {absoluteIndex}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openPersonIntel && openPersonIntel(person.nume, client?.cui_cnp)}
                        className="hover:text-primary hover:underline transition-colors text-left font-bold inline-flex items-center gap-1.5 cursor-pointer group"
                        title="Deschide dosar complet pentru această persoană"
                      >
                        <span>{person.nume}</span>
                        <ExternalLink size={11} className="text-gray-400 group-hover:text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        person.tip_entitate === 'PJ' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {person.tip_entitate || 'PF'}
                      </span>
                    </div>
                    {person.loc_nastere && (
                      <div className="text-[10px] text-gray-400 font-normal">Origine: {person.loc_nastere}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isLiquidator ? (
                          <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-700 rounded-md text-xs font-bold whitespace-nowrap flex items-center gap-1">
                            <ShieldAlert size={11} className="text-amber-600 dark:text-amber-400" />
                            Lichidator Judiciar Desemnat
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs font-semibold capitalize whitespace-nowrap">
                            {person.rol || "Administrator"}
                          </span>
                        )}
                        {person.este_asociat && (
                          <span className="px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-[9px] font-bold">
                            ASOCIAT
                          </span>
                        )}
                      </div>
                      {person.data_numire && (
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          Din: {person.data_numire} {person.data_sfarsit ? `– ${person.data_sfarsit}` : ''}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    {person.cota_participare > 0 ? (
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs">
                        {person.cota_participare}%
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${stareBadgeClass}`}>
                      {displayStare}
                    </span>
                  </td>
                  <td className={`px-4 py-2.5 text-center font-medium whitespace-nowrap ${person.alte_companii_active > 3 ? 'text-orange-500 font-bold' : ''}`}>
                    {person.alte_companii_active}
                  </td>
                  <td className="px-4 py-2.5 text-center font-medium whitespace-nowrap">
                    {person.companii_faliment > 0 ? (
                      <span className="text-red-500 font-bold">{person.companii_faliment} (Risc)</span>
                    ) : (
                      <span className="text-green-500 font-medium">0</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openPersonIntel && openPersonIntel(person.nume, client?.cui_cnp)}
                      className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-primary hover:text-white hover:border-primary transition-colors cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-xs"
                      title="Deschide investigația rețelei"
                    >
                      <Network size={14} className="text-primary group-hover:text-white" />
                      <span className="pr-1">Rețea</span>
                    </button>
                  </td>
                </tr>
              );
            })}
            {personnelList.length === 0 && (
              <tr>
                <td colSpan="9" className="px-4 py-6 text-center text-gray-500">
                  <p className="font-medium text-gray-600 dark:text-gray-400">Nu au fost găsiți asociați sau administratori înregistrați.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Table Footer with Pagination Controls */}
        <div className="p-3 bg-gray-50/80 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>Afișează</span>
            <select
              value={personnelPerPage}
              onChange={(e) => {
                setPersonnelPerPage(Number(e.target.value));
                setPersonnelPage(1);
              }}
              className="px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
            <span>pe pagină</span>
            <span className="mx-2">•</span>
            <span>Total: <strong className="text-gray-900 dark:text-white">{totalPersonnel}</strong> asociați / administratori</span>
          </div>

          {totalPersonnelPages > 1 && (
            <div className="flex items-center gap-2">
              <span>Pagină {currentPersonnelPage} din {totalPersonnelPages}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentPersonnelPage <= 1}
                  onClick={() => setPersonnelPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Pagina precedentă"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  disabled={currentPersonnelPage >= totalPersonnelPages}
                  onClick={() => setPersonnelPage(p => Math.min(totalPersonnelPages, p + 1))}
                  className="p-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Pagina următoare"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Portofoliu Firme & Rețea Asociați & Conducere */}
      <div className="mt-8 border-t border-gray-100 dark:border-gray-800 pt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
              <Briefcase size={18} className="text-primary" /> Portofoliu Firme &amp; Rețea Asociați &amp; Conducere
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Identificare automată a tuturor companiilor unde asociații și administratorii dețin calitatea de asociat sau administrator.
            </p>
          </div>

          {/* Căutare rapidă alt administrator */}
          <form onSubmit={handleSearchAdminSubmit} className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={adminSearchQuery}
                onChange={(e) => setAdminSearchQuery(e.target.value)}
                placeholder="Caută alt asociat sau administrator..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/30 text-gray-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={adminSearchLoading || !adminSearchQuery.trim()}
              className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              {adminSearchLoading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
              <span>Caută</span>
            </button>
          </form>
        </div>

        {/* Afișare rezultate căutare manuală */}
        {adminSearchResults && (() => {
          const companyMatches = adminSearchResults.filter(p => 
            (p.firme || []).some(f => String(f.cui).replace(/\D/g, '') === cleanClientCui)
          );
          const hasCompanyMatch = companyMatches.length > 0;
          const nonDismissed = adminSearchResults.filter((_, idx) => !dismissedHomonymIndices.includes(idx));
          const resultsToDisplay = (!showAllHomonyms && hasCompanyMatch) ? companyMatches : nonDismissed;
          const hiddenHomonymsCount = adminSearchResults.length - resultsToDisplay.length;

          return (
            <div className="mb-6 p-4 rounded-2xl border-2 border-primary/40 bg-primary/5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <UserCheck size={15} /> 
                    <span>Rezultat căutare: "{adminSearchQuery}"</span>
                  </div>
                  {hasCompanyMatch && hiddenHomonymsCount > 0 && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="shrink-0" />
                      <span>S-a identificat automat persoana legată de această firmă. ({hiddenHomonymsCount} omonimi ascunși).</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {hiddenHomonymsCount > 0 && !showAllHomonyms && (
                    <button
                      type="button"
                      onClick={() => setShowAllHomonyms(true)}
                      className="text-xs text-primary underline hover:text-primary/80 font-medium cursor-pointer"
                    >
                      Arată toți ({adminSearchResults.length}) omonimii
                    </button>
                  )}
                  {showAllHomonyms && (
                    <button
                      type="button"
                      onClick={() => setShowAllHomonyms(false)}
                      className="text-xs text-gray-500 underline hover:text-gray-700 dark:hover:text-gray-300 font-medium cursor-pointer"
                    >
                      Ascunde omonimii
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setAdminSearchResults(null); setAdminSearchQuery(''); }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Homonym Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {resultsToDisplay.map((person, pIdx) => {
                  const isConfirmed = (person.firme || []).some(f => String(f.cui).replace(/\D/g, '') === cleanClientCui);
                  return (
                    <div 
                      key={pIdx}
                      className={`p-3.5 rounded-xl border bg-white dark:bg-gray-800 shadow-xs transition-all ${
                        isConfirmed 
                          ? 'border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-500/20' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-xs">
                            <span>{person.nume}</span>
                            {isConfirmed && (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded text-[9px] font-bold">
                                Confirmat în Companie
                              </span>
                            )}
                          </div>
                          {person.loc_nastere && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                              Născut în: {person.loc_nastere}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => openPersonIntel && openPersonIntel(person.nume, client?.cui_cnp)}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-full transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Network size={12} />
                          <span>Dosar Complet</span>
                        </button>
                      </div>

                      {/* Firmele persoanei */}
                      <div className="mt-3 space-y-1.5 border-t border-gray-100 dark:border-gray-700/60 pt-2">
                        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                          Portofoliu Firme ({person.firme?.length || 0}):
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(person.firme || []).slice(0, 6).map((f, fIdx) => (
                            <button
                              key={fIdx}
                              type="button"
                              onClick={() => openCompanyIntel && openCompanyIntel(f.cui, f.denumire)}
                              className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-[10px] text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-1"
                            >
                              <span className="truncate max-w-[120px]">{f.denumire}</span>
                              <span className="text-[9px] text-gray-400">({f.cui})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Rețele Detectate Automat (admin_networks) */}
        {adminNetworks.length > 0 ? (
          <div className="space-y-4">
            {adminNetworks.map((net, nIdx) => (
              <div key={nIdx} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-900/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300 font-bold text-xs">
                      {net.nume ? net.nume.charAt(0) : 'A'}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white text-xs flex items-center gap-1.5">
                        <span>{net.nume}</span>
                        {net.loc_nastere && (
                          <span className="text-[10px] text-gray-400 font-normal">({net.loc_nastere})</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500">
                        {net.firme_active || 0} firme active • {net.firme_incetate || 0} firme radiate/faliment
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openPersonIntel && openPersonIntel(net.nume, client?.cui_cnp)}
                    className="px-3 py-1 bg-white dark:bg-gray-800 text-primary border border-gray-200 dark:border-gray-700 rounded-full hover:bg-primary hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Network size={12} />
                    <span>Investighează Rețea</span>
                  </button>
                </div>

                {/* Grid Firme din Rețeaua Persoanei */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-3">
                  {(net.firme || []).map((f, fIdx) => {
                    const isCurrent = String(f.cui).replace(/\D/g, '') === cleanClientCui;
                    const isFaliment = String(f.stare || '').toUpperCase().includes('FALIMENT') || 
                                       String(f.stare || '').toUpperCase().includes('RADIAT') || 
                                       String(f.stare || '').toUpperCase().includes('LICHID');
                    return (
                      <div 
                        key={fIdx}
                        className={`p-2.5 rounded-xl border text-xs transition-all ${
                          isCurrent 
                            ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800' 
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => openCompanyIntel && openCompanyIntel(f.cui, f.denumire)}
                            className="font-bold text-left text-gray-900 dark:text-white hover:text-primary transition-colors truncate max-w-[170px]"
                            title={f.denumire}
                          >
                            {f.denumire}
                          </button>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            isFaliment 
                              ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          }`}>
                            {f.stare || 'Activ'}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-1 flex items-center justify-between">
                          <span>CUI: {f.cui}</span>
                          <span>{f.calitate || 'Asociat / Admin'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-center text-xs text-gray-500">
            Fără rețele corporative extinse identificate automat. Folosiți bara de căutare de mai sus pentru căutare OSINT manuală.
          </div>
        )}
      </div>
    </div>
  );
}
