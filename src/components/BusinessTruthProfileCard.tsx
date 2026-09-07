import React from "react";
import { CheckCircle2, HelpCircle, ShieldCheck, Sparkles, AlertCircle, Info, FileCheck2, ArrowRight, UserCheck, Bot } from "lucide-react";
import { BusinessTruthProfile, Business, ContentLevel } from "../types";
import { buildBusinessTruthProfile } from "../lib/businessTruth";

interface BusinessTruthProfileCardProps {
  business?: Business | null;
  truthProfile?: BusinessTruthProfile | null;
  onConfirmProceed?: () => void;
  showProceedButton?: boolean;
  proceedButtonText?: string;
  compact?: boolean;
}

export default function BusinessTruthProfileCard({
  business,
  truthProfile,
  onConfirmProceed,
  showProceedButton = false,
  proceedButtonText = "Proceed to Website Generation",
  compact = false
}: BusinessTruthProfileCardProps) {
  const profile = truthProfile || (business ? buildBusinessTruthProfile(business) : null);

  if (!profile) return null;

  const items = [
    profile.businessName,
    profile.phone,
    profile.address,
    profile.website,
    profile.category,
    profile.services,
    profile.openingHours,
    profile.rating,
    profile.reviews,
    profile.email,
    profile.socialLinks
  ];

  const getLevelBadge = (level: ContentLevel) => {
    switch (level) {
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            VERIFIED
          </span>
        );
      case "BUSINESS_SUPPLIED":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300/60 dark:border-blue-800">
            <UserCheck className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
            BUSINESS-SUPPLIED
          </span>
        );
      case "AI_DRAFT":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300/60 dark:border-purple-800">
            <Sparkles className="h-3 w-3 text-purple-600 dark:text-purple-400 shrink-0" />
            AI-DRAFT
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden text-slate-800 dark:text-slate-200">
      {/* Header Bar */}
      <div className="bg-slate-900 text-white p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base tracking-wide uppercase text-white font-mono">
                BUSINESS TRUTH PROFILE
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ANTI-HALLUCINATION ENFORCED
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              3-level content provenance matrix preventing AI hallucinations
            </p>
          </div>
        </div>

        {/* 3 Level Summary Counters */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 font-bold flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {profile.summary.verifiedCount ?? profile.summary.confirmedCount} Verified
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-700/60 text-blue-300 font-bold flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5" />
            {profile.summary.businessSuppliedCount ?? 0} Owner-Supplied
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-700/60 text-purple-300 font-bold flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" />
            {profile.summary.aiDraftCount ?? profile.summary.unconfirmedCount} AI-Draft
          </span>
        </div>
      </div>

      {/* Grid of Fields */}
      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => {
            const level = item.level || (item.status === "confirmed" ? "VERIFIED" : "AI_DRAFT");
            return (
              <div
                key={item.key}
                className={`p-3.5 rounded-xl border transition-all ${
                  level === "VERIFIED"
                    ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800"
                    : level === "BUSINESS_SUPPLIED"
                    ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/40"
                    : "bg-purple-50/40 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-900/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {item.label}
                  </span>
                  {getLevelBadge(level)}
                </div>

                <div className="mt-2 font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                  {item.value}
                </div>

                {item.notes && (
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    {item.notes}
                  </p>
                )}

                {item.source && (
                  <div className="mt-1.5 text-[9px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <span>Source: {item.source}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 3 Content Levels Anti-Hallucination Framework Explanation */}
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wide font-mono">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            3-Tier Content Provenance Architecture
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Level 1: VERIFIED */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/60 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold font-mono text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  VERIFIED
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Trusted Source
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                Obtained from verified public databases (e.g., Google Maps, Directory API). Used strictly as factual truth.
              </p>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/80 text-[10px] font-mono text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                Example: <span className="font-bold text-emerald-600 dark:text-emerald-400">"4.7 ★ Google rating (128 reviews)"</span>
              </div>
            </div>

            {/* Level 2: BUSINESS-SUPPLIED */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/60 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold font-mono text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-blue-600" />
                  BUSINESS-SUPPLIED
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Owner Input
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                Information explicitly entered or confirmed by the business owner/agency. Preserved without AI alterations.
              </p>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/80 text-[10px] font-mono text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                Example: <span className="font-bold text-blue-600 dark:text-blue-400">"Family-owned since 2018"</span>
              </div>
            </div>

            {/* Level 3: AI-DRAFT */}
            <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold font-mono text-[11px] text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                  AI-DRAFT
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                  Suggested Copy
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                Suggested copywriting, headlines, and descriptions. Explicitly labeled as draft suggestions to prevent hallucinations.
              </p>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/80 text-[10px] font-mono text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                Example: <span className="font-bold text-purple-600 dark:text-purple-400">"Professional plumbing solutions..."</span>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Action Button */}
        {showProceedButton && onConfirmProceed && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onConfirmProceed}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-[0.98]"
            >
              <span>{proceedButtonText}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
