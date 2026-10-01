import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, User, Phone, Briefcase, ArrowRight, Loader2, CheckCircle2, AlertCircle, Sparkles, Key, Check } from 'lucide-react';
import { AxisAiIcon } from '../components/AxisAiLogo';
import { registerUser, validateInvitation } from '../services/api';
import useAuthStore from '../store/authStore';


const ROLES = [
  { value: 'Super Admin', label: 'Super Admin (Acces Total)' },
  { value: 'Axis Manager', label: 'Axis Manager (Management Flotă & Risc)' },
  { value: 'Axis Analyst', label: 'Axis Analyst (Scoring & Comitet Credit)' },
  { value: 'Dealer Manager', label: 'Dealer Manager (Partener Auto)' },
  { value: 'Dealer Sales', label: 'Dealer Sales (Consilier Vânzări)' }
];

const Register = () => {
  const [searchParams] = useSearchParams();
  const codeParam = searchParams.get('code') || searchParams.get('invite_code') || '';
  const emailParam = searchParams.get('email') || '';
  const nameParam = searchParams.get('name') || '';

  const [formData, setFormData] = useState({
    inviteCode: codeParam,
    fullName: nameParam,
    email: emailParam,
    phone: '',
    role: 'Axis Manager',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(true);

  // Invitation Live Validation State
  const [invitationInfo, setInvitationInfo] = useState(null);
  const [validatingInvite, setValidatingInvite] = useState(false);

  // Auto-validate invitation code
  useEffect(() => {
    const code = formData.inviteCode.trim();
    if (!code) {
      setInvitationInfo(null);
      return;
    }
    let isMounted = true;
    const timer = setTimeout(async () => {
      setValidatingInvite(true);
      try {
        const res = await validateInvitation(code, formData.email.trim());
        if (isMounted) {
          setInvitationInfo(res);
          if (res.valid) {
            if (res.full_name && !formData.fullName) {
              setFormData(prev => ({ ...prev, fullName: res.full_name }));
            }
            if (res.email && !formData.email) {
              setFormData(prev => ({ ...prev, email: res.email }));
            }
            if (res.role) {
              setFormData(prev => ({ ...prev, role: res.role }));
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          setInvitationInfo({ valid: false, message: 'Eroare la verificarea codului de invitație.' });
        }
      } finally {
        if (isMounted) setValidatingInvite(false);
      }
    }, 350);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [formData.inviteCode, formData.email]);

  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();


  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, label: '', color: 'bg-gray-200' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'Slabă', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: 'Medie', color: 'bg-amber-500' };
    return { score: 3, label: 'Securizată (Recomandat)', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.inviteCode.trim()) {
      setError('Introduceți Codul de Invitație primit pe email de la Super Admin sau codul Master.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Parolele introduse nu coincid.');
      return;
    }

    if (!gdprConsent) {
      setError('Pentru a finaliza înregistrarea, este obligatoriu să accepți Termenii și Condițiile și Politica de Confidențialitate GDPR conform legislației din România.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser({
        invite_code: formData.inviteCode.trim().toUpperCase(),
        full_name: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        role: invitationInfo?.role || formData.role,
        password: formData.password,
        gdpr_consent: true
      });


      const userProfile = res.user || {
        full_name: formData.fullName,
        email: formData.email,
        role: formData.role,
        initials: formData.fullName.split(' ').map(n => n[0]).join('').toUpperCase() || 'AX'
      };

      setSuccessMsg('Contul a fost creat cu succes! Un email de bun venit a fost expediat prin Brevo.');

      // Login automatically and redirect
      login(userProfile, res.access_token || 'bearer-token');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1400);
    } catch (err) {
      console.error('Register error:', err);
      setError(err.message || 'Eroare la crearea contului.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-10">
      <div className="max-w-lg w-full bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-200/90 dark:border-gray-800 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-primary/10 text-primary mb-1">
            <AxisAiIcon size="md" showAiBadge={false} />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Creează Cont Executiv
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Înregistrează-te pe platforma Axis Mobility pentru management flotă, scoring financiar și comitet de credit.
          </p>
        </div>

        {/* Error / Success Feedback */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cod de Invitație Super Admin */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                <Key size={14} className="text-primary" />
                <span>Cod de Invitație Super Admin *</span>
              </label>
              <span className="text-[11px] text-gray-400 font-medium">B2B Exclusiv</span>
            </div>

            <div className="relative">
              <input
                type="text"
                required
                value={formData.inviteCode}
                onChange={e => setFormData({ ...formData, inviteCode: e.target.value.toUpperCase() })}
                placeholder="ex: AXIS-INV-36DAA096 sau AXIS-ROOT-2026"
                className="w-full pl-3.5 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold tracking-wider text-gray-900 dark:text-white uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {validatingInvite ? (
                  <Loader2 size={16} className="animate-spin text-gray-400" />
                ) : invitationInfo?.valid ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : formData.inviteCode.length > 3 ? (
                  <AlertCircle size={18} className="text-amber-500" />
                ) : null}
              </div>
            </div>

            {/* Live Invitation Status Feedback */}
            {invitationInfo && (
              <div className={`mt-2 p-2.5 rounded-2xl border text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
                invitationInfo.valid
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}>
                {invitationInfo.valid ? (
                  <CheckCircle2 size={15} className="text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle size={15} className="text-rose-600 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold">{invitationInfo.message}</div>
                  {invitationInfo.valid && invitationInfo.role && (
                    <div className="text-[11px] opacity-85 mt-0.5">
                      Rol alocat de administrator: <strong>{invitationInfo.role}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!formData.inviteCode && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Înregistrarea pe platforma Axis se realizează exclusiv pe bază de invitație transmisă pe email de către Super Admin.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Nume și Prenume
            </label>

            <div className="relative">
              <User size={15} className="absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="ex: Alin Pietrăreanu"
                className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Adresă Email
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="nume@axis.ro"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Telefon (opțional)
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+40 7..."
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                Rol în Companie
              </label>
              {invitationInfo?.valid && invitationInfo?.role && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200">
                  Asignat prin Invitație Super Admin
                </span>
              )}
            </div>
            <div className="relative">
              <Briefcase size={15} className="absolute left-3.5 top-3 text-gray-400" />
              <select
                disabled={Boolean(invitationInfo?.valid && invitationInfo?.role && !invitationInfo.code.includes('ROOT'))}
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer disabled:opacity-75 disabled:bg-gray-100 dark:disabled:bg-gray-800/60"
              >
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Parolă
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Min. 6 caractere"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Confirmă Parola
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repetă parola"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Password Strength Meter */}
          {formData.password && (
            <div className="space-y-1 pt-0.5">
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>Putere parolă:</span>
                <span className="font-semibold">{strength.label}</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden flex gap-1">
                <div className={`h-full flex-1 transition-all ${strength.score >= 1 ? strength.color : 'bg-transparent'}`} />
                <div className={`h-full flex-1 transition-all ${strength.score >= 2 ? strength.color : 'bg-transparent'}`} />
                <div className={`h-full flex-1 transition-all ${strength.score >= 3 ? strength.color : 'bg-transparent'}`} />
              </div>
            </div>
          )}

          {/* Brevo Notification Banner */}
          <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-[11px] text-blue-700 dark:text-blue-300 flex items-start gap-2 leading-relaxed">
            <Sparkles size={14} className="shrink-0 text-blue-600 mt-0.5" />
            <span>
              La finalizarea înregistrării vei primi automat un <strong>email de confirmare și bun venit</strong> expediat securizat prin <strong>Brevo Transactional API v3</strong>.
            </span>
          </div>

          {/* Mandatory GDPR & Legal Consent Box */}
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-2.5 text-xs text-gray-700 dark:text-gray-300">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={gdprConsent}
                onChange={e => setGdprConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-700 shrink-0"
              />
              <span className="text-[11px] leading-relaxed">
                <strong className="text-gray-900 dark:text-white">Obligatoriu:</strong> Declar că am citit și sunt de acord cu{' '}
                <Link to="/terms" target="_blank" className="font-bold underline text-primary hover:opacity-80">
                  Termenii și Condițiile
                </Link>{' '}
                și{' '}
                <Link to="/privacy" target="_blank" className="font-bold underline text-primary hover:opacity-80">
                  Politica de Confidențialitate GDPR
                </Link>
                . Înțeleg că datele mele de identificare, financiare și de telemetrie sunt prelucrate conform Regulamentului (UE) 2016/679 și Legii nr. 190/2018.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer select-none pt-1 border-t border-gray-200/60 dark:border-gray-700/60">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={e => setMarketingConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-700 shrink-0"
              />
              <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Opțional: Sunt de acord cu primirea alertelor de flotă, rapoartelor de risc și notificărilor operaționale prin email.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-full font-bold text-xs text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Se creează contul...</span>
              </>
            ) : (
              <>
                <span>Înregistrează Contul</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Footer Link to Login & GDPR */}
        <div className="text-center pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Ai deja un cont în platformă?{' '}
            <Link to="/login" className="font-bold text-primary hover:underline">
              Autentifică-te
            </Link>
          </p>

          <div className="flex items-center justify-center gap-3 text-[11px] text-gray-400 pt-1">
            <Link to="/privacy" target="_blank" className="hover:text-gray-700 dark:hover:text-gray-300 underline">
              Politica de Confidențialitate
            </Link>
            <span>•</span>
            <Link to="/terms" target="_blank" className="hover:text-gray-700 dark:hover:text-gray-300 underline">
              Termeni și Condiții
            </Link>
            <span>•</span>
            <Link to="/cookies" target="_blank" className="hover:text-gray-700 dark:hover:text-gray-300 underline">
              Cookie-uri
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;
