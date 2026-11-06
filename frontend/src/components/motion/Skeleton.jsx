import { motion, useReducedMotion } from 'framer-motion';

function shimmerAnimation(reduceMotion) {
  if (reduceMotion) return {};

  return {
    backgroundPosition: ['200% 0', '-200% 0']
  };
}

export function SkeletonBlock({ className = '' }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={`rounded-lg bg-[length:200%_100%] bg-gradient-to-r from-[#F1F5F9] via-[#E2E8F0] to-[#F1F5F9] ${className}`}
      animate={shimmerAnimation(reduceMotion)}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
    />
  );
}

export function SkeletonText({ lines = 2, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBlock key={index} className={`h-3 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`rounded-[12px] border border-[#E2E8F0] bg-white p-4 md:p-6 ${className}`}>
      <div className="mb-4 flex items-center gap-3">
        <SkeletonBlock className="h-11 w-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-3 w-1/2" />
          <SkeletonBlock className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonRow({ className = '' }) {
  return (
    <div className={`flex items-center gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 ${className}`}>
      <SkeletonBlock className="h-10 w-10 flex-shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-3 w-1/3" />
        <SkeletonBlock className="h-3 w-1/4" />
      </div>
      <SkeletonBlock className="h-7 w-20 flex-shrink-0 rounded-lg" />
    </div>
  );
}

export function SkeletonList({ count = 3, variant = 'row', className = '' }) {
  const SkeletonComponent = variant === 'card' ? SkeletonCard : SkeletonRow;

  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonComponent key={index} />
      ))}
    </div>
  );
}

export default SkeletonBlock;
