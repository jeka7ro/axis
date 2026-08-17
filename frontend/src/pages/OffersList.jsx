import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check, FileSignature, FileText, ChevronLeft, ChevronRight, CheckSquare, Trash, Eye, Edit2, PenTool } from 'lucide-react';
import { fetchOffers, approveOffer, generateContract, sendESign, uploadTemplate } from '../services/apiOffers';
import { fetchVehicles } from '../services/api';
import useAuthStore from '../store/authStore';

const OffersList = () => {
  const { user, currency, setCurrency } = useAuthStore();
  const [offers, setOffers] = useState([]);
  const [selectedOfferForContract, setSelectedOfferForContract] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '0';
    const num = Number(amount);
    if (currency === 'EUR') return `€${num.toLocaleString()}`;
    if (currency === 'USD') return `$${num.toLocaleString()}`;
    if (currency === 'RON') return `${num.toLocaleString()} RON`;
    return num.toLocaleString();
  };
  const [loading, setLoading] = useState(true);

  // Table state
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const loadOffers = async () => {
    try {
      const data = await fetchOffers();
      setOffers(data);
    } catch (error) {
      console.error(error);
      if (offers.length === 0) {
        setOffers([{
          id: 1, 
          client: { name: 'Mock Company SRL', cui_cnp: 'RO123456' },
          vehicle_make: 'Mercedes-Benz',
          vehicle_model: 'GLE 350de',
          vehicle_price: 85000,
          monthly_rate: 1250.45,
          status: 'Draft',
          created_at: new Date().toISOString()
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
    const loadVehicles = async () => {
      try {
        const v = await fetchVehicles();
        setVehicles(v);
      } catch (err) {
        console.error("Could not fetch vehicles", err);
      }
    };
    loadVehicles();
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveOffer(id);
      loadOffers();
    } catch (error) {
      console.error(error);
      setOffers(offers.map(o => o.id === id ? {...o, status: 'Aprobat'} : o));
    }
  };

  const handleGenerateContract = async (id) => {
    try {
      await generateContract(id, selectedVehicleId);
      loadOffers();
    } catch (error) {
      console.error(error);
      setOffers(offers.map(o => o.id === id ? {...o, status: 'Transformat în Contract'} : o));
    }
  };

  const handleESign = async (id) => {
    try {
      await sendESign(id);
      setOffers(offers.map(o => o.id === id ? {...o, status: 'Trimis la Semnat'} : o));
    } catch (error) {
      console.error(error);
      setOffers(offers.map(o => o.id === id ? {...o, status: 'Trimis la Semnat'} : o));
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedOffers.map(o => o.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleOpenContractModal = (e, offer) => {
    e?.stopPropagation();
    const matchingVehicles = vehicles.filter(v => v.make === offer.vehicle_make && v.model === offer.vehicle_model);
    if (matchingVehicles.length >= 1) {
      setSelectedVehicleId(matchingVehicles[0].id.toString());
    } else {
      setSelectedVehicleId('');
    }
    setSelectedOfferForContract(offer);
  };

  const handleTemplateUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      await uploadTemplate(file);
      alert('Șablon încărcat cu succes!');
    } catch (error) {
      console.error(error);
      alert('Eroare la încărcarea șablonului.');
    }
    // reset input
    event.target.value = null;
  };

  // Pagination logic
  const totalItems = offers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOffers = offers.slice(startIndex, startIndex + itemsPerPage);

  const isAllSelected = paginatedOffers.length > 0 && selectedIds.length === paginatedOffers.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Oferte & Contracte</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Aprobă oferte și generează contracte PDF/DOCX.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/offers/new"
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="font-medium">Ofertă Nouă</span>
          </Link>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        
        {/* Bulk Actions Header */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center transition-all bg-gray-50/50 dark:bg-gray-800/50 min-h-[64px] ${selectedIds.length > 0 ? 'justify-between' : 'justify-end'}`}>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-200">
              <span className="text-sm font-medium text-gray-500 bg-white dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600">
                {selectedIds.length} selectate
              </span>
              {user?.role !== 'Dealer Sales' && (
                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-full hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50 transition-colors">
                  <CheckSquare size={16} /> Bulk Aprobare
                </button>
              )}
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 transition-colors">
                <Trash size={16} /> Bulk Delete
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-900/50 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th scope="col" className="px-6 py-4 w-12">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                  />
                </th>
                <th scope="col" className="px-4 py-4 w-16">Nr. Crt.</th>
                <th scope="col" className="px-6 py-4">Client</th>
                <th scope="col" className="px-6 py-4">Vehicul</th>
                <th scope="col" className="px-6 py-4">Preț / Rată</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-12">Se încarcă...</td></tr>
              ) : paginatedOffers.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-12">Nu există oferte.</td></tr>
              ) : (
                paginatedOffers.map((offer, idx) => (
                  <tr 
                    key={offer.id} 
                    className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50 transition-colors ${selectedIds.includes(offer.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800'}`}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(offer.id)}
                        onChange={() => handleSelectRow(offer.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-400">{startIndex + idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {offer.client?.name || 'Client Necunoscut'}
                    </td>
                    <td className="px-6 py-4">{offer.vehicle_make} {offer.vehicle_model}</td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-white font-medium">
                        {formatCurrency(offer.vehicle_price)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Rată: {formatCurrency(offer.monthly_rate?.toFixed(2))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border
                        ${offer.status === 'Draft' ? 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' : 
                          offer.status === 'Aprobat' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50' : 
                          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50'}`}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                      {offer.contract ? (
                        <a 
                          href={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8000'}${offer.contract.document_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 flex items-center justify-center text-primary hover:text-primary/80 border border-primary/30 dark:border-primary/50 rounded-full hover:bg-primary/10 transition-all"
                          title="Descarcă Contract"
                        >
                          <FileText size={16} strokeWidth={2} />
                        </a>
                      ) : (
                        <button 
                          onClick={(e) => handleOpenContractModal(e, offer)}
                          className="p-2 flex items-center justify-center text-gray-500 hover:text-primary border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                          title="Generează Contract"
                        >
                          <FileText size={16} strokeWidth={1.5} />
                        </button>
                      )}
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); console.log('Editare click'); }}
                        className="p-2 flex items-center justify-center text-gray-500 hover:text-gray-900 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                        title="Editează Ofertă"
                      >
                        <Edit2 size={16} strokeWidth={1.5} />
                      </button>

                      {offer.status === 'Draft' && user?.role !== 'Dealer Sales' && (
                        <button 
                          onClick={() => handleApprove(offer.id)}
                          className="p-2 flex items-center justify-center text-green-600 hover:text-green-700 border border-green-200 dark:border-green-900/50 rounded-full bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 transition-all"
                          title="Aprobă Ofertă"
                        >
                          <Check size={18} strokeWidth={1.5} />
                        </button>
                      )}
                      
                      {offer.status === 'Aprobat' && user?.role !== 'Dealer Sales' && (
                        <button 
                          onClick={(e) => handleOpenContractModal(e, offer)}
                          className="p-2 flex items-center justify-center text-primary hover:text-primary/90 border border-primary/20 rounded-full bg-primary/10 hover:bg-primary/20 transition-all"
                          title="Generează Contract"
                        >
                          <FileSignature size={18} strokeWidth={1.5} />
                        </button>
                      )}
                      
                      {offer.status === 'Draft' && user?.role === 'Dealer Sales' && (
                        <span className="text-xs text-gray-500 italic px-2">Așteaptă Axis</span>
                      )}
                      
                      {offer.status === 'Aprobat' && user?.role === 'Dealer Sales' && (
                        <span className="text-xs text-green-600 font-medium px-2">Aprobat</span>
                      )}

                      {offer.status === 'Transformat în Contract' && user?.role !== 'Dealer Sales' && (
                        <button 
                          onClick={() => handleESign(offer.id)}
                          className="p-2 flex items-center justify-center text-purple-600 hover:text-purple-700 border border-purple-200 dark:border-purple-900/50 rounded-full bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 transition-all"
                          title="Trimite spre eSign Namirial"
                        >
                          <PenTool size={18} strokeWidth={1.5} />
                        </button>
                      )}

                      {offer.status === 'Trimis la Semnat' && (
                        <div className="p-2 flex items-center justify-center text-purple-500 border border-purple-300 dark:border-purple-600 rounded-full bg-purple-50/50 dark:bg-purple-900/10" title="Așteaptă Semnătura (Namirial)">
                          <PenTool size={18} strokeWidth={1.5} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span>Afișează</span>
              <select 
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full px-3 py-1 text-sm focus:ring-primary focus:border-primary"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <span className="font-medium">Total: {totalItems}</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">
              Pagina {currentPage} din {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {selectedOfferForContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <FileSignature className="text-primary" size={24} />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Generare Contract Auto</h3>
              </div>
              <button 
                onClick={() => { setSelectedOfferForContract(null); setSelectedVehicleId(''); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/10">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Asociază o Mașină din Flotă (Obligatoriu)
              </label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white focus:ring-primary focus:border-primary"
              >
                <option value="">-- Alegeți mașina disponibilă --</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.make} {v.model} - {v.license_plate} (VIN: {v.vin}) [{v.status}]
                  </option>
                ))}
              </select>
              {selectedVehicleId && vehicles.find(v => v.id.toString() === selectedVehicleId.toString())?.make !== selectedOfferForContract.vehicle_make && (
                 <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                    Atenție: Mașina selectată diferă de cea din ofertă ({selectedOfferForContract.vehicle_make} {selectedOfferForContract.vehicle_model}).
                 </p>
              )}
            </div>

            <div className="p-8 overflow-y-auto font-serif text-gray-800 dark:text-gray-200 leading-relaxed space-y-6">
              <div className="text-center mb-8 border-b border-gray-200 dark:border-gray-700 pb-6">
                <h1 className="text-2xl font-bold mb-2 uppercase tracking-wide">Contract de Închiriere Auto / Leasing</h1>
                <p className="text-sm text-gray-500">Document generat automat pe baza datelor din platformă</p>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold uppercase text-sm text-gray-500 tracking-wider">Cap. I - Părțile Contractante</h4>
                <p>
                  Între <strong>AXIS RENT SRL</strong>, cu sediul în București, CUI RO12345678, reprezentată legal, denumită în continuare "Locator", și:
                </p>
                <div className="text-sm space-y-1">
                  <p><strong>Client (Locatar):</strong> {selectedOfferForContract.client?.name}</p>
                  <p><strong>CUI / CNP:</strong> {selectedOfferForContract.client?.cui_cnp}</p>
                  <p><strong>Sediul / Domiciliul:</strong> {selectedOfferForContract.client?.address}</p>
                  <p><strong>Reprezentat prin:</strong> {selectedOfferForContract.client?.type === 'PJ' ? selectedOfferForContract.client?.representative_name : selectedOfferForContract.client?.name}</p>
                  <p><strong>Identificat cu CI:</strong> Seria {selectedOfferForContract.client?.id_card_series || '___'} nr. {selectedOfferForContract.client?.id_card_number || '______'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold uppercase text-sm text-gray-500 tracking-wider mt-8">Cap. II - Obiectul Contractului</h4>
                <p>
                  Locatorul se obligă să transmită folosința, iar Locatarul să primească și să plătească prețul pentru folosința autovehiculului descris mai jos:
                </p>
                {selectedVehicleId ? (
                  <div className="text-sm space-y-1">
                    {(() => {
                      const v = vehicles.find(v => v.id.toString() === selectedVehicleId.toString());
                      return (
                        <>
                          <p><strong>Marcă și Model:</strong> {v.make} {v.model}</p>
                          <p><strong>Număr de Înmatriculare:</strong> {v.license_plate}</p>
                          <p><strong>Serie Șasiu (VIN):</strong> {v.vin}</p>
                          <p><strong>Valoare Declarată (Ofertă):</strong> {formatCurrency(selectedOfferForContract.vehicle_price)}</p>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-red-600 dark:text-red-400 text-sm font-semibold">
                    [ ATENȚIE: Selectați o mașină din flotă pentru a completa datele tehnice ale obiectului contractului ]
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-bold uppercase text-sm text-gray-500 tracking-wider mt-8">Cap. III - Valoarea și Modalitatea de Plată</h4>
                <p>
                  Prețul chiriei / ratei lunare convenite pentru utilizarea autovehiculului este de <strong>{formatCurrency(selectedOfferForContract.monthly_rate?.toFixed(2))}</strong>.
                </p>
                <p>
                  Contractul se încheie pe o perioadă de <strong>{selectedOfferForContract.period_months} luni</strong>. Plățile se vor efectua lunar, pe baza facturilor fiscale emise de Locator.
                </p>
              </div>
              
              <div className="space-y-4">
                <h4 className="font-bold uppercase text-sm text-gray-500 tracking-wider mt-8">Cap. IV - Drepturi, Obligații și Responsabilități</h4>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <li>Locatarul se obligă să exploateze vehiculul în conformitate cu instrucțiunile producătorului.</li>
                  <li>Locatarul va suporta contravaloarea amenzilor de circulație și a daunelor neacoperite de polițele de asigurare (CASCO / RCA).</li>
                  <li>Locatorul se obligă să asigure vehiculul pe toată perioada derulării prezentului contract.</li>
                  <li>Subînchirierea vehiculului către terți este strict interzisă fără acordul prealabil scris al Locatorului.</li>
                </ul>
              </div>

              <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-8 text-sm">
                <div>
                  <p className="font-bold mb-8">LOCATOR,</p>
                  <p>AXIS RENT SRL</p>
                  <p className="border-t border-gray-400 w-48 mt-4 pt-1">Semnătură / Ștampilă</p>
                </div>
                <div>
                  <p className="font-bold mb-8">LOCATAR,</p>
                  <p>{selectedOfferForContract.client?.type === 'PJ' ? selectedOfferForContract.client?.name : selectedOfferForContract.client?.name}</p>
                  <p className="border-t border-gray-400 w-48 mt-4 pt-1">Semnătură</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
              <button 
                onClick={() => { setSelectedOfferForContract(null); setSelectedVehicleId(''); }}
                className="px-6 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-all"
              >
                Anulează
              </button>
              
              <button 
                onClick={() => {
                  handleGenerateContract(selectedOfferForContract.id);
                  setSelectedOfferForContract(null);
                  setSelectedVehicleId('');
                }}
                disabled={!selectedVehicleId}
                className="px-8 py-2.5 bg-primary text-white font-medium rounded-full hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckSquare size={18} />
                Confirmă și Generează Contract
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffersList;
