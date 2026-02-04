'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LoginDialog } from '@/components/auth/login-dialog';
import { RegisterDialog } from '@/components/auth/register-dialog';
import { useAuth } from '@/lib/auth-context';
import { Icon } from '@/components/ui/icon'
import { UserAvatar } from '@/components/ui/user-avatar'
import { motion, AnimatePresence } from 'framer-motion';

const LOGO_CONFIG = {
  src: "/logo.svg",
  alt: "Изучатор",
  size: 24
} as const

// Анимированная иконка бургер-меню
function AnimatedMenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <div className="w-5 h-5 flex flex-col justify-center items-center gap-[5px]">
      <motion.span
        className="block w-5 h-[2px] bg-zinc-900 rounded-full origin-center"
        animate={isOpen ? { rotate: 45, y: 3.5 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      />
      <motion.span
        className="block w-5 h-[2px] bg-zinc-900 rounded-full"
        animate={isOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.15 }}
      />
      <motion.span
        className="block w-5 h-[2px] bg-zinc-900 rounded-full origin-center"
        animate={isOpen ? { rotate: -45, y: -3.5 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      />
    </div>
  )
}

// Варианты анимации для контейнера меню
const menuVariants = {
  closed: {
    opacity: 0,
    x: '100%',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
      staggerChildren: 0.05,
      staggerDirection: -1,
    }
  },
  open: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
      staggerChildren: 0.07,
      delayChildren: 0.1,
    }
  }
}

// Варианты анимации для элементов меню
const menuItemVariants = {
  closed: { opacity: 0, x: 20 },
  open: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }
}

// Варианты анимации для backdrop
const backdropVariants = {
  closed: { opacity: 0 },
  open: { opacity: 1 }
}

interface HeaderProps {
  hideAuthButtons?: boolean
}

export function Header({ hideAuthButtons = false }: HeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout, isAuthenticated, loading } = useAuth();

  // Блокировка скролла при открытии меню
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  // Закрытие меню по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  // Мемоизированные колбеки для оптимизации
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
  
  // Не показываем Header на страницах дашборда (у них свой header)
  if (pathname?.startsWith('/dashboard')) {
    return null;
  }
  return (
    <header className="border-b border-white/20 bg-gradient-to-r from-white/60 via-white/50 to-white/60 backdrop-blur-md backdrop-saturate-180 sticky top-0 z-50 shadow-sm shadow-black/5">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <Image
            src={LOGO_CONFIG.src}
            alt={LOGO_CONFIG.alt}
            width={LOGO_CONFIG.size}
            height={LOGO_CONFIG.size}
            className="w-6 h-6"
          />
          <span className="font-bold text-xl text-zinc-900">{LOGO_CONFIG.alt}</span>
        </div>

        {/* Десктопные кнопки */}
        <div className="hidden sm:flex items-center gap-4">
          {loading ? (
            !hideAuthButtons && <div className="w-24 h-9 bg-gray-200 animate-pulse rounded"></div>
          ) : isAuthenticated ? (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-10 px-3 active:scale-100"
                >
                  <UserAvatar 
                    user={{
                      name: user?.name,
                      email: user?.email,
                      avatar_url: null // Пока null, потом добавим логику
                    }}
                    size="sm"
                  />
                  <span className="text-sm font-medium">Привет, {user?.name}!</span>
                  <Icon 
                    icon={ChevronDown}
                    size="sm"
                    className={`transition-transform duration-200 ${
                      dropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-gradient-to-r from-white/60 via-white/50 to-white/60 backdrop-blur-md backdrop-saturate-180 border-white/20">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user?.role === 'teacher' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user?.role === 'teacher' ? 'Преподаватель' : 'Ученик'}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">
                    <Icon icon={LayoutDashboard} size="sm" className="mr-2" />
                    Дашборд
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <Icon icon={LogOut} size="sm" className="mr-2" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !hideAuthButtons ? (
            <>
              <Button 
                size="header" 
                className="bg-zinc-900 text-white hover:bg-zinc-700"
                onClick={openLogin}
              >
                Войти
              </Button>
              <Button 
                size="header" 
                variant="outline" 
                className="bg-transparent border-zinc-500 hover:bg-zinc-700 hover:text-white"
                onClick={openRegister}
              >
                Создать аккаунт
              </Button>
            </>
          ) : null}
        </div>

        {/* Мобильное бургер-меню */}
        {!hideAuthButtons && (
          <div className="sm:hidden">
            {/* Кнопка бургер-меню - прозрачная */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center justify-center w-10 h-10"
              aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            >
              <AnimatedMenuIcon isOpen={menuOpen} />
            </button>
          </div>
        )}
        </div>
      </div>
      
      {/* Мобильное меню - рендерим через Portal в body с анимацией */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {menuOpen && (
            <div className="fixed inset-0 z-[9999]">
              {/* Backdrop с анимацией */}
              <motion.div
                className="absolute inset-0 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setMenuOpen(false)}
              />

              {/* Панель с анимацией выезжания */}
              <motion.div 
                className="absolute top-0 right-0 h-full w-[300px] bg-white shadow-2xl overflow-y-auto"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              >
                {/* Кнопка закрытия */}
                <button
                  onClick={() => setMenuOpen(false)}
                  className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-100 z-10"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>

                {/* Контент */}
                <div className="p-6 pt-16">
                  {/* Логотип */}
                  <motion.div 
                    className="flex items-center gap-3 mb-8"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center">
                      <Image src="/logo.svg" alt="" width={20} height={20} className="invert" />
                    </div>
                    <span className="font-bold text-xl text-zinc-900">Изучатор</span>
                  </motion.div>

                  {/* Приветствие */}
                  {!isAuthenticated && !loading && (
                    <motion.div 
                      className="text-center py-6 mb-4 bg-zinc-50 rounded-xl"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      <div className="text-3xl mb-2">👋</div>
                      <p className="font-semibold text-zinc-900">Добро пожаловать!</p>
                      <p className="text-sm text-zinc-500">Войдите или создайте аккаунт</p>
                    </motion.div>
                  )}

                  {/* Карточка пользователя */}
                  {isAuthenticated && user && (
                    <motion.div 
                      className="p-4 bg-zinc-50 rounded-xl mb-6"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar user={{ name: user.name, email: user.email, avatar_url: null }} size="md" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-zinc-900 truncate">{user.name}</p>
                          <p className="text-sm text-zinc-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Кнопки */}
                  <div className="space-y-3">
                    {isAuthenticated ? (
                      <>
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Button
                            size="mobileMenu"
                            className="bg-zinc-900 text-white hover:bg-zinc-700"
                            asChild
                          >
                            <Link
                              href="/dashboard"
                              onClick={() => setMenuOpen(false)}
                            >
                              <Icon icon={LayoutDashboard} size="md" />
                              Дашборд
                            </Link>
                          </Button>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 }}
                        >
                          <Button
                            size="mobileMenu"
                            variant="outline"
                            className="bg-transparent border-zinc-300 hover:bg-zinc-100"
                            onClick={() => { setMenuOpen(false); logout(); }}
                          >
                            <Icon icon={LogOut} size="md" />
                            Выйти
                          </Button>
                        </motion.div>
                      </>
                    ) : (
                      <>
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Button
                            size="mobileMenu"
                            className="bg-zinc-900 text-white hover:bg-zinc-700 justify-center"
                            onClick={() => { setMenuOpen(false); setLoginOpen(true); }}
                          >
                            Войти
                          </Button>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.25 }}
                        >
                          <Button
                            size="mobileMenu"
                            variant="outline"
                            className="bg-transparent border-zinc-300 hover:bg-zinc-100 justify-center"
                            onClick={() => { setMenuOpen(false); setRegisterOpen(true); }}
                          >
                            Создать аккаунт
                          </Button>
                        </motion.div>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
      
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
    </header>
  );
}
