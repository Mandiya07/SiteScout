import { useState } from "react";
import { Business, QualificationStatus } from "../types";
import { 
  calculateExplainableOpportunityScore, 
  toCanonicalStage 
} from "../lib/prospectCrm";
import {
  evaluateProspectQualification,
  applyQualificationOverride,
  revertQualificationOverride
} from "../lib/prospectQualification";
import { 
  X, CheckCircle2, AlertTriangle, ShieldCheck, Sparkles, 
  TrendingUp, Zap, Info, Copy, Check, Phone, Target, HelpCircle, Shield,
  Award, RotateCcw, FileEdit, AlertCircle, Ban, CheckSquare
} from "lucide-react";

interface OpportunityScoreModalProps {
  business: Business;
  onClose: () => void;
  onAdvanceStage?: (business: Business) => void;
  onUpdateBusiness?: (business: Business) => void;
  currentUser?: { uid: string; displayName?: string; email?: string };
}

export default function OpportunityScoreModal({
  business,
  onClose,
  onAdvanceStage,
  onUpdateBusiness,
  currentUser
}: OpportunityScoreModalProps) {
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [activeTab, setActiveTab] = useState<"formula" | "deficits" | "dimensions" | "evidence" | "qualification">("formula");
  
  // Override form state
  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState<QualificationStatus>("QUALIFIED");
  const [overrideReason, setOverrideReason] = useState("");
  const [revertReason, setRevertReason] = useState("");
  const [showRevertForm, setShowRevertForm] = useState(false);

  const rating = typeof business.rating === "number" ? business.rating : 0;
  const reviewsCount = typeof business.reviewsCount === "number" ? business.reviewsCount : 0;
  const presence = business.presence;

  const explanation = calculateExplainableOpportunityScore(
    presence, 
    rating, 
    reviewsCount, 
    business.name,
    business.category,
    business.phone,
    business.evidence
  );

  const qualResult = business.qualificationResult || evaluateProspectQualification(business, explanation);

  const stage = toCanonicalStage(business.salesStage || business.prospectStatus);
  const detectedDeficits = explanation.deficitItems.filter(i => i.detected);

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(explanation.recommendedPitchStrategy);
    setCopiedPitch(true);
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleApplyOverride = () => {
    if (!overrideReason.trim()) {
      alert("Please provide an audit rationale/reason for this manual qualification change.");
      return;
    }
    const user = currentUser || { uid: "usr_agent", displayName: "Sales Representative" };
    const updated = applyQualificationOverride(business, overrideStatus, overrideReason, user);
    if (onUpdateBusiness) {
      onUpdateBusiness(updated);
    }
    setShowOverrideForm(false);
    setOverrideReason("");
  };

  const handleRevertOverride = () => {
    const user = currentUser || { uid: "usr_agent", displayName: "Sales Representative" };
    const updated = revertQualificationOverride(business, revertReason, user);
    if (onUpdateBusiness) {
      onUpdateBusiness(updated);
    }
    setShowRevertForm(false);
    setRevertReason("");
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
                  {explanation.totalScore}% Opportunity
                </span>
                {explanation.evidenceConfidenceLevel && (
                  <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full border ${
                    explanation.evidenceConfidenceLevel === "HIGH"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                      : explanation.evidenceConfidenceLevel === "MEDIUM"
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                      : "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}>
                    {explanation.evidenceConfidenceLevel} Confidence ({explanation.evidenceConfidenceScore}%)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {business.name} • {business.category} • {business.address?.split(",")[0]}
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
            4-Dimension Breakdown
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
            Digital Deficits ({detectedDeficits.length})
          </button>
          <button
            onClick={() => setActiveTab("dimensions")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "dimensions"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Commercial Signals
          </button>
          <button
            onClick={() => setActiveTab("evidence")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "evidence"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Shield className="w-4 h-4" />
            Evidence & Unknowns
          </button>
          <button
            onClick={() => setActiveTab("qualification")}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "qualification"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <Award className="w-4 h-4" />
            Qualification & Priority
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
              qualResult.status === "QUALIFIED"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : qualResult.status === "NEEDS_REVIEW"
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                : qualResult.status === "DISQUALIFIED"
                ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}>
              {qualResult.status}
            </span>
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
                    {explanation.assessmentStatement || "Opportunity assessment based on available evidence."}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 font-mono">
                    Evidence-Aware Model
                  </span>
                </div>
                <div className="font-mono text-xs sm:text-sm text-blue-200 bg-black/40 p-3 rounded-lg border border-white/5 break-all">
                  {explanation.formulaDescription}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Scoring balances <strong>Digital Deficit (35%)</strong>, <strong>Commercial Quality (25%)</strong>, <strong>Commercial Fit (20%)</strong>, and <strong>Direct Contactability (20%)</strong> without awarding points for unknown data.
                </p>
              </div>

              {/* 4 Dimension Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Deficit Contribution Card */}
                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase">
                      1. Digital Deficit (35%)
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                      {explanation.digitalDeficitScore} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${explanation.digitalDeficitScore}%` }} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Confirmed technical gaps and discovery friction points.
                  </p>
                </div>

                {/* Commercial Quality Card */}
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">
                      2. Business Quality (25%)
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                      {explanation.businessQualityScore} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${explanation.businessQualityScore}%` }} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {rating > 0 ? `Rating ${rating.toFixed(1)}★ across ${reviewsCount} reviews` : `Neutral baseline for unrated listing`}
                  </p>
                </div>

                {/* Commercial Fit Card */}
                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" /> 3. Commercial Fit (20%)
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200">
                      {explanation.commercialFitScore || 75} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${explanation.commercialFitScore || 75}%` }} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Industry category: {business.category || "Local Trade"}
                  </p>
                </div>

                {/* Contactability Card */}
                <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> 4. Contactability (20%)
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
                      {explanation.contactabilityScore || 60} pts
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${explanation.contactabilityScore || 60}%` }} />
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Direct outreach accessibility via phone / email.
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
                    Recommended Pitch Angle
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
                <span>Evaluated Deficit Criteria</span>
                <span>Active Confirmed Deficits: {detectedDeficits.length}</span>
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

          {activeTab === "dimensions" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Commercial Fit & Trust Signals
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Opportunity scoring focuses on legitimate local businesses whose commercial reach can be measurably improved.
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
                      Direct Contactability
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {business.phone ? `Direct phone line verified: ${business.phone}` : "No phone record listed."}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold text-blue-600 dark:text-blue-400 font-mono">
                      {business.phone ? "Phone Reachable" : "Unlisted"}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {explanation.contactabilityScore || 60} Pts
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "evidence" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-blue-600" />
                    Evidence Provenance & Explicit Confidence
                  </h4>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200">
                    {explanation.evidenceConfidenceScore || 50}% Confidence
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Confidence explicitly reflects verified citations, HTTP checks, and source metadata. Unknown criteria do NOT award artificial score penalties.
                </p>
              </div>

              {explanation.unknownAreas && explanation.unknownAreas.length > 0 && (
                <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    Explicit Unknown Areas (Not Assumed / Not Penalized)
                  </h5>
                  <ul className="list-disc list-inside text-xs text-amber-900 dark:text-amber-200 space-y-1">
                    {explanation.unknownAreas.map((area, idx) => (
                      <li key={idx}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === "qualification" && (
            <div className="space-y-5">
              {/* Header Status & Prioritization Banner */}
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                      qualResult.status === "QUALIFIED"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300"
                        : qualResult.status === "NEEDS_REVIEW"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300"
                        : qualResult.status === "DISQUALIFIED"
                        ? "bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300"
                    }`}>
                      {qualResult.status}
                    </span>
                    {qualResult.isManualOverride && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-300 flex items-center gap-1">
                        <FileEdit className="w-3 h-3" /> Manual Override
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-bold">
                      Priority Rank: #{qualResult.prioritizationRank}/100
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                      Qual Score: {qualResult.qualificationScore}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {qualResult.qualificationReason}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {qualResult.prioritizationExplanation}
                </p>
              </div>

              {/* Disqualification or Review Triggers Callouts */}
              {qualResult.disqualificationReasons && qualResult.disqualificationReasons.length > 0 && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-rose-700 dark:text-rose-400">
                    <Ban className="w-3.5 h-3.5 text-rose-600" />
                    Documented Disqualification Criteria
                  </div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {qualResult.disqualificationReasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {qualResult.reviewTriggers && qualResult.reviewTriggers.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider text-amber-700 dark:text-amber-400">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Review Triggers Pending Verification
                  </div>
                  <ul className="list-disc list-inside space-y-0.5">
                    {qualResult.reviewTriggers.map((trigger, i) => (
                      <li key={i}>{trigger}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 5 Standardized Qualification Criteria Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                  5 Standardized Qualification Criteria
                </h4>

                <div className="space-y-2">
                  {Object.values(qualResult.criteria).map((crit) => (
                    <div 
                      key={crit.code}
                      className={`p-3 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                        crit.passed
                          ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          {crit.passed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {crit.label}
                            </span>
                            {crit.isMandatory && (
                              <span className="text-[10px] uppercase font-bold text-slate-400">
                                [Mandatory]
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {crit.explanation}
                          </p>
                        </div>
                      </div>
                      <span className={`font-mono font-bold text-xs shrink-0 px-2 py-0.5 rounded ${
                        crit.passed 
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        +{crit.scoreContribution} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Manual Override & User Control Section */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileEdit className="w-4 h-4 text-blue-600" />
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      User Control & Manual Qualification Overrides
                    </h5>
                  </div>
                  {!showOverrideForm && !showRevertForm && (
                    <div className="flex items-center gap-2">
                      {qualResult.isManualOverride && (
                        <button
                          type="button"
                          onClick={() => setShowRevertForm(true)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" /> Revert Override
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowOverrideForm(true)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <FileEdit className="w-3 h-3" /> Override Status
                      </button>
                    </div>
                  )}
                </div>

                {/* Override Form */}
                {showOverrideForm && (
                  <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 space-y-3 text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Adjust Qualification Status Manually
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-slate-500 font-semibold">New Status:</label>
                      <select
                        value={overrideStatus}
                        onChange={(e) => setOverrideStatus(e.target.value as QualificationStatus)}
                        className="px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-xs"
                      >
                        <option value="QUALIFIED">QUALIFIED</option>
                        <option value="NEEDS_REVIEW">NEEDS_REVIEW</option>
                        <option value="UNQUALIFIED">UNQUALIFIED</option>
                        <option value="DISQUALIFIED">DISQUALIFIED</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-500 font-semibold mb-1">
                        Audit Rationale / Reason (Required):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Verified active phone call with manager confirming interest in redesign."
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowOverrideForm(false)}
                        className="px-3 py-1 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyOverride}
                        className="px-3.5 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white cursor-pointer shadow-xs"
                      >
                        Save Override & Log Audit
                      </button>
                    </div>
                  </div>
                )}

                {/* Revert Form */}
                {showRevertForm && (
                  <div className="p-3.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 space-y-3 text-xs">
                    <div className="font-bold text-slate-900 dark:text-white">
                      Revert to Automated Qualification
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      This will restore the automated evidence-based calculation (original status was <strong>{qualResult.activeOverride?.originalAutoStatus}</strong>).
                    </p>
                    <input
                      type="text"
                      placeholder="Reason for reverting override (optional)..."
                      value={revertReason}
                      onChange={(e) => setRevertReason(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                    />
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowRevertForm(false)}
                        className="px-3 py-1 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleRevertOverride}
                        className="px-3.5 py-1 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-xs"
                      >
                        Confirm Revert
                      </button>
                    </div>
                  </div>
                )}

                {/* Audit History List */}
                {qualResult.overrideHistory && qualResult.overrideHistory.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Qualification Audit History ({qualResult.overrideHistory.length})
                    </div>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {qualResult.overrideHistory.map((rec) => (
                        <div key={rec.id} className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {rec.previousStatus} → {rec.newStatus}
                            </span>
                            <span className="text-slate-400 ml-1.5">by {rec.userName}</span>
                            <p className="text-slate-500 dark:text-slate-400 text-[10px] italic">"{rec.reason}"</p>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 shrink-0 ml-2">
                            {new Date(rec.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
