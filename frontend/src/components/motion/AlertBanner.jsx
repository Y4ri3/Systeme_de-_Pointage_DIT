import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';

const variantConfig = {
  error: {
    border: 'border-[#FECACA]',
    bg: 'bg-[#FEF2F2]',
    text: 'text-[#B91C1C]',
    icon: XCircle
  },
  warning: {
    border: 'border-[#FDE68A]',
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#92400E]',
    icon: AlertTriangle
  },
  success: {
    border: 'border-[#A7F3D0]',
    bg: 'bg-[#ECFDF5]',
    text: 'text-[#065F46]',
    icon: CheckCircle
  },
  info: {
    border: 'border-[#BAE6FD]',
    bg: 'bg-[#F0F9FF]',
    text: 'text-[#0C4A6E]',
    icon: Info
  }
};

function AlertBanner({ message, variant = 'error', className = '' }) {
  const config = variantConfig[variant] || variantConfig.error;
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="overflow-hidden"
        >
          <div className={`flex items-start gap-3 rounded-[12px] border p-4 ${config.border} ${config.bg} ${className}`}>
            <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${config.text}`} />
            <p className={`text-sm ${config.text}`}>{message}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AlertBanner;
