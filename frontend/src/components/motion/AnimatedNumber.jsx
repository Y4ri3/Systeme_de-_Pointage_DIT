import { useEffect, useRef } from 'react';
import { animate, useMotionValue, useReducedMotion } from 'framer-motion';

function AnimatedNumber({ value, suffix = '', prefix = '', duration = 0.8, className = '' }) {
  const reduceMotion = useReducedMotion();
  const numericValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  const motionValue = useMotionValue(numericValue);
  const spanRef = useRef(null);

  useEffect(() => {
    if (!spanRef.current) return undefined;

    if (reduceMotion) {
      spanRef.current.textContent = `${prefix}${numericValue}${suffix}`;
      motionValue.set(numericValue);
      return undefined;
    }

    const controls = animate(motionValue, numericValue, {
      duration,
      ease: 'easeOut',
      onUpdate: (latest) => {
        if (spanRef.current) {
          spanRef.current.textContent = `${prefix}${Math.round(latest)}${suffix}`;
        }
      }
    });

    return () => controls.stop();
  }, [numericValue, duration, prefix, suffix, reduceMotion, motionValue]);

  return (
    <span ref={spanRef} className={className}>
      {`${prefix}${numericValue}${suffix}`}
    </span>
  );
}

export default AnimatedNumber;
