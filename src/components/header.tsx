'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Menu, LogOut, LayoutDashboard, ChevronDown, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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

const LOGO_CONFIG = {
  src: "/logo.svg",
  alt: "Изучатор",
  size: 24
} as const

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout, isAuthenticated, loading } = useAuth();

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
            <div className="w-24 h-9 bg-gray-200 animate-pulse rounded"></div>
          ) : isAuthenticated ? (
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-10 px-3 active:scale-100"
                >
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-sm font-medium">
                    {user?.name?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">Привет, {user?.name}!</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
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
                      <AtSign className="!w-4 !h-4 text-muted-foreground" />
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
                <DropdownMenuItem>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Дашборд
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
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
          )}
        </div>

        {/* Мобильное бургер-меню */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="sm:hidden">
              <Menu/>
              <span className="sr-only">Открыть меню</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px] bg-gradient-to-r from-white/60 via-white/50 to-white/60 backdrop-blur-md backdrop-saturate-180 border-l border-white/20">
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent pointer-events-none"></div>
            <div className="relative z-10">
            <SheetHeader>
              <SheetTitle className="flex text-xl items-center gap-4">
                <Image
                  src="/logo.svg"
                  alt="Изучатор"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
                Изучатор
              </SheetTitle>
              {loading ? (
                <div className="mt-6 p-4 bg-white/50 rounded-lg border border-white/20">
                  <div className="animate-pulse">
                    <div className="w-12 h-12 bg-gray-300 rounded-full mb-3"></div>
                    <div className="w-24 h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="w-32 h-3 bg-gray-300 rounded"></div>
                  </div>
                </div>
              ) : isAuthenticated ? (
                <div className="mt-6 p-4 bg-white/50 rounded-lg border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center text-white text-lg font-medium">
                      {user?.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-sm">{user?.name}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <AtSign className="w-3 h-3" />
                      <p>{user?.email}</p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user?.role === 'teacher' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user?.role === 'teacher' ? 'Преподаватель' : 'Ученик'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <SheetDescription className="text-center mt-8">
                  Добро пожаловать в Изучатор!<br />
                  Здесь всё готово к уроку — войдите или создайте аккаунт за пару секунд.
                </SheetDescription>
              )}
            </SheetHeader>
            <div className="flex flex-col gap-4 mt-8 items-center">
              {loading ? (
                <div className="space-y-3">
                  <div className="w-32 h-10 bg-gray-200 animate-pulse rounded"></div>
                  <div className="w-32 h-10 bg-gray-200 animate-pulse rounded"></div>
                </div>
              ) : isAuthenticated ? (
                <>
                  <Button 
                    size="mobileMenu" 
                    className="bg-zinc-900 text-white hover:bg-zinc-700"
                    onClick={() => setMenuOpen(false)}
                  >
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Дашборд
                  </Button>
                  <Button 
                    size="mobileMenu" 
                    variant="outline" 
                    className="bg-transparent border-zinc-500 hover:bg-zinc-700 hover:text-white"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Выйти
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    size="mobileMenu" 
                    className="bg-zinc-900 text-white hover:bg-zinc-700"
                    onClick={() => {
                      setMenuOpen(false);
                      setLoginOpen(true);
                    }}
                  >
                    Войти
                  </Button>
                  <Button 
                    size="mobileMenu" 
                    variant="outline" 
                    className="bg-transparent border-zinc-500 hover:bg-zinc-700 hover:text-white"
                    onClick={() => {
                      setMenuOpen(false);
                      setRegisterOpen(true);
                    }}
                  >
                    Создать аккаунт
                  </Button>
                </>
              )}
            </div>
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
      
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
