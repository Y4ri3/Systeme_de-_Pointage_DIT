import { motion } from 'framer-motion';

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <motion.div
        className="h-10 w-10 rounded-full border-[3px] border-[#E0F2FE] border-t-[#0C4A6E]"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

export default PageLoader;
