import { useState, useEffect } from "react";
import { GeneratedSite, SalesOutreach } from "../types";
import { 
  Copy, Check, MessageSquare, Mail, Phone, Send, Sparkles, Loader2, Info, ArrowLeft, RefreshCw,
  Smartphone, MessageCircle, Linkedin, ChevronRight, Share2, AlertCircle
} from "lucide-react";

interface SalesAssistantProps {
  site: GeneratedSite;
  onBack: () => void;
}

type ChannelType = "whatsapp" | "email" | "sms" | "coldCall" | "followUp" | "linkedin" | "messenger";

export default function SalesAssistant({ site, onBack }: SalesAssistantProps) {
  const [tone, setTone] = useState<string>("Persuasive");
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedSection, setCopiedSection] = useState<string>("");
  const [activeChannel, setActiveChannel] = useState<ChannelType>("whatsapp");
  const [outreach, setOutreach] = useState<SalesOutreach | null>(null);

  const fetchOutreachTemplates = async (selectedTone: string) => {
    setLoading(true);
    try {
      const response = await fetch("/api/generate-sales-copy", {
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
          link: `${window.location.origin}/preview/${site.id}`
        })
      });

      const data = await response.json();
      setOutreach(data);
    } catch (error) {
      console.error("Outreach generation error:", error);
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

  const getWhatsappHref = (msg: string) => {
    return `https://wa.me/${site.phone.replace(/[^0-9+]/g, "")}?text=${encodeURIComponent(msg)}`;
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
    // If we didn't find "Subject:" explicitly, fallback to default or clean it
    if (!foundSubject && emailText) {
      body = emailText;
    }

    return { subject, body };
  };

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
      tip: "Follow up exactly 48 hours later. Re-emphasize that the customized design is already completely built and ready to go live."
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
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-blue-500 fill-blue-500 animate-pulse" /> AI Sales Assistant
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Formulate personalized, high-converting outreach copy across 7 channels for <strong className="text-slate-800 dark:text-slate-200">{site.businessName}</strong>.
          </p>
        </div>

        {/* Tone Selector & Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-xl dark:bg-slate-900/80 border border-slate-200/40 dark:border-slate-800/40">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2">Outreach Tone:</span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              disabled={loading}
              className="rounded-lg bg-white shadow-xs px-3 py-1.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-white border-none focus:outline-none"
            >
              {["Professional", "Friendly", "Premium", "Casual", "Concise", "Persuasive"].map((t) => (
                <option key={t} value={t}>{t} Tone Pitch</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => fetchOutreachTemplates(tone)}
            disabled={loading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-700 text-white dark:text-slate-100 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Regenerate Playbooks
          </button>
        </div>
      </div>

      {loading ? (
        /* Dynamic loading skeleton */
        <div className="min-h-[420px] flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-850">
          <Loader2 className="h-10 w-10 text-blue-500 animate-spin" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-950 dark:text-white">Formulating Tailored Copy...</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Applying <span className="font-extrabold text-blue-500">"{tone}"</span> tone across the messaging framework, mapping localized hooks for {site.businessName} ({site.category} in {site.address}).
            </p>
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
                      <div className="h-7 w-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">W</div>
                      <div className="text-left">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Owner Contact</p>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-300">{site.phone}</p>
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
                      <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-850">
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-450">
                          <span className="w-16 font-bold uppercase tracking-wider">To:</span>
                          <span className="text-slate-800 dark:text-slate-200 font-semibold truncate bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-2 py-0.5 rounded">owner@{site.businessName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com</span>
                        </div>
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-450 border-t border-slate-100 dark:border-slate-800/60 pt-2">
                          <span className="w-16 font-bold uppercase tracking-wider">Subject:</span>
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
                  <div className="flex items-center justify-center py-2">
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

              {/* Action Footer */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0 dark:bg-slate-900 dark:border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div className="text-left w-full sm:w-auto">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Target Destination</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate block max-w-xs">{site.phone || "No contact number recorded"}</span>
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
                    <a
                      href={getWhatsappHref(outreach.whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 text-xs font-bold transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
                    >
                      <Send className="h-3.5 w-3.5 fill-white" /> Open Chat
                    </a>
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
