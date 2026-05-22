import { motion, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

interface AnimatedCounterProps {
  start?: number;
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  start = 0,
  end,
  duration = 2,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}) => {
  const [count, setCount] = useState(start);

  useEffect(() => {
    let frame: number;
    const startTime = performance.now();

    const updateCounter = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      
      // Easing function for smooth animation
      const easedProgress = progress < 0.5 
        ? 2 * progress * progress 
        : -1 + (4 - 2 * progress) * progress;
      
      const currentValue = start + (end - start) * easedProgress;
      const displayValue = decimals > 0 
        ? currentValue.toFixed(decimals) 
        : Math.round(currentValue);
      
      setCount(Number(displayValue));

      if (progress < 1) {
        frame = requestAnimationFrame(updateCounter);
      }
    };

    frame = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(frame);
  }, [start, end, duration, decimals]);

  return (
    <motion.span
      className={`${className} inline-block`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {prefix}{count}{suffix}
    </motion.span>
  );
};