import React from "react";

interface LogoProps {
  variant?: "full" | "icon" | "horizontal";
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function Logo({ variant = "full", className = "", size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "h-7",
    md: "h-9",
    lg: "h-12",
    xl: "h-16"
  };

  if (variant === "icon") {
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses[size]} aspect-square ${className}`}>
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Browser Window Background */}
          <rect x="42" y="16" width="70" height="88" rx="12" fill="#0F172A" />
          {/* Browser Titlebar Dots */}
          <circle cx="56" cy="28" r="3" fill="#EF4444" />
          <circle cx="68" cy="28" r="3" fill="#F59E0B" />
          <circle cx="80" cy="28" r="3" fill="#10B981" />
          {/* Browser Content Image Mock */}
          <rect x="52" y="38" width="50" height="32" rx="6" fill="#2563EB" />
          <path d="M52 62L64 50L76 60L90 46L102 58V70H52V62Z" fill="#3B82F6" opacity="0.6" />
          <circle cx="90" cy="46" r="4" fill="#FFFFFF" />
          {/* Browser Text Lines */}
          <rect x="52" y="76" width="36" height="4" rx="2" fill="#64748B" />
          <rect x="52" y="84" width="24" height="4" rx="2" fill="#475569" />

          {/* Magnifying Glass Overlapping */}
          <circle cx="48" cy="62" r="32" stroke="#2563EB" strokeWidth="8" fill="#FFFFFF" fillOpacity="0.9" />
          {/* Store Icon inside Magnifying Glass */}
          <path d="M34 58H62L58 46H38L34 58Z" fill="#1E3A8A" />
          <rect x="36" y="58" width="24" height="14" fill="#1E3A8A" />
          <rect x="44" y="62" width="8" height="10" fill="#FFFFFF" />
          <rect x="22.5" y="78.5" width="22" height="8" rx="4" transform="rotate(45 22.5 78.5)" fill="#2563EB" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      {/* Icon Graphic */}
      <div className={`relative flex items-center justify-center shrink-0 ${sizeClasses[size]} aspect-square`}>
        <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Browser Window Background */}
          <rect x="42" y="16" width="70" height="88" rx="12" fill="#0F172A" />
          {/* Browser Titlebar Dots */}
          <circle cx="56" cy="28" r="3" fill="#EF4444" />
          <circle cx="68" cy="28" r="3" fill="#F59E0B" />
          <circle cx="80" cy="28" r="3" fill="#10B981" />
          {/* Browser Content Image Mock */}
          <rect x="52" y="38" width="50" height="32" rx="6" fill="#2563EB" />
          <circle cx="90" cy="46" r="4" fill="#FFFFFF" />
          {/* Browser Text Lines */}
          <rect x="52" y="76" width="36" height="4" rx="2" fill="#64748B" />
          <rect x="52" y="84" width="24" height="4" rx="2" fill="#475569" />

          {/* Magnifying Glass Overlapping */}
          <circle cx="48" cy="62" r="32" stroke="#2563EB" strokeWidth="8" fill="#FFFFFF" />
          {/* Store Icon inside Magnifying Glass */}
          <path d="M34 58H62L58 46H38L34 58Z" fill="#1E3A8A" />
          <rect x="36" y="58" width="24" height="14" fill="#1E3A8A" />
          <rect x="44" y="62" width="8" height="10" fill="#FFFFFF" />
          <rect x="22.5" y="78.5" width="22" height="8" rx="4" transform="rotate(45 22.5 78.5)" fill="#2563EB" />
        </svg>
      </div>

      {/* Brand Text & Tagline */}
      <div className="flex flex-col">
        <div className="flex items-center space-x-1.5">
          <span className="text-base sm:text-lg lg:text-xl font-black tracking-tight text-slate-900 dark:text-white font-sans whitespace-nowrap">
            Site<span className="text-blue-600 dark:text-blue-400">Scout</span>
          </span>
          <span className="rounded-md bg-gradient-to-tr from-blue-600 to-indigo-600 px-1.5 py-0.5 text-[10px] font-black tracking-widest text-white shadow-sm shadow-blue-500/20">
            AI
          </span>
        </div>
        {variant === "full" && (
          <div className="hidden sm:flex items-center space-x-1 mt-0.5">
            <div className="h-[1px] w-4 bg-blue-500/60" />
            <span className="text-[8px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Find. Build. Close.
            </span>
            <div className="h-[1px] w-4 bg-blue-500/60" />
          </div>
        )}
      </div>
    </div>
  );
}
