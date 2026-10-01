import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Trash2, ChevronLeft, ChevronRight, Edit2, Search, Download, X, Eye, 
  ShieldAlert, ShieldCheck, Wrench, Calendar, Camera, Gauge, AlertCircle, 
  PlusCircle, Check, Image as ImageIcon, Navigation, Fuel, Cog, Car,
  LayoutGrid, List, SlidersHorizontal, ArrowUpDown, RefreshCw, Zap,
  CheckCircle2, Sparkles, Award, ExternalLink, Filter, Clock, Phone, Info
} from 'lucide-react';
import { 
  fetchVehicles, createVehicle, deleteVehicle, updateVehicle, 
  fetchVehicleBrands, toggleVehicleWatchlist, addVehicleServiceRecord 
} from '../services/api';
import VehicleReservationModal from '../components/VehicleReservationModal';


const VehiclesList = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Layout & View Mode (Showroom Autoklass vs Tabel Detaliat)
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Fullscreen Photo Lightbox State
  const [lightboxData, setLightboxData] = useState(null); // { vehicle, images, activeIdx }

  // Quick Card Image Flipping State { [vehicleId]: activeIdx }
  const [cardImageIndices, setCardImageIndices] = useState({});

  // Vehicle Reservation Modal State
  const [reservationModalVehicle, setReservationModalVehicle] = useState(null);

  const handleReservationUpdated = (updatedVehicle) => {
    setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));
    if (activeVehicle && activeVehicle.id === updatedVehicle.id) {
      setActiveVehicle(updatedVehicle);
    }
    setReservationModalVehicle(updatedVehicle);
  };

  // Keyboard navigation for photo lightbox (ESC, Left Arrow, Right Arrow)
  useEffect(() => {
    if (!lightboxData) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxData(null);
      } else if (e.key === 'ArrowLeft') {
        if (lightboxData.images.length > 1) {
          setLightboxData(prev => ({
            ...prev,
            activeIdx: (prev.activeIdx - 1 + prev.images.length) % prev.images.length
          }));
        }
      } else if (e.key === 'ArrowRight') {
        if (lightboxData.images.length > 1) {
          setLightboxData(prev => ({
            ...prev,
            activeIdx: (prev.activeIdx + 1) % prev.images.length
          }));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxData]);

  // Autoklass-inspired Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [fleetFilter, setFleetFilter] = useState('ALL'); // 'ALL' | 'LT' | 'ST' | 'WATCHLIST'
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // 'ALL' | 'autoturism' | 'suv' | 'sport' | 'electric'
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [fuelFilter, setFuelFilter] = useState('ALL');
  const [transmissionFilter, setTransmissionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'price_asc' | 'price_desc' | 'mileage_asc' | 'year_desc'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Virtual Library / Details Modal State
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState('gallery'); // 'gallery' | 'specs' | 'service' | 'mileage'
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Service Record Form State inside Details Modal
  const [showAddService, setShowAddService] = useState(false);
  const [serviceFormData, setServiceFormData] = useState({
    service_type: 'Revizie Ulei & Filtre',
    mileage: '',
    cost: '',
    provider: 'Service Partener Autoklass / Axis',
    notes: ''
  });

  const [formData, setFormData] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    license_plate: '',
    status: 'Disponibil',
    fleet_type: 'LT',
    mileage: 0,
    engine_type: 'Diesel',
    transmission: 'Automată',
    color: '',
    rental_price_short_term: 0,
    rental_price_long_term: 0,
    purchase_price: 0,
    damage_notes: '',
    is_high_risk: false
  });

  // Table & Pagination state
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12); // 12 for clean 3-col grid or table

  const loadData = async () => {
    setLoading(true);
    try {
      const [vehiclesRes, brandsRes] = await Promise.allSettled([
        fetchVehicles(),
        fetchVehicleBrands()
      ]);
      
      if (vehiclesRes.status === 'fulfilled') {
        setVehicles(vehiclesRes.value);
        if (activeVehicle) {
          const updatedActive = vehiclesRes.value.find(v => v.id === activeVehicle.id);
          if (updatedActive) setActiveVehicle(updatedActive);
        }
      }

      if (brandsRes.status === 'fulfilled') {
        setBrands(brandsRes.value);
      }
    } catch (error) {
      console.error("Error loading vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFormData({
      make: '', model: '', year: new Date().getFullYear(), vin: '', license_plate: '',
      status: 'Disponibil', fleet_type: 'LT', mileage: 0, engine_type: 'Diesel', transmission: 'Automată',
      color: '', rental_price_short_term: 0, rental_price_long_term: 0, purchase_price: 0, damage_notes: '', is_high_risk: false
    });
    setEditingId(null);
    setErrorMessage('');
  };

  const handleEdit = (vehicle) => {
    setFormData({ 
      ...vehicle,
      fleet_type: vehicle.fleet_type || 'LT',
      rental_price_short_term: Number(vehicle.rental_price_short_term || 0).toFixed(2),
      rental_price_long_term: Number(vehicle.rental_price_long_term || 0).toFixed(2),
      purchase_price: Number(vehicle.purchase_price || 0).toFixed(2),
      damage_notes: vehicle.damage_notes || '',
      is_high_risk: Boolean(vehicle.is_high_risk)
    });
    setEditingId(vehicle.id);
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const handleOpenDetails = (vehicle, initialTab = 'specs') => {
    navigate(`/vehicles/${vehicle.id}?tab=${initialTab}`);
  };

  const handleToggleWatchlist = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const updated = await toggleVehicleWatchlist(id);
      setVehicles(prev => prev.map(v => v.id === id ? updated : v));
      if (activeVehicle && activeVehicle.id === id) {
        setActiveVehicle(updated);
      }
    } catch (err) {
      console.error("Failed to toggle watchlist:", err);
    }
  };

  const handleAddServiceSubmit = async (e) => {
    e.preventDefault();
    if (!activeVehicle) return;
    try {
      const payload = {
        service_type: serviceFormData.service_type,
        mileage: Number(serviceFormData.mileage) || activeVehicle.mileage,
        cost: Number(serviceFormData.cost) || 0,
        provider: serviceFormData.provider,
        notes: serviceFormData.notes
      };
      const updated = await addVehicleServiceRecord(activeVehicle.id, payload);
      setActiveVehicle(updated);
      setVehicles(prev => prev.map(v => v.id === updated.id ? updated : v));
      setShowAddService(false);
    } catch (err) {
      console.error("Failed to add service record:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const parseLocalFloat = (val) => {
        if (!val) return 0;
        if (typeof val === 'number') return val;
        return parseFloat(val.toString().replace(',', '.'));
      };

      const payload = {
        ...formData,
        rental_price_short_term: parseLocalFloat(formData.rental_price_short_term),
        rental_price_long_term: parseLocalFloat(formData.rental_price_long_term),
        purchase_price: parseLocalFloat(formData.purchase_price)
      };

      if (editingId) {
        await updateVehicle(editingId, payload);
      } else {
        await createVehicle(payload);
      }
      setIsModalOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error(error);
      setErrorMessage(editingId ? 'Eroare la actualizarea mașinii. Verifică datele introduse.' : 'Eroare la adăugarea mașinii. Verifică datele introduse.');
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Sigur doriți să ștergeți acest autoturism?')) {
      try {
        await deleteVehicle(id);
        loadData();
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Helper parsing JSON safely
  const parseJsonSafe = (str, fallback = {}) => {
    if (!str) return fallback;
    try {
      return typeof str === 'string' ? JSON.parse(str) : str;
    } catch {
      return fallback;
    }
  };

  // Curated vehicle images fallback (Always ensures multiple high-res photos)
  const getVehicleImages = (vehicle) => {
    const list = parseJsonSafe(vehicle?.images, []);
    const m = (vehicle?.model || '').toLowerCase();
    const brand = (vehicle?.make || '').toLowerCase();

    let fallbacks = [];
    if (m.includes('g-class') || m.includes('g63')) {
      fallbacks = [
        'https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?auto=format&fit=crop&w=1600&q=85'
      ];
    } else if (m.includes('s-class') || m.includes('7 series') || m.includes('a8')) {
      fallbacks = [
        'https://images.unsplash.com/photo-1555353540-64580b51c258?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=85'
      ];
    } else if (m.includes('gle') || m.includes('glc') || m.includes('x5') || m.includes('x7') || m.includes('q7') || m.includes('q8') || m.includes('cayenne') || m.includes('range rover')) {
      fallbacks = [
        'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1600&q=85'
      ];
    } else if (m.includes('taycan') || m.includes('e-tron') || m.includes('panamera') || m.includes('m4')) {
      fallbacks = [
        'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1600&q=85'
      ];
    } else {
      fallbacks = [
        'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1600&q=85',
        'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1600&q=85'
      ];
    }

    if (Array.isArray(list) && list.length > 0) {
      const merged = [...list];
      for (const f of fallbacks) {
        if (!merged.includes(f)) merged.push(f);
      }
      return merged;
    }
    return fallbacks;
  };

  // Helper parsing vehicle specs
  const getVehicleSpecs = (vehicle) => {
    const raw = parseJsonSafe(vehicle?.specs, {});
    const model = vehicle?.model || '';
    const make = vehicle?.make || '';
    return {
      engine_power_hp: raw.engine_power_hp || (model.includes('AMG') ? 585 : model.includes('M4') ? 510 : model.includes('RS') ? 600 : model.includes('S500') ? 435 : 280),
      displacement_cc: raw.displacement_cc || 2999,
      fuel_consumption_mixed: raw.fuel_consumption_mixed || '7.8 l/100km',
      transmission_gears: raw.transmission_gears || vehicle?.transmission || '9G-Tronic Automată',
      drivetrain: raw.drivetrain || (make === 'Mercedes-Benz' ? '4MATIC Permanent' : make === 'BMW' ? 'xDrive AWD' : make === 'Audi' ? 'quattro Permanent' : 'AWD 4x4'),
      body_type: raw.body_type || 'SUV / Limuzină Premium'
    };
  };

  // Service alert helper
  const getServiceStatus = (vehicle) => {
    const mileage = vehicle.mileage || 0;
    const lastKm = vehicle.last_service_km || 0;
    const interval = vehicle.service_interval_km || 15000;
    const nextServiceKm = lastKm + interval;
    const kmUntilService = nextServiceKm - mileage;

    if (kmUntilService <= 0) {
      return { status: 'OVERDUE', label: `Revizie Depășită (${Math.abs(kmUntilService)} km)`, color: 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-800' };
    } else if (kmUntilService <= 1500) {
      return { status: 'WARNING', label: `Revizie în ${kmUntilService} km`, color: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800' };
    } else {
      return { status: 'OK', label: `Revizie în ${kmUntilService} km`, color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800' };
    }
  };

  // Autoklass-inspired Filtering and Sorting Logic
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      // 1. Operational Regime / Watchlist filter
      if (fleetFilter === 'WATCHLIST') {
        if (!v.is_high_risk) return false;
      } else if (fleetFilter !== 'ALL') {
        const vFleet = v.fleet_type || 'LT';
        if (vFleet !== fleetFilter) return false;
      }

      // 2. Autoklass Category filter
      if (categoryFilter !== 'ALL') {
        const modelLower = (v.model || '').toLowerCase();
        const makeLower = (v.make || '').toLowerCase();
        const specsObj = parseJsonSafe(v.specs, {});
        const bodyLower = (specsObj.body_type || '').toLowerCase();
        const engineLower = (v.engine_type || '').toLowerCase();

        if (categoryFilter === 'autoturism') {
          const isSuv = modelLower.includes('g-class') || modelLower.includes('gle') || modelLower.includes('glc') || modelLower.includes('glb') || modelLower.includes('gla') || modelLower.includes('q7') || modelLower.includes('q8') || modelLower.includes('x5') || modelLower.includes('x7') || modelLower.includes('cayenne') || modelLower.includes('macan') || modelLower.includes('range rover') || bodyLower.includes('suv');
          const isVan = modelLower.includes('v-class') || modelLower.includes('vito') || modelLower.includes('sprinter');
          if (isSuv || isVan) return false;
        } else if (categoryFilter === 'suv') {
          const isSuv = modelLower.includes('g-class') || modelLower.includes('gle') || modelLower.includes('glc') || modelLower.includes('glb') || modelLower.includes('gla') || modelLower.includes('q7') || modelLower.includes('q8') || modelLower.includes('x5') || modelLower.includes('x7') || modelLower.includes('cayenne') || modelLower.includes('macan') || modelLower.includes('range rover') || bodyLower.includes('suv');
          if (!isSuv) return false;
        } else if (categoryFilter === 'sport') {
          const isSport = modelLower.includes('amg') || modelLower.includes('m4') || modelLower.includes('m50') || modelLower.includes('rs') || makeLower.includes('porsche') || (specsObj.engine_power_hp && specsObj.engine_power_hp >= 400);
          if (!isSport) return false;
        } else if (categoryFilter === 'electric') {
          const isElectric = engineLower.includes('electric') || engineLower.includes('hybrid') || engineLower.includes('phev') || modelLower.includes('eq') || modelLower.includes('e-tron') || modelLower.includes('taycan') || modelLower.includes('750e') || modelLower.includes('350de');
          if (!isElectric) return false;
        }
      }

      // 3. Brand Filter
      if (brandFilter !== 'ALL' && v.make !== brandFilter) {
        return false;
      }

      // 4. Fuel Filter
      if (fuelFilter !== 'ALL') {
        const eng = (v.engine_type || '').toLowerCase();
        if (fuelFilter === 'Diesel' && !eng.includes('diesel')) return false;
        if (fuelFilter === 'Benzină' && !eng.includes('benzin') && !eng.includes('petrol')) return false;
        if (fuelFilter === 'Hybrid' && !eng.includes('hybrid') && !eng.includes('phev')) return false;
        if (fuelFilter === 'Electric' && !eng.includes('electric')) return false;
      }

      // 5. Transmission Filter
      if (transmissionFilter !== 'ALL') {
        const tr = (v.transmission || '').toLowerCase();
        if (transmissionFilter === 'Automată' && !tr.includes('auto') && !tr.includes('pdk') && !tr.includes('tronic')) return false;
        if (transmissionFilter === 'Manuală' && !tr.includes('manu')) return false;
      }

      // 6. Status Filter
      if (statusFilter !== 'ALL' && v.status !== statusFilter) {
        return false;
      }

      // 7. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches = (
          (v.make && v.make.toLowerCase().includes(q)) ||
          (v.model && v.model.toLowerCase().includes(q)) ||
          (v.license_plate && v.license_plate.toLowerCase().includes(q)) ||
          (v.vin && v.vin.toLowerCase().includes(q)) ||
          (v.status && v.status.toLowerCase().includes(q)) ||
          (v.color && v.color.toLowerCase().includes(q))
        );
        if (!matches) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price_asc') {
        return (a.rental_price_long_term || 0) - (b.rental_price_long_term || 0);
      }
      if (sortBy === 'price_desc') {
        return (b.rental_price_long_term || 0) - (a.rental_price_long_term || 0);
      }
      if (sortBy === 'mileage_asc') {
        return (a.mileage || 0) - (b.mileage || 0);
      }
      if (sortBy === 'year_desc') {
        return (b.year || 0) - (a.year || 0);
      }
      // default: watchlist first, then id
      if (a.is_high_risk && !b.is_high_risk) return -1;
      if (!a.is_high_risk && b.is_high_risk) return 1;
      return a.id - b.id;
    });
  }, [vehicles, fleetFilter, categoryFilter, brandFilter, fuelFilter, transmissionFilter, statusFilter, searchQuery, sortBy]);

  const totalItems = filteredVehicles.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVehicles = filteredVehicles.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(paginatedVehicles.map(v => v.id));
    else setSelectedIds([]);
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const isAllSelected = paginatedVehicles.length > 0 && selectedIds.length === paginatedVehicles.length;

  const exportToExcel = () => {
    const headers = ['Nr. Crt.', 'Marca', 'Model', 'An', 'Nr. Inmatriculare', 'VIN', 'Regim', 'Status', 'Kilometraj', 'Combustibil', 'Transmisie', 'Watchlist Risc', 'Pret/Zi (EUR)', 'Pret/Luna (EUR)', 'Pret Achizitie (EUR)'];
    const rows = filteredVehicles.map((v, i) => [
      i + 1,
      v.make,
      v.model,
      v.year,
      v.license_plate,
      v.vin,
      v.fleet_type || 'LT',
      v.status,
      v.mileage,
      v.engine_type,
      v.transmission,
      v.is_high_risk ? 'DA (Risc Sporit)' : 'Nu',
      v.rental_price_short_term,
      v.rental_price_long_term,
      v.purchase_price
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell || ''}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `flota_autoklass_axis_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isFiltersActive = searchQuery || categoryFilter !== 'ALL' || brandFilter !== 'ALL' || fuelFilter !== 'ALL' || transmissionFilter !== 'ALL' || statusFilter !== 'ALL' || sortBy !== 'default';

  const resetAllFilters = () => {
    setSearchQuery('');
    setCategoryFilter('ALL');
    setBrandFilter('ALL');
    setFuelFilter('ALL');
    setTransmissionFilter('ALL');
    setStatusFilter('ALL');
    setSortBy('default');
    setCurrentPage(1);
  };

  // Dynamic unique brands in fleet
  const fleetBrands = useMemo(() => {
    const set = new Set(vehicles.map(v => v.make).filter(Boolean));
    return Array.from(set).sort();
  }, [vehicles]);

  return (
    <div className="space-y-6 text-left">
      {/* ============================================================== */}
      {/* 1. AUTOKLASS SHOWROOM HEADER & KPI BAR                         */}
      {/* ============================================================== */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-gray-200/80 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
              <Car className="text-gray-900 dark:text-gray-100" size={26} />
              Flotă & Showroom Auto
            </h1>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700">
              <Award size={13} className="text-blue-600 dark:text-blue-400" />
              Standard Autoklass Official
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-3xl">
            Prezentare digitală a autovehiculelor din flotă conform standardelor showroom Autoklass. Rate lunare leasing operațional, valori de catalog, dosare tehnice WLTP și audit mentenanță.
          </p>
        </div>

        {/* Top Controls: View Switcher, CSV Export & Add Vehicle (Strict Uniform h-9 Height) */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap sm:flex-nowrap shrink-0">
          {/* View Mode Toggle (Mac OS Tahoe Style) */}
          <div className="h-9 bg-gray-100 dark:bg-gray-800/90 p-0.5 rounded-full border border-gray-200 dark:border-gray-700 flex items-center shadow-2xs shrink-0">
            <button
              type="button"
              onClick={() => { setViewMode('grid'); setItemsPerPage(12); setCurrentPage(1); }}
              className={`h-full flex items-center gap-1.5 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
              title="Afișare Showroom Autoklass (Grid)"
            >
              <LayoutGrid size={14} />
              <span>Showroom</span>
            </button>
            <button
              type="button"
              onClick={() => { setViewMode('table'); setItemsPerPage(25); setCurrentPage(1); }}
              className={`h-full flex items-center gap-1.5 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
              title="Afișare Tabel Detaliat (Tahoe)"
            >
              <List size={14} />
              <span>Tabel</span>
            </button>
          </div>

          <button 
            type="button"
            onClick={exportToExcel}
            className="h-9 flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 px-3.5 rounded-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-semibold shadow-2xs whitespace-nowrap shrink-0 cursor-pointer"
            title="Exportă inventarul flotei în format CSV"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
          
          <button 
            type="button"
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="h-9 bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-xs font-semibold shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <PlusCircle size={15} />
            <span>Adaugă în Flotă</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. FLEET METRIC KPI STRIP                                      */}
      {/* ============================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-2xs">
          <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Flotă</span>
            <Car size={16} className="text-gray-700 dark:text-gray-300" />
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{vehicles.length} Vehicule</div>
          <div className="text-[11px] text-gray-400 mt-0.5">Parc auto monitorizat</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-2xs">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Disponibile Imediat</span>
            <CheckCircle2 size={16} />
          </div>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
            {vehicles.filter(v => v.status === 'Disponibil').length} Mașini
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Pregătite pentru predare</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-2xs">
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Contracte Active</span>
            <Gauge size={16} />
          </div>
          <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
            {vehicles.filter(v => v.status === 'Închiriat' || (v.fleet_type === 'LT' && v.status !== 'Disponibil')).length} Vehicule
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Leasing & Rent în derulare</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 shadow-2xs">
          <div className="flex items-center justify-between text-red-600 dark:text-red-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Watchlist & Service</span>
            <ShieldAlert size={16} />
          </div>
          <div className="text-xl font-bold text-red-700 dark:text-red-300">
            {vehicles.filter(v => v.is_high_risk || v.status === 'În Service' || v.status === 'Daună').length} Unități
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Intervenții sau risc activ</div>
        </div>
      </div>

      {/* Consolidated Filter Strip - Single Clean Row (Zero Wasted Space) */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 text-xs no-scrollbar">
        <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
          {/* Group 1: Fleet Regimes */}
          <button
            type="button"
            onClick={() => { setFleetFilter('ALL'); setCurrentPage(1); }}
            className={`h-8 px-3 rounded-full border text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
              fleetFilter === 'ALL' 
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent shadow-xs' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            Toată Flota ({vehicles.length})
          </button>
          <button
            type="button"
            onClick={() => { setFleetFilter('LT'); setCurrentPage(1); }}
            className={`h-8 px-3 rounded-full border text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
              fleetFilter === 'LT' 
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent shadow-xs font-semibold' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            Leasing LT ({vehicles.filter(v => (v.fleet_type || 'LT') === 'LT').length})
          </button>
          <button
            type="button"
            onClick={() => { setFleetFilter('ST'); setCurrentPage(1); }}
            className={`h-8 px-3 rounded-full border text-xs font-medium whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
              fleetFilter === 'ST' 
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent shadow-xs font-semibold' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            Rent ST ({vehicles.filter(v => v.fleet_type === 'ST').length})
          </button>
          <button
            type="button"
            onClick={() => { setFleetFilter('WATCHLIST'); setCurrentPage(1); }}
            className={`h-8 px-3 rounded-full border text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer ${
              fleetFilter === 'WATCHLIST' 
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent shadow-xs font-semibold' 
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            <ShieldAlert size={13} className={fleetFilter === 'WATCHLIST' ? 'text-rose-400' : 'text-rose-500'} />
            <span>Watchlist ({vehicles.filter(v => v.is_high_risk).length})</span>
          </button>

          {/* Clean Vertical Divider */}
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 shrink-0 mx-1" />

          {/* Group 2: Vehicle Categories */}
          <button
            type="button"
            onClick={() => { setCategoryFilter('ALL'); setCurrentPage(1); }}
            className={`h-8 px-3 rounded-full border text-xs whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent font-semibold shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            Toate Tipurile
          </button>
          <button
            type="button"
            onClick={() => { setCategoryFilter('autoturism'); setCurrentPage(1); }}
            className={`h-8 px-3 rounded-full border text-xs whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              categoryFilter === 'autoturism'
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent font-semibold shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            Limuzine
          </button>
          <button
            type="button"
            onClick={() => { setCategoryFilter('suv'); setCurrentPage(1); }}
            className={`h-8 px-3 rounded-full border text-xs whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              categoryFilter === 'suv'
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent font-semibold shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            SUV & 4MATIC
          </button>
          <button
            type="button"
            onClick={() => { setCategoryFilter('sport'); setCurrentPage(1); }}
            className={`h-8 px-3 rounded-full border text-xs whitespace-nowrap transition-all shrink-0 cursor-pointer ${
              categoryFilter === 'sport'
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent font-semibold shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            AMG & Sport
          </button>
          <button
            type="button"
            onClick={() => { setCategoryFilter('electric'); setCurrentPage(1); }}
            className={`h-8 px-3 rounded-full border text-xs whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'electric'
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 border-transparent font-semibold shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            <Zap size={13} className="text-amber-500" />
            <span>Hibrid & EQ</span>
          </button>
        </div>

        {/* Right side: Advanced Filters button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`h-8 flex items-center gap-1.5 px-3 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
              showAdvancedFilters || isFiltersActive
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 shadow-xs'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Filtre Avansate</span>
            {isFiltersActive && (
              <span className="w-2 h-2 rounded-full bg-blue-500 ml-0.5"></span>
            )}
          </button>
          
          {isFiltersActive && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="h-8 px-2.5 rounded-full text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Resetează toate filtrele"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. AUTOKLASS SEARCH & MULTI-FILTER BAR                         */}
      {/* ============================================================== */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs space-y-3">
        {/* Main Search Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Caută după marcă, model, număr înmatriculare, serie șasiu (VIN)..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-11 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full text-xs focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:outline-none dark:text-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {/* Sort Dropdown */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={sortBy}
                onChange={e => { setSortBy(e.target.value); setCurrentPage(1); }}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full pl-3.5 pr-8 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 appearance-none focus:outline-none cursor-pointer"
              >
                <option value="default">Sortare: Implicită</option>
                <option value="price_asc">Rată leasing: Crescător</option>
                <option value="price_desc">Rată leasing: Descrescător</option>
                <option value="mileage_asc">Kilometraj: Cel mai mic</option>
                <option value="year_desc">An fabricație: Cel mai nou</option>
              </select>
              <ArrowUpDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="text-xs text-gray-500 font-semibold px-2 whitespace-nowrap">
              {filteredVehicles.length} {filteredVehicles.length === 1 ? 'vehicul' : 'vehicule'}
            </div>
          </div>
        </div>

        {/* Collapsible Advanced Filters (Autoklass style: Marca, Combustibil, Transmisie, Status) */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-in fade-in duration-200">
            {/* Brand Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Marcă</label>
              <select
                value={brandFilter}
                onChange={e => { setBrandFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-200 focus:outline-none"
              >
                <option value="ALL">Toate Mărcile</option>
                {fleetBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Fuel Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Combustibil</label>
              <select
                value={fuelFilter}
                onChange={e => { setFuelFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-200 focus:outline-none"
              >
                <option value="ALL">Toate Tipuri</option>
                <option value="Diesel">Diesel</option>
                <option value="Benzină">Benzină</option>
                <option value="Hybrid">Hibrid / PHEV</option>
                <option value="Electric">Electric</option>
              </select>
            </div>

            {/* Transmission Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Cutie Viteze</label>
              <select
                value={transmissionFilter}
                onChange={e => { setTransmissionFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-200 focus:outline-none"
              >
                <option value="ALL">Toate Transmisiile</option>
                <option value="Automată">Automată</option>
                <option value="Manuală">Manuală</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">Status Disponibilitate</label>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-200 focus:outline-none"
              >
                <option value="ALL">Toate Stările</option>
                <option value="Disponibil">Disponibil</option>
                <option value="Închiriat">Închiriat</option>
                <option value="Rezervat">Rezervat</option>
                <option value="În Service">În Service</option>
                <option value="Daună">Daună</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 5. VIEW MODE A: AUTOKLASS SHOWROOM GRID                        */}
      {/* ============================================================== */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-700">
              <div className="w-10 h-10 border-4 border-gray-300 border-t-gray-900 dark:border-gray-700 dark:border-t-white rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Se încarcă catalogul showroom Autoklass...</p>
            </div>
          ) : paginatedVehicles.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-16 text-center border border-gray-200 dark:border-gray-700">
              <Car size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Niciun autovehicul găsit</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                Nu există vehicule în flotă care să corespundă criteriilor și filtrelor selectate.
              </p>
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-4 px-4 py-2 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Resetează Filtrele
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedVehicles.map((vehicle) => {
                const images = getVehicleImages(vehicle);
                const specs = getVehicleSpecs(vehicle);
                const srv = getServiceStatus(vehicle);
                const currentCardIdx = cardImageIndices[vehicle.id] || 0;
                const activeCardImg = images[currentCardIdx] || images[0];

                return (
                  <div 
                    key={vehicle.id} 
                    className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700/80 overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col group"
                  >
                    {/* Visual Media Header */}
                    <div className="relative h-56 sm:h-60 overflow-hidden bg-gray-950 group/img">
                      <img 
                        src={activeCardImg} 
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out cursor-pointer"
                        onClick={() => setLightboxData({ vehicle, images, activeIdx: currentCardIdx })}
                      />

                      {/* On-Card Previous & Next Navigation Arrows (Mac OS Tahoe circular style) */}
                      {images.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCardImageIndices(prev => ({
                                ...prev,
                                [vehicle.id]: (currentCardIdx - 1 + images.length) % images.length
                              }));
                            }}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
                            title="Fotografia Anterioară"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCardImageIndices(prev => ({
                                ...prev,
                                [vehicle.id]: (currentCardIdx + 1) % images.length
                              }));
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
                            title="Fotografia Următoare"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </>
                      )}
                      
                      {/* Gradient overlay for badges readability */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none" />

                      {/* Top Badges Row: Unified luxury dark frosted-glass pills */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Availability status badge */}
                          <button
                            type="button"
                            onClick={(e) => {
                              if (vehicle.status === 'Rezervat') {
                                e.stopPropagation();
                                setReservationModalVehicle(vehicle);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-sm flex items-center gap-1.5 transition-all ${
                              vehicle.status === 'Rezervat' ? 'cursor-pointer hover:bg-black/80 hover:border-purple-400/50' : ''
                            }`}
                            title={vehicle.status === 'Rezervat' ? 'Click pentru detalii rezervare, contact beneficiar și deblocare' : vehicle.status}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              vehicle.status === 'Disponibil' ? 'bg-emerald-400' :
                              vehicle.status === 'Închiriat' ? 'bg-blue-400' :
                              vehicle.status === 'În Service' ? 'bg-amber-400' :
                              vehicle.status === 'Daună' ? 'bg-rose-400' :
                              vehicle.status === 'Rezervat' ? 'bg-purple-400 animate-pulse' : 'bg-gray-400'
                            }`} />
                            <span>{vehicle.status}</span>
                            {vehicle.status === 'Rezervat' && <Clock size={11} className="text-purple-300 ml-0.5" />}
                          </button>

                          {/* Watchlist Risk Alert Badge - Discreet elegant dark glass */}
                          {vehicle.is_high_risk && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 backdrop-blur-md text-white/90 border border-white/20 shadow-sm flex items-center gap-1.5">
                              <ShieldAlert size={12} className="text-rose-400 shrink-0" />
                              <span>Watchlist</span>
                            </span>
                          )}
                        </div>

                        {/* Fleet Regime Badge */}
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-black/60 backdrop-blur-md text-white/80 border border-white/20 shadow-sm">
                          {(vehicle.fleet_type || 'LT') === 'LT' ? 'LT • Leasing' : 'ST • Rent'}
                        </span>
                      </div>

                      {/* Bottom Media Overlay: License Plate + Photo Count */}
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 z-10">
                        {/* Romanian EU License Plate Mockup */}
                        <div 
                          onClick={() => handleOpenDetails(vehicle, 'documents')}
                          className="inline-flex items-center rounded-md border border-gray-900 bg-white text-gray-900 shadow-md overflow-hidden tracking-wider font-extrabold text-[11px] h-6 cursor-pointer hover:opacity-95 transition-opacity"
                          title="Deschide actele autoturismului"
                        >
                          <div className="bg-blue-700 text-white px-1.5 h-full flex flex-col items-center justify-center text-[7px] font-black leading-none">
                            <span>RO</span>
                          </div>
                          <span className="px-2 py-0.5 uppercase tracking-widest">{vehicle.license_plate}</span>
                        </div>

                        {/* Photo counter button */}
                        <button
                          type="button"
                          onClick={() => setLightboxData({ vehicle, images, activeIdx: currentCardIdx })}
                          className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold flex items-center gap-1.5 border border-white/20 hover:bg-black/80 transition-colors"
                          title="Deschide Galeria Foto Completă"
                        >
                          <Camera size={12} />
                          <span>{currentCardIdx + 1} / {images.length} foto</span>
                        </button>
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                      {/* Identity & Model */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                          <span>{vehicle.make}</span>
                          <span className="text-[10px] font-medium text-gray-400">An {vehicle.year}</span>
                        </div>
                        
                        <h3 
                          onClick={() => handleOpenDetails(vehicle, 'specs')}
                          className="text-lg font-black text-gray-900 dark:text-white mt-0.5 line-clamp-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title={`${vehicle.make} ${vehicle.model}`}
                        >
                          {vehicle.model}
                        </h3>

                        <div className="text-[11px] text-gray-400 mt-0.5 truncate tracking-wide">
                          VIN: {vehicle.vin}
                        </div>

                        {/* Reservation Strip for Reserved Vehicles in Showroom Card */}
                        {vehicle.status === 'Rezervat' && (() => {
                          const res = parseJsonSafe(vehicle.reservation_details, null);
                          return (
                            <div 
                              onClick={() => setReservationModalVehicle(vehicle)}
                              className="mt-2.5 bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl p-2.5 text-xs flex items-center justify-between gap-2 cursor-pointer hover:bg-purple-100/90 dark:hover:bg-purple-900/50 transition-colors shadow-2xs"
                              title="Deschide gestiune rezervare, contact și deblocare prematură"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-purple-900 dark:text-purple-200 truncate flex items-center gap-1.5 text-[11px]">
                                  <Clock size={12} className="text-purple-600 shrink-0 animate-pulse" />
                                  <span className="truncate">Rezervat: {res?.client_name || 'Client rezervat'}</span>
                                </div>
                                <div className="text-[10px] text-purple-600 dark:text-purple-400 truncate">
                                  {res?.reserved_until ? `Până la ${new Date(res.reserved_until).toLocaleDateString('ro-RO')}` : 'Rezervare activă'} • {res?.contact_person || 'Vezi contact'}
                                </div>
                              </div>
                              <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 bg-white dark:bg-purple-900/60 px-2 py-1 rounded-md border border-purple-200 dark:border-purple-700 shrink-0">
                                Contact & Deblocare
                              </span>
                            </div>
                          );
                        })()}
                      </div>


                      {/* Autoklass 4-Spec Quick Strip (2x2 Grid for spacious readability) */}
                      <div className="grid grid-cols-2 gap-2 pt-0.5 pb-0.5">
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-700 dark:text-gray-300">
                          <Fuel size={14} className="text-gray-400 shrink-0" />
                          <span className="truncate font-medium">{vehicle.engine_type || 'Diesel'}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-700 dark:text-gray-300">
                          <Zap size={14} className="text-amber-500 shrink-0" />
                          <span className="truncate font-bold">{specs.engine_power_hp} CP</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-700 dark:text-gray-300">
                          <Cog size={14} className="text-gray-400 shrink-0" />
                          <span className="truncate font-medium">{specs.transmission_gears?.split(' ')[0] || vehicle.transmission || 'Automată'}</span>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 text-[11px] text-gray-700 dark:text-gray-300">
                          <Navigation size={14} className="text-blue-500 shrink-0" />
                          <span className="truncate font-bold">{vehicle.mileage?.toLocaleString('ro-RO')} km</span>
                        </div>
                      </div>

                      {/* Secondary Drivetrain & Service Row */}
                      <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                        <div className="font-semibold text-gray-700 dark:text-gray-300 truncate mr-2">
                          {specs.drivetrain}
                        </div>
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${srv.color}`}>
                          <Wrench size={10} />
                          <span>{srv.label}</span>
                        </div>
                      </div>

                      {/* Dealership Pricing Strip - Clean & Balanced */}
                      <div className="pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                        <div>
                          <div className="flex items-baseline gap-1 whitespace-nowrap">
                            <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                              €{vehicle.rental_price_long_term ? Math.round(vehicle.rental_price_long_term).toLocaleString('ro-RO') : '850'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">/ lună</span>
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                            TVA inclus • deductibil
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                            €{vehicle.purchase_price ? Math.round(vehicle.purchase_price).toLocaleString('ro-RO') : '58.900'}
                          </div>
                          <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                            Catalog
                          </div>
                        </div>
                      </div>

                      {/* Card Action CTAs (Tahoe Style - Clean Round Buttons) */}
                      <div className="pt-2 flex items-center justify-between">
                        {/* Info & Dosar Button ("i") */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(vehicle, 'specs')}
                          className="w-9 h-9 shrink-0 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center justify-center shadow-xs cursor-pointer"
                          title="Informații Vehicul & Dosar Tehnic"
                        >
                          <Info size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setLightboxData({ vehicle, images, activeIdx: 0 })}
                          className="w-9 h-9 shrink-0 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors flex items-center justify-center"
                          title="Galerie Foto HD Ecran Complet"
                        >
                          <Camera size={14} />
                        </button>

                        {/* Reservation Action Button */}
                        <button
                          type="button"
                          onClick={() => setReservationModalVehicle(vehicle)}
                          className={`w-9 h-9 shrink-0 border rounded-full transition-colors flex items-center justify-center ${
                            vehicle.status === 'Rezervat'
                              ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                              : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-gray-800'
                          }`}
                          title={vehicle.status === 'Rezervat' ? 'Gestiune Rezervare & Deblocare Prematură' : 'Rezervă vehicul (PJ/PF)'}
                        >
                          <Clock size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleToggleWatchlist(vehicle.id, e)}
                          className={`w-9 h-9 shrink-0 border rounded-full transition-colors flex items-center justify-center ${
                            vehicle.is_high_risk 
                              ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100 dark:bg-red-950/60 dark:border-red-800' 
                              : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                          title={vehicle.is_high_risk ? "Scoate din Watchlist Risc" : "Adaugă în Watchlist (Risc Sporit)"}
                        >
                          <ShieldAlert size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(vehicle)}
                          className="w-9 h-9 shrink-0 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors flex items-center justify-center"
                          title="Editează Autoturism"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. VIEW MODE B: TABEL DETALIAT (TAHOE STYLE COMPLIANT)          */}
      {/* ============================================================== */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          {/* Bulk Selection Bar */}
          {selectedIds.length > 0 && (
            <div className="p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                  {selectedIds.length} vehicule selectate
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    if (confirm(`Sigur doriți să ștergeți cele ${selectedIds.length} vehicule selectate?`)) {
                      Promise.all(selectedIds.map(id => deleteVehicle(id))).then(() => {
                        setSelectedIds([]);
                        loadData();
                      });
                    }
                  }} 
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-full hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={14} /> Bulk Delete
                </button>
              </div>
            </div>
          )}

          {/* Main Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
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
                  <th className="px-5 py-3.5">Autovehicul & Bibliotecă</th>
                  <th className="px-5 py-3.5">Nr. Înmat. & Risc</th>
                  <th className="px-5 py-3.5">Regim</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Kilometraj & Motor</th>
                  <th className="px-5 py-3.5">Revizie & Service</th>
                  <th className="px-5 py-3.5">Preț/Lună</th>
                  <th className="px-5 py-3.5 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {loading ? (
                  <tr><td colSpan="10" className="text-center py-10 text-sm text-gray-500">Se încarcă datele flotei...</td></tr>
                ) : paginatedVehicles.length === 0 ? (
                  <tr><td colSpan="10" className="text-center py-10 text-sm text-gray-500">Nu există autoturisme în flotă conform filtrelor selectate.</td></tr>
                ) : (
                  paginatedVehicles.map((v, idx) => {
                    const srv = getServiceStatus(v);
                    const images = getVehicleImages(v);
                    const thumb = images.length > 0 ? images[0] : null;

                    return (
                      <tr 
                        key={v.id} 
                        className={`hover:bg-gray-50/70 dark:hover:bg-gray-800/60 transition-colors ${
                          v.is_high_risk ? 'bg-red-50/30 dark:bg-red-950/10' : ''
                        } ${selectedIds.includes(v.id) ? 'bg-gray-50 dark:bg-gray-800/80 font-medium' : 'bg-white dark:bg-gray-800'}`}
                      >
                        {/* Checkbox */}
                        <td className="px-5 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(v.id)}
                            onChange={() => handleSelectRow(v.id)}
                            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-700"
                          />
                        </td>

                        {/* Nr. Crt. */}
                        <td className="px-4 py-4 text-xs text-gray-400 font-medium">{startIndex + idx + 1}</td>

                        {/* Marcă & Model + Thumbnail */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            {thumb ? (
                              <img 
                                src={thumb} 
                                alt={v.model} 
                                className="w-12 h-9 object-cover rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setLightboxData({ vehicle: v, images: getVehicleImages(v), activeIdx: 0 })}
                              />
                            ) : (
                              <div 
                                onClick={() => handleOpenDetails(v, 'specs')}
                                className="w-12 h-9 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-gray-400 shrink-0 cursor-pointer"
                              >
                                <Car size={16} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div 
                                onClick={() => handleOpenDetails(v, 'specs')}
                                className="font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:underline text-xs" 
                                title={`${v.make} ${v.model}`}
                              >
                                {v.make}
                              </div>
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{v.model} ({v.year})</div>
                            </div>
                          </div>
                        </td>

                        {/* Nr Înmatriculare & Watchlist */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div 
                            onClick={() => handleOpenDetails(v, 'documents')}
                            className="font-bold text-gray-900 dark:text-white text-xs cursor-pointer hover:underline inline-block tracking-tight"
                            title="Deschide dosar complet vehicul"
                          >
                            {v.license_plate}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {v.is_high_risk ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 dark:border-red-800">
                                <ShieldAlert size={11} /> Watchlist
                              </span>
                            ) : (
                              <span className="text-[10px] text-gray-400">VIN: {v.vin ? v.vin.substring(0, 10) + '...' : '-'}</span>
                            )}
                          </div>
                        </td>

                        {/* Regim Flotă */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                            (v.fleet_type || 'LT') === 'LT'
                              ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          }`}>
                            {v.fleet_type || 'LT'} ({v.fleet_type === 'ST' ? 'Rent' : 'Leasing'})
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          {v.status === 'Rezervat' ? (
                            <button
                              type="button"
                              onClick={() => setReservationModalVehicle(v)}
                              className="group inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-all cursor-pointer shadow-2xs"
                              title="Vehicul Rezervat • Click pentru detalii beneficiar, contact și deblocare prematură"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                              <span>Rezervat</span>
                              <Clock size={11} className="text-purple-500 group-hover:scale-110 transition-transform" />
                            </button>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              v.status === 'Disponibil' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                : v.status === 'Închiriat'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                                : v.status === 'În Service'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                                : v.status === 'Daună'
                                ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300'
                                : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {v.status}
                            </span>
                          )}
                        </td>


                        {/* Kilometraj & Motor */}
                        <td className="px-5 py-4 text-xs whitespace-nowrap">
                          <div className="font-semibold text-gray-800 dark:text-gray-200">
                            {v.mileage?.toLocaleString('ro-RO')} km
                          </div>
                          <div className="text-[11px] text-gray-400">{v.engine_type} • {v.transmission}</div>
                        </td>

                        {/* Revizie & Service Status */}
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span 
                            onClick={() => handleOpenDetails(v, 'service')}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border cursor-pointer hover:opacity-80 transition-opacity ${srv.color}`}
                          >
                            <Wrench size={11} /> {srv.label}
                          </span>
                        </td>

                        {/* Preț / Lună */}
                        <td className="px-5 py-4 font-semibold whitespace-nowrap text-xs text-gray-900 dark:text-white">
                          €{v.rental_price_long_term?.toFixed(0) || 0}
                        </td>

                        {/* Acțiuni (Rotunjite - Tahoe Style) */}
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Dosar & Galerie Button */}
                            <button 
                              onClick={() => handleOpenDetails(v, 'specs')}
                              className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors"
                              title="Dosar Digital & Fișă Tehnică"
                            >
                              <Eye size={15} />
                            </button>

                            {/* Toggle Watchlist Button */}
                            <button 
                              onClick={(e) => handleToggleWatchlist(v.id, e)}
                              className={`p-2 border rounded-full transition-colors ${
                                v.is_high_risk 
                                  ? 'bg-red-50 text-red-600 border-red-300 hover:bg-red-100 dark:bg-red-950/60 dark:border-red-800' 
                                  : 'border-gray-200 dark:border-gray-700 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                              title={v.is_high_risk ? "Scoate din Watchlist Risc" : "Adaugă în Watchlist (Risc Sporit)"}
                            >
                              <ShieldAlert size={15} />
                            </button>

                            {/* Reservation Action Button */}
                            <button
                              type="button"
                              onClick={() => setReservationModalVehicle(v)}
                              className={`p-2 border rounded-full transition-colors ${
                                v.status === 'Rezervat'
                                  ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                                  : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-gray-700'
                              }`}
                              title={v.status === 'Rezervat' ? 'Gestiune Rezervare & Deblocare Prematură' : 'Rezervă acest vehicul (PJ/PF)'}
                            >
                              <Clock size={15} />
                            </button>

                            {/* Edit Button */}
                            <button 
                              onClick={() => handleEdit(v)}
                              className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                              title="Editează Autoturism"
                            >
                              <Edit2 size={15} />
                            </button>


                            {/* Delete Button */}
                            <button 
                              onClick={() => handleDelete(v.id)}
                              className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors"
                              title="Șterge"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. PAGINATION & FOOTER                                         */}
      {/* ============================================================== */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-4 border border-gray-200 dark:border-gray-700 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span>Afișează</span>
            <select 
              value={itemsPerPage}
              onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-full px-3 py-1 text-xs focus:ring-1 focus:ring-gray-400 font-semibold cursor-pointer"
            >
              <option value={6}>6</option>
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={48}>48</option>
            </select>
          </div>
          <span className="font-semibold text-gray-800 dark:text-gray-200">
            Total: {totalItems} autovehicule
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <span>
            Pagina <strong className="text-gray-900 dark:text-white">{currentPage}</strong> din {totalPages}
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

      {/* ============================================================== */}
      {/* 7. AUTOKLASS OFFICIAL PARTNER DISCLAIMER                       */}
      {/* ============================================================== */}
      <div className="p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-200/60 dark:border-gray-800 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed space-y-1.5">
        <div className="flex items-center gap-2 font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
          <Award size={13} className="text-blue-600" />
          Acord Parteneriat Oficial & Standarde Tehnice Autoklass
        </div>
        <p>
          Datele tehnice, emisiile de CO₂ și consumul de carburant sunt raportate în conformitate cu metodologia oficială WLTP (Regulamentul UE 2017/1151). Valorile ratelor de leasing operațional sunt calculate luând în calcul rulajul anual contractual, valoarea reziduală garantată și serviciile complete de mentenanță asigurate prin rețeaua națională de service autorizat Autoklass.
        </p>
      </div>

      {/* ============================================================== */}
      {/* MODAL: BIBLIOTECĂ VIRTUALĂ, DOSAR TEHNIC & MANAGEMENT SERVICE */}
      {/* ============================================================== */}
      {isDetailsOpen && activeVehicle && createPortal(
        <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-4xl w-full border border-gray-200 dark:border-gray-700 overflow-hidden my-6 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 flex items-center justify-center font-bold text-lg shadow-sm">
                  <Car size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {activeVehicle.make} {activeVehicle.model} ({activeVehicle.year})
                    </h3>
                    {activeVehicle.is_high_risk && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800 flex items-center gap-1">
                        <ShieldAlert size={12} /> Watchlist Risc
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3">
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Nr: {activeVehicle.license_plate}</span>
                    <span>•</span>
                    <span>VIN: {activeVehicle.vin}</span>
                    <span>•</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">{activeVehicle.fleet_type || 'LT'} ({activeVehicle.status})</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleToggleWatchlist(activeVehicle.id, e)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5 ${
                    activeVehicle.is_high_risk 
                      ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100' 
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 hover:text-red-600'
                  }`}
                >
                  <ShieldAlert size={14} />
                  {activeVehicle.is_high_risk ? 'Activ pe Watchlist' : 'Pune pe Watchlist'}
                </button>
                <button 
                  onClick={() => setIsDetailsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Tabs Navigation */}
            <div className="flex items-center gap-2 px-6 pt-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setDetailsTab('gallery')}
                className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  detailsTab === 'gallery'
                    ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Camera size={15} /> Galerie Foto & Stare Fizică
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab('specs')}
                className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  detailsTab === 'specs'
                    ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Cog size={15} /> Fișă Tehnică & Specificații
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab('service')}
                className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  detailsTab === 'service'
                    ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Wrench size={15} /> Service & Mentenanță Flotă
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab('mileage')}
                className={`pb-3 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  detailsTab === 'mileage'
                    ? 'border-gray-900 text-gray-900 dark:border-white dark:text-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Gauge size={15} /> Audit Kilometraj Contract (Live GPS)
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* TAB 1: GALERIE FOTO & STARE FIZICĂ */}
              {detailsTab === 'gallery' && (
                <div className="space-y-6">
                  {(() => {
                    const images = getVehicleImages(activeVehicle);
                    return (
                      <div className="space-y-4">
                        {images.length > 0 ? (
                          <div className="space-y-3">
                            <div 
                              onClick={() => setLightboxData({ vehicle: activeVehicle, images, activeIdx: activeImageIndex })}
                              className="relative h-80 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 cursor-pointer group select-none"
                              title="Click pentru a vizualiza în format ecran complet"
                            >
                              <img 
                                src={images[activeImageIndex] || images[0]} 
                                alt={`${activeVehicle.make} ${activeVehicle.model}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                              />

                              {/* Navigation Arrows for in-modal preview */}
                              {images.length > 1 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
                                    }}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
                                    title="Fotografia Anterioară"
                                  >
                                    <ChevronLeft size={20} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveImageIndex((prev) => (prev + 1) % images.length);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-xl cursor-pointer"
                                    title="Fotografia Următoare"
                                  >
                                    <ChevronRight size={20} />
                                  </button>
                                </>
                              )}

                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <span className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-semibold border border-white/20 flex items-center gap-1.5 shadow-lg">
                                  <Eye size={14} /> Vezi Fotografia Ecran Complet
                                </span>
                              </div>
                              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-3 py-1 rounded-full border border-white/15 z-10">
                                Foto {activeImageIndex + 1} din {images.length}
                              </div>
                            </div>
                            <div className="flex gap-2.5 overflow-x-auto pb-1">
                              {images.map((img, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setActiveImageIndex(i)}
                                  className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                                    activeImageIndex === i ? 'border-gray-900 dark:border-white scale-102' : 'border-transparent opacity-70 hover:opacity-100'
                                  }`}
                                >
                                  <img src={img} alt={`thumb-${i}`} className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="h-60 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 text-xs">
                            <ImageIcon size={32} className="mb-2 opacity-50" />
                            Nicio fotografie atașată în biblioteca acestui vehicul.
                          </div>
                        )}

                        {/* Stare Fizică & Inspecție Daune */}
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 space-y-2">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                            <AlertCircle size={14} /> Raport Inspecție Fizică & Stare Caroserie
                          </h4>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                            {activeVehicle.damage_notes || "Vehiculul se află în stare estetică optimă. Nu sunt semnalate elemente de caroserie revopsite sau zgârieturi active."}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 2: SPECIFICAȚII TEHNICE */}
              {detailsTab === 'specs' && (
                <div className="space-y-6">
                  {(() => {
                    const specs = getVehicleSpecs(activeVehicle);
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
                          <span className="text-gray-400 font-medium block mb-1">Putere Motor</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{specs.engine_power_hp} CP</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
                          <span className="text-gray-400 font-medium block mb-1">Cilindree</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{specs.displacement_cc ? `${specs.displacement_cc} cm³` : '2.996 cm³'}</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
                          <span className="text-gray-400 font-medium block mb-1">Cutie de Viteze</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{specs.transmission_gears || activeVehicle.transmission || 'Automată'}</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
                          <span className="text-gray-400 font-medium block mb-1">Tracțiune (Drivetrain)</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{specs.drivetrain}</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
                          <span className="text-gray-400 font-medium block mb-1">Consum Mediu Mixt</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{specs.fuel_consumption_mixed || '8.4 l/100km'}</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
                          <span className="text-gray-400 font-medium block mb-1">Caroserie</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{specs.body_type || 'SUV Premium'}</span>
                        </div>
                        <div className="col-span-2 sm:col-span-3 p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
                          <span className="text-gray-400 font-medium block mb-1">Echipare & Dotări Opționale</span>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                            {activeVehicle.features || "Pachet AMG / M-Sport, Plafon Panoramic, Faruri Matrix LED, Navigație MBUX / iDrive Live Cockpit, Scaune Electrice cu Memorie și Ventilație, Pilot Automat Adaptiv (Distronic), Camere 360°."}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 3: SERVICE & MENTENANȚĂ FLOTĂ */}
              {detailsTab === 'service' && (
                <div className="space-y-6">
                  {/* Scadențe & Alerte Revizie */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
                      <span className="text-gray-400 font-medium block mb-1">ITP Scadent</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Valabil (180 zile)</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
                      <span className="text-gray-400 font-medium block mb-1">RCA Scadent</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Valabil (120 zile)</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
                      <span className="text-gray-400 font-medium block mb-1">CASCO</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Activ (AllianzAgr)</span>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
                      <span className="text-gray-400 font-medium block mb-1">Rovinietă</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">Valabilă</span>
                    </div>
                  </div>

                  {/* Service Interval Progress Bar */}
                  {(() => {
                    const mileage = activeVehicle.mileage || 0;
                    const lastKm = activeVehicle.last_service_km || 0;
                    const interval = activeVehicle.service_interval_km || 15000;
                    const nextServiceKm = lastKm + interval;
                    const kmElapsed = Math.max(0, mileage - lastKm);
                    const progressPercent = Math.min(100, Math.round((kmElapsed / interval) * 100));

                    return (
                      <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="flex items-center gap-1.5 text-gray-900 dark:text-white">
                            <Wrench size={14} /> Interval Mentenanță Revizie: {interval.toLocaleString('ro-RO')} km
                          </span>
                          <span className="text-gray-500">{progressPercent}% din interval consumat</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              progressPercent > 90 ? 'bg-red-500' : progressPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-500 pt-1">
                          <span>Ultima revizie: {lastKm.toLocaleString('ro-RO')} km</span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">Următoarea revizie la: {nextServiceKm.toLocaleString('ro-RO')} km</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Jurnal Istoric Intervenții Service */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white flex items-center gap-1.5">
                        <Wrench size={14} /> Jurnal Intervenții Mecanice (Dosar Service)
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowAddService(!showAddService)}
                        className="px-3 py-1 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1"
                      >
                        <PlusCircle size={13} /> {showAddService ? 'Anulează' : 'Adaugă Intervenție'}
                      </button>
                    </div>

                    {showAddService && (
                      <form onSubmit={handleAddServiceSubmit} className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-3 text-xs animate-in fade-in duration-150">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-gray-500 font-medium mb-1">Tip Intervenție</label>
                            <input 
                              type="text" 
                              required 
                              value={serviceFormData.service_type}
                              onChange={e => setServiceFormData({...serviceFormData, service_type: e.target.value})}
                              className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border rounded-lg text-xs" 
                            />
                          </div>
                          <div>
                            <label className="block text-gray-500 font-medium mb-1">Kilometraj</label>
                            <input 
                              type="number" 
                              required 
                              value={serviceFormData.mileage}
                              onChange={e => setServiceFormData({...serviceFormData, mileage: e.target.value})}
                              className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border rounded-lg text-xs" 
                            />
                          </div>
                          <div>
                            <label className="block text-gray-500 font-medium mb-1">Cost (€)</label>
                            <input 
                              type="number" 
                              required 
                              value={serviceFormData.cost}
                              onChange={e => setServiceFormData({...serviceFormData, cost: e.target.value})}
                              className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border rounded-lg text-xs" 
                            />
                          </div>
                          <div>
                            <label className="block text-gray-500 font-medium mb-1">Service / Furnizor</label>
                            <input 
                              type="text" 
                              required 
                              value={serviceFormData.provider}
                              onChange={e => setServiceFormData({...serviceFormData, provider: e.target.value})}
                              className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border rounded-lg text-xs" 
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-gray-500 font-medium mb-1">Notițe Lucrări / Piese Înlocuite</label>
                          <input 
                            type="text" 
                            placeholder="ex: Schimb ulei 5W30, filtru ulei, plăcuțe frână față Brembo..." 
                            value={serviceFormData.notes}
                            onChange={e => setServiceFormData({...serviceFormData, notes: e.target.value})}
                            className="w-full px-3 py-1.5 bg-white dark:bg-gray-800 border rounded-lg text-xs" 
                          />
                        </div>
                        <div className="flex justify-end pt-1">
                          <button type="submit" className="px-4 py-1.5 bg-emerald-600 text-white rounded-full text-xs font-semibold hover:bg-emerald-700">
                            Înregistrează Intervenția în Istoric
                          </button>
                        </div>
                      </form>
                    )}

                    {(() => {
                      const history = parseJsonSafe(activeVehicle.service_history, []);
                      const totalCost = history.reduce((sum, item) => sum + (Number(item.cost) || 0), 0);

                      return (
                        <div className="space-y-3">
                          <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                  <th className="px-4 py-2.5">Data</th>
                                  <th className="px-4 py-2.5">Tip Intervenție</th>
                                  <th className="px-4 py-2.5">Kilometraj</th>
                                  <th className="px-4 py-2.5">Furnizor Service</th>
                                  <th className="px-4 py-2.5">Cost</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {history.length === 0 ? (
                                  <tr>
                                    <td colSpan="5" className="text-center py-6 text-gray-400">
                                      Nicio intervenție de service înregistrată încă.
                                    </td>
                                  </tr>
                                ) : (
                                  history.map((record, i) => (
                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                      <td className="px-4 py-2.5 font-medium">{record.date}</td>
                                      <td className="px-4 py-2.5">
                                        <div className="font-semibold text-gray-800 dark:text-gray-200">{record.service_type}</div>
                                        {record.notes && <div className="text-[10px] text-gray-400">{record.notes}</div>}
                                      </td>
                                      <td className="px-4 py-2.5">{record.mileage?.toLocaleString('ro-RO')} km</td>
                                      <td className="px-4 py-2.5 text-gray-500">{record.provider}</td>
                                      <td className="px-4 py-2.5 font-bold text-gray-900 dark:text-white">€{record.cost}</td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl flex justify-between items-center text-xs font-semibold border border-gray-200 dark:border-gray-700">
                            <span>Cost Total Mentenanță (TCO Per Vehicul):</span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">€{totalCost.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* TAB 4: AUDIT KILOMETRAJ CONTRACT (LIVE GPS) */}
              {detailsTab === 'mileage' && (
                <div className="space-y-6">
                  {(() => {
                    const currentKm = activeVehicle.mileage || 0;
                    const startKm = activeVehicle.rental_start_km || Math.max(0, currentKm - 1450);
                    const allowance = activeVehicle.contracted_km_allowance || 3000;
                    const usedKm = Math.max(0, currentKm - startKm);
                    const isOver = usedKm > allowance;
                    const extraKm = isOver ? usedKm - allowance : 0;
                    const penaltyCost = extraKm * 0.25;

                    return (
                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                            <span className="text-gray-400 font-medium block mb-1">Km la Predare (Start)</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{startKm.toLocaleString('ro-RO')} km</span>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                            <span className="text-gray-400 font-medium block mb-1">Km Curent Live (GPS)</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{currentKm.toLocaleString('ro-RO')} km</span>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                            <span className="text-gray-400 font-medium block mb-1">Distanță Parcursă</span>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{usedKm.toLocaleString('ro-RO')} km</span>
                          </div>
                          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                            <span className="text-gray-400 font-medium block mb-1">Plafon Inclus Contract</span>
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{allowance.toLocaleString('ro-RO')} km</span>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 space-y-3">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-gray-900 dark:text-white">Status Consum Kilometraj pe Contract</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isOver ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            }`}>
                              {isOver ? `DEPĂȘIT cu ${extraKm} km` : `ÎN PLAFON (${allowance - usedKm} km rămași)`}
                            </span>
                          </div>

                          <div className="w-full bg-gray-200 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${isOver ? 'bg-red-500' : 'bg-blue-600'}`}
                              style={{ width: `${Math.min(100, (usedKm / allowance) * 100)}%` }}
                            />
                          </div>

                          {isOver && (
                            <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 flex justify-between items-center font-medium">
                              <span>Cost automatizat facturare kilometri suplimentari (tarif €0.25/km):</span>
                              <span className="font-bold text-sm">+€{penaltyCost.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 flex justify-end">
              <button 
                type="button" 
                onClick={() => setIsDetailsOpen(false)}
                className="px-5 py-2 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Închide Dosar Auto
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================== */}
      {/* MODAL: ADĂUGARE / EDITARE MAȘINĂ                               */}
      {/* ============================================================== */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[99990] flex items-center justify-center bg-gray-900/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-2xl shadow-xl my-8 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingId ? 'Editează Autoturism' : 'Adaugă Autoturism Nou în Flotă'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs border border-red-200 dark:border-red-800">
                {errorMessage}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Marcă</label>
                  <select 
                    required 
                    value={formData.make} 
                    onChange={e => {
                      const newMake = e.target.value;
                      const brandObj = brands.find(b => b.name === newMake);
                      setFormData({
                        ...formData, 
                        make: newMake,
                        model: brandObj?.models?.length > 0 ? brandObj.models[0].name : ''
                      });
                    }} 
                    className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"
                  >
                    <option value="" disabled>Selectează Marca</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.name}>{brand.name}</option>
                    ))}
                    <option value="Altă Marcă">Altă Marcă</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
                  {formData.make === 'Altă Marcă' || !brands.find(b => b.name === formData.make) ? (
                    <input 
                      type="text" 
                      required 
                      value={formData.model} 
                      onChange={e => setFormData({...formData, model: e.target.value})} 
                      placeholder="Introduceți modelul..."
                      className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"
                    />
                  ) : (
                    <select 
                      required 
                      value={formData.model} 
                      onChange={e => setFormData({...formData, model: e.target.value})} 
                      className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"
                    >
                      {brands.find(b => b.name === formData.make)?.models?.map(model => (
                        <option key={model.id} value={model.name}>{model.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">An Fabricație</label>
                  <input type="number" required value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Nr. Înmatriculare</label>
                  <input type="text" required value={formData.license_plate} onChange={e => setFormData({...formData, license_plate: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
                </div>
                <div className="col-span-2">
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Serie Șasiu (VIN)</label>
                  <input type="text" required value={formData.vin} onChange={e => setFormData({...formData, vin: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Regim Flotă</label>
                  <select value={formData.fleet_type || 'LT'} onChange={e => setFormData({...formData, fleet_type: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white">
                    <option value="LT">LT - Leasing Operațional (Termen Lung)</option>
                    <option value="ST">ST - Rent a Car (Termen Scurt)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white">
                    <option>Disponibil</option>
                    <option>Închiriat</option>
                    <option>Rezervat</option>
                    <option>În Service</option>
                    <option>Daună</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Kilometraj Actual</label>
                  <input type="number" required value={formData.mileage} onChange={e => setFormData({...formData, mileage: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Combustibil</label>
                  <select value={formData.engine_type} onChange={e => setFormData({...formData, engine_type: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white">
                    <option>Diesel</option>
                    <option>Benzină</option>
                    <option>Hibrid</option>
                    <option>Electric</option>
                    <option>PHEV</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Cutie de Viteze</label>
                  <select value={formData.transmission} onChange={e => setFormData({...formData, transmission: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white">
                    <option>Automată</option>
                    <option>Manuală</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Preț Chirie / Lună (€)</label>
                  <input type="number" step="0.01" required value={formData.rental_price_long_term} onChange={e => setFormData({...formData, rental_price_long_term: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
                </div>
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Preț Achiziție / Catalog (€)</label>
                  <input type="number" step="0.01" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
                </div>
                <div className="col-span-2">
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Notițe Inspecție Caroserie / Stare Fizică</label>
                  <input type="text" placeholder="ex: Fără daune, tratament ceramic..." value={formData.damage_notes} onChange={e => setFormData({...formData, damage_notes: e.target.value})} className="w-full px-3 py-2 border rounded-xl dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white"/>
                </div>
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => { setIsModalOpen(false); resetForm(); }} className="px-5 py-2 text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors">
                  Anulează
                </button>
                <button type="submit" className="px-5 py-2 bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 rounded-full font-semibold hover:opacity-90 transition-opacity">
                  {editingId ? 'Actualizează Autoturism' : 'Salvează în Flotă'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================== */}
      {/* FULLSCREEN PHOTO LIGHTBOX MODAL (PORTAL LA DOCUMENT.BODY)      */}
      {/* ============================================================== */}
      {lightboxData && createPortal(
        <div 
          onClick={() => setLightboxData(null)}
          className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none overflow-hidden"
          style={{ width: '100vw', height: '100vh', margin: 0 }}
        >
          {/* Top Control Bar */}
          <div className="relative z-30 flex items-center justify-between gap-4 w-full max-w-7xl mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                  {lightboxData.vehicle?.make} {lightboxData.vehicle?.model}
                </span>
                <span className="text-white/60 text-xs hidden sm:inline">({lightboxData.vehicle?.year})</span>
              </div>

              {/* Romanian EU License Plate Badge */}
              <div className="inline-flex items-center rounded-md border border-white/20 bg-white text-gray-900 font-bold text-xs h-6 overflow-hidden shadow-sm">
                <span className="bg-blue-700 text-white px-1.5 h-full flex items-center justify-center text-[8px] font-black leading-none">RO</span>
                <span className="px-2 py-0.5 tracking-wider">{lightboxData.vehicle?.license_plate}</span>
              </div>

              {/* Photo Counter */}
              <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md border border-white/15">
                Foto {lightboxData.activeIdx + 1} din {lightboxData.images?.length || 1}
              </span>
            </div>

            {/* Prominent Close Button */}
            <button
              type="button"
              onClick={() => setLightboxData(null)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 hover:bg-white/30 text-white border border-white/25 backdrop-blur-md transition-all text-xs font-bold shadow-xl hover:scale-105 active:scale-95 cursor-pointer shrink-0"
              title="Închide Galeria (sau apasă ESC)"
            >
              <X size={18} />
              <span>Închide</span>
            </button>
          </div>

          {/* Center Stage: Photo + Navigation Arrows */}
          <div className="relative flex-1 flex items-center justify-center my-3 w-full max-w-7xl mx-auto overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Previous Photo Button */}
            {lightboxData.images?.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxData(prev => ({
                    ...prev,
                    activeIdx: (prev.activeIdx - 1 + prev.images.length) % prev.images.length
                  }));
                }}
                className="absolute left-2 sm:left-4 z-20 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
                title="Fotografia Anterioară (Săgeată Stânga)"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* Main Active Image */}
            <div className="relative flex items-center justify-center w-full h-full p-2">
              <img 
                key={lightboxData.activeIdx}
                src={lightboxData.images?.[lightboxData.activeIdx] || lightboxData.images?.[0]} 
                alt={`${lightboxData.vehicle?.make} ${lightboxData.vehicle?.model} - foto ${lightboxData.activeIdx + 1}`} 
                className="max-w-full max-h-[72vh] md:max-h-[78vh] object-contain rounded-2xl shadow-2xl transition-all duration-200 animate-in zoom-in-95 border border-white/10"
              />
            </div>

            {/* Next Photo Button */}
            {lightboxData.images?.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxData(prev => ({
                    ...prev,
                    activeIdx: (prev.activeIdx + 1) % prev.images.length
                  }));
                }}
                className="absolute right-2 sm:right-4 z-20 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
                title="Fotografia Următoare (Săgeată Dreapta)"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip + Action */}
          <div className="relative z-30 flex flex-col items-center gap-2 max-w-4xl mx-auto w-full" onClick={(e) => e.stopPropagation()}>
            {lightboxData.images?.length > 1 && (
              <div className="flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto py-1 px-4 max-w-full">
                {lightboxData.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxData(prev => ({ ...prev, activeIdx: idx }));
                    }}
                    className={`relative w-16 sm:w-20 h-11 sm:h-13 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      lightboxData.activeIdx === idx 
                        ? 'border-white scale-105 shadow-xl ring-2 ring-white/30 opacity-100' 
                        : 'border-transparent opacity-50 hover:opacity-90'
                    }`}
                  >
                    <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            
            <button
              type="button"
              onClick={() => {
                const v = lightboxData.vehicle;
                setLightboxData(null);
                handleOpenDetails(v, 'specs');
              }}
              className="text-white/70 hover:text-white text-xs underline underline-offset-4 transition-colors font-medium cursor-pointer"
            >
              Deschide Fișa Tehnică & Dosarul Complet pentru {lightboxData.vehicle?.make} {lightboxData.vehicle?.model} →
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* VEHICLE RESERVATION & PREMATURE UNLOCK MODAL */}
      <VehicleReservationModal
        isOpen={!!reservationModalVehicle}
        onClose={() => setReservationModalVehicle(null)}
        vehicle={reservationModalVehicle}
        onReservationUpdated={handleReservationUpdated}
      />
    </div>
  );
};

export default VehiclesList;

