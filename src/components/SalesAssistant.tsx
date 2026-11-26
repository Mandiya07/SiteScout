import { useState, useEffect } from "react";
import { Business, GeneratedSite, SalesOutreach } from "../types";
import { generateWhatsappLink, normalizePhoneNumber } from "../lib/formatters";
import { extractCleanCity } from "../lib/websiteSchema";
import { authedFetch } from "../lib/firebase";
import { 
  Copy, Check, MessageSquare, Mail, Phone, Send, Sparkles, Loader2, Info, ArrowLeft, RefreshCw,
  Smartphone, MessageCircle, Linkedin, ChevronRight, Share2, AlertCircle, ExternalLink
} from "lucide-react";

interface SalesAssistantProps {
  site: GeneratedSite;
  business?: Business | null;
  onBack: () => void;
  onUpdateSite?: (updated: GeneratedSite) => void;
}

type ChannelType = "whatsapp" | "email" | "sms" | "coldCall" | "followUp" | "linkedin" | "messenger";
type ViewMode = "channels" | "templates";

export default function SalesAssistant({ site, business, onBack, onUpdateSite }: SalesAssistantProps) {
  const [tone, setTone] = useState<string>("Persuasive");
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedSection, setCopiedSection] = useState<string>("");
  const [activeChannel, setActiveChannel] = useState<ChannelType>("whatsapp");
  const [viewMode, setViewMode] = useState<ViewMode>("channels");
  const [outreach, setOutreach] = useState<SalesOutreach | null>(null);
  const [recipientEmail, setRecipientEmail] = useState<string>(site.contactPage?.email || business?.email || "");
  const [recipientPhone, setRecipientPhone] = useState<string>(
    (site.phone && site.phone.toLowerCase() !== "unlisted" ? site.phone : "") ||
    (business?.phone && business.phone.toLowerCase() !== "unlisted" ? business.phone : "")
  );
  const [sendingChannel, setSendingChannel] = useState<null | "email" | "whatsapp" | "sms">(null);
  const [sendFeedback, setSendFeedback] = useState<{ type: "success" | "error"; text: string; handoffUrl?: string; channel?: string } | null>(null);

  useEffect(() => {
    setRecipientEmail(site.contactPage?.email || business?.email || "");
    setRecipientPhone(
      (site.phone && site.phone.toLowerCase() !== "unlisted" ? site.phone : "") ||
      (business?.phone && business.phone.toLowerCase() !== "unlisted" ? business.phone : "")
    );
    setSendFeedback(null);
  }, [site.id, site.contactPage?.email, site.phone, business?.email, business?.phone]);

  const isDemo = business?.evidence?.verificationStatus === "sample_demo" || (site.isDemo === true && site.dataType === "demo" && !recipientEmail);

  const fetchOutreachTemplates = async (selectedTone: string) => {
    setLoading(true);
    const link = `${window.location.origin}/preview/${site.previewToken || site.id}`;
    try {
      const response = await authedFetch("/api/generate-sales-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business: {
            name: site.businessName,
            category: site.category,
            address: site.address,
            phone: site.phone
          },
          tone: selectedTone,
          link: link
        })
      });

      if (!response.ok) {
        throw new Error("Outreach API returned non-200 response");
      }

      const data = await response.json();
      setOutreach(data);
    } catch (error) {
      console.error("Outreach generation error, fallback to client-side custom templates:", error);
      
      const categoryLower = (site.category || "service").toLowerCase();
      const locationCity = site.address ? (site.address.split(",")[1]?.trim() || "local area") : "local area";
      
      // Standalone high-quality multi-channel client template builder matching tone
      const tonePrefix = selectedTone === "Bold" ? "🚀 BOLD PROPOSAL: " : 
                         selectedTone === "Friendly" ? "👋 Quick question for " :
                         selectedTone === "Professional" ? "💼 Business Inquiry: " : "✨ Custom Proposal: ";

      const customTemplates: SalesOutreach = {
        whatsapp: `Hi ${site.businessName} team! 👋\n\nI created a free website preview for your business in ${locationCity}:\n👉 ${link}\n\nIt includes your verified phone number, WhatsApp messaging, and service list.\n\nTake a quick look on your phone or computer. Once you approve it, let's customize and launch it!`,
        
        email: `Subject: ${tonePrefix}Free Website Preview for ${site.businessName}\n\nHi ${site.businessName} Team,\n\nI was reviewing top ${site.category} businesses in ${locationCity} and noticed that you don't have a website listed on Google to capture online search traffic.\n\nI created a free website preview for your business:\n🔗 ${link}\n\nKey features configured for your brand:\n- Instant 1-Click WhatsApp Instant Chat & Phone Hotline\n- Verified Business Truth facts & service catalog\n- Direct Service Request and Enquiry Form\n- Modern Responsive Layout & Trust badges\n\nOnce you review and approve it, let's customize and launch it on your custom domain!\n\nBest regards,\nLocal Digital Development`,
        
        sms: `Hi ${site.businessName}! I created a free website preview for your ${site.category} business to capture more local leads: ${link} - once you check it out, let's customize and launch it!`,
        
        coldCall: `[OPENING LINE]\n"Hi is this the manager or owner at ${site.businessName}? Hi, my name is Alex, I'm a local digital developer. I was actually looking for a ${site.category} in ${locationCity} and noticed your Google listing has great reviews but no website linked.\n\nTo show you what's possible, I created a free website preview for your business. It's completely tailored with your phone number and service menu.\n\nDo you have 2 minutes to open a quick preview link on your phone right now so you can take a look? Once you approve it, let's customize and launch it for you."\n\n[OBJECTION PLAYBOOK]\n- Objection: "We don't need a website."\n- Response: "I completely understand! Many businesses rely on word of mouth. But over 80% of customers search on mobile before calling. Since I already created this free preview, there's zero obligation to view."`,
        
        followUp: `Hi ${site.businessName} Team! 👋 Just checking if you had a moment to check out the free website preview I created for your business: ${link}\n\nOnce you approve it, let's customize and launch it on your domain! Let me know when is best to connect!`,
        
        linkedin: `Hello ${site.businessName} Team,\n\nI hope you're doing well. I noticed your prominent local profile in ${locationCity} and created a free website preview for your business optimized to convert mobile searchers for your ${site.category} services.\n\nYou can view the live preview directly here: ${link}\n\nOnce you review and approve it, let's customize and launch it on your custom domain. Let me know if you are open to a brief chat!`,
        
        messenger: `Hi ${site.businessName}! We love your Google rating and customer reviews. I created a free website preview for your ${site.category} business in ${locationCity} to help you convert search traffic into direct bookings: ${link} Once you check it out and approve it, let's customize and launch it!`
      };

      setOutreach(customTemplates);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutreachTemplates(tone);
  }, [tone]);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(""), 2500);
  };

  const getPreviewUrl = () => {
    return site.previewToken 
      ? `${window.location.origin}/preview/${site.previewToken}` 
      : `${window.location.origin}/preview/${site.id}`;
  };

  const getWhatsappHref = (msg: string) => {
    return generateWhatsappLink(recipientPhone, msg, site.address);
  };

  const triggerSafeHandoff = (url: string, channel: "email" | "whatsapp" | "sms") => {
    if (!url) return;
    if (url.startsWith("mailto:") || url.startsWith("sms:") || url.startsWith("https://wa.me/")) {
      const a = document.createElement("a");
      a.href = url;
      if (channel === "whatsapp") {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleDispatchChannel = async (channel: "email" | "whatsapp" | "sms") => {
    if (!outreach) return;
    const cleanEmail = recipientEmail.trim();
    const cleanPhone = recipientPhone.trim();

    if (channel === "email" && (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail))) {
      setSendFeedback({ type: "error", text: "Please enter a valid recipient email address." });
      return;
    }
    if ((channel === "whatsapp" || channel === "sms") && normalizePhoneNumber(cleanPhone, site.address).length < 7) {
      setSendFeedback({ type: "error", text: "Please enter a valid phone or WhatsApp number." });
      return;
    }

    const emailParsed = parseEmailContent(outreach.email);
    const subject = channel === "email" ? emailParsed.subject : `Free Website Preview for ${site.businessName}`;
    const message = channel === "email" ? emailParsed.body : channel === "whatsapp" ? outreach.whatsapp : outreach.sms;

    setSendingChannel(channel);
    setSendFeedback(null);

    try {
      const res = await authedFetch("/api/send-demo-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: site.id,
          businessId: site.businessId,
          businessName: site.businessName,
          previewUrl: getPreviewUrl(),
          channel,
          recipientEmail: cleanEmail,
          recipientPhone: cleanPhone,
          address: site.address,
          subject,
          message
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Could not send demo website.");
      }

      if (onUpdateSite) {
        onUpdateSite({
          ...site,
          phone: cleanPhone || site.phone,
          salesStatus: "Contacted",
          salesStage: "PREVIEW_SENT",
          contactPage: {
            ...site.contactPage,
            email: cleanEmail || site.contactPage?.email || null
          }
        });
      }

      if (data.deliveryMode === "client_handoff" && data.protocolUrl) {
        triggerSafeHandoff(data.protocolUrl, channel);
        setSendFeedback({
          type: "success",
          text: data.message || `Prepared demo dispatch for ${data.recipient}.`,
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

  // Helper to parse subject and body from the email template
  const parseEmailContent = (emailText: string) => {
    if (!emailText) return { subject: "", body: "" };
    
    const lines = emailText.split("\n");
    let subject = `Growth Strategy for ${site.businessName}`;
    let bodyLines: string[] = [];
    let foundSubject = false;

    for (let line of lines) {
      if (!foundSubject && (line.toLowerCase().startsWith("subject:") || line.toLowerCase().startsWith("subject :"))) {
        subject = line.replace(/^[Ss]ubject\s*:\s*/, "").trim();
        foundSubject = true;
      } else {
        bodyLines.push(line);
      }
    }

    let body = bodyLines.join("\n").trim();
    if (!foundSubject && emailText) {
      body = emailText;
    }

    return { subject, body };
  };

  const city = extractCleanCity(site.address);
  const previewLink = getPreviewUrl();

  const channels: { id: ChannelType; label: string; sub: string; icon: any; color: string; bg: string; border: string; tip: string }[] = [
    {
      id: "whatsapp",
      label: "WhatsApp Pitch",
      sub: "Instant text layout & direct link",
      icon: MessageSquare,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-100 dark:border-emerald-900/30",
      tip: "Include welcoming emojis. Pitching the interactive link directly on WhatsApp has an average open rate of over 95%!"
    },
    {
      id: "email",
      label: "Cold Email Strategy",
      sub: "Structured subject and outreach pitch",
      icon: Mail,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-100 dark:border-blue-900/30",
      tip: "Customize the subject line with a local hook. Be sure to link directly to their interactive proposal."
    },
    {
      id: "sms",
      label: "SMS Mobile Blast",
      sub: "Ultra-concise text with active URL",
      icon: Smartphone,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950/30",
      border: "border-purple-100 dark:border-purple-900/30",
      tip: "Keep characters under 160. Make sure the call-to-action link is placed near the end of the text message."
    },
    {
      id: "coldCall",
      label: "Cold Call Playbook",
      sub: "Opening line & objection playbook",
      icon: Phone,
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
      border: "border-indigo-100 dark:border-indigo-900/30",
      tip: "Lead with curiosity. Ask them to load their customized layout during the call so they see their brand in real-time."
    },
    {
      id: "followUp",
      label: "Follow-up Check-in",
      sub: "Gentle reminder to keep momentum",
      icon: RefreshCw,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-100 dark:border-amber-900/30",
      tip: "Follow up exactly 48 hours later. Re-emphasize that the free website preview is ready to review, and once approved, you can customize and launch it for them."
    },
    {
      id: "linkedin",
      label: "LinkedIn B2B Pitch",
      sub: "Professional networking outreach",
      icon: Linkedin,
      color: "text-sky-700 dark:text-sky-400",
      bg: "bg-sky-50 dark:bg-sky-950/30",
      border: "border-sky-100 dark:border-sky-900/30",
      tip: "Use this on their personal LinkedIn page or business profile. Keep it professional, focus on local partnership and digital growth."
    },
    {
      id: "messenger",
      label: "Facebook Messenger",
      sub: "Friendly local business chat text",
      icon: MessageCircle,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-50 dark:bg-cyan-950/30",
      border: "border-cyan-100 dark:border-cyan-900/30",
      tip: "Perfect for local businesses active on Facebook. Compliment their Google page rating to open the conversation."
    }
  ];

  const missingWebsiteTemplates = [
    {
      id: "t1",
      title: "The Missing Website Opportunity (Direct & Professional)",
      target: "Email / LinkedIn",
      subject: `Quick question regarding ${site.businessName}'s online visibility in ${city}`,
      body: `Hi ${site.businessName} Team,\n\nI was reviewing top ${site.category} providers in ${city} and noticed your business has fantastic local reputation, but currently lacks an optimized mobile website to capture searchers on Google Maps.\n\nTo demonstrate what's possible, I put together a fully functional, mobile-optimized website preview tailored specifically for ${site.businessName}:\n🔗 ${previewLink}\n\nKey findings & features configured for your brand:\n- Instant 1-Click WhatsApp Chat & direct phone hotline\n- Professional service catalog & transparent pricing\n- Clean mobile layout optimized for local leads\n\nTake a quick look whenever you have 2 minutes. Once you review and approve it, let's customize and launch it on your domain!\n\nBest regards,\nLocal Digital Development`
    },
    {
      id: "t2",
      title: "The Mobile Searcher & Competitor Loss Angle",
      target: "Cold Email / SMS",
      subject: `Are local ${city} clients finding ${site.businessName} online?`,
      body: `Hi ${site.businessName} Management,\n\nOver 80% of customers looking for ${site.category} in ${city} search on their smartphones before making a call. Without a dedicated website, those high-intent clients often bounce to competing listings.\n\nI built a professional, zero-friction website preview for ${site.businessName} so you can capture those leads immediately:\n👉 ${previewLink}\n\nHave a look on your phone. If you like the layout, just click 'Approve' or reply here and we'll get it live for you!\n\nBest,\nDigital Growth Team`
    },
    {
      id: "t3",
      title: "The Show-Don't-Tell Free Prototype Showcase",
      target: "All Channels",
      subject: `We built a website preview for ${site.businessName} (${city})`,
      body: `Hi ${site.businessName},\n\nInstead of just pitching our services, we decided to show you. We went ahead and built a custom, high-speed website prototype for your ${site.category} business:\n🔗 ${previewLink}\n\nHighlights configured for your team:\n- Instant appointment & quote request form\n- Integrated Google Maps directions and hours\n- 1-Click WhatsApp customer concierge\n\nTake a look and let me know your thoughts. Once approved, we can launch it right away!\n\nWarmly,\nLocal Partner`
    }
  ];

  return (
    <div className="space-y-6 text-left">
      {/* Upper navigation header */}
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between border-b border-slate-100 pb-5 dark:border-slate-800 gap-4">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Presentation Workspace
          </button>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-blue-500 fill-blue-500 animate-pulse" /> AI Sales Assistant &amp; Outreach
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Formulate personalized outreach across multi-channel playbooks or pre-written website deficit scripts for <strong className="text-slate-800 dark:text-slate-200">{site.businessName}</strong>.
          </p>
        </div>

        {/* View Mode & Tone Selector Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode("channels")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "channels" ? "bg-white text-blue-600 shadow-xs dark:bg-slate-800 dark:text-blue-400" : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Multi-Channel Playbooks
            </button>
            <button
              onClick={() => setViewMode("templates")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "templates" ? "bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400" : "text-slate-600 dark:text-slate-400"
              }`}
            >
              Website Deficit Cold Email Library ({missingWebsiteTemplates.length})
            </button>
          </div>

          {viewMode === "channels" && (
            <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl dark:bg-slate-900/80 border border-slate-200/40 dark:border-slate-800/40">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">Tone:</span>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                disabled={loading}
                className="rounded-lg bg-white shadow-xs px-3 py-1.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white border-none focus:outline-none"
              >
                {["Professional", "Friendly", "Premium", "Casual", "Concise", "Persuasive"].map((t) => (
                  <option key={t} value={t}>{t} Tone</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Demo Sandbox Alert Banner */}
      {isDemo && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-left">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
            <strong className="font-bold">Sandbox Demonstration Prototype:</strong> This sales playbook is for a simulated test business (<span className="font-mono">{site.phone}</span>). Live outbound WhatsApp dispatch is locked to prevent contacting fictitious numbers. Copying and practicing playbook scripts are fully active.
          </div>
        </div>
      )}

      {/* Consultative Golden Rule Card */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-slate-50 p-4 dark:border-blue-900/40 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/60 px-2 py-0.5 rounded-md">
                  Consultative Outreach Rule
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Open a conversation, not a pitch
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Never ask: <span className="line-through text-red-500 font-medium">"Do you need a website?"</span>. Instead say: <span className="font-bold text-slate-900 dark:text-white bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded">"I noticed something about your online presence and I think I can help you improve it."</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const hook = `Hi! I noticed something specific about ${site.businessName}'s online presence in ${site.address} and thought I could help you improve it. I put together a live interactive preview customized for your business: ${getPreviewUrl()}`;
              handleCopy(hook, "rule_hook");
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-2xs cursor-pointer"
          >
            {copiedSection === "rule_hook" ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-slate-500" />}
            {copiedSection === "rule_hook" ? "Copied Hook!" : "Copy 'I Noticed...' Hook"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="min-h-[420px] flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-950 dark:text-white">Formulating Tailored Copy...</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Applying <span className="font-extrabold text-blue-500">"{tone}"</span> tone across the messaging framework, mapping localized hooks for {site.businessName} ({site.category} in {site.address}).
            </p>
          </div>
        </div>
      ) : viewMode === "templates" ? (
        /* Website Deficit Cold Email Library */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed text-left">
              <strong className="font-bold">Website Deficit Cold Email Library:</strong> These pre-written scripts are specifically tailored for business owners who currently lack a website. Each template dynamically incorporates <strong className="font-mono">{site.businessName}</strong>, location ({city}), category ({site.category}), and your custom live preview link.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {missingWebsiteTemplates.map((tpl) => {
              const isCopied = copiedSection === tpl.id;
              return (
                <div key={tpl.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 text-left shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded">
                        {tpl.target}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {tpl.title}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleCopy(`Subject: ${tpl.subject}\n\n${tpl.body}`, tpl.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer shrink-0"
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{isCopied ? "Copied Script!" : "Copy Full Script"}</span>
                    </button>
                  </div>

                  <div className="space-y-2 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-150 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200">
                    <div className="border-b border-slate-200 dark:border-slate-800 pb-2 text-slate-500 dark:text-slate-400 font-sans">
                      <strong className="text-slate-900 dark:text-white">Subject:</strong> {tpl.subject}
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed pt-1 font-sans text-xs">
                      {tpl.body}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Master outreach dashboard */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Channels master directory */}
          <div className="lg:col-span-5 space-y-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">Available Channels ({channels.length})</span>
            <div className="space-y-2 bg-slate-50/50 dark:bg-slate-950/20 p-2 rounded-2xl border border-slate-100 dark:border-slate-850">
              {channels.map((chan) => {
                const Icon = chan.icon;
                const isActive = activeChannel === chan.id;
                return (
                  <button
                    key={chan.id}
                    onClick={() => setActiveChannel(chan.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isActive 
                        ? "bg-white border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-md ring-2 ring-blue-500/10" 
                        : "bg-transparent border-transparent hover:bg-white/40 dark:hover:bg-slate-900/40"
                    }`}
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${chan.bg} ${chan.border} ${chan.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className={`text-xs font-bold ${isActive ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-350"}`}>
                          {chan.label}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                          {chan.sub}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? "text-slate-700 dark:text-white translate-x-0.5" : "text-slate-350"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel: Active live preview display */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[520px] dark:bg-slate-900 dark:border-slate-850">
              
              {/* Header simulator bar */}
              <div className="h-12 bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between shrink-0 dark:bg-slate-950 dark:border-slate-850">
                <div className="flex items-center space-x-2">
                  <div className={`h-3 w-3 rounded-full ${
                    activeChannel === "whatsapp" ? "bg-emerald-500" :
                    activeChannel === "email" ? "bg-blue-500" :
                    activeChannel === "sms" ? "bg-purple-500" :
                    activeChannel === "coldCall" ? "bg-indigo-500" :
                    activeChannel === "followUp" ? "bg-amber-500" :
                    activeChannel === "linkedin" ? "bg-sky-600" : "bg-cyan-500"
                  }`} />
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    {channels.find(c => c.id === activeChannel)?.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded dark:bg-emerald-950/40 dark:text-emerald-400 uppercase tracking-wide flex items-center gap-1 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Pitch Prepared
                  </span>
                </div>
              </div>

              {/* Dynamic Interactive Channel Simulator Screens */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                
                {/* 1. WHATSAPP STYLE THREAD */}
                {activeChannel === "whatsapp" && outreach && (
                  <div className="space-y-3 font-sans">
                    <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                      <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">W</div>
                      <div className="text-left flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Target Owner WhatsApp Number</label>
                        <input
                          type="tel"
                          value={recipientPhone}
                          onChange={(e) => setRecipientPhone(e.target.value)}
                          placeholder="+268 7600 0000"
                          className="w-full text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-[#efeae2] dark:bg-[#0b141a] rounded-2xl p-4 min-h-[180px] border border-slate-200 dark:border-slate-850 relative flex flex-col justify-end">
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#8696a0] bg-white dark:bg-[#1f2c34] px-2 py-0.5 rounded-md shadow-xs">
                        TODAY
                      </div>
                      <div className="max-w-[85%] self-end bg-[#d9fdd3] dark:bg-[#005c4b] text-slate-800 dark:text-slate-100 rounded-xl rounded-tr-none p-3 shadow-xs text-xs whitespace-pre-wrap text-left relative mt-4">
                        {outreach.whatsapp}
                        <div className="text-[9px] text-[#667781] dark:text-[#a6b1b5] text-right mt-1.5">
                          11:34 AM ✓✓
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. EMAIL SIMULATOR COMPOSER */}
                {activeChannel === "email" && outreach && (() => {
                  const emailDetails = parseEmailContent(outreach.email);
                  return (
                    <div className="space-y-3 font-sans">
                      {/* Email Header Panel */}
                      <div className="space-y-2 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-850">
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-450 gap-2">
                          <span className="w-16 font-bold uppercase tracking-wider shrink-0">To:</span>
                          <input
                            type="email"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="Enter business email address..."
                            aria-label="Recipient Business Email"
                            className="flex-1 text-slate-800 dark:text-slate-200 font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-450 border-t border-slate-100 dark:border-slate-800/60 pt-2 gap-2">
                          <span className="w-16 font-bold uppercase tracking-wider shrink-0">Subject:</span>
                          <span className="text-slate-900 dark:text-slate-100 font-extrabold truncate">{emailDetails.subject}</span>
                        </div>
                      </div>
                      
                      {/* Email Body Panel */}
                      <div className="bg-slate-50/20 border border-slate-150 rounded-xl p-4 text-xs text-slate-700 dark:text-slate-300 dark:bg-slate-950/20 dark:border-slate-850 max-h-[220px] overflow-y-auto leading-relaxed whitespace-pre-wrap text-left">
                        {emailDetails.body}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. SMS SMARTPHONE SCREEN */}
                {activeChannel === "sms" && outreach && (
                  <div className="space-y-3 flex flex-col items-center py-2">
                    <div className="w-full max-w-[300px] bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-left">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Recipient SMS Number</label>
                      <input
                        type="tel"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        placeholder="+268 7600 0000"
                        className="w-full text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="w-[300px] bg-slate-100 dark:bg-slate-950 rounded-3xl p-3 border border-slate-200 dark:border-slate-800 shadow-md">
                      <div className="h-5 flex items-center justify-between text-[9px] text-slate-400 font-mono px-2 mb-1">
                        <span>12:00 PM</span>
                        <span className="font-bold">LTE 🔋</span>
                      </div>
                      
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-2.5 min-h-[140px] flex flex-col justify-end border border-slate-200 dark:border-slate-800">
                        <div className="self-start bg-[#e9e9eb] dark:bg-[#262629] text-slate-800 dark:text-slate-200 rounded-2xl rounded-tl-none p-3 text-[11px] leading-relaxed max-w-[90%] text-left">
                          {outreach.sms}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. COLD CALL SCRIPT PLAYBOOK */}
                {activeChannel === "coldCall" && outreach && (
                  <div className="space-y-3 font-sans">
                    <div className="bg-indigo-50/30 border border-indigo-100 p-3 rounded-xl dark:bg-indigo-950/20 dark:border-indigo-900/30 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2">
                      <Info className="h-4 w-4 shrink-0 mt-0.5 animate-bounce" />
                      <p className="leading-relaxed font-semibold">
                        Owner Contact Number: <strong className="font-mono text-indigo-900 dark:text-indigo-200">{site.phone}</strong>
                      </p>
                    </div>
                    
                    <div className="rounded-xl border border-slate-150 p-4 text-xs text-slate-700 dark:text-slate-300 bg-slate-50/30 dark:bg-slate-950/10 dark:border-slate-850 max-h-[240px] overflow-y-auto leading-relaxed whitespace-pre-wrap text-left">
                      {outreach.coldCall}
                    </div>
                  </div>
                )}

                {/* 5. FOLLOW-UP CHECK-IN */}
                {activeChannel === "followUp" && outreach && (
                  <div className="space-y-3 font-sans">
                    <div className="flex items-center space-x-2 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-100 dark:border-amber-900/30">
                      <RefreshCw className="h-4 w-4 text-amber-500 shrink-0" />
                      <span className="text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Suggested: Send exactly 48 Hours after initial contact</span>
                    </div>
                    <div className="rounded-xl border border-slate-150 p-4 text-xs text-slate-700 dark:text-slate-300 bg-slate-50/30 dark:bg-slate-950/10 dark:border-slate-850 min-h-[160px] max-h-[220px] overflow-y-auto leading-relaxed whitespace-pre-wrap text-left">
                      {outreach.followUp}
                    </div>
                  </div>
                )}

                {/* 6. LINKEDIN B2B DIRECT */}
                {activeChannel === "linkedin" && outreach && (
                  <div className="space-y-3 font-sans">
                    <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                      <div className="h-7 w-7 rounded-sm bg-sky-700 text-white flex items-center justify-center font-bold text-xs font-serif">in</div>
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">LinkedIn Prospect Profile</p>
                        <p className="text-xs font-bold text-slate-850 dark:text-slate-300">Decision Maker at {site.businessName}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-150 p-4 text-xs text-slate-700 dark:text-slate-300 bg-slate-50/30 dark:bg-slate-950/10 dark:border-slate-850 min-h-[160px] max-h-[220px] overflow-y-auto leading-relaxed whitespace-pre-wrap text-left">
                      {outreach.linkedin}
                    </div>
                  </div>
                )}

                {/* 7. FACEBOOK MESSENGER */}
                {activeChannel === "messenger" && outreach && (
                  <div className="space-y-3 font-sans">
                    <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                      <MessageCircle className="h-5 w-5 text-cyan-500 shrink-0" />
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Facebook Page</p>
                        <p className="text-xs font-bold text-slate-850 dark:text-slate-300">{site.businessName} Page Inbox</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-[#0084ff]/10 p-4 text-xs text-slate-750 dark:text-slate-300 bg-[#0084ff]/5 dark:bg-[#0084ff]/5 dark:border-slate-850 min-h-[160px] max-h-[220px] overflow-y-auto leading-relaxed whitespace-pre-wrap text-left">
                      {outreach.messenger}
                    </div>
                  </div>
                )}

              </div>

              {/* Coaching Tip Banner */}
              <div className="px-5 py-3 bg-slate-50 border-t border-b border-slate-200 dark:bg-slate-950 dark:border-slate-850 flex items-start gap-2 text-left">
                <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  <strong>Strategist Coaching:</strong> {channels.find(c => c.id === activeChannel)?.tip}
                </p>
              </div>

              {sendFeedback && (
                <div
                  className={`px-4 py-2.5 border-t text-xs flex flex-wrap items-center justify-between gap-2 ${
                    sendFeedback.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-200"
                      : "bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-900/50 dark:text-rose-200"
                  }`}
                >
                  <span className="font-medium">{sendFeedback.text}</span>
                  {sendFeedback.handoffUrl && (
                    <a
                      href={sendFeedback.handoffUrl}
                      target={sendFeedback.channel === "whatsapp" ? "_blank" : undefined}
                      rel={sendFeedback.channel === "whatsapp" ? "noopener noreferrer" : undefined}
                      className="inline-flex items-center gap-1 font-bold underline shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {sendFeedback.channel === "email" ? "Open Email App" : sendFeedback.channel === "whatsapp" ? "Open WhatsApp" : "Open SMS App"}
                    </a>
                  )}
                </div>
              )}

              {/* Action Footer */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0 dark:bg-slate-900 dark:border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="text-left w-full sm:w-auto">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Target Destination</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate block max-w-xs">
                    {activeChannel === "email"
                      ? (recipientEmail || "No email provided yet")
                      : (recipientPhone || "No contact number recorded")}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  {outreach && (
                    <button
                      onClick={() => handleCopy(outreach[activeChannel], activeChannel)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      {copiedSection === activeChannel ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied to Clipboard
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy Pitch Copy
                        </>
                      )}
                    </button>
                  )}
                  
                  {activeChannel === "whatsapp" && outreach && (
                    isDemo ? (
                      <button
                        type="button"
                        disabled
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-300 px-4 py-2.5 text-xs font-bold cursor-not-allowed"
                        title="Live WhatsApp outreach is locked for simulated demonstration data"
                      >
                        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                        <span>Locked: Demo Data</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDispatchChannel("whatsapp")}
                        disabled={sendingChannel !== null}
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                      >
                        {sendingChannel === "whatsapp" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5 fill-white" />
                        )}
                        {sendingChannel === "whatsapp" ? "Preparing..." : "Send via WhatsApp"}
                      </button>
                    )
                  )}

                  {activeChannel === "email" && outreach && (
                    <button
                      type="button"
                      onClick={() => handleDispatchChannel("email")}
                      disabled={sendingChannel !== null}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      {sendingChannel === "email" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Mail className="h-3.5 w-3.5" />
                      )}
                      {sendingChannel === "email" ? "Sending..." : "Send Demo Email"}
                    </button>
                  )}

                  {activeChannel === "sms" && outreach && (
                    <button
                      type="button"
                      onClick={() => handleDispatchChannel("sms")}
                      disabled={sendingChannel !== null}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-purple-500/10 cursor-pointer"
                    >
                      {sendingChannel === "sms" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Smartphone className="h-3.5 w-3.5" />
                      )}
                      {sendingChannel === "sms" ? "Preparing..." : "Send via SMS"}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
