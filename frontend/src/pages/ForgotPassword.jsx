import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ArrowRight, Loader2, CheckCircle2, AlertCircle, Sparkles, Send } from 'lucide-react';
import { AxisAiIcon } from '../components/AxisAiLogo';
import { forgotPassword } from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await forgotPassword(email.trim());
      setFeedbackMsg(res.message || 'Linkul de resetare a fost expediat.');
      setIsSubmitted(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(err.message || 'A apărut o eroare la solicitarea resetării.');
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
              Ai Uitat Parola?
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1">
              Introdu adresa de email a contului tău Axis pentru a primi un link securizat de resetare.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Confirmation Card */}
        {isSubmitted ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                Email Expediat cu Succes
              </h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                {feedbackMsg}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 text-[11px] text-blue-700 dark:text-blue-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Sparkles size={13} className="text-blue-600" />
                <span>Instrucțiuni de securitate:</span>
              </div>
              <p className="leading-relaxed">
                Mesajul conține un link securizat valabil timp de <strong>60 de minute</strong>. Verifică atât folderul <strong>Inbox</strong>, cât și <strong>Spam / Promoții</strong>.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="w-full py-2.5 px-4 rounded-full border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
              >
                Trimite din nou pe altă adresă
              </button>

              <Link
                to="/login"
                className="w-full py-2.5 px-4 rounded-full bg-primary text-white text-xs font-bold text-center hover:bg-primary/90 transition-all"
              >
                Înapoi la Autentificare
              </Link>
            </div>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Adresă Email Cont
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nume@axis.ro"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-3 px-4 rounded-full font-bold text-xs text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all cursor-pointer shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Se trimite linkul de resetare...</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Trimite Link de Resetare</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <div className="text-center pt-2 border-t border-gray-100 dark:border-gray-800">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
          >
            <ArrowLeft size={13} />
            <span>Înapoi la Autentificare</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ForgotPassword;
