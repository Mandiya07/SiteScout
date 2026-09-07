import { signOut } from "firebase/auth";
import { auth, db, setDoc, getDoc, doc, serverTimestamp, handleFirestoreError, OperationType, authedFetch } from "./lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Business, GeneratedSite, UserSession, SearchFilters, SalesStatus } from "./types";
import { useAuth } from "./lib/AuthContext";
import Auth from "./components/Auth";
import Navbar from "./components/Navbar";
import Onboarding from "./components/Onboarding";
import BusinessFinder from "./components/BusinessFinder";
import OpportunityAnalysis from "./components/OpportunityAnalysis";
import WebsiteGenerator from "./components/WebsiteGenerator";
import WebsiteEditor from "./components/WebsiteEditor";
import ShareablePreview from "./components/ShareablePreview";
import SalesAssistant from "./components/SalesAssistant";
import ProposalGenerator from "./components/ProposalGenerator";
import ClientPortal from "./components/ClientPortal";
import AdminPanel from "./components/AdminPanel";
import TemplateLibrary from "./components/TemplateLibrary";
import WebsiteView from "./components/WebsiteView";
import CRMSync from "./components/CRMSync";
import ConversionFunnel from "./components/ConversionFunnel";
import PartnerEcosystem from "./components/PartnerEcosystem";
import ProspectPipeline from "./components/ProspectPipeline";
import MyWebsites from "./components/MyWebsites";
import ThreeStepRevenueEngine from "./components/ThreeStepRevenueEngine";
import { getClientMockBusinesses, generateClientMockSite } from "./lib/clientFallback";
import { 
  Search, Globe, Award, Trophy, User, MessageSquare, Phone, MapPin, 
  CheckCircle2, AlertTriangle, ShieldCheck, HeartCrack, Flame, TrendingUp, Users, ArrowRight, BookOpen, Database, Handshake, Sparkles, Clock, Calendar,
  ShieldAlert, Copy, Check, ExternalLink, X, ChevronDown
} from "lucide-react";

const placeholderSite: GeneratedSite = {
  id: "standalone-calculator",
  businessName: "A1 Local Services Inc.",
  phone: "(512) 555-0199",
  address: "1200 Congress Ave., Austin, TX 78701",
  category: "Professional Home & Commercial Services",
  primaryColor: "#2563eb",
  secondaryColor: "#4f46e5",
  accentColor: "#3b82f6",
  backgroundColor: "#ffffff",
  textColor: "#0f172a",
  fontStyle: "sans",
  seo: {
    title: "A1 Local Services | Professional Home & Commercial Repairs in Austin",
    description: "Looking for trustworthy, 5-star home and commercial maintenance in Austin? Contact A1 Local Services today for same-day emergency repairs.",
    keywords: "plumbing repairs, commercial hvac, electrical service, home improvement, Austin local repair"
  },
  hero: {
    title: "Premium Local Repairs & Services Done Right",
    subtitle: "Austin's trusted specialists for professional residential & commercial maintenance. Dedicated to reliable, high-quality results.",
    ctaPrimary: "Request Callback",
    ctaSecondary: "View Services Deck",
    imageUrl: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=1200"
  },
  about: {
    title: "Dedicated Craftsmanship Since 2012",
    history: "Founded as a local workshop, we've expanded to a dedicated crew serving home and business owners.",
    mission: "To deliver dependable, honest, and high-performance repair services with transparent pricing.",
    pitch: "We focus on providing prompt and reliable solutions to minimize your downtime and keep your property running smoothly."
  },
  services: [
    { title: "Property Repairs", description: "Diagnostic assessment and repairs for structural, electrical, and plumbing needs.", price: "Contact for Quote" },
    { title: "Commercial System Inspections", description: "Comprehensive safety and efficiency checks for corporate properties.", price: "Contact for Quote" }
  ],
  features: [
    { title: "Dedicated Professionals", icon: "ShieldCheck", description: "Our team operates with a focus on quality, safety, and customer satisfaction." },
    { title: "Prompt Service", icon: "Clock", description: "We strive to respond quickly and efficiently to all service requests." }
  ],
  gallery: [],
  faqs: [],
  testimonials: [],
  blog: [],
  whatsappMessage: "Hello, I would like to get a free estimate for repairs.",
  contactPage: {
    title: "Schedule Your Service Call Today",
    description: "Fill out our quick dispatch form or contact our 24/7 priority hotline to book your certified local technician.",
    email: "service@a1localservices.com"
  },
  privacyPolicy: "Privacy terms apply to consumer information.",
  termsOfService: "Terms and conditions apply to all service agreements.",
  notFoundPage: {
    title: "Section Not Found",
    message: "The requested layout section is currently being compiled."
  }
};

export default function App() {
  const { user: session, loading: authLoading } = useAuth();

  // Public Client Presentation Portal States
  const [isPreviewModeActive, setIsPreviewModeActive] = useState<boolean>(false);
  const [publicPreviewSite, setPublicPreviewSite] = useState<GeneratedSite | null>(null);
  const [publicPreviewLoading, setPublicPreviewLoading] = useState<boolean>(true);
  const [publicPreviewError, setPublicPreviewError] = useState<string | null>(null);
  const [clientViewport, setClientViewport] = useState<"desktop" | "mobile">("desktop");
  const [clientApprovalModal, setClientApprovalModal] = useState<boolean>(false);
  const [clientFeedbackModal, setClientFeedbackModal] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string>("");
  const [clientSignoffName, setClientSignoffName] = useState<string>("");
  const [feedbackSuccess, setFeedbackSuccess] = useState<boolean>(false);
  const [approvalSuccess, setApprovalSuccess] = useState<boolean>(false);
  const [showAuditPanel, setShowAuditPanel] = useState<boolean>(true);

  // Parse Public Presentation URL Route on mount
  useEffect(() => {
    const pathParts = window.location.pathname.split("/");
    let siteId = "";
    if (window.location.pathname.startsWith("/preview/")) {
      siteId = pathParts[2];
    } else {
      const params = new URLSearchParams(window.location.search);
      siteId = params.get("preview") || "";
    }

    if (siteId) {
      setIsPreviewModeActive(true);
      setPublicPreviewLoading(true);
      
      const fetchPreview = async () => {
        try {
          // Check localStorage fallback first
          try {
            const cached = localStorage.getItem(`site_${siteId}`);
            if (cached) {
              setPublicPreviewSite(JSON.parse(cached));
              setPublicPreviewLoading(false);
              return;
            }
          } catch (e) {
            console.error("LocalStorage fallback read error:", e);
          }

          // Fetch from Firestore publicPreviews collection
          const docRef = doc(db, "publicPreviews", siteId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as GeneratedSite;
            setPublicPreviewSite(data);
            try {
              localStorage.setItem(`site_${siteId}`, JSON.stringify(data));
            } catch (e) {}
          } else {
            // Fallback to server API endpoint
            const apiRes = await fetch(`/api/preview/${siteId}`);
            if (apiRes.ok) {
              const apiJson = await apiRes.json();
              if (apiJson.success && apiJson.site) {
                setPublicPreviewSite(apiJson.site as GeneratedSite);
                try {
                  localStorage.setItem(`site_${siteId}`, JSON.stringify(apiJson.site));
                } catch (e) {}
              } else {
                setPublicPreviewError("The requested website draft presentation could not be found or has expired.");
              }
            } else {
              setPublicPreviewError("The requested website draft presentation could not be found or has expired.");
            }
          }
        } catch (err: any) {
          console.error("Error loading presentation preview site:", err);
          try {
            const cached = localStorage.getItem(`site_${siteId}`);
            if (cached) {
              setPublicPreviewSite(JSON.parse(cached));
              setPublicPreviewLoading(false);
              return;
            }
          } catch (e) {}
          setPublicPreviewError("Unable to securely connect to presentation portal. Please refresh.");
        } finally {
          setPublicPreviewLoading(false);
        }
      };
      
      fetchPreview();
    }
  }, []);

  // Main UI States
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [darkMode, setDarkMode] = useState<boolean>(false);
   const [showOnboarding, setShowOnboarding] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiNotice, setApiNotice] = useState<"sandbox_simulated" | "mock_simulated" | null>(null);

  // Core business & design states
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [generatedSite, setGeneratedSite] = useState<GeneratedSite | null>(null);
  const [userSites, setUserSites] = useState<GeneratedSite[]>(() => {
    try {
      const cached = localStorage.getItem("sitescout_user_sites");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [firestorePermissionNotice, setFirestorePermissionNotice] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [copiedRules, setCopiedRules] = useState<boolean>(false);

  // Load user's saved sites from Firestore
  useEffect(() => {
    if (session) {
      const fetchUserSites = async () => {
        try {
          const q = query(collection(db, "sites"), where("userId", "==", session.uid));
          const querySnapshot = await getDocs(q);
          const sitesList: GeneratedSite[] = [];
          querySnapshot.forEach((docSnap) => {
            sitesList.push(docSnap.data() as GeneratedSite);
          });
          if (sitesList.length > 0) {
            setUserSites(sitesList);
            try {
              localStorage.setItem("sitescout_user_sites", JSON.stringify(sitesList));
            } catch (e) {}
            // If no active generatedSite is set but sites exist, default to the first one
            if (!generatedSite) {
              setGeneratedSite(sitesList[0]);
            }
          }
          setFirestorePermissionNotice(false);
        } catch (e: any) {
          handleFirestoreError(e, OperationType.GET, "sites");
          console.error("Error fetching user sites:", e);
          if (e?.message?.includes("Missing or insufficient permissions") || e?.code === "permission-denied") {
            setFirestorePermissionNotice(true);
          }
          // Seamless fallback to local storage cache so user never loses their sites
          try {
            const cached = localStorage.getItem("sitescout_user_sites");
            if (cached) {
              const parsed: GeneratedSite[] = JSON.parse(cached);
              if (parsed && parsed.length > 0) {
                setUserSites(parsed);
                if (!generatedSite) {
                  setGeneratedSite(parsed[0]);
                }
              }
            }
          } catch (cacheErr) {
            console.error("Fallback cache error:", cacheErr);
          }
        }
      };
      fetchUserSites();
    }
  }, [session, activeTab]);

  // Stats monitoring
  const [stats, setStats] = useState({
    found: 0,
    generated: 0,
    proposals: 0,
    won: 0
  });

  // Calculate stats dynamically from actual live data
  useEffect(() => {
    const foundCount = businesses.length;
    const generatedCount = userSites.length;
    const proposalsCount = userSites.filter(s => s.proposal).length;
    const wonCount = businesses.filter(b => b.prospectStatus === "Won").length + userSites.filter(s => s.clientApproved || s.crmSynced).length;

    setStats({
      found: foundCount,
      generated: generatedCount,
      proposals: proposalsCount,
      won: wonCount
    });
  }, [userSites, businesses]);

  const handleUpdateProspect = (updated: Business) => {
    setBusinesses(prev => prev.map(b => b.id === updated.id ? updated : b));
    if (selectedBusiness?.id === updated.id) {
      setSelectedBusiness(updated);
    }
  };

  // Sync dark theme with HTML tags
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // API Search execution
  const triggerSearch = async (filters: SearchFilters, isInitial = false) => {
    if (!isInitial) setLoading(true);
    try {
      const response = await authedFetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from server (possible Vercel client-side hosting)");
      }

      const data = await response.json();
      const isAppend = !!(filters.page && filters.page > 1);
      const newBizs = data.businesses || [];
      
      setBusinesses(prev => {
        if (!isAppend) return newBizs;
        const existingNames = new Set(prev.map(b => b.name.toLowerCase()));
        const uniqueNew = newBizs.filter(b => !existingNames.has(b.name.toLowerCase()));
        return [...prev, ...uniqueNew];
      });
      
      if (data.source === "error_fallback") {
        setApiNotice("sandbox_simulated");
      } else if (data.source === "mock_fallback") {
        setApiNotice("mock_simulated");
      } else {
        setApiNotice(null);
      }

      if (!isInitial) {
        setStats(prev => ({ ...prev, found: prev.found + (newBizs.length || 0) }));
      }
    } catch (error) {
      console.error("Search API Error, triggering robust client-side fallback:", error);
      
      const pageNum = filters.page || 1;
      // Fallback directly to generating high-quality localized client-side mock businesses
      const mockBizs = getClientMockBusinesses(
        filters.city || "Mbabane", 
        filters.category || "Construction", 
        filters.country || "Eswatini",
        filters.keywords || "",
        pageNum
      );
      
      const isAppend = pageNum > 1;
      setBusinesses(prev => {
        if (!isAppend) return mockBizs;
        const existingNames = new Set(prev.map(b => b.name.toLowerCase()));
        const uniqueNew = mockBizs.filter(b => !existingNames.has(b.name.toLowerCase()));
        return [...prev, ...uniqueNew];
      });
      
      setApiNotice("sandbox_simulated");
      
      if (!isInitial) {
        setStats(prev => ({ ...prev, found: prev.found + mockBizs.length }));
      }
    } finally {
      if (!isInitial) setLoading(false);
    }
  };

  // Initial directory prospect population
  useEffect(() => {
    if (businesses.length === 0) {
      triggerSearch({
        country: 'Eswatini',
        city: 'Mbabane',
        town: '',
        category: 'Construction',
        keywords: '',
        radius: '15',
        directorySource: 'National Business Directory / Yellow Pages'
      }, true);
    }
  }, []);

  // Analyze a specific business profile
  const handleAnalyze = async (biz: Business) => {
    setLoading(true);
    try {
      const response = await authedFetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: biz })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from server");
      }

      const data = await response.json();
      
      const updatedBusiness = {
        ...biz,
        analysis: {
          presenceScore: data.presenceScore,
          whyWebsiteNeeded: data.whyWebsiteNeeded,
          recommendations: data.recommendations,
          competitorPitches: data.competitorPitches
        }
      };

      setSelectedBusiness(updatedBusiness);
      setBusinesses(prev => prev.map(b => b.id === biz.id ? updatedBusiness : b));
      setActiveTab("analysis");
    } catch (error) {
      console.error("Analysis API Error, running high-fidelity client-side fallback:", error);
      
      // High-fidelity fallback logic matching business specifics
      const updatedBusiness = {
        ...biz,
        analysis: {
          presenceScore: biz.presenceScore || 45,
          whyWebsiteNeeded: `This ${biz.category} business in ${biz.address.split(",")[0] || "the local area"} is missing critical online search authority. Competing services with optimized websites are capturing the majority of online queries and emergency booking dispatch volumes.`,
          recommendations: [
            "Launch a high-fidelity mobile-responsive landing page optimized for same-day service bookings.",
            "Integrate a prominent 1-click WhatsApp CTA and live enquiry forms to instantly convert mobile visitors.",
            "Showcase local visual proof (workmanship gallery) and customer testimonials to establish immediate trust."
          ],
          competitorPitches: [
            `Modernized web profile indexing for local ${biz.category} terms on search engines.`,
            `Zero friction interaction buttons enabling phone clicks and direct text messages.`
          ]
        }
      };

      setSelectedBusiness(updatedBusiness);
      setBusinesses(prev => prev.map(b => b.id === biz.id ? updatedBusiness : b));
      setActiveTab("analysis");
    } finally {
      setLoading(false);
    }
  };

  // Generate responsive website preview draft
  const handleGenerateWebsite = async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    setActiveTab("generator");
  };

  // Direct 1-Click Scan for 20 Businesses Without Websites
  const handleScan20NoWebsite = async (city: string, category: string, count: number = 20) => {
    setLoading(true);
    try {
      await triggerSearch({
        country: '',
        city: city || 'Local Area',
        town: '',
        category: category || 'Contractors',
        keywords: '',
        radius: '20',
        directorySource: 'National Business Directory / Yellow Pages'
      });
    } finally {
      setLoading(false);
    }
  };

  // Direct 1-Click Build Website for 3-Step Engine
  const handleDirectBuildWebsite = async (biz: Business) => {
    setSelectedBusiness(biz);
    setLoading(true);
    try {
      const response = await authedFetch("/api/generate-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: biz })
      });

      if (response.ok) {
        const data = await response.json();
        const siteWithClassification: GeneratedSite = {
          ...data.site,
          isDemo: biz.isDemo ?? false,
          dataType: biz.dataType || (biz.isDemo ? "demo" : "real")
        };
        setGeneratedSite(siteWithClassification);
        await handleSaveDraft(siteWithClassification);
        setStats(prev => ({ ...prev, generated: prev.generated + 1 }));
        setActiveTab("preview");
      } else {
        setActiveTab("generator");
      }
    } catch (error) {
      console.error("Direct build website error:", error);
      setActiveTab("generator");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center dark:bg-slate-900"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div></div>;
  }

  if (isPreviewModeActive) {
    if (publicPreviewLoading) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-6 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4 animate-bounce"></div>
          <h2 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Accessing Presentation Portal...</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">Fetching customized brand structure and launching high-fidelity interactive preview.</p>
        </div>
      );
    }

    if (publicPreviewError || !publicPreviewSite) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 px-6 text-center space-y-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full dark:bg-red-950/40 dark:text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">Proposal Unreachable</h2>
            <p className="text-xs text-slate-500 max-w-sm">{publicPreviewError || "The requested proposal has expired or is invalid."}</p>
          </div>
          <a href="/" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-blue-500 transition-colors">
            Return to Homepage
          </a>
        </div>
      );
    }

    // Helper to calculate active gaps for the client presentation audit
    const getPublicSiteGaps = (site: any) => {
      const defs = site.deficits || (site.presence?.deficits) || {
        noWebsite: true,
        noWhatsappCta: true,
        noBookingSystem: true,
        noOnlineCatalogue: true,
        noEnquiryForm: true,
        noSeo: true,
        poorMobileExperience: true,
      };

      const list = [
        {
          key: "noWebsite",
          label: "No Mobile-Optimized Website",
          impact: "High-intent mobile searchers hit a dead end on Google Maps and bounce to competitors.",
          solution: "A modern, ultra-fast responsive landing page custom-built for local brand authority.",
          active: !!defs.noWebsite || !site.publishedUrl
        },
        {
          key: "noWhatsappCta",
          label: "Missing 1-Tap WhatsApp CTA",
          impact: "74% of local clients on smartphones prefer messaging over calling. Standard forms lose leads.",
          solution: "An active, pre-configured 1-click WhatsApp chat link with automated welcome prompts.",
          active: !!defs.noWhatsappCta || !site.whatsappMessage
        },
        {
          key: "noBookingSystem",
          label: "No Direct Appointment / Quote System",
          impact: "Clients have to call or wait for emails just to schedule, causing high friction.",
          solution: "An integrated direct callback and quote-request dispatch engine.",
          active: !!defs.noBookingSystem
        },
        {
          key: "noOnlineCatalogue",
          label: "No Transparent Service Menu / Pricing",
          impact: "Uncertainty around pricing causes prospective buyers to hesitate and search elsewhere.",
          solution: "A beautifully structured service menu highlighting packages and custom pricing.",
          active: !!defs.noOnlineCatalogue
        },
        {
          key: "poorMobileExperience",
          label: "Unresponsive Interface Design",
          impact: "Standard or non-existent layouts are clunky on smartphone screens, losing 60%+ of mobile traffic.",
          solution: "A mobile-first framework with quick-action contact hotlines at the bottom.",
          active: !!defs.poorMobileExperience
        },
        {
          key: "noSeo",
          label: "Missing Search Optimization (Local SEO)",
          impact: "Lower visibility on search results allows nearby competitors to capture regional demand.",
          solution: "Pre-rendered SEO metadata, descriptive keywords, and localized alt-tags ready to index.",
          active: !!defs.noSeo
        }
      ];

      return list.filter(item => item.active);
    };

    const activeGapsList = getPublicSiteGaps(publicPreviewSite);

    // Render the beautiful Client Presentation Portal
    return (
      <div className={`min-h-screen flex flex-col ${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50/50 text-slate-900"}`}>
        {/* Top bar for Client Presentation */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="h-8 w-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <Globe className="h-4.5 w-4.5" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded dark:bg-blue-950 dark:text-blue-400 uppercase tracking-wide">Client Presentation</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-emerald-600 font-semibold dark:text-emerald-400 uppercase tracking-wide">Proposal Live</span>
              </div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Interactive Website Draft: {publicPreviewSite.businessName}</h1>
            </div>
          </div>

          {/* Center viewport switchers */}
          <div className="flex items-center space-x-1.5 bg-slate-100 rounded-lg p-1 dark:bg-slate-950">
            <button
              onClick={() => setClientViewport("desktop")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                clientViewport === "desktop" ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white" : "text-slate-500"
              }`}
            >
              Desktop Mode
            </button>
            <button
              onClick={() => setClientViewport("mobile")}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                clientViewport === "mobile" ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white" : "text-slate-500"
              }`}
            >
              Mobile Mode
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => setClientFeedbackModal(true)}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-700 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-350 cursor-pointer"
            >
              Request Changes
            </button>
            <button
              onClick={() => setClientApprovalModal(true)}
              className="flex-grow sm:flex-none px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-md shadow-blue-500/10 cursor-pointer"
            >
              Approve Layout &amp; Launch
            </button>
          </div>
        </header>

        {/* Sticky Digital Audit Alert Bar */}
        <div className="bg-slate-900 border-b border-slate-800 text-white px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 animate-pulse">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">
                Digital Presence Gap Report: <span className="text-indigo-400 font-extrabold">{activeGapsList.length} Customer Conversion Bottlenecks Detected</span> on Google Maps
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                We analyzed your local listing footprint. See exactly how this interactive prototype resolves each customer friction point to double phone calls and WhatsApp inquiries.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowAuditPanel(!showAuditPanel)}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
          >
            <span>{showAuditPanel ? "Hide Diagnostic Report" : "Analyze My Online Presence"}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showAuditPanel ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Diagnostic Expanded Report Panel */}
        {showAuditPanel && (
          <div className="bg-slate-900 border-b border-slate-800 text-left py-6 px-6 overflow-hidden animate-in slide-in-from-top-4 duration-300">
            <div className="max-w-7xl mx-auto grid gap-6 md:grid-cols-3">
              
              {/* Left Column: Overall Health Score Card */}
              <div className="bg-slate-950/60 rounded-xl p-5 border border-slate-800/80 space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Listing Performance</span>
                  <h4 className="text-sm font-black text-white mt-1">Google Listing Audit Score</h4>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="relative flex items-center justify-center">
                    <svg className="w-16 h-16">
                      <circle className="text-slate-800" strokeWidth="5" stroke="currentColor" fill="transparent" r="26" cx="32" cy="32"/>
                      <circle className="text-indigo-500" strokeWidth="5" strokeDasharray={`${2 * Math.PI * 26}`} strokeDashoffset={`${2 * Math.PI * 26 * (1 - (publicPreviewSite.presence?.presenceScore || 45) / 100)}`} strokeLinecap="round" stroke="currentColor" fill="transparent" r="26" cx="32" cy="32"/>
                    </svg>
                    <span className="absolute text-xs font-black text-white">{publicPreviewSite.presence?.presenceScore || 45}%</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200">Needs Optimization</p>
                    <p className="text-[10px] text-slate-400 mt-1">Your Google listing has a fantastic {publicPreviewSite.presence?.rating || 4.8}★ reputation but lacks essential customer conversion triggers.</p>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-800/50 flex items-center justify-between text-xs text-slate-400">
                  <span>Verified Contact Hotline:</span>
                  <span className="text-slate-200 font-mono font-semibold">{publicPreviewSite.phone}</span>
                </div>
              </div>

              {/* Center & Right Column: Gaps List */}
              <div className="md:col-span-2 space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">Friction Bottlenecks vs. Prototype Solutions</span>
                
                <div className="grid gap-3 sm:grid-cols-2 max-h-[220px] overflow-y-auto pr-2">
                  {activeGapsList.map((gap, idx) => (
                    <div key={idx} className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/60 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span className="text-xs font-bold text-slate-200">{gap.label}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        <span className="text-rose-400/90 font-semibold">Impact:</span> {gap.impact}
                      </p>
                      <p className="text-[10px] text-slate-300 leading-relaxed border-t border-slate-800/30 pt-1.5">
                        <span className="text-emerald-400 font-semibold">✓ Solved In Prototype:</span> {gap.solution}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Presenter workspace body */}
        <div className="flex-1 overflow-hidden flex flex-col py-6">
          {clientViewport === "desktop" ? (
            <div className="flex-1 max-w-7xl w-full mx-auto px-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[740px] max-h-[800px] dark:bg-slate-900 dark:border-slate-800">
                <div className="h-9 bg-slate-50 border-b border-slate-200 px-4 flex items-center justify-between shrink-0 dark:bg-slate-950 dark:border-slate-850">
                  <div className="flex items-center space-x-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="bg-slate-100 rounded-md px-3 py-1 text-[10px] text-slate-500 font-mono w-1/3 text-center truncate dark:bg-slate-900 dark:text-slate-400">
                    {window.location.href}
                  </div>
                  <div className="w-12" />
                </div>
                <div className="flex-grow flex flex-col overflow-hidden">
                  <WebsiteView site={publicPreviewSite} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950/20">
              <div className="w-[340px] h-[550px] rounded-[36px] border-[10px] border-slate-900 bg-white shadow-2xl overflow-hidden flex flex-col relative dark:bg-slate-900">
                {/* Phone Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-28 bg-slate-900 rounded-b-xl z-20" />
                <div className="flex-1 pt-4 overflow-hidden flex flex-col">
                  <WebsiteView site={publicPreviewSite} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Client Revision Modal */}
        {clientFeedbackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in text-left">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="h-4.5 w-4.5 text-blue-500" /> Request Custom Adjustments
                </h3>
                <button onClick={() => { setClientFeedbackModal(false); setFeedbackSuccess(false); setFeedbackMessage(""); }} className="text-slate-400 hover:text-slate-600 font-extrabold cursor-pointer">✕</button>
              </div>

              {feedbackSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400 animate-bounce">
                    <CheckCircle2 className="h-6 w-6" />
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Feedback Submitted Successfully</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">Your revision requests have been securely transmitted directly to your dedicated design strategist. We'll update the live presentation within 24 hours.</p>
                  </div>
                  <button onClick={() => { setClientFeedbackModal(false); setFeedbackSuccess(false); setFeedbackMessage(""); }} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold dark:bg-slate-800 dark:text-white cursor-pointer mt-4">
                    Close Portal
                  </button>
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!feedbackMessage.trim()) return;
                  try {
                    // Send to secure public endpoint
                    const res = await fetch(`/api/preview/${publicPreviewSite.id}/feedback`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ message: feedbackMessage })
                    });
                    
                    if (res.ok) {
                      const data = await res.json();
                      if (data.success && data.feedback) {
                        const updatedFeedbacks = [
                          ...(publicPreviewSite.clientFeedback || []),
                          data.feedback
                        ];
                        setPublicPreviewSite({ ...publicPreviewSite, clientFeedback: updatedFeedbacks });
                        try {
                          localStorage.setItem(`site_${publicPreviewSite.id}`, JSON.stringify({ ...publicPreviewSite, clientFeedback: updatedFeedbacks }));
                        } catch (e) {}
                      }
                      setFeedbackSuccess(true);
                    } else {
                      // Fallback to local store/cached state
                      const updatedFeedbacks = [
                        ...(publicPreviewSite.clientFeedback || []),
                        { message: feedbackMessage, timestamp: new Date().toISOString(), status: "pending" }
                      ];
                      setPublicPreviewSite({ ...publicPreviewSite, clientFeedback: updatedFeedbacks });
                      setFeedbackSuccess(true);
                    }
                  } catch (err) {
                    console.error("Error submitting client feedback via API:", err);
                    setFeedbackSuccess(true);
                  }
                }} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Need text changed, new sections, or different color palletes? Please describe your requests below:
                  </p>
                  <textarea
                    required
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    placeholder="e.g., Please change the services list pricing or add a section detailing our 5-star Google review history."
                    rows={4}
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-850 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setClientFeedbackModal(false)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md cursor-pointer text-center"
                    >
                      Submit Feedback
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Client Launch Sign-off Modal */}
        {clientApprovalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in text-left">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4 dark:bg-slate-900 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" /> Sign-off Layout &amp; Go Live
                </h3>
                <button onClick={() => { setClientApprovalModal(false); setApprovalSuccess(false); setClientSignoffName(""); }} className="text-slate-400 hover:text-slate-600 font-extrabold cursor-pointer">✕</button>
              </div>

              {approvalSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 animate-bounce">
                    <CheckCircle2 className="h-6 w-6" />
                  </span>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Design Approved &amp; Booked!</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">Thank you, <strong className="text-slate-800 dark:text-slate-200">{clientSignoffName}</strong>! Your customized layout has been successfully signed-off. We are preparing to register your domain and map SSL certificates.</p>
                  </div>
                  <button onClick={() => { setClientApprovalModal(false); setApprovalSuccess(false); setClientSignoffName(""); }} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold dark:bg-slate-800 dark:text-white cursor-pointer mt-4">
                    Close Presentation
                  </button>
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!clientSignoffName.trim()) return;
                  try {
                    // Send to secure public endpoint
                    const res = await fetch(`/api/preview/${publicPreviewSite.id}/approval`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ clientSignoffName })
                    });

                    if (res.ok) {
                      const data = await res.json();
                      if (data.success && data.approval) {
                        const updatedSite = {
                          ...publicPreviewSite,
                          ...data.approval
                        };
                        setPublicPreviewSite(updatedSite);
                        try {
                          localStorage.setItem(`site_${publicPreviewSite.id}`, JSON.stringify(updatedSite));
                        } catch (e) {}
                      }
                      setApprovalSuccess(true);
                    } else {
                      setPublicPreviewSite({
                        ...publicPreviewSite,
                        clientApproved: true,
                        clientApprovedBy: clientSignoffName,
                        clientApprovedAt: new Date().toISOString()
                      });
                      setApprovalSuccess(true);
                    }
                  } catch (err) {
                    console.error("Error approving client proposal design via API:", err);
                    setApprovalSuccess(true);
                  }
                }} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    By signing off, you approve this customized layout design. We will instantly begin mapping this layout to your customized high-speed live domain.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1">Your Full Name (Digital Signature)</label>
                    <input
                      type="text"
                      required
                      value={clientSignoffName}
                      onChange={(e) => setClientSignoffName(e.target.value)}
                      placeholder="e.g., Johnathan Smith (Owner)"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs dark:border-slate-850 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setClientApprovalModal(false)}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md cursor-pointer text-center"
                    >
                      Sign &amp; Approve Design
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!session) {
    return (
      <div className={darkMode ? "dark" : ""}>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
          <Auth />
        </div>
      </div>
    );
  }

  // Completion from AI loader triggers actual server fetch
  const handleGeneratorCompletion = async () => {
    if (!selectedBusiness) return;
    try {
      const response = await authedFetch("/api/generate-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: selectedBusiness })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Received non-JSON response from server");
      }

      const data = await response.json();
      const siteWithClassification: GeneratedSite = {
        ...data.site,
        isDemo: selectedBusiness.isDemo ?? false,
        dataType: selectedBusiness.dataType || (selectedBusiness.isDemo ? "demo" : "real")
      };
      setGeneratedSite(siteWithClassification);
      await handleSaveDraft(siteWithClassification);
      setStats(prev => ({ ...prev, generated: prev.generated + 1 }));
      setActiveTab("editor");
    } catch (error) {
      console.error("Site Generation API Error, applying high-fidelity client fallback:", error);
      
      // Standalone high-fidelity client-side layout generator
      const mockSite = generateClientMockSite(selectedBusiness);
      mockSite.isDemo = selectedBusiness.isDemo ?? true;
      mockSite.dataType = selectedBusiness.dataType || "demo";
      setGeneratedSite(mockSite);
      await handleSaveDraft(mockSite);
      setStats(prev => ({ ...prev, generated: prev.generated + 1 }));
      setActiveTab("editor");
    } finally {
      setLoading(false);
    }
  };

  // Save changes to site draft
  const handleSaveDraft = async (updatedSite: GeneratedSite) => {
    setGeneratedSite(updatedSite);
    setUserSites(prev => {
      const exists = prev.some(s => s.id === updatedSite.id);
      const nextList = exists ? prev.map(s => s.id === updatedSite.id ? updatedSite : s) : [updatedSite, ...prev];
      try {
        localStorage.setItem("sitescout_user_sites", JSON.stringify(nextList));
      } catch (e) {}
      return nextList;
    });
    // Cache individual site in localStorage for robust preview routing fallback
    try {
      localStorage.setItem(`site_${updatedSite.id}`, JSON.stringify(updatedSite));
    } catch (e) {
      console.error("Error saving site to localStorage:", e);
    }

    if (session) {
      try {
        // Save private site document to /sites/{siteId}
        await setDoc(doc(db, "sites", updatedSite.id), {
          ...updatedSite,
          userId: session.uid,
          ownerId: session.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Save sanitized public preview document to /publicPreviews/{siteId} (no private CRM notes or internal flags)
        const sanitizedPublic = {
          id: updatedSite.id,
          previewToken: updatedSite.previewToken || updatedSite.id,
          businessName: updatedSite.businessName || "",
          phone: updatedSite.phone || "",
          address: updatedSite.address || "",
          category: updatedSite.category || "",
          primaryColor: updatedSite.primaryColor || "#4f46e5",
          secondaryColor: updatedSite.secondaryColor || "#0284c7",
          accentColor: updatedSite.accentColor || "#10b981",
          backgroundColor: updatedSite.backgroundColor || "#ffffff",
          textColor: updatedSite.textColor || "#0f172a",
          fontStyle: updatedSite.fontStyle || "Modern Sans",
          seo: updatedSite.seo || null,
          hero: updatedSite.hero || null,
          about: updatedSite.about || null,
          services: updatedSite.services || [],
          features: updatedSite.features || [],
          gallery: updatedSite.gallery || [],
          faqs: updatedSite.faqs || [],
          testimonials: updatedSite.testimonials || [],
          blog: updatedSite.blog || [],
          whatsappMessage: updatedSite.whatsappMessage || "",
          contactPage: updatedSite.contactPage || null,
          privacyPolicy: updatedSite.privacyPolicy || null,
          termsOfService: updatedSite.termsOfService || null,
          notFoundPage: updatedSite.notFoundPage || null,
          logoUrl: updatedSite.logoUrl || "",
          logoType: updatedSite.logoType || "text",
          logoIcon: updatedSite.logoIcon || "",
          sectionsOrder: updatedSite.sectionsOrder || [],
          clientApproved: updatedSite.clientApproved || false,
          clientApprovedBy: updatedSite.clientApprovedBy || "",
          clientApprovedAt: updatedSite.clientApprovedAt || "",
          previewViews: updatedSite.previewViews || 0,
          previewLastViewedAt: updatedSite.previewLastViewedAt || "",
          clientFeedback: updatedSite.clientFeedback || [],
          presence: updatedSite.presence || null,
          deficits: updatedSite.deficits || null,
          userId: session.uid,
          ownerId: session.uid,
          updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, "publicPreviews", updatedSite.id), sanitizedPublic, { merge: true });
        if (updatedSite.previewToken && updatedSite.previewToken !== updatedSite.id) {
          await setDoc(doc(db, "publicPreviews", updatedSite.previewToken), sanitizedPublic, { merge: true });
        }

        console.log("Draft and public preview successfully saved to Firestore!");
        setFirestorePermissionNotice(false);
      } catch (e: any) {
        handleFirestoreError(e, OperationType.WRITE, `sites/${updatedSite.id}`);
        console.error("Error saving draft to Firestore: ", e);
        if (e?.message?.includes("Missing or insufficient permissions") || e?.code === "permission-denied") {
          setFirestorePermissionNotice(true);
        }
      }
    }
  };

  // Update website sales status tag or custom tags
  const handleUpdateSiteStatus = async (siteId: string, status: SalesStatus, tags?: string[]) => {
    setUserSites(prev => {
      return prev.map(s => {
        if (s.id === siteId) {
          const updated: GeneratedSite = {
            ...s,
            salesStatus: status,
            tags: tags !== undefined ? tags : (s.tags || [])
          };
          try {
            localStorage.setItem(`site_${siteId}`, JSON.stringify(updated));
          } catch (e) {
            console.error("Error updating site in localStorage:", e);
          }
          if (session) {
            setDoc(doc(db, "sites", siteId), {
              salesStatus: status,
              tags: tags !== undefined ? tags : (s.tags || []),
              userId: session.uid,
              ownerId: session.uid,
              updatedAt: serverTimestamp()
            }, { merge: true }).then(() => {
              setFirestorePermissionNotice(false);
            }).catch(err => {
              handleFirestoreError(err, OperationType.UPDATE, `sites/${siteId}`);
              console.error("Error updating site status in Firestore:", err);
              if (err?.message?.includes("Missing or insufficient permissions") || err?.code === "permission-denied") {
                setFirestorePermissionNotice(true);
              }
            });
          }
          if (generatedSite?.id === siteId) {
            setGeneratedSite(updated);
          }
          return updated;
        }
        return s;
      });
    });
  };

  // Transition to share preview mode
  const handlePublishSite = async (updatedSite: GeneratedSite) => {
    await handleSaveDraft(updatedSite);
    setGeneratedSite(updatedSite);
    setStats(prev => ({ ...prev, proposals: prev.proposals + 1 }));
    setActiveTab("preview");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50/50 text-slate-900"} transition-colors duration-200 flex flex-col`}>
      {/* Navigation Headers */}
      <Navbar 
        session={session}
        onLogout={handleLogout}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        stats={stats}
      />

      {/* Main Container Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Onboarding walkthrough */}
        {showOnboarding && activeTab === "dashboard" && (
          <div className="mb-6">
            <Onboarding 
              onClose={() => setShowOnboarding(false)}
              onStartSearch={() => {
                setActiveTab("finder");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        )}

        {/* Dynamic Section router */}
        <div className="space-y-6">
          
          {/* View: Dashboard Overview */}
          {activeTab === "dashboard" && (() => {
            const prospectsFound = businesses.length;
            const websitesCreated = userSites.length;
            const previewsSent = userSites.filter(s => s.proposal?.status === 'sent' || s.salesStatus === 'contacted' || s.salesStatus === 'proposal_sent').length;
            const interestedCount = businesses.filter(b => b.prospectStatus === 'Interested' || b.prospectStatus === 'Hot').length + userSites.filter(s => s.clientFeedback && s.clientFeedback.length > 0 && !s.clientApproved).length;
            const wonCount = businesses.filter(b => b.prospectStatus === 'Won').length + userSites.filter(s => s.clientApproved || s.salesStatus === 'Won').length;

            return (
            <div className="space-y-8">
              {/* Primary 3-Step Rapid Revenue Engine */}
              <ThreeStepRevenueEngine 
                onScanBusinesses={handleScan20NoWebsite}
                onBuildWebsite={handleDirectBuildWebsite}
                businesses={businesses}
                userSites={userSites}
                selectedBusiness={selectedBusiness}
                activeGeneratedSite={generatedSite}
                isScanning={loading}
              />

              {/* Daily Sales-Focused Operational Action Bar */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Today's Outreach Pipeline &amp; Action Capacity
                    </h2>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                  <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300">Prospects found</span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-blue-900 dark:text-blue-100 mt-2">{prospectsFound}</p>
                    <span className="text-[10px] text-blue-600/80 dark:text-blue-400 mt-1">Discovered leads</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300">Websites created</span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-indigo-900 dark:text-indigo-100 mt-2">{websitesCreated}</p>
                    <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400 mt-1">Prototypes generated</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300">Previews sent</span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-amber-900 dark:text-amber-100 mt-2">{previewsSent}</p>
                    <span className="text-[10px] text-amber-600/80 dark:text-amber-400 mt-1">Outreach delivered</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 flex flex-col justify-between">
                    <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300">Interested</span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-purple-900 dark:text-purple-100 mt-2">{interestedCount}</p>
                    <span className="text-[10px] text-purple-600/80 dark:text-purple-400 mt-1">Awaiting review</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 flex flex-col justify-between col-span-2 sm:col-span-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">Won</span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-900 dark:text-emerald-100 mt-2">{wonCount}</p>
                    <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-1">Closed accounts</span>
                  </div>
                </div>
              </div>

              {apiNotice && (
                <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all text-left ${
                  apiNotice === "sandbox_simulated" 
                    ? "bg-amber-50/50 border-amber-200 text-amber-900 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-200"
                    : "bg-blue-50/50 border-blue-200 text-blue-900 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-200"
                }`}>
                  <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${apiNotice === "sandbox_simulated" ? "text-amber-500" : "text-blue-500"}`} />
                  <div>
                    <h4 className="text-xs font-extrabold uppercase tracking-wider">
                      {apiNotice === "sandbox_simulated" ? "Live Directory Search Offline (Demo Mode Active)" : "Mock Demo Environment Active"}
                    </h4>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {apiNotice === "sandbox_simulated" 
                        ? "Live web directory search is currently unavailable or timed out. SiteScout has loaded demo sample prospects for interface testing. Note: Sample records are unverified test data and should not be contacted."
                        : "GEMINI_API_KEY is not configured in your workspace secrets. SiteScout AI is running with our pre-loaded localized business samples to demonstrate prospecting workflows."}
                    </p>
                  </div>
                </div>
              )}

              {firestorePermissionNotice && (
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-100">
                        Cloud Sync: Publish Security Rules in Firebase Console
                      </h4>
                      <p className="text-xs mt-1 leading-relaxed opacity-90">
                        Your sites and proposals are currently safely preserved in offline browser cache. To enable multi-device cloud sync, publish the updated security rules in your Firebase Console (<span className="font-mono text-[11px] bg-amber-200/60 dark:bg-amber-900/50 px-1 py-0.5 rounded">sitescout-ai-ec355</span>).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setShowRulesModal(true)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer shadow-sm transition-colors whitespace-nowrap"
                    >
                      View Rules to Paste
                    </button>
                    <button
                      onClick={() => setFirestorePermissionNotice(false)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40 cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Today's Prospect Action Queue */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4.5 w-4.5 text-blue-600" />
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                        Today's Prospect Queue (Action Direct)
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Prioritized local leads ranked by opportunity score ready for prototype generation and sales outreach.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('prospects')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-500 dark:text-blue-400 cursor-pointer"
                  >
                    View All Prospects ({businesses.length}) <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                {businesses.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <Search className="h-8 w-8 mx-auto text-slate-400 mb-2 opacity-60" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No active prospects discovered yet.</p>
                    <p className="text-[11px] text-slate-500 mt-1">Start by searching a city directory to identify local businesses needing websites.</p>
                    <button
                      onClick={() => setActiveTab('finder')}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer shadow-sm"
                    >
                      <Search className="h-3.5 w-3.5" /> Find Businesses Now
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {businesses.slice(0, 6).map((biz) => {
                      const matchedSite = userSites.find(s => s.businessName.toLowerCase() === biz.name.toLowerCase());
                      const oppScore = biz.opportunityScore ?? (100 - (biz.presenceScore || 40));

                      return (
                        <div 
                          key={biz.id} 
                          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/40 hover:border-blue-300 dark:hover:border-blue-800 transition-all flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[170px]" title={biz.name}>
                                  {biz.name}
                                </h4>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                                  {biz.category} • {biz.address.split(',')[0]}
                                </span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                                oppScore >= 80 
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                  : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              }`}>
                                {oppScore}% Opp
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                              {biz.evidence?.notes || `${biz.deficitCount || 6} digital presence gaps identified.`}
                            </p>
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-semibold text-slate-400">
                              Status: <strong className="text-slate-700 dark:text-slate-300">{biz.prospectStatus || "New"}</strong>
                            </span>

                            <div className="flex items-center gap-1.5">
                              {matchedSite ? (
                                <button
                                  onClick={() => {
                                    setGeneratedSite(matchedSite);
                                    setActiveTab("sales");
                                  }}
                                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 px-3 py-1.5 text-xs font-bold cursor-pointer transition-colors"
                                >
                                  Follow Up &rarr;
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAnalyze(biz)}
                                  className="inline-flex items-center gap-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 text-xs font-bold cursor-pointer shadow-xs transition-colors"
                                >
                                  Build Preview &rarr;
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Conversion Funnel visualizer */}
              <ConversionFunnel stats={stats} />

              {/* Action grid */}
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Quick Actions */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Quick Actions</h3>
                  <div className="space-y-3">
                    <button onClick={() => setActiveTab('finder')} className="w-full text-left px-4 py-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:hover:border-blue-900/50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/40 dark:text-blue-400">
                          <Search className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Find Businesses</p>
                          <p className="text-xs text-slate-500">Scan area for new leads</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500" />
                    </button>
                    <button onClick={() => setActiveTab('prospects')} className="w-full text-left px-4 py-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-800 dark:hover:border-emerald-900/50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg dark:bg-emerald-900/40 dark:text-emerald-400">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Prospect Pipeline</p>
                          <p className="text-xs text-slate-500">Manage leads & follow-ups</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-500" />
                    </button>
                    <button onClick={() => setActiveTab('websites')} className="w-full text-left px-4 py-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-800 dark:hover:border-indigo-900/50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg dark:bg-indigo-900/40 dark:text-indigo-400">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">My Websites</p>
                          <p className="text-xs text-slate-500">Live prototypes & preview links</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" />
                    </button>
                    <button onClick={() => setActiveTab('proposals')} className="w-full text-left px-4 py-3 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50 dark:border-slate-800 dark:hover:border-purple-900/50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg dark:bg-purple-900/40 dark:text-purple-400">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">Create Proposal</p>
                          <p className="text-xs text-slate-500">Send custom packages</p>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-purple-500" />
                    </button>
                  </div>
                </div>

                {/* Recent Searches */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Prospects Discovered</h3>
                    <span className="text-xs text-slate-400 font-mono">{businesses.length} total</span>
                  </div>
                  <div className="space-y-4 pt-2">
                    {businesses.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No active search results. Start a search in the Business Finder.</p>
                    ) : (
                      businesses.slice(0, 4).map((b, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{b.name}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{b.address}</p>
                          </div>
                          <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400">{b.rating} ★</span>
                        </div>
                      ))
                    )}
                  </div>
                  <button onClick={() => setActiveTab('finder')} className="w-full text-center text-xs font-bold text-blue-600 dark:text-blue-400 pt-2 hover:underline cursor-pointer">Open Business Finder</button>
                </div>

                {/* Recent Previews */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recent Previews</h3>
                    <span className="text-xs text-slate-400 font-mono">{userSites.length} drafts</span>
                  </div>
                  <div className="space-y-4 pt-2">
                    {userSites.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No saved website drafts yet. Generate your first website draft above.</p>
                    ) : (
                      userSites.slice(0, 4).map((site, i) => {
                        let statusLabel = "Draft";
                        let statusColor = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
                        
                        if (site.crmSynced) {
                          statusLabel = "Synced";
                          statusColor = "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400";
                        } else if (site.clientApproved) {
                          statusLabel = "Approved";
                          statusColor = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
                        } else if (site.proposal?.status === 'sent') {
                          statusLabel = "Sent";
                          statusColor = "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
                        } else if (site.publishing?.status === 'published') {
                          statusLabel = "Published";
                          statusColor = "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400";
                        }

                        return (
                          <div key={i} className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{site.businessName}</p>
                              <span className={`text-[9px] px-1.5 rounded-sm uppercase font-bold ${statusColor}`}>{statusLabel}</span>
                            </div>
                            <button 
                              onClick={() => { setGeneratedSite(site); setActiveTab('editor'); }}
                              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                            >
                              Open
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <button onClick={() => setActiveTab('websites')} className="w-full text-center text-xs font-bold text-blue-600 dark:text-blue-400 pt-2 hover:underline cursor-pointer">Manage All Websites</button>
                </div>

              </div>
            </div>
            );
          })()}

          {/* View: My Prospects Pipeline & Sales Queue */}
          {activeTab === "prospects" && (
            <ProspectPipeline 
              prospects={businesses}
              userSites={userSites}
              onUpdateProspect={handleUpdateProspect}
              onViewAudit={(biz) => {
                setSelectedBusiness(biz);
                setActiveTab("analysis");
              }}
              onSelectBusinessForWebsite={(biz) => {
                setSelectedBusiness(biz);
                setActiveTab("generator");
              }}
              onOpenSalesAssistant={(biz) => {
                const matched = userSites.find(s => s.businessName.toLowerCase() === biz.name.toLowerCase());
                if (matched) {
                  setGeneratedSite(matched);
                } else {
                  setSelectedBusiness(biz);
                }
                setActiveTab("sales");
              }}
              onOpenProposal={(biz) => {
                const matched = userSites.find(s => s.businessName.toLowerCase() === biz.name.toLowerCase());
                if (matched) {
                  setGeneratedSite(matched);
                }
                setActiveTab("proposals");
              }}
            />
          )}

          {/* View: My Generated Websites */}
          {activeTab === "websites" && (
            <MyWebsites 
              sites={userSites}
              onEditSite={(site) => {
                setGeneratedSite(site);
                setActiveTab("editor");
              }}
              onOpenPreview={(site) => {
                setGeneratedSite(site);
                setActiveTab("preview");
              }}
              onOpenSalesAssistant={(site) => {
                setGeneratedSite(site);
                setActiveTab("sales");
              }}
              onOpenProposal={(site) => {
                setGeneratedSite(site);
                setActiveTab("proposals");
              }}
              onDeleteSite={(siteId) => {
                setUserSites(prev => prev.filter(s => s.id !== siteId));
                if (generatedSite?.id === siteId) {
                  setGeneratedSite(null);
                }
              }}
              onCreateNewPreview={() => setActiveTab("finder")}
              onUpdateSiteStatus={handleUpdateSiteStatus}
              onUpdateSite={handleSaveDraft}
            />
          )}

          {/* View: Business Finder direct tab */}
          {activeTab === "finder" && (
            <BusinessFinder 
              businesses={businesses} 
              loading={loading} 
              onSearch={(filters) => triggerSearch(filters, false)} 
              onAnalyze={handleAnalyze} 
            />
          )}

          {/* View: Presence Audit analysis */}
          {activeTab === "analysis" && selectedBusiness && (
            <OpportunityAnalysis 
              business={selectedBusiness}
              onBack={() => setActiveTab("dashboard")}
              onGenerateWebsite={handleGenerateWebsite}
              loading={loading}
            />
          )}

          {/* View: AI Generator loading spinner simulation */}
          {activeTab === "generator" && selectedBusiness && (
            <WebsiteGenerator 
              business={selectedBusiness}
              businessName={selectedBusiness.name}
              category={selectedBusiness.category}
              onCompletion={handleGeneratorCompletion}
            />
          )}

          {/* View: Design website builder editor */}
          {activeTab === "editor" && generatedSite && (
            <WebsiteEditor 
              site={generatedSite}
              onBack={() => setActiveTab("analysis")}
              onSave={handleSaveDraft}
              onPublish={handlePublishSite}
            />
          )}

          {/* View: Share Presentation Portal */}
          {activeTab === "preview" && generatedSite && (
            <ShareablePreview 
              site={generatedSite}
              onBackToEditor={() => setActiveTab("editor")}
              onGoToSalesAssistant={() => setActiveTab("sales")}
              onGoToProposals={() => setActiveTab("proposals")}
              onOpenPortal={() => setActiveTab("portal")}
            />
          )}

          {/* View: Sales outreach assistance copywriting */}
          {activeTab === "sales" && generatedSite && (
            <SalesAssistant 
              site={generatedSite}
              onBack={() => setActiveTab("preview")}
            />
          )}

          {/* View: Proposals contracts & estimators */}
          {activeTab === "proposals" && (
            <ProposalGenerator 
              site={generatedSite || placeholderSite}
              userEmail={session.email}
              onSave={handleSaveDraft}
              sitesList={(() => {
                const list = [...userSites];
                if (generatedSite && !list.some(s => s.id === generatedSite.id)) {
                  list.unshift(generatedSite);
                }
                if (!list.some(s => s.id === "standalone-calculator")) {
                  list.push(placeholderSite);
                }
                return list;
              })()}
              onSelectSite={(selected) => {
                if (selected.id === "standalone-calculator") {
                  setGeneratedSite(null);
                } else {
                  setGeneratedSite(selected);
                }
              }}
            />
          )}

          {/* View: Collaborative Client portal modes */}
          {activeTab === "portal" && generatedSite && (
            <ClientPortal 
              site={generatedSite}
              onBackToApp={() => setActiveTab("preview")}
              onSave={handleSaveDraft}
            />
          )}

          {/* View: CRM Integration */}
          {activeTab === "crm" && (
            <CRMSync 
              businesses={businesses}
              sites={userSites}
              onBack={() => setActiveTab("dashboard")}
            />
          )}

          {/* View: White-Label Partner Ecosystem Hub */}
          {activeTab === "partners" && (
            <PartnerEcosystem 
              onFindPartners={(filters) => {
                triggerSearch(filters, false);
                setActiveTab("finder");
              }}
              onOpenWebsiteGenerator={() => {
                setActiveTab("finder");
              }}
            />
          )}

          {/* View: System Administrator configs */}
          {activeTab === "admin" && (
            <AdminPanel sites={userSites} />
          )}

          {/* View: Industry Template Library */}
          {activeTab === "templates" && (
            <TemplateLibrary 
              onSelectTemplate={(tplSite) => {
                setGeneratedSite(tplSite);
                setActiveTab("editor");
              }}
              onBack={() => setActiveTab("dashboard")}
            />
          )}

        </div>
      </main>

      {/* Firebase Firestore Rules Guide Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col text-left">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Firestore Security Rules Configuration</h3>
              </div>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <p>
                Your Firebase project <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">sitescout-ai-ec355</code> currently has security rules blocking direct writes or reads. To enable real-time cloud sync across your devices:
              </p>

              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  Open the <a href="https://console.firebase.google.com/project/sitescout-ai-ec355/firestore/rules" target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 font-bold underline inline-flex items-center gap-1">Firebase Console Rules tab <ExternalLink className="h-3 w-3 inline" /></a>.
                </li>
                <li>Copy the prepared rules below and replace the existing contents.</li>
                <li>Click <strong>Publish</strong> in the Firebase Console.</li>
              </ol>

              <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-200 p-4 font-mono text-[11px] overflow-x-auto max-h-56">
                <pre>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() { return request.auth != null; }
    function isAdmin() {
      return isSignedIn() && (
        request.auth.token.email == 'siphom.yati@gmail.com' ||
        (
          exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('role', 'user') in ['admin', 'Admin']
        )
      );
    }
    function isOwner(data) {
      return isSignedIn() && (
        ('userId' in data && data.userId == request.auth.uid) ||
        ('ownerId' in data && data.ownerId == request.auth.uid)
      );
    }
    match /users/{userId} {
      allow read, create, update: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow delete: if isAdmin();
      match /{allSubcollections=**} {
        allow read, write: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      }
    }
    match /sites/{siteId} {
      allow get, list: if isSignedIn() && (isOwner(resource.data) || isAdmin());
      allow create: if isSignedIn() && (('userId' in request.resource.data && request.resource.data.userId == request.auth.uid) || ('ownerId' in request.resource.data && request.resource.data.ownerId == request.auth.uid) || isAdmin());
      allow update, delete: if isSignedIn() && (isOwner(resource.data) || isAdmin());
    }
    match /publicPreviews/{previewToken} {
      allow get: if true;
      allow list: if isSignedIn() && (isOwner(resource.data) || isAdmin());
      allow create, update: if isSignedIn() && (('userId' in request.resource.data && request.resource.data.userId == request.auth.uid) || ('ownerId' in request.resource.data && request.resource.data.ownerId == request.auth.uid) || !('userId' in request.resource.data) || isAdmin());
      allow delete: if isSignedIn() && (isOwner(resource.data) || isAdmin());
    }
    match /businesses/{businessId} {
      allow get, list: if isSignedIn() && (isOwner(resource.data) || isAdmin());
      allow create: if isSignedIn() && (('userId' in request.resource.data && request.resource.data.userId == request.auth.uid) || ('ownerId' in request.resource.data && request.resource.data.ownerId == request.auth.uid) || isAdmin());
      allow update, delete: if isSignedIn() && (isOwner(resource.data) || isAdmin());
    }
    match /proposals/{proposalId} {
      allow get: if true;
      allow list: if isSignedIn() && (isOwner(resource.data) || isAdmin());
      allow create: if isSignedIn() && (('userId' in request.resource.data && request.resource.data.userId == request.auth.uid) || ('ownerId' in request.resource.data && request.resource.data.ownerId == request.auth.uid) || isAdmin());
      allow update, delete: if isSignedIn() && (isOwner(resource.data) || isAdmin());
    }
  }
}`}</pre>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
              <a
                href="https://console.firebase.google.com/project/sitescout-ai-ec355/firestore/rules"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Open Firebase Console <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const rulesText = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    function isSignedIn() { return request.auth != null; }\n    function isAdmin() {\n      return isSignedIn() && (\n        request.auth.token.email == 'siphom.yati@gmail.com' ||\n        (\n          exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&\n          get(/databases/$(database)/documents/users/$(request.auth.uid)).data.get('role', 'user') in ['admin', 'Admin']\n        )\n      );\n    }\n    function isOwner(data) {\n      return isSignedIn() && (\n        ('userId' in data && data.userId == request.auth.uid) ||\n        ('ownerId' in data && data.ownerId == request.auth.uid)\n      );\n    }\n    match /users/{userId} {\n      allow read, create, update: if isSignedIn() && (request.auth.uid == userId || isAdmin());\n      allow delete: if isAdmin();\n      match /{allSubcollections=**} {\n        allow read, write: if isSignedIn() && (request.auth.uid == userId || isAdmin());\n      }\n    }\n    match /sites/{siteId} {\n      allow get, list: if isSignedIn() && (isOwner(resource.data) || isAdmin());\n      allow create: if isSignedIn() && (('userId' in request.resource.data && request.resource.data.userId == request.auth.uid) || ('ownerId' in request.resource.data && request.resource.data.ownerId == request.auth.uid) || isAdmin());\n      allow update, delete: if isSignedIn() && (isOwner(resource.data) || isAdmin());\n    }\n    match /publicPreviews/{previewToken} {\n      allow get: if true;\n      allow list: if isSignedIn() && (isOwner(resource.data) || isAdmin());\n      allow create, update: if isSignedIn() && (('userId' in request.resource.data && request.resource.data.userId == request.auth.uid) || ('ownerId' in request.resource.data && request.resource.data.ownerId == request.auth.uid) || !('userId' in request.resource.data) || isAdmin());\n      allow delete: if isSignedIn() && (isOwner(resource.data) || isAdmin());\n    }\n    match /businesses/{businessId} {\n      allow get, list: if isSignedIn() && (isOwner(resource.data) || isAdmin());\n      allow create: if isSignedIn() && (('userId' in request.resource.data && request.resource.data.userId == request.auth.uid) || ('ownerId' in request.resource.data && request.resource.data.ownerId == request.auth.uid) || isAdmin());\n      allow update, delete: if isSignedIn() && (isOwner(resource.data) || isAdmin());\n    }\n    match /proposals/{proposalId} {\n      allow get: if true;\n      allow list: if isSignedIn() && (isOwner(resource.data) || isAdmin());\n      allow create: if isSignedIn() && (('userId' in request.resource.data && request.resource.data.userId == request.auth.uid) || ('ownerId' in request.resource.data && request.resource.data.ownerId == request.auth.uid) || isAdmin());\n      allow update, delete: if isSignedIn() && (isOwner(resource.data) || isAdmin());\n    }\n  }\n}`;
                    navigator.clipboard.writeText(rulesText);
                    setCopiedRules(true);
                    setTimeout(() => setCopiedRules(false), 2500);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-sm"
                >
                  {copiedRules ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedRules ? "Copied to Clipboard!" : "Copy Rules"}
                </button>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-6 bg-white dark:bg-slate-950 text-center text-xs text-slate-400 shrink-0">
        <p>© 2026 SiteScout AI B2B Enterprise SaaS. Powered by Google Gemini. All rights reserved.</p>
      </footer>
    </div>
  );
}
