import { Search, Globe, Trophy, User, LogOut, Moon, Sun, Zap, Menu, X, Download, ArrowUpFromLine, PlusSquare, Laptop, Smartphone, HelpCircle, Sparkles, Check } from "lucide-react";
import { UserSession } from "../types";
import { useState, useEffect } from "react";
import Logo from "./Logo";
import { motion, AnimatePresence } from "motion/react";

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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Detect if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log('[PWA] beforeinstallprompt event captured');
    };

    const handleAppInstalled = () => {
      console.log('[PWA] Application installed successfully');
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User response to installation prompt: ${outcome}`);
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsStandalone(true);
      }
    } else {
      // If prompt is not deferred, show the helpful manual install guide modal
      setShowInstallGuide(true);
    }
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "finder", label: "Find Businesses" },
    { id: "prospects", label: "Prospects" },
    { id: "websites", label: "Websites" },
    { id: "proposals", label: "Proposals" }
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
              (tab.id === "finder" && ["finder", "analysis", "generator", "editor", "sales"].includes(activeTab));
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
          {!isStandalone && (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200 cursor-pointer shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transform hover:-translate-y-0.5 active:translate-y-0"
              title="Install App to your device"
            >
              <Download className="h-3.5 w-3.5 animate-bounce" />
              <span className="hidden md:inline">Install App</span>
            </button>
          )}

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
                (tab.id === "finder" && ["finder", "analysis", "generator", "editor", "sales"].includes(activeTab));
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
          {!isStandalone && (
            <div className="pt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleInstallClick();
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all active:scale-[0.98]"
              >
                <Download className="h-4 w-4 animate-pulse" />
                <span>Download & Install App</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* PWA Manual Installation Guide Modal */}
      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstallGuide(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100"
            >
              <button
                onClick={() => setShowInstallGuide(false)}
                className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Install SiteScout AI</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Run like a native app on your device</p>
                </div>
              </div>

              {/* Benefits list */}
              <div className="mb-6 space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <div className="flex items-start gap-2.5 text-xs">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Instant Launch:</strong> Launches directly from your Home Screen, Dock, or App Drawer.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Full Screen Immersion:</strong> Removes browser tabs, URL bars, and menus for a 100% focused UI.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><strong>Smart Cache:</strong> Keeps critical files cached for quick startups and better offline stability.</span>
                </div>
              </div>

              {/* Custom device guides */}
              <div className="space-y-4">
                {isIOS ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Smartphone className="h-4 w-4 text-blue-500" />
                      <span>iOS / Safari Installation Guide</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-2.5 text-xs text-slate-600 dark:text-slate-300 pl-1">
                      <li>
                        Tap the <strong className="inline-flex items-center gap-0.5 text-slate-950 dark:text-white px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">Share <ArrowUpFromLine className="h-3.5 w-3.5 inline mx-0.5" /></strong> button in the Safari navigation bar.
                      </li>
                      <li>
                        Scroll down and tap <strong className="inline-flex items-center gap-0.5 text-slate-950 dark:text-white px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">Add to Home Screen <PlusSquare className="h-3.5 w-3.5 inline mx-0.5" /></strong>.
                      </li>
                      <li>
                        Tap <strong className="text-slate-950 dark:text-white">Add</strong> in the top-right corner to finalize installation.
                      </li>
                    </ol>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Laptop className="h-4 w-4 text-blue-500" />
                      <span>Desktop & Android Guide</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Your browser does not support direct automated trigger prompts, or you have already requested it. To install manually:
                    </p>
                    <ul className="list-disc list-inside space-y-2.5 text-xs text-slate-600 dark:text-slate-300 pl-1">
                      <li>
                        Look for the <strong className="text-slate-950 dark:text-white">Install Icon <Download className="h-3.5 w-3.5 inline mx-0.5" /></strong> on the right side of your browser's address bar.
                      </li>
                      <li>
                        Or, open your browser's menu <strong className="text-slate-950 dark:text-white">(three dots ⋮)</strong> and select <strong className="text-slate-950 dark:text-white">"Install SiteScout AI"</strong> or <strong className="text-slate-950 dark:text-white">"Add to Home screen"</strong>.
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
}

