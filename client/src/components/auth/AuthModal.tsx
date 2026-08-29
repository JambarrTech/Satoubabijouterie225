import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Eye, EyeOff, User as UserIcon, Phone, Lock, KeyRound, AlertCircle, Loader2, ShieldCheck, MessageSquare } from 'lucide-react';
import { login, register, requestPasswordReset, resetPassword } from '../../lib/api/auth';
import { useToast } from '../ui/Toast';
import { User } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User, token: string) => void;
}

export function AuthModal({ isOpen, onClose, onLogin }: AuthModalProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');

  // Login form
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form
  const [regName, setRegName] = useState('');
  const [regIdentifier, setRegIdentifier] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot password form
  const [forgotPhone, setForgotPhone] = useState('');

  // Reset password form
  const [resetPhone, setResetPhone] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Animated error shake
  const [shakeError, setShakeError] = useState(false);
  useEffect(() => {
    if (error) {
      setShakeError(true);
      const t = setTimeout(() => setShakeError(false), 500);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(loginIdentifier, loginPassword);
      localStorage.setItem('satouba_token', result.token);
      localStorage.setItem('satouba_user', JSON.stringify(result.user));
      onLogin(result.user, result.token);
      toast('Connexion réussie !', 'success');
      onClose();
      resetForms();
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
    if (!/[A-Z]/.test(pwd)) return 'Le mot de passe doit contenir au moins 1 majuscule';
    if (!/[a-z]/.test(pwd)) return 'Le mot de passe doit contenir au moins 1 minuscule';
    if (!/[0-9]/.test(pwd)) return 'Le mot de passe doit contenir au moins 1 chiffre';
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const pwdError = validatePassword(regPassword);
    if (pwdError) { setError(pwdError); setLoading(false); return; }
    try {
      const result = await register({ name: regName, identifier: regIdentifier, password: regPassword, phone: regPhone || undefined });
      localStorage.setItem('satouba_token', result.token);
      localStorage.setItem('satouba_user', JSON.stringify(result.user));
      onLogin(result.user, result.token);
      toast('Compte créé avec succès !', 'success');
      onClose();
      resetForms();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(forgotPhone);
      setResetPhone(forgotPhone);
      setView('reset');
      toast('Code OTP envoyé par SMS', 'success');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const pwdError = validatePassword(resetNewPassword);
    if (pwdError) { setError(pwdError); setLoading(false); return; }
    try {
      await resetPassword(resetPhone, resetOtp, resetNewPassword);
      toast('Mot de passe réinitialisé avec succès !', 'success');
      setView('login');
      resetForms();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  const resetForms = () => {
    setLoginIdentifier('');
    setLoginPassword('');
    setRegName('');
    setRegIdentifier('');
    setRegPhone('');
    setRegPassword('');
    setForgotPhone('');
    setResetPhone('');
    setResetOtp('');
    setResetNewPassword('');
    setError('');
    setView('login');
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="relative p-6 pb-4">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all duration-200 hover:rotate-90"
                >
                  <X size={18} />
                </button>

                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                    className="w-16 h-16 mx-auto rounded-2xl bg-[#0B5D1E] p-1 shadow-lg mb-3"
                  >
                    <img src="/logo.jpg" alt="SaTouba" className="w-full h-full object-contain rounded-xl" />
                  </motion.div>
                  <h2 className="font-serif text-xl font-bold text-gray-900">
                    {view === 'login' && 'Connexion'}
                    {view === 'register' && 'Créer un compte'}
                    {view === 'forgot' && 'Récupérer mot de passe'}
                    {view === 'reset' && 'Nouveau mot de passe'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {view === 'login' && 'Accédez à votre espace SaTouba'}
                    {view === 'register' && 'Rejoignez l\'univers SaTouba'}
                    {view === 'forgot' && 'Un code OTP sera envoyé par SMS'}
                    {view === 'reset' && 'Entrez le code reçu par SMS'}
                  </p>
                </div>
              </div>

              {/* Form */}
              <div className="px-6 pb-6">
                {/* Animated error */}
                <AnimatePresence mode="wait">
                  {error && (
                    <motion.div
                      key={error}
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.div
                        animate={shakeError ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
                        transition={{ duration: 0.4 }}
                        className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl text-sm border border-red-100"
                      >
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{error}</span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {view === 'login' && (
                    <motion.form
                      key="login"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleLogin}
                      className="space-y-3"
                    >
                      <InputField
                        icon={<UserIcon size={16} />}
                        type="text"
                        label="Identifiant"
                        value={loginIdentifier}
                        onChange={setLoginIdentifier}
                        placeholder="Votre identifiant"
                        required
                      />
                      <InputField
                        icon={<Lock size={16} />}
                        type={showLoginPassword ? 'text' : 'password'}
                        label="Mot de passe"
                        value={loginPassword}
                        onChange={setLoginPassword}
                        placeholder="••••••••"
                        required
                        trailing={
                          <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        }
                      />
                      <div className="text-right">
                        <button type="button" onClick={() => { setView('forgot'); setError(''); }} className="text-xs text-[#0B5D1E] hover:underline font-medium">
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: loading ? 1 : 1.01 }}
                        whileTap={{ scale: loading ? 1 : 0.98 }}
                        className="w-full bg-[#0B5D1E] hover:bg-[#064A15] text-white py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2 shadow-md shadow-[#0B5D1E]/20"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Connexion...
                          </>
                        ) : 'Se connecter'}
                      </motion.button>
                    </motion.form>
                  )}

                  {view === 'register' && (
                    <motion.form
                      key="register"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleRegister}
                      className="space-y-3"
                    >
                      <InputField
                        icon={<UserIcon size={16} />}
                        type="text"
                        label="Nom complet"
                        value={regName}
                        onChange={setRegName}
                        placeholder="Votre nom"
                        required
                      />
                      <InputField
                        icon={<KeyRound size={16} />}
                        type="text"
                        label="Identifiant"
                        value={regIdentifier}
                        onChange={setRegIdentifier}
                        placeholder="Ex: JeanK_225"
                        required
                      />
                      <InputField
                        icon={<Phone size={16} />}
                        type="tel"
                        label="Téléphone"
                        value={regPhone}
                        onChange={setRegPhone}
                        placeholder="+225 07 00 00 00 00"
                      />
                      <InputField
                        icon={<Lock size={16} />}
                        type={showRegPassword ? 'text' : 'password'}
                        label="Mot de passe"
                        value={regPassword}
                        onChange={setRegPassword}
                        placeholder="••••••••"
                        required
                        minLength={8}
                        trailing={
                          <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        }
                      />
                      <div className="text-[10px] text-gray-400 -mt-1">8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre</div>
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: loading ? 1 : 1.01 }}
                        whileTap={{ scale: loading ? 1 : 0.98 }}
                        className="w-full bg-[#0B5D1E] hover:bg-[#064A15] text-white py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2 shadow-md shadow-[#0B5D1E]/20"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Création...
                          </>
                        ) : 'Créer mon compte'}
                      </motion.button>
                    </motion.form>
                  )}

                  {view === 'forgot' && (
                    <motion.form
                      key="forgot"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleForgotPassword}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-2 bg-[#EAF7ED] p-3 rounded-xl text-xs text-[#0B5D1E] mb-2">
                        <MessageSquare size={16} />
                        <span>Un code à 6 chiffres sera envoyé par SMS au numéro lié à votre compte.</span>
                      </div>
                      <InputField
                        icon={<Phone size={16} />}
                        type="tel"
                        label="Numéro de téléphone"
                        value={forgotPhone}
                        onChange={setForgotPhone}
                        placeholder="+225 07 00 00 00 00"
                        required
                      />
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: loading ? 1 : 1.01 }}
                        whileTap={{ scale: loading ? 1 : 0.98 }}
                        className="w-full bg-[#0B5D1E] hover:bg-[#064A15] text-white py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2 shadow-md shadow-[#0B5D1E]/20"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Envoi en cours...
                          </>
                        ) : 'Envoyer le code OTP'}
                      </motion.button>
                    </motion.form>
                  )}

                  {view === 'reset' && (
                    <motion.form
                      key="reset"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleResetPassword}
                      className="space-y-3"
                    >
                      <InputField
                        icon={<Phone size={16} />}
                        type="tel"
                        label="Numéro de téléphone"
                        value={resetPhone}
                        onChange={setResetPhone}
                        placeholder="+225 07 00 00 00 00"
                        required
                      />
                      <InputField
                        icon={<ShieldCheck size={16} />}
                        type="text"
                        label="Code OTP"
                        value={resetOtp}
                        onChange={setResetOtp}
                        placeholder="6 chiffres"
                        required
                        maxLength={6}
                      />
                      <InputField
                        icon={<Lock size={16} />}
                        type={showResetPassword ? 'text' : 'password'}
                        label="Nouveau mot de passe"
                        value={resetNewPassword}
                        onChange={setResetNewPassword}
                        placeholder="••••••••"
                        required
                        minLength={8}
                        trailing={
                          <button type="button" onClick={() => setShowResetPassword(!showResetPassword)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        }
                      />
                      <div className="text-[10px] text-gray-400 -mt-1">8+ caractères, 1 majuscule, 1 minuscule, 1 chiffre</div>
                      <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: loading ? 1 : 1.01 }}
                        whileTap={{ scale: loading ? 1 : 0.98 }}
                        className="w-full bg-[#0B5D1E] hover:bg-[#064A15] text-white py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2 shadow-md shadow-[#0B5D1E]/20"
                      >
                        {loading ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Réinitialisation...
                          </>
                        ) : 'Réinitialiser le mot de passe'}
                      </motion.button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Switch login/register */}
                <div className="mt-5 text-center">
                  <p className="text-sm text-gray-500">
                    {view === 'login' ? (
                      <>Pas encore de compte ?{' '}
                        <button onClick={() => { setView('register'); setError(''); }} className="text-[#0B5D1E] font-semibold hover:underline transition-colors">
                          S'inscrire
                        </button>
                      </>
                    ) : view === 'register' ? (
                      <>Déjà un compte ?{' '}
                        <button onClick={() => { setView('login'); setError(''); }} className="text-[#0B5D1E] font-semibold hover:underline transition-colors">
                          Se connecter
                        </button>
                      </>
                    ) : (
                      <button onClick={() => { setView('login'); setError(''); }} className="text-[#0B5D1E] font-semibold hover:underline transition-colors">
                        Retour à la connexion
                      </button>
                    )}
                  </p>
                </div>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Reusable animated input field
function InputField({
  icon,
  type,
  label,
  value,
  onChange,
  placeholder,
  required,
  minLength,
  maxLength,
  trailing,
}: {
  icon: React.ReactNode;
  type: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  trailing?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">{label}</label>
      <div className={`relative rounded-xl border transition-all duration-200 ${focused ? 'border-[#0B5D1E] ring-2 ring-[#0B5D1E]/10' : 'border-gray-200'}`}>
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${focused ? 'text-[#0B5D1E]' : 'text-gray-400'}`}>
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none bg-transparent"
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
        />
        {trailing && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {trailing}
          </span>
        )}
      </div>
    </div>
  );
}
