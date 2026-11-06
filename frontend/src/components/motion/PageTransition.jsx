import { motion, useReducedMotion } from 'framer-motion';
import { pageVariants, withReducedMotion } from './variants';

function PageTransition({ children }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={withReducedMotion(pageVariants, reduceMotion)}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
