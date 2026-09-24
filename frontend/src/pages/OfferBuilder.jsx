import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchClients, createClient, updateClient, fetchVehicles, fetchVehicleBrands, fetchClientFleetTelemetryReport } from '../services/api';
import { createOffer, updateOffer, fetchOffer, uploadTemplate, fetchFidejusorSuggestion, submitOfferForApproval } from '../services/apiOffers';
import { fetchCampaigns } from '../services/apiCampaigns';
import useAuthStore from '../store/authStore';
import { extractTextFromFile, parseRomanianIDCard } from '../utils/pdfOcr';
import { ChevronLeft, ShieldCheck, UserCheck, Sparkles, AlertCircle, MapPin, Megaphone, TrendingDown, UploadCloud, Send, Check } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';

const OfferBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { currency, user } = useAuthStore();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  
  const [telemetryReport, setTelemetryReport] = useState(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  const [isNewClientMode, setIsNewClientMode] = useState(false);
  const [newClientData, setNewClientData] = useState({ 
    name: '', cui_cnp: '', address: '', type: 'PF',
    id_card_series: '', id_card_number: '', id_card_issued_by: '', 
    id_card_valid_from: '', id_card_valid_until: ''
  });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [savingNewClient, setSavingNewClient] = useState(false);
  
  const [fidejusorCandidates, setFidejusorCandidates] = useState([]);
  const [loadingFidejusor, setLoadingFidejusor] = useState(false);

  const [formData, setFormData] = useState({
    client_id: '',
    vehicle_id: null,
    currency: currency || 'EUR',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_price: 50000,
    advance_percent: 20,
    period_months: 60,
    residual_value_percent: 1,
    interest_rate: 5.9,
    template_type: 'Standard',
    campaign_id: null,
    campaign_name: '',
    dealer_name: user?.dealer_name || (user?.role === 'Dealer Sales' ? 'Dealer Partener Axis' : null),
    created_by_role: user?.role || 'Super Admin',
    fidejusor_name: '',
    fidejusor_cnp: '',
    fidejusor_address: '',
    fidejusor_id_card: '',
    fidejusor_quality: ''
  });

  const [isCompany, setIsCompany] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('NEW');
  const [companyData, setCompanyData] = useState({ name: '', cui: '' });
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    fetchClients().then(setClients).catch(console.error);
    fetchVehicles().then(setVehicles).catch(console.error);
    fetchVehicleBrands().then(setBrands).catch(console.error);
    fetchCampaigns(true).then(setCampaigns).catch(console.error);
    
    if (isEditMode) {
      setLoading(true);
      fetchOffer(id)
        .then(offer => {
          setFormData({
            client_id: offer.client_id.toString(),
            vehicle_id: offer.vehicle_id || null,
            currency: offer.currency || 'EUR',
            vehicle_make: offer.vehicle_make,
            vehicle_model: offer.vehicle_model,
            vehicle_price: offer.vehicle_price,
            advance_percent: offer.advance_percent,
            period_months: offer.period_months,
            residual_value_percent: offer.residual_value_percent,
            interest_rate: offer.interest_rate,
            template_type: offer.template_type || 'Standard',
            campaign_id: offer.campaign_id || null,
            campaign_name: offer.campaign_name || '',
            dealer_name: offer.dealer_name || user?.dealer_name || null,
            created_by_role: offer.created_by_role || user?.role || 'Super Admin',
            fidejusor_name: offer.fidejusor_name || '',
            fidejusor_cnp: offer.fidejusor_cnp || '',
            fidejusor_address: offer.fidejusor_address || '',
            fidejusor_id_card: offer.fidejusor_id_card || '',
            fidejusor_quality: offer.fidejusor_quality || ''
          });
          if (offer.campaign_id) {
            setSelectedCampaignId(offer.campaign_id.toString());
          }
          loadFidejusorForClient(offer.client_id);
          loadTelemetryForClient(offer.client_id);
        })
        .catch(err => {
          console.error(err);
          alert("Eroare la încărcarea ofertei");
          navigate('/offers');
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, navigate, user]);

  const loadTelemetryForClient = async (clientId) => {
    if (!clientId) {
      setTelemetryReport(null);
      return;
    }
    setLoadingTelemetry(true);
    try {
      const rep = await fetchClientFleetTelemetryReport(clientId);
      setTelemetryReport(rep);
    } catch (err) {
      console.warn("Could not load telemetry report:", err);
      setTelemetryReport(null);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  const loadFidejusorForClient = async (clientId) => {
    if (!clientId) return;
    setLoadingFidejusor(true);
    try {
      const data = await fetchFidejusorSuggestion(clientId);
      if (data?.suggested_fidejusor) {
        setFidejusorCandidates(data.all_candidates || [data.suggested_fidejusor]);
        setFormData(prev => {
          if (prev.fidejusor_name) return prev;
          return {
            ...prev,
            fidejusor_name: data.suggested_fidejusor.name || '',
            fidejusor_cnp: data.suggested_fidejusor.cnp || '',
            fidejusor_address: data.suggested_fidejusor.address || '',
            fidejusor_id_card: data.suggested_fidejusor.id_card || '',
            fidejusor_quality: data.suggested_fidejusor.quality || 'Administrator Statutar'
          };
        });
      }
    } catch (err) {
      console.warn("Could not fetch fidejusor suggestion:", err);
    } finally {
      setLoadingFidejusor(false);
    }
  };

  const handleOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const text = await extractTextFromFile(file);
      
      const idData = parseRomanianIDCard(text);
      setNewClientData(prev => ({ 
        ...prev, 
        ...idData
      }));
    } catch (err) {
      console.error(err);
      alert('Eroare la scanarea buletinului');
    } finally {
      setOcrLoading(false);
      e.target.value = '';
    }
  };

  const handleSaveNewClient = async () => {
    setSavingNewClient(true);
    try {
      let created;
      if (isCompany) {
        if (selectedCompanyId === 'NEW') {
          const dataToSave = {
            ...newClientData,
            name: companyData.name,
            cui_cnp: companyData.cui,
            type: 'PJ',
            representative_name: newClientData.name
          };
          created = await createClient(dataToSave);
        } else {
          const existingCompany = clients.find(c => c.id.toString() === selectedCompanyId);
          const dataToSave = {
            ...existingCompany,
            ...newClientData, // Adaugă id_card_*, etc
            name: existingCompany.name, // Pastram numele companiei
            cui_cnp: existingCompany.cui_cnp, // Pastram CUI-ul companiei
            type: 'PJ',
            representative_name: newClientData.name
          };
          created = await updateClient(existingCompany.id, dataToSave);
        }
      } else {
        const dataToSave = {
          ...newClientData,
          type: 'PF'
        };
        created = await createClient(dataToSave);
      }

      const updatedClients = await fetchClients();
      setClients(updatedClients);
      setFormData({ ...formData, client_id: created.id.toString() });
      setIsNewClientMode(false);
      setNewClientData({ 
        name: '', cui_cnp: '', address: '', type: 'PF',
        id_card_series: '', id_card_number: '', id_card_issued_by: '', 
        id_card_valid_from: '', id_card_valid_until: '' 
      });
      setCompanyData({ name: '', cui: '' });
      setIsCompany(false);
      setSelectedCompanyId('NEW');
    } catch (error) {
      console.error(error);
      alert('Eroare la salvarea clientului');
    } finally {
      setSavingNewClient(false);
    }
  };

  // Simulator vizual live
  const advance = (formData.vehicle_price * formData.advance_percent) / 100;
  const residual = (formData.vehicle_price * formData.residual_value_percent) / 100;
  const financed = formData.vehicle_price - advance - residual;
  const totalInterest = financed * (formData.interest_rate / 100) * (formData.period_months / 12);
  const monthlyRate = (financed + totalInterest) / formData.period_months;

  const handleSubmit = async (e, autoSubmitForApproval = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isNewClientMode) {
      alert("Te rugăm să salvezi clientul nou mai întâi, sau să selectezi unul existent.");
      return;
    }
    if (!formData.client_id) {
      alert("Te rugăm să selectezi un client pentru această ofertă.");
      return;
    }
    setLoading(true);
    try {
      let savedOffer;
      if (isEditMode) {
        savedOffer = await updateOffer(id, {...formData, client_id: parseInt(formData.client_id)});
      } else {
        savedOffer = await createOffer({...formData, client_id: parseInt(formData.client_id)});
      }
      if (autoSubmitForApproval && savedOffer?.id) {
        await submitOfferForApproval(savedOffer.id);
      }
      navigate('/offers');
    } catch (error) {
      console.error(error);
      alert("A apărut o eroare la salvarea ofertei. Verifică datele și încearcă din nou.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/offers')} 
          className="p-2 bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          title="Înapoi la Oferte"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEditMode ? 'Editare Ofertă' : 'Constructor Ofertă Nouă'}
        </h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4 bg-gray-50 dark:bg-gray-900 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date Client</label>
                <button 
                  type="button" 
                  onClick={() => setIsNewClientMode(!isNewClientMode)} 
                  className="text-sm text-primary hover:underline font-medium"
                >
                  {isNewClientMode ? "Alege din listă" : "+ Client Nou (Scanare Buletin)"}
                </button>
              </div>

              {!isNewClientMode ? (
                <div>
                  <SearchableSelect
                    value={formData.client_id}
                    placeholder="Selectează Clientul Evaluat"
                    options={clients.map(c => ({ value: c.id, label: `${c.name} (${c.cui_cnp})` }))}
                    onChange={(val) => {
                      const clientId = val;
                      const prefCurr = localStorage.getItem(`pref_curr_${clientId}`);
                      setFormData(prev => ({
                        ...prev, 
                        client_id: clientId,
                        currency: prefCurr || prev.currency,
                        fidejusor_name: '',
                        fidejusor_cnp: '',
                        fidejusor_address: '',
                        fidejusor_id_card: '',
                        fidejusor_quality: ''
                      }));
                      loadFidejusorForClient(clientId);
                      loadTelemetryForClient(clientId);
                    }}
                  />
                  
                  {formData.client_id && clients.find(c => String(c.id) === String(formData.client_id))?.type === 'PJ' && (
                    <div className="mt-3 p-3 bg-gray-100/70 dark:bg-gray-800 rounded-lg text-sm border border-gray-200 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Reprezentant Legal curent: </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {clients.find(c => String(c.id) === String(formData.client_id))?.representative_name || <span className="text-red-500 italic">Nesetat (Editează clientul în lista de Clienți pentru a adăuga reprezentantul)</span>}
                      </span>
                    </div>
                  )}

                  {/* Raport Comportament Flotă GPS (Cerința 7 Alin) */}
                  {formData.client_id && telemetryReport && (
                    <div className="mt-3 p-3.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-gray-600 dark:text-gray-400" />
                          <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                            Raport Comportament Flotă GPS
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          telemetryReport.telemetry_risk === 'HIGH' 
                            ? 'bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 border-red-300 dark:border-red-800'
                            : telemetryReport.telemetry_risk === 'MEDIUM'
                            ? 'bg-gray-100 dark:bg-gray-800 text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800'
                            : 'bg-gray-100 dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                        }`}>
                          {telemetryReport.risk_label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {telemetryReport.ai_recommendation}
                      </p>
                      <div className="flex gap-4 text-[11px] text-gray-500 dark:text-gray-400 pt-1.5 border-t border-gray-200 dark:border-gray-700/60">
                        <span>Vehicule Flotă: <strong>{telemetryReport.total_active_vehicles}</strong> (LT: {telemetryReport.lt_vehicles_count}, ST: {telemetryReport.st_vehicles_count})</span>
                        <span>Incidente Graniță: <strong className={telemetryReport.unauthorized_border_events > 0 ? "text-red-600 font-bold" : ""}>{telemetryReport.unauthorized_border_events}</strong></span>
                        {telemetryReport.colocation_alerts_count > 0 && (
                          <span>Co-locare Suspectă: <strong className="text-red-600 font-bold">{telemetryReport.colocation_alerts_count}</strong></span>
                        )}
                        <span>Avertismente: <strong>{telemetryReport.warning_alerts_count}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                     <label className="cursor-pointer py-2 px-4 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors dark:text-white">
                       {ocrLoading ? "Se scanează..." : "Încarcă Poză/PDF Buletin (OCR)"}
                       <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleOCR} disabled={ocrLoading} />
                     </label>
                     {ocrLoading && <span className="text-xs text-primary animate-pulse font-medium">Procesare OCR... (poate dura câteva secunde)</span>}
                  </div>
                  
                  <div className="flex items-center mt-4 mb-2">
                    <input 
                      type="checkbox" 
                      id="isCompany" 
                      checked={isCompany} 
                      onChange={e => setIsCompany(e.target.checked)} 
                      className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary dark:focus:ring-primary dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="isCompany" className="ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                      Acționează în numele unei companii (Creează profil PJ)
                    </label>
                  </div>

                  {isCompany && (
                    <div className="p-4 mb-4 bg-gray-50 dark:bg-gray-900/60 rounded-md border border-gray-200 dark:border-gray-700 space-y-4">
                      <div className="relative">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Selectează Compania (sau Adaugă Nouă)</label>
                        <div 
                          className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white cursor-pointer flex justify-between items-center"
                          onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
                        >
                          <span className="truncate">
                            {selectedCompanyId === 'NEW' ? '--- Adaugă Companie Nouă ---' : 
                              clients.find(c => c.id.toString() === selectedCompanyId) 
                                ? `${clients.find(c => c.id.toString() === selectedCompanyId).name} (${clients.find(c => c.id.toString() === selectedCompanyId).cui_cnp})` 
                                : 'Selectează compania...'}
                          </span>
                          <span className="text-gray-400 text-xs">▼</span>
                        </div>
                        
                        {showCompanyDropdown && (
                          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-hidden flex flex-col">
                            <div className="p-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                              <input 
                                type="text" 
                                autoFocus
                                placeholder="Caută după nume sau CUI..." 
                                value={companySearchQuery}
                                onChange={(e) => setCompanySearchQuery(e.target.value)}
                                className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-primary focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div className="overflow-y-auto flex-1">
                              <div 
                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedCompanyId === 'NEW' ? 'bg-gray-100 dark:bg-gray-700 font-medium' : ''}`}
                                onClick={() => { setSelectedCompanyId('NEW'); setShowCompanyDropdown(false); setCompanySearchQuery(''); }}
                              >
                                --- Adaugă Companie Nouă ---
                              </div>
                              {clients.filter(c => c.type === 'PJ' && (c.name.toLowerCase().includes(companySearchQuery.toLowerCase()) || c.cui_cnp.includes(companySearchQuery))).map(c => (
                                <div 
                                  key={c.id} 
                                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedCompanyId === c.id.toString() ? 'bg-gray-100 dark:bg-gray-700 font-medium' : ''}`}
                                  onClick={() => { 
                                    setSelectedCompanyId(c.id.toString()); 
                                    setShowCompanyDropdown(false); 
                                    setCompanySearchQuery(''); 
                                    setNewClientData(prev => ({
                                      ...prev,
                                      name: c.representative_name || '',
                                      cui_cnp: c.representative_cnp || '',
                                      address: c.representative_address || '',
                                      id_card_series: c.id_card_series || '',
                                      id_card_number: c.id_card_number || '',
                                      id_card_issued_by: c.id_card_issued_by || '',
                                      id_card_valid_from: c.id_card_valid_from || '',
                                      id_card_valid_until: c.id_card_valid_until || ''
                                    }));
                                  }}
                                >
                                  {c.name} <span className="text-gray-500 text-xs">({c.cui_cnp})</span>
                                </div>
                              ))}
                              {clients.filter(c => c.type === 'PJ' && (c.name.toLowerCase().includes(companySearchQuery.toLowerCase()) || c.cui_cnp.includes(companySearchQuery))).length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500 text-center">Niciun rezultat.</div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {selectedCompanyId === 'NEW' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Nume Companie</label>
                            <input type="text" required={isCompany} value={companyData.name} onChange={e => setCompanyData({...companyData, name: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white" placeholder="S.C. Exemplu S.R.L."/>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">CUI Companie</label>
                            <input type="text" required={isCompany} value={companyData.cui} onChange={e => setCompanyData({...companyData, cui: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white" placeholder="RO12345678"/>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-2 border-b pb-1">Date Buletin (Persoană Fizică / Reprezentant Legal)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Nume / Denumire</label>
                      <input type="text" value={newClientData.name} onChange={e => setNewClientData({...newClientData, name: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white" placeholder="Ex: Popescu Ion"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">CNP / CUI</label>
                      <input type="text" value={newClientData.cui_cnp} onChange={e => setNewClientData({...newClientData, cui_cnp: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white" placeholder="13 cifre..."/>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Adresă</label>
                      <input type="text" value={newClientData.address} onChange={e => setNewClientData({...newClientData, address: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white" placeholder="Str. Exemplu, Nr..."/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Serie CI</label>
                      <input type="text" value={newClientData.id_card_series} onChange={e => setNewClientData({...newClientData, id_card_series: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white" placeholder="Ex: XR"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Număr CI</label>
                      <input type="text" value={newClientData.id_card_number} onChange={e => setNewClientData({...newClientData, id_card_number: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white" placeholder="Ex: 123456"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Valabil din</label>
                      <input type="text" value={newClientData.id_card_valid_from} onChange={e => setNewClientData({...newClientData, id_card_valid_from: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white" placeholder="DD.MM.YYYY"/>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Valabil până în</label>
                      <input type="text" value={newClientData.id_card_valid_until} onChange={e => setNewClientData({...newClientData, id_card_valid_until: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white" placeholder="DD.MM.YYYY"/>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Emis de</label>
                      <input type="text" value={newClientData.id_card_issued_by} onChange={e => setNewClientData({...newClientData, id_card_issued_by: e.target.value})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white" placeholder="Ex: SPCLEP SECTOR 1"/>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    disabled={!newClientData.name || !newClientData.cui_cnp || savingNewClient}
                    onClick={handleSaveNewClient} 
                    className="w-full py-2 bg-gray-800 dark:bg-gray-600 text-white rounded-md hover:bg-gray-700 dark:hover:bg-gray-500 text-sm font-medium disabled:opacity-50"
                  >
                    {savingNewClient ? "Se salvează..." : "Salvează Clientul Nou și Continuă"}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tip Contract (Template)</label>
              <select 
                value={formData.template_type}
                onChange={e => {
                  const newType = e.target.value;
                  setFormData({...formData, template_type: newType});
                  if ((newType === 'Fidejusor' || newType === 'fidejusor') && formData.client_id) {
                    loadFidejusorForClient(formData.client_id);
                  }
                }}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="Standard">Contract Leasing Standard</option>
                <option value="Fidejusor">Contract cu Fidejusor (Șablon Oficial Maria - Recomandat AI)</option>
                <option value="leasing">Contract Leasing Operațional Termen Lung</option>
              </select>
            </div>

            {/* Secțiune Fidejusiune Automată din Guvernanță */}
            {(formData.template_type === 'Fidejusor' || formData.template_type === 'fidejusor') && (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                        Garanție Personală & Desemnare Fidejusor
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Conform Art. 2280-2323 Cod Civil Român. Pre-completat automat din analiza structurii de asociați / administratori.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 flex items-center gap-1 border border-gray-200 dark:border-gray-600">
                    <Sparkles size={12} />
                    AI Governance Match
                  </span>
                </div>

                {fidejusorCandidates.length > 1 && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Candidați Eligibili Detectați în Structura Firmei:
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {fidejusorCandidates.map((cand, idx) => {
                        const isSelected = formData.fidejusor_name === cand.name;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                fidejusor_name: cand.name,
                                fidejusor_cnp: cand.cnp || prev.fidejusor_cnp,
                                fidejusor_address: cand.address || prev.fidejusor_address,
                                fidejusor_quality: cand.quality || prev.fidejusor_quality,
                                fidejusor_id_card: cand.id_card || prev.fidejusor_id_card
                              }));
                            }}
                            className={`px-3 py-1.5 text-xs rounded-lg border font-medium transition-all flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white shadow-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <UserCheck size={13} />
                            <span>{cand.name}</span>
                            <span className="opacity-80 text-[10px]">({cand.quality})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Nume și Prenume Fidejusor (Garant)
                    </label>
                    <input 
                      type="text" 
                      required 
                      value={formData.fidejusor_name} 
                      onChange={e => setFormData({ ...formData, fidejusor_name: e.target.value })} 
                      className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white text-sm" 
                      placeholder="Ex: POPESCU ION"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Calitate în Cadrul Locatarului
                    </label>
                    <input 
                      type="text" 
                      value={formData.fidejusor_quality} 
                      onChange={e => setFormData({ ...formData, fidejusor_quality: e.target.value })} 
                      className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white text-sm" 
                      placeholder="Ex: Asociat Majoritar (100%) & Administrator"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      CNP Fidejusor
                    </label>
                    <input 
                      type="text" 
                      value={formData.fidejusor_cnp} 
                      onChange={e => setFormData({ ...formData, fidejusor_cnp: e.target.value })} 
                      className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white text-sm" 
                      placeholder="13 cifre..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Serie și Număr Carte Identitate
                    </label>
                    <input 
                      type="text" 
                      value={formData.fidejusor_id_card} 
                      onChange={e => setFormData({ ...formData, fidejusor_id_card: e.target.value })} 
                      className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white text-sm" 
                      placeholder="Ex: RX 123456"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Adresă de Domiciliu Fidejusor
                    </label>
                    <input 
                      type="text" 
                      value={formData.fidejusor_address} 
                      onChange={e => setFormData({ ...formData, fidejusor_address: e.target.value })} 
                      className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white text-sm" 
                      placeholder="Mun. București, Str. ..."
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">1. Marcă Auto</label>
                <SearchableSelect 
                  value={formData.vehicle_make}
                  placeholder="Alege Marca"
                  options={brands.map(b => ({ value: b.name, label: b.name }))}
                  onChange={val => setFormData({ ...formData, vehicle_make: val, vehicle_model: '' })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">2. Model</label>
                <SearchableSelect 
                  value={formData.vehicle_model}
                  placeholder="Alege Modelul"
                  disabled={!formData.vehicle_make}
                  options={
                    brands.find(b => b.name === formData.vehicle_make)?.models?.map(m => ({ value: m.name, label: m.name })) || []
                  }
                  onChange={val => setFormData({ ...formData, vehicle_model: val })}
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
              <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                3. Ai Mașina în Parc? Alege din Flotă (Auto-Completare Preț)
              </label>
              <SearchableSelect 
                value={formData.vehicle_id || ""}
                placeholder="-- Caută sau alege o mașină (Opțional) --"
                options={vehicles
                  .filter(v => (!formData.vehicle_make || v.make === formData.vehicle_make) && (!formData.vehicle_model || v.model === formData.vehicle_model))
                  .map(v => ({ value: v.id, label: `${v.make} ${v.model} - ${v.license_plate} (VIN: ${v.vin}) [${v.status}]` }))}
                onChange={(val) => {
                  const selectedId = val;
                  if (!selectedId) return;
                  const v = vehicles.find(veh => veh.id === selectedId);
                  if (v) {
                    setFormData({
                      ...formData,
                      vehicle_id: v.id,
                      vehicle_make: v.make,
                      vehicle_model: v.model,
                      vehicle_price: Math.round((v.purchase_price || 50000) * 100) / 100 
                    });
                  }
                }}
              />
            </div>

            {/* Campanie Promoțională Finanțare (Cerința 4 Alin) */}
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone size={16} className="text-gray-700 dark:text-gray-300" />
                  <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Campanie Promoțională Finanțare (Subvenționare Dobândă)
                  </label>
                </div>
                {formData.campaign_name && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Campanie Activă
                  </span>
                )}
              </div>

              <select
                value={selectedCampaignId}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedCampaignId(val);
                  if (!val) {
                    setFormData(prev => ({
                      ...prev,
                      campaign_id: null,
                      campaign_name: '',
                      interest_rate: 5.9
                    }));
                  } else {
                    const camp = campaigns.find(c => c.id.toString() === val);
                    if (camp) {
                      setFormData(prev => ({
                        ...prev,
                        campaign_id: camp.id,
                        campaign_name: camp.name,
                        interest_rate: camp.discounted_interest_rate,
                        advance_percent: Math.max(prev.advance_percent, camp.min_advance_percent || 15)
                      }));
                    }
                  }
                }}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-gray-400"
              >
                <option value="">-- Dobândă Standard Axis (5.90% pe an) --</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id.toString()}>
                    {c.name} • {c.discounted_interest_rate}% (Subvenționat de: {c.subsidized_by})
                  </option>
                ))}
              </select>

              {formData.campaign_name && (
                <div className="p-2.5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                  <div className="text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-gray-900 dark:text-white">{formData.campaign_name}</span>
                    <span className="text-gray-400 ml-2">Dobândă aplicată: <strong className="text-gray-900 dark:text-white">{formData.interest_rate}%</strong></span>
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Canal: <strong>{formData.dealer_name || 'Toți Dealerii'}</strong>
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valută</label>
                <select 
                  value={formData.currency} 
                  onChange={e => {
                    const newCurrency = e.target.value;
                    setFormData({...formData, currency: newCurrency});
                    if (formData.client_id) {
                      localStorage.setItem(`pref_curr_${formData.client_id}`, newCurrency);
                    }
                  }} 
                  className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"
                >
                  <option value="EUR">EUR (€)</option>
                  <option value="RON">RON (Lei)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preț Auto ({formData.currency})</label>
                <input type="number" required value={formData.vehicle_price} onChange={e => setFormData({...formData, vehicle_price: Number(e.target.value)})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Avans (%)</label>
                <input type="number" required value={formData.advance_percent} onChange={e => setFormData({...formData, advance_percent: Number(e.target.value)})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Perioadă (luni)</label>
                <select value={formData.period_months} onChange={e => setFormData({...formData, period_months: Number(e.target.value)})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white">
                  <option value="12">12 Luni</option>
                  <option value="24">24 Luni</option>
                  <option value="36">36 Luni</option>
                  <option value="48">48 Luni</option>
                  <option value="60">60 Luni</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dobândă (%)</label>
                <input type="number" step="0.1" required value={formData.interest_rate} onChange={e => setFormData({...formData, interest_rate: Number(e.target.value)})} className="mt-1 block w-full px-3 py-2 border rounded-md dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
              </div>
            </div>

            <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50/50 dark:bg-gray-900/30 text-center">
              <label className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                <span className="p-3 bg-white dark:bg-gray-800 shadow-sm rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                  <UploadCloud size={24} />
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Atașează Draft (Word / PDF)</span>
                <span className="text-xs text-gray-500">Trage fișierul aici sau apasă pentru a alege din calculator</span>
                <input type="file" multiple accept=".pdf,.doc,.docx" className="hidden" onChange={async (e) => {
                  if (e.target.files.length > 0) {
                    const el = document.getElementById('files-simulated-msg');
                    const file = e.target.files[0];
                    if (el) el.innerText = `Se încarcă șablonul...`;
                    try {
                      await uploadTemplate(file);
                      if (el) el.innerText = `Șablon încărcat cu succes! (${file.name})`;
                    } catch (error) {
                      console.error(error);
                      if (el) el.innerText = `Eroare la încărcarea șablonului.`;
                    }
                  }
                }} />
                <span id="files-simulated-msg" className="text-sm text-green-600 font-medium mt-2 block"></span>
              </label>
            </div>

            {user?.role === 'Dealer Sales' && !isEditMode ? (
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                >
                  <Send size={15} />
                  <span>{loading ? "Se trimite..." : "Generează și Trimite la Aprobare Axis"}</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={loading}
                  className="w-full py-2 px-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 text-xs font-medium cursor-pointer transition-all"
                >
                  {loading ? "Se salvează..." : "Salvează ca Ciornă (Draft)"}
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-white text-xs font-semibold cursor-pointer shadow-sm transition-all"
              >
                {loading ? "Se salvează..." : (isEditMode ? "Salvează Modificările" : "Generează Oferta")}
              </button>
            )}
          </form>
        </div>

        {/* Live Simulator Panel */}
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Calculator Live</h3>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Preț Auto:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formData.currency === 'EUR' ? '€' : formData.currency === 'USD' ? '$' : ''}{formData.vehicle_price.toLocaleString()}{formData.currency === 'RON' ? ' RON' : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avans ({formData.advance_percent}%):</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formData.currency === 'EUR' ? '€' : formData.currency === 'USD' ? '$' : ''}{advance.toLocaleString()}{formData.currency === 'RON' ? ' RON' : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Valoare Reziduală ({formData.residual_value_percent}%):</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formData.currency === 'EUR' ? '€' : formData.currency === 'USD' ? '$' : ''}{residual.toLocaleString()}{formData.currency === 'RON' ? ' RON' : ''}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>Suma Finanțată:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formData.currency === 'EUR' ? '€' : formData.currency === 'USD' ? '$' : ''}{financed.toLocaleString()}{formData.currency === 'RON' ? ' RON' : ''}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-8 p-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-center shadow-xs">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Rată Lunară Estimată</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {formData.currency === 'EUR' ? '€' : formData.currency === 'USD' ? '$' : ''}{monthlyRate.toFixed(2)}{formData.currency === 'RON' ? ' RON' : ''}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">fără TVA / {formData.period_months} luni</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferBuilder;
