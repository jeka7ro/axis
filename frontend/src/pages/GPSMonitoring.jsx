import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { AlertTriangle, MapPin, Activity, CheckCircle, Navigation, Search, CheckSquare, Trash, Edit2, Trash2, ChevronLeft, ChevronRight, Car, Maximize, Minimize } from 'lucide-react';
import { fetchLiveLocations, fetchGPSAlerts } from '../services/apiGps';

// Fix leafet default icon issue in React
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const GPSMonitoring = () => {
  const [locations, setLocations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Table State
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const loadData = async () => {
      try {
        const locs = await fetchLiveLocations();
        const alrts = await fetchGPSAlerts();
        
        setLocations(locs);
        setAlerts(alrts);
      } catch (error) {
        console.error("Failed to fetch GPS data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  // Table Logic
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(paginatedLocations.map(c => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const totalItems = locations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLocations = locations.slice(startIndex, startIndex + itemsPerPage);
  const isAllSelected = paginatedLocations.length > 0 && selectedIds.length === paginatedLocations.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Monitorizare GPS & AI</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Urmărire flotă în timp real, detecție pattern-uri de risc și gestionare vehicule.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Alerts Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden h-[450px]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity size={18} className="text-primary" /> Alerte Inteligente
            </h3>
            <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 py-1 px-2 rounded-full text-xs font-bold">
              {alerts.length} Noi
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <p className="text-sm text-gray-500">Se încarcă...</p>
            ) : alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle size={32} className="mx-auto text-green-500 mb-2" />
                Nicio alertă activă. Flota funcționează normal.
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="text-red-500 mt-0.5 shrink-0" size={18} />
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-red-800 dark:text-red-400 text-sm">{alert.vehicle_plate}</h4>
                        <span className="text-[10px] text-red-500 font-medium">{new Date(alert.created_at).toLocaleTimeString('ro-RO')}</span>
                      </div>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">{alert.message}</p>
                      
                      {alert.ai_recommendation && (
                        <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-red-100 dark:border-red-800/50 shadow-sm">
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span> Măsură AI
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{alert.ai_recommendation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className={isFullScreen ? "fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col" : "lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col relative z-0 h-[450px]"}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <MapPin size={18} className="text-primary" /> Hartă Live Flotă (Sync: Mobile Software)
            </h3>
            <div className="flex items-center gap-4">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Actualizat Acum
              </div>
              <button 
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={isFullScreen ? "Închide Full Screen" : "Full Screen"}
              >
                {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
          </div>
          <div className="flex-1 w-full relative z-0 overflow-hidden rounded-b-3xl">
            {!loading && locations.length > 0 && (
              <MapContainer 
                center={[45.9, 24.8]} 
                zoom={6} 
                className="w-full h-full z-0"
                style={{ borderRadius: '0 0 1.5rem 1.5rem' }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {locations.map(loc => (
                  <Marker key={loc.id} position={[loc.latitude, loc.longitude]}>
                    <Popup>
                      <div className="font-sans">
                        <h4 className="font-bold text-sm mb-1">{loc.vehicle_plate}</h4>
                        <div className="text-xs text-gray-600 mb-2">{loc.location_name}</div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="flex items-center gap-1">
                            <Navigation size={12} className={loc.engine_on ? "text-green-500" : "text-gray-400"} />
                            {loc.speed_kmh} km/h
                          </span>
                          <span className={`px-2 py-0.5 rounded-full ${loc.engine_on ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            Motor {loc.engine_on ? 'Pornit' : 'Oprit'}
                          </span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            )}
          </div>
        </div>
      </div>

      {/* Vehicule si Setari Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Caută vehicul (nr. înmatriculare)..." 
              className="w-full pl-12 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full focus:ring-primary focus:border-primary dark:text-white shadow-sm"
            />
          </div>
          
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
              <span className="text-sm font-medium text-gray-500 mr-2">{selectedIds.length} selectate</span>
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
                <th scope="col" className="px-6 py-4">Număr Înmatriculare</th>
                <th scope="col" className="px-6 py-4">Status Motor</th>
                <th scope="col" className="px-6 py-4">Viteză (km/h)</th>
                <th scope="col" className="px-6 py-4">Locație Curentă</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center py-12">Se încarcă vehiculele...</td></tr>
              ) : paginatedLocations.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-12">Nu există vehicule monitorizate.</td></tr>
              ) : (
                paginatedLocations.map((loc, idx) => (
                  <tr 
                    key={loc.id} 
                    className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700/50 transition-colors ${selectedIds.includes(loc.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-white dark:bg-gray-800'}`}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(loc.id)}
                        onChange={() => handleSelectRow(loc.id)}
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-400">{startIndex + idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                      {loc.vehicle_plate}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-2 font-medium ${loc.engine_on ? 'text-green-600' : 'text-gray-500'}`}>
                        <div className={`w-2 h-2 rounded-full ${loc.engine_on ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        {loc.engine_on ? 'Pornit' : 'Oprit'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{loc.speed_kmh}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{loc.location_name || 'Necunoscută'}</td>
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
            <span className="font-medium">Total Vehicule: {totalItems}</span>
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

    </div>
  );
};

export default GPSMonitoring;
