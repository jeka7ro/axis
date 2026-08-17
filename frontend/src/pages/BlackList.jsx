import { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Trash, ShieldAlert, UserX, Building2, User } from 'lucide-react';
import useAuthStore from '../store/authStore';

const BlackList = () => {
  const { user } = useAuthStore();
  
  const [blacklist, setBlacklist] = useState([
    {
      id: 1,
      client_name: "Dino Home Construct SRL",
      cui_cnp: "RO9876543",
      type: "PJ",
      reason: "Datorii > 90 zile & suspiciune subînchiriere flotă.",
      added_date: "2026-07-10",
      added_by: "Admin Axis",
      severity: "Critic"
    },
    {
      id: 2,
      client_name: "Popescu Ion",
      cui_cnp: "1850101011234",
      type: "PF",
      reason: "Părăsire țară neautorizată (fără permis).",
      added_date: "2026-08-01",
      added_by: "Sistem AI (Automat)",
      severity: "Mediu"
    }
  ]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(blacklist.map(s => s.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  if (user?.role === 'Dealer Sales') {
    return <div className="p-8 text-center text-red-500 font-bold">Acces Interzis. Doar Management Axis.</div>;
  }

  const isAllSelected = blacklist.length > 0 && selectedIds.length === blacklist.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> Axis Black List (PF / PJ)
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Clienți cu interdicții și risc major. Statusul "Black List" blochează ofertarea și alertează GPS-ul.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-full hover:bg-red-700 transition-colors shadow-sm font-medium"
        >
          <UserX size={18} /> Adaugă Client
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Bulk Actions Header */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center transition-all bg-gray-50/50 dark:bg-gray-800/50 min-h-[64px] justify-between`}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Caută în Black List după CUI, CNP sau Nume..." 
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-primary focus:border-primary dark:text-white shadow-sm"
            />
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-200">
              <span className="text-sm font-medium text-gray-500 bg-white dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600">
                {selectedIds.length} selectate
              </span>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-full hover:bg-green-100 transition-colors">
                <CheckSquare size={16} /> Bulk Iertare (Scoate din Listă)
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-full hover:bg-red-100 transition-colors">
                <Trash size={16} /> Bulk Delete
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-900/50 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th scope="col" className="px-6 py-4 w-12">
                  <input type="checkbox" onChange={handleSelectAll} checked={isAllSelected} className="w-4 h-4 rounded border-gray-300 text-primary" />
                </th>
                <th scope="col" className="px-4 py-4 w-16">Nr.</th>
                <th scope="col" className="px-6 py-4">Client (PF/PJ)</th>
                <th scope="col" className="px-6 py-4">Motiv Interdicție</th>
                <th scope="col" className="px-6 py-4">Severitate</th>
                <th scope="col" className="px-6 py-4">Adăugat de</th>
                <th scope="col" className="px-6 py-4 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {blacklist.map((item, idx) => (
                <tr key={item.id} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50 transition-colors ${selectedIds.includes(item.id) ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => handleSelectRow(item.id)} className="w-4 h-4 rounded border-gray-300 text-primary" />
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-400">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      {item.type === 'PJ' ? <Building2 size={14} className="text-gray-400"/> : <User size={14} className="text-gray-400"/>}
                      {item.client_name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">CUI/CNP: {item.cui_cnp}</div>
                  </td>
                  <td className="px-6 py-4 text-red-600 dark:text-red-400 font-medium">{item.reason}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${item.severity === 'Critic' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {item.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">{item.added_by}</div>
                    <div className="text-xs text-gray-500">{item.added_date}</div>
                  </td>
                  <td className="px-6 py-4 flex items-center justify-end gap-2">
                    <button className="p-2 flex items-center justify-center text-gray-500 hover:text-primary border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                      <Edit2 size={18} strokeWidth={1.5} />
                    </button>
                    <button className="p-2 flex items-center justify-center text-gray-500 hover:text-green-600 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 transition-all" title="Scoate de pe listă (Iertare)">
                      <Trash2 size={18} strokeWidth={1.5} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-md w-full p-8 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <UserX className="text-red-500"/> Adaugă în Black List
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Caută Client (Nume/CUI)</label>
                <input type="text" placeholder="Scrie Nume sau CUI..." className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Motiv / Abatere</label>
                <textarea rows="3" className="block w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white" placeholder="Descrie motivul interdicției..."></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Grad de Severitate</label>
                <select className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white">
                  <option>Critic (Blocare Totală Sistem)</option>
                  <option>Mediu (Necesită Aprobare Specială)</option>
                </select>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  Anulare
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors shadow-sm">
                  Confirmă Adăugarea
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlackList;
