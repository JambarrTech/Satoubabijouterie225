import React, { useState, useEffect } from 'react';
import { Tag, Copy, Check, Sparkles } from 'lucide-react';
import { Coupon } from '../../types';
import { fetchCoupons } from '../../lib/api/coupons';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';

export function CouponsView() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchCoupons()
      .then(setCoupons)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      <div className="pb-6 border-b border-gray-100">
        <span className="text-xs uppercase tracking-widest text-[#0B5D1E] font-semibold block mb-1">Avantages & Privilèges</span>
        <h1 className="font-serif text-3xl font-bold text-gray-900">Codes Promo & Offres SaTouba</h1>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((n) => (
            <Skeleton key={n} className="h-44 w-full rounded-3xl" />
          ))}
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 p-8">
          <p className="text-gray-500 font-medium">Aucun code promo actif pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className="bg-gradient-to-br from-[#EAF7ED] to-white p-6 sm:p-8 rounded-3xl border-2 border-[#0B5D1E]/20 shadow-sm flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute -right-10 -bottom-10 w-32 h-32 rounded-full bg-[#0B5D1E]/5 pointer-events-none" />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-[#0B5D1E] text-white text-xs font-bold tracking-widest uppercase">
                    {coupon.discountPercent ? `-${coupon.discountPercent}%` : 'Offre Spéciale'}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">Valide jusqu'au {coupon.expiryDate}</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-gray-900">{coupon.description}</h3>
              </div>

              <div className="pt-6 mt-6 border-t border-[#0B5D1E]/10 flex items-center justify-between">
                <div className="bg-white px-4 py-2 rounded-xl border border-dashed border-[#0B5D1E] font-mono font-bold text-[#0B5D1E]">
                  {coupon.code}
                </div>
                <Button
                  onClick={() => handleCopy(coupon.code)}
                  icon={copiedCode === coupon.code ? <Check size={16} /> : <Copy size={16} />}
                  variant={copiedCode === coupon.code ? 'secondary' : 'primary'}
                >
                  {copiedCode === coupon.code ? 'Copié !' : 'Copier le code'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
