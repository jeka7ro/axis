import { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Search, Trash, ShieldAlert, UserX, Building2, User, 
  ChevronLeft, ChevronRight, CheckSquare, CheckCircle2, AlertCircle, Loader2, ShieldBan 
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import { 
  fetchBlacklistedClients, 
  removeClientFromBlacklist, 
  addClientToBlacklist, 
  fetchClients 
} from '../services/api';

const BlackList = () => {
  const { user } = useAuthStore();
  
  const [blacklist, setBlacklist] = useState([]);
  const [availableClients, setAvailableClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const [selectedIds, setSelectedIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // New Blacklist Entry Modal State
  const [modalForm, setModalForm] = useState({
    clientId: '',
    reason: 'Datorii restante & risc major de neplată',
    severity: 'Critic'
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Unblacklist confirmation modal state
  const [unblacklistModal, setUnblacklistModal] = useState({
    isOpen: false,
    client: null,
    isBulk: false,
    loading: false
  });

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setApiError("");
    try {
      const [blacklistedData, allClients] = await Promise.all([
        fetchBlacklistedClients(),
        fetchClients()
      ]);
      setBlacklist(blacklistedData || []);
      setAvailableClients(allClients || []);
    } catch (err) {
      console.error("Eroare la încărcarea datelor Black List:", err);
      setApiError("Nu s-au putut încărca datele din server. Verificați conexiunea backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(filteredList.map(s => s.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!modalForm.clientId) {
      showToast("Vă rugăm să selectați un client!", "error");
      return;
    }
    setModalSubmitting(true);
    try {
      await addClientToBlacklist(modalForm.clientId, {
        reason: modalForm.reason,
        severity: modalForm.severity
      });
      showToast("Clientul a fost adăugat în Black List!", "success");
      setIsModalOpen(false);
      setModalForm({ clientId: '', reason: 'Datorii restante & risc major de neplată', severity: 'Critic' });
      await loadData();
    } catch (err) {
      console.error("Eroare adăugare blacklist:", err);
      showToast("Eroare la adăugarea în Black List", "error");
    } finally {
      setModalSubmitting(false);
    }
  };

  const confirmUnblacklist = async () => {
    setUnblacklistModal(prev => ({ ...prev, loading: true }));
    try {
      if (unblacklistModal.isBulk) {
        for (const id of selectedIds) {
          await removeClientFromBlacklist(id);
        }
        showToast(`${selectedIds.length} clienți au fost scoși din Black List!`, "success");
        setSelectedIds([]);
      } else if (unblacklistModal.client) {
        await removeClientFromBlacklist(unblacklistModal.client.id);
        showToast(`"${unblacklistModal.client.name}" a fost scos din Black List!`, "success");
      }
      setUnblacklistModal({ isOpen: false, client: null, isBulk: false, loading: false });
      await loadData();
    } catch (err) {
      console.error("Eroare scoatere blacklist:", err);
      showToast("Eroare la deblocarea clientului", "error");
      setUnblacklistModal(prev => ({ ...prev, loading: false }));
    }
  };

  if (user?.role === 'Dealer Sales') {
    return <div className="p-8 text-center text-red-500 font-bold">Acces Interzis. Doar Management Axis.</div>;
  }

  // Filter
  const filteredList = blacklist.filter(item => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      item.name?.toLowerCase().includes(term) ||
      item.cui_cnp?.toLowerCase().includes(term) ||
      item.blacklist_reason?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedList = filteredList.slice(startIndex, startIndex + itemsPerPage);
  const isAllSelected = paginatedList.length > 0 && paginatedList.every(i => selectedIds.includes(i.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> Axis Black List (PF / PJ)
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Clienți cu interdicții și risc major. Statusul "Black List" blochează ofertarea și alertează departamentul de risc.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-full hover:bg-red-700 transition-colors shadow-sm font-medium cursor-pointer"
        >
          <UserX size={18} /> Adaugă Client
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Bulk Actions & Search Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center transition-all bg-gray-50/50 dark:bg-gray-800/50 min-h-[64px] justify-between flex-wrap gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Caută în Black List după CUI, CNP sau Nume..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-primary focus:border-primary dark:text-white shadow-sm text-sm"
            />
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
              <span className="text-sm font-medium text-gray-500 bg-white dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600">
                {selectedIds.length} selectate
              </span>
              <button 
                type="button"
                onClick={() => setUnblacklistModal({ isOpen: true, client: null, isBulk: true, loading: false })}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full hover:bg-emerald-100 transition-colors cursor-pointer shadow-xs"
              >
                <CheckSquare size={14} /> Bulk Iertare (Scoate din Listă)
              </button>
            </div>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-900/50 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th scope="col" className="px-6 py-4 w-12">
                  <input 
                    type="checkbox" 
                    onChange={handleSelectAll} 
                    checked={isAllSelected} 
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700" 
                  />
                </th>
                <th scope="col" className="px-4 py-4 w-16">Nr. Crt.</th>
                <th scope="col" className="px-6 py-4">Client (PF/PJ)</th>
                <th scope="col" className="px-6 py-4">CUI / CNP</th>
                <th scope="col" className="px-6 py-4">Motiv Interdicție</th>
                <th scope="col" className="px-6 py-4">Severitate</th>
                <th scope="col" className="px-6 py-4">Dată Blocare</th>
                <th scope="col" className="px-6 py-4 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin mb-3"></div>
                      Se încarcă lista de interdicții...
                    </div>
                  </td>
                </tr>
              ) : apiError ? (
                <tr>
                  <td colSpan="8" className="px-6 py-10 text-center text-red-500 bg-red-50/50 dark:bg-red-900/10">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle size={24} />
                      <span className="font-medium">{apiError}</span>
                      <button 
                        onClick={loadData} 
                        className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline font-medium cursor-pointer"
                      >
                        Reîncearcă
                      </button>
                    </div>
                  </td>
                </tr>
              ) : paginatedList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-3">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">Niciun client în Black List</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Momentan nu există entități cu interdicții active. Puteți adăuga un client folosind butonul de mai sus sau direct din tabelul Clienți.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedList.map((item, idx) => (
                  <tr 
                    key={item.id} 
                    className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50 transition-colors ${
                      selectedIds.includes(item.id) ? 'bg-red-50/30 dark:bg-red-950/20' : 'bg-white dark:bg-gray-800'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(item.id)} 
                        onChange={() => handleSelectRow(item.id)} 
                        className="w-4 h-4 rounded border-gray-300 text-primary" 
                      />
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-400">{startIndex + idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {item.type === 'PJ' ? <Building2 size={16} className="text-gray-400 shrink-0"/> : <User size={16} className="text-gray-400 shrink-0"/>}
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs">{item.cui_cnp}</td>
                    <td className="px-6 py-4 text-red-600 dark:text-red-400 font-medium">
                      {item.blacklist_reason || 'Risc Critic'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        (item.blacklist_severity || 'Critic') === 'Critic' 
                          ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800' 
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800'
                      }`}>
                        {item.blacklist_severity || 'Critic'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {item.blacklist_added_at 
                        ? new Date(item.blacklist_added_at).toLocaleDateString('ro-RO')
                        : new Date(item.created_at).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                      <button 
                        type="button"
                        onClick={() => setUnblacklistModal({ isOpen: true, client: item, isBulk: false, loading: false })}
                        className="p-2 flex items-center justify-center text-gray-500 hover:text-emerald-600 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all cursor-pointer shadow-2xs" 
                        title="Scoate din Black List (Iertare)"
                      >
                        <ShieldBan size={18} strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span>Afișează</span>
              <select 
                value={itemsPerPage} 
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block p-1.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <span>Total: {filteredList.length}</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Pagină {currentPage} din {totalPages}</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                title="Pagina anterioară"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                title="Pagina următoare"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adăugare în Black List */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UserX className="text-red-500"/> Adaugă în Black List
            </h3>
            
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Selectează Client
                </label>
                <select 
                  value={modalForm.clientId}
                  onChange={(e) => setModalForm(prev => ({ ...prev, clientId: e.target.value }))}
                  required
                  className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                >
                  <option value="">-- Alege un client din portofoliu --</option>
                  {availableClients
                    .filter(c => !c.is_blacklisted)
                    .map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.cui_cnp})
                      </option>
                    ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Motiv / Notă Abatere
                </label>
                <textarea 
                  rows="3" 
                  value={modalForm.reason}
                  onChange={(e) => setModalForm(prev => ({ ...prev, reason: e.target.value }))}
                  required
                  className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 resize-none" 
                  placeholder="Descrie motivul interdicției..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Grad de Severitate
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Critic', 'Înalt', 'Mediu'].map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setModalForm(prev => ({ ...prev, severity: sev }))}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        modalForm.severity === sev
                          ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                          : 'bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  disabled={modalSubmitting}
                  className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  Anulare
                </button>
                <button 
                  type="submit" 
                  disabled={modalSubmitting}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {modalSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Se adaugă...</span>
                    </>
                  ) : (
                    <span>Confirmă Adăugarea</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmare Iertare / Deblocare */}
      {unblacklistModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700 text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-3">
              <ShieldBan size={28} strokeWidth={1.8} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Deblocare Client</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {unblacklistModal.isBulk 
                ? `Ești sigur că vrei să scoți din Black List cei ${selectedIds.length} clienți selectați?`
                : `Ești sigur că vrei să scoți clientul "${unblacklistModal.client?.name}" din Black List?`}
            </p>
            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setUnblacklistModal({ isOpen: false, client: null, isBulk: false, loading: false })}
                disabled={unblacklistModal.loading}
                className="flex-1 py-2.5 px-4 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/70 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Anulează
              </button>
              <button
                type="button"
                onClick={confirmUnblacklist}
                disabled={unblacklistModal.loading}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-700 transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {unblacklistModal.loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Se deblochează...</span>
                  </>
                ) : (
                  <span>Deblochează</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[120] animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border backdrop-blur-md ${
            toastMessage.type === 'error'
              ? 'bg-rose-50/95 dark:bg-rose-950/90 text-rose-900 dark:text-rose-100 border-rose-200 dark:border-rose-800'
              : 'bg-emerald-50/95 dark:bg-emerald-950/90 text-emerald-900 dark:text-emerald-100 border-emerald-200 dark:border-emerald-800'
          }`}>
            {toastMessage.type === 'error' ? (
              <ShieldAlert className="text-rose-600 dark:text-rose-400 shrink-0" size={20} />
            ) : (
              <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0" size={20} />
            )}
            <span className="text-sm font-medium">{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlackList;
