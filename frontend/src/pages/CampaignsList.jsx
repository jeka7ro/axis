import { useState, useEffect } from 'react';
import { Plus, Search, CheckSquare, Trash, Edit2, Eye, Megaphone, Percent, X } from 'lucide-react';
import useAuthStore from '../store/authStore';

const CampaignsList = () => {
  const { user } = useAuthStore();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  // Table state
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    interest_rate: '',
    max_duration: '60 luni',
    status: 'Activ'
  });

  useEffect(() => {
    // Mock data fetching
    setTimeout(() => {
      setCampaigns([
        { id: 1, name: 'Dobândă 0% Black Friday', interest_rate: '0.00%', max_duration: '36 luni', status: 'Activ', created_at: new Date().toISOString() },
        { id: 2, name: 'Fleet Renewal 2026', interest_rate: '2.50%', max_duration: '60 luni', status: 'Inactiv', created_at: new Date().toISOString() }
      ]);
      setLoading(false);
    }, 500);
  }, []);

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
        name: campaign.name,
        interest_rate: campaign.interest_rate.replace('%', ''),
        max_duration: campaign.max_duration,
        status: campaign.status
      });
    } else {
      setEditingCampaign(null);
      setFormData({
        name: '',
        interest_rate: '',
        max_duration: '60 luni',
        status: 'Activ'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCampaign(null);
  };

  const handleSaveCampaign = (e) => {
    e.preventDefault();
    if (editingCampaign) {
      setCampaigns(campaigns.map(c => c.id === editingCampaign.id ? { 
        ...c, 
        name: formData.name, 
        interest_rate: formData.interest_rate.includes('%') ? formData.interest_rate : formData.interest_rate + '%',
        max_duration: formData.max_duration,
        status: formData.status
      } : c));
    } else {
      const newCamp = {
        id: Math.max(0, ...campaigns.map(c => c.id)) + 1,
        name: formData.name,
        interest_rate: formData.interest_rate.includes('%') ? formData.interest_rate : formData.interest_rate + '%',
        max_duration: formData.max_duration,
        status: formData.status,
        created_at: new Date().toISOString()
      };
      setCampaigns([...campaigns, newCamp]);
    }
    handleCloseModal();
  };

  const handleDelete = (id) => {
    if (window.confirm("Sigur dorești să ștergi această campanie?")) {
      setCampaigns(campaigns.filter(c => c.id !== id));
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Sigur dorești să ștergi ${selectedIds.length} campanii selectate?`)) {
      setCampaigns(campaigns.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
    }
  };

  // Pagination logic
  const totalItems = campaigns.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCampaigns = campaigns.slice(startIndex, startIndex + itemsPerPage);
  const isAllSelected = paginatedCampaigns.length > 0 && selectedIds.length === paginatedCampaigns.length;

  if (user?.role === 'Dealer Sales') {
    return <div className="p-8 text-center text-red-500 font-medium">Acces Interzis. Doar pentru Axis Manager.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Megaphone className="text-primary" /> Campanii Finanțare
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configurează campaniile cu dobânzi subvenționate pentru dealeri.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus size={18} />
          <span className="font-medium">Campanie Nouă</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        
        {/* Bulk Actions Header */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center transition-all bg-gray-50/50 dark:bg-gray-800/50 min-h-[64px] ${selectedIds.length > 0 ? 'justify-between' : 'justify-end'}`}>
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-200">
              <span className="text-sm font-medium text-gray-500 bg-white dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600">
                {selectedIds.length} selectate
              </span>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50 transition-colors">
                <CheckSquare size={16} /> Bulk Edit
              </button>
              <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 transition-colors">
                <Trash size={16} /> Bulk Delete
              </button>
            </div>
          ) : (
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Caută campanie..." 
                className="w-full pl-12 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-primary focus:border-primary dark:text-white shadow-sm"
              />
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
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                  />
                </th>
                <th scope="col" className="px-4 py-4 w-16">Nr. Crt.</th>
                <th scope="col" className="px-6 py-4">Nume Campanie</th>
                <th scope="col" className="px-6 py-4">Dobândă</th>
                <th scope="col" className="px-6 py-4">Durată Max</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-12">Se încarcă...</td></tr>
              ) : paginatedCampaigns.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-12">Nu există campanii configurate.</td></tr>
              ) : (
                paginatedCampaigns.map((camp, idx) => (
                  <tr 
                    key={camp.id} 
                    className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50 transition-colors ${selectedIds.includes(camp.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800'}`}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(camp.id)}
                        onChange={() => handleSelectRow(camp.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-400">{startIndex + idx + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {camp.name}
                    </td>
                    <td className="px-6 py-4 font-semibold text-primary flex items-center gap-1">
                      <Percent size={14} /> {camp.interest_rate}
                    </td>
                    <td className="px-6 py-4">{camp.max_duration}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border
                        ${camp.status === 'Activ' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/50' : 
                        'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                        {camp.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(camp)}
                        className="p-2 flex items-center justify-center text-gray-500 hover:text-blue-500 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        title="Editare"
                      >
                        <Edit2 size={18} strokeWidth={1.5} />
                      </button>
                      <button 
                        onClick={() => handleDelete(camp.id)}
                        className="p-2 flex items-center justify-center text-gray-500 hover:text-red-500 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                        title="Ștergere"
                      >
                        <Trash size={18} strokeWidth={1.5} />
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
                {'<'}
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-full border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {'>'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingCampaign ? 'Editare Campanie' : 'Campanie Nouă'}
              </h3>
              <button onClick={handleCloseModal} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSaveCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nume Campanie</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
                  placeholder="ex. Promoție Primăvară"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dobândă (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={formData.interest_rate}
                    onChange={e => setFormData({...formData, interest_rate: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Durată Maximă</label>
                  <select 
                    value={formData.max_duration}
                    onChange={e => setFormData({...formData, max_duration: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
                  >
                    <option value="12 luni">12 luni</option>
                    <option value="24 luni">24 luni</option>
                    <option value="36 luni">36 luni</option>
                    <option value="48 luni">48 luni</option>
                    <option value="60 luni">60 luni</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-primary focus:border-primary dark:bg-gray-700 dark:text-white"
                >
                  <option value="Activ">Activ</option>
                  <option value="Inactiv">Inactiv</option>
                </select>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button" 
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Anulare
                </button>
                <button 
                  type="submit" 
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
                >
                  {editingCampaign ? 'Salvează' : 'Adaugă'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsList;
