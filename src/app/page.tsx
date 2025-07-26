'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedBlobs } from '@/components/animated-blobs';
import { LoginDialog } from '@/components/auth/login-dialog';
import { RegisterDialog } from '@/components/auth/register-dialog';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

const ANIMATION_CONFIG = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  hero: { 
    title: { duration: 0.7, delay: 0.2 },
    subtitle: { duration: 0.7, delay: 0.4 },
    buttons: { duration: 0.7, delay: 0.6 },
    main: { duration: 0.6 }
  }
} as const

export default function Home() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  // Мемоизированные колбеки
  const handleSwitchToRegister = useCallback(() => {
    setLoginOpen(false)
    setRegisterOpen(true)
  }, [])

  const handleSwitchToLogin = useCallback(() => {
    setRegisterOpen(false)
    setLoginOpen(true)
  }, [])

  const openLogin = useCallback(() => setLoginOpen(true), [])
  const openRegister = useCallback(() => setRegisterOpen(true), [])
  return (
    <div className="min-h-[calc(100dvh-4.5rem)] bg-white flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      <AnimatedBlobs />
      <motion.div
        initial={ANIMATION_CONFIG.initial}
        animate={ANIMATION_CONFIG.animate}
        transition={ANIMATION_CONFIG.hero.main}
        className="max-w-4xl mx-auto text-center relative z-10"
      >
        <motion.h1 
          className="text-6xl sm:text-5xl md:text-7xl font-bold text-zinc-900 mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={ANIMATION_CONFIG.animate}
          transition={ANIMATION_CONFIG.hero.title}
        >
          Учи. Учись. Твори!
        </motion.h1>
        <motion.p 
          className="text-lg sm:text-md md:text-2xl text-zinc-600 mb-10 max-w-2xl mx-auto"
          initial={ANIMATION_CONFIG.initial}
          animate={ANIMATION_CONFIG.animate}
          transition={ANIMATION_CONFIG.hero.subtitle}
        >
          Всё, что тебе нужно — у тебя под рукой.<br />
          Больше никаких лишних сервисов!
        </motion.p>
        
        <motion.div 
          className="flex gap-4 justify-center"
          initial={ANIMATION_CONFIG.initial}
          animate={ANIMATION_CONFIG.animate}
          transition={ANIMATION_CONFIG.hero.buttons}
        >
          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button 
                size="hero" 
                className="bg-zinc-900 text-white hover:bg-zinc-700"
              >
                <LayoutDashboard className="mr-2 h-5 w-5" />
                Открыть дашборд
              </Button>
            </Link>
          ) : (
            <>
              <Button 
                size="hero" 
                className="bg-zinc-900 text-white hover:bg-zinc-700"
                onClick={openLogin}
              >
                Войти
              </Button>
              <Button 
                size="hero" 
                variant="outline" 
                className="bg-transparent border-zinc-500 hover:bg-zinc-700 hover:text-white"
                onClick={openRegister}
              >
                Создать аккаунт
              </Button>
            </>
          )}
        </motion.div>
      </motion.div>
      
      {/* Контролируемые диалоги */}
      <LoginDialog 
        open={loginOpen} 
        onOpenChange={setLoginOpen}
        onSwitchToRegister={handleSwitchToRegister}
      />
      <RegisterDialog 
        open={registerOpen} 
        onOpenChange={setRegisterOpen}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </div>
  );
}
