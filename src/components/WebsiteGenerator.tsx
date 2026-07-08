import { useEffect, useState } from "react";
import { Loader2, CheckCircle, Sparkles, Wand2, ArrowRight } from "lucide-react";

interface WebsiteGeneratorProps {
  businessName: string;
  category: string;
  onCompletion: () => void;
}

export default function WebsiteGenerator({
  businessName,
  category,
  onCompletion
}: WebsiteGeneratorProps) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  const stages = [
    "Harvesting local business registry and maps listings...",
    "Extracting review counters and contact numbers...",
    "Analyzing competitor color patterns and layout templates...",
    "Engineering custom industry palette and typography system...",
    "AI copywriter drafting high-converting Hero headline & pitches...",
    "Formulating structural About page history and mission text...",
    "Populating services schema, features, and pricing structures...",
    "Synthesizing localized FAQs and testimonials block copy...",
    "Assembling responsive SEO tags, schema.org markers, and robots.txt...",
    "Compiling final HTML structure and active WhatsApp widgets..."
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
    }, 600);

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
    <div className="flex min-h-[500px] items-center justify-center p-6">
      <div className="w-full max-w-xl text-center space-y-6">
        {/* Animated Magic Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-blue-500/10 dark:bg-blue-500/20 blur-xl animate-pulse h-24 w-24 mx-auto" />
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 text-white relative z-10 animate-bounce">
            <Wand2 className="h-10 w-10 animate-spin-slow" />
          </div>
        </div>

        {/* Dynamic Titles */}
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500 fill-blue-500" />
            Generating Custom Website Preview
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Developing a personalized, high-converting homepage layout for <strong className="text-slate-800 dark:text-slate-200">{businessName}</strong> ({category}).
          </p>
        </div>

        {/* ProgressBar card */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 dark:border-slate-800/80 dark:bg-slate-950/40">
          <div className="flex items-center justify-between text-xs font-semibold mb-2">
            <span className="text-blue-600 dark:text-blue-400">Step {stage + 1} of {stages.length}</span>
            <span className="text-slate-500 dark:text-slate-400">{progress}% Complete</span>
          </div>

          {/* Core progress line track */}
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Dynamic loading label */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400 min-h-[1.5rem]">
            <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />
            <span className="font-medium animate-fade-in">{stages[stage]}</span>
          </div>
        </div>

        {/* empty visual states of layout assembly */}
        <div className="grid grid-cols-3 gap-3 pt-4 opacity-50 text-slate-400 dark:text-slate-600 text-[10px] font-mono select-none">
          <div className={`rounded border border-dashed border-slate-200 dark:border-slate-800 p-2 text-center transition-all ${progress > 20 ? "bg-blue-50/50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900" : ""}`}>
            {progress > 20 ? "✓ PALETTE SYSTEM" : "BOX: HEADER_PALETTE"}
          </div>
          <div className={`rounded border border-dashed border-slate-200 dark:border-slate-800 p-2 text-center transition-all ${progress > 50 ? "bg-blue-50/50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900" : ""}`}>
            {progress > 50 ? "✓ COPYWRITING COPY" : "BOX: HERO_COPY"}
          </div>
          <div className={`rounded border border-dashed border-slate-200 dark:border-slate-800 p-2 text-center transition-all ${progress > 80 ? "bg-blue-50/50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900" : ""}`}>
            {progress > 80 ? "✓ CONTACT WIDGETS" : "BOX: WHATSAPP_CTA"}
          </div>
        </div>
      </div>
    </div>
  );
}
