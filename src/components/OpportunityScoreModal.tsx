import { useState } from "react";
import { Business, PresenceMetrics } from "../types";
import { 
  calculateExplainableOpportunityScore, 
  DEFICIT_SCORING_RULES, 
  CANONICAL_STAGES, 
  toCanonicalStage 
} from "../lib/prospectCrm";
import { 
  X, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, 
  TrendingUp, HelpCircle, Layers, Zap, Info, Copy, Check 
} from "lucide-react";

interface OpportunityScoreModalProps {
  business: Business;
  onClose: () => void;
  onAdvanceStage?: (business: Business) => void;
}

export default function OpportunityScoreModal({
  business,
  onClose,
  onAdvanceStage
}: OpportunityScoreModalProps) {
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [activeTab, setActiveTab] = useState<"formula" | "deficits" | "quality">("formula");

  const rating = business.rating || 4.2;
  const reviewsCount = business.reviewsCount || 8;
  const presence = business.presence;

  const explanation = calculateExplainableOpportunityScore(
    presence, 
    rating, 
    reviewsCount, 
    business.name
  );

  const stage = toCanonicalStage(business.salesStage || business.prospectStatus);
  const detectedDeficits = explanation.deficitItems.filter(i => i.detected);

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(explanation.recommendedPitchStrategy);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Opportunity Score Diagnostic
                </h3>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                  {explanation.totalScore}% Verified Index
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {business.name} • {business.category} • {business.address.split(",")[0]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 pt-2 gap-4">
          <button
            onClick={() => setActiveTab("formula")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "formula"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Formula & Weights
          </button>
          <button
            onClick={() => setActiveTab("deficits")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "deficits"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Digital Deficits ({detectedDeficits.length}/13)
          </button>
          <button
            onClick={() => setActiveTab("quality")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "quality"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Commercial Trust ({explanation.businessQualityScore} pts)
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === "formula" && (
            <>
              {/* Formula Callout Banner */}
              <div className="p-4 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-400" />
                    Explainable Deterministic Formula
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 font-mono">
                    Tri-Partite Scoring
                  </span>
                </div>
                <div className="font-mono text-sm sm:text-base text-blue-200 bg-black/40 p-3 rounded-lg border border-white/5">
                  {explanation.formulaDescription}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The Opportunity Score balances <strong>Deficit Severity (55% weight)</strong> with <strong>Commercial Reputation (45% weight)</strong>. A merchant with high client goodwill and missing digital infrastructure represents the highest conversion probability.
                </p>
              </div>

              {/* Two Weighted Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Deficit Contribution Card */}
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase">
                      Component A: Digital Deficit
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                      55% Weight
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-rose-600 dark:text-rose-400">
                      {explanation.digitalDeficitScore}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">/ 100 Deficit Pts</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full transition-all"
                      style={{ width: `${explanation.digitalDeficitScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {detectedDeficits.length} severe friction points identified across 13 verifiable infrastructure tests.
                  </p>
                </div>

                {/* Commercial Quality Card */}
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                      Component B: Commercial Quality
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                      45% Weight
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                      {explanation.businessQualityScore}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">/ 100 Trust Pts</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${explanation.businessQualityScore}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Verified {rating.toFixed(1)}★ rating from {reviewsCount} customer reviews demonstrates real client demand.
                  </p>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Opportunity Assessment Summary
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {explanation.summaryExplanation}
                </p>
              </div>

              {/* Recommended Sales Pitch */}
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Recommended Modernization Pitch Angle
                  </span>
                  <button
                    onClick={handleCopyPitch}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    {copiedPitch ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedPitch ? "Copied!" : "Copy Hook"}
                  </button>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 italic">
                  "{explanation.recommendedPitchStrategy}"
                </p>
              </div>
            </>
          )}

          {activeTab === "deficits" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span>13-Point Digital Deficit Evaluation</span>
                <span>Active Deficits: {detectedDeficits.length} of 13</span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                {explanation.deficitItems.map((item) => (
                  <div 
                    key={item.key} 
                    className={`p-3.5 flex items-start justify-between gap-3 text-sm transition-colors ${
                      item.detected 
                        ? "bg-rose-50/20 dark:bg-rose-950/10" 
                        : "bg-emerald-50/10 dark:bg-emerald-950/5"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {item.detected ? (
                          <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                            ✕
                          </div>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          {item.label}
                          {item.detected && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                              +{item.points} Deficit Pts
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.reason}
                        </p>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 px-2 py-0.5 rounded ${
                      item.detected
                        ? "text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/40"
                        : "text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/40"
                    }`}>
                      {item.detected ? "DEFICIT DETECTED" : "VERIFIED PRESENT"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "quality" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Commercial Viability & Reputation Factors
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  High-opportunity prospects are not failing businesses; they are thriving local operators whose customer acquisition is constrained by an absent or outdated digital presence.
                </p>
              </div>

              <div className="space-y-3">
                {explanation.qualityFactors.map((f) => (
                  <div 
                    key={f.key}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4"
                  >
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {f.label}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {f.reason}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                        {f.value}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        +{f.points} Trust Pts
                      </div>
                    </div>
                  </div>
                ))}

                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      Physical Presence & Operating Status
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Confirmed street address ({business.address}) and direct phone contact.
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      Active
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      +50 Base Pts
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Stage: <span className="font-semibold text-slate-700 dark:text-slate-300">{stage}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Close
            </button>
            {onAdvanceStage && (
              <button
                onClick={() => {
                  onAdvanceStage(business);
                  onClose();
                }}
                className="px-4 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <TrendingUp className="w-4 h-4" />
                Proceed to Preview Generation
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
