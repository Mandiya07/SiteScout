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
    page: 1,
    directorySource: 'National Business Directory / Yellow Pages'
  });

  // Active deficit filters (empty array = show all)
  const [activeDeficitFilters, setActiveDeficitFilters] = useState<(keyof DigitalDeficitAudit)[]>([]);
  const [dataTypeFilter, setDataTypeFilter] = useState<'all' | 'real' | 'demo'>('all');
  const [branchFilter, setBranchFilter] = useState<'all' | 'branch_a' | 'branch_b'>('all');
  const [noWebsiteOnly, setNoWebsiteOnly] = useState<boolean>(false);
  const [showArchitectureGuide, setShowArchitectureGuide] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'deficits_desc' | 'rating_desc' | 'rating_asc' | 'score_asc'>('deficits_desc');
  const [copiedExport, setCopiedExport] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(true);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedFilters = { ...filters, page: 1 };
    setFilters(updatedFilters);
    onSearch(updatedFilters);
  };

  const handlePresetSelect = (preset: typeof LOCATION_PRESETS[0]) => {
    setFilters(prev => ({
      ...prev,
      country: preset.country,
      city: preset.city,
      town: '',
      page: 1
    }));
  };

  const handleLoadMore = () => {
    const nextPage = (filters.page || 1) + 1;
    const updatedFilters = {
      ...filters,
      page: nextPage
    };
    setFilters(updatedFilters);
    onSearch(updatedFilters);
  };

  const toggleDeficitFilter = (key: keyof DigitalDeficitAudit) => {
    setActiveDeficitFilters(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const clearDeficitFilters = () => {
    setActiveDeficitFilters([]);
  };

  // Helper to test if a business is demo/synthetic
  const isDemoBusiness = (b: Business): boolean => {
    return b.isDemo === true || b.dataType === "demo" || b.evidence?.verificationStatus === "sample_demo";
  };

  const realCount = useMemo(() => businesses.filter(b => !isDemoBusiness(b)).length, [businesses]);
  const demoCount = useMemo(() => businesses.filter(b => isDemoBusiness(b)).length, [businesses]);
  
  // Pipeline Branch counts
  const branchACount = useMemo(() => businesses.filter(b => b.presence?.hasWebsite || b.pipelineBranch === "BRANCH_A_WEBSITE_AUDITED").length, [businesses]);
  const branchBCount = useMemo(() => businesses.filter(b => (!b.presence?.hasWebsite) || b.pipelineBranch === "BRANCH_B_CANDIDATE_VERIFIED").length, [businesses]);

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

    // Apply data classification filter (real vs demo)
    if (dataTypeFilter === 'real') {
      result = result.filter(b => !isDemoBusiness(b));
    } else if (dataTypeFilter === 'demo') {
      result = result.filter(b => isDemoBusiness(b));
    }

    // Apply Pipeline Branch filter (Branch A Website Audited vs Branch B Candidate Verified)
    if (branchFilter === 'branch_a') {
      result = result.filter(b => b.presence?.hasWebsite || b.pipelineBranch === "BRANCH_A_WEBSITE_AUDITED");
    } else if (branchFilter === 'branch_b') {
      result = result.filter(b => (!b.presence?.hasWebsite) || b.pipelineBranch === "BRANCH_B_CANDIDATE_VERIFIED");
    }

    if (noWebsiteOnly) {
      result = result.filter(b => !b.presence?.hasWebsite);
    }

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
  }, [businesses, dataTypeFilter, branchFilter, noWebsiteOnly, activeDeficitFilters, sortOrder]);

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
      const headers = ["Business Name", "Category", "Address", "Phone", "Data Classification", "Rating", "Deficits Identified", "Opportunity Score", "Primary Gaps"];
      const rows = filteredAndSortedBusinesses.map(b => {
        const defs = getBusinessDeficits(b);
        const isDemo = isDemoBusiness(b);
        const gaps = Object.entries(defs)
          .filter(([_, val]) => val)
          .map(([key]) => DEFICIT_DEFINITIONS.find(d => d.key === key)?.label || key)
          .join("; ");
        
        return [
          `"${b.name.replace(/"/g, '""')}"`,
          `"${b.category}"`,
          `"${b.address.replace(/"/g, '""')}"`,
          `"${b.phone}"`,
          `"${isDemo ? "DEMO_SYNTHETIC_SAMPLE (DO NOT CONTACT)" : "LIVE_VERIFIED_DIRECTORY"}"`,
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
        const isDemo = isDemoBusiness(b);
        const activeDefs = Object.entries(defs)
          .filter(([_, val]) => val)
          .map(([k]) => DEFICIT_DEFINITIONS.find(d => d.key === k)?.label)
          .filter(Boolean);
        
        return `${idx + 1}. [${isDemo ? "Demo / Synthetic Data" : "Verified"}] ${b.name} (${b.category})\n` +
               `   📍 Address: ${b.address}\n` +
               `   📞 Phone: ${b.phone} ${isDemo ? "(Synthetic - Do not call)" : ""}\n` +
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
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Country
              </label>
              <input
                type="text"
                value={filters.country}
                onChange={(e) => setFilters(f => ({ ...f, country: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
                placeholder="E.g., Eswatini, South Africa"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                City / Region
              </label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none focus:border-blue-500 font-bold"
                placeholder="E.g., Mbabane, Manzini"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Category
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
                Radius (km)
              </label>
              <select
                value={filters.radius}
                onChange={(e) => setFilters(f => ({ ...f, radius: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-white focus:outline-none focus:border-blue-500"
              >
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="15">15 km</option>
                <option value="25">25 km</option>
                <option value="50">50 km</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 px-1 py-3 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input 
                  type="checkbox"
                  checked={noWebsiteOnly}
                  onChange={(e) => setNoWebsiteOnly(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>"No Website" Only</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-2.5 px-8 transition-all shadow-md shadow-blue-500/15 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Scanning Directory...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" /> Find Businesses
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Production Discovery & Verification Architecture Flowchart Banner */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-slate-50 p-5 shadow-xs dark:border-blue-900/40 dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 text-left transition-colors">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Production Discovery &amp; Verification Architecture
                </h4>
                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                  Gemini Analyzes • Never Manufactures
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
                Real business records flow through a deterministic verification pipeline: 
                <strong> Branch A</strong> (Website URL detected) triggers a live technical audit &amp; objective deficit diagnosis; 
                <strong> Branch B</strong> (No website) triggers directory candidate verification before generating an instant custom website.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowArchitectureGuide(!showArchitectureGuide)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer shrink-0"
          >
            <Layers className="h-4 w-4 text-blue-600" />
            <span>{showArchitectureGuide ? "Hide Flowchart" : "View Architecture Flowchart"}</span>
          </button>
        </div>

        {/* Interactive Architecture Flowchart */}
        {showArchitectureGuide && (
          <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-900/40">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Branch A Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">A</span>
                  <h5 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Branch A: Website URL Detected (Live Revamp Pipeline)
                  </h5>
                </div>
                <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center font-bold text-blue-500">1</span>
                    <span><strong>Basic Website Technical Audit:</strong> Network ping, SSL certificate, HTTP status code &amp; latency.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center font-bold text-blue-500">2</span>
                    <span><strong>Digital Deficit Audit:</strong> Gemini inspects real DOM content &amp; meta tags for conversion gaps.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center font-bold text-blue-500">3</span>
                    <span><strong>Opportunity Score (55% Deficit + 45% Quality):</strong> Combines deficit severity with business quality to weight sales opportunity. Uses synthetic model estimates when live API integrations are unlinked.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center font-bold text-emerald-500">4</span>
                    <span><strong>Confirmed Prospect:</strong> Targeted for modernization proposal &amp; redesign.</span>
                  </div>
                </div>
              </div>

              {/* Branch B Card */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-800/80 border border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center">B</span>
                  <h5 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                    Branch B: No Website Found (Greenfield Pipeline)
                  </h5>
                </div>
                <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center font-bold text-indigo-500">1</span>
                    <span><strong>Candidate Verification:</strong> Verifies physical address &amp; phone in public registries.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center font-bold text-indigo-500">2</span>
                    <span><strong>Domain Absence Check:</strong> Confirms zero registered web presence in search indexes.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center font-bold text-indigo-500">3</span>
                    <span><strong>Confirmed Prospect:</strong> High urgency (100% online customer traffic lost).</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 text-center font-bold text-emerald-500">4</span>
                    <span><strong>Instant Website Generation:</strong> Builds custom prototype with real verified business info.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
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
                  Prospect Sales List ({filteredAndSortedBusinesses.length} Prospects)
                </h3>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800">
                  {totalDeficitsCount} Total Deficits Detected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every deficit represents an actionable sales argument for web &amp; digital upgrades.
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

          {/* Strict Data Classification & Architecture Pipeline Branch Tabs */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-1">Data:</span>
              <button
                type="button"
                onClick={() => setDataTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dataTypeFilter === 'all'
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                All ({businesses.length})
              </button>

              <button
                type="button"
                onClick={() => setDataTypeFilter('real')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dataTypeFilter === 'real'
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Live Real ({realCount})
              </button>

              <button
                type="button"
                onClick={() => setDataTypeFilter('demo')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  dataTypeFilter === 'demo'
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Demo Samples ({demoCount})
              </button>

              <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1 hidden sm:block" />

              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mr-1">Pipeline Branch:</span>
              <button
                type="button"
                onClick={() => setBranchFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  branchFilter === 'all'
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                All Branches
              </button>

              <button
                type="button"
                onClick={() => setBranchFilter('branch_a')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  branchFilter === 'branch_a'
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                }`}
                title="Businesses with existing website URL detected → Audited for deficits & revamp pitch"
              >
                <Globe className="w-3.5 h-3.5" />
                Branch A: Website Audited ({branchACount})
              </button>

              <button
                type="button"
                onClick={() => setBranchFilter('branch_b')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  branchFilter === 'branch_b'
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                }`}
                title="Businesses with zero website → Candidate verified for instant tailored prototype build"
              >
                <Zap className="w-3.5 h-3.5" />
                Branch B: No Website ({branchBCount})
              </button>
            </div>

            {demoCount > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Demo Data ≠ Real Prospects</span>
              </div>
            )}
          </div>

          {/* Demo Sandbox Alert Banner when demo data is visible */}
          {demoCount > 0 && (dataTypeFilter === 'all' || dataTypeFilter === 'demo') && (
            <div className="m-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                    Demonstration Sandbox Records Active ({demoCount} Samples)
                  </p>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                    These businesses are synthetic samples generated for interface demonstration. Synthetic phone numbers and emails cannot be contacted. Real sales outreach actions are locked for demo data.
                  </p>
                </div>
              </div>
              {realCount > 0 && dataTypeFilter === 'all' && (
                <button
                  type="button"
                  onClick={() => setDataTypeFilter('real')}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 cursor-pointer shadow-xs transition-colors"
                >
                  View Only Live Verified ({realCount})
                </button>
              )}
            </div>
          )}

          {/* Table of Qualified Prospects */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Business &amp; Location</th>
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
                  const isDemo = isDemoBusiness(biz);

                  return (
                    <tr 
                      key={biz.id} 
                      className={`transition-colors ${
                        isDemo 
                          ? "bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40 dark:hover:bg-amber-950/20" 
                          : "hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl mt-0.5 ${
                            isDemo 
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}>
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{biz.name}</p>
                              <span className="text-[10px] px-2 py-0.2 rounded-full font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                {biz.category}
                              </span>
                              {isDemo || biz.verificationState === "DEMO" ? (
                                <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                                  ⚠️ Demo / Synthetic Data
                                </span>
                              ) : biz.verificationState === "CONTACT_READY" ? (
                                <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40" title="Identity, contact phone, and website status independently verified and ready for outreach.">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Contact Ready
                                </span>
                              ) : biz.verificationState === "VERIFIED" || biz.evidence?.verificationStatus === "verified_live_listing" ? (
                                <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40" title="SiteScout has validated the business identity and contact information.">
                                  <CheckCircle2 className="h-2.5 w-2.5" /> Verified Lead
                                </span>
                              ) : biz.verificationState === "CANDIDATE" ? (
                                <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md font-bold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40" title="Discovered in directory listings. Audit recommended to verify contact line and operating status.">
                                  🔍 Candidate
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" title="Record discovered but unverified.">
                                  Unverified
                                </span>
                              )}
                              {/* Pipeline Architecture Branch Badges */}
                              {(!isDemo) && (biz.presence?.hasWebsite || biz.pipelineBranch === "BRANCH_A_WEBSITE_AUDITED") ? (
                                <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40">
                                  <Globe className="h-2.5 w-2.5" /> Branch A: Web Audited
                                </span>
                              ) : (!isDemo) ? (
                                <span className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/40">
                                  <Zap className="h-2.5 w-2.5" /> Branch B: Verified (No Web)
                                </span>
                              ) : null}
                              {biz.sourceUrl && (
                                <a
                                  href={biz.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[9px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                  title="View directory listing or web presence"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" /> Source
                                </a>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 shrink-0" /> {biz.address}
                              {isDemo && <span className="text-amber-600 text-[10px] font-semibold">(Synthetic Location)</span>}
                            </p>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                              <Phone className="h-3 w-3 shrink-0 text-emerald-600" /> {biz.phone}
                              {isDemo && <span className="text-amber-600 text-[10px] font-semibold font-sans">(Synthetic Phone - Live Outreach Locked)</span>}
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
                            Rating: {biz.rating} ★ ({biz.reviewsCount} reviews)
                          </p>
                          {biz.evidence && (
                            <div className="mt-0.5">
                              <p className={`text-[10px] truncate max-w-xs ${
                                isDemo
                                  ? "text-amber-700 dark:text-amber-400 font-medium"
                                  : "text-slate-500 dark:text-slate-400"
                              }`} title={biz.evidence.notes}>
                                {isDemo ? "⚠️ " : "✓ "}
                                {biz.evidence.notes}
                              </p>
                              {biz.evidence.sourceUrls && biz.evidence.sourceUrls.length > 0 && (
                                <a
                                  href={biz.evidence.sourceUrls[0]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                                >
                                  <ExternalLink className="h-2.5 w-2.5" /> Directory Citation
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => onAnalyze(biz)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                            isDemo
                              ? "bg-amber-600 hover:bg-amber-500 text-white"
                              : (!biz.presence?.hasWebsite || biz.pipelineBranch === "BRANCH_B_CANDIDATE_VERIFIED")
                              ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/10"
                              : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/10"
                          }`}
                        >
                          {isDemo 
                            ? "Audit Demo Sample" 
                            : (!biz.presence?.hasWebsite || biz.pipelineBranch === "BRANCH_B_CANDIDATE_VERIFIED")
                            ? "Generate Website"
                            : "Audit Deficits & Pitch"} <ArrowRight className="h-3.5 w-3.5" />
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

          {filteredAndSortedBusinesses.length > 0 && (
            <div className="flex justify-center py-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 rounded-b-3xl">
              <button
                type="button"
                disabled={loading}
                onClick={handleLoadMore}
                className="inline-flex items-center gap-2 px-6 py-3 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer shadow-xs"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading next page...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 text-indigo-500" />
                    <span>Load More Prospects (Page {filters.page ? filters.page + 1 : 2})</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
