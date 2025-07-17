'use client';

import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl mx-auto text-center"
      >
        <motion.h1 
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-zinc-900 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          Учи. Учись. Твори!
        </motion.h1>
        <motion.p 
          className="text-xl md:text-2xl text-zinc-600 mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          Всё, что тебе нужно — у тебя под рукой.<br />
          Больше никаких лишних сервисов!
        </motion.p>
        
        <motion.div 
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          <button className="px-8 py-4 bg-zinc-900 text-white text-lg rounded-md hover:bg-zinc-800 transition-colors">
            Вход
          </button>
          <button className="px-8 py-4 bg-white text-zinc-900 text-lg border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors">
            Создать аккаунт
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
