import { Check, AlertTriangle, HelpCircle, ChevronRight, Zap, ArrowLeft, Star, HeartCrack, Flame, CheckCircle2 } from "lucide-react";
import { Business } from "../types";

interface OpportunityAnalysisProps {
  business: Business;
  onBack: () => void;
  onGenerateWebsite: () => void;
  loading: boolean;
}

export default function OpportunityAnalysis({
  business,
  onBack,
  onGenerateWebsite,
  loading
}: OpportunityAnalysisProps) {
  const analysis = business.analysis;
  const score = analysis?.presenceScore || 45;

  // Helper to resolve scoring badge colors
  const getScoreColor = (num: number) => {
    if (num < 40) return { text: "text-red-500", bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-100 dark:border-red-900/30", fill: "stroke-red-500" };
    if (num < 70) return { text: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-100 dark:border-amber-900/30", fill: "stroke-amber-500" };
    return { text: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/20", border: "border-emerald-100 dark:border-emerald-900/30", fill: "stroke-emerald-500" };
  };

  const colors = getScoreColor(score);

  return (
    <div className="space-y-6">
      {/* Header and Back Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Business Finder
        </button>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          Auditing ID: {business.id}
        </span>
      </div>

      {/* Main Analysis Card Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Digital Presence Score Circle and Presence parameters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Digital Presence Audit</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Calculated score based on search visibility indicators, accessibility, and listing completeness.
          </p>

          {/* Circle Gauge Display */}
          <div className="my-8 flex flex-col items-center justify-center">
            <div className="relative flex h-36 w-36 items-center justify-center">
              {/* SVG circular track and fill */}
              <svg className="absolute top-0 left-0 h-full w-full -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="10"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className={`${colors.fill} transition-all duration-1000 ease-out`}
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 62}
                  strokeDashoffset={2 * Math.PI * 62 * (1 - score / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-center">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">{score}</span>
                <span className="text-xs font-semibold text-slate-400 block mt-0.5">Presence Score</span>
              </div>
            </div>

            <div className={`mt-4 rounded-full px-3.5 py-1 text-xs font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
              {score < 40 ? "Critical Vulnerability" : score < 70 ? "Needs Website Optimization" : "Good Standing"}
            </div>
          </div>

          {/* Quick presence checkpoints */}
          <div className="border-t border-slate-100 pt-5 dark:border-slate-800 space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Website URL Status</span>
              <span className="font-bold text-red-500 flex items-center gap-1.5 bg-red-50 px-2 py-0.5 rounded-full dark:bg-red-950/20">
                <HeartCrack className="h-3 w-3" /> Missing
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Google Listing Quality</span>
              <span className={`font-bold capitalize px-2 py-0.5 rounded-full ${
                business.presence.googleProfileQuality === "good" ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" :
                business.presence.googleProfileQuality === "fair" ? "text-amber-500 bg-amber-50 dark:bg-amber-950/20" : "text-red-500 bg-red-50 dark:bg-red-950/20"
              }`}>
                {business.presence.googleProfileQuality}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Facebook Page Status</span>
              <span className={`font-bold capitalize px-2 py-0.5 rounded-full ${
                business.presence.facebookStatus === "active" ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" :
                business.presence.facebookStatus === "weak" ? "text-amber-500 bg-amber-50 dark:bg-amber-950/20" : "text-red-500 bg-red-50 dark:bg-red-950/20"
              }`}>
                {business.presence.facebookStatus}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Instagram Handle</span>
              <span className={`font-bold capitalize px-2 py-0.5 rounded-full ${
                business.presence.instagramStatus === "active" ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" :
                business.presence.instagramStatus === "weak" ? "text-amber-500 bg-amber-50 dark:bg-amber-950/20" : "text-red-500 bg-red-50 dark:bg-red-950/20"
              }`}>
                {business.presence.instagramStatus}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Description Quality</span>
              <span className={`font-bold capitalize px-2 py-0.5 rounded-full ${
                business.presence.descriptionQuality === "good" ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" :
                business.presence.descriptionQuality === "fair" ? "text-amber-500 bg-amber-50 dark:bg-amber-950/20" : "text-red-500 bg-red-50 dark:bg-red-950/20"
              }`}>
                {business.presence.descriptionQuality}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Photos</span>
              <span className={`font-bold capitalize px-2 py-0.5 rounded-full ${
                business.presence.photosStatus === "sufficient" ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" :
                business.presence.photosStatus === "outdated" ? "text-amber-500 bg-amber-50 dark:bg-amber-950/20" : "text-red-500 bg-red-50 dark:bg-red-950/20"
              }`}>
                {business.presence.photosStatus}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Opening Hours</span>
              <span className={`font-bold capitalize px-2 py-0.5 rounded-full ${
                business.presence.openingHoursStatus === "complete" ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : "text-red-500 bg-red-50 dark:bg-red-950/20"
              }`}>
                {business.presence.openingHoursStatus}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Review Count</span>
              <span className={`font-bold capitalize px-2 py-0.5 rounded-full ${
                business.presence.reviewCountStatus === "many" ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" :
                business.presence.reviewCountStatus === "average" ? "text-amber-500 bg-amber-50 dark:bg-amber-950/20" : "text-red-500 bg-red-50 dark:bg-red-950/20"
              }`}>
                {business.presence.reviewCountStatus} ({business.reviewsCount})
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Review Rating</span>
              <span className={`font-bold capitalize px-2 py-0.5 rounded-full ${
                business.rating >= 4.5 ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" :
                business.rating >= 3.5 ? "text-amber-500 bg-amber-50 dark:bg-amber-950/20" : "text-red-500 bg-red-50 dark:bg-red-950/20"
              }`}>
                {business.rating} ★
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">Contact Info</span>
              <span className={`font-bold capitalize px-2 py-0.5 rounded-full ${
                business.presence.contactCompleteness === "complete" ? "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" :
                business.presence.contactCompleteness === "partial" ? "text-amber-500 bg-amber-50 dark:bg-amber-950/20" : "text-red-500 bg-red-50 dark:bg-red-950/20"
              }`}>
                {business.presence.contactCompleteness}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: AI Analysis details and comparative insights */}
        <div className="lg:col-span-2 space-y-6">
          {/* Why they need a website */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-500 animate-pulse" /> Local Opportunity Diagnosis
            </h4>
            <div className="mt-3.5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950/40 dark:text-slate-300 leading-relaxed border border-slate-100 dark:border-slate-800">
              {analysis?.whyWebsiteNeeded}
            </div>

            {/* AI Recommendations */}
            <div className="mt-6">
              <h5 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                Strategic Digital Action Plan
              </h5>
              <ul className="space-y-3">
                {analysis?.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30">
                      {i + 1}
                    </span>
                    <span className="mt-0.5 leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Competitor Pitches and Call to Action */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/20 to-indigo-50/10 p-6 dark:border-slate-800/80 dark:from-slate-950/40 dark:to-slate-950/10">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Sales Pitch Angles (Use in Outreach)
            </h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {analysis?.competitorPitches.map((pitch, i) => (
                <div key={i} className="rounded-xl border border-white/80 bg-white/70 p-3.5 dark:border-slate-800/60 dark:bg-slate-900/40">
                  <span className="inline-block rounded-full bg-indigo-50 px-1.5 py-0.5 text-[9px] font-extrabold text-indigo-700 dark:bg-indigo-950/55 dark:text-indigo-300 uppercase tracking-wide mb-1.5">
                    Angle {i + 1}
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    "{pitch}"
                  </p>
                </div>
              ))}
            </div>

            {/* Huge Action trigger */}
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800/80 gap-4">
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Ready to present an irresistible layout?
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  The website generator will write customized copy and theme layout styles based on this audit.
                </p>
              </div>

              <button
                onClick={onGenerateWebsite}
                disabled={loading}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-500/10 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 transition-all cursor-pointer group"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating Custom Preview...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 fill-white group-hover:scale-110 transition-transform" /> Generate Website Preview
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
