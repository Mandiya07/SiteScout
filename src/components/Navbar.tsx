import { Search, Globe, Trophy, User, LogOut, Moon, Sun, Zap, Menu, X } from "lucide-react";
import { UserSession } from "../types";
import { useState } from "react";
import Logo from "./Logo";
import { PWAInstallButton } from "./PWAInstallButton";

interface NavbarProps {
  session: UserSession;
  onLogout: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  stats: {
    found: number;
    generated: number;
    proposals: number;
    won: number;
  };
}

export default function Navbar({
  session,
  onLogout,
  darkMode,
  setDarkMode,
  activeTab,
  setActiveTab,
  stats
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "finder", label: "Find Businesses" },
    { id: "prospects", label: "Prospects" },
    { id: "review_queue", label: "Review Queue" },
    { id: "websites", label: "Websites" },
    { id: "proposals", label: "Proposals" },
    { id: "crm", label: "CRM Sync" }
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 transition-colors duration-200 overflow-x-hidden">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-2 sm:px-4 lg:px-8">
        {/* Left: Brand & Mobile Hamburger */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden rounded-lg p-1.5 sm:p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div onClick={() => { setActiveTab("dashboard"); setMobileMenuOpen(false); }} className="cursor-pointer">
            <Logo variant="full" size="sm" />
          </div>
        </div>

        {/* Center: Main Navigation (Desktop) */}
        <nav className="hidden lg:flex space-x-1 xl:space-x-1.5 shrink-0">
          {navItems.map((tab) => {
            const isActive = activeTab === tab.id || 
              (tab.id === "finder" && ["finder", "analysis", "generator", "editor", "sales"].includes(activeTab)) ||
              (tab.id === "websites" && ["websites", "preview", "portal"].includes(activeTab));
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-2.5 xl:px-3.5 py-1.5 text-xs xl:text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/45 dark:text-blue-400 shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Quick Stats & User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Quick Mini Stats Tracker */}
          <div className="hidden 2xl:flex items-center space-x-3 rounded-xl border border-slate-100 bg-slate-50/50 p-1 px-3 dark:border-slate-800 dark:bg-slate-950/30 text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1" title="Businesses Found">
              <Search className="h-3.5 w-3.5 text-blue-500" />
              <span className="font-bold text-slate-800 dark:text-slate-200">{stats.found}</span>
              <span>Found</span>
            </div>
            <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-1" title="Previews Generated">
              <Globe className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-bold text-slate-800 dark:text-slate-200">{stats.generated}</span>
              <span>Previews</span>
            </div>
            <div className="h-3 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-1" title="Clients Won">
              <Trophy className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-bold text-slate-800 dark:text-slate-200">{stats.won}</span>
              <span>Won</span>
            </div>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-lg p-1.5 sm:p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors duration-200 cursor-pointer"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Install App Button */}
          <PWAInstallButton variant="navbar" />

          {/* User Session Profile details */}
          <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-800 pl-2 sm:pl-3">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shrink-0">
              <User className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </div>
            <div className="hidden sm:block text-left text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200 leading-none">{session.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="rounded bg-blue-50 px-1 py-0.2 text-[9px] font-medium text-blue-700 dark:bg-blue-950/45 dark:text-blue-300 flex items-center gap-0.5">
                  <Zap className="h-2 w-2 text-blue-500" /> Internal Agency
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">(Lead Operator)</span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="rounded-lg p-1.5 sm:p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors duration-200 cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white/98 dark:border-slate-800 dark:bg-slate-900/98 px-4 pt-3 pb-5 space-y-2 shadow-xl animate-fadeIn max-h-[calc(100vh-70px)] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
            <div className="text-xs">
              <p className="font-bold text-slate-900 dark:text-white">{session.name}</p>
              <p className="text-slate-500 text-[10px]">{session.email}</p>
            </div>
            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              Agency Suite
            </span>
          </div>

          <div className="grid grid-cols-1 gap-1">
            {navItems.map((tab) => {
              const isActive = activeTab === tab.id || 
                (tab.id === "finder" && ["finder", "analysis", "generator", "editor", "sales"].includes(activeTab)) ||
                (tab.id === "websites" && ["websites", "preview", "portal"].includes(activeTab));
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left rounded-xl px-4 py-3 text-sm font-semibold transition-all flex items-center justify-between cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && <span className="h-2 w-2 rounded-full bg-white animate-pulse" />}
                </button>
              );
            })}
          </div>

          {/* Mobile Quick Stats Summary */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
              <p className="text-[10px] uppercase font-bold text-slate-400">Found</p>
              <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">{stats.found}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
              <p className="text-[10px] uppercase font-bold text-slate-400">Previews</p>
              <p className="text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400">{stats.generated}</p>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-2">
              <p className="text-[10px] uppercase font-bold text-slate-400">Won</p>
              <p className="text-sm font-mono font-bold text-emerald-600 dark:text-emerald-400">{stats.won}</p>
            </div>
          </div>

          {/* Mobile Install Option */}
          <div className="pt-2">
            <PWAInstallButton variant="mobile" onAction={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}

