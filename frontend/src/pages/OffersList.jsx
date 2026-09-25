import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, Check, FileSignature, FileText, ChevronLeft, ChevronRight, CheckSquare, 
  Trash, Eye, Edit2, PenTool, Download, ShieldCheck, UserCheck, Sparkles, X, 
  Send, Lock, FileCheck2, ArrowRight, ShieldAlert, Clock
} from 'lucide-react';
import { 
  fetchOffers, 
  approveOffer, 
  generateContract, 
  sendESignEnvelope, 
  signClientESign, 
  signAxisESign, 
  fetchESignAuditTrail, 
  submitOfferForApproval, 
  uploadTemplate, 
  deleteOffer, 
  fetchFidejusorSuggestion 
} from '../services/apiOffers';
import { fetchVehicles } from '../services/api';
import useAuthStore from '../store/authStore';
import { generateContractPdf } from '../utils/contractPdfGenerator';

const OffersList = () => {
  const navigate = useNavigate();
  const { user, currency, setCurrency } = useAuthStore();
  const [offers, setOffers] = useState([]);
  const [selectedOfferForContract, setSelectedOfferForContract] = useState(null);
  const [selectedOfferForEsign, setSelectedOfferForEsign] = useState(null);
  const [esignAuditData, setEsignAuditData] = useState(null);
  const [loadingEsign, setLoadingEsign] = useState(false);
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
      const data = await fetchOffers(user?.role === 'Dealer Sales' ? (user?.dealer_name || 'Dealer Sales') : null);
      setOffers(data);
    } catch (error) {
      console.error(error);
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
  }, [user]);

  const handleApprove = async (id) => {
    try {
      await approveOffer(id);
      loadOffers();
    } catch (error) {
      console.error(error);
      alert("Eroare la aprobarea ofertei.");
    }
  };

  const handleSubmitForApproval = async (id) => {
    try {
      await submitOfferForApproval(id);
      alert("Oferta a fost trimisă cu succes către Axis Manager pentru aprobare.");
      loadOffers();
    } catch (error) {
      console.error(error);
      alert("Eroare la trimiterea ofertei spre aprobare.");
    }
  };

  const handleGenerateContract = async (id) => {
    try {
      const data = await generateContract(id, selectedVehicleId, selectedTemplateType, fidejusorData);
      alert('Contract generat cu succes!');
      if (data.document_url) {
        window.open(`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8000'}${data.document_url}`, '_blank');
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

  const handleOpenEsignModal = async (offer) => {
    setSelectedOfferForEsign(offer);
    setEsignAuditData(null);
    if (offer.contract?.esign_envelope_id) {
      try {
        const audit = await fetchESignAuditTrail(offer.id);
        setEsignAuditData(audit);
      } catch (err) {
        console.warn("Could not load audit log:", err);
      }
    }
  };

  const handleSendESign = async (offerId) => {
    setLoadingEsign(true);
    try {
      await sendESignEnvelope(offerId);
      const audit = await fetchESignAuditTrail(offerId);
      setEsignAuditData(audit);
      loadOffers();
    } catch (err) {
      console.error(err);
      alert("Eroare la inițierea plicului eSign.");
    } finally {
      setLoadingEsign(false);
    }
  };

  const handleSignClient = async (offerId) => {
    setLoadingEsign(true);
    try {
      await signClientESign(offerId);
      const audit = await fetchESignAuditTrail(offerId);
      setEsignAuditData(audit);
      loadOffers();
    } catch (err) {
      console.error(err);
      alert("Eroare la validarea semnăturii clientului.");
    } finally {
      setLoadingEsign(false);
    }
  };

  const handleSignAxis = async (offerId) => {
    setLoadingEsign(true);
    try {
      await signAxisESign(offerId);
      const audit = await fetchESignAuditTrail(offerId);
      setEsignAuditData(audit);
      loadOffers();
    } catch (err) {
      console.error(err);
      alert("Eroare la contrasemnarea executivă Axis.");
    } finally {
      setLoadingEsign(false);
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

  // Pagination logic
  const totalItems = offers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOffers = offers.slice(startIndex, startIndex + itemsPerPage);

  const isAllSelected = paginatedOffers.length > 0 && selectedIds.length === paginatedOffers.length;

  return (
    <div className="space-y-6 text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Oferte & Contracte Leasing</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Aprobare oferte, emitere automată contracte și flux de semnare electronică Dual-Pass (Namirial QES).
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link 
            to="/offers/new"
            className="flex items-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-5 py-2.5 rounded-full hover:bg-gray-800 dark:hover:bg-white transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span className="font-medium text-sm">Ofertă Nouă</span>
          </Link>
        </div>
      </div>

      {user?.role === 'Dealer Sales' && (
        <div className="p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs flex items-center justify-between">
          <span className="text-gray-600 dark:text-gray-300">
            Conectat în modul <strong>Dealer Sales ({user?.dealer_name || 'Partener Axis'})</strong>. Ofertele redactate se trimit spre validare către Axis Manager.
          </span>
          <span className="font-semibold text-gray-500 bg-white dark:bg-gray-700 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-600">
            Canal Dealer
          </span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        
        {/* Bulk Actions Header */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center transition-all bg-gray-50 dark:bg-gray-900 min-h-[64px] ${selectedIds.length > 0 ? 'justify-between' : 'justify-end'}`}>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-200">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                {selectedIds.length} selectate
              </span>
              {user?.role !== 'Dealer Sales' && (
                <button 
                  onClick={() => {
                    selectedIds.forEach(id => handleApprove(id));
                    setSelectedIds([]);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <CheckSquare size={14} /> Bulk Aprobare
                </button>
              )}
              <button 
                onClick={handleBulkDelete} 
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Trash size={14} /> Bulk Delete
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th scope="col" className="px-5 py-3.5 w-12">
                  <input 
                    type="checkbox" 
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-700"
                  />
                </th>
                <th scope="col" className="px-4 py-3.5 w-16">Nr. Crt.</th>
                <th scope="col" className="px-6 py-3.5">Client & Canal</th>
                <th scope="col" className="px-6 py-3.5">Vehicul & Campanie</th>
                <th scope="col" className="px-6 py-3.5">Preț / Rată</th>
                <th scope="col" className="px-6 py-3.5">Status Ofertă</th>
                <th scope="col" className="px-6 py-3.5">eSign Dual-Pass</th>
                <th scope="col" className="px-6 py-3.5 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-12 text-sm text-gray-500">Se încarcă ofertele...</td></tr>
              ) : paginatedOffers.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-12 text-sm text-gray-500">Nu există oferte în sistem.</td></tr>
              ) : (
                paginatedOffers.map((offer, idx) => (
                  <tr 
                    key={offer.id} 
                    className={`hover:bg-gray-50/70 dark:hover:bg-gray-800/60 transition-colors ${selectedIds.includes(offer.id) ? 'bg-gray-50 dark:bg-gray-800/80 font-medium' : 'bg-white dark:bg-gray-800'}`}
                  >
                    <td className="px-5 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(offer.id)}
                        onChange={() => handleSelectRow(offer.id)}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400 font-medium">{startIndex + idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {offer.client?.name || 'Client Necunoscut'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {offer.dealer_name ? `Dealer: ${offer.dealer_name}` : 'Canal Direct Axis'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{offer.vehicle_make} {offer.vehicle_model}</div>
                      {offer.campaign_name && (
                        <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          {offer.campaign_name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900 dark:text-white font-medium">
                        {formatCurrency(offer.vehicle_price)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Rată: {formatCurrency(offer.monthly_rate?.toFixed(2))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap inline-flex items-center justify-center ${
                        offer.status === 'Draft' ? 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600' :
                        (offer.status === 'În Aprobare' || offer.status === 'În Așteptare (Axis)') ? 'bg-amber-50/60 text-amber-800 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800' :
                        offer.status === 'Aprobat' ? 'bg-emerald-50/60 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' :
                        'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent'
                      }`}>
                        {offer.status === 'Transformat în Contract' ? 'Contract Generat' : offer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {offer.contract ? (
                        <button
                          onClick={() => handleOpenEsignModal(offer)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-colors ${
                            offer.contract.status === 'Semnat Axis' ? 'bg-emerald-50/60 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' :
                            offer.contract.status === 'Semnat Client' ? 'bg-blue-50/60 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800' :
                            offer.contract.status === 'Trimis la Semnat' ? 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700' :
                            'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <PenTool size={12} />
                          <span>{offer.contract.status || 'Generat'}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Fără contract</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {offer.contract ? (
                          <button 
                            onClick={() => handleOpenEsignModal(offer)}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                            title="Deschide Fluxul eSign Dual-Pass"
                          >
                            <PenTool size={15} />
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => handleOpenContractModal(e, offer)}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                            title="Generează Contract"
                          >
                            <FileSignature size={15} />
                          </button>
                        )}
                        
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            navigate(`/offers/edit/${offer.id}`);
                          }}
                          className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                          title="Editează Ofertă"
                        >
                          <Edit2 size={15} />
                        </button>

                        {offer.status === 'Draft' && user?.role === 'Dealer Sales' && (
                          <button
                            onClick={() => handleSubmitForApproval(offer.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-gray-900 bg-gray-100 border border-gray-300 rounded-full hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:border-gray-600 transition-colors"
                            title="Trimite spre aprobare Axis Manager"
                          >
                            Trimite la Aprobare
                          </button>
                        )}

                        {(offer.status === 'În Așteptare (Axis)' || offer.status === 'În Aprobare') && user?.role === 'Dealer Sales' && (
                          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/30 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                            În analiză Axis
                          </span>
                        )}

                        {(offer.status === 'Draft' || offer.status === 'În Așteptare (Axis)' || offer.status === 'În Aprobare') && user?.role !== 'Dealer Sales' && (
                          <button 
                            onClick={() => handleApprove(offer.id)}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 hover:text-emerald-600 dark:text-gray-300 transition-colors"
                            title="Aprobă Ofertă"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(offer.id);
                          }}
                          className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors"
                          title="Șterge Ofertă"
                        >
                          <Trash size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>Afișează</span>
              <select 
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full px-2.5 py-1 text-xs focus:ring-1 focus:ring-gray-400"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <span className="font-semibold text-gray-700 dark:text-gray-300">Total: {totalItems}</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
            <span>
              Pagina {currentPage} din {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Modal eSign Dual-Pass Namirial (Cerința 3 & 5 Alin) */}
      {selectedOfferForEsign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-200 dark:border-gray-700">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700">
                  <PenTool size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Flux Semnare Electronică Dual-Pass (Namirial QES)</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ofertă #{selectedOfferForEsign.id} • {selectedOfferForEsign.client?.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedOfferForEsign(null); setEsignAuditData(null); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Stepper Wizard */}
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className={`p-2.5 rounded-xl border ${
                  selectedOfferForEsign.contract ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 font-semibold' : 'border-gray-200 dark:border-gray-700 text-gray-400'
                }`}>
                  <div className="text-[10px] text-gray-500">Pasul 1</div>
                  <div>Document Generat</div>
                </div>

                <div className={`p-2.5 rounded-xl border ${
                  selectedOfferForEsign.contract?.status === 'Trimis la Semnat' || selectedOfferForEsign.contract?.status === 'Semnat Client' || selectedOfferForEsign.contract?.status === 'Semnat Axis'
                    ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 font-semibold'
                    : 'border-gray-200 dark:border-gray-700 text-gray-400'
                }`}>
                  <div className="text-[10px] text-gray-500">Pasul 2</div>
                  <div>Plic eSign Emis</div>
                </div>

                <div className={`p-2.5 rounded-xl border ${
                  selectedOfferForEsign.contract?.status === 'Semnat Client' || selectedOfferForEsign.contract?.status === 'Semnat Axis'
                    ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 font-semibold'
                    : 'border-gray-200 dark:border-gray-700 text-gray-400'
                }`}>
                  <div className="text-[10px] text-gray-500">Pasul 3</div>
                  <div>Semnat Client & Garant</div>
                </div>

                <div className={`p-2.5 rounded-xl border ${
                  selectedOfferForEsign.contract?.status === 'Semnat Axis'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 font-semibold'
                    : 'border-gray-200 dark:border-gray-700 text-gray-400'
                }`}>
                  <div className="text-[10px] text-gray-500">Pasul 4</div>
                  <div>Contrasemnat Axis</div>
                </div>
              </div>

              {/* Status and Action Panel */}
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Status Plic Namirial: {selectedOfferForEsign.contract?.status || 'Generat'}
                  </span>
                  {selectedOfferForEsign.contract?.esign_envelope_id && (
                    <span className="font-mono text-[11px] text-gray-500 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                      {selectedOfferForEsign.contract.esign_envelope_id}
                    </span>
                  )}
                </div>

                {/* Step Action Logic */}
                {(!selectedOfferForEsign.contract?.status || selectedOfferForEsign.contract?.status === 'Generat') && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Contractul este redactat. Apasă butonul de mai jos pentru a crea plicul electronic securizat Namirial și a trimite invitațiile de semnare prin SMS OTP către reprezentantul legal și fidejusor.
                    </p>
                    <button
                      onClick={() => handleSendESign(selectedOfferForEsign.id)}
                      disabled={loadingEsign}
                      className="w-full py-2.5 px-4 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-white text-xs font-semibold flex items-center justify-center gap-2"
                    >
                      <Send size={15} />
                      {loadingEsign ? "Se inițiază plicul..." : "Inițiază Plic eSign Namirial (SMS/Email OTP)"}
                    </button>
                  </div>
                )}

                {selectedOfferForEsign.contract?.status === 'Trimis la Semnat' && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Plicul a fost transmis. Se așteaptă introducerea codului OTP de 6 cifre de către client și fidejusor. Pentru testare sau validare imediată din dispecerat:
                    </p>
                    <button
                      onClick={() => handleSignClient(selectedOfferForEsign.id)}
                      disabled={loadingEsign}
                      className="w-full py-2.5 px-4 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-white text-xs font-semibold flex items-center justify-center gap-2"
                    >
                      <Check size={15} />
                      {loadingEsign ? "Se procesează..." : "Simulează / Validează Semnare Client & Fidejusor (OTP)"}
                    </button>
                  </div>
                )}

                {selectedOfferForEsign.contract?.status === 'Semnat Client' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300">
                      Clientul și Fidejusorul au semnat electronic cu succes. Este necesară contrasemnătura reprezentantului executiv Axis Rent SRL (Certificat Calificat QES).
                    </div>
                    {user?.role !== 'Dealer Sales' ? (
                      <button
                        onClick={() => handleSignAxis(selectedOfferForEsign.id)}
                        disabled={loadingEsign}
                        className="w-full py-2.5 px-4 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-white text-xs font-semibold flex items-center justify-center gap-2"
                      >
                        <ShieldCheck size={15} />
                        {loadingEsign ? "Se aplică contrasemnătura..." : "Contrasemnează Executiv (Axis Rent S.R.L. - QES)"}
                      </button>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                        Așteaptă contrasemnătura executivă de la conducerea Axis.
                      </p>
                    )}
                  </div>
                )}

                {selectedOfferForEsign.contract?.status === 'Semnat Axis' && (
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-xs space-y-2">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                      <FileCheck2 size={16} />
                      <span>Contract Semnat Integral & Arhivat Legal</span>
                    </div>
                    <p className="text-gray-500">
                      Ambele părți au semnat documentul cu certificate calificate conform Regulamentului eIDAS.
                    </p>
                  </div>
                )}
              </div>

              {/* Cryptographic Audit Trail */}
              {esignAuditData?.audit_trail && esignAuditData.audit_trail.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Jurnal de Audit Criptografic (Tamper-Evident Trail)
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {esignAuditData.audit_trail.map((ev, eIdx) => (
                      <div key={eIdx} className="p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700/80 rounded-lg text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900 dark:text-white">{ev.event}</span>
                          <span className="font-mono text-[10px] text-gray-400">{ev.timestamp}</span>
                        </div>
                        {ev.signer && (
                          <div className="text-gray-600 dark:text-gray-300">
                            Semnatar: <strong>{ev.signer}</strong> ({ev.auth_method || ev.entity})
                          </div>
                        )}
                        {ev.certificate_serial && (
                          <div className="font-mono text-[10px] text-gray-400">
                            Serial: {ev.certificate_serial} • IP: {ev.ip_address}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end">
              <button 
                onClick={() => { setSelectedOfferForEsign(null); setEsignAuditData(null); }}
                className="px-5 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Generare Contract DOCX / PDF */}
      {selectedOfferForContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] border border-gray-200 dark:border-gray-700">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700">
                  <FileSignature size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Generare Contract Auto & Fidejusiune</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ofertă #{selectedOfferForContract.id} • {selectedOfferForContract.client?.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => { setSelectedOfferForContract(null); setSelectedVehicleId(''); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Settings Bar: Vehicul & Template */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  1. Vehicul din Flotă (pentru serie VIN & Nr. Înmatriculare):
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-gray-400"
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
                  className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-gray-400"
                >
                  <option value="standard">Contract Standard de Închiriere Auto (Persoane Fizice)</option>
                  <option value="fidejusor">Contract de Închiriere Auto cu Fidejusor Garant (Persoane Juridice)</option>
                  <option value="leasing">Contract Leasing Operațional cu Servicii Incluse</option>
                </select>
              </div>
            </div>

            {/* Fidejusor Section if template is fidejusor */}
            {selectedTemplateType === 'fidejusor' && (
              <div className="p-4 bg-gray-50/70 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-gray-700 dark:text-gray-300" />
                    <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                      Date Fidejusor (Garant Solitar Conform Art. 2280 Cod Civil)
                    </span>
                  </div>
                  {loadingFidejusor && (
                    <span className="text-[11px] text-gray-500">Se preiau datele administratorului...</span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Nume Fidejusor</label>
                    <input 
                      type="text" 
                      value={fidejusorData.name}
                      onChange={e => setFidejusorData({...fidejusorData, name: e.target.value})}
                      className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-800 dark:text-white"
                      placeholder="Nume Prenume"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">CNP</label>
                    <input 
                      type="text" 
                      value={fidejusorData.cnp}
                      onChange={e => setFidejusorData({...fidejusorData, cnp: e.target.value})}
                      className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-800 dark:text-white"
                      placeholder="13 cifre..."
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Calitate</label>
                    <input 
                      type="text" 
                      value={fidejusorData.quality}
                      onChange={e => setFidejusorData({...fidejusorData, quality: e.target.value})}
                      className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-800 dark:text-white"
                      placeholder="Administrator Statutar"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Document Preview Box */}
            <div className="p-6 overflow-y-auto flex-1 font-serif text-xs leading-relaxed text-gray-700 dark:text-gray-300 space-y-4 bg-white dark:bg-gray-800">
              <div className="text-center space-y-1 pb-4 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-bold text-sm tracking-wide text-gray-900 dark:text-white uppercase">
                  {selectedTemplateType === 'fidejusor' ? 'CONTRACT DE ÎNCHIRIERE AUTO CU FIDEJUSIUNE' : 'CONTRACT DE ÎNCHIRIERE AUTOVEHICUL'}
                </h4>
                <p className="text-[11px] text-gray-500 font-sans">
                  Nr. AX-{selectedOfferForContract.id}/{new Date().getFullYear()} din data de {new Date().toLocaleDateString('ro-RO')}
                </p>
              </div>

              <div className="space-y-2">
                <p><strong>1. PĂRȚILE CONTRACTANTE:</strong></p>
                <p className="pl-4">
                  <strong>AXIS RENT S.R.L.</strong>, în calitate de <strong>LOCATOR</strong>, și
                </p>
                <p className="pl-4">
                  <strong>{selectedOfferForContract.client?.name}</strong>, CIF/CNP: <strong>{selectedOfferForContract.client?.cui_cnp}</strong>, în calitate de <strong>LOCATAR</strong>.
                </p>
                {selectedTemplateType === 'fidejusor' && (
                  <p className="pl-4 bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700">
                    <strong>FIDEJUSOR (GARANT SOLITAR):</strong> D-nul/D-na <strong>{fidejusorData.name || 'Popescu Ion'}</strong>, identificat(ă) prin CNP: {fidejusorData.cnp || '1800101...'}, în calitate de {fidejusorData.quality || 'Administrator'}, care garantează irevocabil și necondiționat executarea obligațiilor contractuale.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <p><strong>2. OBIECTUL ȘI CONDIȚIILE FINANCIARE:</strong></p>
                <p className="pl-4">
                  Autovehicul: <strong>{selectedOfferForContract.vehicle_make} {selectedOfferForContract.vehicle_model}</strong>, Valoare: <strong>{formatCurrency(selectedOfferForContract.vehicle_price)}</strong>.
                </p>
                <p className="pl-4">
                  Rată lunară de chirie: <strong>{formatCurrency(selectedOfferForContract.monthly_rate?.toFixed(2))}</strong> (fără TVA) pe o durată de <strong>{selectedOfferForContract.period_months || 60} luni</strong>.
                </p>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
              <button 
                onClick={() => { setSelectedOfferForContract(null); setSelectedVehicleId(''); setSelectedTemplateType('standard'); }}
                className="px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Anulează
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={generatingPdf}
                  onClick={handleDownloadContractPdf}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-xs disabled:opacity-50"
                  title="Generează și descarcă raportul PDF oficial al contractului (Canvas 200 DPI)"
                >
                  <Download size={14} />
                  {generatingPdf ? "Generare PDF..." : "Descarcă PDF (Oficial)"}
                </button>

                <button 
                  onClick={() => {
                    handleGenerateContract(selectedOfferForContract.id);
                    setSelectedOfferForContract(null);
                    setSelectedVehicleId('');
                    setSelectedTemplateType('standard');
                  }}
                  className="px-5 py-2 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-white transition-colors flex items-center gap-2 text-xs"
                  title="Generează contractul complet editabil în format Microsoft Word (.docx)"
                >
                  <CheckSquare size={14} />
                  Confirmă și Descarcă DOCX
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-800 dark:text-gray-200">
                <Trash size={26} strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Confirmare Ștergere</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {deleteConfirm.isBulk 
                  ? `Ești sigur că vrei să ștergi cele ${selectedIds.length} oferte selectate?` 
                  : 'Ești sigur că vrei să ștergi această ofertă?'}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button 
                onClick={() => setDeleteConfirm({ isOpen: false, id: null, isBulk: false })}
                className="flex-1 py-2 px-3 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Anulează
              </button>
              <button 
                onClick={confirmDeleteAction}
                className="flex-1 py-2 px-3 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 transition-colors shadow-xs"
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
