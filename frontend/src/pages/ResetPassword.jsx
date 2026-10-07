import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowRight, Loader2, CheckCircle2, AlertCircle, ShieldCheck, KeyRound } from 'lucide-react';
import { AxisAiIcon } from '../components/AxisAiLogo';
import { resetPassword } from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

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

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Tokenul de securitate lipsește din link. Verifică emailul primit.');
      return;
    }

    if (password.length < 6) {
      setError('Noua parolă trebuie să aibă minimum 6 caractere.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Parolele nu coincid.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword({
        token,
        new_password: password
      });
      setSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(err.message || 'Eroare la actualizarea parolei.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 py-10">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 p-8 sm:p-10 rounded-3xl shadow-xl border border-gray-200/90 dark:border-gray-800 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <Link to="/" className="inline-block">
            <img 
              src="/footer-logo.png" 
              alt="Axis Premium Mobility" 
              className="h-16 w-auto mx-auto object-contain dark:invert transition-transform hover:scale-105" 
            />
          </Link>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              Setează Noua Parolă
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
              Introdu noua parolă securizată pentru contul tău Axis Mobility.
            </p>
          </div>
        </div>

        {/* Missing Token Alert */}
        {!token && (
          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>
              Nu a fost detectat niciun token de securitate în adresa URL. Te rugăm să deschizi linkul complet primit pe email sau să soliciți o nouă resetare.
            </span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success State */}
        {success ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Parola a Fost Actualizată
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                Contul tău este acum securizat cu noua parolă. Poți accesa imediat panoul de control.
              </p>
            </div>

            <Link
              to="/login"
              className="w-full py-3 px-4 rounded-full bg-primary text-white text-xs font-bold text-center hover:bg-primary/90 transition-all block shadow-md hover:shadow-lg"
            >
              Conectare cu Noua Parolă
            </Link>
          </div>
        ) : (
          /* Password Reset Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Noua Parolă
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minim 6 caractere"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Confirmă Noua Parolă
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repetă noua parolă"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Password Strength Meter */}
            {password && (
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

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword || !token}
              className="w-full py-3 px-4 rounded-full font-bold text-xs text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Se actualizează parola...</span>
                </>
              ) : (
                <>
                  <span>Salvează Noua Parolă</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-gray-100 dark:border-gray-800">
          <Link
            to="/login"
            className="text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
          >
            Înapoi la Autentificare
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ResetPassword;
