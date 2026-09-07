import { CheckCircle2, Play, Search, ArrowRight, ShieldAlert, FileText, Send, DollarSign, X } from "lucide-react";
import Logo from "./Logo";

interface OnboardingProps {
  onClose: () => void;
  onStartSearch: () => void;
}

export default function Onboarding({ onClose, onStartSearch }: OnboardingProps) {
  const steps = [
    {
      title: "Find & Filter Real Leads",
      description: "Search local cities to discover real businesses, filter for 'No Website', verify digital absence, and rank the best local prospects.",
      icon: Search,
      color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40"
    },
    {
      title: "Build & Review Preview",
      description: "Select a business and automatically build a tailored website preview. Review facts with 3 Content Levels to ensure zero hallucinations.",
      icon: FileText,
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
    },
    {
      title: "Send Free Preview URL",
      description: "Send the live preview URL with low-friction copy: 'I created a free website preview for your business. Once you approve it, let's customize and launch it.'",
      icon: Send,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
    },
    {
      title: "Proposal & Follow-up",
      description: "If interested, send an interactive proposal. If no response, deploy automated 48-hr and 7-day gentle follow-up reminders.",
      icon: ShieldAlert,
      color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40"
    },
    {
      title: "Sale, Payment & Launch",
      description: "Secure digital approval, collect payment, and publish the actual website live to their custom domain name.",
      icon: DollarSign,
      color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40"
    }
  ];

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/50 via-indigo-50/20 to-white p-6 shadow-sm dark:border-slate-800 dark:from-slate-900/40 dark:via-indigo-950/10 dark:to-slate-950 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <Logo variant="full" size="md" />
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
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
