import React, { useState } from "react";
import { GeneratedSite } from "../types";
import { MessageCircle, Mail, Smartphone, CheckCircle2, Link as LinkIcon } from "lucide-react";

interface PublishingModalProps {
  site: GeneratedSite;
  onClose: () => void;
  onSavePublish: (updatedSite: GeneratedSite) => void;
}

export default function PublishingModal({ site, onClose, onSavePublish }: PublishingModalProps) {
  const [copied, setCopied] = useState(false);
  const [actionStatus, setActionStatus] = useState<string>("");

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${site.businessName.toLowerCase().replace(/[^a-z0-9]/g, "")}.sitescout.app/preview`);
    setCopied(true);
    setActionStatus("Link Copied!");
    setTimeout(() => {
      setCopied(false);
      setActionStatus("");
    }, 2000);
  };

  const handleAction = (platform: string) => {
    setActionStatus(`Opening ${platform}...`);
    setTimeout(() => setActionStatus(""), 2000);
  };

  const markAsSent = () => {
    const updated = {
      ...site,
      prospectStatus: "Preview Sent" as any,
      nextFollowUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    };
    onSavePublish(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl overflow-hidden text-center p-8 border border-slate-100 dark:border-slate-800">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          ✕
        </button>

        {/* Success Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 mb-6">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">Website Preview Ready</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
          The custom prototype for {site.businessName} is published and ready to share.
        </p>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={handleCopy}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500/50 dark:hover:bg-slate-700/50 transition-all group cursor-pointer"
          >
            <div className="rounded-full bg-slate-100 p-3 group-hover:bg-blue-100 dark:bg-slate-700 dark:group-hover:bg-blue-900/40 text-slate-600 group-hover:text-blue-600 dark:text-slate-300 dark:group-hover:text-blue-400 transition-colors">
              <LinkIcon className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{copied ? "Copied!" : "Copy Link"}</span>
          </button>
          
          <button
            onClick={() => handleAction("WhatsApp")}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-green-500 hover:bg-green-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-green-500/50 dark:hover:bg-slate-700/50 transition-all group cursor-pointer"
          >
            <div className="rounded-full bg-slate-100 p-3 group-hover:bg-green-100 dark:bg-slate-700 dark:group-hover:bg-green-900/40 text-slate-600 group-hover:text-green-600 dark:text-slate-300 dark:group-hover:text-green-400 transition-colors">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">WhatsApp</span>
          </button>

          <button
            onClick={() => handleAction("Email")}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-amber-500 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-amber-500/50 dark:hover:bg-slate-700/50 transition-all group cursor-pointer"
          >
            <div className="rounded-full bg-slate-100 p-3 group-hover:bg-amber-100 dark:bg-slate-700 dark:group-hover:bg-amber-900/40 text-slate-600 group-hover:text-amber-600 dark:text-slate-300 dark:group-hover:text-amber-400 transition-colors">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Email</span>
          </button>

          <button
            onClick={() => handleAction("SMS")}
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
          className="w-full mt-6 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-md shadow-blue-500/20 cursor-pointer"
        >
          Confirm & Close
        </button>

      </div>
    </div>
  );
}
