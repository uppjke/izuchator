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
        <h1 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-6">
          Izuchator
        </h1>
        <p className="text-lg md:text-xl text-zinc-600 mb-8 max-w-2xl mx-auto">
          Welcome to our landing page. More content coming soon.
        </p>
        
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-6 py-3 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 transition-colors">
            Get Started
          </button>
          <button className="px-6 py-3 bg-white text-zinc-900 border border-zinc-300 rounded-md hover:bg-zinc-50 transition-colors">
            Learn More
          </button>
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-zinc-100 to-transparent opacity-60" />
      </motion.div>
    </div>
  );
}
