import { useEffect, useState } from "react";
import { Loader2, CheckCircle, Sparkles, Wand2, ArrowRight, ShieldCheck, ChevronDown, ChevronUp } from "lucide-react";
import { Business } from "../types";
import BusinessTruthProfileCard from "./BusinessTruthProfileCard";

interface WebsiteGeneratorProps {
  businessName: string;
  category: string;
  business?: Business | null;
  onCompletion: () => void;
}

export default function WebsiteGenerator({
  businessName,
  category,
  business,
  onCompletion
}: WebsiteGeneratorProps) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showTruthDetails, setShowTruthDetails] = useState(true);

  const stages = [
    "Building Business Truth Profile...",
    "Verifying confirmed facts vs draft suggestions...",
    "Creating tailored industry copywriting...",
    "Selecting authentic trade imagery...",
    "Designing hero layout & call-to-actions...",
    "Building services & contact widgets...",
    "Optimizing mobile layout...",
    "Website preview ready."
  ];

  useEffect(() => {
    // Progress increment timer
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 60);

    // Stage switching timer
    const stageInterval = setInterval(() => {
      setStage((prev) => {
        if (prev < stages.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 750);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stageInterval);
    };
  }, []);

  useEffect(() => {
    if (progress === 100) {
      const timeout = setTimeout(() => {
        onCompletion();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [progress, onCompletion]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Top Banner / Progress Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-6">
        {/* Animated Magic Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-blue-500/10 dark:bg-blue-500/20 blur-xl animate-pulse h-20 w-20 mx-auto" />
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 text-white relative z-10 animate-bounce">
            <Wand2 className="h-8 w-8 animate-spin-slow" />
          </div>
        </div>

        {/* Dynamic Titles */}
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500 fill-blue-500" />
            Synthesizing Tailored Website Preview
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-xl mx-auto">
            Constructing a high-converting homepage layout for <strong className="text-slate-800 dark:text-slate-200">{businessName}</strong> ({category}) anchored on verified business truth data.
          </p>
        </div>

        {/* ProgressBar card */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-5 dark:border-slate-800/80 dark:bg-slate-950/40 text-left">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-blue-600 dark:text-blue-400">Step {stage + 1} of {stages.length}</span>
            <span className="text-slate-500 dark:text-slate-400">{progress}% Complete</span>
          </div>

          {/* Core progress line track */}
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Dynamic loading label */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 min-h-[1.5rem]">
            {progress === 100 ? (
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
            )}
            <span className={`font-medium ${progress === 100 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}>
              {stages[stage]}
            </span>
          </div>
        </div>
      </div>

      {/* Business Truth Profile Disclosure */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
              Business Truth Profile Matrix
            </span>
          </div>
          <button
            onClick={() => setShowTruthDetails(!showTruthDetails)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
          >
            {showTruthDetails ? "Hide Verification Matrix" : "Show Verification Matrix"}
            {showTruthDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {showTruthDetails && (
          <BusinessTruthProfileCard business={business} />
        )}
      </div>
    </div>
  );
}
