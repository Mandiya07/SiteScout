import { useState } from "react";
import { GeneratedSite } from "../types";
import WebsiteView from "./WebsiteView";
import { 
  Copy, Check, Share2, Mail, MessageSquare, QrCode, 
  Clock, CheckCircle, ExternalLink, ArrowRight, Settings, Phone, Calendar, ArrowUpRight
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
  const [showQr, setShowQr] = useState(false);
  const [expiry, setExpiry] = useState("14");
  const [previewDevice, setPreviewDevice] = useState<"mockup" | "desktop" | "mobile">("mockup");
  const [customLink] = useState(() => `${window.location.origin}/preview/${site.id}`);

  const handleCopy = () => {
    navigator.clipboard.writeText(customLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getMailShareLink = () => {
    const subject = encodeURIComponent(`Interactive Web Design Proposal for ${site.businessName}`);
    const body = encodeURIComponent(`Hi ${site.businessName} Team,\n\nWe designed a fully customized, mobile-optimized interactive website layout specifically matching your local brand guidelines. This isn't a mock image, but a fully functional interactive preview.\n\nYou can click the live link here to test the desktop and mobile buttons directly:\n${customLink}\n\nLet us know if you would like to publish this to your custom domain and start capturing more customer calls.\n\nBest regards,\nWeb Design Team`);
    return `mailto:?subject=${subject}&body=${body}`;
  };

  const getWhatsappShareLink = () => {
    const text = encodeURIComponent(`Hi! I built an interactive custom mobile website preview designed specifically for ${site.businessName}. You can view the live draft and test the call/WhatsApp buttons directly here: ${customLink}`);
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
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Unique Delivery URL</h3>
            <div className="mt-3 flex flex-col sm:flex-row items-center gap-3">
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
          </div>

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
                <div className="flex-1 overflow-y-auto flex flex-col">
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
