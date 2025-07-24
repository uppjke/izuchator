'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AnimatedBlobs } from '@/components/animated-blobs';
import { LoginDialog } from '@/components/auth/login-dialog';
import { RegisterDialog } from '@/components/auth/register-dialog';
import { OtpDialog } from '@/components/auth/otp-dialog';

export default function Home() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  return (
    <div className="min-h-[calc(100dvh-4.5rem)] bg-white flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      <AnimatedBlobs />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center relative z-10"
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
          <Button 
            size="hero" 
            className="bg-zinc-900 text-white hover:bg-zinc-700"
            onClick={() => setLoginOpen(true)}
          >
            Войти
          </Button>
          <Button 
            size="hero" 
            variant="outline" 
            className="bg-transparent border-zinc-500 hover:bg-zinc-700 hover:text-white"
            onClick={() => setRegisterOpen(true)}
          >
            Создать аккаунт
          </Button>
        </motion.div>
        
        {/* Тестовая кнопка для OTP */}
        <motion.div 
          className="mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.8 }}
        >
          <Button 
            variant="outline"
            onClick={() => {
              setTestEmail('test@example.com')
              setOtpOpen(true)
            }}
            className="text-sm"
          >
            🧪 Тест OTP диалога
          </Button>
        </motion.div>
      </motion.div>
      
      {/* Контролируемые диалоги */}
      <LoginDialog 
        open={loginOpen} 
        onOpenChange={setLoginOpen}
        onSwitchToRegister={() => {
          setLoginOpen(false)
          setRegisterOpen(true)
        }}
      />
      <RegisterDialog 
        open={registerOpen} 
        onOpenChange={setRegisterOpen}
        onSwitchToLogin={() => {
          setRegisterOpen(false)
          setLoginOpen(true)
        }}
      />
      <OtpDialog 
        open={otpOpen} 
        onOpenChange={setOtpOpen}
        email={testEmail}
      />
    </div>
  );
}
