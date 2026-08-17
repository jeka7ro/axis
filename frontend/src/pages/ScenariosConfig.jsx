import { useState } from 'react';
import { Plus, Edit2, Trash2, ShieldAlert, CheckSquare, Search, Trash, Cpu } from 'lucide-react';
import useAuthStore from '../store/authStore';

const ScenariosConfig = () => {
  const { user } = useAuthStore();
  const [scenarios, setScenarios] = useState([
    {
      id: 1,
      name: "Ieșire din Țară Neautorizată (Risc Mare)",
      condition_gps: "Trecere Graniță (Ieșire RO)",
      condition_crm_contract: "Oricare",
      condition_crm_finance: "Are Datorii > 0",
      condition_crm_permissions: "Fără Permis de Ieșire",
      action_type: "Alertă Critică",
      status: "Activ",
    },
    {
      id: 2,
      name: "Logare Ieșiri din Țară (Curat)",
      condition_gps: "Trecere Graniță (Ieșire RO)",
      condition_crm_contract: "Oricare",
      condition_crm_finance: "Fără Datorii",
      condition_crm_permissions: "Are Permis de Ieșire",
      action_type: "Logare Istoric (Tăcut)",
      status: "Activ",
    },
    {
      id: 3,
      name: "Staționare Client BlackList",
      condition_gps: "Staționare > 12h",
      condition_crm_contract: "Oricare",
      condition_crm_finance: "BlackList Activ",
      condition_crm_permissions: "Oricare",
      action_type: "Alertă Critică",
      status: "Inactiv",
    }
  ]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(scenarios.map(s => s.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  if (user?.role === 'Dealer Sales') {
    return <div className="p-8 text-center text-red-500 font-bold">Acces Interzis. Doar Axis Manager.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Cpu className="text-primary" /> Motor Scenarii AI & GPS
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configurează regulile de alertare combinând datele GPS (Mobile Software) cu datele CRM Axis.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-full hover:bg-primary/90 transition-colors shadow-sm font-medium"
        >
          <Plus size={18} /> Scenariu Nou
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        {/* Bulk Actions Header */}
        <div className={`p-4 border-b border-gray-200 dark:border-gray-700 flex items-center transition-all bg-gray-50/50 dark:bg-gray-800/50 min-h-[64px] justify-between`}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Caută scenariu..." 
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-primary focus:border-primary dark:text-white shadow-sm"
            />
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-200">
              <span className="text-sm font-medium text-gray-500 bg-white dark:bg-gray-700 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-600">
                {selectedIds.length} selectate
              </span>
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
                  <input type="checkbox" onChange={handleSelectAll} checked={selectedIds.length === scenarios.length && scenarios.length > 0} className="w-4 h-4 rounded border-gray-300 text-primary" />
                </th>
                <th scope="col" className="px-4 py-4 w-16">ID</th>
                <th scope="col" className="px-6 py-4">Nume Scenariu</th>
                <th scope="col" className="px-6 py-4">Trigger GPS (Mobile SW)</th>
                <th scope="col" className="px-6 py-4">Condiții CRM (Axis)</th>
                <th scope="col" className="px-6 py-4">Acțiune Platformă</th>
                <th scope="col" className="px-6 py-4 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario) => (
                <tr key={scenario.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50 transition-colors">
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={selectedIds.includes(scenario.id)} onChange={() => handleSelectRow(scenario.id)} className="w-4 h-4 rounded border-gray-300 text-primary" />
                  </td>
                  <td className="px-4 py-4 font-medium text-gray-400">{scenario.id}</td>
                  <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                    {scenario.name}
                    <span className={`ml-2 px-2 py-0.5 text-[10px] rounded-full font-medium border ${scenario.status === 'Activ' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {scenario.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-primary font-medium">{scenario.condition_gps}</td>
                  <td className="px-6 py-4 space-y-1">
                    <div className="text-xs text-gray-600 dark:text-gray-400">Financiar: <span className="font-semibold text-gray-900 dark:text-gray-300">{scenario.condition_crm_finance}</span></div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Permis Ieșire: <span className="font-semibold text-gray-900 dark:text-gray-300">{scenario.condition_crm_permissions}</span></div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${scenario.action_type === 'Alertă Critică' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                      {scenario.action_type === 'Alertă Critică' ? <ShieldAlert size={14}/> : <CheckSquare size={14}/>}
                      {scenario.action_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 flex items-center justify-end gap-2">
                    <button className="p-2 flex items-center justify-center text-gray-500 hover:text-primary border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                      <Edit2 size={18} strokeWidth={1.5} />
                    </button>
                    <button className="p-2 flex items-center justify-center text-gray-500 hover:text-red-500 border border-gray-300 dark:border-gray-600 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
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
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl max-w-2xl w-full p-8 border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Constructor Scenariu Nou</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1 mb-1">Nume Scenariu (Ex: Risc Ieșire Țară)</label>
                <input type="text" className="block w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl dark:text-white" />
              </div>
              
              <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                <h4 className="font-bold text-sm text-blue-800 dark:text-blue-400 mb-3 flex items-center gap-2"><MapPin size={16}/> Condiție GPS (Mobile Software)</h4>
                <select className="block w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl dark:text-white">
                  <option>Trecere Graniță (Ieșire România)</option>
                  <option>Trecere Graniță (Intrare România)</option>
                  <option>Staționare Suspectă (Peste 12h)</option>
                  <option>Depășire Viteză (Peste 130km/h)</option>
                </select>
              </div>

              <div className="p-4 bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-2xl">
                <h4 className="font-bold text-sm text-green-800 dark:text-green-400 mb-3 flex items-center gap-2"><CheckSquare size={16}/> Filtre Contractuale (Axis CRM)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Datorii Actuale</label>
                    <select className="block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white text-sm">
                      <option>Oricare</option>
                      <option>Fără Datorii (0)</option>
                      <option>Are Datorii ({'>'} 0)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Permis Ieșire Țară</label>
                    <select className="block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white text-sm">
                      <option>Oricare</option>
                      <option>Are Permis Activat</option>
                      <option>Nu Are Permis (Interzis)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Status Black List</label>
                    <select className="block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white text-sm">
                      <option>Oricare</option>
                      <option>Nu este pe BlackList</option>
                      <option>ESTE pe BlackList (Pericol)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tip Contract</label>
                    <select className="block w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg dark:text-white text-sm">
                      <option>Oricare (ST & LT)</option>
                      <option>Doar Short Term (ST)</option>
                      <option>Doar Long Term (LT)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl">
                <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Cpu size={16}/> Acțiune Generată (Decizia Platformei)</h4>
                <select className="block w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl dark:text-white font-medium">
                  <option>Generează Alertă Critică (Notificare Pop-up & Roșu)</option>
                  <option>Generează Alertă Medie (Portocaliu)</option>
                  <option>Doar Logare în Istoric (Tăcut / Fără Notificare)</option>
                </select>
              </div>

              <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  Anulare
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary/90 transition-colors shadow-sm">
                  Salvează Scenariul
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenariosConfig;
