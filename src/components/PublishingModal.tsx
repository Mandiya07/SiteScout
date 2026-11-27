import React, { useState } from "react";
import { GeneratedSite } from "../types";
import { MessageCircle, Mail, Smartphone, CheckCircle2, Link as LinkIcon, ShieldAlert, ShieldCheck, Wrench, AlertTriangle, Send, ExternalLink } from "lucide-react";
import { runPrePublicationIntegrityScan, normalizeWebsiteSchema } from "../lib/websiteSchema";
import { authedFetch } from "../lib/firebase";
import { normalizePhoneNumber } from "../lib/formatters";

interface PublishingModalProps {
  site: GeneratedSite;
  onClose: () => void;
  onSavePublish: (updatedSite: GeneratedSite) => void;
}

export default function PublishingModal({ site, onClose, onSavePublish }: PublishingModalProps) {
  const [currentSite, setCurrentSite] = useState<GeneratedSite>(site);
  const [copied, setCopied] = useState(false);
  const [emailInput, setEmailInput] = useState(site?.contactPage?.email || site?.truthProfile?.email?.value || "");
  const [phoneInput, setPhoneInput] = useState(site?.phone || "");
  const [sendingChannel, setSendingChannel] = useState<"email" | "whatsapp" | "sms" | null>(null);
  const [sendFeedback, setSendFeedback] = useState<{ type: "success" | "error"; text: string; handoffUrl?: string; channel?: string } | null>(null);

  const scanResult = runPrePublicationIntegrityScan(currentSite || {}, currentSite?.truthProfile);
  const previewUrl = currentSite?.id ? `${window.location.origin}/preview/${currentSite.previewToken || currentSite.id}` : "";

  // Critical Data Validation Check for Send Preview feature
  const isSiteValid = Boolean(currentSite && currentSite.id && currentSite.businessName);
  const hasContactInfo = Boolean(emailInput.trim() || phoneInput.trim());
  const isCriticalDataComplete = isSiteValid && hasContactInfo;

  const handleAutoSanitize = () => {
    if (!currentSite) return;
    const sanitized = normalizeWebsiteSchema(currentSite, null, false);
    setCurrentSite(sanitized);
    onSavePublish(sanitized);
    setSendFeedback({ type: "success", text: "Sanitized unsupported claims! Publication gate unlocked." });
    setTimeout(() => setSendFeedback(null), 3000);
  };

  const handleCopy = () => {
    if (!scanResult.canPublish || !previewUrl) return;
    navigator.clipboard.writeText(previewUrl);
    setCopied(true);
    setSendFeedback({ type: "success", text: "Preview link copied to clipboard!" });
    setTimeout(() => {
      setCopied(false);
      setSendFeedback(null);
    }, 2500);
  };

  const handleSendDemo = async (channel: "email" | "whatsapp" | "sms") => {
    // Validation check before triggering send preview feature
    if (!currentSite || !currentSite.id) {
      setSendFeedback({
        type: "error",
        text: "Validation Error: publicPreviewSite object is missing or uninitialized."
      });
      return;
    }
    if (!emailInput.trim() && !phoneInput.trim()) {
      setSendFeedback({
        type: "error",
        text: "Validation Error: Recipient contact information (Email or Phone) is required before sending preview."
      });
      return;
    }
    if (!scanResult.canPublish) {
      setSendFeedback({
        type: "error",
        text: "Publication blocked by Pre-Publication Integrity Gate. Resolve or auto-sanitize claims first."
      });
      return;
    }

    const cleanEmail = emailInput.trim();
    const cleanPhone = phoneInput.trim();

    if (channel === "email" && (!cleanEmail || !cleanEmail.includes("@"))) {
      setSendFeedback({ type: "error", text: "Please provide a valid recipient email address." });
      return;
    }
    if ((channel === "whatsapp" || channel === "sms") && normalizePhoneNumber(cleanPhone, currentSite.address).length < 7) {
      setSendFeedback({ type: "error", text: "Please provide a valid recipient phone or WhatsApp number." });
      return;
    }

    setSendingChannel(channel);
    setSendFeedback(null);

    try {
      const payload = {
        siteId: currentSite.id,
        businessId: currentSite.businessId,
        businessName: currentSite.businessName,
        previewUrl,
        channel,
        recipientEmail: cleanEmail,
        recipientPhone: cleanPhone,
        address: currentSite.address,
        subject: `Free Website Preview for ${currentSite.businessName}`,
        message: channel === "email"
          ? `Hi ${currentSite.businessName} Team,\n\nI created a custom website preview for your business:\n\n${previewUrl}\n\nOnce you review and approve it, we can customize and launch it for you.`
          : channel === "whatsapp"
            ? `Hi ${currentSite.businessName}! I created a custom website preview for your business: ${previewUrl} - once you approve it, let's customize and launch it!`
            : `Hi ${currentSite.businessName}! I created a custom website preview for your business: ${previewUrl}`
      };

      const res = await authedFetch("/api/send-demo-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not dispatch demo website.");
      }

      const updated = {
        ...currentSite,
        phone: cleanPhone || currentSite.phone,
        salesStatus: "Contacted" as any,
        salesStage: "PREVIEW_SENT" as any,
        contactPage: {
          ...currentSite.contactPage,
          email: cleanEmail || currentSite.contactPage?.email || null
        },
        nextFollowUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      };
      setCurrentSite(updated);
      onSavePublish(updated);

      if (data.deliveryMode === "client_handoff" && data.protocolUrl) {
        if (
          data.protocolUrl.startsWith("mailto:") ||
          data.protocolUrl.startsWith("sms:") ||
          data.protocolUrl.startsWith("https://wa.me/")
        ) {
          const a = document.createElement("a");
          a.href = data.protocolUrl;
          if (channel === "whatsapp") {
            a.target = "_blank";
            a.rel = "noopener noreferrer";
          }
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        setSendFeedback({
          type: "success",
          text: data.message || `Prepared demo link for ${data.recipient}.`,
          handoffUrl: data.protocolUrl,
          channel
        });
      } else {
        setSendFeedback({
          type: "success",
          text: data.message || `Demo website sent to ${data.recipient}.`
        });
      }
    } catch (err: any) {
      setSendFeedback({
        type: "error",
        text: err?.message || "Failed to send demo website."
      });
    } finally {
      setSendingChannel(null);
    }
  };

  const markAsSent = () => {
    if (!scanResult.canPublish || !currentSite) return;
    const updated = {
      ...currentSite,
      salesStatus: "Contacted" as any,
      salesStage: "PREVIEW_SENT" as any,
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
          className="absolute top-4 right-4 rounded-full p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
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
            ? `The custom prototype for ${currentSite?.businessName || "Business"} is ready for preview dispatch.`
            : `SiteScout detected unsupported factual claim(s) on ${currentSite?.businessName || "Business"}. Resolve or auto-sanitize to unlock publishing.`}
        </p>

        {/* Visual Alert Banner if Critical Data is Missing */}
        {!isCriticalDataComplete && (
          <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/40 p-4 text-left border border-amber-300 dark:border-amber-800 mb-6 space-y-1.5 text-xs text-amber-900 dark:text-amber-200 animate-pulse">
            <div className="flex items-center gap-2 font-extrabold">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Missing Critical Data for Send Preview</span>
            </div>
            <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
              {!isSiteValid 
                ? "The preview site object (publicPreviewSite) is missing or uninitialized." 
                : "Recipient contact information is missing. Please provide at least an email address or phone/WhatsApp number below before sending the preview."}
            </p>
          </div>
        )}

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

        {/* Contact Input Form */}
        {scanResult.canPublish && (
          <div className="space-y-3 mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-left">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Recipient Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="owner@business.com"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                WhatsApp / SMS Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+268 7600 0000"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Actions Grid */}
        <div className={`grid grid-cols-2 gap-3 mb-6 ${!scanResult.canPublish || !isCriticalDataComplete ? "opacity-60" : ""}`}>
          <button
            onClick={handleCopy}
            disabled={!scanResult.canPublish || !isCriticalDataComplete}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-500 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500/50 dark:hover:bg-slate-700/50 transition-all group cursor-pointer"
          >
            <div className="rounded-full bg-slate-100 p-3 group-hover:bg-blue-100 dark:bg-slate-700 dark:group-hover:bg-blue-900/40 text-slate-600 group-hover:text-blue-600 dark:text-slate-300 dark:group-hover:text-blue-400 transition-colors">
              <LinkIcon className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{copied ? "Copied!" : "Copy Link"}</span>
          </button>
          
          <button
            onClick={() => handleSendDemo("whatsapp")}
            disabled={!scanResult.canPublish || !isCriticalDataComplete || sendingChannel === "whatsapp"}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-green-500 hover:bg-green-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-green-500/50 dark:hover:bg-slate-700/50 transition-all group cursor-pointer"
          >
            <div className="rounded-full bg-slate-100 p-3 group-hover:bg-green-100 dark:bg-slate-700 dark:group-hover:bg-green-900/40 text-slate-600 group-hover:text-green-600 dark:text-slate-300 dark:group-hover:text-green-400 transition-colors">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {sendingChannel === "whatsapp" ? "Opening..." : "WhatsApp"}
            </span>
          </button>

          <button
            onClick={() => handleSendDemo("email")}
            disabled={!scanResult.canPublish || !isCriticalDataComplete || sendingChannel === "email"}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-amber-500 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-amber-500/50 dark:hover:bg-slate-700/50 transition-all group cursor-pointer"
          >
            <div className="rounded-full bg-slate-100 p-3 group-hover:bg-amber-100 dark:bg-slate-700 dark:group-hover:bg-amber-900/40 text-slate-600 group-hover:text-amber-600 dark:text-slate-300 dark:group-hover:text-amber-400 transition-colors">
              <Mail className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {sendingChannel === "email" ? "Sending..." : "Email"}
            </span>
          </button>

          <button
            onClick={() => handleSendDemo("sms")}
            disabled={!scanResult.canPublish || !isCriticalDataComplete || sendingChannel === "sms"}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-purple-500 hover:bg-purple-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-purple-500/50 dark:hover:bg-slate-700/50 transition-all group cursor-pointer"
          >
            <div className="rounded-full bg-slate-100 p-3 group-hover:bg-purple-100 dark:bg-slate-700 dark:group-hover:bg-purple-900/40 text-slate-600 group-hover:text-purple-600 dark:text-slate-300 dark:group-hover:text-purple-400 transition-colors">
              <Smartphone className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {sendingChannel === "sms" ? "Sending..." : "SMS"}
            </span>
          </button>
        </div>

        {/* Action Status Feedback */}
        {sendFeedback && (
          <div className={`mb-6 p-3.5 rounded-xl border text-xs space-y-1.5 text-left ${
            sendFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-200"
              : "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-200"
          }`}>
            <p className="font-medium">{sendFeedback.text}</p>
            {sendFeedback.handoffUrl && (
              <a
                href={sendFeedback.handoffUrl}
                target={sendFeedback.channel === "whatsapp" ? "_blank" : undefined}
                rel={sendFeedback.channel === "whatsapp" ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-1 font-bold underline mt-1"
              >
                <ExternalLink className="h-3 w-3" />
                {sendFeedback.channel === "email" ? "Open in Email App" : sendFeedback.channel === "whatsapp" ? "Open WhatsApp Chat" : "Open SMS App"}
              </a>
            )}
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
          onClick={() => {
            markAsSent();
            onClose();
          }}
          disabled={!scanResult.canPublish || !isCriticalDataComplete}
          className={`w-full mt-6 rounded-xl py-3.5 text-sm font-bold text-white transition-colors shadow-md shadow-blue-500/20 cursor-pointer ${
            scanResult.canPublish && isCriticalDataComplete ? "bg-blue-600 hover:bg-blue-500" : "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          {!isCriticalDataComplete ? "Provide Contact Data to Send" : scanResult.canPublish ? "Confirm & Close" : "Resolve Unsupported Claims to Publish"}
        </button>

      </div>
    </div>
  );
}
