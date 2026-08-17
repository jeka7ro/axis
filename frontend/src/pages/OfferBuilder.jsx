import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchClients, createClient, updateClient, fetchVehicles, fetchVehicleBrands } from '../services/api';
import { createOffer, updateOffer, fetchOffer, uploadTemplate } from '../services/apiOffers';
import useAuthStore from '../store/authStore';
import Tesseract from 'tesseract.js';
import { ChevronLeft } from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';

const OfferBuilder = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { currency } = useAuthStore();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isNewClientMode, setIsNewClientMode] = useState(false);
  const [newClientData, setNewClientData] = useState({ 
    name: '', cui_cnp: '', address: '', type: 'PF',
    id_card_series: '', id_card_number: '', id_card_issued_by: '', 
    id_card_valid_from: '', id_card_valid_until: ''
  });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [savingNewClient, setSavingNewClient] = useState(false);
  
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
    template_type: 'Standard'
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
            template_type: offer.template_type || 'Standard'
          });
        })
        .catch(err => {
          console.error(err);
          alert("Eroare la încărcarea ofertei");
          navigate('/offers');
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode, navigate]);

  const handleOCR = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const result = await Tesseract.recognize(file, 'ron');
      const text = result.data.text;
      
      // Extragere CNP (13 cifre - Validare Structură Matematică România)
      let cnp = '';
      const textCleaned = text.replace(/O/gi, '0').replace(/l/gi, '1').replace(/I/gi, '1').replace(/\s+/g, '');
      const cnpMatch = textCleaned.match(/([1-8]\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{6})/);
      if (cnpMatch) {
         cnp = cnpMatch[1];
      }
      
      let nume = '';
      const mrzMatchName = text.match(/IDROU([A-Z<]+)<<([A-Z<]+)/);
      if (mrzMatchName) {
        nume = (mrzMatchName[1].replace(/</g, ' ') + ' ' + mrzMatchName[2].replace(/</g, ' ')).trim();
      } else {
        const lines = text.split('\n').map(l => l.trim());
        const numeIdx = lines.findIndex(l => l.includes('NUME') || l.includes('SURNAME'));
        if (numeIdx !== -1 && lines[numeIdx + 1]) {
           nume = lines[numeIdx + 1].replace(/[^A-Z\s-]/g, '');
        }
      }
      
      let address = '';
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const domIdx = lines.findIndex(l => l.toUpperCase().includes('DOMICILIU') || l.toUpperCase().includes('ADDRESS'));
      if (domIdx !== -1) {
        let addrLines = [];
        for (let i = domIdx + 1; i < lines.length; i++) {
          if (lines[i].toUpperCase().includes('EMIS') || lines[i].toUpperCase().includes('ISSUED')) break;
          if (lines[i].length > 3) {
            addrLines.push(lines[i]);
          }
        }
        address = addrLines.join(', ');
      }
      
      let series = '';
      let number = '';
      const seriesMatch = text.match(/SERI[A-Z\s:]*([A-Z]{2})\s*NR[A-Z\s\.:]*([0-9]{6})/i);
      if (seriesMatch) {
        series = seriesMatch[1];
        number = seriesMatch[2];
      } else {
        const altMatch = text.match(/\b([A-Z]{2})\s*([0-9]{6})\b/);
        if (altMatch) {
          series = altMatch[1];
          number = altMatch[2];
        }
      }

      let validFrom = '';
      let validUntil = '';
      const validityMatch = text.match(/(\d{2}[\.\-]\d{2}[\.\-]\d{2,4})\s*-\s*(\d{2}[\.\-]\d{2}[\.\-]\d{2,4})/);
      if (validityMatch) {
        validFrom = validityMatch[1];
        validUntil = validityMatch[2];
      }

      let issuedBy = '';
      const issuedIdx = lines.findIndex(l => l.toUpperCase().includes('EMIS') || l.toUpperCase().includes('ISSUED'));
      if (issuedIdx !== -1 && lines[issuedIdx + 1]) {
        issuedBy = lines[issuedIdx + 1];
        if (issuedBy.toUpperCase().includes('CNP') || issuedBy.length < 3) {
           const sameLineMatch = lines[issuedIdx].match(/(?:EMIS[A\s]*DE|ISSUED\s*BY)\s*(.+)/i);
           if (sameLineMatch && sameLineMatch[1].trim().length > 3) {
             issuedBy = sameLineMatch[1].trim();
           } else {
             issuedBy = '';
           }
        }
      }
      
      // --- SUPRASCRIERE CU DATE DIN MRZ (Acuratețe Maximă) ---
      // Exemplu MRZ Linia 2: RK192171<3ROU1801102430126...
      const textNoSpaces = text.replace(/\s+/g, '');
      const mrzLine2Match = textNoSpaces.match(/([A-Z]{2})([0-9]{6})[<\dK\(\)]R[O0]U/i);
      if (mrzLine2Match) {
        series = mrzLine2Match[1].toUpperCase();
        number = mrzLine2Match[2];
      }
      
      setNewClientData(prev => ({ 
        ...prev, 
        name: nume, 
        cui_cnp: cnp, 
        address: address,
        id_card_series: series,
        id_card_number: number,
        id_card_issued_by: issuedBy,
        id_card_valid_from: validFrom,
        id_card_valid_until: validUntil
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isNewClientMode) {
      alert("Te rugăm să salvezi clientul nou mai întâi, sau să selectezi unul existent.");
      return;
    }
    setLoading(true);
    try {
      if (isEditMode) {
        await updateOffer(id, {...formData, client_id: parseInt(formData.client_id)});
      } else {
        await createOffer({...formData, client_id: parseInt(formData.client_id)});
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
    <div className="max-w-4xl mx-auto space-y-6">
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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
                <SearchableSelect
                  value={formData.client_id}
                  placeholder="Selectează Clientul Evaluat"
                  options={clients.map(c => ({ value: c.id, label: `${c.name} (${c.cui_cnp})` }))}
                  onChange={(val) => {
                    const clientId = val;
                    const prefCurr = localStorage.getItem(`pref_curr_${clientId}`);
                    setFormData({
                      ...formData, 
                      client_id: clientId,
                      currency: prefCurr || formData.currency
                    });
                  }}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                     <label className="cursor-pointer py-2 px-4 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-medium transition-colors dark:text-white">
                       {ocrLoading ? "Se scanează..." : "Încarcă Poză Buletin (OCR)"}
                       <input type="file" accept="image/*" className="hidden" onChange={handleOCR} disabled={ocrLoading} />
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
                    <div className="p-4 mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-200 dark:border-blue-800 space-y-4">
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
                                className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedCompanyId === 'NEW' ? 'bg-blue-50 dark:bg-blue-900/30 font-medium' : ''}`}
                                onClick={() => { setSelectedCompanyId('NEW'); setShowCompanyDropdown(false); setCompanySearchQuery(''); }}
                              >
                                --- Adaugă Companie Nouă ---
                              </div>
                              {clients.filter(c => c.type === 'PJ' && (c.name.toLowerCase().includes(companySearchQuery.toLowerCase()) || c.cui_cnp.includes(companySearchQuery))).map(c => (
                                <div 
                                  key={c.id} 
                                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedCompanyId === c.id.toString() ? 'bg-blue-50 dark:bg-blue-900/30 font-medium' : ''}`}
                                  onClick={() => { setSelectedCompanyId(c.id.toString()); setShowCompanyDropdown(false); setCompanySearchQuery(''); }}
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
                onChange={e => setFormData({...formData, template_type: e.target.value})}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
              >
                <option value="Standard">Contract Leasing Standard</option>
                <option value="Fidejusor">Contract cu Fidejusor (Garant)</option>
              </select>
            </div>

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

            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 p-4 rounded-lg">
              <label className="block text-sm font-semibold text-primary dark:text-primary-400 mb-2">
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
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
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

            <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-primary text-white rounded-md hover:bg-primary/90 font-medium">
              {loading ? "Se salvează..." : (isEditMode ? "Salvează Modificările" : "Generează Oferta Draft")}
            </button>
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
          
          <div className="mt-8 p-4 bg-primary/10 rounded-lg text-center">
            <p className="text-sm font-medium text-primary mb-1">Rată Lunară Estimată</p>
            <p className="text-3xl font-bold text-primary">
              {formData.currency === 'EUR' ? '€' : formData.currency === 'USD' ? '$' : ''}{monthlyRate.toFixed(2)}{formData.currency === 'RON' ? ' RON' : ''}
            </p>
            <p className="text-xs text-primary/70 mt-1">fără TVA / {formData.period_months} luni</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferBuilder;
