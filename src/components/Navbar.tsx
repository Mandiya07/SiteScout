import { Search, Globe, Award, Trophy, User, LogOut, Moon, Sun, Settings, Zap } from "lucide-react";
import { UserSession } from "../types";

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
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 transition-colors duration-200">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab("dashboard")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/10">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
              SiteScout <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">AI</span>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-wider">Find. Build. Close.</p>
          </div>
        </div>

        {/* Center: Main Navigation */}
        <nav className="hidden md:flex space-x-1 lg:space-x-2">
          {[
            { id: "dashboard", label: "Dashboard" },
            { id: "finder", label: "Business Finder" },
            { id: "templates", label: "Templates" },
            { id: "proposals", label: "Proposals & Pricing" },
            { id: "portal", label: "Client Portal" },
            ...(session.role === "Admin" ? [{ id: "admin", label: "Admin Console" }] : [])
          ].map((tab) => {
            const isActive = activeTab === tab.id || 
              (tab.id === "finder" && ["finder", "analysis", "generator", "editor", "sales"].includes(activeTab));
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-950/45 dark:text-blue-400"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Quick Stats & User Profile */}
        <div className="flex items-center space-x-4">
          {/* Quick Mini Stats Tracker */}
          <div className="hidden lg:flex items-center space-x-4 rounded-xl border border-slate-100 bg-slate-50/50 p-1 px-3 dark:border-slate-800 dark:bg-slate-950/30 text-xs text-slate-600 dark:text-slate-400">
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
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-colors duration-200"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* User Session Profile details */}
          <div className="flex items-center space-x-2.5 border-l border-slate-200 dark:border-slate-800 pl-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <User className="h-4.5 w-4.5" />
            </div>
            <div className="hidden sm:block text-left text-xs">
              <p className="font-semibold text-slate-800 dark:text-slate-200 leading-none">{session.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="rounded bg-blue-50 px-1 py-0.2 text-[9px] font-medium text-blue-700 dark:bg-blue-950/45 dark:text-blue-300 flex items-center gap-0.5">
                  <Zap className="h-2 w-2 text-blue-500" /> {session.subscription}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">({session.role})</span>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors duration-200"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
