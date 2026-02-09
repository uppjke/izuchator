"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useAuth } from "@/lib/auth-context";
import { usePresence } from "@/hooks/use-presence";
import { PresenceProvider } from "@/lib/presence-context";

// Компоненты навигации
import { BottomTabBar, type TabId } from "@/components/ui/bottom-tab-bar";
import { MobileHeader } from "@/components/ui/mobile-header";
import { DesktopSidebar } from "@/components/ui/desktop-sidebar";
import { DesktopHeader } from "@/components/ui/desktop-header";

// Tab компоненты
import { DashboardTab } from "./_components/tabs/dashboard-tab";
import { PlannerTab } from "./_components/tabs/planner-tab";
import { StudentsTab } from "./_components/tabs/students-tab";
import { TeachersTab } from "./_components/tabs/teachers-tab";
import { MaterialsTab } from "./_components/tabs/materials-tab";
import { BoardsTab } from "./_components/tabs/boards-tab";

type UserRole = "student" | "teacher";

// Названия страниц для header
const tabNames: Record<TabId, string> = {
  dashboard: 'Дашборд',
  planner: 'Планер',
  students: 'Мои ученики',
  teachers: 'Мои учителя',
  materials: 'Материалы',
  boards: 'Доски',
}

// Компоненты табов
const tabComponents = {
  dashboard: DashboardTab,
  planner: PlannerTab,
  students: StudentsTab,
  teachers: TeachersTab,
  materials: MaterialsTab,
  boards: BoardsTab,
} as const;

export default function DashboardLayout() {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const userRole = (user?.role?.toLowerCase() as UserRole) || "student";

  // Инициализируем отслеживание присутствия
  const presenceData = usePresence();

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  // Search state — managed here so headers and tab content share the same query
  const [searchQuery, setSearchQuery] = useState('');
  const showSearch = activeTab !== 'dashboard';

  // Восстановление активного таба из localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem("dashboardActiveTab") as TabId;
    if (savedTab && Object.keys(tabComponents).includes(savedTab)) {
      // Проверяем права доступа к табу
      if (
        (savedTab === "students" && userRole !== "teacher") ||
        (savedTab === "teachers" && userRole !== "student")
      ) {
        return;
      }
      setActiveTab(savedTab);
    }
  }, [userRole]);

  const changeTab = useCallback(
    (newTab: TabId) => {
      // Валидация доступа к табам по роли
      if (
        (newTab === "students" && userRole !== "teacher") ||
        (newTab === "teachers" && userRole !== "student")
      ) {
        return;
      }

      setActiveTab(newTab);
      setSearchQuery(''); // Clear search when switching tabs
      localStorage.setItem("dashboardActiveTab", newTab);
    },
    [userRole]
  );

  const handleLogout = useCallback(async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
  }, []);

  // Активный компонент таба
  const ActiveTabComponent = useMemo(() => {
    if (
      (activeTab === "students" && userRole !== "teacher") ||
      (activeTab === "teachers" && userRole !== "student")
    ) {
      return tabComponents.dashboard;
    }
    return tabComponents[activeTab] || tabComponents.dashboard;
  }, [activeTab, userRole]);

  // iOS Safari viewport height fix
  useEffect(() => {
    function setVH() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    }

    setVH();
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", () => {
      setTimeout(setVH, 100);
    });

    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
    };
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, loading, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-900 border-t-transparent mx-auto mb-4" />
          <p className="text-zinc-600 text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const currentPageTitle = tabNames[activeTab];

  return (
    <PresenceProvider value={presenceData}>
      <div className="flex h-dvh bg-zinc-50 overflow-hidden">
        {/* Desktop Sidebar - только на lg+ */}
        <DesktopSidebar
          userRole={userRole}
          user={user}
          activeTab={activeTab}
          onTabChange={changeTab}
          onLogout={handleLogout}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Mobile/Tablet Header - до lg */}
          <div className="lg:hidden">
            <MobileHeader
              title={currentPageTitle}
              user={user}
              userRole={userRole}
              onLogout={handleLogout}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              showSearch={showSearch}
            />
          </div>

          {/* Desktop Header - только на lg+ */}
          <DesktopHeader
            title={currentPageTitle}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            showSearch={showSearch}
          />

          {/* Page content */}
          <main className="flex-1 overflow-auto p-4 lg:p-6 pb-20 lg:pb-4">
            <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/50 h-full overflow-auto">
              <div className="p-4 lg:p-6 h-full">
                {activeTab === 'dashboard' ? (
                  <DashboardTab onNavigate={changeTab} />
                ) : (
                  <ActiveTabComponent searchQuery={searchQuery} />
                )}
              </div>
            </div>
          </main>
        </div>

        {/* Bottom Tab Bar - мобильные и планшеты (до lg) */}
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={changeTab}
          userRole={userRole}
        />
      </div>
    </PresenceProvider>
  );
}
