import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, UserPlus, Mail, User, Briefcase, CheckCircle2, AlertCircle, 
  Copy, Check, Clock, Trash2, ExternalLink, RefreshCw, Send, Shield
} from 'lucide-react';
import { createInvitation, fetchInvitations, revokeInvitation } from '../services/api';

const ROLES = [
  { value: 'Super Admin', label: 'Super Admin (Acces Total & Administrare)' },
  { value: 'Axis Manager', label: 'Axis Manager (Management Flotă & Risc)' },
  { value: 'Axis Analyst', label: 'Axis Analyst (Scoring & Comitet Credit)' },
  { value: 'Dealer Manager', label: 'Dealer Manager (Partener Auto)' },
  { value: 'Dealer Sales', label: 'Dealer Sales (Consilier Vânzări)' }
];

const InviteMemberModal = ({ isOpen, onClose, currentUser }) => {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'list'
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'Dealer Sales'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [copied, setCopied] = useState(false);

  // List of invitations
  const [invitations, setInvitations] = useState([]);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSuccessData(null);
      setError(null);
      return;
    }
    loadInvitations();
  }, [isOpen]);

  const loadInvitations = async () => {
    setLoadingList(true);
    try {
      const data = await fetchInvitations();
      if (Array.isArray(data)) setInvitations(data);
    } catch (err) {
      console.error('Error fetching invitations:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const handleCreateInvitation = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessData(null);

    if (!formData.fullName.trim() || !formData.email.trim()) {
      setError('Vă rugăm să completați numele complet și adresa de email.');
      return;
    }

    setLoading(true);
    try {
      const result = await createInvitation({
        full_name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role
      });
      setSuccessData(result);
      setFormData({ fullName: '', email: '', role: 'Dealer Sales' });
      loadInvitations();
    } catch (err) {
      setError(err.message || 'Eroare la generarea invitației.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (link) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Sigur doriți să revocați această invitație?')) return;
    try {
      await revokeInvitation(id);
      loadInvitations();
    } catch (err) {
      alert('Eroare la revocare: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-gray-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200/90 dark:border-gray-800 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/70 dark:bg-gray-900/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                Invită Utilizator Nou în Axis
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Înregistrare nominală securizată cu transmitere link & cod prin Brevo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title="Închide fereastra"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-gray-100 dark:border-gray-800 text-xs font-semibold bg-white dark:bg-gray-900">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-3 px-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'create'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <UserPlus size={14} />
            <span>Generează Invitație</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('list'); loadInvitations(); }}
            className={`pb-3 px-2 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'list'
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
            }`}
          >
            <Clock size={14} />
            <span>Istoric Invitații ({invitations.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'create' && (
            <div className="space-y-4">
              {/* Success Banner */}
              {successData && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 size={18} />
                    <span>Invitația a fost creată și transmisă cu succes pe email!</span>
                  </div>
                  
                  <div className="bg-white/80 dark:bg-gray-900/60 p-3 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 text-[11px] space-y-1">
                    <div>Beneficiar: <strong>{successData.full_name}</strong></div>
                    <div>Email: <strong>{successData.email}</strong></div>
                    <div>Rol: <strong>{successData.role}</strong></div>
                    <div>Cod Unic: <span className="text-primary font-bold">{successData.code}</span></div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                      Link direct de înregistrare (poți să îl transmiți și manual):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={successData.registration_link || ''}
                        className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs truncate select-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyLink(successData.registration_link)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copied ? 'Copiat!' : 'Copiază'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Security Rule Explainer */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800/60 text-xs text-blue-800 dark:text-blue-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-blue-900 dark:text-blue-200">
                  <Shield size={13} /> Regulă Strictă Înregistrare Axis
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Invitația generată este <strong>nominală</strong>. Înregistrarea va fi permisă exclusiv utilizând adresa de email și numele complet specificate mai jos.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateInvitation} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Nume și Prenume Beneficiar *
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="ex: Andrei Popescu"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Adresă Email Beneficiar *
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="andrei.popescu@axisrent.ro"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Rol Alocat în Companie
                  </label>
                  <div className="relative">
                    <Briefcase size={15} className="absolute left-3.5 top-3 text-gray-400" />
                    <select
                      value={formData.role}
                      onChange={e => setFormData({ ...formData, role: e.target.value })}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                    >
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors cursor-pointer"
                  >
                    Anulează
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2.5 bg-primary text-white rounded-full font-bold text-xs hover:bg-primary/90 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>{loading ? 'Se emite invitația...' : 'Emite Invitație & Trimite Email'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'list' && (
            <div className="space-y-3">
              {loadingList ? (
                <div className="py-12 text-center text-xs text-gray-500 flex flex-col items-center gap-2">
                  <RefreshCw size={18} className="animate-spin text-primary" />
                  <span>Se încarcă istoricul invitațiilor...</span>
                </div>
              ) : invitations.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  Nu a fost emisă nicio invitație până în prezent.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {invitations.map(inv => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className=" font-bold text-[11px] px-2 py-0.5 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white">
                            {inv.code}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.is_used
                              ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {inv.is_used ? 'Folosită (Cont Creat)' : 'Activă (În așteptare)'}
                          </span>
                          <span className="text-[10px] text-primary font-semibold">
                            {inv.role}
                          </span>
                        </div>

                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                          {inv.full_name} <span className="font-normal text-gray-500">({inv.email})</span>
                        </div>

                        <div className="text-[10px] text-gray-400">
                          Emisă de: {inv.created_by_name || 'Super Admin'} • {new Date(inv.created_at).toLocaleDateString('ro-RO')}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!inv.is_used && inv.registration_link && (
                          <button
                            type="button"
                            onClick={() => handleCopyLink(inv.registration_link)}
                            className="p-2 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
                            title="Copiază link direct de înregistrare"
                          >
                            <Copy size={13} />
                          </button>
                        )}

                        {!inv.is_used && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(inv.id)}
                            className="p-2 border border-rose-200 dark:border-rose-900 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                            title="Revocă această invitație"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InviteMemberModal;
