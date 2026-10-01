import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Calendar, Clock, Phone, Mail, MessageSquare, User, Building, 
  CheckCircle2, AlertTriangle, Unlock, Lock, ExternalLink, Copy, 
  Check, ArrowRight, ShieldAlert, Sparkles, RefreshCw, Edit3
} from 'lucide-react';
import { reserveVehicle, unreserveVehicle, fetchClients } from '../services/api';

const parseJsonSafe = (str, fallback) => {
  if (!str) return fallback;
  if (typeof str === 'object') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback;
  }
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return 'Nespecificat';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
};

const getRelativeTimeDisplay = (targetDateStr) => {
  if (!targetDateStr) return null;
  const target = new Date(targetDateStr).getTime();
  const now = Date.now();
  const diffMs = target - now;

  if (diffMs <= 0) {
    return { text: 'Expirată (Termen depășit)', isExpired: true, color: 'text-red-600 bg-red-50 dark:bg-red-950/40 border-red-200' };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  const remHours = diffHours % 24;

  if (diffDays > 0) {
    return { 
      text: `Activă • Mai sunt ${diffDays} ${diffDays === 1 ? 'zi' : 'zile'} și ${remHours}h`, 
      isExpired: false, 
      color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' 
    };
  }

  return { 
    text: `Activă • Expiră în ${diffHours} ore`, 
    isExpired: false, 
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' 
  };
};

const VehicleReservationModal = ({ 
  isOpen, 
  onClose, 
  vehicle, 
  onReservationUpdated,
  currentUser = 'Eugeniu Cazmal'
}) => {
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedType, setCopiedType] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  
  // Existing reservation details parsed from vehicle
  const currentReservation = useMemo(() => {
    return parseJsonSafe(vehicle?.reservation_details, null);
  }, [vehicle]);

  const isAlreadyReserved = vehicle?.status === 'Rezervat' || !!currentReservation;

  // View Mode: 'view' (Active reservation card) or 'edit' (Reservation form)
  const [isEditMode, setIsEditMode] = useState(!isAlreadyReserved);

  // Form State
  const [formData, setFormData] = useState({
    client_name: '',
    client_type: 'PJ',
    client_id: null,
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    reserved_by: currentUser || 'Eugeniu Cazmal',
    reserved_until: '',
    reason: 'Analiză dosar leasing & așteptare decizie scoring',
    notes: 'Contactează clientul pentru posibilitate deblocare prematură dacă un alt client depune garanție.'
  });

  // Load clients on modal mount
  useEffect(() => {
    if (!isOpen) return;
    fetchClients()
      .then(data => {
        if (Array.isArray(data)) setClients(data);
      })
      .catch(() => {});
  }, [isOpen]);

  // Sync form with current reservation or initial values
  useEffect(() => {
    if (!isOpen || !vehicle) return;

    if (currentReservation) {
      setFormData({
        client_name: currentReservation.client_name || '',
        client_type: currentReservation.client_type || 'PJ',
        client_id: currentReservation.client_id || null,
        contact_person: currentReservation.contact_person || '',
        contact_phone: currentReservation.contact_phone || '',
        contact_email: currentReservation.contact_email || '',
        reserved_by: currentReservation.reserved_by || currentUser || 'Eugeniu Cazmal',
        reserved_until: currentReservation.reserved_until || '',
        reason: currentReservation.reason || 'Analiză dosar leasing operațional',
        notes: currentReservation.notes || ''
      });
      setIsEditMode(false);
    } else {
      // Default expiration date: +48h from now (at 18:00)
      const d = new Date();
      d.setDate(d.getDate() + 2);
      d.setHours(18, 0, 0, 0);
      const defaultUntil = d.toISOString().slice(0, 16);

      setFormData({
        client_name: '',
        client_type: 'PJ',
        client_id: null,
        contact_person: '',
        contact_phone: '',
        contact_email: '',
        reserved_by: currentUser || 'Eugeniu Cazmal',
        reserved_until: defaultUntil,
        reason: 'Ofertă leasing în negociere & test drive',
        notes: 'Vehiculul poate fi deblocat prematur dacă se renunță sau dacă apare cerere prioritară.'
      });
      setIsEditMode(true);
    }
  }, [isOpen, vehicle, currentReservation, currentUser]);

  // Filter clients by search term
  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients.slice(0, 6);
    const q = clientSearch.toLowerCase();
    return clients.filter(c => 
      (c.name || '').toLowerCase().includes(q) ||
      (c.cui_cnp || '').includes(q) ||
      (c.representative_name || '').toLowerCase().includes(q)
    ).slice(0, 6);
  }, [clients, clientSearch]);

  const handleSelectClient = (c) => {
    setFormData(prev => ({
      ...prev,
      client_name: c.name || '',
      client_type: c.type || 'PJ',
      client_id: c.id,
      contact_person: c.representative_name || '',
      contact_phone: c.contact_phone || '',
      contact_email: c.contact_email || ''
    }));
    setClientSearch('');
    setShowClientDropdown(false);
  };

  const handleApplyPresetUntil = (hoursToAdd) => {
    const d = new Date();
    d.setHours(d.getHours() + hoursToAdd);
    // Align to nearest hour
    d.setMinutes(0, 0, 0);
    setFormData(prev => ({ ...prev, reserved_until: d.toISOString().slice(0, 16) }));
  };

  const handleCopy = (text, type) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Submit Reservation (Reserve / Update)
  const handleSubmitReservation = async (e) => {
    e.preventDefault();
    if (!formData.client_name) {
      alert('Vă rugăm să specificați numele clientului sau al companiei.');
      return;
    }
    if (!formData.reserved_until) {
      alert('Vă rugăm să specificați data și ora expirării rezervării.');
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg('');
    try {
      const payload = {
        ...formData,
        reserved_at: currentReservation?.reserved_at || new Date().toISOString()
      };
      const updated = await reserveVehicle(vehicle.id, payload);
      setFeedbackMsg('Rezervarea a fost salvată cu succes!');
      if (onReservationUpdated) onReservationUpdated(updated);
      setTimeout(() => {
        setIsEditMode(false);
        setFeedbackMsg('');
      }, 800);
    } catch (err) {
      alert('Eroare la salvarea rezervării: ' + (err.message || 'Verificați conexiunea.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Premature Unlock (Deblocare Prematură -> Disponibil)
  const handlePrematureUnlock = async () => {
    const confirmMsg = `Sunteți sigur că doriți DEBLOCAREA PREMATURĂ a vehiculului ${vehicle?.make} ${vehicle?.model} (${vehicle?.license_plate})?\n\nVehiculul va deveni imediat DISPONIBIL în flotă pentru toți clienții.`;
    if (!window.confirm(confirmMsg)) return;

    setIsSubmitting(true);
    setFeedbackMsg('');
    try {
      const updated = await unreserveVehicle(vehicle.id);
      setFeedbackMsg('Vehiculul a fost deblocat prematur și este acum DISPONIBIL!');
      if (onReservationUpdated) onReservationUpdated(updated);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      alert('Eroare la deblocarea vehiculului: ' + (err.message || 'Verificați conexiunea.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // WhatsApp link generator
  const getWhatsAppLink = () => {
    const rawPhone = (formData.contact_phone || currentReservation?.contact_phone || '').replace(/[^0-9]/g, '');
    let fullPhone = rawPhone;
    if (fullPhone.startsWith('0') && fullPhone.length === 10) {
      fullPhone = '4' + fullPhone;
    }
    const clientName = formData.contact_person || formData.client_name || 'Client';
    const vehicleStr = `${vehicle?.make} ${vehicle?.model} (${vehicle?.license_plate})`;
    const text = encodeURIComponent(
      `Bună ziua ${clientName}! Vă contactăm de la Axis Rent & Leasing referitor la autoturismul rezervat ${vehicleStr}. Dorim să verificăm statusul dosarului sau eventuala eliberare anticipată a mașinii dacă cerințele dvs. s-au modificat. Vă mulțumim!`
    );
    return `https://wa.me/${fullPhone}?text=${text}`;
  };

  // Mailto link generator
  const getMailtoLink = () => {
    const email = formData.contact_email || currentReservation?.contact_email || '';
    const subject = encodeURIComponent(`Axis Rent - Status Rezervare ${vehicle?.make} ${vehicle?.model} [${vehicle?.license_plate}]`);
    const body = encodeURIComponent(
      `Bună ziua ${formData.contact_person || formData.client_name || ''},\n\nVă contactăm din partea echipei Axis Rent referitor la rezervarea autovehiculului ${vehicle?.make} ${vehicle?.model}, având numărul de înmatriculare ${vehicle?.license_plate}.\n\nÎn vederea optimizării disponibilității flotei și a deblocării premature în cazul în care dosarul dvs. a suferit modificări, vă rugăm să ne confirmați dacă mențineți rezervarea activă până la data agreată.\n\nCu stimă,\n${formData.reserved_by || currentUser}\nAxis Mobility Platform`
    );
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  if (!isOpen || !vehicle) return null;

  const relStatus = getRelativeTimeDisplay(formData.reserved_until || currentReservation?.reserved_until);

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-950/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-xl w-full border border-gray-200 dark:border-gray-700 overflow-hidden my-6 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/80 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-lg shadow-xs ${
              isAlreadyReserved && !isEditMode 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
            }`}>
              <Lock size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                  {isAlreadyReserved && !isEditMode ? 'Gestiune Rezervare Activă' : 'Rezervare Autoturism Flotă'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {vehicle.make} {vehicle.model}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2 ">
                <span className="font-bold text-gray-800 dark:text-gray-200">{vehicle.license_plate}</span>
                <span>•</span>
                <span>VIN: {vehicle.vin?.slice(0, 11)}...</span>
              </div>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Feedback message banner if any */}
        {feedbackMsg && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} /> {feedbackMsg}
          </div>
        )}

        {/* Body Container */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs">
          
          {/* ============================================================== */}
          {/* VIEW MODE: ACTIVE RESERVATION CARD (DEBLOCARE & CONTACT RAPID) */}
          {/* ============================================================== */}
          {isAlreadyReserved && !isEditMode ? (
            <div className="space-y-5">
              {/* Expiration Banner */}
              {relStatus && (
                <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${relStatus.color}`}>
                  <div className="flex items-center gap-2.5">
                    <Clock size={18} className="shrink-0" />
                    <div>
                      <span className="font-bold block text-sm">{relStatus.text}</span>
                      <span className="text-[11px] opacity-80">
                        Blocat până la: <strong className="font-semibold">{formatDateDisplay(formData.reserved_until)}</strong>
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/60 dark:bg-black/30 border border-current">
                    {relStatus.isExpired ? 'Expirat' : 'Blocat'}
                  </span>
                </div>
              )}

              {/* Client & Booking Identity Card */}
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200/80 dark:border-gray-700/80">
                  <div className="flex items-center gap-2">
                    {formData.client_type === 'PJ' ? <Building size={16} className="text-gray-500" /> : <User size={16} className="text-gray-500" />}
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Beneficiar Rezervare ({formData.client_type === 'PJ' ? 'Persoană Juridică' : 'Persoană Fizică'})
                      </div>
                      <h4 className="text-base font-extrabold text-gray-900 dark:text-white mt-0.5">
                        {formData.client_name || 'Nespecificat'}
                      </h4>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {formData.client_type}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Contact Person */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Persoană de Contact</label>
                    <div className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                      {formData.contact_person || 'Nespecificată'}
                    </div>
                  </div>

                  {/* Reserved By Agent */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Rezervat de către</label>
                    <div className="font-semibold text-gray-800 dark:text-gray-200 text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      {formData.reserved_by || currentUser}
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Telefon Mobil</label>
                    <div className="flex items-center gap-2">
                      <span className=" font-bold text-gray-900 dark:text-white text-xs">
                        {formData.contact_phone || 'Fără număr'}
                      </span>
                      {formData.contact_phone && (
                        <button
                          type="button"
                          onClick={() => handleCopy(formData.contact_phone, 'phone')}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700"
                          title="Copiază numărul"
                        >
                          {copiedType === 'phone' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Adresă Email</label>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 dark:text-gray-200 text-xs truncate max-w-[180px]">
                        {formData.contact_email || 'Fără email'}
                      </span>
                      {formData.contact_email && (
                        <button
                          type="button"
                          onClick={() => handleCopy(formData.contact_email, 'email')}
                          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-700"
                          title="Copiază email"
                        >
                          {copiedType === 'email' ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reason & Notes */}
                {(formData.reason || formData.notes) && (
                  <div className="pt-3 border-t border-gray-200/80 dark:border-gray-700/80 space-y-1.5">
                    {formData.reason && (
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        <strong className="font-bold text-gray-900 dark:text-white">Motiv:</strong> {formData.reason}
                      </div>
                    )}
                    {formData.notes && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
                        <strong className="font-bold">Notițe eliberare prematură:</strong> {formData.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quick Communication & Contact Buttons */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                  Contactează Clientul în vederea deblocării premature:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Phone Call */}
                  <a
                    href={formData.contact_phone ? `tel:${formData.contact_phone}` : '#'}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all shadow-2xs ${
                      formData.contact_phone 
                        ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700' 
                        : 'opacity-40 pointer-events-none border-gray-200'
                    }`}
                  >
                    <Phone size={14} className="text-emerald-500" />
                    <span>Apelează Mobil</span>
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={formData.contact_phone ? getWhatsAppLink() : '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all shadow-2xs ${
                      formData.contact_phone 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800' 
                        : 'opacity-40 pointer-events-none border-gray-200'
                    }`}
                  >
                    <MessageSquare size={14} className="text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>

                  {/* Email */}
                  <a
                    href={formData.contact_email ? getMailtoLink() : '#'}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all shadow-2xs ${
                      formData.contact_email 
                        ? 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700' 
                        : 'opacity-40 pointer-events-none border-gray-200'
                    }`}
                  >
                    <Mail size={14} className="text-blue-500" />
                    <span>Trimite Email</span>
                  </a>
                </div>
              </div>

              {/* Action Buttons: Deblochează Prematur & Editează */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Edit3 size={14} /> Modifică / Prelungește
                </button>

                <button
                  type="button"
                  onClick={handlePrematureUnlock}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 hover:scale-102 active:scale-98 cursor-pointer disabled:opacity-50"
                  title="Eliberează vehiculul și trece-l imediat pe Disponibil"
                >
                  {isSubmitting ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Unlock size={15} />
                  )}
                  <span>Deblochează Prematur (Trece pe Disponibil)</span>
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* EDIT / CREATE MODE: RESERVATION FORM                          */
            /* ============================================================== */
            <form onSubmit={handleSubmitReservation} className="space-y-4">
              
              {/* Type Switcher: PJ vs PF */}
              <div className="flex items-center gap-3">
                <label className="font-bold text-gray-700 dark:text-gray-300">Tip Beneficiar:</label>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/80 p-1 rounded-full border border-gray-200 dark:border-gray-600">
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, client_type: 'PJ' }))}
                    className={`px-3 py-1 rounded-full font-bold transition-all ${
                      formData.client_type === 'PJ' 
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs' 
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Companie (PJ)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, client_type: 'PF' }))}
                    className={`px-3 py-1 rounded-full font-bold transition-all ${
                      formData.client_type === 'PF' 
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-xs' 
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    Persoană Fizică (PF)
                  </button>
                </div>
              </div>

              {/* Quick Select from existing Axis Clients */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-gray-700 dark:text-gray-300">
                    Alege din Baza de Clienți Axis sau Scrie Manual:
                  </label>
                  <span className="text-[10px] text-gray-400">Sugestii automate</span>
                </div>
                <input
                  type="text"
                  placeholder="Caută după nume firmă sau persoană..."
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 focus:ring-2 focus:ring-indigo-500 dark:text-white"
                />

                {showClientDropdown && filteredClients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto p-1.5 space-y-1">
                    {filteredClients.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectClient(c)}
                        className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white text-xs">{c.name}</div>
                          <div className="text-[10px] text-gray-400">
                            {c.cui_cnp ? `CUI/CNP: ${c.cui_cnp}` : ''} {c.representative_name ? `• Contact: ${c.representative_name}` : ''}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 font-semibold">
                          {c.type || 'PJ'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Input Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Client / Company Name */}
                <div className="sm:col-span-2">
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nume {formData.client_type === 'PJ' ? 'Companie / Firmă' : 'Persoană Fizică'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: SC Logistics Trans Express SRL"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900/80 dark:text-white font-semibold"
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Persoană de Contact (Delegat / Reprezentant)
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Andrei Vasilescu"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900/80 dark:text-white"
                  />
                </div>

                {/* Reserved by Agent */}
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rezervat de către (Agent / Utilizator Axis) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.reserved_by}
                    onChange={(e) => setFormData({ ...formData, reserved_by: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900/80 dark:text-white font-medium"
                  />
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Număr Telefon Mobil (Apel & WhatsApp)
                  </label>
                  <input
                    type="tel"
                    placeholder="ex: +40 722 123 456"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900/80 dark:text-white "
                  />
                </div>

                {/* Contact Email */}
                <div>
                  <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Adresă Email Notificare
                  </label>
                  <input
                    type="email"
                    placeholder="ex: contact@client.ro"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900/80 dark:text-white"
                  />
                </div>
              </div>

              {/* Reserved Until: Datetime & Presets */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Clock size={15} className="text-indigo-600" /> Rezervat Până la (Data & Ora Limită) *
                  </label>
                  <span className="text-[10px] text-gray-400">Timp maxim garantat</span>
                </div>

                <input
                  type="datetime-local"
                  required
                  value={formData.reserved_until}
                  onChange={(e) => setFormData({ ...formData, reserved_until: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white text-xs"
                />

                {/* Quick Presets */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[10px] text-gray-400 font-semibold">Preset rapid:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetUntil(24)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    +24 Ore
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetUntil(48)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    +48 Ore
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetUntil(120)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    +5 Zile
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPresetUntil(168)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                  >
                    +7 Zile
                  </button>
                </div>
              </div>

              {/* Reason & Notes */}
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Motiv Rezervare / Notițe Deblocare Prematură
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ex: Clientul analizează oferta; dacă apare un alt client cu plată imediată, se poate contacta pentru eliberare anticipată..."
                  className="w-full px-3.5 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900/80 dark:text-white text-xs"
                />
              </div>

              {/* Form Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
                {isAlreadyReserved && (
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className="px-4 py-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Anulează
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-full font-bold hover:opacity-90 transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <RefreshCw size={14} className="animate-spin" />}
                  <span>{isAlreadyReserved ? 'Actualizează Rezervarea' : 'Setează Vehiculul pe Rezervat'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default VehicleReservationModal;
