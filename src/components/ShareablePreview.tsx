import { useState } from "react";
import { GeneratedSite } from "../types";
import WebsiteView from "./WebsiteView";
import { 
  Copy, Check, Share2, Mail, MessageSquare, QrCode, 
  Clock, CheckCircle, ExternalLink, ArrowRight, Settings, Phone, Calendar, ArrowUpRight,
  Eye, Smartphone, Monitor, Flame, AlertTriangle, ShieldCheck
} from "lucide-react";

interface ShareablePreviewProps {
  site: GeneratedSite;
  onBackToEditor: () => void;
  onGoToSalesAssistant: () => void;
  onGoToProposals: () => void;
  onOpenPortal: () => void;
}

export default function ShareablePreview({
  site,
  onBackToEditor,
  onGoToSalesAssistant,
  onGoToProposals,
  onOpenPortal
}: ShareablePreviewProps) {
  const [copied, setCopied] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [pitchChannel, setPitchChannel] = useState<"whatsapp" | "sms" | "email" | "call">("whatsapp");
  const [showQr, setShowQr] = useState(false);
  const [expiry, setExpiry] = useState("14");
  const [previewDevice, setPreviewDevice] = useState<"mockup" | "desktop" | "mobile">("mockup");
  const customLink = site.previewToken 
    ? `${window.location.origin}/preview/${site.previewToken}` 
    : `${window.location.origin}/preview/${site.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(customLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPitchMessage = () => {
    if (pitchChannel === "whatsapp") {
      return `Hi ${site.businessName} Team,\n\nI noticed you don't currently have a dedicated website linked when customers search for ${site.category || "services"} on Google.\n\nI created a free website preview for your business:\n👉 ${customLink}\n\nTake a quick look on your phone or computer. Once you approve it, let's customize and launch it!`;
    }
    if (pitchChannel === "sms") {
      return `Hi ${site.businessName}! I noticed your business doesn't have a website listed. I created a free website preview for your business here: ${customLink} - once you check it out, let's customize and launch it!`;
    }
    if (pitchChannel === "email") {
      return `Subject: Free Website Preview for ${site.businessName}\n\nHi ${site.businessName} Team,\n\nWhile researching top-rated ${site.category || "service"} providers in our area, I noticed that ${site.businessName} doesn't currently have an active website linked on Google.\n\nI created a free website preview for your business:\n👉 ${customLink}\n\nKey features included:\n- Instant 1-Click WhatsApp & Phone Callback buttons\n- Verified Business Truth facts & service catalog\n- Mobile-optimized contact & quote capture form\n\nOnce you review it, let's customize and launch it for you!\n\nBest regards,\nLocal Digital Development`;
    }
    return `COLD CALL OPENER (30-Sec):\n\n"Hi, is this the owner of ${site.businessName}?\n\nMy name is [Your Name], I'm a local web developer. I noticed your Google listing has great reviews, but there's no website linked when customers search for ${site.category || "your services"}.\n\nI created a free website preview for your business with your verified phone number, service list, and WhatsApp buttons.\n\nCan I send you a 10-second link on WhatsApp or SMS right now so you can take a look? Once you approve it, let's customize and launch it for you."`;
  };

  const handleCopyMsg = () => {
    navigator.clipboard.writeText(getPitchMessage());
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  const getMailShareLink = () => {
    const subject = encodeURIComponent(`Free Website Preview for ${site.businessName}`);
    const body = encodeURIComponent(`Hi ${site.businessName} Team,\n\nI created a free website preview for your business matching your verified local brand details.\n\nYou can view the live preview here:\n${customLink}\n\nOnce you check it out and approve it, let's customize and launch it on your custom domain!\n\nBest regards,\nWeb Design Team`);
    return `mailto:?subject=${subject}&body=${body}`;
  };

  const getWhatsappShareLink = () => {
    const text = encodeURIComponent(`Hi! I created a free website preview for ${site.businessName}. You can view the live preview here: ${customLink} - once you approve it, let's customize and launch it!`);
    return `https://wa.me/?text=${text}`;
  };

  const getExpiryDateString = () => {
    if (expiry === "0") return "Never (Permanent Presentation)";
    const days = parseInt(expiry, 10);
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Upper navigation header info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-4">
        <div>
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            ✓ Preview Published &amp; Share Ready
          </span>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Client Presentation Portal
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Deliver this customized layout directly to the owner. It is live, fast, and optimized for immediate customer callback bookings.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToEditor}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 transition-colors"
          >
            Modify Design
          </button>
          <button
            onClick={onGoToSalesAssistant}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/10 hover:bg-blue-500 transition-all"
          >
            Create Outreach Text <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column (2/3 size): Live Link & Device Display Mockup */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Link delivery board */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Step 3: Unique Client Link &amp; Pitch Copy</h3>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full uppercase">Ready to Fire</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full rounded-xl bg-slate-50 border border-slate-150 px-4 py-2.5 text-xs text-slate-600 font-mono select-all dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 flex items-center justify-between overflow-x-auto">
                <span>{customLink}</span>
                <span className="text-[10px] text-emerald-600 font-sans font-bold uppercase shrink-0 bg-emerald-50 px-1.5 py-0.2 rounded ml-2 dark:bg-emerald-950/40 dark:text-emerald-400">SSL Active</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopy}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-500" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" /> Copy Link
                    </>
                  )}
                </button>
                <a
                  href={customLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
                >
                  <ExternalLink className="h-4 w-4" /> Visit Page
                </a>
              </div>
            </div>

            {/* Ready-to-Send Outbound Pitch Message Box */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex rounded-lg bg-slate-200/60 p-1 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => setPitchChannel("whatsapp")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      pitchChannel === "whatsapp" ? "bg-white text-emerald-700 shadow-xs dark:bg-slate-800 dark:text-emerald-300" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setPitchChannel("sms")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      pitchChannel === "sms" ? "bg-white text-blue-700 shadow-xs dark:bg-slate-800 dark:text-blue-300" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setPitchChannel("email")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      pitchChannel === "email" ? "bg-white text-purple-700 shadow-xs dark:bg-slate-800 dark:text-purple-300" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setPitchChannel("call")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold cursor-pointer transition-all ${
                      pitchChannel === "call" ? "bg-white text-amber-700 shadow-xs dark:bg-slate-800 dark:text-amber-300" : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    30s Call Script
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyMsg}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-500 cursor-pointer"
                >
                  {copiedMsg ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedMsg ? "Copied Message!" : "Copy Pitch Message"}</span>
                </button>
              </div>

              <textarea
                readOnly
                rows={4}
                value={getPitchMessage()}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 font-sans focus:outline-none resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Online Presence Audit & Resolution Summary Section */}
          {(() => {
            const deficits = site.deficits || site.presence?.deficits || {
              noWebsite: true,
              noWhatsappCta: true,
              noBookingSystem: true,
              noOnlineCatalogue: true,
              noEnquiryForm: true,
              noSeo: true,
              poorMobileExperience: true,
            };

            const auditScore = site.presence?.presenceScore || 45;

            const resolvedAuditItems = [
              {
                key: "noWebsite",
                label: "Business Website",
                gap: "No dedicated mobile-friendly website listing",
                solution: "Tailwind landing page optimized for regional Google searches",
                active: !!deficits.noWebsite
              },
              {
                key: "noWhatsappCta",
                label: "WhatsApp Callback",
                gap: "No instant WhatsApp 1-tap call-to-action",
                solution: "High-contrast WhatsApp button with welcome messages",
                active: !!deficits.noWhatsappCta
              },
              {
                key: "noBookingSystem",
                label: "Booking Engine",
                gap: "No integrated scheduling or quote capture",
                solution: "Active contact form and direct appointment dispatch",
                active: !!deficits.noBookingSystem
              },
              {
                key: "noOnlineCatalogue",
                label: "Service Transparency",
                gap: "No structured service catalog or clear menu online",
                solution: "Fully styled service grid with verified business data",
                active: !!deficits.noOnlineCatalogue
              },
              {
                key: "poorMobileExperience",
                label: "Smartphone Usability",
                gap: "Current assets look clunky on small screen devices",
                solution: "Mobile-first liquid framework with click-to-call bars",
                active: !!deficits.poorMobileExperience
              },
              {
                key: "noSeo",
                label: "Search SEO Optimization",
                gap: "Missing localized search metadata tags",
                solution: "Pre-rendered title, alt and keyword tags configured to rank",
                active: !!deficits.noSeo
              }
            ];

            const activeResolutions = resolvedAuditItems.filter(item => item.active);

            return (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                      Google Maps Presence Audit
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Visual comparison highlighting how your new website successfully resolves critical conversion deficits.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-850 self-start sm:self-auto">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Audit Score:</span>
                    <span className="text-xs font-black font-mono px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                      {auditScore}% / 100%
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {resolvedAuditItems.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3.5 rounded-xl border transition-all duration-250 ${
                        item.active 
                          ? "border-emerald-100 bg-emerald-50/10 dark:border-emerald-900/30 dark:bg-emerald-950/10" 
                          : "border-slate-150 bg-slate-50/30 dark:border-slate-800/50 dark:bg-slate-950/10 opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</span>
                        {item.active ? (
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                            Resolved
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-850 px-2 py-0.5 rounded-full">
                            Already Optimal
                          </span>
                        )}
                      </div>

                      {item.active && (
                        <div className="mt-2.5 space-y-1.5 border-t border-slate-100 dark:border-slate-800/60 pt-2 text-[11px]">
                          <div className="flex items-start gap-1.5 text-rose-600 dark:text-rose-400/90 leading-relaxed">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>
                              <strong className="font-semibold">Detected Gap:</strong> {item.gap}
                            </span>
                          </div>
                          <div className="flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400 leading-relaxed">
                            <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>
                              <strong className="font-semibold">Resolution:</strong> {item.solution}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-850 text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    This interactive diagnostic chart is synchronized to the client's live presentation portal so they can visualize exactly why this site is key to capturing local demand.
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Interactive device visualizer header & tabs */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Live Presentation Display Mode</span>
              <div className="flex items-center space-x-1.5 bg-slate-200/50 rounded-lg p-1 dark:bg-slate-900 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mockup")}
                  className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer text-center ${
                    previewDevice === "mockup" 
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white" 
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Dual Mockup
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer text-center ${
                    previewDevice === "desktop" 
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white" 
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Desktop Preview
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex-1 sm:flex-none px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer text-center ${
                    previewDevice === "mobile" 
                      ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white" 
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Mobile Preview
                </button>
              </div>
            </div>

            {/* Dynamic Rendering based on Selected Mode */}
            {previewDevice === "mockup" && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/30 flex items-center justify-center animate-fade-in">
                <div className="relative w-full max-w-lg h-[360px] flex items-end justify-center">
                  {/* Desktop frame background mockup */}
                  <div className="absolute top-0 left-0 w-[85%] h-[80%] rounded-xl border border-slate-200 bg-white shadow-md overflow-hidden flex flex-col dark:bg-slate-900 dark:border-slate-850">
                    <div className="h-5 bg-slate-100 border-b border-slate-200 px-3 flex items-center space-x-1 shrink-0 dark:bg-slate-950 dark:border-slate-850">
                      <div className="h-2 w-2 rounded-full bg-slate-200" />
                      <div className="h-2 w-2 rounded-full bg-slate-200" />
                      <div className="h-2 w-2 rounded-full bg-slate-200" />
                    </div>
                    <div className="flex-1 p-3 text-left space-y-2 overflow-hidden select-none opacity-80" style={{ fontFamily: site.fontStyle }}>
                      <div className="text-[10px] font-bold text-slate-400">{site.businessName}</div>
                      <div className="text-xs font-extrabold max-w-xs">{site.hero.title}</div>
                      <div className="text-[9px] text-slate-400 max-w-xs">{site.hero.subtitle}</div>
                      <div className="h-4 w-16 rounded bg-blue-500 text-[8px] flex items-center justify-center text-white font-bold">{site.hero.ctaPrimary}</div>
                    </div>
                  </div>

                  {/* Mobile device model overlapping foreground */}
                  <div className="absolute bottom-0 right-4 w-[160px] h-[260px] rounded-[24px] border-[5px] border-slate-900 bg-white shadow-xl overflow-hidden flex flex-col z-10 dark:bg-slate-950">
                    <div className="h-3 bg-slate-950 relative">
                      <div className="absolute top-0.5 left-1/2 -translate-x-1/2 h-2 w-10 bg-slate-900 rounded-b-md" />
                    </div>
                    <div className="flex-1 p-2 text-left space-y-1.5 overflow-hidden select-none opacity-90" style={{ fontFamily: site.fontStyle }}>
                      <div className="text-[8px] font-bold text-slate-400">{site.businessName}</div>
                      <div className="text-[9px] font-extrabold leading-tight">{site.hero.title}</div>
                      <div className="h-3.5 w-12 rounded bg-blue-500 text-[6px] flex items-center justify-center text-white font-bold">{site.hero.ctaPrimary}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {previewDevice === "desktop" && (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden flex flex-col h-[740px] dark:border-slate-800 dark:bg-slate-900 animate-fade-in">
                {/* Simulated browser search/action bar */}
                <div className="h-9 bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between shrink-0 dark:bg-slate-950 dark:border-slate-850">
                  <div className="flex items-center space-x-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="bg-slate-100 rounded-md px-3 py-1 text-[10px] text-slate-500 font-mono w-1/2 text-center truncate dark:bg-slate-900 dark:text-slate-400">
                    {customLink}
                  </div>
                  <div className="w-12" />
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                  <WebsiteView site={site} />
                </div>
              </div>
            )}

            {previewDevice === "mobile" && (
              <div className="flex items-center justify-center py-6 bg-slate-50 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800 animate-fade-in">
                <div className="w-[330px] h-[540px] rounded-[36px] border-[10px] border-slate-900 bg-white shadow-xl overflow-hidden flex flex-col relative dark:bg-slate-900">
                  {/* Phone Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-28 bg-slate-900 rounded-b-xl z-20" />
                  <div className="flex-1 pt-4 overflow-hidden flex flex-col">
                    <WebsiteView site={site} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3 size): Share methods & Admin Portal details */}
        <div className="space-y-6">
          {/* Live Client Engagement & View Telemetry (Point 42) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-blue-600" />
                Live Preview Signals
              </h3>
              <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                {(site.previewViews || 0) > 0 ? `${site.previewViews} Views` : "Awaiting First View"}
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-150 dark:border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Total Client Opens:</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">
                    {site.previewViews || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mt-1.5">
                  <span>Last Activity:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {site.previewLastViewedAt 
                      ? new Date(site.previewLastViewedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : "Not opened yet"}
                  </span>
                </div>
              </div>

              {(site.previewViews || 0) >= 2 ? (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <Flame className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold block">🔥 High Intent Sales Signal</strong>
                    <span>{site.businessName} has viewed this interactive prototype {site.previewViews} times! This is the ideal window to call or WhatsApp them directly.</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Telemetry automatically captures when the prospect opens this link, on mobile or desktop, giving you actionable timing to follow up.
                </p>
              )}
            </div>
          </div>

          {/* Share Channels */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Instant Sharing Actions</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">Leverage our pre-built channel hooks to initiate outreach instantly.</p>
            
            <div className="space-y-2.5">
              <a
                href={getWhatsappShareLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white py-2.5 text-xs font-bold transition-all shadow-sm shadow-emerald-500/10 cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" /> Share via WhatsApp
              </a>
              <a
                href={getMailShareLink()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <Mail className="h-4 w-4 text-blue-500" /> Share via Custom Email
              </a>
              <button
                onClick={() => setShowQr(!showQr)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 py-2.5 text-xs font-bold dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <QrCode className="h-4 w-4 text-indigo-500" /> {showQr ? "Hide QR Code" : "Show Presentation QR"}
              </button>
            </div>

            {/* QR Code container */}
            {showQr && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 text-center space-y-3 border border-slate-100 dark:border-slate-800 animate-fade-in">
                <div className="mx-auto h-36 w-36 bg-white rounded-lg p-2.5 border border-slate-200 flex items-center justify-center shadow-md dark:bg-white">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(customLink)}`} 
                    alt="Presentation QR Code" 
                    className="h-full w-full object-contain"
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Scan this live QR code using any smartphone camera to view the interactive proposal directly on your device.</p>
              </div>
            )}
          </div>

          {/* Settings / Expiry / Client feedback loops */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Preview Life-Cycle Security</h3>
            
            {/* Expiry select */}
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1.5 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-400" /> Preview Expiration Interval
              </label>
              <select
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
              >
                <option value="7">Expires in 7 Days (Closes Deals Faster!)</option>
                <option value="14">Expires in 14 Days (Standard Plan)</option>
                <option value="30">Expires in 30 Days (Agency Plan)</option>
                <option value="0">Never Expires (VIP Only)</option>
              </select>

              <div className="mt-2.5 text-[10px] text-slate-500 font-medium flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-100 dark:border-slate-850">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Active Expiration: <strong className="text-slate-700 dark:text-slate-300">{getExpiryDateString()}</strong></span>
              </div>
            </div>

            {/* Client Portal Access Button */}
            <div className="border-t border-slate-100 pt-4 dark:border-slate-800 space-y-3">
              <div className="bg-blue-50/50 rounded-xl p-3.5 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
                <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Direct Client Revision Portal
                </h4>
                <p className="text-[10px] text-blue-600/80 dark:text-blue-400/80 mt-1 leading-relaxed">
                  Allow your prospective client to request revisions, review layouts, upload assets, or approve the design directly inside their white-labeled workspace.
                </p>
              </div>

              <button
                onClick={onOpenPortal}
                className="w-full inline-flex items-center justify-center gap-1 text-xs font-bold text-blue-600 bg-white hover:bg-blue-50/50 py-2 border border-blue-200 dark:border-blue-800 dark:bg-slate-900 dark:text-blue-400 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Open Collaborative Client Portal <ArrowUpRight className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={onGoToProposals}
                className="w-full inline-flex items-center justify-center gap-1 text-xs font-bold text-indigo-600 bg-white hover:bg-indigo-50/50 py-2 border border-indigo-200 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-400 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Customize Pricing &amp; Generate Proposal <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
