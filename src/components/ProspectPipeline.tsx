import { useState } from "react";
import { Business, ProspectStatus, GeneratedSite } from "../types";
import { normalizePhoneNumber } from "../lib/formatters";
import { 
  Building2, Phone, MapPin, Globe, ArrowRight, MessageSquare, 
  Calendar, CheckCircle2, Clock, Flame, Filter, Plus, FileText, 
  Sparkles, ExternalLink, RefreshCw, XCircle, AlertCircle, Eye,
  Check, ChevronRight, Mail, ShieldCheck
} from "lucide-react";
import DraftEmailModal from "./DraftEmailModal";

interface ProspectPipelineProps {
  prospects: Business[];
  onUpdateProspect: (updated: Business) => void;
  onSelectBusinessForWebsite: (business: Business) => void;
  onOpenSalesAssistant: (business: Business) => void;
  onOpenProposal: (business: Business) => void;
  onViewAudit?: (business: Business) => void;
  userSites: GeneratedSite[];
}

const STAGES: { id: ProspectStatus; label: string; color: string; bg: string; border: string }[] = [
  { id: "New", label: "New", color: "text-slate-700 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-300 dark:border-slate-700" },
  { id: "Analyzed", label: "Analyzed", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-200 dark:border-blue-900" },
  { id: "Preview Ready", label: "Preview Ready", color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-purple-200 dark:border-purple-900" },
  { id: "Preview Sent", label: "Preview Sent", color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-200 dark:border-amber-900" },
  { id: "Interested", label: "Interested", color: "text-teal-700 dark:text-teal-300", bg: "bg-teal-50 dark:bg-teal-950/40", border: "border-teal-200 dark:border-teal-900" },
  { id: "Proposal", label: "Proposal", color: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-200 dark:border-indigo-900" },
  { id: "Won", label: "Won", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-200 dark:border-emerald-900" },
  { id: "Lost", label: "Lost", color: "text-rose-700 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-950/40", border: "border-rose-200 dark:border-rose-900" }
];

export default function ProspectPipeline({
  prospects,
  onUpdateProspect,
  onSelectBusinessForWebsite,
  onOpenSalesAssistant,
  onOpenProposal,
  onViewAudit,
  userSites
}: ProspectPipelineProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dataTypeFilter, setDataTypeFilter] = useState<'all' | 'real' | 'demo'>('all');
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState<string>("");
  const [schedulingBizId, setSchedulingBizId] = useState<string | null>(null);
  const [draftEmailBiz, setDraftEmailBiz] = useState<Business | null>(null);
  const [demoSafetyModalBiz, setDemoSafetyModalBiz] = useState<Business | null>(null);

  const isDemoBiz = (biz: Business) => {
    return biz.isDemo === true || biz.dataType === "demo" || biz.evidence?.verificationStatus === "sample_demo";
  };

  const realProspects = prospects.filter(p => !isDemoBiz(p));
  const demoProspects = prospects.filter(p => isDemoBiz(p));

  const filteredProspects = prospects.filter((p) => {
    const isDemo = isDemoBiz(p);
    if (dataTypeFilter === 'real' && isDemo) return false;
    if (dataTypeFilter === 'demo' && !isDemo) return false;

    const matchesStatus = selectedStatus === "all" || (p.prospectStatus || "New") === selectedStatus;
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.address.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleStatusChange = (business: Business, newStatus: ProspectStatus) => {
    const updated: Business = {
      ...business,
      prospectStatus: newStatus,
      lastContactedAt: ["Preview Sent", "Proposal"].includes(newStatus)
        ? new Date().toISOString()
        : business.lastContactedAt
    };
    onUpdateProspect(updated);
  };

  const handleMarkContactedToday = (business: Business) => {
    const now = new Date().toISOString();
    // Default next follow-up 2 days later
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 2);
    const updated: Business = {
      ...business,
      lastContactedAt: now,
      nextFollowUpDate: nextDate.toISOString().split("T")[0]
    };
    onUpdateProspect(updated);
  };

  const handleSetFollowUpDays = (business: Business, days: number) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    const updated: Business = {
      ...business,
      nextFollowUpDate: nextDate.toISOString().split("T")[0]
    };
    onUpdateProspect(updated);
    setSchedulingBizId(null);
  };

  const handleSaveNotes = (business: Business) => {
    const updated: Business = {
      ...business,
      prospectNotes: tempNotes
    };
    onUpdateProspect(updated);
    setEditingNotesId(null);
  };

  const getSiteForBusiness = (biz: Business) => {
    return userSites.find(s => s.businessId === biz.id || s.businessName.toLowerCase() === biz.name.toLowerCase());
  };

  const getWhatsappHref = (biz: Business, site?: GeneratedSite) => {
    const previewUrl = site 
      ? (site.previewToken ? `${window.location.origin}/preview/${site.previewToken}` : `${window.location.origin}/preview/${site.id}`)
      : window.location.origin;
    const msg = `Hi! I noticed something specific about ${biz.name}'s online presence in ${biz.address} and thought I could help you improve it. I put together a live interactive preview customized for your business: ${previewUrl}`;
    return `https://wa.me/${normalizePhoneNumber(biz.phone)}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Prospect Pipeline &amp; Sales Queue
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your discovered businesses from initial audit to closed client deals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search prospects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48 sm:w-64"
          />

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Stages ({prospects.length})</option>
            {STAGES.map(s => (
              <option key={s.id} value={s.id}>
                {s.label} ({prospects.filter(p => (p.prospectStatus || "New") === s.id).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Strict Data Classification Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-100/70 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Data Filter:</span>
          <button
            type="button"
            onClick={() => setDataTypeFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dataTypeFilter === 'all'
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            All Leads ({prospects.length})
          </button>
          <button
            type="button"
            onClick={() => setDataTypeFilter('real')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dataTypeFilter === 'real'
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified Real Prospects ({realProspects.length})
          </button>
          <button
            type="button"
            onClick={() => setDataTypeFilter('demo')}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              dataTypeFilter === 'demo'
                ? "bg-amber-600 text-white shadow-xs"
                : "text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            Demo Sandbox Records ({demoProspects.length})
          </button>
        </div>

        {demoProspects.length > 0 && (
          <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1.5">
            <span>⚠️ Live WhatsApp outreach locked on demo samples</span>
          </div>
        )}
      </div>

      {/* Demo Sandbox Alert Banner */}
      {demoProspects.length > 0 && (dataTypeFilter === 'all' || dataTypeFilter === 'demo') && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-start justify-between gap-3 text-left">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Pipeline Contains Demonstration Sandbox Records ({demoProspects.length})
              </p>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5 leading-relaxed">
                Demo records are synthetic samples used for testing layout generation and workflow simulation. Direct WhatsApp pitching is disabled on these records to prevent accidental messaging to fictitious numbers.
              </p>
            </div>
          </div>
          {realProspects.length > 0 && dataTypeFilter === 'all' && (
            <button
              type="button"
              onClick={() => setDataTypeFilter('real')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 cursor-pointer shadow-xs whitespace-nowrap"
            >
              Show Real Only ({realProspects.length})
            </button>
          )}
        </div>
      )}

      {/* Stage KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {STAGES.map((stage) => {
          const count = prospects.filter(p => (p.prospectStatus || "New") === stage.id).length;
          const isSelected = selectedStatus === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStatus(isSelected ? "all" : stage.id)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isSelected 
                  ? `${stage.bg} ${stage.border} ring-2 ring-blue-500/30` 
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                {stage.label}
              </div>
              <div className={`text-xl font-bold mt-1 ${stage.color}`}>
                {count}
              </div>
            </button>
          );
        })}
      </div>

      {/* Prospects List / Grid */}
      {filteredProspects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No prospects found in this view</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            {prospects.length === 0 
              ? "Start by searching for local businesses in the Business Finder tab to add high-opportunity leads to your queue."
              : "Try changing your status filter or search keywords to view other prospects."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProspects.map((biz) => {
            const site = getSiteForBusiness(biz);
            const status = biz.prospectStatus || "New";
            const stageMeta = STAGES.find(s => s.id === status) || STAGES[0];
            const oppScore = biz.opportunityScore || 90;

            return (
              <div 
                key={biz.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Category & Stage */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {biz.category}
                      </span>
                      {isDemoBiz(biz) ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                          ⚠️ Demo / Synthetic Data
                        </span>
                      ) : biz.verificationState === "CONTACT_READY" ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> Contact Ready
                        </span>
                      ) : biz.verificationState === "VERIFIED" ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" /> Verified Lead
                        </span>
                      ) : biz.verificationState === "CANDIDATE" ? (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/40 flex items-center gap-1">
                          🔍 Candidate
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700">
                          Unverified
                        </span>
                      )}
                    </div>

                    <select
                      value={status}
                      onChange={(e) => handleStatusChange(biz, e.target.value as ProspectStatus)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none ${stageMeta.bg} ${stageMeta.color} ${stageMeta.border}`}
                    >
                      {STAGES.map(s => (
                        <option key={s.id} value={s.id}>{s.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Business Name & Opportunity Score */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1">
                      {biz.name}
                    </h3>
                    <span 
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                        oppScore >= 85 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                      }`}
                      title={isDemoBiz(biz) ? "Opportunity Score based on Synthetic Model Baseline (55% Deficit + 45% Quality)" : "Opportunity Score based on Directory Data (55% Deficit + 45% Quality)"}
                    >
                      <span>{oppScore}% Opp</span>
                      <span className="text-[9px] font-normal opacity-75">({isDemoBiz(biz) ? "Synthetic" : "Estimated"})</span>
                    </span>
                  </div>

                  {/* Location & Contact */}
                  <div className="space-y-1.5 mt-2.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{biz.address}</span>
                      {isDemoBiz(biz) && <span className="text-amber-600 text-[10px] font-semibold">(Synthetic)</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{biz.phone}</span>
                      {isDemoBiz(biz) && <span className="text-amber-600 text-[10px] font-semibold">(Demo Phone)</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="text-rose-600 dark:text-rose-400 font-medium">
                        {biz.presence?.hasWebsite ? "Outdated Website" : "No Website Found"}
                      </span>
                    </div>
                  </div>

                  {/* Tripartite Opportunity & Business Quality Breakdown (Point 43, 44, 45) */}
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col">
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold">Business Quality</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                        ⭐ {biz.rating || 4.5} ({biz.reviewsCount || 12} reviews)
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex flex-col">
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold">Digital Deficit</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                        {biz.deficitCount || (biz.digitalDeficitScore ? Math.round(biz.digitalDeficitScore / 10) : 8)} Deficits Found
                      </span>
                    </div>
                  </div>

                  {/* Live Preview View Telemetry Badge (Point 42) */}
                  {site && (site.previewViews || 0) > 0 && (
                    <div className="mt-3 p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[11px] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-blue-800 dark:text-blue-200 font-bold">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Client Opened Preview {site.previewViews}x</span>
                      </div>
                      {(site.previewViews || 0) >= 2 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold animate-pulse">
                          <Flame className="w-3 h-3 text-amber-600" /> Hot Signal!
                        </span>
                      )}
                    </div>
                  )}

                  {/* Verified Audit Evidence Note */}
                  {biz.evidence && (
                    <div className="mt-2.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{biz.evidence.notes}</span>
                    </div>
                  )}

                  {/* Follow-up & Contact Log (Point 41) */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-[11px]">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {biz.lastContactedAt 
                          ? `Last Contacted: ${new Date(biz.lastContactedAt).toLocaleDateString()}`
                          : "Not Contacted Yet"}
                      </span>
                      <button
                        onClick={() => handleMarkContactedToday(biz)}
                        className="px-2 py-0.5 text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 rounded transition-colors"
                        title="Mark as contacted today"
                      >
                        + Mark Today
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-500" />
                        {biz.nextFollowUpDate ? (
                          <span className="font-semibold text-amber-700 dark:text-amber-300">
                            Follow-Up: {biz.nextFollowUpDate}
                          </span>
                        ) : (
                          "No Follow-Up Set"
                        )}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSetFollowUpDays(biz, 2)}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded"
                          title="Schedule follow up in 2 days"
                        >
                          +2d
                        </button>
                        <button
                          onClick={() => handleSetFollowUpDays(biz, 7)}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded"
                          title="Schedule follow up in 1 week"
                        >
                          +1w
                        </button>
                        <button
                          onClick={() => setSchedulingBizId(schedulingBizId === biz.id ? null : biz.id)}
                          className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded"
                          title="Pick custom date"
                        >
                          📅
                        </button>
                      </div>
                    </div>

                    {schedulingBizId === biz.id && (
                      <div className="p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex items-center gap-2">
                        <input
                          type="date"
                          value={biz.nextFollowUpDate || ""}
                          onChange={(e) => {
                            const updated: Business = { ...biz, nextFollowUpDate: e.target.value };
                            onUpdateProspect(updated);
                          }}
                          className="text-xs p-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                        />
                        <button
                          onClick={() => setSchedulingBizId(null)}
                          className="px-2 py-1 text-[10px] font-bold bg-amber-600 text-white rounded hover:bg-amber-700"
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Notes Field */}
                  <div className="mt-2.5">
                    {editingNotesId === biz.id ? (
                      <div className="space-y-1.5">
                        <textarea
                          value={tempNotes}
                          onChange={(e) => setTempNotes(e.target.value)}
                          placeholder="Add quick notes on client discussion..."
                          rows={2}
                          className="w-full text-xs p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setEditingNotesId(null)}
                            className="px-2 py-1 text-[11px] rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveNotes(biz)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => { setEditingNotesId(biz.id); setTempNotes(biz.prospectNotes || ""); }}
                        className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-lg cursor-pointer transition-colors"
                      >
                        {biz.prospectNotes ? (
                          <span className="italic">"{biz.prospectNotes}"</span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">+ Click to add notes / follow-up log</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action Triggers */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 w-full">
                    {onViewAudit && (
                      <button
                        onClick={() => onViewAudit(biz)}
                        className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                        title="Inspect 13-point diagnostic deficit audit"
                      >
                        Audit
                      </button>
                    )}

                    {site ? (
                      <>
                        <button
                          onClick={() => onOpenSalesAssistant(biz)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 transition-colors"
                          title="Open AI Sales outreach playbooks (WhatsApp / Email / Script)"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Outreach
                        </button>

                        <button
                          onClick={() => onOpenProposal(biz)}
                          className="py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors"
                          title="Generate client proposal & quote"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onSelectBusinessForWebsite(biz)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300"
                          title="Edit website layout"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onSelectBusinessForWebsite(biz)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs shadow-blue-500/20"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        Build Preview
                      </button>
                    )}
                  </div>

                  {/* AI Email Drafter based on Digital Gaps */}
                  <button
                    onClick={() => setDraftEmailBiz(biz)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900 transition-all cursor-pointer shadow-xs"
                    title="AI-powered email drafter with pre-filled subject and body based on this business's digital gaps"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Draft AI Outreach Email</span>
                    <Sparkles className="w-3 h-3 text-blue-500 ml-0.5" />
                  </button>

                  {/* 1-Click WhatsApp Instant Pitch */}
                  {isDemoBiz(biz) ? (
                    <button
                      type="button"
                      onClick={() => setDemoSafetyModalBiz(biz)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/60 dark:hover:bg-amber-900/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer shadow-xs"
                      title="Outreach is locked because this is a synthetic demonstration record"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400" />
                      <span>Locked: Demo Record (WhatsApp Guardrail)</span>
                    </button>
                  ) : biz.phone === "Unlisted" ? (
                    <button
                      type="button"
                      onClick={() => onViewAudit && onViewAudit(biz)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                      title="Direct phone unlisted. Run 8-point audit to verify contact details."
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Phone Unlisted — Run Audit</span>
                    </button>
                  ) : biz.verificationState !== "CONTACT_READY" && biz.verificationState !== "VERIFIED" ? (
                    <button
                      type="button"
                      onClick={() => onViewAudit && onViewAudit(biz)}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800 transition-colors cursor-pointer"
                      title="Verify contact line and business identity before outreach"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>Audit Contact Before Outreach</span>
                    </button>
                  ) : (
                    <a
                      href={getWhatsappHref(biz, site)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors shadow-xs shadow-emerald-500/10"
                      title="Open WhatsApp with customized outreach pitch & preview link"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-white" />
                      1-Click WhatsApp Pitch
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Safety Guardrail Modal for Demo Businesses */}
      {demoSafetyModalBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Demo Sample Guardrail Active
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {demoSafetyModalBiz.name} is a synthetic demonstration sample.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 space-y-2 leading-relaxed">
              <p className="font-semibold">
                Direct WhatsApp outreach is intentionally disabled for this record.
              </p>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90">
                The contact number <span className="font-mono font-bold">{demoSafetyModalBiz.phone}</span> is simulated placeholder data generated for testing. To perform genuine sales outreach, discover verified local prospects in the <strong>Business Finder</strong> tab or filter your pipeline to <strong>Verified Real Prospects</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDemoSafetyModalBiz(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setDemoSafetyModalBiz(null);
                  setDataTypeFilter('real');
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-xs"
              >
                Show Verified Real Only
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Email Modal targeting identified digital gaps */}
      {draftEmailBiz && (
        <DraftEmailModal
          isOpen={!!draftEmailBiz}
          onClose={() => setDraftEmailBiz(null)}
          business={draftEmailBiz}
          site={getSiteForBusiness(draftEmailBiz)}
          onUpdateProspect={(updated) => {
            onUpdateProspect(updated);
            setDraftEmailBiz(updated);
          }}
        />
      )}
    </div>
  );
}
