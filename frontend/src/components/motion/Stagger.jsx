import { motion, useReducedMotion } from 'framer-motion';
import { fadeInUp, staggerContainer, withReducedMotion } from './variants';

export function StaggerContainer({ children, className = '', as = 'div', ...props }) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as] || motion.div;

  return (
    <MotionTag
      className={className}
      variants={withReducedMotion(staggerContainer, reduceMotion)}
      initial="hidden"
      animate="visible"
      {...props}
    >
      {children}
    </MotionTag>
  );
}

export function StaggerItem({ children, className = '', as = 'div', ...props }) {
  const reduceMotion = useReducedMotion();
  const MotionTag = motion[as] || motion.div;

  return (
    <MotionTag className={className} variants={withReducedMotion(fadeInUp, reduceMotion)} {...props}>
      {children}
    </MotionTag>
  );
}
