import React, { useState } from 'react';
import {
  ArrowUpFromLine,
  Check,
  Download,
  Laptop,
  PlusSquare,
  Smartphone,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'navbar' | 'mobile';
  onAction?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'navbar',
  onAction,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  // If already running as an installed PWA, suppress the install button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    onAction?.();
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowInstallGuide(true);
  };

  return (
    <>
      {variant === 'mobile' ? (
        <button
          onClick={handleInstallClick}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition-all active:scale-[0.98] cursor-pointer"
        >
          <Download className="h-4 w-4 animate-pulse" />
          <span>{isIOS ? 'Install on iOS' : 'Download & Install App'}</span>
        </button>
      ) : (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 transition-all duration-200 cursor-pointer shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 transform hover:-translate-y-0.5 active:translate-y-0"
          title="Install SiteScout AI to your device for offline access"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden md:inline">
            {isIOS ? 'Install on iOS' : 'Install App'}
          </span>
        </button>
      )}

      <AnimatePresence>
        {showInstallGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstallGuide(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-left"
            >
              <button
                onClick={() => setShowInstallGuide(false)}
                className="absolute top-4 right-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                aria-label="Close install dialog"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Install SiteScout AI
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Run as a standalone app with offline access
                  </p>
                </div>
              </div>

              <div className="mb-6 space-y-3 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                <div className="flex items-start gap-2.5 text-xs">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Instant Launch:</strong> Open directly from your Home Screen, Dock, or Desktop Applications menu.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-xs">
                  <WifiOff className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Offline Capabilities:</strong> View saved websites, edit drafts, check prospects, and search cached directories without internet.
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-xs">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Full-Screen Workspace:</strong> Dedicated standalone window without browser tabs or URL chrome.
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {isIOS ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Smartphone className="h-4 w-4 text-blue-500" />
                      <span>Install on iPhone / iPad (Safari)</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-2.5 text-xs text-slate-600 dark:text-slate-300 pl-1">
                      <li>
                        Tap the{' '}
                        <strong className="inline-flex items-center gap-0.5 text-slate-950 dark:text-white px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                          Share <ArrowUpFromLine className="h-3.5 w-3.5 inline mx-0.5" />
                        </strong>{' '}
                        button in the Safari toolbar.
                      </li>
                      <li>
                        Scroll down and tap{' '}
                        <strong className="inline-flex items-center gap-0.5 text-slate-950 dark:text-white px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
                          Add to Home Screen <PlusSquare className="h-3.5 w-3.5 inline mx-0.5" />
                        </strong>
                        .
                      </li>
                      <li>
                        Tap <strong className="text-slate-950 dark:text-white">Add</strong> in the top-right corner to install.
                      </li>
                    </ol>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Laptop className="h-4 w-4 text-blue-500" />
                      <span>Desktop &amp; Android Install Guide</span>
                    </div>
                    <ul className="list-disc list-inside space-y-2.5 text-xs text-slate-600 dark:text-slate-300 pl-1">
                      <li>
                        Click the <strong className="text-slate-950 dark:text-white">Install icon</strong> on the right side of your browser address bar.
                      </li>
                      <li>
                        Or open the browser menu <strong className="text-slate-950 dark:text-white">(three dots ⋮)</strong> and choose{' '}
                        <strong className="text-slate-950 dark:text-white">&quot;Install SiteScout AI&quot;</strong> or{' '}
                        <strong className="text-slate-950 dark:text-white">&quot;Add to Home screen&quot;</strong>.
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                {isInstallable && (
                  <button
                    onClick={async () => {
                      const ok = await install();
                      if (ok) setShowInstallGuide(false);
                    }}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Install Now
                  </button>
                )}
                <button
                  onClick={() => setShowInstallGuide(false)}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
