import { CheckCircle2, Play, Search, ArrowRight, ShieldAlert, FileText, Send, DollarSign, X } from "lucide-react";

interface OnboardingProps {
  onClose: () => void;
  onStartSearch: () => void;
}

export default function Onboarding({ onClose, onStartSearch }: OnboardingProps) {
  const steps = [
    {
      title: "Identify Opportunities",
      description: "Search local cities and trade categories. The system automatically highlights businesses operating with NO website or lacking mobile optimization.",
      icon: Search,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40"
    },
    {
      title: "Analyze Presence Scores",
      description: "Generate a complete Digital Presence analysis. SiteScout inspects Google profile quality, reviews counts, and social activities, scoring them from 0-100.",
      icon: ShieldAlert,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40"
    },
    {
      title: "Create Instant AI Previews",
      description: "Click 'Generate Website'. The AI instantly parses Google presence data, creates a beautiful themed site preview with personalized images, copy, and contact widgets.",
      icon: FileText,
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
    },
    {
      title: "Launch Outreach Campaigns",
      description: "Instantly draft highly personalized cold emails, WhatsApp messages, and call scripts matched with custom tones (Concise, Casual, Professional).",
      icon: Send,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
    },
    {
      title: "Deliver Dynamic Proposals",
      description: "Bundle the interactive preview link with a branded proposal contract, customizable pricing estimators, and a direct digital approval sheet.",
      icon: DollarSign,
      color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40"
    }
  ];

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/50 via-indigo-50/20 to-white p-6 shadow-sm dark:border-slate-800 dark:from-slate-900/40 dark:via-indigo-950/10 dark:to-slate-950 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            Quick Onboarding Guide
          </span>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome to SiteScout AI – "Find. Build. Close."
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Discover offline local businesses, instantly generate professional website previews, and win paying clients.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">Designed For:</span>
            {[
              "Freelancers",
              "Website Agencies",
              "Entrepreneurs",
              "IT Companies",
              "Marketing Agencies",
              "Software Developers",
              "Small Studios",
              "Students"
            ].map((role) => (
              <span key={role} className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/30">
                {role}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-500 dark:hover:bg-slate-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-5">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          return (
            <div key={index} className="relative flex flex-col items-center text-center group">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${step.color} shadow-sm border border-slate-100 dark:border-slate-800/80 mb-3`}>
                <StepIcon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {index + 1}
                </span>
                {step.title}
              </h3>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed px-1">
                {step.description}
              </p>
              
              {index < 4 && (
                <div className="hidden md:block absolute top-6 -right-3 translate-x-1/2 text-slate-300 dark:text-slate-700">
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-5 dark:border-slate-800/80 gap-4">
        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>No technical skills required. We proxy Google Listings data & execute layouts automatically.</span>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Skip Guide
          </button>
          <button
            onClick={onStartSearch}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/10 hover:bg-blue-500 focus:outline-none dark:bg-blue-600 dark:hover:bg-blue-500 transition-all"
          >
            <Play className="h-4 w-4 fill-white" /> Start Discovery
          </button>
        </div>
      </div>
    </div>
  );
}
