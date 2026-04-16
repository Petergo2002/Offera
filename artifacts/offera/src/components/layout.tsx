import React from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  Menu,
  FileText,
  Sparkles,
  Archive as ArchiveIcon,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

interface LayoutProps {
  children: React.ReactNode;
}

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/templates", label: "Skapa", icon: Sparkles },
  { href: "/customers", label: "Kunder", icon: Users },
  { href: "/archive", label: "Arkiv", icon: ArchiveIcon },
  { href: "/settings", label: "Inställningar", icon: Settings },
];

export function Layout({ children }: LayoutProps) {
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const { companyProfile, profile, signOut, user, workspace } = useAuth();

  const isPublicRoute = location.startsWith("/p/");
  const isAuthRoute = location === "/auth";
  const isFocusRoute =
    location.startsWith("/proposal/") || location.startsWith("/templates/");
  const displayName =
    profile?.displayName?.trim() ||
    companyProfile?.companyName?.trim() ||
    user?.email?.split("@")[0] ||
    "Konto";
  const displayMeta =
    workspace?.name?.trim() ||
    profile?.email ||
    companyProfile?.email ||
    "Workspace";

  if (isPublicRoute || isAuthRoute) {
    return (
      <div className="min-h-screen bg-background text-on-surface antialiased">
        {children}
      </div>
    );
  }

  if (isFocusRoute) {
    return (
      <div className="min-h-[100dvh] bg-background text-on-surface antialiased overflow-hidden">
        <main className="h-[100dvh] w-screen overflow-hidden bg-background">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex bg-surface min-h-screen text-on-surface antialiased overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          "hidden lg:flex flex-col py-8 px-4 gap-2 h-screen w-64 border-r border-outline-variant/15 bg-surface-container-low transition-all duration-300 ease-out",
          !isSidebarOpen && "w-20 px-2",
        )}
      >
        <div
          className={cn(
            "px-4 mb-8 flex items-center gap-3 overflow-hidden whitespace-nowrap",
            !isSidebarOpen && "px-2",
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-gradient text-white animate-in zoom-in-50 duration-500">
            <FileText size={20} strokeWidth={2.5} />
          </div>
          <div
            className={cn(
              "transition-opacity duration-300",
              !isSidebarOpen && "opacity-0 invisible",
            )}
          >
            <p className="font-display text-xl font-bold tracking-tight text-slate-900 leading-none">
              Offera
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/70">
              Premium SaaS
            </p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-1 overflow-x-hidden">
          {navLinks.map((link) => {
            const isActive = location === link.href;
            const Icon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                  isActive
                    ? "bg-white text-primary shadow-subtle font-semibold"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-white/50",
                )}
              >
                <Icon
                  size={20}
                  className={cn(
                    "transition-transform duration-300",
                    isActive && "scale-110",
                  )}
                />
                <span
                  className={cn(
                    "text-sm transition-all duration-300",
                    !isSidebarOpen && "opacity-0 invisible w-0",
                  )}
                >
                  {link.label}
                </span>
                {isActive && isSidebarOpen && (
                  <div className="ml-auto w-1 h-4 bg-primary rounded-full animate-in fade-in slide-in-from-right-1 duration-300" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto px-2">
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                void signOut()
                  .then(() => {
                    setLocation("/auth");
                  })
                  .catch((error) => {
                    console.error("Failed to sign out", error);
                  });
              }}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-error hover:bg-error/10 transition-colors text-sm rounded-xl",
                !isSidebarOpen && "px-2 justify-center",
              )}
            >
              <LogOut size={18} />
              {isSidebarOpen && <span>Logga ut</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content & TopNav Wrapper */}
      <div className="relative flex h-[100dvh] flex-1 flex-col overflow-hidden">
        {/* TopNavBar */}
        <nav className="z-40 flex h-16 shrink-0 items-center justify-between border-b border-outline-variant/15 px-4 glassmorphism transition-all duration-300 sm:px-6 md:px-12">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 hover:bg-surface-container-low rounded-lg transition-colors hidden lg:flex active:scale-95 duration-200 min-h-[44px] min-w-[44px] items-center justify-center"
            >
              <Menu size={20} className="text-on-surface-variant" />
            </button>
          </div>

          <div className="flex items-center gap-3 md:gap-5">
            <div className="h-6 w-[1px] bg-outline-variant/20 hidden md:block" />

            <button
              onClick={() => setLocation("/settings")}
              className="group flex min-w-0 items-center gap-2 pl-1 transition-transform duration-200 active:scale-95 sm:gap-3 sm:pl-2"
            >
              <div className="hidden min-w-0 text-right sm:block">
                <p className="mb-0.5 truncate text-xs font-bold leading-none transition-colors group-hover:text-primary">
                  {displayName}
                </p>
                <p className="truncate text-[10px] text-on-surface-variant">
                  {displayMeta}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-surface-container-high flex items-center justify-center border border-outline-variant/15 group-hover:border-primary/50 transition-all shadow-sm">
                <User
                  size={20}
                  className="text-on-surface-variant group-hover:text-primary transition-colors"
                />
              </div>
            </button>
          </div>
        </nav>

        {/* Dynamic Page Content */}
        <main className="flex-1 scroll-smooth overflow-x-hidden overflow-y-auto bg-surface px-4 py-4 pb-28 sm:px-6 sm:py-6 sm:pb-32 md:px-8 md:py-8 lg:px-12 lg:py-12 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Bottom HUD (Mobile Only) */}
      <div className="fixed bottom-4 left-1/2 z-50 flex w-[calc(100vw-1.25rem)] max-w-[30rem] -translate-x-1/2 items-center justify-around gap-1 rounded-full p-1.5 shadow-elevated glassmorphism animate-in slide-in-from-bottom-10 fade-in duration-500 md:hidden">
        <Link
          href="/"
          className={cn(
            "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-2 transition-all",
            location === "/"
              ? "bg-primary text-white"
              : "text-on-surface-variant",
          )}
        >
          <LayoutDashboard size={18} />
          <span className="text-[8px] font-bold uppercase tracking-widest">
            Hem
          </span>
        </Link>
        <Link
          href="/templates"
          className={cn(
            "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-2 transition-all",
            location === "/templates"
              ? "bg-primary text-white"
              : "text-on-surface-variant",
          )}
        >
          <Sparkles size={18} />
          <span className="text-[8px] font-bold uppercase tracking-widest">
            Skapa
          </span>
        </Link>
        <Link
          href="/archive"
          className={cn(
            "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-2 transition-all",
            location === "/archive"
              ? "bg-primary text-white"
              : "text-on-surface-variant",
          )}
        >
          <ArchiveIcon size={18} />
          <span className="text-[8px] font-bold uppercase tracking-widest">
            Arkiv
          </span>
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-2 transition-all",
            location === "/settings"
              ? "bg-primary text-white"
              : "text-on-surface-variant",
          )}
        >
          <Settings size={18} />
          <span className="text-[8px] font-bold uppercase tracking-widest">
            Inställ
          </span>
        </Link>
      </div>
    </div>
  );
}
