import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, Car, ShieldCheck, ShieldAlert, Wrench, Camera, 
  Gauge, Calendar, FileText, Download, Eye, Plus, Check, 
  AlertCircle, AlertTriangle, ExternalLink, RefreshCw, Copy, 
  Edit2, Trash2, ChevronLeft, ChevronRight, X, Printer,
  Radio, Activity, Compass, Navigation, Fuel, Key, Lock,
  FileCheck, Shield, ChevronDown, CheckCircle2, Clock, Phone,
  MessageSquare, Building, User, Unlock
} from 'lucide-react';
import { 
  fetchVehicle, fetchVehicleByPlate, updateVehicle, 
  toggleVehicleWatchlist, addVehicleServiceRecord 
} from '../services/api';
import VehicleReservationModal from '../components/VehicleReservationModal';


const parseJsonSafe = (str, fallback) => {
  if (!str) return fallback;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
};

const VehicleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = searchParams.get('tab') || 'documents';

  const [vehicle, setVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(activeTabParam);
  const [copiedVin, setCopiedVin] = useState(false);

  // Gallery state
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [isPhotoLightboxOpen, setIsPhotoLightboxOpen] = useState(false);
  const [showAddPhotoModal, setShowAddPhotoModal] = useState(false);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // Damage notes state
  const [isEditingDamage, setIsEditingDamage] = useState(false);
  const [damageNotesText, setDamageNotesText] = useState('');
  const [savingDamage, setSavingDamage] = useState(false);

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState(null);

  // Document renewal / edit modal
  const [docModal, setDocModal] = useState(null); // null or { type, name, series, insurer, expiry_date, ... }
  const [savingDoc, setSavingDoc] = useState(false);

  // Service form & table state (AGENTS.md)
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    service_type: 'Revizie Ulei & Filtre Complexe',
    mileage: '',
    cost: '',
    provider: 'Service Partener Autorizat Axis',
    notes: ''
  });
  const [savingService, setSavingService] = useState(false);
  const [selectedServiceRows, setSelectedServiceRows] = useState([]);
  const [servicePage, setServicePage] = useState(1);
  const [servicePageSize, setServicePageSize] = useState(10);

  // Telemetry simulation state
  const [telemetryState, setTelemetryState] = useState({
    engineStatus: 'Oprit (Parcat Securizat)',
    ignition: false,
    speed: 0,
    fuelLevel: 78,
    batteryVoltage: 14.2,
    locationAddress: 'București, Sector 1, Șoseaua Nordului 62',
    immobilizerActive: false,
    lastUpdate: 'Acum 2 minute'
  });
  const [remoteCommandFeedback, setRemoteCommandFeedback] = useState('');

  // Quick edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [savingVehicle, setSavingVehicle] = useState(false);

  // Reservation Modal State
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);

  const currentReservation = useMemo(() => {
    return parseJsonSafe(vehicle?.reservation_details, null);
  }, [vehicle]);

  const handleReservationUpdated = (updatedVehicle) => {
    setVehicle(updatedVehicle);
  };


  // Load vehicle data
  const loadVehicleData = async () => {
    setLoading(true);
    setError(null);
    try {
      let data = null;
      // If id is numeric
      if (/^\d+$/.test(id)) {
        data = await fetchVehicle(parseInt(id, 10));
      } else {
        // ID is license plate or code
        data = await fetchVehicleByPlate(id);
      }
      setVehicle(data);
      setDamageNotesText(data.damage_notes || '');
      setEditFormData({
        make: data.make || '',
        model: data.model || '',
        year: data.year || new Date().getFullYear(),
        vin: data.vin || '',
        license_plate: data.license_plate || '',
        status: data.status || 'Disponibil',
        fleet_type: data.fleet_type || 'LT',
        mileage: data.mileage || 0,
        engine_type: data.engine_type || 'Benzină',
        transmission: data.transmission || 'Automată',
        color: data.color || '',
        rental_price_short_term: data.rental_price_short_term || 0,
        rental_price_long_term: data.rental_price_long_term || 0,
        rental_start_km: data.rental_start_km || 0,
        contracted_km_allowance: data.contracted_km_allowance || 3000
      });
    } catch (err) {
      console.error('Failed to load vehicle:', err);
      setError(err.message || 'Vehiculul nu a putut fi găsit în baza de date.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicleData();
  }, [id]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const handleCopyVin = (vin) => {
    if (!vin) return;
    navigator.clipboard?.writeText(vin);
    setCopiedVin(true);
    setTimeout(() => setCopiedVin(false), 2000);
  };

  const handleToggleWatchlist = async () => {
    if (!vehicle) return;
    try {
      const updated = await toggleVehicleWatchlist(vehicle.id);
      setVehicle(updated);
    } catch (err) {
      alert('Eroare la schimbarea stării de watchlist.');
    }
  };

  const handleSaveDamageNotes = async () => {
    if (!vehicle) return;
    setSavingDamage(true);
    try {
      const updated = await updateVehicle(vehicle.id, { damage_notes: damageNotesText });
      setVehicle(updated);
      setIsEditingDamage(false);
    } catch (err) {
      alert('Eroare la salvarea notițelor de inspecție.');
    } finally {
      setSavingDamage(false);
    }
  };

  const handleAddPhoto = async (e) => {
    e.preventDefault();
    if (!vehicle || !newPhotoUrl.trim()) return;
    const currentImages = parseJsonSafe(vehicle.images, []);
    const updatedImages = [...currentImages, newPhotoUrl.trim()];
    try {
      const updated = await updateVehicle(vehicle.id, { images: JSON.stringify(updatedImages) });
      setVehicle(updated);
      setNewPhotoUrl('');
      setShowAddPhotoModal(false);
      setActivePhotoIdx(updatedImages.length - 1);
    } catch (err) {
      alert('Eroare la adăugarea fotografiei.');
    }
  };

  const handleAddServiceSubmit = async (e) => {
    e.preventDefault();
    if (!vehicle) return;
    if (!serviceForm.mileage || !serviceForm.cost) {
      alert('Vă rugăm să introduceți kilometrajul și costul intervenției.');
      return;
    }
    setSavingService(true);
    try {
      const record = {
        service_type: serviceForm.service_type,
        mileage: parseInt(serviceForm.mileage, 10),
        cost: parseFloat(serviceForm.cost),
        provider: serviceForm.provider,
        notes: serviceForm.notes
      };
      const updated = await addVehicleServiceRecord(vehicle.id, record);
      setVehicle(updated);
      setShowAddServiceModal(false);
      setServiceForm({
        service_type: 'Revizie Ulei & Filtre Complexe',
        mileage: '',
        cost: '',
        provider: 'Service Partener Autorizat Axis',
        notes: ''
      });
    } catch (err) {
      alert('Eroare la salvarea reviziei: ' + err.message);
    } finally {
      setSavingService(false);
    }
  };

  // Save / Renew Document
  const handleSaveDocModal = async (e) => {
    e.preventDefault();
    if (!vehicle || !docModal) return;
    setSavingDoc(true);
    try {
      const currentDocs = parseJsonSafe(vehicle.documents, []);
      let updatedDocs = [];
      const existingIdx = currentDocs.findIndex(d => d.type === docModal.type);

      const docItem = {
        id: docModal.id || `doc-${docModal.type.toLowerCase()}-${vehicle.id}`,
        name: docModal.name,
        type: docModal.type,
        series: docModal.series,
        insurer: docModal.insurer || null,
        issuer: docModal.issuer || null,
        station: docModal.station || null,
        category: docModal.category || null,
        deductible: docModal.deductible || null,
        expiry_date: docModal.expiry_date || null,
        status: 'VALID',
        file_size: docModal.file_size || '1.8 MB',
        file_type: 'PDF',
        url: docModal.url || `/documents/${docModal.type.toLowerCase()}_${vehicle.license_plate.replace(/\s+/g, '')}.pdf`
      };

      if (existingIdx !== -1) {
        updatedDocs = [...currentDocs];
        updatedDocs[existingIdx] = docItem;
      } else {
        updatedDocs = [...currentDocs, docItem];
      }

      // Also update top level date if matches
      const patchObj = { documents: JSON.stringify(updatedDocs) };
      if (docModal.type === 'RCA' && docModal.expiry_date) {
        patchObj.insurance_expiry = docModal.expiry_date;
      } else if (docModal.type === 'CASCO' && docModal.expiry_date) {
        patchObj.casco_expiry = docModal.expiry_date;
      } else if (docModal.type === 'ITP' && docModal.expiry_date) {
        patchObj.itp_expiry = docModal.expiry_date;
      } else if (docModal.type === 'ROVINIETA' && docModal.expiry_date) {
        patchObj.vignette_expiry = docModal.expiry_date;
      }

      const updated = await updateVehicle(vehicle.id, patchObj);
      setVehicle(updated);
      setDocModal(null);
    } catch (err) {
      alert('Eroare la actualizarea documentului: ' + err.message);
    } finally {
      setSavingDoc(false);
    }
  };

  // Quick edit vehicle
  const handleSaveVehicleEdit = async (e) => {
    e.preventDefault();
    if (!vehicle) return;
    setSavingVehicle(true);
    try {
      const payload = {
        make: editFormData.make,
        model: editFormData.model,
        year: parseInt(editFormData.year, 10),
        vin: editFormData.vin,
        license_plate: editFormData.license_plate,
        status: editFormData.status,
        fleet_type: editFormData.fleet_type,
        mileage: parseInt(editFormData.mileage, 10) || 0,
        engine_type: editFormData.engine_type,
        transmission: editFormData.transmission,
        color: editFormData.color,
        rental_price_short_term: parseFloat(editFormData.rental_price_short_term) || 0,
        rental_price_long_term: parseFloat(editFormData.rental_price_long_term) || 0,
        rental_start_km: parseInt(editFormData.rental_start_km, 10) || 0,
        contracted_km_allowance: parseInt(editFormData.contracted_km_allowance, 10) || 3000
      };
      const updated = await updateVehicle(vehicle.id, payload);
      setVehicle(updated);
      setIsEditModalOpen(false);
    } catch (err) {
      alert('Eroare la salvarea modificărilor: ' + err.message);
    } finally {
      setSavingVehicle(false);
    }
  };

  // Remote Telemetry Controls
  const triggerRemoteCommand = (cmd) => {
    if (cmd === 'CAN_CUT') {
      setTelemetryState(prev => ({
        ...prev,
        immobilizerActive: !prev.immobilizerActive,
        engineStatus: !prev.immobilizerActive ? 'Imobilizat Securizat (Demaror Blocat)' : 'Oprit (Parcat Securizat)'
      }));
      setRemoteCommandFeedback(
        !telemetryState.immobilizerActive 
          ? 'Protocol CAN-bus Safe-Cut ACTIVAT: Releul demaror a fost întrerupt la distanță.'
          : 'Protocol CAN-bus DEZACTIVAT: Demaror restabilit.'
      );
    } else if (cmd === 'HORN') {
      setRemoteCommandFeedback('Semnal de localizare emis: Avarii intermitente activate timp de 15 secunde.');
    } else if (cmd === 'REFRESH') {
      setRemoteCommandFeedback('Telemetria GPS și magistrala CAN au fost sincronizate cu succes.');
      setTelemetryState(prev => ({ ...prev, lastUpdate: 'Chiar acum' }));
    }
    setTimeout(() => setRemoteCommandFeedback(''), 4500);
  };

  // Parsed vehicle data (Always ensures rich multi-photo galleries)
  const images = useMemo(() => {
    const list = parseJsonSafe(vehicle?.images, []);
    const m = (vehicle?.model || '').toLowerCase();
    
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
  }, [vehicle]);

  const docsList = useMemo(() => {
    const raw = parseJsonSafe(vehicle?.documents, []);
    if (raw && raw.length > 0) return raw;

    // Fallback baseline standard 6 Romanian fleet documents
    const p = vehicle?.license_plate?.replace(/\s+/g, '') || 'B000XXX';
    return [
      {
        id: `doc-rca-${vehicle?.id || 1}`,
        name: 'Poliță Asigurare Obligatorie RCA',
        type: 'RCA',
        series: `RO/24/GP/${p}`,
        insurer: 'Allianz-Țiriac Asigurări',
        expiry_date: vehicle?.insurance_expiry ? vehicle.insurance_expiry.split('T')[0] : '2027-01-29',
        status: 'VALID',
        file_size: '1.4 MB',
        file_type: 'PDF',
        url: `/documents/rca_${p}.pdf`
      },
      {
        id: `doc-casco-${vehicle?.id || 1}`,
        name: 'Poliță Asigurare Facultativă CASCO Gold',
        type: 'CASCO',
        series: `CS-2024-${p}`,
        insurer: 'Omniasig VIG',
        deductible: '€150 (Franșiză daune parțiale)',
        expiry_date: vehicle?.casco_expiry ? vehicle.casco_expiry.split('T')[0] : '2027-03-30',
        status: 'VALID',
        file_size: '2.6 MB',
        file_type: 'PDF',
        url: `/documents/casco_${p}.pdf`
      },
      {
        id: `doc-talon-${vehicle?.id || 1}`,
        name: 'Certificat de Înmatriculare (Talon Auto)',
        type: 'TALON',
        series: 'B 101492',
        issuer: 'DRPCIV București - Ilfov',
        expiry_date: null,
        status: 'VALID',
        file_size: '3.2 MB',
        file_type: 'PDF',
        url: `/documents/talon_${p}.pdf`
      },
      {
        id: `doc-civ-${vehicle?.id || 1}`,
        name: 'Cartea de Identitate a Vehiculului (CIV)',
        type: 'CIV',
        series: 'CIV-RO-WBAE6A',
        issuer: 'Registrul Auto Român (RAR)',
        expiry_date: null,
        status: 'VALID',
        file_size: '4.1 MB',
        file_type: 'PDF',
        url: `/documents/civ_${p}.pdf`
      },
      {
        id: `doc-itp-${vehicle?.id || 1}`,
        name: 'Certificat Inspecție Tehnică Periodică (ITP)',
        type: 'ITP',
        series: 'ITP-B-202501',
        station: 'Stația RAR AutoExpert Voluntari (Autorizație 4921)',
        expiry_date: vehicle?.itp_expiry ? vehicle.itp_expiry.split('T')[0] : '2027-05-29',
        status: 'VALID',
        file_size: '1.1 MB',
        file_type: 'PDF',
        url: `/documents/itp_${p}.pdf`
      },
      {
        id: `doc-rovinieta-${vehicle?.id || 1}`,
        name: 'Rovinietă Valabilă Rețea CNAIR (12 Luni)',
        type: 'ROVINIETA',
        series: `ROV-CNAIR-${p}`,
        category: 'Categoria A (Autoturism)',
        expiry_date: vehicle?.vignette_expiry ? vehicle.vignette_expiry.split('T')[0] : '2026-12-30',
        status: 'VALID',
        file_size: '0.7 MB',
        file_type: 'PDF',
        url: `/documents/rovinieta_${p}.pdf`
      }
    ];
  }, [vehicle]);

  const serviceHistory = useMemo(() => {
    return parseJsonSafe(vehicle?.service_history, [
      {
        id: 1,
        date: '2026-06-03',
        service_type: 'Revizie completă A (Ulei, Filtru aer/polen/combustibil)',
        mileage: Math.max(0, (vehicle?.mileage || 20000) - 4500),
        cost: 650.0,
        provider: `Service Autorizat ${vehicle?.make || 'Premium'} Băneasa`,
        notes: 'Schimb lichid frână și inspecție tren rulare. Fără jocuri mecanice.'
      }
    ]);
  }, [vehicle]);

  const specs = useMemo(() => {
    const raw = parseJsonSafe(vehicle?.specs, {});
    return {
      engine_power_hp: raw.engine_power_hp || (vehicle?.model?.includes('AMG') ? 585 : 280),
      displacement_cc: raw.displacement_cc || 2999,
      fuel_consumption_mixed: raw.fuel_consumption_mixed || '7.8 l/100km',
      transmission_gears: raw.transmission_gears || vehicle?.transmission || '9G-Tronic Automată',
      drivetrain: raw.drivetrain || (vehicle?.make === 'Mercedes-Benz' ? '4MATIC Permanent' : 'xDrive AWD'),
      body_type: raw.body_type || 'SUV / Limuzină Premium'
    };
  }, [vehicle]);

  // Service interval calculation
  const serviceIntervalKm = vehicle?.service_interval_km || 15000;
  const lastServiceKm = vehicle?.last_service_km || (vehicle?.mileage ? Math.max(0, vehicle.mileage - 4500) : 0);
  const currentMileage = vehicle?.mileage || 0;
  const kmSinceLastService = Math.max(0, currentMileage - lastServiceKm);
  const kmUntilNextService = serviceIntervalKm - kmSinceLastService;
  const serviceProgressPercent = Math.min(100, Math.max(0, Math.round((kmSinceLastService / serviceIntervalKm) * 100)));
  const isServiceOverdue = kmUntilNextService <= 0;
  const isServiceNear = kmUntilNextService > 0 && kmUntilNextService <= 2000;

  // Contract odometer calculation
  const startKm = vehicle?.rental_start_km || Math.max(0, currentMileage - 3500);
  const kmAllowance = vehicle?.contracted_km_allowance || 3000;
  const currentContractKm = Math.max(0, currentMileage - startKm);
  const excessKm = Math.max(0, currentContractKm - kmAllowance);
  const extraKmRate = 0.20; // €0.20 per excess km
  const totalExtraCost = (excessKm * extraKmRate).toFixed(2);

  // Helper for document days remaining
  const getDaysRemaining = (expiryStr) => {
    if (!expiryStr) return null;
    const now = new Date();
    const exp = new Date(expiryStr);
    const diffTime = exp.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Keyboard navigation for photo lightbox (ESC, Left Arrow, Right Arrow)
  useEffect(() => {
    if (!isPhotoLightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsPhotoLightboxOpen(false);
      } else if (e.key === 'ArrowLeft') {
        if (images.length > 1) {
          setActivePhotoIdx((prev) => (prev - 1 + images.length) % images.length);
        }
      } else if (e.key === 'ArrowRight') {
        if (images.length > 1) {
          setActivePhotoIdx((prev) => (prev + 1) % images.length);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPhotoLightboxOpen, images]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500 font-medium">Se încarcă datele complete ale autovehiculului...</p>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="max-w-3xl mx-auto my-12 p-8 bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Autovehiculul nu a putut fi găsit</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{error || 'Nu am găsit înregistrări active pentru acest identificator.'}</p>
        <Link 
          to="/vehicles" 
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full font-medium text-xs hover:opacity-90 transition-all shadow-xs"
        >
          <ArrowLeft size={14} /> Înapoi la Parcul Auto
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Breadcrumb Navigation & Top Action Bar (Tahoe Clean Hierarchy) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-1">
        {/* Left: Sleek Back Button & Clean Breadcrumb Hierarchy */}
        <div className="flex items-center gap-3">
          <Link
            to="/vehicles"
            className="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-2xs shrink-0 cursor-pointer"
            title="Înapoi la Parcul Auto"
          >
            <ArrowLeft size={16} />
          </Link>

          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <Link to="/vehicles" className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors font-medium">
              Flotă Auto
            </Link>
            <ChevronRight size={13} className="text-gray-300 dark:text-gray-600" />
            <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-none">
              {vehicle.make} {vehicle.model}
            </span>
          </div>
        </div>

        {/* Right: Grouped Action Controls with Clear Hierarchy */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Secondary Action Icons (Tahoe Rounded Capsule) */}
          <div className="flex items-center gap-1 p-1 bg-gray-100/90 dark:bg-gray-800/90 rounded-full border border-gray-200/80 dark:border-gray-700/80 shadow-2xs">
            {/* Watchlist Toggle */}
            <button
              type="button"
              onClick={handleToggleWatchlist}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                vehicle.is_high_risk
                  ? 'bg-red-500 text-white shadow-xs'
                  : 'text-gray-500 hover:text-red-500 hover:bg-white dark:hover:bg-gray-700'
              }`}
              title={vehicle.is_high_risk ? 'Activ pe Watchlist Risc (Click pentru scoatere)' : 'Adaugă la Watchlist (Risc Sporit)'}
            >
              <ShieldAlert size={14} />
            </button>

            {/* Reservation Trigger */}
            <button
              type="button"
              onClick={() => setIsReservationModalOpen(true)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                vehicle.status === 'Rezervat'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-purple-600 hover:bg-white dark:hover:bg-gray-700'
              }`}
              title={vehicle.status === 'Rezervat' ? 'Gestiune Rezervare & Deblocare Prematură' : 'Rezervă Vehicul (PJ/PF)'}
            >
              <Calendar size={14} />
            </button>

            {/* Edit Vehicle Trigger */}
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="w-8 h-8 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 flex items-center justify-center transition-all cursor-pointer"
              title="Editează Autoturism"
            >
              <Edit2 size={13} />
            </button>
          </div>

          {/* Primary Action Button (Executive Solid Dark CTA) */}
          <button
            type="button"
            onClick={() => navigate(`/offers/new?vehicle_id=${vehicle.id}`)}
            className="h-10 px-4 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
          >
            <span>Configurează Ofertă</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* EXECUTIVE RESERVATION STATUS BANNER (When Vehicle is RESERVED) */}
      {vehicle.status === 'Rezervat' && (
        <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/5 border border-purple-200/90 dark:border-purple-800/80 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Clock size={24} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-600 text-white shadow-2xs">
                  Vehicul Rezervat
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 text-purple-900 dark:text-purple-200">
                  {currentReservation?.client_type === 'PJ' ? 'Persoană Juridică (PJ)' : 'Persoană Fizică (PF)'}
                </span>
                {currentReservation?.reserved_until && (
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                    Rezervat până la: <strong>{new Date(currentReservation.reserved_until).toLocaleString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                  </span>
                )}
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-white">
                Beneficiar: <span className="text-purple-700 dark:text-purple-300">{currentReservation?.client_name || 'Client rezervat'}</span>
                {currentReservation?.contact_person && (
                  <span className="text-gray-600 dark:text-gray-300 font-normal"> • Persoană contact: <strong>{currentReservation.contact_person}</strong></span>
                )}
                {currentReservation?.contact_phone && (
                  <span className="text-gray-600 dark:text-gray-300 text-xs"> ({currentReservation.contact_phone})</span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Agent responsabil: <span className="font-semibold text-gray-700 dark:text-gray-300">{currentReservation?.reserved_by || 'Eugeniu Cazmal'}</span>
                {currentReservation?.reason && ` • Motiv: ${currentReservation.reason}`}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto flex-wrap sm:flex-nowrap shrink-0">
            {/* Quick Call */}
            {currentReservation?.contact_phone && (
              <a
                href={`tel:${currentReservation.contact_phone.replace(/\s+/g, '')}`}
                className="px-3.5 py-2 rounded-full bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300 text-xs font-bold hover:bg-purple-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Apelează telefonic persoana de contact"
              >
                <Phone size={13} />
                <span>Apelează</span>
              </a>
            )}

            {/* Quick WhatsApp */}
            {currentReservation?.contact_phone && (
              <a
                href={`https://wa.me/${currentReservation.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Bună ziua, vă contactăm de la Axis în legătură cu rezervarea autoturismului ${vehicle.make} ${vehicle.model} (${vehicle.license_plate}).`)}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Deschide WhatsApp direct cu beneficiarul"
              >
                <MessageSquare size={13} />
                <span>WhatsApp</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setIsReservationModalOpen(true)}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Clock size={14} />
              <span>Gestiune & Deblocare Prematură</span>
            </button>
          </div>
        </div>
      )}


      {/* Hero Header Card (Tahoe Executive Luxury Automotive Style) */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 border border-gray-200/90 dark:border-gray-700/80 shadow-sm relative overflow-hidden backdrop-blur-xs">
        {/* Ambient subtle decorative brand gradient accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/5 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Top Section: Showcase Image + Vehicle Identity & Specs */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
          {/* 1. Large, Cinematic Vehicle Photo (Click to open Gallery Lightbox) */}
          <div 
            onClick={() => setIsPhotoLightboxOpen(true)}
            className="relative w-full sm:w-56 md:w-64 h-36 sm:h-40 rounded-2xl overflow-hidden border border-gray-200/80 dark:border-gray-700/80 shadow-md shrink-0 cursor-pointer group bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800"
            title="Apasă pentru a deschide galeria foto HD"
          >
            {images.length > 0 ? (
              <img 
                src={images[activePhotoIdx] || images[0]} 
                alt={`${vehicle.make} ${vehicle.model}`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                <Car size={36} />
                <span className="text-[11px] font-medium">Fără fotografii</span>
              </div>
            )}

            {/* Quick Navigation Arrows for Header Photo */}
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) => (prev - 1 + images.length) % images.length);
                  }}
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 shadow-md cursor-pointer"
                  title="Fotografia Anterioară"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) => (prev + 1) % images.length);
                  }}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-95 shadow-md cursor-pointer"
                  title="Fotografia Următoare"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}

            {/* Gradient Vignette at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 opacity-70 group-hover:opacity-50 transition-opacity pointer-events-none" />

            {/* Floating Badges inside picture: Photo count & Fullscreen Hint */}
            <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-medium border border-white/20 z-10">
              <Camera size={12} />
              <span>{activePhotoIdx + 1} / {images.length}</span>
            </div>

            <div className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/50 backdrop-blur-md text-white/90 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <Eye size={13} />
            </div>
          </div>

          {/* 2. Main Vehicle Info (Brand, Model, Plate, Tags, VIN) */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Status & Contract Tags (Clean single horizontal row with flex-wrap) */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Authentic Romanian License Plate Badge */}
              <div className="inline-flex items-center bg-white border border-gray-900 dark:border-gray-600 rounded-md overflow-hidden shadow-xs h-7">
                <div className="bg-blue-600 text-white px-1.5 h-full flex flex-col items-center justify-center text-[9px] font-bold leading-none select-none">
                  <span className="text-[8px] leading-none">★</span>
                  <span className="tracking-tighter">RO</span>
                </div>
                <div className="px-2.5 font-black text-gray-900 text-xs tracking-wider select-all">
                  {vehicle.license_plate}
                </div>
              </div>

              {/* Dynamic Status Pill */}
              <button
                type="button"
                onClick={() => setIsReservationModalOpen(true)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                  vehicle.status === 'Disponibil'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : vehicle.status === 'Închiriat'
                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                    : vehicle.status === 'În Service'
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                    : vehicle.status === 'Daună' || vehicle.status === 'Incident'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                    : vehicle.status === 'Rezervat'
                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 cursor-pointer hover:bg-purple-100 transition-colors'
                    : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300'
                }`}
                title={vehicle.status === 'Rezervat' ? 'Click pentru detalii rezervare și deblocare' : vehicle.status}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  vehicle.status === 'Disponibil' ? 'bg-emerald-500 animate-pulse' :
                  vehicle.status === 'Închiriat' ? 'bg-blue-500' :
                  vehicle.status === 'În Service' ? 'bg-amber-500' :
                  vehicle.status === 'Daună' || vehicle.status === 'Incident' ? 'bg-rose-500' :
                  vehicle.status === 'Rezervat' ? 'bg-purple-500 animate-pulse' : 'bg-gray-400'
                }`} />
                {vehicle.status}
              </button>


              {/* Contract Type */}
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border bg-gray-50 dark:bg-gray-700/60 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300">
                {vehicle.fleet_type === 'ST' ? 'Rent-a-Car (ST)' : 'Leasing Operațional (LT)'}
              </span>

              {/* High Risk / Watchlist Badge */}
              {vehicle.is_high_risk && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                  <ShieldAlert size={13} className="text-red-600 dark:text-red-400" /> Watchlist Monitorizat
                </span>
              )}
            </div>

            {/* Brand & Model Headline (Spacious, Elegant, No Awkward Line Wrapping!) */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  {vehicle.make}
                </span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {specs.body_type || 'SUV Premium'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight mt-0.5 flex items-baseline gap-2 flex-wrap">
                <span>{vehicle.model}</span>
                <span className="text-base sm:text-lg font-medium text-gray-400 dark:text-gray-500">
                  ({vehicle.year})
                </span>
              </h1>
            </div>

            {/* VIN & Quick Spec Details */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400 pt-0.5">
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900/60 px-2.5 py-1 rounded-lg border border-gray-200/80 dark:border-gray-700/80">
                <span className="text-gray-400 font-medium">VIN:</span>
                <span className=" font-bold text-gray-900 dark:text-white tracking-wider select-all">
                  {vehicle.vin}
                </span>
                <button
                  onClick={() => handleCopyVin(vehicle.vin)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
                  title="Copiază Serie Șasiu (VIN)"
                >
                  {copiedVin ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              </div>

              {vehicle.color && (
                <div className="flex items-center gap-1">
                  <span className="text-gray-400">Culoare:</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{vehicle.color}</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <span className="text-gray-400">Transmisie:</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{vehicle.transmission || 'Automată'}</span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-gray-400">Combustibil:</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">{vehicle.engine_type || 'Benzină'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tier 2: 4 Executive KPI Stat Cards (Full Width Grid Across Bottom) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5 mt-6 border-t border-gray-100 dark:border-gray-700/70">
          {/* KPI 1: Kilometraj */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/80 dark:to-gray-800/80 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50">
              <Gauge size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-gray-400">
                Kilometraj
              </div>
              <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                {vehicle.mileage?.toLocaleString('ro-RO')} km
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {kmUntilNextService > 0 ? `${kmUntilNextService.toLocaleString('ro-RO')} km până la revizie` : 'Revizie necesară'}
              </div>
            </div>
          </div>

          {/* KPI 2: Tarif Lunar */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/80 dark:to-gray-800/80 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
              <Activity size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-gray-400">
                Tarif / Lună
              </div>
              <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                €{vehicle.rental_price_long_term?.toFixed(0) || 0}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                Leasing Operațional (LT)
              </div>
            </div>
          </div>

          {/* KPI 3: Putere Motor */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/80 dark:to-gray-800/80 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/50">
              <Fuel size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-gray-400">
                Putere & Motor
              </div>
              <div className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">
                {specs.engine_power_hp} CP
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {specs.drivetrain || '4MATIC Permanent'}
              </div>
            </div>
          </div>

          {/* KPI 4: Acte Active */}
          <div className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/80 dark:to-gray-800/80 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50">
              <CheckCircle2 size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400 dark:text-gray-400">
                Dosar Acte
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
                {docsList.length} / 6 Active
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                Conformitate 100%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (macOS Tahoe Rounded Pills) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleTabChange('documents')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'documents'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <ShieldCheck size={15} />
          Dosar Acte & Valabilități ({docsList.length})
        </button>

        <button
          onClick={() => handleTabChange('gallery')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'gallery'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Camera size={15} />
          Galerie Foto & Inspecție ({images.length})
        </button>

        <button
          onClick={() => handleTabChange('service')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'service'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Wrench size={15} />
          Service & Mentenanță
          {isServiceOverdue && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('gps')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'gps'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Gauge size={15} />
          Telemetrie GPS & Audit KM
        </button>

        <button
          onClick={() => handleTabChange('specs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'specs'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-xs'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Car size={15} />
          Specificații & Fișă Tehnică
        </button>
      </div>

      {/* TAB 1: DOSAR ACTE & VALABILITĂȚI (CASCO, RCA, TALON, CIV, ITP, ROVINIETĂ) */}
      {activeTab === 'documents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Dosar Acte Oficiale & Valabilități</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Polițe de asigurare RCA/CASCO, Inspecție Tehnică (ITP), Rovinietă CNAIR și acte de proprietate (Talon, CIV).
              </p>
            </div>

            <button
              onClick={() => setDocModal({
                type: 'RCA',
                name: 'Poliță Asigurare Obligatorie RCA',
                series: `RO/25/GP/${vehicle.license_plate.replace(/\s+/g, '')}`,
                insurer: 'Allianz-Țiriac Asigurări',
                expiry_date: '2027-01-29',
                file_size: '1.4 MB'
              })}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-all shadow-xs"
            >
              <Plus size={14} /> Adaugă / Reînnoiește Act
            </button>
          </div>

          {/* Cards Grid for 6 core documents */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {docsList.map((doc, idx) => {
              const daysLeft = getDaysRemaining(doc.expiry_date);
              const isExpired = daysLeft !== null && daysLeft <= 0;
              const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;

              return (
                <div 
                  key={doc.id || idx}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between hover:border-gray-300 dark:hover:border-gray-600 transition-all group"
                >
                  <div className="space-y-3">
                    {/* Header with Type Tag and Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-600">
                        {doc.type}
                      </span>

                      {doc.expiry_date ? (
                        isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
                            <AlertCircle size={11} /> EXPIRAT
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Clock size={11} /> Expiră în {daysLeft} zile
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 size={11} /> VALID ({daysLeft} zile)
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          PERMANENT
                        </span>
                      )}
                    </div>

                    {/* Document Title */}
                    <h3 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-primary transition-colors">
                      {doc.name}
                    </h3>

                    {/* Metadata items */}
                    <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                      {doc.series && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Serie / Nr:</span>
                          <span className=" font-medium text-gray-900 dark:text-white">{doc.series}</span>
                        </div>
                      )}

                      {doc.insurer && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Asigurător:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{doc.insurer}</span>
                        </div>
                      )}

                      {doc.deductible && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Franșiză:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{doc.deductible}</span>
                        </div>
                      )}

                      {doc.issuer && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Emitent:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{doc.issuer}</span>
                        </div>
                      )}

                      {doc.station && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Stație RAR:</span>
                          <span className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{doc.station}</span>
                        </div>
                      )}

                      {doc.category && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Categorie:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{doc.category}</span>
                        </div>
                      )}

                      {doc.expiry_date && (
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-700/60">
                          <span className="text-gray-400">Scadență:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {new Date(doc.expiry_date).toLocaleDateString('ro-RO')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Document Card Footer Actions */}
                  <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 ">
                      <FileText size={13} />
                      <span>{doc.file_type || 'PDF'}</span>
                      <span>•</span>
                      <span>{doc.file_size || '1.5 MB'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-full text-xs font-medium text-gray-800 dark:text-gray-200 transition-colors"
                        title="Previzualizează Document"
                      >
                        <Eye size={13} /> Previzualizează
                      </button>

                      <button
                        onClick={() => setDocModal(doc)}
                        className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                        title="Reînnoiește / Editează Valabilitate"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: GALERIE FOTO & INSPECȚIE TEHNICĂ */}
      {activeTab === 'gallery' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Galerie Foto HD & Notițe Inspecție</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Fotografii exterior, habitaclu interior, jante și raportul de inspecție la preluare / retur.
              </p>
            </div>

            <button
              onClick={() => setShowAddPhotoModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-all shadow-xs"
            >
              <Plus size={14} /> Adaugă Fotografie Nouă
            </button>
          </div>

          {/* Large Hero Image Viewer with Thumbnail Strip */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div 
              onClick={() => setIsPhotoLightboxOpen(true)}
              className="relative w-full h-[360px] sm:h-[460px] rounded-2xl overflow-hidden bg-gray-950 flex items-center justify-center cursor-pointer group select-none"
              title="Apasă pentru ecran complet"
            >
              <img 
                src={images[activePhotoIdx] || images[0]} 
                alt={`${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
              />

              {/* Previous Photo Button */}
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) => (prev - 1 + images.length) % images.length);
                  }}
                  className="absolute left-3 sm:left-6 z-20 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
                  title="Fotografia Anterioară"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Next Photo Button */}
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx((prev) => (prev + 1) % images.length);
                  }}
                  className="absolute right-3 sm:right-6 z-20 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
                  title="Fotografia Următoare"
                >
                  <ChevronRight size={24} />
                </button>
              )}

              {/* Expand Hint on Hover */}
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="px-4 py-2 rounded-full bg-black/75 backdrop-blur-md text-white text-xs font-semibold border border-white/20 flex items-center gap-2 shadow-2xl">
                  <Eye size={15} /> Vizualizează Ecran Complet
                </span>
              </div>

              {/* Photo Counter Pill */}
              <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 border border-white/15 z-10">
                <Camera size={14} /> Foto {activePhotoIdx + 1} din {images.length}
              </div>
            </div>

            {/* Thumbnail Strip */}
            <div className="flex items-center gap-3 overflow-x-auto py-2">
              {images.map((imgUrl, idx) => (
                <div 
                  key={idx}
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                    activePhotoIdx === idx 
                      ? 'border-gray-900 dark:border-white scale-105 shadow-sm' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Physical Condition & Damage Inspection Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-gray-700 dark:text-gray-300" />
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Stare Fizică & Notițe Inspecție Caroserie
                </h3>
              </div>

              {!isEditingDamage ? (
                <button
                  onClick={() => setIsEditingDamage(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Edit2 size={13} /> Modifică Notițe
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setDamageNotesText(vehicle.damage_notes || '');
                      setIsEditingDamage(false);
                    }}
                    className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Anulează
                  </button>
                  <button
                    onClick={handleSaveDamageNotes}
                    disabled={savingDamage}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-all shadow-xs"
                  >
                    {savingDamage ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    Salvează
                  </button>
                </div>
              )}
            </div>

            {isEditingDamage ? (
              <textarea
                value={damageNotesText}
                onChange={(e) => setDamageNotesText(e.target.value)}
                placeholder="Ex: Zgârietură fină bară față dreapta 3cm (remediată parțial). Fără urme de lovituri pe plafon sau praguri..."
                rows={4}
                className="w-full p-4 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-1 focus:ring-gray-400 dark:text-white"
              />
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {vehicle.damage_notes || 'Nu există daune sau zgârieturi active înregistrate. Autoturismul se află în stare estetică excelentă.'}
              </div>
            )}

            {/* Quick Inspection Matrix Checkpoints */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-700/60 flex items-center justify-between">
                <span className="text-xs text-gray-500">Caroserie & Vopsea</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Fără Zgârieturi
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-700/60 flex items-center justify-between">
                <span className="text-xs text-gray-500">Parbriz & Geamuri</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Intact Original
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-700/60 flex items-center justify-between">
                <span className="text-xs text-gray-500">Jante & Anvelope</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Profil 6.5 mm
                </span>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-gray-200 dark:border-gray-700/60 flex items-center justify-between">
                <span className="text-xs text-gray-500">Habitaclu & Piele</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Curat / Igienizat
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SERVICE & MENTENANȚĂ */}
      {activeTab === 'service' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Service, Revizii & Mentenanță Flotă</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Urmărire automată interval de service ({serviceIntervalKm.toLocaleString('ro-RO')} km) și istoric complet intervenții mecanice.
              </p>
            </div>

            <button
              onClick={() => {
                setServiceForm({
                  service_type: 'Revizie Ulei & Filtre Complexe',
                  mileage: vehicle.mileage || '',
                  cost: '650',
                  provider: `Service Partener ${vehicle.make} Autorizat`,
                  notes: 'Schimb filtre aer, habitaclu, combustibil și verificare plăcuțe frână.'
                });
                setShowAddServiceModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-all shadow-xs"
            >
              <Plus size={14} /> Înregistrează Revizie Nouă
            </button>
          </div>

          {/* Service Progress Bar Banner */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs text-gray-400 uppercase font-semibold">Monitorizare Interval Revizie</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mt-0.5 flex items-center gap-2">
                  <span>Ultima revizie la {lastServiceKm.toLocaleString('ro-RO')} km</span>
                  <span className="text-gray-300">•</span>
                  <span>Kilometraj curent: {currentMileage.toLocaleString('ro-RO')} km</span>
                </div>
              </div>

              <div className="text-right">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  isServiceOverdue 
                    ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300'
                    : isServiceNear
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  <Wrench size={13} />
                  {isServiceOverdue 
                    ? `REVIZIE DEPĂȘITĂ cu ${Math.abs(kmUntilNextService).toLocaleString('ro-RO')} km`
                    : `Revizie necesară în ${kmUntilNextService.toLocaleString('ro-RO')} km`
                  }
                </span>
              </div>
            </div>

            {/* Progress line */}
            <div className="space-y-1.5">
              <div className="w-full bg-gray-100 dark:bg-gray-700 h-3 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    isServiceOverdue ? 'bg-red-500' : isServiceNear ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${serviceProgressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>0 km (Efectuat)</span>
                <span>{kmSinceLastService.toLocaleString('ro-RO')} km parcurși de la revizie ({serviceProgressPercent}%)</span>
                <span>Plafon: {serviceIntervalKm.toLocaleString('ro-RO')} km</span>
              </div>
            </div>
          </div>

          {/* Service History Table (strictly following AGENTS.md) */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4 bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold text-gray-900 dark:text-white text-xs uppercase tracking-wider">
                Jurnal Intervenții & Mentenanță Mecanică ({serviceHistory.length})
              </h3>

              {selectedServiceRows.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
                    {selectedServiceRows.length} selectate
                  </span>
                  <button 
                    onClick={() => {
                      if (confirm(`Ștergeți ${selectedServiceRows.length} înregistrări de service?`)) {
                        const updated = serviceHistory.filter(s => !selectedServiceRows.includes(s.id));
                        updateVehicle(vehicle.id, { service_history: JSON.stringify(updated) }).then(res => {
                          setVehicle(res);
                          setSelectedServiceRows([]);
                        });
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 rounded-full hover:bg-red-100 transition-colors"
                  >
                    <Trash2 size={13} /> Bulk Delete
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 uppercase border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    {/* Checkbox (AGENTS.md) */}
                    <th className="px-4 py-3 w-12">
                      <input 
                        type="checkbox" 
                        checked={selectedServiceRows.length > 0 && selectedServiceRows.length === serviceHistory.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServiceRows(serviceHistory.map(s => s.id));
                          } else {
                            setSelectedServiceRows([]);
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-700"
                      />
                    </th>
                    {/* Nr. Crt. (AGENTS.md) */}
                    <th className="px-3 py-3 w-16">Nr. Crt.</th>
                    <th className="px-4 py-3">Data Intervenție</th>
                    <th className="px-4 py-3">Tip Revizie / Lucrare</th>
                    <th className="px-4 py-3">Kilometraj</th>
                    <th className="px-4 py-3">Cost (€)</th>
                    <th className="px-4 py-3">Unitate Service</th>
                    <th className="px-4 py-3">Observații / Piese Schimbate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 text-gray-700 dark:text-gray-300">
                  {serviceHistory.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-8 text-gray-400">
                        Nu există revizii înregistrate în jurnalul vehiculului.
                      </td>
                    </tr>
                  ) : (
                    serviceHistory.map((s, idx) => (
                      <tr key={s.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <input 
                            type="checkbox" 
                            checked={selectedServiceRows.includes(s.id)}
                            onChange={() => {
                              setSelectedServiceRows(prev => 
                                prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                              );
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-400 dark:border-gray-600 dark:bg-gray-700"
                          />
                        </td>
                        <td className="px-3 py-3 text-gray-400 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                          {s.date}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                          {s.service_type}
                        </td>
                        <td className="px-4 py-3 tabular-nums ">
                          {s.mileage?.toLocaleString('ro-RO')} km
                        </td>
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                          €{s.cost?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {s.provider}
                        </td>
                        <td className="px-4 py-3 text-gray-500 max-w-xs truncate" title={s.notes}>
                          {s.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination & Footer (AGENTS.md) */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center gap-2">
                <span>Afișează</span>
                <select 
                  value={servicePageSize}
                  onChange={(e) => setServicePageSize(parseInt(e.target.value, 10))}
                  className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 text-xs"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>pe pagină</span>
              </div>

              <div>Total: {serviceHistory.length} intervenții</div>

              <div className="flex items-center gap-2">
                <span>Pagină {servicePage} din 1</span>
                <div className="flex items-center gap-1">
                  <button disabled className="p-1 border rounded-md disabled:opacity-40"><ChevronLeft size={13} /></button>
                  <button disabled className="p-1 border rounded-md disabled:opacity-40"><ChevronRight size={13} /></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: TELEMETRIE GPS & AUDIT KILOMETRAJ (CONTRACT LIVE) */}
      {activeTab === 'gps' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Telemetrie Live CAN-bus & Audit Kilometric</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Poziție satelitară în timp real, audit kilometraj contract și comenzi la distanță pentru securitatea activului.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerRemoteCommand('REFRESH')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw size={13} /> Sincronizează CAN-bus
              </button>
            </div>
          </div>

          {remoteCommandFeedback && (
            <div className="p-3.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-2xl text-xs font-medium flex items-center gap-2 shadow-sm animate-in fade-in duration-200">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
              <span>{remoteCommandFeedback}</span>
            </div>
          )}

          {/* Top GPS Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Live Location Card */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase">Poziție GPS Curentă</span>
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span> Live Satelit
                </span>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-2xl text-gray-700 dark:text-gray-200 shrink-0">
                  <Navigation size={18} />
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">
                    {telemetryState.locationAddress}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Coordonate: 44.4829° N, 26.0841° E • Actualizat {telemetryState.lastUpdate}
                  </div>
                </div>
              </div>
            </div>

            {/* Engine & Ignition Status */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase">Contact & Demaror</span>
                <span className="text-[11px] font-bold text-gray-500">CAN Bus v2.1</span>
              </div>
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-2xl shrink-0 ${
                  telemetryState.immobilizerActive 
                    ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                }`}>
                  <Key size={18} />
                </div>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white text-sm">
                    {telemetryState.engineStatus}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    Nivel Combustibil: {telemetryState.fuelLevel}% • Baterie: {telemetryState.batteryVoltage}V
                  </div>
                </div>
              </div>
            </div>

            {/* Remote Immobilizer Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm space-y-3">
              <div className="text-xs font-semibold text-gray-400 uppercase">Comenzi Securitate Telemetrică</div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => triggerRemoteCommand('CAN_CUT')}
                  className={`flex-1 py-2 px-3 rounded-full text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                    telemetryState.immobilizerActive
                      ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800 hover:bg-red-100'
                  }`}
                >
                  <Lock size={13} />
                  {telemetryState.immobilizerActive ? 'Deblochează Demaror' : 'Imobilizare CAN-bus'}
                </button>

                <button
                  onClick={() => triggerRemoteCommand('HORN')}
                  className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  title="Activează Avarii și Semnal Sonor"
                >
                  <Activity size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Contract Odometer Audit Card */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-5">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Audit Kilometraj Contract (Live Rent Odometer)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Calcul automat al depășirii plafonului de kilometri contractat pe durata închirierii curente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/80">
                <div className="text-[11px] text-gray-400 uppercase font-semibold">Kilometraj la Plecare</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {startKm.toLocaleString('ro-RO')} km
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Consemnat în Procesul Verbal</div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/80">
                <div className="text-[11px] text-gray-400 uppercase font-semibold">Plafon Lunar Inclus</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {kmAllowance.toLocaleString('ro-RO')} km
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Conform Clauzei Contractuale</div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/80">
                <div className="text-[11px] text-gray-400 uppercase font-semibold">Rulați în Contract</div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {currentContractKm.toLocaleString('ro-RO')} km
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">Sincronizat prin GPS Odometru</div>
              </div>

              <div className={`p-4 rounded-2xl border ${
                excessKm > 0 
                  ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
              }`}>
                <div className="text-[11px] uppercase font-semibold text-gray-500">Depășire Plafon & Cost</div>
                <div className={`text-lg font-extrabold mt-1 ${excessKm > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  {excessKm > 0 ? `+${excessKm.toLocaleString('ro-RO')} km` : 'În Plafon (0 km)'}
                </div>
                <div className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                  {excessKm > 0 ? `Cost suplimentar facturabil: €${totalExtraCost}` : 'Fără penalități aplicabile'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SPECIFICAȚII COMPLETE & FIȘĂ TEHNICĂ */}
      {activeTab === 'specs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Fișă Tehnică & Dotări Opționale</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Parametrii constructivi, motorizare, transmisie, tren de rulare și pachete opționale incluse.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Printer size={13} /> Imprimă Fișă Tehnică
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tech Specs Table */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">
                Date Motor & Transmisie
              </h3>

              <div className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">Marcă & Model</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{vehicle.make} {vehicle.model}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">An Fabricație</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{vehicle.year}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">Serie Șasiu (VIN)</span>
                  <span className=" font-semibold text-gray-900 dark:text-white">{vehicle.vin}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">Combustibil</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{vehicle.engine_type}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">Putere Motor</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{specs.engine_power_hp} CP</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">Capacitate Cilindrică</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{specs.displacement_cc} cm³</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">Cutie de Viteze</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{specs.transmission_gears}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">Tracțiune</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{specs.drivetrain}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">Consum Mixt Omologat</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{specs.fuel_consumption_mixed}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-gray-400">Culoare Caroserie</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{vehicle.color || 'Vopsea Metalizată'}</span>
                </div>
              </div>
            </div>

            {/* Equipment & Features */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">
                Pachete & Dotări Incluse
              </h3>

              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  'Faruri LED High Performance / Matrix',
                  'Sistem Navigație cu Diagnoză Live',
                  'Scaune Încălzite și Ventilate',
                  'Tapițerie Piele Nappa',
                  'Trapă Panoramică Glisantă',
                  'Pachet Asistență la Conducere & Distronic',
                  'Cameră Video 360° Surround View',
                  'Senzori Parcare Față/Spate Parktronic',
                  'Climatizare Automată Multi-Zonă',
                  'Apple CarPlay & Android Auto Wireless',
                  'Suspensie Pneumatică Reglabilă',
                  'Pachet AMG Line / M Sport Exterior'
                ].map((feat, idx) => (
                  <span 
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                  >
                    <Check size={12} className="text-emerald-500" /> {feat}
                  </span>
                ))}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 mt-4 space-y-2">
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Condiții Financiare & Asigurare Flotă
                </div>
                <div className="text-[11px] text-gray-500 space-y-1">
                  <div>• CASCO Gold cu decontare directă și franșiză inclusă în pachetul de leasing.</div>
                  <div>• Asistență rutieră 24/7 pe tot teritoriul Uniunii Europene.</div>
                  <div>• Vehicul la schimb garantat în maxim 4 ore în caz de imobilizare în service.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL (OFFICIAL ROMANIAN ACT RENDERING) */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden flex flex-col my-8">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full">
                  <FileCheck size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                    {previewDoc.name}
                  </h3>
                  <p className="text-[11px] text-gray-500 ">
                    Serie: {previewDoc.series} • {previewDoc.file_type || 'PDF'} ({previewDoc.file_size || '1.8 MB'})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPreviewDoc(null)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Official Document Simulated Certificate Sheet */}
            <div className="p-6 overflow-y-auto space-y-6 max-h-[70vh]">
              {/* Document Certificate Frame */}
              <div className="border-2 border-gray-800 dark:border-gray-600 rounded-2xl p-6 bg-amber-50/20 dark:bg-gray-800/40 relative shadow-inner">
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5">
                  <div className="text-6xl font-black rotate-[-25deg] text-gray-900 dark:text-white tracking-widest uppercase">
                    AXIS FLEET
                  </div>
                </div>

                {/* Top Emblems & Header */}
                <div className="text-center border-b border-gray-300 dark:border-gray-700 pb-4 mb-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    ROMÂNIA • DOSAR OFICIAL ÎNREGISTRARE PARC AUTO
                  </div>
                  <div className="text-lg font-extrabold text-gray-900 dark:text-white mt-1">
                    {previewDoc.name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Deținător: <span className="font-semibold text-gray-900 dark:text-white">AXIS MOBILITY S.R.L.</span> (CUI RO41298450)
                  </div>
                </div>

                {/* Fields Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Număr Înmatriculare</span>
                    <span className="font-bold text-gray-900 dark:text-white text-sm ">{vehicle.license_plate}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Serie Șasiu (VIN)</span>
                    <span className="font-bold text-gray-900 dark:text-white ">{vehicle.vin}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Marcă & Tip Vehicul</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{vehicle.make} {vehicle.model} ({vehicle.year})</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Serie Document / Certificat</span>
                    <span className="font-semibold text-gray-900 dark:text-white ">{previewDoc.series}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Emitent / Asigurător</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {previewDoc.insurer || previewDoc.issuer || previewDoc.station || 'Compania Națională de Drumuri (CNAIR)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Valabilitate</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {previewDoc.expiry_date ? `Până la ${previewDoc.expiry_date}` : 'Permanent (Conform C.I.V.)'}
                    </span>
                  </div>
                  {previewDoc.deductible && (
                    <div className="col-span-2">
                      <span className="text-gray-400 block text-[10px] uppercase">Clauză Franșiză CASCO</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{previewDoc.deductible}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Verification Seal */}
                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-[11px] text-gray-400">
                  <div>Status Document: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">VALID ȘI CONFORM</strong></div>
                  <div className="">ID Verificare: AXIS-{vehicle.id}-{previewDoc.type}</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Printer size={14} /> Imprimă Act
              </button>

              <button
                onClick={() => {
                  alert(`Se descarcă documentul ${previewDoc.name} (${previewDoc.series})...`);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full text-xs font-semibold hover:opacity-90 transition-all shadow-xs"
              >
                <Download size={14} /> Descarcă PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT EDIT / RENEW MODAL */}
      {docModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden flex flex-col my-8">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-gray-900 dark:text-white" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  Reînnoire / Editare Act: {docModal.type}
                </h3>
              </div>
              <button onClick={() => setDocModal(null)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveDocModal} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Denumire Document</label>
                <input
                  type="text"
                  value={docModal.name || ''}
                  onChange={(e) => setDocModal({ ...docModal, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Serie / Număr Poliță</label>
                <input
                  type="text"
                  value={docModal.series || ''}
                  onChange={(e) => setDocModal({ ...docModal, series: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl "
                />
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Asigurător / Emitent</label>
                <input
                  type="text"
                  value={docModal.insurer || docModal.issuer || ''}
                  onChange={(e) => setDocModal({ ...docModal, insurer: e.target.value, issuer: e.target.value })}
                  placeholder="Ex: Allianz-Țiriac Asigurări / DRPCIV"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Data Expirare / Scadență</label>
                <input
                  type="date"
                  value={docModal.expiry_date || ''}
                  onChange={(e) => setDocModal({ ...docModal, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                />
              </div>

              {docModal.type === 'CASCO' && (
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Franșiză CASCO</label>
                  <input
                    type="text"
                    value={docModal.deductible || ''}
                    onChange={(e) => setDocModal({ ...docModal, deductible: e.target.value })}
                    placeholder="Ex: €150 (Franșiză daune parțiale)"
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDocModal(null)}
                  className="px-4 py-2 border rounded-full text-gray-600 dark:text-gray-300"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={savingDoc}
                  className="px-5 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full font-semibold"
                >
                  {savingDoc ? 'Se salvează...' : 'Salvează Act'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NEW SERVICE MODAL */}
      {showAddServiceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden flex flex-col my-8">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench size={18} className="text-gray-900 dark:text-white" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  Înregistrează Revizie / Lucrare Service
                </h3>
              </div>
              <button onClick={() => setShowAddServiceModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddServiceSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Tip Intervenție</label>
                <select
                  value={serviceForm.service_type}
                  onChange={(e) => setServiceForm({ ...serviceForm, service_type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                >
                  <option value="Revizie Ulei & Filtre Complexe">Revizie Ulei & Filtre Complexe</option>
                  <option value="Înlocuire Plăcuțe & Discuri Frână">Înlocuire Plăcuțe & Discuri Frână</option>
                  <option value="Schimb Lichid Frână & Antigel">Schimb Lichid Frână & Antigel</option>
                  <option value="Diagnoză & Schimb Baterie 12V">Diagnoză & Schimb Baterie 12V</option>
                  <option value="Geometrie & Echilibrare Roți">Geometrie & Echilibrare Roți</option>
                  <option value="Reparație Tren Rulare / Articulații">Reparație Tren Rulare / Articulații</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Kilometraj la Revizie</label>
                  <input
                    type="number"
                    value={serviceForm.mileage}
                    onChange={(e) => setServiceForm({ ...serviceForm, mileage: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Cost (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={serviceForm.cost}
                    onChange={(e) => setServiceForm({ ...serviceForm, cost: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Furnizor / Service Autorizat</label>
                <input
                  type="text"
                  value={serviceForm.provider}
                  onChange={(e) => setServiceForm({ ...serviceForm, provider: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Observații & Piese</label>
                <textarea
                  value={serviceForm.notes}
                  onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Ex: Factura seria AXIS-SRV nr. 9412. Ulei original conform specificației producătorului."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddServiceModal(false)}
                  className="px-4 py-2 border rounded-full text-gray-600 dark:text-gray-300"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={savingService}
                  className="px-5 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full font-semibold"
                >
                  {savingService ? 'Se înregistrează...' : 'Adaugă în Jurnal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK EDIT VEHICLE MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden flex flex-col my-8">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 size={18} className="text-gray-900 dark:text-white" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  Editează Date Autovehicul
                </h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveVehicleEdit} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Marcă</label>
                  <input
                    type="text"
                    value={editFormData.make || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, make: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Model</label>
                  <input
                    type="text"
                    value={editFormData.model || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, model: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Număr Înmat.</label>
                  <input
                    type="text"
                    value={editFormData.license_plate || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, license_plate: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl uppercase"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">An Fabricație</label>
                  <input
                    type="number"
                    value={editFormData.year || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, year: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Status</label>
                  <select
                    value={editFormData.status || 'Disponibil'}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                  >
                    <option value="Disponibil">Disponibil</option>
                    <option value="Închiriat">Închiriat</option>
                    <option value="În Service">În Service</option>
                    <option value="Rezervat">Rezervat</option>
                    <option value="Daună">Daună</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Kilometraj Actual</label>
                  <input
                    type="number"
                    value={editFormData.mileage || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, mileage: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">Tarif Lunar (€/lună)</label>
                  <input
                    type="number"
                    value={editFormData.rental_price_long_term || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, rental_price_long_term: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border rounded-full text-gray-600 dark:text-gray-300"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={savingVehicle}
                  className="px-5 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full font-semibold"
                >
                  {savingVehicle ? 'Se salvează...' : 'Salvează Modificări'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHOTO LIGHTBOX MODAL - FULLSCREEN PORTAL WITH LUXURY NAVIGATION */}
      {isPhotoLightboxOpen && createPortal(
        <div 
          onClick={() => setIsPhotoLightboxOpen(false)}
          className="fixed inset-0 z-[99999] bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none overflow-hidden"
          style={{ width: '100vw', height: '100vh', margin: 0 }}
        >
          {/* Top Control Bar */}
          <div className="relative z-30 flex items-center justify-between gap-4 w-full max-w-7xl mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base sm:text-lg tracking-tight">
                  {vehicle.make} {vehicle.model}
                </span>
                <span className="text-white/60 text-xs hidden sm:inline">({vehicle.year})</span>
              </div>

              {/* License Plate Badge */}
              <div className="inline-flex items-center rounded-md border border-white/20 bg-white text-gray-900 font-bold text-xs h-6 overflow-hidden shadow-sm">
                <span className="bg-blue-700 text-white px-1.5 h-full flex items-center justify-center text-[8px] font-black leading-none">RO</span>
                <span className="px-2 py-0.5 tracking-wider">{vehicle.license_plate}</span>
              </div>

              {/* Photo Counter */}
              <span className="px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold backdrop-blur-md border border-white/15">
                Foto {activePhotoIdx + 1} din {images.length}
              </span>
            </div>

            {/* Prominent Close Button */}
            <button
              type="button"
              onClick={() => setIsPhotoLightboxOpen(false)}
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
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx((prev) => (prev - 1 + images.length) % images.length);
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
                key={activePhotoIdx}
                src={images[activePhotoIdx] || images[0]} 
                alt={`${vehicle.make} ${vehicle.model} - foto ${activePhotoIdx + 1}`} 
                className="max-w-full max-h-[72vh] md:max-h-[78vh] object-contain rounded-2xl shadow-2xl transition-all duration-200 animate-in zoom-in-95"
              />
            </div>

            {/* Next Photo Button */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActivePhotoIdx((prev) => (prev + 1) % images.length);
                }}
                className="absolute right-2 sm:right-4 z-20 p-3 sm:p-4 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md transition-all hover:scale-110 active:scale-95 shadow-2xl cursor-pointer"
                title="Fotografia Următoare (Săgeată Dreapta)"
              >
                <ChevronRight size={28} />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {images.length > 1 && (
            <div className="relative z-30 flex items-center justify-center gap-2 sm:gap-3 overflow-x-auto py-2 px-4 max-w-4xl mx-auto" onClick={(e) => e.stopPropagation()}>
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePhotoIdx(idx);
                  }}
                  className={`relative w-16 sm:w-20 h-11 sm:h-13 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    activePhotoIdx === idx 
                      ? 'border-white scale-105 shadow-xl ring-2 ring-white/30 opacity-100' 
                      : 'border-transparent opacity-50 hover:opacity-90'
                  }`}
                >
                  <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}

      {/* ADD PHOTO MODAL */}
      {showAddPhotoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Adaugă Fotografie la Galerie</h3>
              <button onClick={() => setShowAddPhotoModal(false)} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddPhoto} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-600 dark:text-gray-300 font-medium mb-1">URL Fotografie HD</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPhotoModal(false)}
                  className="px-4 py-2 border rounded-full text-gray-600 dark:text-gray-300"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full font-semibold"
                >
                  Adaugă în Galerie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VEHICLE RESERVATION & PREMATURE UNLOCK MODAL */}
      <VehicleReservationModal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
        vehicle={vehicle}
        onReservationUpdated={handleReservationUpdated}
      />
    </div>
  );
};

export default VehicleDetails;

