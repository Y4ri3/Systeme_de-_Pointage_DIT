import { motion } from 'framer-motion';
import { FlaskConical } from 'lucide-react';

function DemoModeBadge({ className = '' }) {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      title="Ces données sont simulées localement : cette fonctionnalité n'est pas encore disponible côté serveur, rien n'est enregistré."
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-1 text-xs font-medium text-[#92400E] ${className}`}
    >
      <FlaskConical className="h-3.5 w-3.5" />
      Mode demo local
    </motion.span>
  );
}

export default DemoModeBadge;
