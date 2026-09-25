import { useState, useEffect } from 'react';
import { Plus, Search, CheckSquare, Trash, Edit2, Megaphone, Percent, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { fetchCampaigns, createCampaign, updateCampaign, deleteCampaign } from '../services/apiCampaigns';

const CampaignsList = () => {
  const { user } = useAuthStore();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Table state
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, isBulk: false });
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    dealer_name: 'Toți Dealerii Autorizați',
    discounted_interest_rate: 3.9,
    standard_interest_rate: 5.9,
    min_advance_percent: 15.0,
    max_period_months: 60,
    subsidized_by: 'Axis Mobility & Rețeaua Parteneri',
    description: '',
    is_active: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchCampaigns();
      setCampaigns(data);
    } catch (err) {
      console.error("Eroare la încărcarea campaniilor:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCampaigns = campaigns.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.dealer_name?.toLowerCase().includes(q) ||
      c.subsidized_by?.toLowerCase().includes(q)
    );
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedCampaigns.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleOpenModal = (campaign = null) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({
        name: campaign.name || '',
        dealer_name: campaign.dealer_name || 'Toți Dealerii Autorizați',
        discounted_interest_rate: campaign.discounted_interest_rate || 3.9,
        standard_interest_rate: campaign.standard_interest_rate || 5.9,
        min_advance_percent: campaign.min_advance_percent || 15.0,
        max_period_months: campaign.max_period_months || 60,
        subsidized_by: campaign.subsidized_by || 'Axis Mobility & Rețeaua Parteneri',
        description: campaign.description || '',
        is_active: campaign.is_active !== undefined ? campaign.is_active : true
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        name: '',
        dealer_name: 'Toți Dealerii Autorizați',
        discounted_interest_rate: 3.9,
        standard_interest_rate: 5.9,
        min_advance_percent: 15.0,
        max_period_months: 60,
        subsidized_by: 'Axis Mobility & Rețeaua Parteneri',
        description: '',
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCampaign(null);
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        discounted_interest_rate: Number(formData.discounted_interest_rate),
        standard_interest_rate: Number(formData.standard_interest_rate),
        min_advance_percent: Number(formData.min_advance_percent),
        max_period_months: Number(formData.max_period_months)
      };

      if (editingCampaign) {
        await updateCampaign(editingCampaign.id, payload);
      } else {
        await createCampaign(payload);
      }
      handleCloseModal();
      loadData();
    } catch (err) {
      console.error("Eroare la salvarea campaniei:", err);
      alert("Eroare la salvarea campaniei.");
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id, isBulk: false });
  };

  const handleBulkDelete = () => {
    setDeleteConfirm({ isOpen: true, id: null, isBulk: true });
  };

  const confirmDelete = async () => {
    try {
      if (deleteConfirm.isBulk) {
        for (const id of selectedIds) {
          await deleteCampaign(id);
        }
        setSelectedIds([]);
      } else if (deleteConfirm.id) {
        await deleteCampaign(deleteConfirm.id);
        setSelectedIds(prev => prev.filter(item => item !== deleteConfirm.id));
      }
      setDeleteConfirm({ isOpen: false, id: null, isBulk: false });
      loadData();
    } catch (err) {
      console.error("Eroare la ștergere:", err);
      alert("Eroare la ștergerea campaniei.");
    }
  };

  // Pagination logic
  const totalItems = filteredCampaigns.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, startIndex + itemsPerPage);
  const isAllSelected = paginatedCampaigns.length > 0 && selectedIds.length === paginatedCampaigns.length;

  if (user?.role === 'Dealer Sales') {
    return (
      <div className="p-8 text-center text-gray-700 dark:text-gray-300 font-medium">
        Secțiune rezervată pentru managementul central Axis. Campaniile active sunt disponibile automat în configuratorul de oferte.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in relative text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="text-gray-700 dark:text-gray-300" /> Campanii Finanțare & Dobânzi Subvenționate
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configurează campaniile promoționale de dobândă subvenționată pentru rețeaua de dealeri și leasing operațional.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-5 py-2.5 rounded-full hover:bg-gray-800 dark:hover:bg-white transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span className="font-medium text-sm">Campanie Nouă</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        
        {/* Bulk Actions Header */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center transition-all bg-gray-50 dark:bg-gray-900 min-h-[64px] ${selectedIds.length > 0 ? 'justify-between' : 'justify-end'}`}>
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-200">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                {selectedIds.length} selectate
              </span>
              <button 
                onClick={handleBulkDelete} 
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Trash size={14} /> Bulk Delete
              </button>
            </div>
          ) : (
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Caută după denumire, partener sau dealer..." 
                className="w-full pl-11 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full text-xs focus:ring-1 focus:ring-gray-400 focus:outline-none dark:text-white shadow-xs"
              />
            </div>
          )}
        </div>

        {/* Table Content */}
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
                <th scope="col" className="px-6 py-3.5">Campanie & Finanțator</th>
                <th scope="col" className="px-6 py-3.5">Dealer / Canal</th>
                <th scope="col" className="px-6 py-3.5">Dobândă Promo</th>
                <th scope="col" className="px-6 py-3.5">Condiții</th>
                <th scope="col" className="px-6 py-3.5">Status</th>
                <th scope="col" className="px-6 py-3.5 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-12 text-sm text-gray-500">Se încarcă campaniile...</td></tr>
              ) : paginatedCampaigns.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-12 text-sm text-gray-500">Nu există campanii configurate.</td></tr>
              ) : (
                paginatedCampaigns.map((camp, idx) => (
                  <tr 
                    key={camp.id} 
                    className={`hover:bg-gray-50/70 dark:hover:bg-gray-800/60 transition-colors ${selectedIds.includes(camp.id) ? 'bg-gray-50 dark:bg-gray-800/80 font-medium' : 'bg-white dark:bg-gray-800'}`}
                  >
                    <td className="px-5 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(camp.id)}
                        onChange={() => handleSelectRow(camp.id)}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400 font-medium">{startIndex + idx + 1}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{camp.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{camp.subsidized_by || 'Axis Mobility'}</div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-700 dark:text-gray-300">
                      {camp.dealer_name || 'Toți Dealerii'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-white">
                        <span>{camp.discounted_interest_rate}%</span>
                        <span className="text-[10px] text-gray-400 line-through">({camp.standard_interest_rate || 5.9}%)</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Economie -{(Number(camp.standard_interest_rate || 5.9) - Number(camp.discounted_interest_rate)).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                      <div>Avans min: {camp.min_advance_percent}%</div>
                      <div>Max: {camp.max_period_months} luni</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        camp.is_active 
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700'
                      }`}>
                        {camp.is_active ? 'Activ' : 'Inactiv'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenModal(camp)}
                          className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                          title="Editează campania"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          onClick={() => handleDelete(camp.id)}
                          className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors"
                          title="Șterge campania"
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

      {/* Modal Adăugare / Editare */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {editingCampaign ? 'Editare Campanie Promoțională' : 'Campanie Promoțională Nouă'}
              </h3>
              <button onClick={handleCloseModal} className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Denumire Campanie</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="ex. Promoție Primăvară Autoklass 3.9%"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Dealer / Rețea Eligibilă</label>
                  <input 
                    type="text" 
                    value={formData.dealer_name}
                    onChange={e => setFormData({...formData, dealer_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="ex. Toți sau Autoklass"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Subvenționat De</label>
                  <input 
                    type="text" 
                    value={formData.subsidized_by}
                    onChange={e => setFormData({...formData, subsidized_by: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="ex. Dealer Partner Exclusive"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Dobândă Promoțională (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    required
                    value={formData.discounted_interest_rate}
                    onChange={e => setFormData({...formData, discounted_interest_rate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold dark:bg-gray-700 dark:text-white"
                    placeholder="3.9"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Dobândă Standard Bază (%)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    required
                    value={formData.standard_interest_rate}
                    onChange={e => setFormData({...formData, standard_interest_rate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                    placeholder="5.9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Avans Minim (%)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.min_advance_percent}
                    onChange={e => setFormData({...formData, min_advance_percent: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Perioadă Maximă (luni)</label>
                  <select 
                    value={formData.max_period_months}
                    onChange={e => setFormData({...formData, max_period_months: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm dark:bg-gray-700 dark:text-white"
                  >
                    <option value="12">12 luni</option>
                    <option value="24">24 luni</option>
                    <option value="36">36 luni</option>
                    <option value="48">48 luni</option>
                    <option value="60">60 luni</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Descriere & Condiții Speciale</label>
                <textarea 
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 dark:text-white"
                  placeholder="Detalii suplimentare pentru dealer și ofertare..."
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox"
                  id="camp_is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                />
                <label htmlFor="camp_is_active" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Campanie activă (vizibilă în configuratorul de oferte)
                </label>
              </div>
              
              <div className="pt-3 flex gap-3">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-semibold"
                >
                  Anulare
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-xs font-semibold"
                >
                  {editingCampaign ? 'Salvează Modificările' : 'Creează Campania'}
                </button>
              </div>
            </form>
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
                  ? `Ești sigur că vrei să ștergi cele ${selectedIds.length} campanii selectate?` 
                  : "Ești sigur că vrei să ștergi această campanie promoțională?"}
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
                onClick={confirmDelete}
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

export default CampaignsList;
