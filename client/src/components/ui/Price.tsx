
interface PriceProps {
  amount: number;
  compareAt?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Price({ amount, compareAt, size = 'md', className = '' }: PriceProps) {
  const formattedPrice = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(amount)
    .replace('XOF', 'FCFA');

  const formattedCompare = compareAt ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 })
    .format(compareAt)
    .replace('XOF', 'FCFA') : null;

  const sizes = {
    sm: "text-xs",
    md: "text-base font-semibold",
    lg: "text-xl font-bold"
  };

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className={`text-[#D9A441] ${sizes[size]}`}>{formattedPrice}</span>
      {formattedCompare && (
        <span className="text-xs text-gray-400 line-through">{formattedCompare}</span>
      )}
    </div>
  );
}
