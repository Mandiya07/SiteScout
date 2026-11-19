import React, { useState, useEffect, useRef } from "react";
import { GeneratedSite } from "../types";
import { normalizePhoneNumber, generateWhatsappLink } from "../lib/formatters";
import { 
  Phone, MessageSquare, Menu, X, Sparkles, Wrench, Utensils, HeartPulse, Scale, Briefcase, 
  Home, Camera, Scissors, ShieldCheck, GraduationCap, Church, Building2, Zap, TreePine, 
  Trophy, Flag, HeartHandshake, Dumbbell, ShoppingBag, Users, ChevronRight, FileText
} from "lucide-react";

export type WebsitePageId = "home" | "about" | "services" | "gallery" | "blog" | "contact" | "privacy" | "terms" | "404";

export interface WebsiteNavbarProps {
  site: GeneratedSite;
  activePage: WebsitePageId;
  onNavigate: (page: WebsitePageId) => void;
  onLogEvent?: (eventType: string, metadata?: Record<string, any>) => void;
  forcedViewport?: "desktop" | "mobile";
  containerWidth?: number | null;
}

export default function WebsiteNavbar({
  site,
  activePage,
  onNavigate,
  onLogEvent,
  forcedViewport,
  containerWidth
}: WebsiteNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [logoFailed, setLogoFailed] = useState<boolean>(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setLogoFailed(false);
  }, [site.logoUrl]);
  
  // Real-time measurement of the actual navbar width (via ResizeObserver & window resize)
  const [currentWidth, setCurrentWidth] = useState<number>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth;
    }
    return 1024;
  });

  useEffect(() => {
    const measure = () => {
      if (headerRef.current) {
        const rect = headerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setCurrentWidth(rect.width);
          return;
        }
      }
      if (typeof window !== "undefined") {
        setCurrentWidth(window.innerWidth);
      }
    };

    measure();
    window.addEventListener("resize", measure);

    let observer: ResizeObserver | null = null;
    if (headerRef.current && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            setCurrentWidth(entry.contentRect.width);
          }
        }
      });
      observer.observe(headerRef.current);
    }

    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);

  // Determine if small screen mode is active:
  // 1. Explicitly forced by mobile simulator in editor or preview (forcedViewport === "mobile") -> always mobile hamburger mode.
  // 2. Explicitly forced to desktop simulator (forcedViewport === "desktop") -> keep desktop horizontal nav
  //    even inside split-pane editor previews unless the measured container itself is genuinely phone-narrow (< 540px).
  // 3. Otherwise (auto/standalone), switch cleanly at standard 768px breakpoint.
  const measuredWidth =
    containerWidth != null && containerWidth > 0
      ? containerWidth
      : currentWidth > 0
        ? currentWidth
        : typeof window !== "undefined"
          ? window.innerWidth
          : 1024;

  const isSmallScreen =
    forcedViewport === "mobile"
      ? true
      : forcedViewport === "desktop"
        ? measuredWidth < 540
        : measuredWidth < 768 || (typeof window !== "undefined" && window.innerWidth < 768);

  const isCompactDesktop = !isSmallScreen && measuredWidth < 860;

  // Close mobile dropdown if viewport expands to desktop
  useEffect(() => {
    if (!isSmallScreen && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [isSmallScreen, mobileMenuOpen]);

  const sectionsOrder = site.sectionsOrder || ["hero", "features", "services", "about", "testimonials", "faqs", "gallery", "blog", "contact"];

  const getFontFamilyClass = (style: string) => {
    switch (style) {
      case "serif": return "font-serif";
      case "display": return "font-sans tracking-tight font-black";
      case "modern": return "font-sans uppercase tracking-wider font-semibold";
      default: return "font-sans";
    }
  };

  // Truncate and protect business name so even very long names never push the navbar items or hamburger button off-screen
  const renderHeaderLogo = () => {
    const logoType = site.logoType || "text";
    const displayName = site.businessName || "Local Business";

    if (logoType === "icon") {
      const iconId = site.logoIcon || "Sparkles";
      const logoIcons: Record<string, any> = {
        Sparkles, Wrench, Utensils, HeartPulse, Scale, Briefcase, Home, Camera, Scissors, ShieldCheck,
        GraduationCap, Church, Building2, Zap, TreePine, Trophy, Flag, HeartHandshake, Dumbbell, ShoppingBag, Users
      };
      const SelectedIcon = logoIcons[iconId] || Sparkles;
      return (
        <div
          className="flex items-center gap-2 min-w-0 max-w-full cursor-pointer select-none"
          style={{ color: site.primaryColor }}
          onClick={() => { onNavigate("home"); setMobileMenuOpen(false); }}
          title={displayName}
        >
          <SelectedIcon className="h-5 w-5 shrink-0" style={{ color: site.primaryColor }} />
          <span className={`${isSmallScreen ? "text-sm" : "text-sm lg:text-base"} font-bold truncate block min-w-0 ${getFontFamilyClass(site.fontStyle)}`}>
            {displayName}
          </span>
        </div>
      );
    } else if (logoType === "image" && site.logoUrl && !logoFailed) {
      return (
        <div
          className="flex items-center gap-2 cursor-pointer select-none min-w-0 shrink-0"
          onClick={() => { onNavigate("home"); setMobileMenuOpen(false); }}
          title={displayName}
        >
          <img
            src={site.logoUrl}
            alt={displayName}
            className="h-8 w-auto object-contain max-w-[140px] sm:max-w-[180px]"
            referrerPolicy="no-referrer"
            onError={() => setLogoFailed(true)}
          />
        </div>
      );
    } else {
      return (
        <div
          className="cursor-pointer select-none min-w-0 max-w-full"
          style={{ color: site.primaryColor }}
          onClick={() => { onNavigate("home"); setMobileMenuOpen(false); }}
          title={displayName}
        >
          <span className={`${isSmallScreen ? "text-sm" : "text-sm lg:text-base"} font-bold truncate block min-w-0 ${getFontFamilyClass(site.fontStyle)}`}>
            {displayName}
          </span>
        </div>
      );
    }
  };

  const handleSelectNav = (pageId: WebsitePageId) => {
    onNavigate(pageId);
    setMobileMenuOpen(false);
  };

  const navMenuItems: Array<{ id: WebsitePageId; label: string; condition: boolean }> = [
    { id: "home", label: "Home", condition: true },
    { id: "about", label: "About", condition: sectionsOrder.includes("about") },
    { id: "services", label: "Services", condition: sectionsOrder.includes("services") },
    { id: "gallery", label: "Gallery", condition: sectionsOrder.includes("gallery") },
    { id: "blog", label: "Blog", condition: sectionsOrder.includes("blog") },
    { id: "contact", label: "Contact", condition: sectionsOrder.includes("contact") },
  ];

  const visibleMenuItems = navMenuItems.filter(item => item.condition);
  const hasPhone = Boolean(site.phone && site.phone.trim().toLowerCase() !== "unlisted");

  return (
    <header
      ref={headerRef}
      className={`sticky top-0 z-40 border-b border-slate-100 bg-white/95 backdrop-blur-md ${isSmallScreen ? "px-3.5 py-2.5" : "px-5 lg:px-8 py-3.5"} shrink-0 shadow-2xs transition-colors duration-200 w-full`}
      style={{ borderBottomColor: `${site.primaryColor}20` }}
      data-testid="created-website-navbar"
      data-viewport-mode={isSmallScreen ? "small-screen" : "large-screen"}
    >
      <style>{`
        [data-viewport-mode="small-screen"] .website-desktop-nav-links {
          display: none !important;
        }
        [data-viewport-mode="small-screen"] .website-hamburger-toggle-btn {
          display: flex !important;
        }
        [data-viewport-mode="large-screen"] .website-desktop-nav-links {
          display: flex !important;
        }
        [data-viewport-mode="large-screen"] .website-hamburger-toggle-btn {
          display: none !important;
        }
        #website-mobile-dropdown-menu {
          max-height: min(70vh, 460px);
          overflow-y: auto !important;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
        #website-mobile-dropdown-menu::-webkit-scrollbar {
          width: 5px;
        }
        #website-mobile-dropdown-menu::-webkit-scrollbar-track {
          background: transparent;
        }
        #website-mobile-dropdown-menu::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.4);
          border-radius: 9999px;
        }
        #website-mobile-dropdown-menu::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.6);
        }
      `}</style>

      <div className={`flex items-center justify-between gap-3 w-full ${isSmallScreen ? "" : "max-w-5xl mx-auto"}`}>
        {/* Left: Brand / Business Name / Logo */}
        <div className={`flex items-center min-w-0 ${isSmallScreen ? "flex-1 max-w-[65%]" : isCompactDesktop ? "max-w-[165px] shrink-0" : "max-w-[230px] shrink-0"}`}>
          {renderHeaderLogo()}
        </div>

        {/* Center: Horizontal Navigation Links on Desktop */}
        {!isSmallScreen && (
          <nav
            className={`website-desktop-nav-links flex items-center ${isCompactDesktop ? "gap-3 text-[11px]" : "gap-5 lg:gap-7 text-xs"} font-semibold text-slate-600 shrink-0`}
            aria-label="Website desktop navigation"
          >
            {visibleMenuItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectNav(item.id)}
                  className={`hover:text-slate-900 transition-colors cursor-pointer relative py-1.5 whitespace-nowrap ${
                    isActive ? "text-slate-900 font-bold" : ""
                  }`}
                  style={isActive ? { color: site.primaryColor } : {}}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                      style={{ backgroundColor: site.primaryColor }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right Section: Contact CTAs & Hamburger Menu Toggle Button */}
        <div className="flex items-center gap-2 shrink-0">
          {hasPhone && (
            <a
              href={`tel:${normalizePhoneNumber(site.phone)}`}
              onClick={() => onLogEvent?.("phone_clicked")}
              className={`flex items-center justify-center rounded-lg text-white shadow-xs transition-transform hover:scale-105 shrink-0 ${
                !isSmallScreen && !isCompactDesktop ? "h-8.5 px-3 gap-1.5 text-xs font-bold" : "h-8 w-8"
              }`}
              style={{ backgroundColor: site.accentColor || site.primaryColor }}
              title={`Call ${site.phone}`}
              aria-label="Call business phone"
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {!isSmallScreen && !isCompactDesktop && <span>Call</span>}
            </a>
          )}

          {hasPhone && (
            <a
              href={generateWhatsappLink(site.phone, site.whatsappMessage, site.address)}
              onClick={() => onLogEvent?.("whatsapp_clicked")}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-center rounded-lg text-white bg-emerald-500 shadow-xs transition-transform hover:scale-105 shrink-0 ${
                !isSmallScreen && !isCompactDesktop ? "h-8.5 px-3 gap-1.5 text-xs font-bold" : "h-8 w-8"
              }`}
              title="WhatsApp Chat"
              aria-label="Chat on WhatsApp"
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              {!isSmallScreen && !isCompactDesktop && <span>WhatsApp</span>}
            </a>
          )}

          {/* Hamburger Menu Toggle Component (strictly hidden on desktop) */}
          <button
            onClick={() => setMobileMenuOpen(prev => !prev)}
            className={`website-hamburger-toggle-btn ${
              isSmallScreen ? "flex" : "hidden"
            } h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-800 hover:text-slate-900 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs shrink-0 cursor-pointer`}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
            aria-controls="website-mobile-dropdown-menu"
            title={mobileMenuOpen ? "Close menu" : "Open navigation menu"}
            data-testid="hamburger-menu-toggle"
          >
            {mobileMenuOpen ? (
              <X className="h-4.5 w-4.5 text-slate-900" />
            ) : (
              <Menu className="h-4.5 w-4.5 text-slate-800" />
            )}
          </button>
        </div>
      </div>

      {/* Vertical Dropdown List (Only shown on small screens when hamburger toggled open) */}
      {isSmallScreen && mobileMenuOpen && (
        <div
          id="website-mobile-dropdown-menu"
          className="mt-3 pt-3 border-t border-slate-100 flex flex-col space-y-1 animate-fade-in w-full text-left max-h-[min(70vh,460px)] overflow-y-auto overscroll-contain pr-1.5 pb-3 scroll-smooth"
          style={{
            borderTopColor: `${site.primaryColor}20`,
            WebkitOverflowScrolling: "touch"
          }}
          role="menu"
          aria-label="Mobile navigation links"
        >
          {/* Main Menu Links: Home, About, Services, Gallery, Blog, Contact */}
          <div className="flex flex-col space-y-1">
            {visibleMenuItems.map((item) => {
              const isActive = activePage === item.id;
              return (
                <button 
                  key={item.id}
                  onClick={() => handleSelectNav(item.id)} 
                  role="menuitem"
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-all cursor-pointer w-full ${
                    isActive 
                      ? "bg-slate-100 text-slate-900 font-extrabold shadow-2xs" 
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  style={isActive ? { borderLeft: `3px solid ${site.primaryColor}` } : {}}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.id === "home" && <Home className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    {item.id === "about" && <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    {item.id === "services" && <Wrench className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    {item.id === "gallery" && <Camera className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    {item.id === "blog" && <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    {item.id === "contact" && <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isActive ? (
                    <span 
                      className="w-2 h-2 rounded-full shrink-0" 
                      style={{ backgroundColor: site.primaryColor }} 
                    />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Secondary Utility Links: Privacy, Terms, 404 */}
          <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between px-3 text-[11px] text-slate-500">
            <button 
              onClick={() => handleSelectNav("privacy")} 
              className={`hover:underline cursor-pointer ${activePage === "privacy" ? "text-slate-900 font-bold" : ""}`}
            >
              Privacy Policy
            </button>
            <span className="text-slate-200">•</span>
            <button 
              onClick={() => handleSelectNav("terms")} 
              className={`hover:underline cursor-pointer ${activePage === "terms" ? "text-slate-900 font-bold" : ""}`}
            >
              Terms of Service
            </button>
            <span className="text-slate-200">•</span>
            <button 
              onClick={() => handleSelectNav("404")} 
              className={`hover:underline cursor-pointer ${activePage === "404" ? "text-slate-900 font-bold" : ""}`}
            >
              404 Page
            </button>
          </div>

          {/* Direct Call shortcut inside mobile dropdown */}
          {site.phone && site.phone.trim().toLowerCase() !== "unlisted" && (
            <div className="pt-2 mt-1">
              <a
                href={`tel:${normalizePhoneNumber(site.phone)}`}
                onClick={() => {
                  onLogEvent?.("phone_clicked");
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-white text-xs font-bold shadow-xs transition-opacity hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: site.primaryColor }}
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Call {site.phone}</span>
              </a>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
