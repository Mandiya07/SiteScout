import { useState, useEffect } from "react";
import { Business, GeneratedSite, ProspectStatus } from "../types";
import { authedFetch } from "../lib/firebase";
import { 
  Mail, Sparkles, Copy, Check, ExternalLink, RefreshCw, Send, 
  AlertCircle, CheckCircle2, X, ChevronDown, Calendar, Phone, 
  Globe, MessageSquare, ShieldAlert, ArrowRight, Clock, Flame, 
  HelpCircle, Eye, Share2, Layers
} from "lucide-react";

interface DraftEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  site?: GeneratedSite;
  onUpdateProspect: (updated: Business) => void;
}

interface DraftEmailResponse {
  subjectLines: string[];
  primarySubject: string;
  body: string;
  highlightedGaps: string[];
  followUpSubject: string;
  followUpBody: string;
}

const TONES = [
  { id: "Consultative", label: "Consultative", desc: "Observation-first, value upfront" },
  { id: "Direct Gap Audit", label: "Direct Audit", desc: "Data-driven conversion gap analysis" },
  { id: "Friendly Local", label: "Friendly Neighbor", desc: "Warm community appreciation" },
  { id: "Executive", label: "Executive", desc: "Premium strategic perspective" },
  { id: "Urgent Opportunity", label: "High Urgency", desc: "Competitor search capture focus" }
];

export default function DraftEmailModal({
  isOpen,
  onClose,
  business,
  site,
  onUpdateProspect
}: DraftEmailModalProps) {
  const [activeTab, setActiveTab] = useState<"initial" | "followUp">("initial");
  const [selectedTone, setSelectedTone] = useState<string>("Consultative");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedSection, setCopiedSection] = useState<string>("");
  const [recipientEmail, setRecipientEmail] = useState<string>(business.email || "");
  const [subject, setSubject] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [followUpSubject, setFollowUpSubject] = useState<string>("");
  const [followUpBody, setFollowUpBody] = useState<string>("");
  const [alternativeSubjects, setAlternativeSubjects] = useState<string[]>([]);
  const [highlightedGaps, setHighlightedGaps] = useState<string[]>([]);
  const [selectedGaps, setSelectedGaps] = useState<string[]>([]);
  const [hasLoggedSent, setHasLoggedSent] = useState<boolean>(false);

  // Compute preview URL
  const previewUrl = site
    ? (site.previewToken 
        ? `${window.location.origin}/preview/${site.previewToken}` 
        : `${window.location.origin}/preview/${site.id}`)
    : `${window.location.origin}/preview/${business.id}`;

  // Helper to extract identified digital deficits from business
  const getAvailableDeficitOptions = () => {
    const presence = business.presence;
    const defs = presence?.deficits || {
      noWebsite: !presence?.hasWebsite,
      outdatedWebsite: false,
      noGooglePresence: false,
      noSocialMedia: false,
      poorBranding: false,
      noWhatsappCta: true,
      noOnlineCatalogue: true,
      noBookingSystem: true,
      noEnquiryForm: true,
      noSeo: true,
      brokenLinks: false,
      poorMobileExperience: true,
      missingContact: !presence?.hasEmail
    };

    const list: { id: string; label: string; icon: any; active: boolean }[] = [
      { id: "noWebsite", label: "No Mobile Website", icon: Globe, active: !!defs.noWebsite },
      { id: "outdatedWebsite", label: "Outdated Web Layout", icon: Globe, active: !!defs.outdatedWebsite },
      { id: "noWhatsappCta", label: "No WhatsApp 1-Tap CTA", icon: MessageSquare, active: !!defs.noWhatsappCta },
      { id: "noBookingSystem", label: "No Online Booking", icon: Calendar, active: !!defs.noBookingSystem },
      { id: "noOnlineCatalogue", label: "Missing Online Menu / Catalog", icon: Layers, active: !!defs.noOnlineCatalogue },
      { id: "noEnquiryForm", label: "No Direct Quote Request Form", icon: Mail, active: !!defs.noEnquiryForm },
      { id: "noSeo", label: "Missing Local Maps SEO", icon: ShieldAlert, active: !!defs.noSeo },
      { id: "poorMobileExperience", label: "Clunky Mobile Navigation", icon: Phone, active: !!defs.poorMobileExperience },
      { id: "missingContact", label: "Missing Direct Email / Hotline", icon: Phone, active: !!defs.missingContact }
    ];

    return list;
  };

  // Initialize selected gaps on open
  useEffect(() => {
    if (isOpen) {
      setRecipientEmail(business.email || "");
      const defs = getAvailableDeficitOptions().filter(d => d.active).map(d => d.label);
      setSelectedGaps(defs.length > 0 ? defs : ["No Mobile Website", "No WhatsApp 1-Tap CTA", "No Online Booking"]);
      generateEmailDraft(selectedTone, defs);
    }
  }, [isOpen, business.id]);

  const generateEmailDraft = async (tone: string, customGaps?: string[]) => {
    setIsLoading(true);
    const gapsToUse = customGaps || selectedGaps;
    try {
      const response = await authedFetch("/api/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business,
          previewUrl,
          tone,
          focusGaps: gapsToUse,
          senderName: "SiteScout Digital Specialist"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate AI email draft");
      }

      const data: DraftEmailResponse = await response.json();
      setSubject(data.primarySubject || `Quick observation regarding ${business.name}'s online presence`);
      setBody(data.body || "");
      setAlternativeSubjects(data.subjectLines || []);
      setHighlightedGaps(data.highlightedGaps || []);
      setFollowUpSubject(data.followUpSubject || `Following up on the prototype for ${business.name}`);
      setFollowUpBody(data.followUpBody || "");
    } catch (err) {
      console.error("Error generating draft email:", err);
      // Fallback in-client if network error occurs
      const city = business.address.split(",")[0]?.trim() || business.address;
      setSubject(`Quick observation regarding ${business.name}'s online presence in ${city}`);
      setBody(
        `Hi ${business.name} Team,\n\nWhile reviewing top ${business.category} providers in ${city}, your ${business.rating || 4.8}★ Google rating and positive reviews caught my attention. Customers clearly trust your work.\n\nHowever, when local clients search on mobile, there are a few friction points: ${gapsToUse.join(", ").toLowerCase()}.\n\nI created a free website preview for your business:\n${previewUrl}\n\nTake a quick look on your phone or computer. Once you approve it, let's customize and launch it!\n\nBest regards,\nDigital Strategy Specialist`
      );
      setFollowUpSubject(`Following up on the website preview for ${business.name}`);
      setFollowUpBody(
        `Hi ${business.name} Team,\n\nFollowing up briefly to see if you had a chance to open the free website preview I created for you: ${previewUrl}\n\nOnce you approve it, let's customize and launch it on your domain!\n\nBest regards,\nDigital Strategy Specialist`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleGap = (gapLabel: string) => {
    setSelectedGaps(prev => {
      const next = prev.includes(gapLabel) 
        ? prev.filter(g => g !== gapLabel) 
        : [...prev, gapLabel];
      return next;
    });
  };

  const handleCopyEmail = (type: "full" | "subject" | "body") => {
    const activeSubject = activeTab === "initial" ? subject : followUpSubject;
    const activeBody = activeTab === "initial" ? body : followUpBody;

    let textToCopy = "";
    if (type === "full") {
      textToCopy = `Subject: ${activeSubject}\n\n${activeBody}`;
    } else if (type === "subject") {
      textToCopy = activeSubject;
    } else {
      textToCopy = activeBody;
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedSection(type);
    setTimeout(() => setCopiedSection(""), 3000);
  };

  const getMailtoUrl = () => {
    const activeSubject = activeTab === "initial" ? subject : followUpSubject;
    const activeBody = activeTab === "initial" ? body : followUpBody;
    const recipient = recipientEmail || "";
    return `mailto:${recipient}?subject=${encodeURIComponent(activeSubject)}&body=${encodeURIComponent(activeBody)}`;
  };

  const handleLogAsSent = () => {
    const now = new Date().toISOString();
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 2);

    const nextStatus: ProspectStatus = business.prospectStatus === "New" || business.prospectStatus === "Analyzed" || business.prospectStatus === "Preview Ready"
      ? "Preview Sent" 
      : business.prospectStatus || "Preview Sent";

    const noteEntry = `AI Email Outreach (${selectedTone}) sent on ${new Date().toLocaleDateString()} with subject: "${subject}". Focused on: ${selectedGaps.slice(0, 2).join(", ")}.`;
    const updatedNotes = business.prospectNotes 
      ? `${business.prospectNotes}\n• ${noteEntry}` 
      : `• ${noteEntry}`;

    const updated: Business = {
      ...business,
      email: recipientEmail || business.email,
      prospectStatus: nextStatus,
      lastContactedAt: now,
      nextFollowUpDate: nextDate.toISOString().split("T")[0],
      prospectNotes: updatedNotes
    };

    onUpdateProspect(updated);
    setHasLoggedSent(true);
    setTimeout(() => {
      setHasLoggedSent(false);
      onClose();
    }, 1400);
  };

  const isDemo = business.isDemo === true || business.dataType === "demo" || business.evidence?.verificationStatus === "sample_demo";

  if (!isOpen) return null;

  const deficitOptions = getAvailableDeficitOptions();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  AI Cold Email Drafter
                </h2>
                {isDemo ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full">
                    <AlertCircle className="w-3 h-3" /> Demo Sandbox Mode
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" /> Live Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Targeting <span className="font-semibold text-slate-700 dark:text-slate-300">{business.name}</span> ({business.category}) in {business.address}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo Mode Notice */}
        {isDemo && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-6 py-2.5 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>
                <strong>Demonstration Record:</strong> Simulated email ({business.email || "synthetic placeholder"}). Email drafting and test copies are active for training.
              </span>
            </div>
          </div>
        )}

        {/* Modal Body: Scrollable area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Business Gaps & Quality Score Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900 border border-blue-100 dark:border-blue-900/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-blue-700 dark:text-blue-400">
                  Identified Digital Deficits for Outreach Context
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  The AI weaves these detected bottlenecks into a consultative observation pitch:
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  ⭐ {business.rating || 4.8} ({business.reviewsCount || 24} reviews)
                </span>
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50">
                  {selectedGaps.length} Gaps Targeted
                </span>
              </div>
            </div>

            {/* Clickable Gaps Tag Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              {deficitOptions.map((gap) => {
                const isSelected = selectedGaps.includes(gap.label);
                return (
                  <button
                    key={gap.id}
                    onClick={() => handleToggleGap(gap.label)}
                    type="button"
                    className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                    title={isSelected ? "Included in AI prompt (Click to exclude)" : "Click to include this gap in AI prompt"}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-rose-500" : "bg-slate-300"}`} />
                    {gap.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tone Selector & Generator Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1">
                Tone Angle:
              </span>
              {TONES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedTone(t.id);
                    generateEmailDraft(t.id);
                  }}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedTone === t.id
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                  title={t.desc}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => generateEmailDraft(selectedTone)}
              disabled={isLoading}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0 disabled:opacity-75 shadow-xs"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Generating AI Pitch...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Regenerate with AI
                </>
              )}
            </button>
          </div>

          {/* Email Sequence Tabs (Initial vs Follow-up) */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab("initial")}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "initial"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Initial Outreach Email
              </button>

              <button
                onClick={() => setActiveTab("followUp")}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "followUp"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Day 3 Follow-Up Draft
              </button>
            </div>

            <div className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              {activeTab === "initial" ? "Primary consultative touchpoint" : "Gentle reminder sequence"}
            </div>
          </div>

          {/* Composer Card: To, Subject, Body */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
            
            {/* Recipient To: */}
            <div className="px-4 py-2.5 flex items-center gap-3 bg-slate-50/50 dark:bg-slate-800/30">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-16">
                To:
              </span>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder={business.email || `contact@${business.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`}
                className="flex-1 text-xs bg-transparent text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
              />
              {!business.email && (
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                  No public email on file - specify or send via contact form
                </span>
              )}
            </div>

            {/* Subject Line & AI Alternative Picks */}
            <div className="p-4 space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 w-16">
                  Subject:
                </span>
                <input
                  type="text"
                  value={activeTab === "initial" ? subject : followUpSubject}
                  onChange={(e) => {
                    if (activeTab === "initial") setSubject(e.target.value);
                    else setFollowUpSubject(e.target.value);
                  }}
                  className="flex-1 text-xs font-semibold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  onClick={() => handleCopyEmail("subject")}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Copy subject only"
                >
                  {copiedSection === "subject" ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Alternative AI Subject Lines (initial email only) */}
              {activeTab === "initial" && alternativeSubjects.length > 0 && (
                <div className="pl-16 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block mb-1.5">
                    Click to swap AI Subject Line angle:
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {alternativeSubjects.map((line, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSubject(line)}
                        className={`text-left text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                          subject === line
                            ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/60 dark:border-blue-900 dark:text-blue-300 font-semibold"
                            : "bg-slate-50/50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                        }`}
                      >
                        <span className="line-clamp-1">{line}</span>
                        {subject === line && <Check className="w-3 h-3 text-blue-600 shrink-0 ml-2" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Email Body Textarea */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                  Email Content (Auto-filled based on verified deficits)
                </span>
                <button
                  onClick={() => handleCopyEmail("body")}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  {copiedSection === "body" ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" /> Copied Body
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy Body Only
                    </>
                  )}
                </button>
              </div>

              <textarea
                rows={12}
                value={activeTab === "initial" ? body : followUpBody}
                onChange={(e) => {
                  if (activeTab === "initial") setBody(e.target.value);
                  else setFollowUpBody(e.target.value);
                }}
                className="w-full text-xs font-mono leading-relaxed p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              {/* Quick Insert Snippets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[10px] text-slate-400 font-semibold">Quick insert:</span>
                <button
                  type="button"
                  onClick={() => {
                    const addition = `\n\nInteractive Prototype Link: ${previewUrl}`;
                    if (activeTab === "initial") setBody(prev => prev + addition);
                    else setFollowUpBody(prev => prev + addition);
                  }}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded cursor-pointer"
                >
                  + Prototype Link
                </button>

                {business.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      const addition = `\n\nI can also text the mobile preview to your phone at ${business.phone} if that's more convenient!`;
                      if (activeTab === "initial") setBody(prev => prev + addition);
                      else setFollowUpBody(prev => prev + addition);
                    }}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded cursor-pointer"
                  >
                    + SMS Offer ({business.phone})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Prototype Link Preview Box */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 truncate mr-3">
              <ExternalLink className="w-4 h-4 text-blue-500 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">Interactive Link in Pitch:</span>
              <span className="truncate text-slate-500">{previewUrl}</span>
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:underline shrink-0"
            >
              Test Preview
            </a>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 shrink-0">
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyEmail("full")}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedSection === "full" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied Full Email
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Subject &amp; Body
                </>
              )}
            </button>

            {isDemo ? (
              <button
                disabled
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed flex items-center gap-1.5"
                title="Direct outreach is disabled for synthetic demo accounts to prevent accidental contact."
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-500" /> Outreach Disabled
              </button>
            ) : (
              <a
                href={getMailtoUrl()}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Open default email app with prefilled To, Subject, and Body"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open in Mail App
              </a>
            )}
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleLogAsSent}
              disabled={hasLoggedSent}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5 cursor-pointer disabled:bg-emerald-600"
            >
              {hasLoggedSent ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Logged &amp; Follow-up Scheduled!
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Mark Email Sent (+2d Follow-Up)
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
