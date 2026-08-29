import { useState } from "react";
import { 
  Users, Handshake, DollarSign, FileText, Search, Sparkles, 
  Copy, Check, ArrowRight, TrendingUp, ShieldCheck, 
  Layers, ChevronRight, Calculator, Building2, PhoneCall,
  Mail, MessageSquare, Percent, ExternalLink, Plus, Trash2,
  Briefcase, Palette, Camera, Printer, Signpost, Share2, 
  Cpu, Megaphone, Calendar, BookmarkCheck
} from "lucide-react";
import { PartnerNiche, PartnerDeal, SearchFilters } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface PartnerEcosystemProps {
  onFindPartners: (filters: SearchFilters) => void;
  onOpenWebsiteGenerator?: () => void;
}

export const PARTNER_NICHES: PartnerNiche[] = [
  {
    id: "graphic-designers",
    name: "Graphic Designers",
    icon: "🎨",
    tagline: "Their logo & branding clients immediately need a live website.",
    whyTheyNeedUs: "Designers spend hours making logos, business cards, and vector assets. When their client asks 'Can you build my website too?', they often lose the job or refer it away for free because they don't code.",
    averageClientNeed: "Converting Figma/vector brand files into a responsive, high-converting live website with domain and hosting.",
    pitchHook: "You design the brand. We build the fast, responsive tech under your agency brand. You keep 50% of the revenue without touching a line of code.",
    typicalTicketSize: "$800 - $3,500",
    suggestedSplit: "50% Partner / 50% Tech",
    searchQuery: "Graphic Designers & Design Studios"
  },
  {
    id: "photographers",
    name: "Photographers",
    icon: "📸",
    tagline: "Commercial, wedding & corporate clients need portfolio showcases.",
    whyTheyNeedUs: "Photographers shoot high-res photos for hotels, restaurants, lodges, and weddings. The client receives 200 raw photos on a Google Drive and has nowhere professional to display them online.",
    averageClientNeed: "Interactive photo portfolios, restaurant menus with photo galleries, or booking and gallery delivery portals.",
    pitchHook: "Every client hiring you for a photoshoot needs a high-end website to display those photos. Let's bundle a website into your photography packages.",
    typicalTicketSize: "$600 - $2,500",
    suggestedSplit: "40% Partner / 60% Tech",
    searchQuery: "Photographers & Photography Studios"
  },
  {
    id: "accountants",
    name: "Accountants & Bookkeepers",
    icon: "📊",
    tagline: "They register new businesses every week who have zero online presence.",
    whyTheyNeedUs: "Accountants incorporate brand-new companies, file tax papers, and register business names. Every new registered company is a brand-new prospect with zero digital footprint.",
    averageClientNeed: "Professional corporate website, business email addresses, and invoicing/payment request forms.",
    pitchHook: "When you incorporate a new company for a client, offer them the 'Complete Business Launch' bundle with an instant website. We do 100% of the build.",
    typicalTicketSize: "$1,000 - $4,000",
    suggestedSplit: "30% Partner / 70% Tech + 20% Recurring Retainer",
    searchQuery: "Accountants & Tax Advisors"
  },
  {
    id: "printers",
    name: "Printers & Print Shops",
    icon: "🖨️",
    tagline: "Customers ordering business cards and flyers need a website link.",
    whyTheyNeedUs: "Thousands of small businesses walk into print shops ordering flyers, vehicle magnets, brochures, and stationery. Print shops print the flyer, but have no web division.",
    averageClientNeed: "Fast mobile landing page matching the print campaign with a QR code link.",
    pitchHook: "When customers print business cards or flyers, offer to build their digital landing page and QR code. You upsell the order with zero overhead.",
    typicalTicketSize: "$500 - $1,800",
    suggestedSplit: "40% Partner / 60% Tech",
    searchQuery: "Commercial Printers & Print Shops"
  },
  {
    id: "sign-companies",
    name: "Sign Companies & Billboards",
    icon: "🪧",
    tagline: "Clients buying physical storefront signage need online traffic capture.",
    whyTheyNeedUs: "Businesses investing $2,000+ in physical storefront signage or roadside billboards need somewhere for drive-by customers to find their catalog and contact info online.",
    averageClientNeed: "Local SEO landing pages, Google Maps optimization, and mobile-friendly quote forms.",
    pitchHook: "Your signage brings physical foot traffic. Our websites capture the digital searchers. Let's partner to offer total brand visibility packages.",
    typicalTicketSize: "$900 - $3,000",
    suggestedSplit: "50% Partner / 50% Tech",
    searchQuery: "Sign Companies & Outdoor Advertising"
  },
  {
    id: "social-media-managers",
    name: "Social Media Managers",
    icon: "📱",
    tagline: "They run Instagram/TikTok ads for clients with nowhere to send the clicks.",
    whyTheyNeedUs: "SMMs generate great engagement on Instagram, Facebook, and TikTok, but the client's link-in-bio is broken or leads to a blank page. Without a website, ad conversion drops.",
    averageClientNeed: "High-converting sales funnels, link-in-bio microsites, WhatsApp CTA landing pages, and lead capture forms.",
    pitchHook: "You create great content and run the ads. We build the fast conversion pages so your clients get 3x more sales. You white-label our tech as your own.",
    typicalTicketSize: "$700 - $2,800",
    suggestedSplit: "50% Partner / 50% Tech",
    searchQuery: "Social Media Managers & Agencies"
  },
  {
    id: "it-technicians",
    name: "IT Technicians & MSPs",
    icon: "💻",
    tagline: "They manage computers and networks, but clients ask for web development.",
    whyTheyNeedUs: "IT techs fix hardware, set up corporate routers, and install antivirus software. When the client CEO asks 'Can you also fix/build our company website?', IT guys don't have time to design.",
    averageClientNeed: "Corporate websites, domain DNS management, SSL certificates, and Microsoft 365 / Google Workspace web integrations.",
    pitchHook: "When your IT clients ask for website updates or new builds, don't say no. White-label our team to deliver 48-hour turnarounds while you profit.",
    typicalTicketSize: "$1,200 - $5,000",
    suggestedSplit: "35% Partner / 65% Tech",
    searchQuery: "IT Support & Computer Services"
  },
  {
    id: "marketing-agencies",
    name: "Marketing Agencies",
    icon: "🚀",
    tagline: "Agencies wanting to offer web dev without hiring costly in-house engineers.",
    whyTheyNeedUs: "Marketing agencies focus on SEO, PR, copy, or media buying. Hiring full-time frontend developers and web designers is expensive overhead. A white-label partner solves their capacity.",
    averageClientNeed: "Full-scale custom website production, ongoing client maintenance retainers, and white-labeled client portals.",
    pitchHook: "Scale your agency's web production capacity instantly. We act as your invisible backend dev team. You quote the client at agency rates and keep healthy margins.",
    typicalTicketSize: "$1,500 - $6,000+",
    suggestedSplit: "50% Partner / 50% Tech",
    searchQuery: "Marketing Agencies & PR Firms"
  },
  {
    id: "event-planners",
    name: "Event Planners & Coordinators",
    icon: "🎪",
    tagline: "Conferences, weddings, and corporate expos require dedicated event portals.",
    whyTheyNeedUs: "Event planners coordinate major galas, conferences, wedding weekends, and exhibitions. Every large event needs an agenda, ticket sales, speaker bios, and RSVP forms.",
    averageClientNeed: "Event microsites, countdown timers, RSVP ticketing forms, map directions, and sponsor logo showcases.",
    pitchHook: "Every bride, festival organizer, and corporate conference host needs an event website. Add high-margin digital invitations and RSVP portals to your packages.",
    typicalTicketSize: "$600 - $2,200",
    suggestedSplit: "40% Partner / 60% Tech",
    searchQuery: "Event Planners & Coordinators"
  },
  {
    id: "branding-companies",
    name: "Branding Companies",
    icon: "✨",
    tagline: "They build brand identities, color guides, and guidelines that need a web home.",
    whyTheyNeedUs: "Branding agencies deliver 40-page brand guidelines and design systems. The natural final deliverable is bringing that brand to life on a live website.",
    averageClientNeed: "Pixel-perfect interactive websites with custom animations, custom typography, and digital product catalogues.",
    pitchHook: "Complete your branding packages with a live digital execution. We translate your brand books into live websites with zero friction.",
    typicalTicketSize: "$1,200 - $4,500",
    suggestedSplit: "50% Partner / 50% Tech",
    searchQuery: "Branding Agencies & Creative Studios"
  }
];

export default function PartnerEcosystem({ onFindPartners, onOpenWebsiteGenerator }: PartnerEcosystemProps) {
  const [activeSubTab, setActiveSubTab] = useState<"niches" | "scripts" | "calculator" | "agreement" | "pipeline">("niches");
  const [selectedNiche, setSelectedNiche] = useState<PartnerNiche>(PARTNER_NICHES[0]);
  const [pitchTone, setPitchTone] = useState<"win-win" | "executive" | "casual" | "revenue">("win-win");
  const [copiedPitch, setCopiedPitch] = useState<string | null>(null);

  // Revenue Calculator States
  const [avgDealSize, setAvgDealSize] = useState<number>(1200);
  const [referralsPerMonth, setReferralsPerMonth] = useState<number>(4);
  const [partnerSplitPercent, setPartnerSplitPercent] = useState<number>(50);
  const [monthlyRetainer, setMonthlyRetainer] = useState<number>(50);
  const [retainerSharePercent, setRetainerSharePercent] = useState<number>(30);

  // Partner Pipeline Deals State
  const [deals, setDeals] = useState<PartnerDeal[]>([
    {
      id: "deal-1",
      partnerName: "Apex Creative Design Studio",
      partnerType: "Graphic Designers",
      partnerEmail: "hello@apexcreativedesign.com",
      partnerPhone: "+268 76 44 1928",
      status: "Active Partner",
      splitPercentage: 50,
      referredClientCount: 3,
      totalRevenueGenerated: 3600,
      notes: "Sends logo redesign clients for instant website build."
    },
    {
      id: "deal-2",
      partnerName: "Highveld Print & Signage Co.",
      partnerType: "Printers & Print Shops",
      partnerEmail: "orders@highveldprint.com",
      partnerPhone: "+268 76 82 3341",
      status: "Agreement Signed",
      splitPercentage: 40,
      referredClientCount: 1,
      totalRevenueGenerated: 950,
      notes: "Promoting QR website package on business card orders."
    },
    {
      id: "deal-3",
      partnerName: "Summit Accounting & Tax Advisory",
      partnerType: "Accountants & Bookkeepers",
      partnerEmail: "info@summitaccounting.co.sz",
      partnerPhone: "+268 76 91 4455",
      status: "Pitch Sent",
      splitPercentage: 35,
      referredClientCount: 0,
      totalRevenueGenerated: 0,
      notes: "Follow-up scheduled for Friday regarding company registration bundle."
    }
  ]);

  const [newPartnerModal, setNewPartnerModal] = useState<boolean>(false);
  const [newPartnerName, setNewPartnerName] = useState("");
  const [newPartnerType, setNewPartnerType] = useState(PARTNER_NICHES[0].name);
  const [newPartnerEmail, setNewPartnerEmail] = useState("");
  const [newPartnerPhone, setNewPartnerPhone] = useState("");
  const [newPartnerSplit, setNewPartnerSplit] = useState(50);
  const [newPartnerNotes, setNewPartnerNotes] = useState("");

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch(key);
    setTimeout(() => setCopiedPitch(null), 2000);
  };

  // Calculations for Revenue Share Calculator
  const monthlyGrossRevenue = avgDealSize * referralsPerMonth;
  const partnerMonthlyCut = (monthlyGrossRevenue * (partnerSplitPercent / 100));
  const yourMonthlyCut = monthlyGrossRevenue - partnerMonthlyCut;
  const annualGrossRevenue = monthlyGrossRevenue * 12;
  const annualYourCut = yourMonthlyCut * 12;
  const annualPartnerCut = partnerMonthlyCut * 12;
  
  // Cumulative recurring retainer over 12 months (assuming all clients stay)
  // Month 1: N clients, Month 2: 2N clients... Average across year = 6.5 * N * retainer
  const annualRetainerPool = referralsPerMonth * monthlyRetainer * 78; // sum of 1..12 is 78
  const yourAnnualRetainerCut = annualRetainerPool * (1 - retainerSharePercent / 100);

  // Generate dynamic outreach pitches based on selected niche and tone
  const getOutreachScripts = (niche: PartnerNiche, tone: string) => {
    const isWinWin = tone === "win-win";
    const isExecutive = tone === "executive";
    const isRevenue = tone === "revenue";

    let emailSubject = `Partnership idea: White-label website tech for ${niche.name.toLowerCase()}`;
    let emailOpening = `Hi there,\n\nI love the work you do at your studio. As leading ${niche.name.toLowerCase()}, your clients trust you with their core brand and visuals.`;
    let emailBody = `When your clients ask "Can you build our website too?", you either have to turn down the business, deal with complex code, or refer it away without making profit.\n\nWe would love to act as your invisible white-label technology partner:\n• You bring the client & brand vision\n• We build the fast, modern, mobile-optimized website in 48 hours\n• You deliver it under your agency brand\n• We split the revenue 50/50`;
    let emailClosing = `Would you be open to a quick 5-minute chat this week to see how we can add $3,000+/mo in zero-overhead website revenue to your business?\n\nBest regards,\n[Your Name]\nTechnology Partner Lead`;

    let whatsapp = `Hi! 👋 I came across your work in ${niche.name.toLowerCase()} and love your portfolio. We partner with top ${niche.name.toLowerCase()} as their invisible white-label web development team. Whenever your clients need a website, we build the technology under your brand and split the revenue 50/50 with zero tech headaches for you. Would you be open to seeing a quick example of how it works?`;

    let phoneScript = `[Opening]\n"Hi, is this the owner/lead at [Partner Business]? My name is [Your Name]."\n\n[The Hook]\n"I'm reaching out because we specialize in white-label web technology specifically for ${niche.name.toLowerCase()} in our region."\n\n[The Value Proposition]\n"Most ${niche.name.toLowerCase()} we speak with tell us that their clients constantly ask for websites, but handling coding, hosting, and bug fixes is a headache. We become your invisible tech arm—you bring the client, we build the entire website in 48 hours under your brand, and we split the revenue 50/50."\n\n[Call to Action]\n"If I send over a quick 1-page overview and an interactive sample via WhatsApp or email, would you be open to checking it out?"`;

    let agreementText = `WHITE-LABEL STRATEGIC TECHNOLOGY PARTNERSHIP AGREEMENT

BETWEEN:
[Your Agency Name] ("Technology Partner")
AND
[Partner Company Name] ("Channel Partner - ${niche.name}")

1. PURPOSE & SCOPE
Channel Partner frequently provides services to clients who require custom digital websites, domain hosting, and mobile optimization. Technology Partner agrees to provide turnkey, white-label design, development, and hosting fulfillment.

2. WHITE-LABEL GUARANTEE
All deliverables will be delivered under Channel Partner's branding. Technology Partner shall remain invisible to the end client unless mutually agreed upon in writing.

3. REVENUE SPLIT & COMPENSATION
• Project Fee: All client website build fees shall be split ${partnerSplitPercent}% to Channel Partner and ${100 - partnerSplitPercent}% to Technology Partner.
• Monthly Retainers: Ongoing hosting & maintenance retainers ($${monthlyRetainer}/month/client) shall be split ${retainerSharePercent}% to Channel Partner and ${100 - retainerSharePercent}% to Technology Partner.
• Payout Schedule: Payouts to Channel Partner shall be disbursed within 5 business days of client milestone completion.

4. TURNAROUND COMMITMENT (SLA)
Technology Partner commits to delivering a functional interactive website draft within 48 to 72 business hours of receiving client assets.

5. NON-SOLICITATION & INTEGRITY
Technology Partner covenants that it shall never solicit Channel Partner's clients directly for separate non-partnered services.

EXECUTED THIS DAY: ___________________
TECHNOLOGY PARTNER: ___________________
CHANNEL PARTNER: ___________________`;

    if (isExecutive) {
      emailSubject = `Strategic White-Label Agency Collaboration: ${niche.name}`;
      emailOpening = `Dear Managing Director,\n\nI am writing to propose a strategic channel collaboration between our digital engineering team and your firm.`;
      emailBody = `As an established firm in ${niche.name.toLowerCase()}, your client base represents prime demand for enterprise-grade digital web assets. Our organization functions as a dedicated, white-label technology fulfillment center.\n\nKey Strategic Benefits:\n• Immediate expansion of your service capabilities without capital expenditure or developer salaries\n• Turnkey 48-hour prototype turnaround\n• Transparent margin sharing (${partnerSplitPercent}/${100 - partnerSplitPercent} revenue split)`;
    } else if (isRevenue) {
      emailSubject = `Add $3,000-$10,000/mo in zero-overhead website revenue to your ${niche.name.toLowerCase()} firm`;
      emailOpening = `Hey there,\n\nQuick question: How many of your ${niche.name.toLowerCase()} clients currently need a website, but you don't have the in-house developer bandwidth to build it?`;
      emailBody = `Instead of leaving that money on the table or passing it to external freelancers for zero commission, let's partner up.\n\n• You quote the client.\n• We build the site under your brand in 48 hours.\n• You collect the client payment, keep ${partnerSplitPercent}%, and send us the rest.\n• Zero coding, zero hosting hassle for you.`;
    }

    return { emailSubject, emailOpening, emailBody, emailClosing, whatsapp, phoneScript, agreementText };
  };

  const scripts = getOutreachScripts(selectedNiche, pitchTone);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-slate-900 to-blue-950 p-6 sm:p-8 text-white shadow-xl border border-indigo-800/40">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3.5 py-1 text-xs font-bold text-indigo-300">
            <Handshake className="h-3.5 w-3.5" />
            <span>The Multiplier Strategy: Channel Partnerships</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Partner With People Who Already Have Customers.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
            Stop chasing one client at a time. Connect with graphic designers, photographers, accountants, and printers. 
            <strong className="text-white"> They bring the client. You build the technology. You split the revenue.</strong>
          </p>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3.5 border border-white/10 text-left">
              <p className="text-[10px] uppercase font-bold text-indigo-200">Partner Niches</p>
              <p className="text-xl sm:text-2xl font-black font-mono text-white">10 Sectors</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3.5 border border-white/10 text-left">
              <p className="text-[10px] uppercase font-bold text-indigo-200">Revenue Model</p>
              <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400">50 / 50 Split</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3.5 border border-white/10 text-left">
              <p className="text-[10px] uppercase font-bold text-indigo-200">Fulfillment Speed</p>
              <p className="text-xl sm:text-2xl font-black font-mono text-white">48 Hours</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3.5 border border-white/10 text-left">
              <p className="text-[10px] uppercase font-bold text-indigo-200">Delivery Branding</p>
              <p className="text-xl sm:text-2xl font-black font-mono text-amber-300">100% White-Label</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: "niches", label: "10 Partner Niches & Hunter", icon: Users },
          { id: "scripts", label: "AI Partner Outreach Scripts", icon: Sparkles },
          { id: "calculator", label: "Revenue Split Calculator", icon: Calculator },
          { id: "agreement", label: "White-Label Agreement", icon: FileText },
          { id: "pipeline", label: "Partner Deals Pipeline", icon: TrendingUp }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* VIEW 1: 10 Partner Niches & Directory Hunter */}
      {activeSubTab === "niches" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                The 10 High-Converting Referral Niches
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                These professionals already have paying clients actively asking for websites.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PARTNER_NICHES.map((niche) => {
              const isSelected = selectedNiche.id === niche.id;
              return (
                <div
                  key={niche.id}
                  onClick={() => setSelectedNiche(niche)}
                  className={`relative rounded-2xl p-5 border transition-all cursor-pointer text-left flex flex-col justify-between ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 dark:border-blue-500 shadow-md ring-1 ring-blue-500"
                      : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 rounded-2xl bg-slate-100 dark:bg-slate-800 shadow-xs">{niche.icon}</span>
                        <div>
                          <h3 className="text-sm font-black text-slate-900 dark:text-white">{niche.name}</h3>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                            {niche.suggestedSplit}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      "{niche.tagline}"
                    </p>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                      {niche.whyTheyNeedUs}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Typical Deal Size:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{niche.typicalTicketSize}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNiche(niche);
                          setActiveSubTab("scripts");
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-1"
                      >
                        <Sparkles className="h-3 w-3 text-blue-500" />
                        <span>Get Pitch</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFindPartners({
                            country: "Eswatini",
                            city: "Mbabane",
                            town: "",
                            category: niche.name.split(' ')[0],
                            keywords: niche.name,
                            radius: "25",
                            directorySource: "Regional Business Directory & Maps"
                          });
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer text-center flex items-center justify-center gap-1 shadow-xs"
                      >
                        <Search className="h-3 w-3" />
                        <span>Find in Area</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: AI Partner Outreach Scripts */}
      {activeSubTab === "scripts" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="text-3xl p-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60">{selectedNiche.icon}</span>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Outreach Scripts for: {selectedNiche.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Targeted value hooks to pitch a 50/50 white-label partnership without sounding pushy.
                  </p>
                </div>
              </div>

              {/* Pitch Tone Selector */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase">Pitch Style:</span>
                {[
                  { id: "win-win", label: "Win-Win Agency" },
                  { id: "revenue", label: "Pure Revenue Pitch" },
                  { id: "executive", label: "Executive B2B" }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setPitchTone(t.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      pitchTone === t.id
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Niche Switcher Bar */}
            <div className="py-4 border-b border-slate-100 dark:border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase block mb-2">Switch Target Partner Niche:</span>
              <div className="flex flex-wrap gap-1.5">
                {PARTNER_NICHES.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => setSelectedNiche(n)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                      selectedNiche.id === n.id
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                    }`}
                  >
                    <span className="mr-1">{n.icon}</span>
                    <span>{n.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Outreach Channel Tabs (Email, WhatsApp, Phone Script) */}
            <div className="grid gap-6 lg:grid-cols-3 pt-6">
              {/* Cold Email */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      <Mail className="h-4 w-4" />
                      <span>Cold Partnership Email</span>
                    </div>
                    <button
                      onClick={() => handleCopy(`Subject: ${scripts.emailSubject}\n\n${scripts.emailOpening}\n\n${scripts.emailBody}\n\n${scripts.emailClosing}`, 'email')}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-500 text-xs font-semibold flex items-center gap-1 shadow-2xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      {copiedPitch === 'email' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedPitch === 'email' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 text-xs space-y-2 font-mono">
                    <p className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                      Subject: {scripts.emailSubject}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans text-xs">
                      {scripts.emailOpening}
                      {"\n\n"}
                      {scripts.emailBody}
                      {"\n\n"}
                      {scripts.emailClosing}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-blue-50/50 dark:bg-blue-950/30 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                  💡 <strong>Tip:</strong> Attach 1-2 interactive preview links from SiteScout AI to prove turnaround quality.
                </div>
              </div>

              {/* WhatsApp Direct Message */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      <MessageSquare className="h-4 w-4" />
                      <span>WhatsApp Direct DM</span>
                    </div>
                    <button
                      onClick={() => handleCopy(scripts.whatsapp, 'whatsapp')}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-500 text-xs font-semibold flex items-center gap-1 shadow-2xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      {copiedPitch === 'whatsapp' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedPitch === 'whatsapp' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                      {scripts.whatsapp}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-emerald-50/50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                  ⚡ <strong>Speed:</strong> WhatsApp DM conversion is 4x higher when sent directly to agency directors.
                </div>
              </div>

              {/* Phone / Meeting Cold Script */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                      <PhoneCall className="h-4 w-4" />
                      <span>30-Second Call Script</span>
                    </div>
                    <button
                      onClick={() => handleCopy(scripts.phoneScript, 'phone')}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-500 text-xs font-semibold flex items-center gap-1 shadow-2xs border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      {copiedPitch === 'phone' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedPitch === 'phone' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-sans text-xs">
                      {scripts.phoneScript}
                    </p>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-purple-50/50 dark:bg-purple-950/30 p-2.5 rounded-xl border border-purple-100 dark:border-purple-900/30">
                  🎯 <strong>Focus:</strong> Ask for permission to send the interactive demo, never push for a contract on call 1.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Revenue Split & Profit Calculator */}
      {activeSubTab === "calculator" && (
        <div className="space-y-6 text-left">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Interactive White-Label Revenue Split Engine
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Model the monthly and annual economics of a partnership deal with real client referral volume.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Controls Column */}
              <div className="space-y-5 bg-slate-50/50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <label className="text-slate-700 dark:text-slate-300">Average Website Build Price ($):</label>
                    <span className="font-mono text-blue-600 dark:text-blue-400">${avgDealSize}</span>
                  </div>
                  <input
                    type="range"
                    min="400"
                    max="5000"
                    step="100"
                    value={avgDealSize}
                    onChange={(e) => setAvgDealSize(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>$400 (Basic Site)</span>
                    <span>$2,500 (Pro Portal)</span>
                    <span>$5,000 (Enterprise)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <label className="text-slate-700 dark:text-slate-300">Referrals Per Month (From 1-3 Partners):</label>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">{referralsPerMonth} clients/mo</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={referralsPerMonth}
                    onChange={(e) => setReferralsPerMonth(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>1 client/mo</span>
                    <span>10 clients/mo</span>
                    <span>20 clients/mo</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <label className="text-slate-700 dark:text-slate-300">Partner Revenue Split (%):</label>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">{partnerSplitPercent}% Partner / {100 - partnerSplitPercent}% You</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="70"
                    step="5"
                    value={partnerSplitPercent}
                    onChange={(e) => setPartnerSplitPercent(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>30% (Referral only)</span>
                    <span>50% (Standard 50/50)</span>
                    <span>70% (Wholesale margin)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1.5">
                    <label className="text-slate-700 dark:text-slate-300">Monthly Hosting/Maintenance Retainer ($/mo/client):</label>
                    <span className="font-mono text-purple-600 dark:text-purple-400">${monthlyRetainer}/mo</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="300"
                    step="10"
                    value={monthlyRetainer}
                    onChange={(e) => setMonthlyRetainer(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700"
                  />
                </div>
              </div>

              {/* Output Display Column */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 p-4 border border-blue-200/80 dark:border-blue-900/50">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                      Your Monthly Share
                    </span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
                      ${yourMonthlyCut.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      ({100 - partnerSplitPercent}% of ${monthlyGrossRevenue.toLocaleString()} gross)
                    </span>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 p-4 border border-emerald-200/80 dark:border-emerald-900/50">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Partner Monthly Payout
                    </span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white mt-1">
                      ${partnerMonthlyCut.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      (Zero tech overhead for them)
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 p-5 text-white shadow-md border border-indigo-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                      Annualized Channel Forecast
                    </span>
                    <span className="text-[10px] bg-indigo-500/30 px-2 py-0.5 rounded-full font-bold text-indigo-200">
                      12-Month Projection
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <p className="text-xs text-slate-400">Your Annual Build Profit:</p>
                      <p className="text-xl sm:text-2xl font-black font-mono text-white">
                        ${annualYourCut.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Annual Retainer Pool:</p>
                      <p className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
                        +${yourAnnualRetainerCut.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-indigo-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-300">Total 1-Year Pipeline Value:</span>
                    <span className="text-lg font-black font-mono text-amber-300">
                      ${(annualYourCut + yourAnnualRetainerCut).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Handshake className="h-4 w-4 text-blue-500" />
                    The Channel Advantage:
                  </p>
                  <p>
                    With just 2-3 steady partners referring 2 clients a month, your agency generates predictable revenue without spending $1 on Facebook or Google ads.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: White-Label Partnership Agreement */}
      {activeSubTab === "agreement" && (
        <div className="space-y-6 text-left">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  White-Label Strategic Partnership Agreement
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Ready-to-use legal framework with 48-hr SLA, non-solicitation, and revenue split terms.
                </p>
              </div>

              <button
                onClick={() => handleCopy(scripts.agreementText, 'agreement')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                {copiedPitch === 'agreement' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copiedPitch === 'agreement' ? 'Agreement Copied!' : 'Copy Agreement Contract'}</span>
              </button>
            </div>

            <div className="bg-slate-900 text-slate-200 p-6 rounded-2xl font-mono text-xs leading-relaxed max-h-[500px] overflow-y-auto border border-slate-800 space-y-4">
              <pre className="whitespace-pre-wrap font-mono">
                {scripts.agreementText}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: Partner Pipeline & Deal Tracker */}
      {activeSubTab === "pipeline" && (
        <div className="space-y-6 text-left">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Active Partner Relationship Pipeline
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Track ongoing white-label relationships, client referrals, and commission splits.
                </p>
              </div>

              <button
                onClick={() => setNewPartnerModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Add Partner Relationship</span>
              </button>
            </div>

            {/* Pipeline Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-400">
                    <th className="py-3 px-3">Partner Name</th>
                    <th className="py-3 px-3">Niche</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Split</th>
                    <th className="py-3 px-3">Referrals</th>
                    <th className="py-3 px-3">Revenue Gen.</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {deals.map((deal) => {
                    let statusBadge = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
                    if (deal.status === "Active Partner") statusBadge = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
                    if (deal.status === "Agreement Signed") statusBadge = "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300";
                    if (deal.status === "Pitch Sent") statusBadge = "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300";

                    return (
                      <tr key={deal.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900 dark:text-white">{deal.partnerName}</p>
                          <p className="text-[10px] text-slate-400">{deal.partnerEmail} • {deal.partnerPhone}</p>
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">{deal.partnerType}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge}`}>
                            {deal.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">{deal.splitPercentage}%</td>
                        <td className="py-3 px-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{deal.referredClientCount}</td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">${deal.totalRevenueGenerated.toLocaleString()}</td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => setDeals(deals.filter(d => d.id !== deal.id))}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add New Partner */}
      <AnimatePresence>
        {newPartnerModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setNewPartnerModal(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-left space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Add New Partner Relationship</h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const newDeal: PartnerDeal = {
                  id: `deal-${Date.now()}`,
                  partnerName: newPartnerName,
                  partnerType: newPartnerType,
                  partnerEmail: newPartnerEmail,
                  partnerPhone: newPartnerPhone,
                  status: "Prospecting",
                  splitPercentage: newPartnerSplit,
                  referredClientCount: 0,
                  totalRevenueGenerated: 0,
                  notes: newPartnerNotes
                };
                setDeals([newDeal, ...deals]);
                setNewPartnerModal(false);
                setNewPartnerName("");
                setNewPartnerEmail("");
                setNewPartnerPhone("");
                setNewPartnerNotes("");
              }} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Partner / Agency Name</label>
                  <input
                    type="text"
                    required
                    value={newPartnerName}
                    onChange={(e) => setNewPartnerName(e.target.value)}
                    placeholder="e.g. Apex Visual Design Studio"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Partner Niche</label>
                  <select
                    value={newPartnerType}
                    onChange={(e) => setNewPartnerType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  >
                    {PARTNER_NICHES.map((n) => (
                      <option key={n.id} value={n.name}>{n.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email</label>
                    <input
                      type="email"
                      value={newPartnerEmail}
                      onChange={(e) => setNewPartnerEmail(e.target.value)}
                      placeholder="partner@agency.com"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={newPartnerPhone}
                      onChange={(e) => setNewPartnerPhone(e.target.value)}
                      placeholder="+268 76 00 0000"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Revenue Split % for Partner</label>
                  <input
                    type="number"
                    min="10"
                    max="80"
                    value={newPartnerSplit}
                    onChange={(e) => setNewPartnerSplit(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Notes / Partnership Opportunity</label>
                  <textarea
                    rows={2}
                    value={newPartnerNotes}
                    onChange={(e) => setNewPartnerNotes(e.target.value)}
                    placeholder="e.g. Discussed bundling web design with their monthly branding retainers."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewPartnerModal(false)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 cursor-pointer shadow-xs"
                  >
                    Save Partner
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
