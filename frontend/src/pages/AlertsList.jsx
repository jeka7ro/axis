import { useState, useEffect } from 'react';
import { Bell, Search, Eye, Trash2, ChevronLeft, ChevronRight, CheckSquare, Trash, CheckCircle } from 'lucide-react';
import { fetchGPSAlerts, markAlertsAsRead, deleteAlerts } from '../services/apiGps';

const AlertsList = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Table state
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  const loadAlerts = async () => {
    try {
      const data = await fetchGPSAlerts();
      setAlerts(data);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(currentData.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkRead = async () => {
    if (selectedIds.length === 0) return;
    try {
      await markAlertsAsRead(selectedIds);
      setSelectedIds([]);
      loadAlerts();
    } catch (error) {
      console.error(error);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Sunteți sigur că doriți să ștergeți cele ${selectedIds.length} alerte selectate?`)) return;
    try {
      await deleteAlerts(selectedIds);
      setSelectedIds([]);
      loadAlerts();
    } catch (error) {
      console.error(error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markAlertsAsRead([id]);
      loadAlerts();
    } catch (error) {
      console.error(error);
    }
  };

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = alerts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(alerts.length / itemsPerPage);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="text-primary" size={24} /> 
            Istoric Alerte
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gestionează alertele sistemului AI și monitorizarea GPS.
          </p>
        </div>
      </div>

      {/* Bulk Actions Panel */}
      {selectedIds.length > 0 && (
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-2xl p-3 flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2 text-primary font-medium">
            <CheckSquare size={18} />
            <span>{selectedIds.length} selectate</span>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBulkRead}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-primary border border-primary/20 hover:bg-primary/10 rounded-xl transition-colors font-medium text-sm"
            >
              <CheckCircle size={16} /> Marchează Citite
            </button>
            <button 
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-xl transition-colors font-medium text-sm"
            >
              <Trash size={16} /> Șterge Selectate
            </button>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 w-12">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    onChange={handleSelectAll}
                    checked={selectedIds.length === currentData.length && currentData.length > 0}
                  />
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-16">
                  Nr. Crt.
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-32">
                  Dată / Oră
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-32">
                  Vehicul
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-40">
                  Tip Alertă
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                  Mesaj
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase text-right w-24">
                  Acțiuni
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-500">Se încarcă...</td></tr>
              ) : currentData.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-gray-500">Nu a fost găsită nicio alertă.</td></tr>
              ) : (
                currentData.map((alert, index) => (
                  <tr key={alert.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors group">
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        checked={selectedIds.includes(alert.id)}
                        onChange={() => handleSelectOne(alert.id)}
                      />
                    </td>
                    <td className={`p-4 text-sm text-gray-500 ${!alert.is_read ? 'font-bold text-gray-900 dark:text-white' : ''}`}>
                      #{indexOfFirstItem + index + 1}
                    </td>
                    <td className={`p-4 text-sm ${!alert.is_read ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                      {new Date(alert.created_at).toLocaleString('ro-RO')}
                    </td>
                    <td className={`p-4 text-sm ${!alert.is_read ? 'font-bold text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'}`}>
                      {alert.vehicle_plate}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${!alert.is_read ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' : 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'}`}>
                        {alert.alert_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className={`text-sm ${!alert.is_read ? 'font-bold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                        {alert.message}
                      </div>
                      {alert.ai_recommendation && (
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                          <span className="shrink-0 text-primary mt-0.5">↳ AI:</span>
                          <span>{alert.ai_recommendation}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!alert.is_read && (
                          <button 
                            onClick={() => handleMarkAsRead(alert.id)}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-500 hover:text-green-600 transition-colors"
                            title="Marchează citit"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setSelectedIds([alert.id]);
                            // Set a timeout to let state update, then call delete directly or rely on the bulk delete button
                            // Better yet, just call delete directly here for single action:
                            if(window.confirm('Stergi alerta?')) {
                               deleteAlerts([alert.id]).then(() => {
                                   setSelectedIds(selectedIds.filter(id => id !== alert.id));
                                   loadAlerts();
                               });
                            }
                          }}
                          className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600 transition-colors"
                          title="Șterge alertă"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="font-medium text-gray-900 dark:text-white">Total: {alerts.length}</span>
            <div className="flex items-center gap-2">
              <span>Afișează</span>
              <select 
                className="border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-sm focus:ring-primary focus:border-primary px-2 py-1"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
              <span>rezultate</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 mr-2">
              Pagina {currentPage} din {totalPages || 1}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertsList;
