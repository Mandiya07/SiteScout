import { useState, useEffect } from "react";
import { GeneratedSite, ServiceItem, FAQItem } from "../types";
import WebsiteView from "./WebsiteView";
import PublishingModal from "./PublishingModal";
import { 
  Laptop, Smartphone, Eye, EyeOff, Settings2, Sparkles, Check, 
  Trash2, Plus, ArrowLeft, ArrowRight, Save, Globe, 
  MapPin, Phone, MessageSquare, ChevronDown, ChevronUp, CheckCircle, Info,
  Undo2, Redo2, ArrowUp, ArrowDown, Image as ImageIcon, Scissors, ShieldCheck, 
  HelpCircle, Briefcase, Home, Camera, Utensils, Wrench, HeartPulse, Scale, Star, Heart
} from "lucide-react";

interface WebsiteEditorProps {
  site: GeneratedSite;
  onBack: () => void;
  onSave: (updatedSite: GeneratedSite) => void;
  onPublish: (updatedSite: GeneratedSite) => void;
}

const sectionLabels: Record<string, string> = {
  hero: "Hero Banner",
  features: "Why Choose Us (Bento Features)",
  services: "Our Specialized Packages",
  about: "About & Core Mission",
  testimonials: "Client Testimonials & Reviews",
  faqs: "Frequently Asked Questions",
  gallery: "Visual Asset Gallery",
  blog: "Latest News & Blog",
  contact: "Interactive Contact Page"
};

export default function WebsiteEditor({
  site: initialSite,
  onBack,
  onSave,
  onPublish
}: WebsiteEditorProps) {
  // Initialize state with fallback layout parameters
  const [site, setSite] = useState<GeneratedSite>(() => {
    const s = { ...initialSite };
    if (!s.sectionsOrder) {
      s.sectionsOrder = ["hero", "features", "services", "about", "testimonials", "faqs", "gallery", "blog", "contact"];
    }
    if (!s.logoType) {
      s.logoType = "text";
    }
    if (!s.logoIcon) {
      s.logoIcon = "Sparkles";
    }
    return s;
  });

  const [viewport, setViewport] = useState<"desktop" | "mobile" | "seo">("desktop");
  const [activeSection, setActiveSection] = useState<string>("sections");
  const [activePage, setActivePage] = useState<"home" | "about" | "services" | "gallery" | "blog" | "contact" | "privacy" | "terms" | "404">("home");
  const [saveStatus, setSaveStatus] = useState<string>("");
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);

  // Undo / Redo stacks
  const [history, setHistory] = useState<GeneratedSite[]>([
    JSON.parse(JSON.stringify({
      ...initialSite,
      sectionsOrder: initialSite.sectionsOrder || ["hero", "features", "services", "about", "testimonials", "faqs", "gallery", "blog", "contact"],
      logoType: initialSite.logoType || "text",
      logoIcon: initialSite.logoIcon || "Sparkles"
    }))
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Helper to append a state checkpoint
  const commitHistory = (newSite: GeneratedSite) => {
    const cleanedHistory = history.slice(0, historyIndex + 1);
    const lastState = cleanedHistory[cleanedHistory.length - 1];
    
    // Check if anything has actually changed
    if (JSON.stringify(lastState) !== JSON.stringify(newSite)) {
      const nextHistory = [...cleanedHistory, JSON.parse(JSON.stringify(newSite))];
      setHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setSite(JSON.parse(JSON.stringify(history[prevIndex])));
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setSite(JSON.parse(JSON.stringify(history[nextIndex])));
    }
  };

  // Site state updater
  const handleSiteUpdate = (updatedSite: GeneratedSite, skipHistory = false) => {
    setSite(updatedSite);
    if (!skipHistory) {
      commitHistory(updatedSite);
    }
  };

  // Keyboard shortcut listener for Undo (Ctrl+Z) / Redo (Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [historyIndex, history]);

  // Handle generic text/style update
  const updateField = (section: string, field: string, value: any, skipHistory = true) => {
    let updatedSite: GeneratedSite;
    if (section === "root") {
      updatedSite = { ...site, [field]: value };
    } else {
      updatedSite = {
        ...site,
        [section]: {
          ...(site as any)[section],
          [field]: value
        }
      };
    }
    handleSiteUpdate(updatedSite, skipHistory);
  };

  // Layout modifiers
  const sectionsOrder = site.sectionsOrder || ["hero", "features", "services", "about", "testimonials", "faqs", "gallery", "blog", "contact"];

  const moveSection = (index: number, direction: "up" | "down") => {
    const newOrder = [...sectionsOrder];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target >= 0 && target < newOrder.length) {
      const temp = newOrder[index];
      newOrder[index] = newOrder[target];
      newOrder[target] = temp;
      handleSiteUpdate({ ...site, sectionsOrder: newOrder }, false);
    }
  };

  const removeSection = (index: number) => {
    const newOrder = sectionsOrder.filter((_, i) => i !== index);
    handleSiteUpdate({ ...site, sectionsOrder: newOrder }, false);
  };

  const addSection = (sectionId: string) => {
    if (!sectionsOrder.includes(sectionId)) {
      const newOrder = [...sectionsOrder, sectionId];
      handleSiteUpdate({ ...site, sectionsOrder: newOrder }, false);
    }
  };

  // Services dynamic editor helpers
  const handleServiceChange = (index: number, field: string, value: any, skipHistory = true) => {
    const updatedServices = [...site.services];
    updatedServices[index] = { ...updatedServices[index], [field]: value };
    handleSiteUpdate({ ...site, services: updatedServices }, skipHistory);
  };

  const addService = () => {
    const updatedServices = [
      ...site.services,
      { title: "New Custom Service Offered", description: "Premium service details customized for client requirements.", price: "$149" }
    ];
    handleSiteUpdate({ ...site, services: updatedServices }, false);
  };

  const removeService = (index: number) => {
    const updatedServices = site.services.filter((_, i) => i !== index);
    handleSiteUpdate({ ...site, services: updatedServices }, false);
  };

  // FAQ dynamic editor helpers
  const handleFaqChange = (index: number, field: string, value: any, skipHistory = true) => {
    const updatedFaqs = [...site.faqs];
    updatedFaqs[index] = { ...updatedFaqs[index], [field]: value };
    handleSiteUpdate({ ...site, faqs: updatedFaqs }, skipHistory);
  };

  const addFaq = () => {
    const updatedFaqs = [
      ...site.faqs,
      { question: "Frequently Asked Question Here?", answer: "Provide helpful response information for customers." }
    ];
    handleSiteUpdate({ ...site, faqs: updatedFaqs }, false);
  };

  const removeFaq = (index: number) => {
    const updatedFaqs = site.faqs.filter((_, i) => i !== index);
    handleSiteUpdate({ ...site, faqs: updatedFaqs }, false);
  };

  // Trigger persistent draft save
  const triggerSave = () => {
    onSave(site);
    setSaveStatus("Changes saved successfully to local draft!");
    setTimeout(() => setSaveStatus(""), 3000);
  };

  // Trigger publish preview
  const triggerPublish = () => {
    onPublish(site);
  };

  // Resolves styling categories to actual CSS families
  const getFontFamilyClass = (style: string) => {
    switch (style) {
      case "serif": return "font-serif";
      case "display": return "font-sans tracking-tight font-black";
      case "modern": return "font-sans uppercase tracking-wider font-semibold";
      default: return "font-sans";
    }
  };

  // Renders beautiful icons mapped from selection ID
  const renderHeaderLogo = () => {
    const logoType = site.logoType || "text";
    if (logoType === "icon") {
      const iconId = site.logoIcon || "Sparkles";
      const logoIcons: Record<string, any> = {
        Sparkles, Wrench, Utensils, HeartPulse, Scale, Briefcase, Home, Camera, Scissors, ShieldCheck
      };
      const SelectedIcon = logoIcons[iconId] || Sparkles;
      return (
        <div className={`text-sm font-bold flex items-center gap-2 ${getFontFamilyClass(site.fontStyle)} cursor-pointer`} style={{ color: site.primaryColor }} onClick={() => setActivePage('home')}>
          <SelectedIcon className="h-5 w-5" style={{ color: site.primaryColor }} />
          <span>{site.businessName}</span>
        </div>
      );
    } else if (logoType === "image" && site.logoUrl) {
      return (
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActivePage('home')}>
          <img src={site.logoUrl} alt={site.businessName} className="h-8 w-auto object-contain max-w-[150px]" referrerPolicy="no-referrer" />
        </div>
      );
    } else {
      return (
        <div className={`text-sm font-bold ${getFontFamilyClass(site.fontStyle)} cursor-pointer`} style={{ color: site.primaryColor }} onClick={() => setActivePage('home')}>
          {site.businessName}
        </div>
      );
    }
  };

  // Modular JSX compiler for website homepage blocks
  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "hero":
        return (
          <section key="hero" className="px-5 py-12 text-center relative overflow-hidden bg-slate-50" style={{ backgroundColor: `${site.primaryColor}05` }}>
            <div className="max-w-xl mx-auto space-y-4">
              <h1 className={`text-2xl sm:text-3xl font-extrabold leading-tight text-slate-900 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                {site.hero.title}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
                {site.hero.subtitle}
              </p>
              {site.hero.imageUrl && (
                <div className="my-4 max-w-lg mx-auto rounded-xl overflow-hidden shadow-sm aspect-video border border-slate-200 bg-white">
                  <img src={site.hero.imageUrl} alt="Hero banner illustration" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <button className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer" style={{ backgroundColor: site.accentColor }}>
                  {site.hero.ctaPrimary}
                </button>
                <button className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 cursor-pointer">
                  {site.hero.ctaSecondary}
                </button>
              </div>
            </div>
          </section>
        );
      case "features":
        return (
          <section key="features" className="p-6 max-w-2xl mx-auto">
            <h3 className={`text-center text-sm font-bold text-slate-400 uppercase tracking-wider mb-5 ${getFontFamilyClass(site.fontStyle)}`}>
              Why Choose Us
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              {site.features?.map((feat, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-center space-y-2 dark:bg-slate-950 dark:border-slate-800">
                  <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    <Check className="h-4.5 w-4.5" />
                  </span>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white font-sans">{feat.title}</h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed font-sans">{feat.description}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case "services":
        return (
          <section key="services" className="p-6 bg-slate-50/50 max-w-2xl mx-auto border-t border-b border-slate-100/50">
            <h3 className={`text-center text-base font-bold text-slate-800 mb-5 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Our Specialized Packages
            </h3>
            <div className="space-y-4">
              {site.services?.map((srv, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center justify-between dark:bg-slate-950 dark:border-slate-800">
                  <div className="text-left space-y-1 pr-4">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white font-sans">{srv.title}</h4>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-sans">{srv.description}</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {srv.price}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );
      case "about":
        return (
          <section key="about" className="p-6 max-w-2xl mx-auto text-center space-y-4">
            <h3 className={`text-base font-bold text-slate-800 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              {site.about.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto font-sans">
              {site.about.history}
            </p>
            <blockquote className="border-l-4 border-slate-200 pl-4 py-1 italic text-xs text-slate-500 text-left max-w-md mx-auto font-sans" style={{ borderLeftColor: site.accentColor }}>
              "{site.about.mission}"
            </blockquote>
          </section>
        );
      case "gallery":
        return site.gallery && (
          <section key="gallery" className="p-6 max-w-2xl mx-auto">
            <h3 className={`text-center text-base font-bold text-slate-800 mb-5 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Gallery
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {site.gallery.map((img, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200">
                  <img src={img.url} alt={img.alt} className="object-cover w-full h-full hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          </section>
        );
      case "testimonials":
        return site.testimonials && (
          <section key="testimonials" className="p-6 max-w-2xl mx-auto">
            <h3 className={`text-center text-sm font-bold text-slate-800 mb-5 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              What Our Clients Say
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {site.testimonials.map((test, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-left dark:bg-slate-950 dark:border-slate-800">
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <svg key={j} className={`w-3 h-3 ${j < test.rating ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-600 italic mb-2 leading-relaxed font-sans">"{test.review}"</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans">- {test.name}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case "faqs":
        return (
          <section key="faqs" className="p-6 bg-slate-50 max-w-2xl mx-auto rounded-t-2xl">
            <h3 className={`text-center text-sm font-bold text-slate-800 mb-5 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Frequently Asked Questions
            </h3>
            <div className="space-y-3">
              {site.faqs?.map((faq, i) => (
                <div key={i} className="bg-white rounded-xl p-3.5 shadow-xs text-left dark:bg-slate-950">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white flex items-center justify-between font-sans">
                    <span>{faq.question}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </h4>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5 pt-1.5 border-t border-slate-50 font-sans">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      case "blog":
        return site.blog && (
          <section key="blog" className="p-6 max-w-2xl mx-auto">
            <h3 className={`text-center text-base font-bold text-slate-800 mb-5 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Latest News & Articles
            </h3>
            <div className="space-y-4">
              {site.blog.map((post, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm text-left dark:bg-slate-950 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 block">{post.category}</span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 font-sans">{post.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">{post.summary}</p>
                  <button className="mt-3 text-[10px] font-bold text-slate-800 dark:text-slate-200 hover:underline">Read More &rarr;</button>
                </div>
              ))}
            </div>
          </section>
        );
      case "contact":
        return site.contactPage && (
          <section key="contact" className="p-6 max-w-2xl mx-auto">
            <h3 className={`text-center text-base font-bold text-slate-800 mb-2 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              {site.contactPage.title}
            </h3>
            <p className="text-xs text-slate-600 text-center mb-6 font-sans">{site.contactPage.description}</p>
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm dark:bg-slate-950 dark:border-slate-800">
               <div className="space-y-3">
                 <input type="text" placeholder="Your Name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                 <input type="email" placeholder="Email Address" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                 <textarea placeholder="Your Message" rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"></textarea>
                 <button className="w-full py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer" style={{ backgroundColor: site.accentColor }}>
                    Send Message
                 </button>
               </div>
            </div>
            <div className="mt-6 flex flex-col items-center gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2 font-sans"><Phone className="h-4 w-4" /> {site.phone}</div>
              <div className="flex items-center gap-2 font-sans"><MapPin className="h-4 w-4" /> {site.address}</div>
              <div className="flex items-center gap-2 font-sans"><MessageSquare className="h-4 w-4" /> {site.contactPage.email}</div>
            </div>
            
            <div className="mt-8 rounded-xl overflow-hidden border border-slate-200 h-48 bg-slate-100 flex items-center justify-center relative">
              <div className="absolute inset-0 opacity-50 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center"></div>
              <div className="relative z-10 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-500" />
                <span className="text-xs font-bold text-slate-800 font-sans">{site.businessName}</span>
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] overflow-hidden">
      {/* Top action control bar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950 px-6 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          
          <div className="hidden md:flex items-center space-x-1 border-l border-slate-200 dark:border-slate-800 pl-3">
            <button
              onClick={handleUndo}
              disabled={historyIndex === 0}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-950 disabled:opacity-30 disabled:pointer-events-none dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-950 disabled:opacity-30 disabled:pointer-events-none dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Live Preview Builder <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded font-semibold dark:bg-blue-900/30 dark:text-blue-300">Editor</span>
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Editing structure for: {site.businessName}</p>
          </div>
        </div>

        {/* Viewport controls */}
        <div className="flex items-center space-x-1.5 rounded-lg bg-slate-200/60 p-1 dark:bg-slate-900">
          <button
            onClick={() => setViewport("desktop")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              viewport === "desktop" ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Laptop className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Desktop</span>
          </button>
          <button
            onClick={() => setViewport("mobile")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              viewport === "mobile" ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Mobile</span>
          </button>
          <button
            onClick={() => setViewport("seo")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
              viewport === "seo" ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Globe className="h-3.5 w-3.5" /> <span className="hidden sm:inline">SEO Panel</span>
          </button>
        </div>

        {/* Draft Saving Status notification */}
        <div className="flex items-center space-x-3">
          {saveStatus && (
            <span className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30 animate-fade-in">
              <CheckCircle className="h-3.5 w-3.5" /> {saveStatus}
            </span>
          )}
          <button
            onClick={triggerSave}
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 transition-all cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" /> Save Draft
          </button>
          <button
            onClick={() => setShowPublishModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-purple-500/10 hover:bg-purple-500 focus:outline-none transition-all cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5" /> Publish Settings
          </button>
          <button
            onClick={triggerPublish}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs shadow-blue-500/10 hover:bg-blue-500 focus:outline-none dark:bg-blue-600 dark:hover:bg-blue-500 transition-all cursor-pointer"
          >
            <Globe className="h-3.5 w-3.5" /> Save &amp; Share
          </button>
        </div>
      </div>

      {/* Main content grid split */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Editorial Drawer (35%) */}
        <div className="w-full md:w-[35%] border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/40 flex flex-col h-full overflow-y-auto">
          {/* Section index select list */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 scrollbar-none overflow-x-auto shrink-0 bg-slate-50/50 dark:bg-slate-950/20">
            {[
              { id: "sections", label: "Layout Sections" },
              { id: "style", label: "Brand Style" },
              { id: "seo", label: "SEO Meta" },
              { id: "hero", label: "Hero Block" },
              { id: "about", label: "About pitch" },
              { id: "services", label: "Packages" },
              { id: "gallery", label: "Gallery Assets" },
              { id: "testimonials", label: "Reviews" },
              { id: "faqs", label: "FAQs" },
              { id: "contact", label: "Contact Details" },
              { id: "legal", label: "Legal Policies" }
            ].map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className={`flex-1 min-w-[90px] py-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
                  activeSection === sec.id
                    ? "border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-400"
                    : "border-transparent text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {sec.label}
              </button>
            ))}
          </div>

          {/* Form edit fields container */}
          <div className="flex-1 p-5 space-y-5">
            {activeSection === "sections" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-50 bg-blue-50/20 p-4 dark:border-blue-900/30 dark:bg-blue-950/10 mb-2">
                  <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1">
                    <Settings2 className="h-3.5 w-3.5" /> Homepage Layout Manager
                  </h4>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400/80 mt-1 leading-relaxed">
                    Toggle section visibility on the home screen, or drag and drop order using simple up/down controls.
                  </p>
                </div>

                {/* Ordered Active Sections list */}
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Active Layout Hierarchy</label>
                  <div className="space-y-2">
                    {sectionsOrder.map((secId, index) => (
                      <div key={secId} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/50 shadow-xs">
                        <div className="text-left">
                          <span className="text-[10px] text-blue-600 font-mono font-bold uppercase tracking-wide">#{index + 1}</span>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{sectionLabels[secId] || secId}</h4>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => moveSection(index, "up")}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none dark:hover:bg-slate-800 cursor-pointer"
                            title="Move Up"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === sectionsOrder.length - 1}
                            onClick={() => moveSection(index, "down")}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none dark:hover:bg-slate-800 cursor-pointer"
                            title="Move Down"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSection(index)}
                            className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 cursor-pointer"
                            title="Hide Section"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inactive Sections list */}
                {Object.keys(sectionLabels).filter(id => !sectionsOrder.includes(id)).length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Available / Hidden Sections</label>
                    <div className="space-y-1.5">
                      {Object.keys(sectionLabels).filter(id => !sectionsOrder.includes(id)).map((secId) => (
                        <div key={secId} className="flex items-center justify-between p-2 px-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30 text-left">
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{sectionLabels[secId] || secId}</span>
                          <button
                            type="button"
                            onClick={() => addSection(secId)}
                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 cursor-pointer"
                          >
                            <Plus className="h-3 w-3" /> Add
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === "style" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-50 bg-blue-50/20 p-4 dark:border-blue-900/30 dark:bg-blue-950/10 mb-2">
                  <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1">
                    <Settings2 className="h-3.5 w-3.5" /> Brand Aesthetic Styling
                  </h4>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400/80 mt-1 leading-relaxed">
                    Personalize colors, typography systems, and high-fidelity custom logos to make this client deal spectacular.
                  </p>
                </div>

                {/* Brand Logo Builder */}
                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/20 space-y-3 dark:border-slate-800">
                  <h4 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">Business Brand Logo</h4>
                  
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Logo Type</label>
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg dark:bg-slate-900">
                      {["text", "icon", "image"].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleSiteUpdate({ ...site, logoType: type as any }, false)}
                          className={`py-1 text-[10px] font-bold rounded capitalize transition-all cursor-pointer ${
                            (site.logoType || "text") === type 
                              ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white" 
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {site.logoType === "icon" && (
                    <div className="space-y-2 animate-fade-in">
                      <label className="text-[10px] font-bold text-slate-500 block">Choose Brand Icon Symbol</label>
                      <div className="grid grid-cols-5 gap-1.5">
                        {[
                          { id: "Sparkles", icon: Sparkles },
                          { id: "Wrench", icon: Wrench },
                          { id: "Utensils", icon: Utensils },
                          { id: "HeartPulse", icon: HeartPulse },
                          { id: "Scale", icon: Scale },
                          { id: "Briefcase", icon: Briefcase },
                          { id: "Home", icon: Home },
                          { id: "Camera", icon: Camera },
                          { id: "Scissors", icon: Scissors },
                          { id: "ShieldCheck", icon: ShieldCheck }
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSiteUpdate({ ...site, logoIcon: item.id }, false)}
                              className={`p-1.5 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                                (site.logoIcon || "Sparkles") === item.id
                                  ? "border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-400"
                                  : "border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                              }`}
                              title={item.id}
                            >
                              <Icon className="h-4 w-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {site.logoType === "image" && (
                    <div className="space-y-2 animate-fade-in">
                      <label className="text-[10px] font-bold text-slate-500 block">Custom Logo Image URL</label>
                      <input
                        type="text"
                        value={site.logoUrl || ""}
                        onChange={(e) => updateField("root", "logoUrl", e.target.value, true)}
                        onBlur={() => commitHistory(site)}
                        placeholder="e.g., https://example.com/logo.png"
                        className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
                      />
                      {site.logoUrl && (
                        <div className="mt-1 h-12 rounded border border-slate-100 bg-white p-1.5 flex items-center justify-center dark:bg-slate-950 dark:border-slate-800">
                          <img src={site.logoUrl} alt="Logo preview" className="h-full w-auto object-contain" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Primary color selector */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Primary Theme Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={site.primaryColor}
                      onChange={(e) => updateField("root", "primaryColor", e.target.value, false)}
                      className="h-8 w-12 rounded cursor-pointer border border-slate-200 shrink-0"
                    />
                    <input
                      type="text"
                      value={site.primaryColor}
                      onChange={(e) => updateField("root", "primaryColor", e.target.value, true)}
                      onBlur={() => commitHistory(site)}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Accent Color selector */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Action Button Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={site.accentColor}
                      onChange={(e) => updateField("root", "accentColor", e.target.value, false)}
                      className="h-8 w-12 rounded cursor-pointer border border-slate-200 shrink-0"
                    />
                    <input
                      type="text"
                      value={site.accentColor}
                      onChange={(e) => updateField("root", "accentColor", e.target.value, true)}
                      onBlur={() => commitHistory(site)}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-mono dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                {/* Font Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Typography Font Pairing</label>
                  <select
                    value={site.fontStyle}
                    onChange={(e) => updateField("root", "fontStyle", e.target.value, false)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="sans">Sleek Sans-Serif (Standard General)</option>
                    <option value="serif">Elegant Editorial Serif (Legal, Luxury)</option>
                    <option value="display">Tech Space Display (Trades, Plumbing)</option>
                    <option value="modern">Minimalist Modern (Spa, Salon)</option>
                  </select>
                </div>

                {/* Header business brand overrides */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Display Business Name</label>
                  <input
                    type="text"
                    value={site.businessName}
                    onChange={(e) => updateField("root", "businessName", e.target.value, true)}
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Contact Call Hotlines</label>
                  <input
                    type="text"
                    value={site.phone}
                    onChange={(e) => updateField("root", "phone", e.target.value, true)}
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
                  />
                </div>
              </div>
            )}

            {activeSection === "seo" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-50 bg-amber-50/20 p-4 dark:border-amber-900/20 dark:bg-amber-950/10">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Info className="h-3.5 w-3.5" /> Built-In SEO Core Tags
                  </h4>
                  <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-1 leading-relaxed">
                    Custom titles and search descriptions used by Google Search crawlers to rank pages local listings.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Google Meta Title</label>
                  <input
                    type="text"
                    value={site.seo.title}
                    onChange={(e) => updateField("seo", "title", e.target.value, true)}
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Meta Search Description</label>
                  <textarea
                    rows={4}
                    value={site.seo.description}
                    onChange={(e) => updateField("seo", "description", e.target.value, true)}
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Target Keywords (Comma-separated)</label>
                  <input
                    type="text"
                    value={site.seo.keywords}
                    onChange={(e) => updateField("seo", "keywords", e.target.value, true)}
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
                  />
                </div>
              </div>
            )}

            {activeSection === "hero" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Hero Bold Headline</label>
                  <textarea
                    rows={3}
                    value={site.hero.title}
                    onChange={(e) => updateField("hero", "title", e.target.value, true)}
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold focus:outline-none leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Hero Subtitle Text</label>
                  <textarea
                    rows={4}
                    value={site.hero.subtitle}
                    onChange={(e) => updateField("hero", "subtitle", e.target.value, true)}
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Primary Action Button Text</label>
                  <input
                    type="text"
                    value={site.hero.ctaPrimary}
                    onChange={(e) => updateField("hero", "ctaPrimary", e.target.value, true)}
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
                  />
                </div>

                {/* Hero Image replacement tool */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Hero Section Background/Featured Image</label>
                  {site.hero.imageUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video mb-2 bg-slate-50">
                      <img src={site.hero.imageUrl} alt="Hero illustration thumbnail" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => updateField("hero", "imageUrl", "", false)}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 rounded-full text-white hover:bg-black transition-all cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-center dark:border-slate-800">
                      <p className="text-[11px] text-slate-400">No Hero image currently active.</p>
                    </div>
                  )}
                  
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={site.hero.imageUrl || ""}
                      onChange={(e) => updateField("hero", "imageUrl", e.target.value, true)}
                      onBlur={() => commitHistory(site)}
                      placeholder="Paste image URL here"
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const stockImages = [
                          "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
                          "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
                          "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
                          "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80",
                          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
                          "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80"
                        ];
                        const randomUrl = stockImages[Math.floor(Math.random() * stockImages.length)];
                        updateField("hero", "imageUrl", randomUrl, false);
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
                    >
                      <Sparkles className="h-3 w-3" /> Pick Category Stock Photo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "about" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">About Section Title</label>
                  <input
                    type="text"
                    value={site.about.title}
                    onChange={(e) => updateField("about", "title", e.target.value, true)}
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-bold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">History Pitch Paragraph</label>
                  <textarea
                    rows={4}
                    value={site.about.history}
                    onChange={(e) => updateField("about", "history", e.target.value, true)}
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Core Mission Statement</label>
                  <textarea
                    rows={3}
                    value={site.about.mission}
                    onChange={(e) => updateField("about", "mission", e.target.value, true)}
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none"
                  />
                </div>
              </div>
            )}

            {activeSection === "services" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Business Packages</label>
                  <button
                    onClick={addService}
                    className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {site.services?.map((srv, i) => (
                    <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-950/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Package {i + 1}</span>
                        <button
                          onClick={() => removeService(i)}
                          className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={srv.title}
                          onChange={(e) => handleServiceChange(i, "title", e.target.value, true)}
                          onBlur={() => commitHistory(site)}
                          className="col-span-2 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-white"
                          placeholder="Title"
                        />
                        <input
                          type="text"
                          value={srv.price}
                          onChange={(e) => handleServiceChange(i, "price", e.target.value, true)}
                          onBlur={() => commitHistory(site)}
                          className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold dark:border-slate-800 dark:bg-slate-900 text-blue-600 dark:text-blue-400 text-center"
                          placeholder="Price"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={srv.description}
                        onChange={(e) => handleServiceChange(i, "description", e.target.value, true)}
                        onBlur={() => commitHistory(site)}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs leading-relaxed dark:border-slate-800 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                        placeholder="Description"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "faqs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wide">FAQ Accordions</label>
                  <button
                    onClick={addFaq}
                    className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add FAQ
                  </button>
                </div>

                <div className="space-y-3">
                  {site.faqs?.map((faq, i) => (
                    <div key={i} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-950/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Accordion {i + 1}</span>
                        <button
                          onClick={() => removeFaq(i)}
                          className="rounded p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => handleFaqChange(i, "question", e.target.value, true)}
                        onBlur={() => commitHistory(site)}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-white"
                        placeholder="FAQ Question"
                      />
                      <textarea
                        rows={3}
                        value={faq.answer}
                        onChange={(e) => handleFaqChange(i, "answer", e.target.value, true)}
                        onBlur={() => commitHistory(site)}
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs leading-relaxed dark:border-slate-800 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                        placeholder="FAQ Answer Detail"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "gallery" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-50 bg-blue-50/20 p-4 dark:border-blue-900/30 dark:bg-blue-950/10 mb-2">
                  <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4" /> Gallery Asset Images
                  </h4>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400/80 mt-1 leading-relaxed">
                    Review or update the image placeholders generated for the site gallery. Click "Random Stock" to swap in high-res alternatives.
                  </p>
                </div>
                
                <div className="space-y-4">
                  {site.gallery?.map((img, i) => (
                     <div key={i} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20 space-y-2">
                       <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold text-slate-400 uppercase">Gallery Photo {i + 1}</span>
                         <button
                           type="button"
                           onClick={() => {
                             const newGallery = [...(site.gallery || [])];
                             const stockImages = [
                               "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=800&q=80",
                               "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80",
                               "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
                               "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
                               "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80",
                               "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
                               "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80",
                               "https://images.unsplash.com/photo-1507207611509-ec012433ff52?auto=format&fit=crop&w=800&q=80",
                               "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",
                               "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=800&q=80"
                             ];
                             newGallery[i].url = stockImages[Math.floor(Math.random() * stockImages.length)];
                             handleSiteUpdate({ ...site, gallery: newGallery }, false);
                           }}
                           className="inline-flex items-center gap-1 rounded bg-blue-50 px-2.5 py-1 text-[9px] font-bold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 cursor-pointer"
                         >
                           <Sparkles className="h-2.5 w-2.5" /> Random Stock
                         </button>
                       </div>
                       
                       <div className="flex gap-3">
                         <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden border border-slate-200 bg-white">
                           <img src={img.url} alt="Thumbnail preview" className="w-full h-full object-cover" />
                         </div>
                         <div className="flex-1 space-y-1.5">
                           <input
                             type="text"
                             value={img.url}
                             onChange={(e) => {
                               const newGallery = [...(site.gallery || [])];
                               newGallery[i].url = e.target.value;
                               handleSiteUpdate({ ...site, gallery: newGallery }, true);
                             }}
                             onBlur={() => commitHistory(site)}
                             className="w-full rounded border border-slate-200 px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none"
                             placeholder="Image URL"
                           />
                           <input
                             type="text"
                             value={img.alt}
                             onChange={(e) => {
                               const newGallery = [...(site.gallery || [])];
                               newGallery[i].alt = e.target.value;
                               handleSiteUpdate({ ...site, gallery: newGallery }, true);
                             }}
                             onBlur={() => commitHistory(site)}
                             className="w-full rounded border border-slate-200 px-2 py-1 text-[10px] dark:border-slate-800 dark:bg-slate-900 text-slate-500 dark:text-slate-400 focus:outline-none"
                             placeholder="Alt Text (SEO description)"
                           />
                         </div>
                       </div>
                     </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === "testimonials" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-blue-50 bg-blue-50/20 p-4 dark:border-blue-900/30 dark:bg-blue-950/10 mb-2">
                  <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Client Reviews</h4>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400/80 mt-1 leading-relaxed">
                    Edit the AI-generated testimonials or replace them with real client feedback.
                  </p>
                </div>
                {site.testimonials?.map((t, i) => (
                   <div key={i} className="space-y-2 rounded-xl border border-slate-100 p-3.5 dark:border-slate-800 bg-slate-50/20">
                     <input 
                       type="text" 
                       value={t.name} 
                       onChange={(e) => {
                         const newT = [...(site.testimonials || [])];
                         newT[i].name = e.target.value;
                         handleSiteUpdate({ ...site, testimonials: newT }, true);
                       }} 
                       onBlur={() => commitHistory(site)}
                       className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-bold dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none" 
                       placeholder="Reviewer Name" 
                     />
                     <textarea 
                       value={t.review} 
                       rows={3} 
                       onChange={(e) => {
                         const newT = [...(site.testimonials || [])];
                         newT[i].review = e.target.value;
                         handleSiteUpdate({ ...site, testimonials: newT }, true);
                       }} 
                       onBlur={() => commitHistory(site)}
                       className="w-full rounded border border-slate-200 px-2 py-1 text-xs leading-relaxed dark:border-slate-800 dark:bg-slate-900 text-slate-600 dark:text-slate-300 focus:outline-none" 
                       placeholder="Review Content" 
                     />
                   </div>
                ))}
              </div>
            )}

            {activeSection === "contact" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Contact Page Email</label>
                  <input 
                    type="text" 
                    value={site.contactPage?.email || ""} 
                    onChange={(e) => {
                      handleSiteUpdate({ ...site, contactPage: { ...site.contactPage, email: e.target.value } as any }, true);
                    }} 
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-medium focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">WhatsApp Message</label>
                  <textarea 
                    rows={3} 
                    value={site.whatsappMessage} 
                    onChange={(e) => {
                      handleSiteUpdate({ ...site, whatsappMessage: e.target.value }, true);
                    }} 
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-medium focus:outline-none" 
                  />
                </div>
              </div>
            )}

            {activeSection === "legal" && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Privacy Policy</label>
                  <textarea 
                    rows={5} 
                    value={site.privacyPolicy || ""} 
                    onChange={(e) => {
                      handleSiteUpdate({ ...site, privacyPolicy: e.target.value }, true);
                    }} 
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Terms of Service</label>
                  <textarea 
                    rows={5} 
                    value={site.termsOfService || ""} 
                    onChange={(e) => {
                      handleSiteUpdate({ ...site, termsOfService: e.target.value }, true);
                    }} 
                    onBlur={() => commitHistory(site)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-950 text-slate-800 dark:text-slate-200 leading-relaxed focus:outline-none" 
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Responsive Render Stage (65%) */}
        <div className="hidden md:flex flex-1 flex-col bg-slate-100 dark:bg-slate-950 p-6 items-center justify-center overflow-y-auto relative">
          <div className="absolute top-2 right-4 text-[10px] font-mono text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded dark:bg-slate-900/45">
            DEVICE: {viewport.toUpperCase()} RENDER
          </div>

          {viewport === "seo" ? (
            /* SEO preview screen visualization */
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-md border border-slate-200 text-left dark:bg-slate-900 dark:border-slate-800">
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded dark:bg-blue-950/50 dark:text-blue-400">Google SERP Simulator</span>
              <h3 className="mt-3 text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estimated Mobile Search Appearance</h3>
              
              <div className="mt-4 rounded-xl border border-slate-200 p-4 bg-white shadow-sm space-y-1.5 dark:bg-slate-950 dark:border-slate-800 max-w-xl">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="rounded bg-slate-100 p-0.5 dark:bg-slate-800">🌐</span>
                  <span>https://preview.sitescout.ai › {site.id}</span>
                </div>
                <h4 className="text-lg text-blue-800 dark:text-blue-400 hover:underline cursor-pointer font-medium font-sans">
                  {site.seo.title || `${site.businessName} - Reliable Trade Professional`}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                  {site.seo.description || "Expert services customized to your needs. Highly rated, local expertise, 24/7 client callbacks available."}
                </p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">Generated Page Schema Tags (JSON-LD)</h4>
                <pre className="text-[10px] font-mono text-slate-500 bg-slate-50 p-3 rounded-lg dark:bg-slate-950/50 dark:text-slate-400 overflow-x-auto leading-relaxed border border-slate-100 dark:border-slate-800">
{`{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "${site.businessName}",
  "address": "${site.address}",
  "telephone": "${site.phone}",
  "url": "https://preview.sitescout.ai/${site.id}",
  "image": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600",
  "description": "${site.seo.description}"
}`}
                </pre>
              </div>
            </div>
          ) : (
            /* Layout Frame */
            <div 
              className={`bg-white text-slate-900 rounded-2xl shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden flex flex-col dark:bg-slate-900 dark:border-slate-800 ${
                viewport === "mobile" 
                  ? "w-[375px] h-[660px] rounded-[36px] border-[10px] border-slate-900 relative" 
                  : "w-full h-[780px] max-h-[840px]"
              }`}
            >
              {viewport === "mobile" && (
                /* Phone Notch */
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-4 w-32 bg-slate-900 rounded-b-xl z-20" />
              )}

              {/* Dynamic scroll view (delegated to WebsiteView) */}
              <div className={`flex-grow flex flex-col overflow-y-auto ${viewport === "mobile" ? "pt-4" : ""}`}>
                <WebsiteView site={site} />
              </div>
            </div>
          )}
        </div>
      </div>

      {showPublishModal && (
        <PublishingModal 
          site={site} 
          onClose={() => setShowPublishModal(false)} 
          onSavePublish={(updated) => {
            setSite(updated);
            onPublish(updated);
            setShowPublishModal(false);
          }} 
        />
      )}
    </div>
  );
}
