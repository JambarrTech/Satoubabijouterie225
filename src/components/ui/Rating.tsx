import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { fetchLikes, toggleLike } from '../../lib/api/reviews';

interface LikeButtonProps {
  productId: string;
  initialLikesCount: number;
  size?: 'sm' | 'md' | 'lg';
}

export function LikeButton({ productId, initialLikesCount, size = 'sm' }: LikeButtonProps) {
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  const iconSize = size === 'sm' ? 16 : size === 'md' ? 20 : 24;
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';

  // Check if user already liked
  useEffect(() => {
    fetchLikes(productId)
      .then(likes => {
        const userLike = likes.find(l => l.userId === (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).id : null));
        if (userLike) setLiked(true);
      })
      .catch(() => {});
  }, [productId]);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await toggleLike(productId);
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
        liked
          ? 'bg-red-50 text-red-600 hover:bg-red-100'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      } ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
      aria-label={liked ? 'Retirer le like' : 'Liker'}
    >
      <Heart
        size={iconSize}
        className={`transition-all duration-200 ${liked ? 'fill-current' : ''}`}
        strokeWidth={liked ? 0 : 2}
      />
      <span className={`${textSize} font-semibold ${liked ? 'text-red-600' : 'text-gray-700'}`}>
        {likesCount}
      </span>
    </button>
  );
}