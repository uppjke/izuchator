'use client';

import { motion } from 'framer-motion';

export function AnimatedBlobs() {
  const radius = 360;
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-gradient-to-br from-blue-500/35 to-purple-500/35 blur-3xl will-change-transform"
        style={{ transform: 'translate3d(0, 0, 0)' }}
        initial={{
          x: radius,
          y: 0,
        }}
        animate={{
          borderRadius: [
            '60% 40% 30% 70%',
            '30% 60% 70% 40%',
            '60% 40% 30% 70%',
          ],
          x: [radius, radius*0.707, 0, -radius*0.707, -radius, -radius*0.707, 0, radius*0.707, radius],
          y: [0, radius*0.707, radius, radius*0.707, 0, -radius*0.707, -radius, -radius*0.707, 0],
          scale: [1, 1.1, 0.9, 1.05, 1, 1.1, 0.9, 1.05, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Blob 2 - стартует с позиции 120° (лево-верх) */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[28rem] h-[28rem] bg-gradient-to-bl from-emerald-500/33 to-teal-500/33 blur-3xl will-change-transform"
        style={{ transform: 'translate3d(0, 0, 0)' }}
        initial={{
          x: -radius*0.5,
          y: -radius*0.866,
        }}
        animate={{
          borderRadius: [
            '40% 60% 50% 30%',
            '70% 30% 40% 60%',
            '40% 60% 50% 30%',
          ],
          x: [radius, radius*0.707, 0, -radius*0.707, -radius, -radius*0.707, 0, radius*0.707, radius],
          y: [0, radius*0.707, radius, radius*0.707, 0, -radius*0.707, -radius, -radius*0.707, 0],
          scale: [1, 0.9, 1.15, 0.95, 1, 0.9, 1.15, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
          delay: 6.67, // 20 секунд / 3 = 6.67 сек (1/3 от полного цикла)
        }}
      />

      {/* Blob 3 - стартует с позиции 240° (лево-низ) */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] bg-gradient-to-t from-orange-500/31 to-pink-500/31 blur-3xl will-change-transform"
        style={{ transform: 'translate3d(0, 0, 0)' }}
        initial={{
          x: -radius*0.5,
          y: radius*0.866,
        }}
        animate={{
          borderRadius: [
            '50% 50% 30% 70%',
            '30% 70% 50% 50%',
            '50% 50% 30% 70%',
          ],
          x: [radius, radius*0.707, 0, -radius*0.707, -radius, -radius*0.707, 0, radius*0.707, radius],
          y: [0, radius*0.707, radius, radius*0.707, 0, -radius*0.707, -radius, -radius*0.707, 0],
          scale: [1, 1.08, 0.92, 1.12, 1, 1.08, 0.92, 1.12, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
          delay: 13.33, // 20 секунд * 2/3 = 13.33 сек (2/3 от полного цикла)
        }}
      />
    </div>
  );
}
