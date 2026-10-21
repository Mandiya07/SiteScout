import React, { useState } from "react";
import { GeneratedSite } from "../types";
import { MessageCircle, Mail, Smartphone, CheckCircle2, Link as LinkIcon, ShieldAlert, ShieldCheck, Wrench, AlertTriangle } from "lucide-react";
import { runPrePublicationIntegrityScan, normalizeWebsiteSchema } from "../lib/websiteSchema";

interface PublishingModalProps {
  site: GeneratedSite;
  onClose: () => void;
  onSavePublish: (updatedSite: GeneratedSite) => void;
}

export default function PublishingModal({ site, onClose, onSavePublish }: PublishingModalProps) {
  const [currentSite, setCurrentSite] = useState<GeneratedSite>(site);
  const [copied, setCopied] = useState(false);
  const [actionStatus, setActionStatus] = useState<string>("");

  const scanResult = runPrePublicationIntegrityScan(currentSite, currentSite.truthProfile);

  const handleAutoSanitize = () => {
    const sanitized = normalizeWebsiteSchema(currentSite, null, false);
    setCurrentSite(sanitized);
    onSavePublish(sanitized);
    setActionStatus("Sanitized unsupported claims! Publication gate unlocked.");
    setTimeout(() => setActionStatus(""), 3000);
  };

  const handleCopy = () => {
    if (!scanResult.canPublish) return;
    navigator.clipboard.writeText(`https://${currentSite.businessName.toLowerCase().replace(/[^a-z0-9]/g, "")}.sitescout.app/preview`);
    setCopied(true);
    setActionStatus("Link Copied!");
    setTimeout(() => {
      setCopied(false);
      setActionStatus("");
    }, 2000);
  };

  const handleAction = (platform: string) => {
    if (!scanResult.canPublish) return;
    setActionStatus(`Opening ${platform}...`);
    setTimeout(() => setActionStatus(""), 2000);
  };

  const markAsSent = () => {
    if (!scanResult.canPublish) return;
    const updated = {
      ...currentSite,
      prospectStatus: "Preview Sent" as any,
      nextFollowUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    };
    onSavePublish(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden text-center p-8 border border-slate-100 dark:border-slate-800 my-8">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>

        {/* Header Icon based on Integrity Status */}
        {scanResult.canPublish ? (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        ) : (
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40 mb-6 animate-bounce">
            <ShieldAlert className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
        )}

        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
          {scanResult.canPublish ? "Website Preview Ready" : "Pre-Publication Integrity Gate"}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {scanResult.canPublish 
            ? `The custom prototype for ${currentSite.businessName} has passed content integrity and is ready to share.`
            : `SiteScout detected unsupported factual claim(s) on ${currentSite.businessName}. Resolve or auto-sanitize to unlock publishing.`}
        </p>

        {/* Pre-Publication Integrity Gate Alert Banner */}
        {!scanResult.canPublish && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 p-5 text-left border border-amber-200 dark:border-amber-800/60 mb-6 space-y-3">
            <div className="flex items-center justify-between text-amber-900 dark:text-amber-200 font-bold text-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Publication Blocked: {scanResult.blockingFindings.length} Unsupported Claim(s)
              </span>
              <span className="text-xs bg-amber-200 dark:bg-amber-900 px-2 py-0.5 rounded-full font-extrabold">BLOCKING</span>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 text-xs">
              {scanResult.blockingFindings.map(f => (
                <div key={f.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/40">
                  <span className="font-bold text-slate-800 dark:text-slate-200">{f.fieldName}:</span>{" "}
                  <span className="text-amber-700 dark:text-amber-400 font-medium">{f.claim}</span>
                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{f.message}</p>
                </div>
              ))}
            </div>

            <button
              onClick={handleAutoSanitize}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white py-2.5 px-4 font-bold text-xs shadow-md cursor-pointer transition-colors"
            >
              <Wrench className="h-4 w-4" />
              ⚡ Auto-Sanitize & Unlock Publishing
            </button>
          </div>
        )}

        {/* Review Findings Banner if no blocking findings */}
        {scanResult.canPublish && scanResult.reviewFindings.length > 0 && (
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 p-4 text-left border border-blue-100 dark:border-blue-900/40 mb-6 text-xs text-blue-800 dark:text-blue-300">
            <span className="font-bold flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Pre-Publication Gate Cleared ({scanResult.reviewFindings.length} Operator Review Item)
            </span>
            <p className="text-slate-600 dark:text-slate-400">
              {scanResult.reviewFindings[0]?.message}
            </p>
          </div>
        )}

        {/* Actions Grid */}
        <div className={`grid grid-cols-2 gap-3 mb-6 ${!scanResult.canPublish ? "opacity-50 pointer-events-none" : ""}`}>
          <button
            onClick={handleCopy}
            disabled={!scanResult.canPublish}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500/50 dark:hover:bg-slate-700/50 transition-all group cursor-pointer"
          >
            <div className="rounded-full bg-slate-100 p-3 group-hover:bg-blue-100 dark:bg-slate-700 dark:group-hover:bg-blue-900/40 text-slate-600 group-hover:text-blue-600 dark:text-slate-300 dark:group-hover:text-blue-400 transition-colors">
              <LinkIcon className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{copied ? "Copied!" : "Copy Link"}</span>
          </button>
          
          <button
            onClick={() => handleAction("WhatsApp")}
            disabled={!scanResult.canPublish}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-green-500 hover:bg-green-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-green-500/50 dark:hover:bg-slate-700/50 transition-all group cursor-pointer"
          >
            <div className="rounded-full bg-slate-100 p-3 group-hover:bg-green-100 dark:bg-slate-700 dark:group-hover:bg-green-900/40 text-slate-600 group-hover:text-green-600 dark:text-slate-300 dark:group-hover:text-green-400 transition-colors">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">WhatsApp</span>
          </button>

          <button
            onClick={() => handleAction("Email")}
            disabled={!scanResult.canPublish}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-amber-500 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-amber-500/50 dark:hover:bg-slate-700/50 transition-all group cursor-pointer"
          >
            <div className="rounded-full bg-slate-100 p-3 group-hover:bg-amber-100 dark:bg-slate-700 dark:group-hover:bg-amber-900/40 text-slate-600 group-hover:text-amber-600 dark:text-slate-300 dark:group-hover:text-amber-400 transition-colors">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Email</span>
          </button>

          <button
            onClick={() => handleAction("SMS")}
            disabled={!scanResult.canPublish}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-purple-500 hover:bg-purple-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-500/50 dark:hover:bg-slate-700/50 transition-all group cursor-pointer"
          >
            <div className="rounded-full bg-slate-100 p-3 group-hover:bg-purple-100 dark:bg-slate-700 dark:group-hover:bg-purple-900/40 text-slate-600 group-hover:text-purple-600 dark:text-slate-300 dark:group-hover:text-purple-400 transition-colors">
              <Smartphone className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">SMS</span>
          </button>
        </div>

        {/* Action Status Feedback */}
        {actionStatus && (
          <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mb-6 animate-pulse">
            {actionStatus}
          </div>
        )}

        {/* Pipeline Update Status */}
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/50 p-5 text-left border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Prospect Status:</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              Preview Sent
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Next Follow-up:</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
              3 days
            </span>
          </div>
        </div>
        
        {/* Done / Mark as Sent Button */}
        <button
          onClick={markAsSent}
          disabled={!scanResult.canPublish}
          className={`w-full mt-6 rounded-xl py-3.5 text-sm font-bold text-white transition-colors shadow-md shadow-blue-500/20 cursor-pointer ${
            scanResult.canPublish ? "bg-blue-600 hover:bg-blue-500" : "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          {scanResult.canPublish ? "Confirm & Close" : "Resolve Unsupported Claims to Publish"}
        </button>

      </div>
    </div>
  );
}
