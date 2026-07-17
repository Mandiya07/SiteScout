import { signOut } from "firebase/auth";
import { auth, db, setDoc, getDoc, doc, serverTimestamp } from "./lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useState, useEffect } from "react";
import { Business, GeneratedSite, UserSession, SearchFilters } from "./types";
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
import { 
  Search, Globe, Award, Trophy, User, MessageSquare, Phone, MapPin, 
  CheckCircle2, AlertTriangle, ShieldCheck, HeartCrack, Flame, TrendingUp, Users, ArrowRight, BookOpen
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
    title: "Premium Local Repairs & Same-Day Services Done Right",
    subtitle: "Austin's most trusted, fully licensed technicians specializing in professional residential & commercial maintenance. 100% satisfaction guaranteed.",
    ctaPrimary: "Request Callback",
    ctaSecondary: "View Services Deck"
  },
  about: {
    title: "Dedicated Craftsmanship Since 2012",
    history: "Founded as a family-operated local workshop, we've expanded to a dedicated crew of emergency specialists serving home and business owners across the state.",
    mission: "To deliver dependable, honest, and high-performance repair services with transparent pricing and zero hidden fees.",
    pitch: "We know that emergency breakdowns don't wait for business hours. That is why our active dispatch teams are on call 24/7 to provide immediate, fully insured solutions."
  },
  services: [
    { title: "24/7 Emergency Repairs", description: "Immediate diagnostic assessment and priority repairs for structural, electrical, and plumbing emergencies.", price: "$149" },
    { title: "Commercial System Inspections", description: "Comprehensive safety, thermal efficiency, and regulatory compliance checks for corporate properties.", price: "$299" }
  ],
  features: [
    { title: "Fully Licensed & Insured", icon: "ShieldCheck", description: "Our team operates with comprehensive local credentials and liability assurance." },
    { title: "24-Hour Emergency Dispatch", icon: "Clock", description: "Active call hotlines and rapid-response vehicles ready to deploy at any hour." }
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

          // Fetch from Firestore
          const docRef = doc(db, "sites", siteId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as GeneratedSite;
            setPublicPreviewSite(data);
            try {
              localStorage.setItem(`site_${siteId}`, JSON.stringify(data));
            } catch (e) {}
          } else {
            setPublicPreviewError("The requested website draft presentation could not be found or has expired.");
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
  const [userSites, setUserSites] = useState<GeneratedSite[]>([]);

  // Load user's saved sites from Firestore
  useEffect(() => {
    if (session) {
      const fetchUserSites = async () => {
        try {
          const q = query(collection(db, "sites"), where("userId", "==", session.uid));
          const querySnapshot = await getDocs(q);
          const sitesList: GeneratedSite[] = [];
          querySnapshot.forEach((doc) => {
            sitesList.push(doc.data() as GeneratedSite);
          });
          setUserSites(sitesList);
          // If no active generatedSite is set but sites exist, default to the first one
          if (!generatedSite && sitesList.length > 0) {
            setGeneratedSite(sitesList[0]);
          }
        } catch (e) {
          console.error("Error fetching user sites:", e);
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
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters)
      });
      const data = await response.json();
      setBusinesses(data.businesses || []);
      
      if (data.source === "error_fallback") {
        setApiNotice("sandbox_simulated");
      } else if (data.source === "mock_fallback") {
        setApiNotice("mock_simulated");
      } else {
        setApiNotice(null);
      }

      if (!isInitial) {
        setStats(prev => ({ ...prev, found: prev.found + (data.businesses?.length || 0) }));
      }
    } catch (error) {
      console.error("Search API Error:", error);
      setApiNotice("sandbox_simulated");
    } finally {
      if (!isInitial) setLoading(false);
    }
  };

  // Analyze a specific business profile
  const handleAnalyze = async (biz: Business) => {
    setLoading(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: biz })
      });
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
      console.error("Analysis API Error:", error);
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
                <div className="flex-grow flex flex-col overflow-y-auto">
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
                    // Save feedback list securely in site document
                    const docRef = doc(db, "sites", publicPreviewSite.id);
                    await setDoc(docRef, {
                      clientFeedback: [
                        ...(publicPreviewSite.clientFeedback || []),
                        { message: feedbackMessage, timestamp: new Date().toISOString(), status: "pending" }
                      ]
                    }, { merge: true });
                    setFeedbackSuccess(true);
                  } catch (err) {
                    console.error("Error submitting client feedback:", err);
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
                    // Update layout to 'approved' in Firestore
                    const docRef = doc(db, "sites", publicPreviewSite.id);
                    await setDoc(docRef, {
                      clientApproved: true,
                      clientApprovedBy: clientSignoffName,
                      clientApprovedAt: new Date().toISOString()
                    }, { merge: true });
                    setApprovalSuccess(true);
                  } catch (err) {
                    console.error("Error approving client proposal design:", err);
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
      const response = await fetch("/api/generate-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business: selectedBusiness })
      });
      const data = await response.json();
      setGeneratedSite(data.site);
      await handleSaveDraft(data.site);
      setStats(prev => ({ ...prev, generated: prev.generated + 1 }));
      setActiveTab("editor");
    } catch (error) {
      console.error("Site Generation API Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Save changes to site draft
  const handleSaveDraft = async (updatedSite: GeneratedSite) => {
    setGeneratedSite(updatedSite);
    setUserSites(prev => {
      const exists = prev.some(s => s.id === updatedSite.id);
      if (exists) {
        return prev.map(s => s.id === updatedSite.id ? updatedSite : s);
      } else {
        return [updatedSite, ...prev];
      }
    });
    // Cache in localStorage for robust preview routing fallback
    try {
      localStorage.setItem(`site_${updatedSite.id}`, JSON.stringify(updatedSite));
    } catch (e) {
      console.error("Error saving site to localStorage:", e);
    }

    if (session) {
      try {
        await setDoc(doc(db, "sites", updatedSite.id), {
          ...updatedSite,
          userId: session.uid,
          updatedAt: serverTimestamp()
        }, { merge: true });
        console.log("Draft successfully saved to Firestore!");
      } catch (e) {
        console.error("Error saving draft to Firestore: ", e);
      }
    }
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
                const element = document.getElementById("search-control-panel");
                if (element) element.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>
        )}

        {/* Dynamic Section router */}
        <div className="space-y-6">
          
          {/* View: Dashboard Overview */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Upper Stats bar */}
              <div className="grid gap-4 sm:grid-cols-5">
                {[
                  { title: "Businesses Found", count: stats.found, icon: Search, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40" },
                  { title: "Previews Generated", count: stats.generated, icon: Globe, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" },
                  { title: "Proposals Created", count: stats.proposals, icon: BookOpen, color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40" },
                  { title: "Clients Won", count: stats.won, icon: Trophy, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
                  { title: "Conversion Rate", count: stats.proposals > 0 ? ((stats.won / stats.proposals) * 100).toFixed(1) + "%" : "0%", icon: TrendingUp, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40" }
                ].map((st, i) => {
                  const Icon = st.icon;
                  return (
                    <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 text-left transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">{st.title}</span>
                        <div className={`p-2 rounded-xl ${st.color}`}>
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                      </div>
                      <p className="text-3xl font-black mt-2 text-slate-900 dark:text-white font-mono">{st.count}</p>
                    </div>
                  );
                })}
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
                      {apiNotice === "sandbox_simulated" ? "High-Fidelity Sandbox Enabled" : "Mock Demo Environment Active"}
                    </h4>
                    <p className="text-xs mt-1 leading-relaxed opacity-90">
                      {apiNotice === "sandbox_simulated" 
                        ? "SiteScout's upstream API is currently under extremely high demand. We've seamlessly switched to our high-fidelity, offline sandbox simulator. All find-build-close loops remain fully active with high-quality localized business prospects!"
                        : "GEMINI_API_KEY is not configured in your workspace secrets. SiteScout AI is running with our beautiful pre-loaded localized business simulator to demonstrate elite lead-generation workflows."}
                    </p>
                  </div>
                </div>
              )}

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
                    <button onClick={() => { if(generatedSite) setActiveTab('preview'); else setActiveTab('finder'); }} className="w-full text-left px-4 py-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-800 dark:hover:border-indigo-900/50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg dark:bg-indigo-900/40 dark:text-indigo-400">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">View Previews</p>
                          <p className="text-xs text-slate-500">Check generated websites</p>
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
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recent Searches</h3>
                  <div className="space-y-4 pt-2">
                    {businesses.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No active search results. Start a search in the Business Finder.</p>
                    ) : (
                      businesses.slice(0, 3).map((b, i) => (
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
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Recent Previews</h3>
                  <div className="space-y-4 pt-2">
                    {userSites.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">No saved website drafts yet. Generate your first website draft above.</p>
                    ) : (
                      userSites.slice(0, 3).map((site, i) => (
                        <div key={i} className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{site.businessName}</p>
                            <span className="text-[9px] px-1.5 rounded-sm uppercase font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Draft</span>
                          </div>
                          <button 
                            onClick={() => { setGeneratedSite(site); setActiveTab('editor'); }}
                            className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
                          >
                            Open
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
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

          {/* View: System Administrator configs */}
          {activeTab === "admin" && (
            <AdminPanel />
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

      {/* Footer copyright */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 py-6 bg-white dark:bg-slate-950 text-center text-xs text-slate-400 shrink-0">
        <p>© 2026 SiteScout AI B2B Enterprise SaaS. Powered by Google Gemini. All rights reserved.</p>
      </footer>
    </div>
  );
}
