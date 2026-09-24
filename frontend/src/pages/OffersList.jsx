import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Check, FileSignature, FileText, ChevronLeft, ChevronRight, CheckSquare, Trash, Eye, Edit2, PenTool, Download, ShieldCheck, UserCheck, Sparkles } from 'lucide-react';
import { fetchOffers, approveOffer, generateContract, sendESign, uploadTemplate, deleteOffer, fetchFidejusorSuggestion } from '../services/apiOffers';
import { fetchVehicles } from '../services/api';
import useAuthStore from '../store/authStore';
import { generateContractPdf } from '../utils/contractPdfGenerator';

const OffersList = () => {
  const navigate = useNavigate();
  const { user, currency, setCurrency } = useAuthStore();
  const [offers, setOffers] = useState([]);
  const [selectedOfferForContract, setSelectedOfferForContract] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, isBulk: false });
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedTemplateType, setSelectedTemplateType] = useState('standard');
  const [fidejusorData, setFidejusorData] = useState({ name: '', cnp: '', address: '', id_card: '', quality: '' });
  const [fidejusorCandidates, setFidejusorCandidates] = useState([]);
  const [loadingFidejusor, setLoadingFidejusor] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

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
      const data = await generateContract(id, selectedVehicleId, selectedTemplateType, fidejusorData);
      alert('Contract generat cu succes!');
      // descarcă direct documentul
      if (data.document_url) {
        window.open(`${import.meta.env.VITE_API_URL.replace('/api', '')}${data.document_url}`, '_blank');
      }
      loadOffers();
    } catch (error) {
      console.error(error);
      alert("Eroare la generarea contractului.");
    }
  };

  const handleDownloadContractPdf = async () => {
    if (!selectedOfferForContract) return;
    setGeneratingPdf(true);
    try {
      const selectedVehicleObj = vehicles.find(v => v.id.toString() === selectedVehicleId.toString());
      await generateContractPdf({
        offer: selectedOfferForContract,
        client: selectedOfferForContract.client,
        vehicle: selectedVehicleObj,
        templateType: selectedTemplateType,
        fidejusorData: fidejusorData,
        contractNum: selectedOfferForContract.contract?.contract_number
      });
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Eroare la generarea fișierului PDF al contractului.");
    } finally {
      setGeneratingPdf(false);
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

  const handleDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id, isBulk: false });
  };

  const handleBulkDelete = () => {
    setDeleteConfirm({ isOpen: true, id: null, isBulk: true });
  };

  const confirmDeleteAction = async () => {
    try {
      if (deleteConfirm.isBulk) {
        for (const id of selectedIds) {
          await deleteOffer(id);
        }
        setSelectedIds([]);
      } else if (deleteConfirm.id) {
        await deleteOffer(deleteConfirm.id);
      }
      loadOffers();
      setDeleteConfirm({ isOpen: false, id: null, isBulk: false });
    } catch (error) {
      console.error(error);
      alert("Eroare la ștergere.");
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

    const tType = offer.template_type?.toLowerCase() || (offer.client?.type === 'PJ' ? 'fidejusor' : 'standard');
    setSelectedTemplateType(tType);

    const initialF = {
      name: offer.fidejusor_name || '',
      cnp: offer.fidejusor_cnp || '',
      address: offer.fidejusor_address || '',
      id_card: offer.fidejusor_id_card || '',
      quality: offer.fidejusor_quality || ''
    };
    setFidejusorData(initialF);

    if (offer.client_id) {
      setLoadingFidejusor(true);
      fetchFidejusorSuggestion(offer.client_id)
        .then(res => {
          if (res?.suggested_fidejusor) {
            setFidejusorCandidates(res.all_candidates || [res.suggested_fidejusor]);
            setFidejusorData(prev => ({
              name: prev.name || res.suggested_fidejusor.name || '',
              cnp: prev.cnp || res.suggested_fidejusor.cnp || '',
              address: prev.address || res.suggested_fidejusor.address || '',
              id_card: prev.id_card || res.suggested_fidejusor.id_card || '',
              quality: prev.quality || res.suggested_fidejusor.quality || 'Administrator Statutar'
            }));
          }
        })
        .catch(console.warn)
        .finally(() => setLoadingFidejusor(false));
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
              <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 transition-colors">
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
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap inline-flex items-center justify-center
                        ${offer.status === 'Draft' ? 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600' : 
                          offer.status === 'Aprobat' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50' : 
                          'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50'}`}>
                        {offer.status === 'Transformat în Contract' ? 'Contract' : offer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                      {offer.contract ? (
                        <a 
                          href={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : (import.meta.env.PROD ? 'https://axis-v01.up.railway.app' : 'http://localhost:8000')}${offer.contract.document_url}`}
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
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          navigate(`/offers/edit/${offer.id}`);
                        }}
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
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(offer.id);
                        }}
                        className="p-2 flex items-center justify-center text-red-500 hover:text-red-700 border border-red-200 dark:border-red-900/50 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        title="Șterge Ofertă"
                      >
                        <Trash size={16} strokeWidth={1.5} />
                      </button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-200 dark:border-gray-700">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl text-primary">
                  <FileSignature size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Generare Contract Auto & Fidejusiune</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ofertă #{selectedOfferForContract.id} • {selectedOfferForContract.client?.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedOfferForContract(null); setSelectedVehicleId(''); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Settings Bar: Vehicul & Template */}
            <div className="p-4 bg-gray-100/70 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  1. Vehicul din Flotă (pentru serie VIN & Nr. Înmatriculare):
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary focus:border-primary"
                >
                  <option value="">-- Completează manual / Alocare ulterioară --</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id.toString()}>
                      {v.make} {v.model} • {v.license_plate} (VIN: {v.vin})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  2. Tip Contract & Template Juridic:
                </label>
                <select
                  value={selectedTemplateType}
                  onChange={(e) => setSelectedTemplateType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-primary focus:border-primary"
                >
                  <option value="standard">Contract Leasing Standard (Fără Garant)</option>
                  <option value="fidejusor">Contract cu Fidejusor (Șablon Oficial Maria - Recomandat AI)</option>
                  <option value="leasing">Contract Leasing Operațional LT</option>
                </select>
              </div>
            </div>

            {/* Secțiune Configurare Fidejusor când template-ul este Fidejusor */}
            {selectedTemplateType === 'fidejusor' && (
              <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-amber-600 dark:text-amber-400" size={18} />
                    <span className="text-xs font-bold text-gray-900 dark:text-white">
                      Desemnare Fidejusor Garant (Conform Cod Civil Art. 2280-2323)
                    </span>
                  </div>
                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                    <Sparkles size={11} /> AI Governance Match
                  </span>
                </div>

                {fidejusorCandidates.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Asociați / Administratori:</span>
                    {fidejusorCandidates.map((cand, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFidejusorData({
                            name: cand.name,
                            cnp: cand.cnp || fidejusorData.cnp,
                            address: cand.address || fidejusorData.address,
                            id_card: cand.id_card || fidejusorData.id_card,
                            quality: cand.quality || fidejusorData.quality
                          });
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-all flex items-center gap-1 ${
                          fidejusorData.name === cand.name
                            ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <UserCheck size={12} />
                        <span>{cand.name}</span>
                        <span className="opacity-75 text-[10px]">({cand.quality})</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400">Nume Fidejusor</label>
                    <input 
                      type="text" 
                      value={fidejusorData.name} 
                      onChange={e => setFidejusorData({...fidejusorData, name: e.target.value})} 
                      className="mt-0.5 w-full px-2.5 py-1.5 text-xs border rounded-lg dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white"
                      placeholder="POPESCU ION"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400">Calitate / Procent</label>
                    <input 
                      type="text" 
                      value={fidejusorData.quality} 
                      onChange={e => setFidejusorData({...fidejusorData, quality: e.target.value})} 
                      className="mt-0.5 w-full px-2.5 py-1.5 text-xs border rounded-lg dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white"
                      placeholder="Asociat Majoritar (100%)"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400">CNP Fidejusor</label>
                    <input 
                      type="text" 
                      value={fidejusorData.cnp} 
                      onChange={e => setFidejusorData({...fidejusorData, cnp: e.target.value})} 
                      className="mt-0.5 w-full px-2.5 py-1.5 text-xs border rounded-lg dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:text-white"
                      placeholder="13 cifre..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Document Preview Canvas / Paper */}
            <div className="p-8 overflow-y-auto font-serif text-gray-800 dark:text-gray-200 leading-relaxed space-y-6 flex-1 bg-white dark:bg-gray-900">
              <div className="text-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-5">
                <span className="text-xs uppercase tracking-widest text-primary font-bold block mb-1">
                  AXIS FLEET MANAGEMENT • DIVIZIA LEASING OPERAȚIONAL
                </span>
                <h1 className="text-2xl font-bold uppercase tracking-wide">
                  {selectedTemplateType === 'fidejusor' 
                    ? 'CONTRACT DE LEASING OPERAȚIONAL CU ANGAJAMENT DE FIDEJUSIUNE' 
                    : 'CONTRACT DE ÎNCHIRIERE AUTO / LEASING OPERAȚIONAL'}
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Nr. Înregistrare: AXIS-{new Date().getFullYear()}-PROV • Data: {new Date().toLocaleDateString('ro-RO')}
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold uppercase text-xs text-gray-500 tracking-wider">Cap. I - Părțile Contractante</h4>
                <p className="text-sm">
                  1.1. <strong>S.C. AXIS RENT S.R.L.</strong>, cu sediul în București, CUI RO12345678, reprezentată legal, denumită în continuare <em>"Locator"</em>, și
                </p>
                <div className="text-sm pl-4 border-l-2 border-primary/30 space-y-1">
                  <p>1.2. <strong>Locatar (Debitor Principal):</strong> {selectedOfferForContract.client?.name}</p>
                  <p><strong>CUI / CNP:</strong> {selectedOfferForContract.client?.cui_cnp} • <strong>Reg. Com:</strong> {selectedOfferForContract.client?.reg_com || 'J40/___/____'}</p>
                  <p><strong>Sediul:</strong> {selectedOfferForContract.client?.address || 'Mun. București'}</p>
                  <p><strong>Reprezentat prin:</strong> {selectedOfferForContract.client?.type === 'PJ' ? selectedOfferForContract.client?.representative_name : selectedOfferForContract.client?.name} (Administrator)</p>
                </div>

                {selectedTemplateType === 'fidejusor' && (
                  <div className="text-sm pl-4 border-l-2 border-amber-400 bg-amber-50/50 dark:bg-amber-900/10 p-2.5 rounded-r-lg space-y-1">
                    <p>1.3. <strong>Fidejusor (Garant Solidar):</strong> {fidejusorData.name || '___________'}</p>
                    <p><strong>CNP:</strong> {fidejusorData.cnp || '___________'} • <strong>Calitate:</strong> {fidejusorData.quality || 'Garant Solidar'}</p>
                    <p><strong>Domiciliat în:</strong> {fidejusorData.address || selectedOfferForContract.client?.address || 'Mun. București'}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-bold uppercase text-xs text-gray-500 tracking-wider mt-6">Cap. II - Obiectul Contractului</h4>
                <p className="text-sm">
                  Locatorul transmite folosința exclusivă, iar Locatarul primește și achită prețul chiriei pentru autovehiculul specificat:
                </p>
                {selectedVehicleId ? (
                  <div className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-1">
                    {(() => {
                      const v = vehicles.find(v => v.id.toString() === selectedVehicleId.toString());
                      return (
                        <>
                          <p><strong>Marcă și Model:</strong> {v?.make} {v?.model}</p>
                          <p><strong>Număr de Înmatriculare:</strong> {v?.license_plate}</p>
                          <p><strong>Serie Șasiu (VIN):</strong> {v?.vin}</p>
                          <p><strong>Valoare de Bază (Catalog):</strong> {formatCurrency(selectedOfferForContract.vehicle_price)}</p>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 space-y-1">
                    <p><strong>Marcă și Model:</strong> {selectedOfferForContract.vehicle_make} {selectedOfferForContract.vehicle_model}</p>
                    <p><strong>Număr de Înmatriculare:</strong> ___________ (alocat la predare)</p>
                    <p><strong>Serie Șasiu (VIN):</strong> ___________ (alocat la predare)</p>
                    <p><strong>Valoare de Bază (Catalog):</strong> {formatCurrency(selectedOfferForContract.vehicle_price)}</p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-bold uppercase text-xs text-gray-500 tracking-wider mt-6">Cap. III - Condiții Financiare</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 block">Rată Lunară</span>
                    <strong className="text-primary text-base">{formatCurrency(selectedOfferForContract.monthly_rate?.toFixed(2))}</strong>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 block">Avans Inițial</span>
                    <strong>{selectedOfferForContract.advance_percent}% ({formatCurrency((selectedOfferForContract.vehicle_price * selectedOfferForContract.advance_percent) / 100)})</strong>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 block">Durată</span>
                    <strong>{selectedOfferForContract.period_months} Luni</strong>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <span className="text-xs text-gray-500 block">Valoare Reziduală</span>
                    <strong>{selectedOfferForContract.residual_value_percent}%</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <h4 className="font-bold uppercase text-xs text-gray-500 tracking-wider mt-6">Cap. IV - Telematics & Monitorizare GPS</h4>
                <p>
                  Autovehiculul este echipat cu sistem telematic activ GPS Axis pentru siguranța activului, geofencing și asistență rutieră. Locatarul se obligă să nu intervină asupra instalației de monitorizare.
                </p>
              </div>

              {selectedTemplateType === 'fidejusor' && (
                <div className="space-y-2 text-sm p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200">
                  <h4 className="font-bold uppercase text-xs text-amber-800 dark:text-amber-400 tracking-wider">
                    Cap. V - Angajamentul de Fidejusiune Solidară (Art. 2280 - 2323 Codul Civil Român)
                  </h4>
                  <p>
                    Fidejusorul garantează irevocabil și necondiționat executarea tuturor obligațiilor decurgând din prezentul contract.
                  </p>
                  <p className="font-semibold text-xs text-red-700 dark:text-red-400">
                    • RENUNȚARE LA BENEFICIUL DE DISCUȚIUNE (Art. 2294 Cod Civil): Locatorul poate executa direct Fidejusorul fără a fi obligat să urmărească în prealabil patrimoniul Locatarului.
                  </p>
                  <p className="font-semibold text-xs text-red-700 dark:text-red-400">
                    • RENUNȚARE LA BENEFICIUL DE DIVIZIUNE (Art. 2300 Cod Civil): Răspunderea este integrală și indivizibilă.
                  </p>
                  <p className="text-xs">
                    • Prezentul contract are forță de Titlu Executoriu în condițiile legii române.
                  </p>
                </div>
              )}

              {/* Bloc Semnături */}
              <div className={`mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 grid ${selectedTemplateType === 'fidejusor' ? 'grid-cols-3' : 'grid-cols-2'} gap-6 text-sm`}>
                <div>
                  <p className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-1">LOCATOR</p>
                  <p className="font-medium text-gray-900 dark:text-white">AXIS RENT SRL</p>
                  <p className="text-xs text-gray-500">Reprezentant Legal</p>
                  <div className="border-t border-dashed border-gray-400 mt-12 pt-1 text-xs text-gray-400">
                    Semnătură / Ștampilă
                  </div>
                </div>

                <div>
                  <p className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-1">LOCATAR</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedOfferForContract.client?.name}</p>
                  <p className="text-xs text-gray-500">Reprezentant: {selectedOfferForContract.client?.representative_name || selectedOfferForContract.client?.name}</p>
                  <div className="border-t border-dashed border-gray-400 mt-12 pt-1 text-xs text-gray-400">
                    Semnătură
                  </div>
                </div>

                {selectedTemplateType === 'fidejusor' && (
                  <div>
                    <p className="font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">FIDEJUSOR (GARANT)</p>
                    <p className="font-medium text-gray-900 dark:text-white">{fidejusorData.name || 'Garant Statutar'}</p>
                    <p className="text-xs text-gray-500">{fidejusorData.quality || 'În nume personal'}</p>
                    <div className="border-t border-dashed border-amber-400 mt-12 pt-1 text-xs text-gray-400">
                      Semnătură Fidejusor
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
              <button 
                onClick={() => { setSelectedOfferForContract(null); setSelectedVehicleId(''); setSelectedTemplateType('standard'); }}
                className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-all text-sm"
              >
                Anulează
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={generatingPdf}
                  onClick={handleDownloadContractPdf}
                  className="px-5 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-medium rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                  title="Generează și descarcă raportul PDF oficial al contractului (Canvas 200 DPI)"
                >
                  <Download size={16} />
                  {generatingPdf ? "Generare PDF..." : "Descarcă PDF (Oficial)"}
                </button>

                <button 
                  onClick={() => {
                    handleGenerateContract(selectedOfferForContract.id);
                    setSelectedOfferForContract(null);
                    setSelectedVehicleId('');
                    setSelectedTemplateType('standard');
                  }}
                  className="px-6 py-2.5 bg-primary text-white font-medium rounded-full hover:bg-primary/90 shadow-sm transition-all flex items-center gap-2 text-sm"
                  title="Generează contractul complet editabil în format Microsoft Word (.docx)"
                >
                  <CheckSquare size={16} />
                  Confirmă și Descarcă DOCX
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700/50 rounded-full flex items-center justify-center text-gray-900 dark:text-gray-200">
                <Trash size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirmare Ștergere</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {deleteConfirm.isBulk 
                  ? `Ești sigur că vrei să ștergi cele ${selectedIds.length} oferte selectate? Această acțiune este ireversibilă.` 
                  : 'Ești sigur că vrei să ștergi această ofertă? Această acțiune este ireversibilă.'}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-8">
              <button 
                onClick={() => setDeleteConfirm({ isOpen: false, id: null, isBulk: false })}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Anulează
              </button>
              <button 
                onClick={confirmDeleteAction}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors shadow-sm"
              >
                Da, Șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OffersList;
