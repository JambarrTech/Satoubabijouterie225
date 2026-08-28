import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashViewProps {
  onComplete: () => void;
}

export function SplashView({ onComplete }: SplashViewProps) {
  const [phase, setPhase] = React.useState<'logo' | 'text' | 'fade'>('logo');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('text'), 800);
    const t2 = setTimeout(() => setPhase('fade'), 2200);
    const t3 = setTimeout(() => onCompleteRef.current(), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[#064A15] via-[#0B5D1E] to-[#0a6b22]">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-72 h-72 bg-[#D9A441] rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#D9A441] rounded-full blur-3xl" />
      </div>

      <AnimatePresence>
        {phase !== 'fade' && (
          <motion.div
            className="flex flex-col items-center gap-6 relative z-10"
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-28 h-28 rounded-3xl bg-white/10 backdrop-blur-sm p-2 shadow-2xl border border-white/20"
            >
              <img
                src="/logo.jpg"
                alt="SaTouba"
                className="w-full h-full object-contain rounded-2xl"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="text-center"
            >
              <h1 className="font-serif text-5xl font-bold text-white tracking-tight">
                Sa<span className="text-[#D9A441]">Touba</span>
              </h1>
            </motion.div>

            {phase === 'text' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <p className="text-[#D9A441] text-sm font-medium tracking-[0.3em] uppercase">
                  Bijouterie de Luxe
                </p>
                <p className="text-emerald-200/60 text-xs mt-2 tracking-wider">
                  Abidjan, Côte d'Ivoire
                </p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="flex gap-2 mt-4"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#D9A441]"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={onCompleteRef.current}
        className="absolute bottom-8 right-8 text-white/40 hover:text-white/80 text-xs font-medium transition-colors z-20"
      >
        Passer ›
      </button>
    </div>
  );
}
