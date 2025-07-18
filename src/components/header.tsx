'use client';

import Image from 'next/image';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function Header() {
  return (
    <header className="border-b border-white/20 bg-gradient-to-r from-white/60 via-white/50 to-white/60 backdrop-blur-md backdrop-saturate-180 sticky top-0 z-50 shadow-sm shadow-black/5">
      <div className="container mx-auto px-2 h-16 flex items-center justify-between relative">
        {/* Тонкий градиент-отражение сверху */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent pointer-events-none"></div>
        
        {/* Контент хедера */}
        <div className="relative z-10 flex items-center justify-between w-full">
        {/* Логотип + название */}
        <div className="flex items-center gap-4">
          <Image
            src="/logo.svg"
            alt="Изучатор"
            width={32}
            height={32}
            className="w-6 h-6"
          />
          <span className="font-bold text-xl text-zinc-900">Изучатор</span>
        </div>

        {/* Десктопные кнопки */}
        <div className="hidden sm:flex items-center gap-4">
          <Button size="header" className="bg-zinc-900 text-white hover:bg-zinc-700">
            Войти
          </Button>
          <Button size="header" variant="outline" className="border-zinc-500 hover:bg-zinc-100">
            Создать аккаунт
          </Button>
        </div>

        {/* Мобильное бургер-меню */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="sm:hidden">
              <Menu/>
              <span className="sr-only">Открыть меню</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px]">
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
              <SheetDescription className="text-center mt-8">
                Добро пожаловать в Изучатор!<br />
                Здесь всё готово к уроку — войдите или создайте аккаунт за пару секунд.

              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-4 mt-8 items-center">
              <Button size="mobileMenu" className="bg-zinc-900 text-white hover:bg-zinc-700">
                Войти
              </Button>
              <Button size="mobileMenu" variant="outline" className="border-zinc-500 hover:bg-zinc-100">
                Создать аккаунт
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
    </header>
  );
}
