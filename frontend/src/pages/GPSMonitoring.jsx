import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { 
  AlertTriangle, MapPin, Activity, CheckCircle, Navigation, Search, 
  Trash, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Car, Maximize, Minimize,
  ShieldAlert, Send, PhoneCall, Gauge, Check, MessageSquare, Mail
} from 'lucide-react';
import { fetchLiveLocations, fetchGPSAlerts, dispatchWhatsAppAlert } from '../services/apiGps';
import { dispatchAlertEmail } from '../services/api';

// Fix leaflet default icon issue in React
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

// Custom Pulsating Red Marker for High-Risk Watchlist
const createHighRiskIcon = () => {
  return L.divIcon({
    className: 'custom-high-risk-marker',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 32px; height: 32px; border-radius: 9999px; background-color: #ef4444; opacity: 0.65; animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="position: relative; width: 26px; height: 26px; border-radius: 9999px; background-color: #dc2626; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; color: #ffffff;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

// Component to handle map resize and programmatic panning
function MapController({ isFullScreen, targetCenter }) {
  const map = useMap();
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timeout);
  }, [isFullScreen, map]);

  useEffect(() => {
    if (targetCenter) {
      map.flyTo(targetCenter, 15, { duration: 1.5 });
    }
  }, [targetCenter, map]);
  
  return null;
}

const GPSMonitoring = () => {
  const [locations, setLocations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState([]);
  const [targetCenter, setTargetCenter] = useState(null);
  const [fleetFilter, setFleetFilter] = useState('ALL'); // 'ALL' | 'LT' | 'ST' | 'WATCHLIST'
  const [searchQuery, setSearchQuery] = useState('');
  const [whatsappFeedback, setWhatsappFeedback] = useState({}); // { [id]: string }
  const [emailFeedback, setEmailFeedback] = useState({}); // { [id]: string }

  // Table State
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadData = async () => {
    try {
      const activeFilter = fleetFilter === 'WATCHLIST' ? 'ALL' : fleetFilter;
      const [locs, alrts] = await Promise.all([
        fetchLiveLocations(activeFilter),
        fetchGPSAlerts()
      ]);
      setLocations(locs);
      setAlerts(alrts);
    } catch (error) {
      console.error("Failed to fetch GPS data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, [fleetFilter]);

  const toggleAlert = (id) => {
    setExpandedAlerts(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSendWhatsAppAlert = async (alertId, plate) => {
    try {
      setWhatsappFeedback(prev => ({ ...prev, [alertId]: 'sending' }));
      await dispatchWhatsAppAlert(alertId);
      setWhatsappFeedback(prev => ({ ...prev, [alertId]: 'success' }));
      setTimeout(() => {
        setWhatsappFeedback(prev => {
          const next = { ...prev };
          delete next[alertId];
          return next;
        });
      }, 4000);
    } catch (err) {
      console.error("Failed to dispatch WhatsApp alert:", err);
      setWhatsappFeedback(prev => ({ ...prev, [alertId]: 'error' }));
    }
  };

  const handleSendEmailAlert = async (alertId, plate) => {
    try {
      setEmailFeedback(prev => ({ ...prev, [alertId]: 'sending' }));
      await dispatchAlertEmail(alertId);
      setEmailFeedback(prev => ({ ...prev, [alertId]: 'success' }));
      setTimeout(() => {
        setEmailFeedback(prev => {
          const next = { ...prev };
          delete next[alertId];
          return next;
        });
      }, 4000);
    } catch (err) {
      console.error("Failed to dispatch Email alert:", err);
      setEmailFeedback(prev => ({ ...prev, [alertId]: 'error' }));
    }
  };

  // Filtered locations
  const filteredLocations = locations.filter(loc => {
    if (fleetFilter === 'WATCHLIST' && !loc.is_high_risk) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      loc.vehicle_plate?.toLowerCase().includes(q) ||
      loc.location_name?.toLowerCase().includes(q) ||
      loc.vehicle_make_model?.toLowerCase().includes(q)
    );
  });

  // Table Logic
  const totalItems = filteredLocations.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLocations = filteredLocations.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(paginatedLocations.map(c => c.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const isAllSelected = paginatedLocations.length > 0 && selectedIds.length === paginatedLocations.length;

  return (
    <div className="space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="text-gray-700 dark:text-gray-300" /> Monitorizare Flotă GPS, Telemetrie AI & Graniță
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Audit kilometraj live pe contracte, supraveghere specială Watchlist și alerte automate multi-canal (Platformă + WhatsApp).
          </p>
        </div>

        {/* Fleet Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setFleetFilter('ALL'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-full border transition-colors ${
              fleetFilter === 'ALL' 
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent font-semibold shadow-xs' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            Toată Flota
          </button>
          <button
            type="button"
            onClick={() => { setFleetFilter('LT'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-full border transition-colors ${
              fleetFilter === 'LT' 
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent font-semibold shadow-xs' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            LT - Leasing Operațional
          </button>
          <button
            type="button"
            onClick={() => { setFleetFilter('ST'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-full border transition-colors ${
              fleetFilter === 'ST' 
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent font-semibold shadow-xs' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            ST - Rent a Car
          </button>
          <button
            type="button"
            onClick={() => { setFleetFilter('WATCHLIST'); setCurrentPage(1); }}
            className={`px-3.5 py-1.5 rounded-full border transition-colors flex items-center gap-1.5 ${
              fleetFilter === 'WATCHLIST' 
                ? 'bg-red-600 text-white border-transparent font-semibold shadow-xs' 
                : 'bg-white dark:bg-gray-800 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/60 hover:bg-red-50'
            }`}
          >
            <ShieldAlert size={14} />
            Watchlist Risc ({locations.filter(l => l.is_high_risk).length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Alerts & Emergency WhatsApp Dispatch Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden h-[480px]">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
            <h3 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Activity size={16} className="text-gray-700 dark:text-gray-300" /> Alerte Telemetrie & Graniță
            </h3>
            <span className="bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 py-0.5 px-2 rounded-full text-xs font-bold">
              {alerts.length} Active
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <p className="text-xs text-gray-500">Se încarcă alertele...</p>
            ) : alerts.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-xs">
                <CheckCircle size={28} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                Nicio alertă activă. Flota respectă perimetrele autorizate.
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700/80 rounded-2xl overflow-hidden text-xs">
                  {/* Accordion Header */}
                  <div 
                    onClick={() => toggleAlert(alert.id)}
                    className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-gray-100/70 dark:hover:bg-gray-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className={alert.alert_type === 'UNAUTHORIZED_EXIT' || alert.alert_type === 'DEBT_BORDER_RISK' ? "text-red-500 shrink-0" : "text-amber-500 shrink-0"} size={16} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 dark:text-white text-xs">{alert.vehicle_plate}</h4>
                          {(alert.alert_type === 'UNAUTHORIZED_EXIT' || alert.alert_type === 'DEBT_BORDER_RISK') && (
                            <span className="px-1.5 py-0.2 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 rounded text-[9px] font-bold">
                              Graniță
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-500 font-medium">{new Date(alert.created_at).toLocaleTimeString('ro-RO')}</span>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      {expandedAlerts.includes(alert.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                  
                  {/* Accordion Body */}
                  {expandedAlerts.includes(alert.id) && (
                    <div className="px-3.5 pb-3.5 border-t border-gray-200 dark:border-gray-700/60 pt-2.5 space-y-2.5">
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{alert.message}</p>
                      
                      {alert.ai_recommendation && (
                        <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                            Recomandare Dispecerat Securitate AI
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{alert.ai_recommendation}</p>
                        </div>
                      )}

                      {/* Multi-Channel Emergency Dispatch Buttons (WhatsApp & Brevo Email) */}
                      <div className="pt-1.5 space-y-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppAlert(alert.id, alert.vehicle_plate)}
                          disabled={whatsappFeedback[alert.id] === 'sending'}
                          className={`w-full py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer ${
                            whatsappFeedback[alert.id] === 'success'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                          }`}
                        >
                          {whatsappFeedback[alert.id] === 'success' ? (
                            <>
                              <Check size={13} /> Alertă expediată pe grupul WhatsApp!
                            </>
                          ) : (
                            <>
                              <MessageSquare size={13} /> Notifică Grupul WhatsApp Dispecerat
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendEmailAlert(alert.id, alert.vehicle_plate)}
                          disabled={emailFeedback[alert.id] === 'sending'}
                          className={`w-full py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs cursor-pointer ${
                            emailFeedback[alert.id] === 'success'
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                          }`}
                        >
                          {emailFeedback[alert.id] === 'success' ? (
                            <>
                              <Check size={13} /> Email expediat prin Brevo v3!
                            </>
                          ) : (
                            <>
                              <Mail size={13} /> Trimite Email Notificare (Brevo API v3)
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className={isFullScreen ? "fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col" : "lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col relative z-0 h-[480px]"}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
            <h3 className="font-semibold text-xs text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <MapPin size={16} className="text-gray-700 dark:text-gray-300" /> Poziționare Live Flotă & Telemetrie
            </h3>
            <div className="flex items-center gap-3">
              <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Feed Hardware Live (TrackGPS)</span>
              </div>
              <button 
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                title={isFullScreen ? "Închide Ecran Complet" : "Ecran Complet"}
              >
                {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
          </div>
          <div className="flex-1 w-full relative z-0 overflow-hidden rounded-b-3xl">
            {!loading && filteredLocations.length > 0 && (
              <MapContainer 
                center={[45.9, 24.8]} 
                zoom={6} 
                className="w-full h-full z-0"
                style={{ borderRadius: '0 0 1.5rem 1.5rem' }}
                scrollWheelZoom={isFullScreen}
              >
                <MapController isFullScreen={isFullScreen} targetCenter={targetCenter} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filteredLocations.map(loc => {
                  const markerIcon = loc.is_high_risk ? createHighRiskIcon() : DefaultIcon;

                  return (
                    <Marker 
                      key={loc.id} 
                      position={[loc.latitude, loc.longitude]}
                      icon={markerIcon}
                    >
                      <Popup>
                        <div className="font-sans text-xs space-y-2 p-1 max-w-[260px]">
                          {/* High risk banner */}
                          {loc.is_high_risk && (
                            <div className="px-2 py-1 bg-red-600 text-white font-bold rounded-lg text-[10px] flex items-center gap-1">
                              <ShieldAlert size={12} /> SUPRAVEGHERE SPECIALĂ (WATCHLIST)
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2 border-b pb-1.5">
                            <div>
                              <h4 className="font-bold text-sm text-gray-900">{loc.vehicle_plate}</h4>
                              <div className="text-[10px] text-gray-500">{loc.vehicle_make_model}</div>
                            </div>
                            <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-semibold text-gray-800">
                              {loc.fleet_type || 'LT'}
                            </span>
                          </div>

                          <div className="text-gray-700 font-medium flex items-center gap-1.5"><MapPin size={13} className="text-gray-500 shrink-0" /> {loc.location_name}</div>
                          
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t text-gray-600">
                            <span className="flex items-center gap-1">
                              <Navigation size={12} className={loc.engine_on ? "text-emerald-500" : "text-gray-400"} />
                              {loc.speed_kmh} km/h
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${loc.engine_on ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'}`}>
                              {loc.engine_on ? 'Motor Pornit' : 'Staționare'}
                            </span>
                          </div>

                          {/* Live rental mileage audit on marker popup */}
                          <div className="p-2 bg-gray-50 rounded-lg text-[10px] space-y-1 border border-gray-200">
                            <div className="flex justify-between text-gray-500">
                              <span>Km Live (GPS):</span>
                              <span className="font-bold text-gray-900">{loc.mileage?.toLocaleString('ro-RO')} km</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>Distanță pe Contract:</span>
                              <span className="font-semibold text-blue-600">{loc.current_rental_km_used?.toLocaleString('ro-RO')} km</span>
                            </div>
                            <div className="flex justify-between pt-0.5 font-bold text-emerald-700">
                              <span>Status Plafon:</span>
                              <span>{loc.over_km_status}</span>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            )}
          </div>
        </div>
      </div>

      {/* Vehicule si Setari Table (Tahoe Style) */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-900 min-h-[64px]">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Caută vehicul după număr de înmatriculare sau locație..." 
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-11 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full text-xs focus:ring-1 focus:ring-gray-400 focus:outline-none dark:text-white shadow-xs"
            />
          </div>
          
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                {selectedIds.length} selectate
              </span>
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
                <th scope="col" className="px-6 py-3.5">Număr Înmatriculare & Risc</th>
                <th scope="col" className="px-6 py-3.5">Regim Flotă</th>
                <th scope="col" className="px-6 py-3.5">Status Motor</th>
                <th scope="col" className="px-6 py-3.5">Audit Km Parcurși</th>
                <th scope="col" className="px-6 py-3.5">Locație Curentă</th>
                <th scope="col" className="px-6 py-3.5 text-right">Acțiuni Hartă</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {loading ? (
                <tr><td colSpan="8" className="text-center py-12 text-sm text-gray-500">Se încarcă vehiculele...</td></tr>
              ) : paginatedLocations.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-12 text-sm text-gray-500">Nu există vehicule monitorizate conform filtrului selectat.</td></tr>
              ) : (
                paginatedLocations.map((loc, idx) => (
                  <tr 
                    key={loc.id} 
                    className={`hover:bg-gray-50/70 dark:hover:bg-gray-800/60 transition-colors ${
                      loc.is_high_risk ? 'bg-red-50/30 dark:bg-red-950/15' : ''
                    } ${selectedIds.includes(loc.id) ? 'bg-gray-50 dark:bg-gray-800/80 font-medium' : 'bg-white dark:bg-gray-800'}`}
                  >
                    <td className="px-5 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(loc.id)}
                        onChange={() => handleSelectRow(loc.id)}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-400 font-medium">{startIndex + idx + 1}</td>
                    
                    {/* Nr Înmatriculare & Watchlist */}
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {loc.vehicle_plate}
                        {loc.is_high_risk && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1">
                            <ShieldAlert size={11} /> Watchlist
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400">{loc.vehicle_make_model}</div>
                    </td>

                    {/* Regim */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        (loc.fleet_type || 'LT') === 'LT'
                          ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                      }`}>
                        {loc.fleet_type || 'LT'} ({loc.fleet_type === 'ST' ? 'Rent' : 'Leasing'})
                      </span>
                    </td>

                    {/* Status Motor */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`flex items-center gap-2 font-medium text-xs ${loc.engine_on ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                        <div className={`w-2 h-2 rounded-full ${loc.engine_on ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                        {loc.engine_on ? `${loc.speed_kmh} km/h (În Mișcare)` : 'Motor Oprit'}
                      </span>
                    </td>

                    {/* Audit Km Parcurși */}
                    <td className="px-6 py-4 text-xs whitespace-nowrap">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        {loc.current_rental_km_used?.toLocaleString('ro-RO')} km parcurși
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium">{loc.over_km_status}</div>
                    </td>

                    {/* Locație Curentă */}
                    <td className="px-6 py-4 text-xs text-gray-700 dark:text-gray-300 font-medium">
                      {loc.location_name || 'Transmisie Live'}
                    </td>

                    {/* Acțiuni */}
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button 
                        onClick={() => {
                          setTargetCenter([loc.latitude, loc.longitude]);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
                        title="Localizează pe hartă"
                      >
                        <MapPin size={14} /> Zoom
                      </button>
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
            <span className="font-semibold text-gray-700 dark:text-gray-300">Total Vehicule: {totalItems}</span>
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

    </div>
  );
};

export default GPSMonitoring;
