import React, { useState } from "react";
import { Business, GeneratedSite } from "../types";
import { normalizePhoneNumber } from "../lib/formatters";
import CashEngineWorkflow from "./CashEngineWorkflow";
import { 
  Zap, Globe, MapPin, Search, ArrowRight, CheckCircle2, 
  MessageSquare, Phone, Mail, Copy, Check, ExternalLink, 
  Sparkles, Layers, RefreshCw, Send, Smartphone
} from "lucide-react";

interface ThreeStepRevenueEngineProps {
  onScanBusinesses: (city: string, category: string, count: number) => Promise<void>;
  onBuildWebsite: (business: Business) => void;
  onOpenPitchModal?: (business: Business, site?: GeneratedSite) => void;
  businesses: Business[];
  userSites: GeneratedSite[];
  selectedBusiness: Business | null;
  activeGeneratedSite: GeneratedSite | null;
  isScanning: boolean;
}

export default function ThreeStepRevenueEngine({
  onScanBusinesses,
  onBuildWebsite,
  onOpenPitchModal,
  businesses,
  userSites,
  selectedBusiness,
  activeGeneratedSite,
  isScanning
}: ThreeStepRevenueEngineProps) {
  // Step 1 Form States
  const [cityInput, setCityInput] = useState("Austin, TX");
  const [categoryInput, setCategoryInput] = useState("Local Contractors & Trades");
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Step 3 Outbound Pitch States
  const [pitchChannel, setPitchChannel] = useState<"whatsapp" | "sms" | "email" | "call">("whatsapp");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Filter businesses without websites (Branch B - Greenfield opportunities)
  const noWebsiteBusinesses = businesses.filter(
    b => !b.presence?.hasWebsite && (!b.presence?.websiteUrl || b.presence.websiteUrl.trim() === "")
  );

  // Fallback to any business if all have websites
  const candidateList = noWebsiteBusinesses.length > 0 ? noWebsiteBusinesses : businesses;

  // Selected or latest target business
  const targetBiz = selectedBusiness || candidateList[0] || null;

  // Matched generated site for target business
  const matchedSite = activeGeneratedSite || (targetBiz 
    ? userSites.find(s => s.businessName.toLowerCase() === targetBiz.name.toLowerCase()) || userSites[0] 
    : userSites[0]) || null;

  const previewLink = matchedSite 
    ? `${window.location.origin}/preview/${matchedSite.previewToken || matchedSite.id}`
    : window.location.origin;

  // Auto-detect location
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&format=json`);
          if (res.ok) {
            const data = await res.json();
            const city = data.address?.city || data.address?.town || data.address?.suburb || data.address?.state || "Local Area";
            const country = data.address?.country || "";
            setCityInput(`${city}${country ? `, ${country}` : ""}`);
          }
        } catch (e) {
          console.error("Location lookup failed", e);
          setCityInput("Nearby Businesses");
        } finally {
          setDetectingLocation(false);
        }
      },
      (err) => {
        console.warn("Geolocation denied or unavailable", err);
        setDetectingLocation(false);
      }
    );
  };

  const handleRunScan = () => {
    onScanBusinesses(cityInput, categoryInput, 20);
  };

  // Generate customized high-converting outbound message copy
  const getPitchMessage = () => {
    const bizName = targetBiz?.name || matchedSite?.businessName || "your business";
    const category = targetBiz?.category || matchedSite?.category || "services";
    const phone = targetBiz?.phone || "";

    if (pitchChannel === "whatsapp") {
      return `Hi ${bizName} Team,

I noticed you don't currently have a dedicated website listed when local customers search for ${category} on Google.

I created a free website preview for your business:
👉 ${previewLink}

It includes 1-click WhatsApp customer messaging, your verified service catalog, and instant quote requests.

Take a look on your phone or computer. Once you approve it, let's customize and launch it!`;
    }

    if (pitchChannel === "sms") {
      return `Hi ${bizName}! I noticed you don't have a website listed on Google. I created a free website preview for your business here: ${previewLink} - once you check it out, let's customize and launch it!`;
    }

    if (pitchChannel === "email") {
      return `Subject: Free Website Preview for ${bizName}

Hi ${bizName} Team,

While researching top-rated ${category} providers in our area, I noticed that ${bizName} doesn't currently have an active website linked on search directories.

With over 80% of local customers searching on smartphones, having a direct booking and quote page makes a huge difference in winning jobs.

I created a free website preview for your business:
👉 ${previewLink}

Key features included:
- Instant 1-Click WhatsApp & Phone Callback buttons
- Verified Business Truth facts & service catalog
- Mobile-optimized contact & quote capture form
- Local customer review badges

Once you review and approve it, let's customize and launch it on your custom domain!

Best regards,
Local Digital Development`;
    }

    // Cold Call Script
    return `COLD CALL OPENER (30 Seconds):

"Hi, is this the owner of ${bizName}?

My name is [Your Name], I'm a local web developer. The reason for my call is quick: I noticed your Google listing has great reviews, but there's no website linked when customers search for ${category}.

I created a free website preview for your business with your phone number, service list, and WhatsApp buttons. 

Can I send you a quick preview link on WhatsApp or SMS right now so you can take a look? Once you approve it, let's customize and launch it for you."`;
  };

  const pitchMessageText = getPitchMessage();

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(pitchMessageText);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(previewLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSendViaWhatsApp = () => {
    const phoneClean = normalizePhoneNumber(targetBiz?.phone);
    const textEncoded = encodeURIComponent(pitchMessageText);
    if (phoneClean.length >= 7) {
      window.open(`https://wa.me/${phoneClean}?text=${textEncoded}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${textEncoded}`, "_blank");
    }
  };

  const handleSendViaEmail = () => {
    const subject = encodeURIComponent(`Custom Interactive Website Preview for ${targetBiz?.name || "Your Business"}`);
    const body = encodeURIComponent(pitchMessageText);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleSendViaSMS = () => {
    const body = encodeURIComponent(pitchMessageText);
    window.open(`sms:?body=${body}`, "_blank");
  };

  return (
    <div className="space-y-6 text-left">
      {/* Hero Headline & Direct Value Proposition */}
      <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/30 px-3 py-1 text-xs font-bold text-blue-200 backdrop-blur-md border border-blue-400/30">
              <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
              <span>The 3-Step Rapid Revenue Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Turn Businesses Without Websites Into Paying Clients
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Find 20 real businesses near you that have zero web presence, generate a beautiful tailored website in 1 click, and send them the live preview link with a ready-to-close message.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 text-center min-w-[100px]">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">No-Website Leads</span>
              <span className="text-2xl font-black text-white">{noWebsiteBusinesses.length}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-3.5 text-center min-w-[100px]">
              <span className="text-[10px] uppercase font-bold text-blue-200 block">Ready Previews</span>
              <span className="text-2xl font-black text-emerald-300">{userSites.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cash Engine Commercial Workflow Architecture Diagram */}
      <CashEngineWorkflow businesses={businesses} userSites={userSites} />

      {/* 3-Step Execution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ================= STEP 1: SCAN 20 BUSINESSES ================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  1
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Find 20 Real Businesses
                  </h3>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                    Zero Web Presence Near You
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                Step 1
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Scans verified public directories for high-rated local businesses missing a website.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                  Location (City or Radius)
                </label>
                <div className="flex gap-1.5">
                  <div className="relative flex-1">
                    <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={cityInput}
                      onChange={(e) => setCityInput(e.target.value)}
                      placeholder="e.g. Austin, TX or London"
                      className="w-full rounded-xl border border-slate-200 pl-8.5 pr-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={detectingLocation}
                    title="Detect current GPS location"
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                  >
                    <RefreshCw className={`h-4 w-4 ${detectingLocation ? "animate-spin text-blue-600" : ""}`} />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block mb-1">
                  Industry / Category
                </label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Local Contractors & Trades">Local Contractors &amp; Trades (Plumbers, Electricians)</option>
                  <option value="Bakeries, Cafes & Restaurants">Bakeries, Cafes &amp; Restaurants</option>
                  <option value="Auto Repair & Mechanics">Auto Repair &amp; Mechanics</option>
                  <option value="Salons, Barbershops & Spas">Salons, Barbershops &amp; Spas</option>
                  <option value="Law Firms & Accountants">Law Firms &amp; Accountants</option>
                  <option value="Medical, Dental & Clinics">Medical, Dental &amp; Clinics</option>
                  <option value="Gyms, Fitness & Yoga">Gyms, Fitness &amp; Yoga</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunScan}
            disabled={isScanning}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md shadow-blue-500/15 cursor-pointer disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Scanning 20 Real Businesses...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" /> Scan 20 Businesses Without Websites
              </>
            )}
          </button>
        </div>

        {/* ================= STEP 2: BUILD BEAUTIFUL WEBSITE ================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  2
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Build Beautiful Website
                  </h3>
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                    1-Click Tailored Prototype
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                Step 2
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Generates a tailored responsive site with their real name, phone, WhatsApp CTA, services, and Google review rating.
            </p>

            {/* Target business selection card */}
            {targetBiz ? (
              <div className="p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/40 dark:border-indigo-950 dark:bg-indigo-950/20 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {targetBiz.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" /> {targetBiz.address}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5 flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" /> {targetBiz.phone}
                    </p>
                  </div>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 shrink-0">
                    No Website
                  </span>
                </div>

                {matchedSite && (
                  <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-[11px]">
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Site Ready
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      ID: {matchedSite.id.slice(0, 8)}...
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 text-xs">
                Run Step 1 to load target businesses without websites.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => targetBiz && onBuildWebsite(targetBiz)}
            disabled={!targetBiz}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-md shadow-indigo-500/15 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {matchedSite ? "Regenerate / View Website" : "Build Website for This Business"}
          </button>
        </div>

        {/* ================= STEP 3: SEND LINK & MESSAGE ================= */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-xl bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                  3
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Send Link &amp; Close Deal
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                    Ready-to-Fire Pitch Copy
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                Step 3
              </span>
            </div>

            {/* Channel Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setPitchChannel("whatsapp")}
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  pitchChannel === "whatsapp" 
                    ? "bg-white text-emerald-700 shadow-xs dark:bg-slate-700 dark:text-emerald-300" 
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setPitchChannel("sms")}
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  pitchChannel === "sms" 
                    ? "bg-white text-blue-700 shadow-xs dark:bg-slate-700 dark:text-blue-300" 
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                SMS
              </button>
              <button
                type="button"
                onClick={() => setPitchChannel("email")}
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  pitchChannel === "email" 
                    ? "bg-white text-purple-700 shadow-xs dark:bg-slate-700 dark:text-purple-300" 
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setPitchChannel("call")}
                className={`flex-1 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  pitchChannel === "call" 
                    ? "bg-white text-amber-700 shadow-xs dark:bg-slate-700 dark:text-amber-300" 
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                Script
              </button>
            </div>

            {/* Live Link Bar */}
            <div>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
                <span>Live Shareable Client Link</span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  {copiedLink ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  {copiedLink ? "Copied Link!" : "Copy Link"}
                </button>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate">
                {previewLink}
              </div>
            </div>

            {/* Message Preview Box */}
            <div className="relative">
              <textarea
                readOnly
                rows={3}
                value={pitchMessageText}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 font-sans focus:outline-none resize-none leading-relaxed"
              />
              <button
                type="button"
                onClick={handleCopyMessage}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 cursor-pointer shadow-xs"
                title="Copy message to clipboard"
              >
                {copiedMessage ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={handleCopyMessage}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-750 px-3 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              {copiedMessage ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedMessage ? "Copied!" : "Copy Message"}</span>
            </button>

            {pitchChannel === "whatsapp" && (
              <button
                type="button"
                onClick={handleSendViaWhatsApp}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2.5 text-xs font-bold transition-all shadow-md shadow-emerald-500/15 cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Open WhatsApp</span>
              </button>
            )}

            {pitchChannel === "sms" && (
              <button
                type="button"
                onClick={handleSendViaSMS}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3 py-2.5 text-xs font-bold transition-all shadow-md shadow-blue-500/15 cursor-pointer"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Send SMS</span>
              </button>
            )}

            {pitchChannel === "email" && (
              <button
                type="button"
                onClick={handleSendViaEmail}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white px-3 py-2.5 text-xs font-bold transition-all shadow-md shadow-purple-500/15 cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5" />
                <span>Send Email</span>
              </button>
            )}

            {pitchChannel === "call" && (
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white px-3 py-2.5 text-xs font-bold transition-all shadow-md shadow-amber-500/15 cursor-pointer"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>Copy Script</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Quick Access Candidate List for Step 2 & 3 */}
      {candidateList.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Active 20-Prospect Revenue Queue
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Select any business to instantly generate their website and grab their custom pitch message.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {candidateList.length} Businesses Loaded
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {candidateList.slice(0, 8).map((biz) => {
              const isSelected = targetBiz?.id === biz.id;
              const hasSite = userSites.some(s => s.businessName.toLowerCase() === biz.name.toLowerCase());

              return (
                <div
                  key={biz.id}
                  onClick={() => onBuildWebsite(biz)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30 ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase truncate">
                        {biz.category}
                      </span>
                      {hasSite && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500" title="Site generated" />
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {biz.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                      {biz.address}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                      {biz.phone}
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                      Build <ArrowRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
