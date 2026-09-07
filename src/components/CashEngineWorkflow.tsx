import React, { useState } from "react";
import { 
  Zap, Search, Globe, ShieldCheck, TrendingUp, CheckCircle2, 
  Sparkles, Edit3, Share2, Send, ThumbsUp, Clock, FileText, 
  Check, CreditCard, Rocket, Repeat, ArrowDown, ArrowRight, 
  ChevronDown, ChevronUp, DollarSign
} from "lucide-react";
import { Business, GeneratedSite } from "../types";

interface CashEngineWorkflowProps {
  businesses?: Business[];
  userSites?: GeneratedSite[];
  onNavigateToStep?: (stepId: "find" | "build" | "pitch" | "pipeline" | "proposal") => void;
  compact?: boolean;
}

export default function CashEngineWorkflow({
  businesses = [],
  userSites = [],
  onNavigateToStep,
  compact = false
}: CashEngineWorkflowProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeBranch, setActiveBranch] = useState<"all" | "interested" | "no_response">("all");

  const noWebsiteCount = businesses.filter(
    b => !b.presence?.hasWebsite && (!b.presence?.websiteUrl || b.presence.websiteUrl.trim() === "")
  ).length;

  const sentCount = userSites.filter(
    s => s.proposal?.status === 'sent' || s.salesStatus === 'Contacted' || s.salesStatus === 'Proposal Sent'
  ).length;

  const wonCount = businesses.filter(b => b.prospectStatus === 'Won').length + 
    userSites.filter(s => s.clientApproved || s.salesStatus === 'Closed').length;

  return (
    <div className="rounded-3xl border border-indigo-100 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-md p-5 sm:p-7 text-left transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                SiteScout Cash Engine Architecture
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/50">
                Commercial Process
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              15-step verified sales pipeline: From unrepresented local lead to paid custom domain launch.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer self-start sm:self-auto"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" /> Collapse Flowchart
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" /> View Full Flowchart ({businesses.length > 0 ? `${noWebsiteCount} leads` : '15 steps'})
            </>
          )}
        </button>
      </div>

      {/* Main Flowchart Content */}
      {isExpanded && (
        <div className="mt-6 space-y-8">
          {/* Main Vertical Spine (Nodes 1 through 10) */}
          <div className="flex flex-col items-center max-w-xl mx-auto space-y-3">
            
            {/* 1. SITESCOUT */}
            <div 
              className="w-full p-3.5 rounded-2xl bg-slate-900 text-white dark:bg-indigo-950 dark:border dark:border-indigo-800 flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                  1
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-blue-200">
                    SITESCOUT
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-300">
                    Master Local Lead Discovery &amp; AI Engine
                  </p>
                </div>
              </div>
              <Zap className="h-5 w-5 text-amber-300 animate-pulse" />
            </div>

            <ArrowDown className="h-4 w-4 text-blue-500" />

            {/* 2. Find REAL businesses */}
            <div 
              onClick={() => onNavigateToStep?.('find')}
              className="w-full p-3 rounded-xl border border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/30 flex items-center justify-between hover:border-blue-400 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Search className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Find REAL businesses
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-slate-700 text-blue-700 dark:text-blue-300">
                {businesses.length} Discovered
              </span>
            </div>

            <ArrowDown className="h-4 w-4 text-blue-500" />

            {/* 3. Filter "No Website" */}
            <div 
              onClick={() => onNavigateToStep?.('find')}
              className="w-full p-3 rounded-xl border border-indigo-200 bg-indigo-50/70 dark:border-indigo-900/50 dark:bg-indigo-950/30 flex items-center justify-between hover:border-indigo-400 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Globe className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Filter "No Website"
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-slate-700 text-indigo-700 dark:text-indigo-300">
                {noWebsiteCount} Greenfield Leads
              </span>
            </div>

            <ArrowDown className="h-4 w-4 text-indigo-500" />

            {/* 4. Verify digital absence */}
            <div className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Verify digital absence
                </span>
              </div>
              <span className="text-[10px] text-slate-500">Google Places &amp; DNS Audit</span>
            </div>

            <ArrowDown className="h-4 w-4 text-slate-400" />

            {/* 5. Rank best prospects */}
            <div className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Rank best prospects
                </span>
              </div>
              <span className="text-[10px] text-slate-500">Reviews &amp; Opportunity Score</span>
            </div>

            <ArrowDown className="h-4 w-4 text-slate-400" />

            {/* 6. Select business */}
            <div className="w-full p-3 rounded-xl border border-blue-200 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Select business
                </span>
              </div>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">1-Click Target Selection</span>
            </div>

            <ArrowDown className="h-4 w-4 text-blue-500" />

            {/* 7. Build website automatically */}
            <div 
              onClick={() => onNavigateToStep?.('build')}
              className="w-full p-3.5 rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50 dark:border-purple-900/50 dark:from-purple-950/40 dark:to-indigo-950/40 flex items-center justify-between hover:border-purple-400 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  Build website automatically
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-purple-600 text-white px-2 py-0.5 rounded-lg">
                Business Truth AI
              </span>
            </div>

            <ArrowDown className="h-4 w-4 text-purple-500" />

            {/* 8. Review / edit quickly */}
            <div 
              onClick={() => onNavigateToStep?.('build')}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/60 flex items-center justify-between hover:border-indigo-300 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Edit3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Review / edit quickly
                </span>
              </div>
              <span className="text-[10px] text-slate-500">3 Content Levels Audit</span>
            </div>

            <ArrowDown className="h-4 w-4 text-indigo-500" />

            {/* 9. Generate preview URL */}
            <div className="w-full p-3 rounded-xl border border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/40 dark:bg-indigo-950/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Share2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Generate preview URL
                </span>
              </div>
              <span className="text-[10px] font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-indigo-100 text-indigo-700 dark:text-indigo-300">
                /preview/:token
              </span>
            </div>

            <ArrowDown className="h-4 w-4 text-indigo-500" />

            {/* 10. Send to business */}
            <div 
              onClick={() => onNavigateToStep?.('pitch')}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shadow-md hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Send className="h-4 w-4 text-amber-300" />
                <span className="text-xs font-black uppercase tracking-wide">
                  Send to business
                </span>
              </div>
              <span className="text-[10px] font-bold bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-lg">
                WhatsApp • SMS • Email • Call
              </span>
            </div>

            {/* Fork Connector */}
            <div className="w-full flex justify-center py-2 relative">
              <div className="w-full max-w-xs border-t-2 border-dashed border-slate-300 dark:border-slate-700 relative">
                <div className="absolute left-1/4 -top-3 -translate-x-1/2 bg-white dark:bg-slate-900 px-2 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <ArrowDown className="h-3 w-3" /> Interested
                </div>
                <div className="absolute right-1/4 -top-3 translate-x-1/2 bg-white dark:bg-slate-900 px-2 text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <ArrowDown className="h-3 w-3" /> No response
                </div>
              </div>
            </div>

            {/* Branching Decision Grid */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              
              {/* BRANCH A: INTERESTED -> PROPOSAL -> SALE -> PAYMENT -> ACTUAL WEBSITE */}
              <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 dark:border-emerald-900/60 dark:bg-emerald-950/20 p-4 space-y-2.5 text-left">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60 dark:border-emerald-900/40">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ThumbsUp className="h-4 w-4 text-emerald-600 fill-emerald-600/20" />
                    Interested
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100 px-2 py-0.5 rounded-full">
                    Primary Conversion Path
                  </span>
                </div>

                {/* Sub-step 1: Proposal */}
                <div 
                  onClick={() => onNavigateToStep?.('proposal')}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 flex items-center justify-between hover:border-emerald-400 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Proposal</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Interactive Quote &amp; SLA</span>
                </div>

                <div className="flex justify-center">
                  <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                </div>

                {/* Sub-step 2: Sale */}
                <div 
                  onClick={() => onNavigateToStep?.('pipeline')}
                  className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 flex items-center justify-between hover:border-emerald-400 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Sale</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Digital Approval Signed</span>
                </div>

                <div className="flex justify-center">
                  <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                </div>

                {/* Sub-step 3: Payment */}
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-emerald-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Payment</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold">Deposit / Subscription</span>
                </div>

                <div className="flex justify-center">
                  <ArrowDown className="h-3.5 w-3.5 text-emerald-600" />
                </div>

                {/* Sub-step 4: Actual website */}
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-amber-300" />
                    <span className="text-xs font-black uppercase tracking-wider">Actual website</span>
                  </div>
                  <span className="text-[10px] font-extrabold bg-white/20 px-2 py-0.5 rounded">
                    Domain Live 🎉
                  </span>
                </div>
              </div>

              {/* BRANCH B: NO RESPONSE -> FOLLOW-UP -> FOLLOW-UP */}
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20 p-4 space-y-2.5 text-left flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200/60 dark:border-amber-900/40">
                    <span className="text-xs font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-amber-600" />
                      No response
                    </span>
                    <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 dark:bg-amber-900 dark:text-amber-100 px-2 py-0.5 rounded-full">
                      Automated Nudge
                    </span>
                  </div>

                  {/* Follow-up 1 */}
                  <div 
                    onClick={() => onNavigateToStep?.('pitch')}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 flex items-center justify-between hover:border-amber-400 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Repeat className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Follow-up #1</span>
                    </div>
                    <span className="text-[10px] text-slate-500">48-Hour Gentle Nudge</span>
                  </div>

                  <div className="flex justify-center">
                    <ArrowDown className="h-3.5 w-3.5 text-amber-600" />
                  </div>

                  {/* Follow-up 2 */}
                  <div 
                    onClick={() => onNavigateToStep?.('pitch')}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 flex items-center justify-between hover:border-amber-400 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Repeat className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Follow-up #2</span>
                    </div>
                    <span className="text-[10px] text-slate-500">7-Day Value Re-Engagement</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-900/80 dark:text-amber-200/80 leading-relaxed italic bg-white/50 dark:bg-slate-900/50 p-2.5 rounded-xl">
                  💡 "Re-emphasize that the free website preview is already created and ready to review — zero obligation, instant setup."
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
