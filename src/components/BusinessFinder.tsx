import React, { useState, useMemo } from 'react';
import { 
  Search, MapPin, ArrowRight, Filter, AlertCircle, Building2, 
  Download, Copy, Check, Sparkles, Layers, Phone, Globe, MessageSquare, 
  ShoppingBag, Calendar, Mail, Smartphone, ShieldAlert, Zap, SlidersHorizontal,
  ChevronDown, Database, ExternalLink, CheckCircle2, XCircle
} from 'lucide-react';
import { Business, SearchFilters, DigitalDeficitAudit } from '../types';

interface BusinessFinderProps {
  businesses: Business[];
  loading: boolean;
  onSearch: (filters: SearchFilters) => void;
  onAnalyze: (business: Business) => void;
}

const DIRECTORY_CATEGORIES = [
  // Client Direct Prospect Categories
  { id: "Restaurants", name: "Restaurants & Diners", icon: "🍽️" },
  { id: "Salons", name: "Salons, Spas & Barbers", icon: "✂️" },
  { id: "Car Dealerships", name: "Car Dealerships & Auto Sales", icon: "🚗" },
  { id: "Construction", name: "Construction & Civil Works", icon: "🏗️" },
  { id: "Lawyers", name: "Lawyers & Legal Practices", icon: "⚖️" },
  { id: "Real Estate", name: "Real Estate & Property Agencies", icon: "🏢" },
  { id: "Tour Operators", name: "Tour Operators & Travel Agencies", icon: "🦁" },
  { id: "Schools", name: "Schools & Academies", icon: "🎓" },
  { id: "Medical Practices", name: "Medical Practices & Clinics", icon: "🏥" },
  { id: "Retailers", name: "Retailers & Boutiques", icon: "🛍️" },
  { id: "Caterers", name: "Caterers & Food Services", icon: "🍲" },
  { id: "Funeral Businesses", name: "Funeral Parlours & Services", icon: "🕊️" },
  { id: "Mechanics", name: "Mechanics & Auto Repairs", icon: "🔧" },
  { id: "Security Companies", name: "Security Companies & Guards", icon: "🛡️" },
  { id: "Cleaning Companies", name: "Cleaning Companies & Janitorial", icon: "✨" },
  // High-Converting White-Label Partner Niches (They have clients who need websites)
  { id: "Graphic Designers", name: "Graphic Designers (Partner)", icon: "🎨" },
  { id: "Photographers", name: "Photographers (Partner)", icon: "📸" },
  { id: "Accountants", name: "Accountants (Partner)", icon: "📊" },
  { id: "Printers", name: "Printers & Print Shops (Partner)", icon: "🖨️" },
  { id: "Sign Companies", name: "Sign Companies (Partner)", icon: "🪧" },
  { id: "Social Media Managers", name: "Social Media Managers (Partner)", icon: "📱" },
  { id: "IT Technicians", name: "IT Technicians & MSPs (Partner)", icon: "💻" },
  { id: "Marketing Agencies", name: "Marketing Agencies (Partner)", icon: "🚀" },
  { id: "Event Planners", name: "Event Planners (Partner)", icon: "🎪" },
  { id: "Branding Companies", name: "Branding Companies (Partner)", icon: "✨" },
  { id: "Agriculture", name: "Agriculture & Farming", icon: "🌾" },
  { id: "Transport", name: "Transport & Logistics", icon: "🚚" }
];

const DIRECTORY_SOURCES = [
  "National Business Directory & Yellow Pages Context",
  "Google Maps & Local Search Context",
  "Chamber of Commerce & Trade Registry Context",
  "Industry Trade Association Index Context"
];

const LOCATION_PRESETS = [
  { country: "Eswatini", city: "Mbabane", label: "Mbabane, Eswatini" },
  { country: "Eswatini", city: "Manzini", label: "Manzini, Eswatini" },
  { country: "Eswatini", city: "Matsapha", label: "Matsapha Industrial, Eswatini" },
  { country: "Eswatini", city: "Ezulwini", label: "Ezulwini Valley, Eswatini" },
  { country: "South Africa", city: "Johannesburg", label: "Johannesburg, SA" },
  { country: "United Kingdom", city: "London", label: "London, UK" },
  { country: "USA", city: "Austin", label: "Austin, USA" }
];

const DEFICIT_DEFINITIONS: { key: keyof DigitalDeficitAudit; label: string; icon: any; tip: string }[] = [
  { key: "noWebsite", label: "No Website", icon: Globe, tip: "Zero web address or domain exists" },
  { key: "outdatedWebsite", label: "Terrible/Outdated Web", icon: ShieldAlert, tip: "2000s era non-responsive design" },
  { key: "noGooglePresence", label: "No Google Presence", icon: MapPin, tip: "Unclaimed or poor Google Maps profile" },
  { key: "noSocialMedia", label: "No Social Media", icon: Layers, tip: "No active Facebook or Instagram pages" },
  { key: "poorBranding", label: "Poor Branding", icon: Sparkles, tip: "No clean logo or low-res graphics" },
  { key: "noWhatsappCta", label: "No WhatsApp CTA", icon: MessageSquare, tip: "Missing instant 1-click WhatsApp button" },
  { key: "noOnlineCatalogue", label: "No Online Catalogue", icon: ShoppingBag, tip: "No visual product/service catalogue" },
  { key: "noBookingSystem", label: "No Booking System", icon: Calendar, tip: "Lacks automated scheduling/reservations" },
  { key: "noEnquiryForm", label: "No Enquiry Form", icon: Mail, tip: "No structured quote/lead generation form" },
  { key: "noSeo", label: "No Local SEO", icon: Search, tip: "Missing search meta tags & keyword ranking" },
  { key: "brokenLinks", label: "Broken Links/SSL", icon: XCircle, tip: "Insecure HTTP or broken internal links" },
  { key: "poorMobileExperience", label: "Poor Mobile Exp", icon: Smartphone, tip: "Fails on smartphones & small screens" },
  { key: "missingContact", label: "Missing Contact Info", icon: Phone, tip: "Missing direct email or verified phone" }
];

export default function BusinessFinder({ businesses, loading, onSearch, onAnalyze }: BusinessFinderProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    country: 'Eswatini',
    city: 'Mbabane',
    town: '',
    category: 'Construction',
    keywords: '',
    radius: '15',
    directorySource: 'National Business Directory / Yellow Pages'
  });

  // Active deficit filters (empty array = show all)
  const [activeDeficitFilters, setActiveDeficitFilters] = useState<(keyof DigitalDeficitAudit)[]>([]);
  const [sortOrder, setSortOrder] = useState<'deficits_desc' | 'rating_desc' | 'rating_asc' | 'score_asc'>('deficits_desc');
  const [copiedExport, setCopiedExport] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(true);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(filters);
  };

  const handlePresetSelect = (preset: typeof LOCATION_PRESETS[0]) => {
    setFilters(prev => ({
      ...prev,
      country: preset.country,
      city: preset.city,
      town: ''
    }));
  };

  const toggleDeficitFilter = (key: keyof DigitalDeficitAudit) => {
    setActiveDeficitFilters(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const clearDeficitFilters = () => {
    setActiveDeficitFilters([]);
  };

  // Helper to extract or fallback deficits
  const getBusinessDeficits = (biz: Business): DigitalDeficitAudit => {
    if (biz.presence?.deficits) {
      return biz.presence.deficits;
    }
    // Fallback based on presence flags
    return {
      noWebsite: !biz.presence?.hasWebsite,
      outdatedWebsite: false,
      noGooglePresence: biz.presence?.googleProfileQuality === 'poor',
      noSocialMedia: biz.presence?.facebookStatus === 'none' && biz.presence?.instagramStatus === 'none',
      poorBranding: biz.presence?.photosStatus === 'missing' || biz.presence?.photosStatus === 'outdated',
      noWhatsappCta: true,
      noOnlineCatalogue: !biz.presence?.hasWebsite,
      noBookingSystem: true,
      noEnquiryForm: !biz.presence?.hasEmail,
      noSeo: !biz.presence?.hasWebsite,
      brokenLinks: !biz.presence?.hasWebsite,
      poorMobileExperience: !biz.presence?.hasWebsite,
      missingContact: !biz.presence?.hasEmail || biz.presence?.contactCompleteness === 'missing'
    };
  };

  const filteredAndSortedBusinesses = useMemo(() => {
    let result = [...businesses];

    // Apply active deficit filters (must have ALL selected deficits)
    if (activeDeficitFilters.length > 0) {
      result = result.filter(biz => {
        const defs = getBusinessDeficits(biz);
        return activeDeficitFilters.every(filterKey => !!defs[filterKey]);
      });
    }

    result.sort((a, b) => {
      const aDefs = a.deficitCount ?? Object.values(getBusinessDeficits(a)).filter(Boolean).length;
      const bDefs = b.deficitCount ?? Object.values(getBusinessDeficits(b)).filter(Boolean).length;
      
      if (sortOrder === 'deficits_desc') return bDefs - aDefs;
      if (sortOrder === 'score_asc') return (a.presenceScore || 50) - (b.presenceScore || 50);
      if (sortOrder === 'rating_asc') return a.rating - b.rating;
      return b.rating - a.rating;
    });

    return result;
  }, [businesses, activeDeficitFilters, sortOrder]);

  const totalDeficitsCount = useMemo(() => {
    return filteredAndSortedBusinesses.reduce((acc, b) => {
      const count = b.deficitCount ?? Object.values(getBusinessDeficits(b)).filter(Boolean).length;
      return acc + count;
    }, 0);
  }, [filteredAndSortedBusinesses]);

  // Export Sales List Handler
  const handleExportSalesList = (format: 'csv' | 'text' | 'json') => {
    if (filteredAndSortedBusinesses.length === 0) return;

    if (format === 'csv') {
      const headers = ["Business Name", "Category", "Address", "Phone", "Rating", "Deficits Identified", "Opportunity Score", "Primary Gaps"];
      const rows = filteredAndSortedBusinesses.map(b => {
        const defs = getBusinessDeficits(b);
        const gaps = Object.entries(defs)
          .filter(([_, val]) => val)
          .map(([key]) => DEFICIT_DEFINITIONS.find(d => d.key === key)?.label || key)
          .join("; ");
        
        return [
          `"${b.name.replace(/"/g, '""')}"`,
          `"${b.category}"`,
          `"${b.address.replace(/"/g, '""')}"`,
          `"${b.phone}"`,
          b.rating,
          b.deficitCount ?? Object.values(defs).filter(Boolean).length,
          b.presenceScore ?? 40,
          `"${gaps}"`
        ].join(",");
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Prospects_Sales_List_${filters.category}_${filters.city}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === 'text') {
      const textSummary = filteredAndSortedBusinesses.map((b, idx) => {
        const defs = getBusinessDeficits(b);
        const activeDefs = Object.entries(defs)
          .filter(([_, val]) => val)
          .map(([k]) => DEFICIT_DEFINITIONS.find(d => d.key === k)?.label)
          .filter(Boolean);
        
        return `${idx + 1}. ${b.name} (${b.category})\n` +
               `   📍 Address: ${b.address}\n` +
               `   📞 Phone: ${b.phone}\n` +
               `   ⭐ Rating: ${b.rating} ★ (${b.reviewsCount} reviews)\n` +
               `   ⚠️ Digital Deficits (${activeDefs.length}): ${activeDefs.join(", ")}\n` +
               `   💡 Opportunity Score: ${b.presenceScore || 40}/100`;
      }).join("\n\n");

      navigator.clipboard.writeText(textSummary);
      setCopiedExport(true);
      setTimeout(() => setCopiedExport(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Prospecting Header */}
      <div id="search-control-panel" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl dark:bg-blue-900/40 dark:text-blue-400 border border-blue-100 dark:border-blue-800/60">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Directory Prospecting Database
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <Sparkles className="h-3 w-3" /> 13-Deficit Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Systematically mine business directories to identify high-value clients with digital presence deficits.
              </p>
            </div>
          </div>

          {/* Quick Location Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick Markets:</span>
            {LOCATION_PRESETS.slice(0, 4).map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => handlePresetSelect(p)}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer border ${
                  filters.city === p.city && filters.country === p.country
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                }`}
              >
                {p.city}
              </button>
            ))}
          </div>
        </div>

        {/* Consultative Outreach Philosophy Card */}
        <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-200/80 dark:border-blue-800/60 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  The Golden Rule of Prospecting
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Consultative Cold Outreach
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                You aren't asking: <span className="line-through text-red-500 dark:text-red-400 font-semibold">“Do you need a website?”</span>
                {" "}&rarr; You're saying: <span className="text-emerald-700 dark:text-emerald-300 font-extrabold">“I noticed something about your online presence and I think I can help you improve it.”</span> <span className="italic font-medium text-slate-500">That opens a conversation.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Quick Industry Categories Pills */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Target High-Converting Industry Sectors
            </label>
            <span className="text-[11px] text-slate-400">18 Specialized Business Niches</span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 pb-1">
            {DIRECTORY_CATEGORIES.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilters(f => ({ ...f, category: c.id }))}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                  filters.category === c.id
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700"
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Prospecting Search Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Directory Category Sector
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
              >
                {DIRECTORY_CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Directory Database Source
              </label>
              <select
                value={filters.directorySource || DIRECTORY_SOURCES[0]}
                onChange={(e) => setFilters(f => ({ ...f, directorySource: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
              >
                {DIRECTORY_SOURCES.map(src => (
                  <option key={src} value={src}>{src}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                City / Region
              </label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="E.g., Mbabane, Manzini"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Country
              </label>
              <input
                type="text"
                value={filters.country}
                onChange={(e) => setFilters(f => ({ ...f, country: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="E.g., Eswatini, South Africa"
              />
            </div>
          </div>

          {/* Secondary Search Parameters */}
          <div className="grid gap-3.5 sm:grid-cols-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Town / Industrial Park (Optional)
              </label>
              <input
                type="text"
                value={filters.town}
                onChange={(e) => setFilters(f => ({ ...f, town: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="E.g., Matsapha, Ezulwini"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                Keywords / Specific Niche
              </label>
              <input
                type="text"
                value={filters.keywords}
                onChange={(e) => setFilters(f => ({ ...f, keywords: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
                placeholder="E.g., civil works, poultry feed, fiber"
              />
            </div>

            <div className="flex items-end justify-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2.5 px-6 transition-all shadow-md shadow-blue-500/15 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Mining Directory Database...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" /> Scan & Audit Category Prospects
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 13-Point Digital Deficit Diagnostic Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
              13-Point Digital Deficit Filter Matrix
            </h4>
            {activeDeficitFilters.length > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[10px] font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                {activeDeficitFilters.length} Active Filters
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {activeDeficitFilters.length > 0 && (
              <button
                type="button"
                onClick={clearDeficitFilters}
                className="text-[11px] font-bold text-red-600 hover:text-red-700 dark:text-red-400 cursor-pointer"
              >
                Clear Filters
              </button>
            )}
            <span className="text-xs text-slate-400">
              Click deficits to isolate specific sales opportunities
            </span>
          </div>
        </div>

        {/* Deficit Chips */}
        <div className="flex flex-wrap gap-2">
          {DEFICIT_DEFINITIONS.map(def => {
            const isSelected = activeDeficitFilters.includes(def.key);
            const Icon = def.icon;
            return (
              <button
                key={def.key}
                type="button"
                onClick={() => toggleDeficitFilter(def.key)}
                title={def.tip}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-red-500 text-white border-red-600 shadow-sm dark:bg-red-600 dark:border-red-500"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isSelected ? "text-white" : "text-slate-500 dark:text-slate-400"}`} />
                <span>{def.label}</span>
                {isSelected && <Check className="h-3 w-3 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prospect Results & Sales List Export Table */}
      {businesses.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left overflow-hidden">
          {/* Header Action Bar */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40 dark:bg-slate-900/40">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Prospect Sales List ({filteredAndSortedBusinesses.length} Qualified Leads)
                </h3>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                  {totalDeficitsCount} Total Deficits Detected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every deficit represents an actionable sales argument for web & digital upgrades.
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Export Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleExportSalesList('csv')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 shadow-sm transition-colors cursor-pointer"
                  title="Export qualified prospects to CSV spreadsheet"
                >
                  <Download className="h-3.5 w-3.5 text-blue-600" /> Export CSV
                </button>

                <button
                  type="button"
                  onClick={() => handleExportSalesList('text')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700 shadow-sm transition-colors cursor-pointer"
                  title="Copy formatted sales list to clipboard"
                >
                  {copiedExport ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied List!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500" /> Copy Sales List
                    </>
                  )}
                </button>
              </div>

              {/* Sort Order Selector */}
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
              >
                <option value="deficits_desc">Most Deficits First (Highest Need)</option>
                <option value="score_asc">Lowest Presence Score (Urgent)</option>
                <option value="rating_desc">Highest Rated Reviews</option>
                <option value="rating_asc">Lowest Rated Reviews</option>
              </select>
            </div>
          </div>

          {/* Table of Qualified Prospects */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Business & Location</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Deficit Diagnostic (Out of 13)</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Opportunity Level</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAndSortedBusinesses.map((biz) => {
                  const defs = getBusinessDeficits(biz);
                  const defCount = biz.deficitCount ?? Object.values(defs).filter(Boolean).length;
                  const score = biz.presenceScore ?? 40;

                  return (
                    <tr key={biz.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600 dark:bg-slate-800 dark:text-slate-300 mt-0.5">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{biz.name}</p>
                              <span className="text-[10px] px-2 py-0.2 rounded-full font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {biz.category}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 shrink-0" /> {biz.address}
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                              <Phone className="h-3 w-3 shrink-0 text-emerald-600" /> {biz.phone}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                              defCount >= 8 ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300" :
                              defCount >= 5 ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" :
                              "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                            }`}>
                              {defCount} / 13 Digital Deficits
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1 max-w-sm">
                            {defs.noWebsite && (
                              <span className="rounded bg-red-50 px-1.5 py-0.2 text-[9px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/40">
                                No Website
                              </span>
                            )}
                            {defs.noWhatsappCta && (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                                No WhatsApp CTA
                              </span>
                            )}
                            {defs.noOnlineCatalogue && (
                              <span className="rounded bg-purple-50 px-1.5 py-0.2 text-[9px] font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40">
                                No Catalogue
                              </span>
                            )}
                            {defs.noBookingSystem && (
                              <span className="rounded bg-blue-50 px-1.5 py-0.2 text-[9px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40">
                                No Booking
                              </span>
                            )}
                            {defs.noSeo && (
                              <span className="rounded bg-amber-50 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40">
                                No SEO
                              </span>
                            )}
                            {defs.poorMobileExperience && (
                              <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[9px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40">
                                Poor Mobile
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Opp Score: {biz.opportunityScore ?? (100 - score)}%
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                              (biz.opportunityScore ?? (100 - score)) >= 85 
                                ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300" 
                                : "text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300"
                            }`}>
                              {(biz.opportunityScore ?? (100 - score)) >= 85 ? "🔥 Prime Opportunity" : "⚡ Strong Lead"}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Google: {biz.rating} ★ ({biz.reviewsCount} reviews)
                          </p>
                          {biz.evidence && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xs" title={biz.evidence.notes}>
                              ✓ {biz.evidence.notes}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => onAnalyze(biz)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 text-xs font-bold shadow-sm shadow-blue-500/10 transition-all cursor-pointer"
                        >
                          Audit & Pitch <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                
                {filteredAndSortedBusinesses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-slate-500 dark:text-slate-400">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40 text-amber-500" />
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No prospects match the active deficit criteria.</p>
                      <p className="text-xs mt-1">Try deselecting some deficit chips or searching a broader category/city.</p>
                      <button
                        onClick={clearDeficitFilters}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 text-blue-700 px-3 py-1.5 text-xs font-bold dark:bg-blue-900/40 dark:text-blue-300 cursor-pointer"
                      >
                        Reset Deficit Filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
