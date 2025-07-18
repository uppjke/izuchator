'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center"
      >
        <motion.h1 
          className="text-6xl sm:text-5xl md:text-7xl font-bold text-zinc-900 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          Учи. Учись. Твори!
        </motion.h1>
        <motion.p 
          className="text-lg sm:text-md md:text-2xl text-zinc-600 mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          Всё, что тебе нужно — у тебя под рукой.<br />
          Больше никаких лишних сервисов!
        </motion.p>
        
        <motion.div 
          className="flex gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          <Button size="lg" className="bg-zinc-900 text-white hover:bg-zinc-700">
            Войти
          </Button>
          <Button size="lg" variant="outline" className="border-zinc-500 hover:bg-zinc-100">
            Создать аккаунт
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
