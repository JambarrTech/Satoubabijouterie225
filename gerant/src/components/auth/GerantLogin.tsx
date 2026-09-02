import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Lock, User as UserIcon, ShieldCheck, AlertCircle, Loader2  } from '../../ui/Icons';;
import { loginGerant } from '../../lib/api/auth';
import { useToast } from '../ui/Toast';
import { User } from '../../types';

interface GerantLoginProps {
  onLogin: (user: User, token: string) => void;
}

export function GerantLogin({ onLogin }: GerantLoginProps) {
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      setShakeError(true);
      const t = setTimeout(() => setShakeError(false), 500);
      return () => clearTimeout(t);
    }
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) {
      setError('Identifiant requis');
      return;
    }
    setLoading(true);

    try {
      const result = await loginGerant(identifier.trim(), password);
      if (result.user.role !== 'ADMIN') {
        setError('Acces reserve aux administrateurs');
        setLoading(false);
        return;
      }
      localStorage.setItem('satouba_gerant_token', result.token);
      localStorage.setItem('satouba_gerant_refresh_token', result.refreshToken);
      localStorage.setItem('satouba_gerant_user', JSON.stringify(result.user));
      toast('Bienvenue !', 'success');
      onLogin(result.user, result.token);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#064A15] via-[#0B5D1E] to-[#0a6b22] flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#D9A441]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#D9A441]/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-20 h-20 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm p-1 shadow-2xl border border-white/20 mb-4"
          >
            <img src="/logo.jpg" alt="Satouba Bijouterie 255" className="w-full h-full object-contain rounded-xl" />
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <ShieldCheck size={20} className="text-[#D9A441]" />
              <h1 className="font-serif text-2xl font-bold text-white">Espace Gerant</h1>
            </div>
            <p className="text-sm text-emerald-200/70">Administration Satouba Bijouterie 255</p>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-white rounded-3xl shadow-2xl p-8"
        >
          <h2 className="font-serif text-xl font-bold text-gray-900 mb-6">Connexion Admin</h2>

          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Identifiant</label>
              <div className={`relative rounded-xl border transition-all duration-200 ${focused === 'identifier' ? 'border-[#0B5D1E] ring-2 ring-[#0B5D1E]/10' : 'border-gray-200'}`}>
                <UserIcon size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors pointer-events-none ${focused === 'identifier' ? 'text-[#0B5D1E]' : 'text-gray-400'}`} />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onFocus={() => setFocused('identifier')}
                  onBlur={() => setFocused(null)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none bg-transparent relative z-10"
                  placeholder="Votre identifiant gerant"
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Mot de passe</label>
              <div className={`relative rounded-xl border transition-all duration-200 ${focused === 'password' ? 'border-[#0B5D1E] ring-2 ring-[#0B5D1E]/10' : 'border-gray-200'}`}>
                <Lock size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${focused === 'password' ? 'text-[#0B5D1E]' : 'text-gray-400'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  className="w-full pl-10 pr-12 py-3 rounded-xl text-sm focus:outline-none bg-transparent"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: loading ? 1 : 1.01 }}
              whileTap={{ scale: loading ? 1 : 0.98 }}
              className="w-full bg-[#0B5D1E] hover:bg-[#064A15] text-white py-3 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-[#0B5D1E]/20"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Connexion...
                </>
              ) : 'Acceder au tableau de bord'}
            </motion.button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-6 text-center">
          <a href="/" className="text-sm text-emerald-200/70 hover:text-white transition-colors inline-flex items-center gap-1">
            &larr; Retour a la boutique
          </a>
        </motion.div>
      </div>
    </div>
  );
}

