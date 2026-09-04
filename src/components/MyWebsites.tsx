import { useState } from "react";
import { GeneratedSite, SalesStatus } from "../types";
import { 
  Globe, ExternalLink, Edit3, MessageSquare, FileText, 
  Trash2, Copy, Check, Sparkles, Eye, ShieldCheck, Tag,
  Plus, X, ChevronDown, Filter, CheckCircle2, XCircle,
  MessageCircle, Send, Target, Search, Layers, TrendingUp
} from "lucide-react";

interface MyWebsitesProps {
  sites: GeneratedSite[];
  onEditSite: (site: GeneratedSite) => void;
  onOpenPreview: (site: GeneratedSite) => void;
  onOpenSalesAssistant: (site: GeneratedSite) => void;
  onOpenProposal: (site: GeneratedSite) => void;
  onDeleteSite: (siteId: string) => void;
  onCreateNewPreview: () => void;
  onUpdateSiteStatus?: (siteId: string, status: SalesStatus, tags?: string[]) => void;
}

export const SALES_STATUS_CONFIG: Record<SalesStatus, {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
  description: string;
}> = {
  "Lead": {
    label: "Lead",
    badgeBg: "bg-blue-50 dark:bg-blue-950/60",
    badgeText: "text-blue-700 dark:text-blue-300",
    badgeBorder: "border-blue-200 dark:border-blue-800",
    dotColor: "bg-blue-500",
    description: "New discovery & website preview created"
  },
  "Contacted": {
    label: "Contacted",
    badgeBg: "bg-purple-50 dark:bg-purple-950/60",
    badgeText: "text-purple-700 dark:text-purple-300",
    badgeBorder: "border-purple-200 dark:border-purple-800",
    dotColor: "bg-purple-500",
    description: "Outreach message or sales pitch sent"
  },
  "Negotiation": {
    label: "Negotiation",
    badgeBg: "bg-amber-50 dark:bg-amber-950/60",
    badgeText: "text-amber-800 dark:text-amber-300",
    badgeBorder: "border-amber-200 dark:border-amber-800",
    dotColor: "bg-amber-500",
    description: "Active client discussion or demo walkthrough"
  },
  "Proposal Sent": {
    label: "Proposal Sent",
    badgeBg: "bg-indigo-50 dark:bg-indigo-950/60",
    badgeText: "text-indigo-700 dark:text-indigo-300",
    badgeBorder: "border-indigo-200 dark:border-indigo-800",
    dotColor: "bg-indigo-500",
    description: "Formal quotation or proposal delivered"
  },
  "Closed": {
    label: "Closed (Won)",
    badgeBg: "bg-emerald-50 dark:bg-emerald-950/60",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    badgeBorder: "border-emerald-200 dark:border-emerald-800",
    dotColor: "bg-emerald-500",
    description: "Deal won / Client approved website"
  },
  "Lost": {
    label: "Lost",
    badgeBg: "bg-rose-50 dark:bg-rose-950/60",
    badgeText: "text-rose-700 dark:text-rose-300",
    badgeBorder: "border-rose-200 dark:border-rose-800",
    dotColor: "bg-rose-500",
    description: "Lead unengaged or deal lost"
  }
};

const PRESET_CUSTOM_TAGS = [
  "Hot Lead",
  "High Value",
  "VIP Client",
  "Redesign",
  "Follow-Up Needed",
  "WhatsApp Contacted"
];

export function getSiteSalesStatus(site: GeneratedSite): SalesStatus {
  if (site.salesStatus) return site.salesStatus;
  if (site.clientApproved || site.crmSynced) return "Closed";
  if (site.proposal?.status === "sent") return "Proposal Sent";
  return "Lead";
}

export default function MyWebsites({
  sites,
  onEditSite,
  onOpenPreview,
  onOpenSalesAssistant,
  onOpenProposal,
  onDeleteSite,
  onCreateNewPreview,
  onUpdateSiteStatus
}: MyWebsitesProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"All" | SalesStatus>("All");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  
  // Quick status selector popover state
  const [activeMenuSiteId, setActiveMenuSiteId] = useState<string | null>(null);

  // Tag manager modal state
  const [editingSite, setEditingSite] = useState<GeneratedSite | null>(null);
  const [modalSalesStatus, setModalSalesStatus] = useState<SalesStatus>("Lead");
  const [modalTags, setModalTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState<string>("");

  // Extract all unique custom tags present across all user projects
  const allExistingCustomTags = Array.from(
    new Set(sites.flatMap(s => s.tags || []))
  );

  // Filter sites logic
  const filteredSites = sites.filter(site => {
    const siteStatus = getSiteSalesStatus(site);
    
    // Status filter
    if (statusFilter !== "All" && siteStatus !== statusFilter) {
      return false;
    }

    // Custom tag filter
    if (selectedTagFilter && (!site.tags || !site.tags.includes(selectedTagFilter))) {
      return false;
    }

    // Search term
    if (searchTerm.trim() !== "") {
      const query = searchTerm.toLowerCase();
      const matchName = site.businessName.toLowerCase().includes(query);
      const matchCat = site.category.toLowerCase().includes(query);
      const matchAddr = site.address.toLowerCase().includes(query);
      const matchTag = site.tags?.some(t => t.toLowerCase().includes(query));
      const matchStatus = siteStatus.toLowerCase().includes(query);
      return matchName || matchCat || matchAddr || matchTag || matchStatus;
    }

    return true;
  });

  // Calculate Pipeline Analytics
  const totalSitesCount = sites.length;
  const statusCounts: Record<SalesStatus, number> = {
    "Lead": 0,
    "Contacted": 0,
    "Negotiation": 0,
    "Proposal Sent": 0,
    "Closed": 0,
    "Lost": 0
  };

  sites.forEach(s => {
    const st = getSiteSalesStatus(s);
    statusCounts[st] = (statusCounts[st] || 0) + 1;
  });

  const activePipelineCount = statusCounts["Lead"] + statusCounts["Contacted"] + statusCounts["Negotiation"] + statusCounts["Proposal Sent"];
  const closedWonCount = statusCounts["Closed"];
  const winRate = totalSitesCount > 0 ? Math.round((closedWonCount / totalSitesCount) * 100) : 0;

  const handleCopyLink = (site: GeneratedSite) => {
    const origin = window.location.origin;
    const url = `${origin}/preview/${site.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(site.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStatusChange = (siteId: string, newStatus: SalesStatus) => {
    const targetSite = sites.find(s => s.id === siteId);
    if (targetSite && onUpdateSiteStatus) {
      onUpdateSiteStatus(siteId, newStatus, targetSite.tags || []);
    }
    setActiveMenuSiteId(null);
  };

  const openTagEditorModal = (site: GeneratedSite) => {
    setEditingSite(site);
    setModalSalesStatus(getSiteSalesStatus(site));
    setModalTags(site.tags ? [...site.tags] : []);
    setCustomTagInput("");
  };

  const handleAddModalTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim();
    if (!trimmed) return;
    if (!modalTags.includes(trimmed)) {
      setModalTags(prev => [...prev, trimmed]);
    }
    setCustomTagInput("");
  };

  const handleRemoveModalTag = (tagToRemove: string) => {
    setModalTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleSaveModalTags = () => {
    if (editingSite && onUpdateSiteStatus) {
      onUpdateSiteStatus(editingSite.id, modalSalesStatus, modalTags);
    }
    setEditingSite(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            My Generated Websites & Pipeline
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Categorize project opportunities by sales status and custom tags to streamline your agency outreach.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search website or tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-64"
            />
          </div>

          <button
            onClick={onCreateNewPreview}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate New</span>
          </button>
        </div>
      </div>

      {/* Pipeline Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          onClick={() => { setStatusFilter("All"); setSelectedTagFilter(null); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === "All" && !selectedTagFilter
              ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Projects</span>
            <Layers className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1 font-mono">{totalSitesCount}</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">All website previews</span>
        </button>

        <button
          onClick={() => { setStatusFilter("Lead"); setSelectedTagFilter(null); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === "Lead"
              ? "bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Pipeline</span>
            <Target className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">{activePipelineCount}</p>
          <span className="text-[10px] text-indigo-500/80 mt-0.5 block">Leads, Contacted, In Review</span>
        </button>

        <button
          onClick={() => { setStatusFilter("Closed"); setSelectedTagFilter(null); }}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            statusFilter === "Closed"
              ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20"
              : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Closed Deals</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">{closedWonCount}</p>
          <span className="text-[10px] text-emerald-600/80 mt-0.5 block">Won & onboarded</span>
        </button>

        <div className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-left">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Win Rate</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">{winRate}%</p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Conversion ratio</span>
        </div>
      </div>

      {/* Sales Status Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter By Sales Status Tag:</span>
          </div>
          {(statusFilter !== "All" || selectedTagFilter !== null || searchTerm !== "") && (
            <button
              onClick={() => {
                setStatusFilter("All");
                setSelectedTagFilter(null);
                setSearchTerm("");
              }}
              className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer lowercase"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setStatusFilter("All")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              statusFilter === "All"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <span>All Projects</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-mono">
              {totalSitesCount}
            </span>
          </button>

          {(Object.keys(SALES_STATUS_CONFIG) as SalesStatus[]).map((statusKey) => {
            const cfg = SALES_STATUS_CONFIG[statusKey];
            const count = statusCounts[statusKey];
            const isActive = statusFilter === statusKey;

            return (
              <button
                key={statusKey}
                onClick={() => setStatusFilter(statusKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-2 ring-blue-500/20`
                    : "bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                <span>{cfg.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? "bg-white/60 dark:bg-black/40" : "bg-slate-100 dark:bg-slate-700"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Tags Filter Row if any exist */}
        {allExistingCustomTags.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span>Custom Tags:</span>
            </span>
            {allExistingCustomTags.map(tag => {
              const isSelected = selectedTagFilter === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTagFilter(isSelected ? null : tag)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 border ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <span>#{tag}</span>
                  {isSelected && <X className="w-3 h-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sites Grid */}
      {filteredSites.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Globe className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {sites.length === 0 ? "No website previews created yet" : "No website projects match this tag filter"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-5">
            {sites.length === 0 
              ? "Find a business without a website in the Business Finder and click 'Generate Website' to build your first live client preview."
              : "Try adjusting your search terms or sales status tag filters to view other projects."}
          </p>
          {sites.length === 0 ? (
            <button
              onClick={onCreateNewPreview}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              Find Businesses to Pitch
            </button>
          ) : (
            <button
              onClick={() => { setStatusFilter("All"); setSelectedTagFilter(null); setSearchTerm(""); }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-all cursor-pointer"
            >
              Clear Tag Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSites.map((site) => {
            const previewUrl = `${window.location.origin}/preview/${site.id}`;
            const isCopied = copiedId === site.id;
            const currentStatus = getSiteSalesStatus(site);
            const statusConfig = SALES_STATUS_CONFIG[currentStatus];
            const isMenuOpen = activeMenuSiteId === site.id;

            return (
              <div
                key={site.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
              >
                <div>
                  {/* Color Banner Header */}
                  <div 
                    className="h-20 w-full p-4 flex items-start justify-between relative overflow-hidden"
                    style={{ backgroundColor: site.primaryColor || "#2563eb" }}
                  >
                    <div className="text-white z-10">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded backdrop-blur-sm">
                        {site.category}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1 drop-shadow-xs line-clamp-1">
                        {site.businessName}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-2 py-1 rounded-lg text-[11px] text-white font-medium z-10">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Live</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    
                    {/* Sales Status Tag Selector Header */}
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                        Sales Status:
                      </span>

                      {/* Interactive Sales Status Pill Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenuSiteId(isMenuOpen ? null : site.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.badgeBorder} hover:brightness-95`}
                          title="Click to update sales status tag"
                        >
                          <span className={`w-2 h-2 rounded-full ${statusConfig.dotColor}`} />
                          <span>{statusConfig.label}</span>
                          <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
                        </button>

                        {/* Status Change Dropdown Menu */}
                        {isMenuOpen && (
                          <div className="absolute right-0 top-full mt-1.5 w-52 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-30 p-1.5 space-y-1">
                            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Update Sales Tag
                            </div>
                            {(Object.keys(SALES_STATUS_CONFIG) as SalesStatus[]).map((st) => {
                              const cfg = SALES_STATUS_CONFIG[st];
                              const isCurrent = st === currentStatus;
                              return (
                                <button
                                  key={st}
                                  onClick={() => handleStatusChange(site.id, st)}
                                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                                    isCurrent
                                      ? "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white"
                                      : "hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                                    <span>{cfg.label}</span>
                                  </div>
                                  {isCurrent && <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Custom Tags Pill List */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {site.tags && site.tags.length > 0 ? (
                        site.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            onClick={() => setSelectedTagFilter(tag)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                          >
                            <Tag className="w-2.5 h-2.5 text-slate-400" />
                            <span>{tag}</span>
                          </span>
                        ))
                      ) : null}

                      <button
                        onClick={() => openTagEditorModal(site)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer border border-dashed border-blue-200 dark:border-blue-900"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{site.tags && site.tags.length > 0 ? "Edit Tags" : "+ Add Tag"}</span>
                      </button>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      <p className="line-clamp-2">{site.hero?.subtitle || site.about?.mission || "Professional website preview."}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Services listed:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{site.services?.length || 3} items</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>WhatsApp CTA:</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Active</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Live link:</span>
                        <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 truncate max-w-[170px]">
                          /preview/{site.id.slice(0, 10)}...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 pt-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onOpenPreview(site)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-500" />
                      <span>Live Preview</span>
                    </button>

                    <button
                      onClick={() => onEditSite(site)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Quick Edit</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      onClick={() => handleCopyLink(site)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                      title="Copy Shareable Preview Link"
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? "Copied" : "Copy Link"}</span>
                    </button>

                    <button
                      onClick={() => onOpenSalesAssistant(site)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 transition-colors cursor-pointer"
                      title="Generate sales outreach messages"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Pitch</span>
                    </button>

                    <button
                      onClick={() => onOpenProposal(site)}
                      className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 transition-colors cursor-pointer"
                      title="Create quotation / proposal"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Proposal</span>
                    </button>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete the website draft for ${site.businessName}?`)) {
                          onDeleteSite(site.id);
                        }
                      }}
                      className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete project</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tag & Sales Status Management Modal */}
      {editingSite && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full shadow-2xl overflow-hidden p-6 space-y-5 text-left">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  <span>Project Tagging Manager</span>
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {editingSite.businessName}
                </h3>
              </div>
              <button
                onClick={() => setEditingSite(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sales Status Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sales Pipeline Status Tag
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(Object.keys(SALES_STATUS_CONFIG) as SalesStatus[]).map(st => {
                  const cfg = SALES_STATUS_CONFIG[st];
                  const isSelected = modalSalesStatus === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setModalSalesStatus(st)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-2 ring-blue-500/20`
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dotColor}`} />
                      <span className="text-xs font-semibold">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400">
                {SALES_STATUS_CONFIG[modalSalesStatus]?.description}
              </p>
            </div>

            {/* Custom Tags Section */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Custom Category & Label Tags
              </label>

              {/* Tag Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a tag name (e.g. High Priority, Redesign)..."
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddModalTag(customTagInput);
                    }
                  }}
                  className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => handleAddModalTag(customTagInput)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                >
                  Add
                </button>
              </div>

              {/* Quick Preset Tags Suggestions */}
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Suggested Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_CUSTOM_TAGS.map(preset => {
                    const isAdded = modalTags.includes(preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => isAdded ? handleRemoveModalTag(preset) : handleAddModalTag(preset)}
                        className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          isAdded
                            ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800"
                            : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {isAdded ? "✓ " : "+ "}{preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Current Active Tags */}
              <div className="pt-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Attached Project Tags ({modalTags.length}):
                </span>
                {modalTags.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No custom tags added yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {modalTags.map(t => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                      >
                        <span>#{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveModalTag(t)}
                          className="text-indigo-400 hover:text-indigo-700 dark:hover:text-white cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingSite(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalTags}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all cursor-pointer"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
