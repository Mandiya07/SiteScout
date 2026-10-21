import { useState, useEffect } from "react";
import { GeneratedSite } from "../types";
import { getCategoryHeroImage, resolveHeroImageUrl, CATEGORY_HERO_IMAGES } from "../lib/heroImages";
import { normalizePhoneNumber, generateWhatsappLink } from "../lib/formatters";
import { normalizeWebsiteSchema } from "../lib/websiteSchema";
import { 
  Phone, MapPin, MessageSquare, ChevronDown, Check, Sparkles, Wrench, Utensils, HeartPulse, Scale, Briefcase, Home, Camera, Scissors, ShieldCheck,
  GraduationCap, Church, Building2, Zap, TreePine, Trophy, Flag, HeartHandshake, Dumbbell, ShoppingBag, Users
} from "lucide-react";

interface WebsiteViewProps {
  site: GeneratedSite;
}

export default function WebsiteView({ site: rawSite }: WebsiteViewProps) {
  const site = normalizeWebsiteSchema(rawSite);
  const [activePage, setActivePage] = useState<"home" | "about" | "services" | "gallery" | "blog" | "contact" | "privacy" | "terms" | "404">("home");
  const [heroImageSrc, setHeroImageSrc] = useState<string>(() => resolveHeroImageUrl(site));

  // Form State for Real Lead Capture
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    service: "",
    message: "",
    honeypot: ""
  });
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Sync hero image whenever site or its imagery changes
  useEffect(() => {
    setHeroImageSrc(resolveHeroImageUrl(site));
  }, [site?.hero?.imageUrl, site?.category, site?.gallery]);

  const handleHeroImageError = () => {
    // If current hero image URL fails to load, gracefully step down to first gallery image or category fallback
    const fallback = site.gallery?.[0]?.url && site.gallery[0].url !== heroImageSrc
      ? site.gallery[0].url
      : (site.gallery?.[1]?.url || CATEGORY_HERO_IMAGES.default);
    if (heroImageSrc !== fallback) {
      setHeroImageSrc(fallback);
    }
  };

  // Track view telemetry when viewed in standalone or public preview mode
  useEffect(() => {
    if (site && (site.previewToken || site.id)) {
      const isPublicPreviewRoute = window.location.pathname.includes("/preview/");
      if (isPublicPreviewRoute) {
        const token = site.previewToken || site.id;
        const device = window.innerWidth < 768 ? "mobile" : "desktop";
        fetch(`/api/preview/${token}/view`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device, referrer: document.referrer || "direct" })
        }).catch(() => {});
      }
    }
  }, [site?.id, site?.previewToken]);

  const logPreviewEvent = (eventType: string, metadata?: Record<string, any>) => {
    if (!site) return;
    const isPublicPreviewRoute = window.location.pathname.includes("/preview/");
    if (!isPublicPreviewRoute) return;
    const token = site.previewToken || site.id;
    if (!token) return;

    fetch(`/api/preview/${token}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, metadata: metadata || {} })
    }).catch(() => {});
  };

  const getFontFamilyClass = (style: string) => {
    switch (style) {
      case "serif": return "font-serif";
      case "display": return "font-sans tracking-tight font-black";
      case "modern": return "font-sans uppercase tracking-wider font-semibold";
      default: return "font-sans";
    }
  };

  const renderHeaderLogo = () => {
    const logoType = site.logoType || "text";
    if (logoType === "icon") {
      const iconId = site.logoIcon || "Sparkles";
      const logoIcons: Record<string, any> = {
        Sparkles, Wrench, Utensils, HeartPulse, Scale, Briefcase, Home, Camera, Scissors, ShieldCheck,
        GraduationCap, Church, Building2, Zap, TreePine, Trophy, Flag, HeartHandshake, Dumbbell, ShoppingBag, Users
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

  const sectionsOrder = site.sectionsOrder || ["hero", "features", "services", "about", "testimonials", "faqs", "gallery", "blog", "contact"];

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "hero":
        return (
          <section
            key="hero"
            className="relative px-5 py-24 sm:py-32 md:py-36 text-center overflow-hidden flex items-center justify-center min-h-[420px] sm:min-h-[500px]"
          >
            {/* Full-width hero background image */}
            <div className="absolute inset-0 z-0 select-none">
              <img
                src={heroImageSrc}
                alt={site.hero?.title || site.businessName || "Hero background"}
                className="w-full h-full object-cover object-center"
                referrerPolicy="no-referrer"
                onError={handleHeroImageError}
              />
              {/* Premium dark gradient overlay for optimal legibility and contrast */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(15, 23, 42, 0.70) 0%, rgba(15, 23, 42, 0.82) 50%, rgba(15, 23, 42, 0.94) 100%)",
                }}
              />
              {/* Subtle brand tint using primary color */}
              <div
                className="absolute inset-0 opacity-20 mix-blend-color"
                style={{ backgroundColor: site.primaryColor }}
              />
            </div>

            {/* Foreground content layer in front of the background image */}
            <div className="relative z-10 max-w-3xl mx-auto space-y-4 sm:space-y-6 px-4">
              {/* Zero-Pill Domain Kicker with typographic separator */}
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold tracking-wider text-slate-200/90 uppercase">
                <span>{site.category || "Professional Services"}</span>
                <span aria-hidden="true" className="opacity-50">·</span>
                <span>{site.address ? site.address.split(",")[0] : "Local Service"}</span>
              </div>

              {/* Bold Hero Title */}
              <h1
                className={`text-2xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight sm:leading-tight tracking-tight drop-shadow-md ${getFontFamilyClass(site.fontStyle)}`}
              >
                {site.hero.title}
              </h1>

              {/* Hero Subtitle */}
              <p className="text-xs sm:text-base text-slate-200/90 leading-relaxed font-sans max-w-2xl mx-auto drop-shadow-xs">
                {site.hero.subtitle}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                  style={{ backgroundColor: site.accentColor || site.primaryColor }}
                  onClick={() => setActivePage("contact")}
                >
                  {site.hero.ctaPrimary}
                </button>
                <button
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 shadow-sm active:scale-95 transition-all cursor-pointer"
                  onClick={() => setActivePage("services")}
                >
                  {site.hero.ctaSecondary}
                </button>
              </div>

              {/* Photographer attribution */}
              {site.hero.photographer && (
                <div className="pt-2 text-[10px] text-white/50">
                  Photo by {site.hero.photographer}
                </div>
              )}
            </div>
          </section>
        );
      case "features":
        return (
          <section key="features" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
            <h3 className={`text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 ${getFontFamilyClass(site.fontStyle)}`}>
              Why Choose Us
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {site.features?.map((feat, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs text-center space-y-2.5 dark:bg-slate-950 dark:border-slate-800">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                    <Check className="h-5 w-5" />
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white font-sans">{feat.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">{feat.description}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case "services":
        return (
          <section key="services" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50/60 border-t border-b border-slate-200/60 dark:bg-slate-900/20 dark:border-slate-800">
            <div className="max-w-5xl mx-auto">
              <h3 className={`text-center text-lg sm:text-xl font-bold text-slate-800 mb-2 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                Our Specialized Packages
              </h3>
              <p className="text-center text-xs text-slate-500 mb-8 max-w-xl mx-auto font-sans">
                Transparent quote-based services tailored to your exact requirements.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {site.services?.map((srv, i) => (
                  <div key={i} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col justify-between dark:bg-slate-950 dark:border-slate-800">
                    {srv.imageUrl && (
                      <div className="h-40 w-full overflow-hidden bg-slate-100">
                        <img src={srv.imageUrl} alt={srv.title} loading="lazy" decoding="async" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                      </div>
                    )}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1.5 text-left">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white font-sans">{srv.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-sans line-clamp-3">{srv.description}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-850">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {srv.price}
                        </span>
                        <button
                          onClick={() => {
                            setFormData(prev => ({ ...prev, service: srv.title }));
                            setActivePage("contact");
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg text-white shadow-xs hover:brightness-105 transition-all cursor-pointer"
                          style={{ backgroundColor: site.primaryColor }}
                        >
                          Enquire
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      case "about":
        return (
          <section key="about" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center text-left">
              <div className="space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans">
                  Local Commitment
                </span>
                <h3 className={`text-xl sm:text-2xl font-bold text-slate-800 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                  {site.about.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans">
                  {site.about.history}
                </p>
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 dark:bg-slate-900 dark:border-slate-800">
                  <p className="text-xs text-slate-600 italic font-sans">
                    "{site.about.mission}"
                  </p>
                </div>
              </div>
              {site.about.imageUrl && (
                <div className="rounded-2xl overflow-hidden shadow-sm aspect-4/3 border border-slate-200 bg-white">
                  <img src={site.about.imageUrl} alt={site.about.title} loading="lazy" decoding="async" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              )}
            </div>
          </section>
        );
      case "gallery":
        return site.gallery && (
          <section key="gallery" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
            <h3 className={`text-center text-lg sm:text-xl font-bold text-slate-800 mb-6 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Gallery
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {site.gallery.map((img, i) => (
                <div key={i} className="group relative aspect-4/3 overflow-hidden rounded-xl border border-slate-200 shadow-xs">
                  <img src={img.url} alt={img.alt} loading="lazy" decoding="async" className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                  {img.alt && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-3 pt-6 text-white text-xs font-semibold leading-tight drop-shadow-xs">
                      {img.alt}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      case "testimonials":
        return (site.testimonials && site.testimonials.length > 0) ? (
          <section key="testimonials" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
            <h3 className={`text-center text-lg sm:text-xl font-bold text-slate-800 mb-6 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Client Reviews
            </h3>
            <div className="grid gap-6 sm:grid-cols-2">
              {site.testimonials.map((test, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs text-left dark:bg-slate-950 dark:border-slate-800">
                  {test.rating > 0 && (
                    <div className="flex items-center gap-1 mb-2">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <svg key={j} className={`w-4 h-4 ${j < test.rating ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-600 italic mb-3 leading-relaxed font-sans">"{test.review}"</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans">- {test.name}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null;
      case "faqs":
        return (
          <section key="faqs" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
            <h3 className={`text-center text-lg sm:text-xl font-bold text-slate-800 mb-6 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Frequently Asked Questions
            </h3>
            <div className="space-y-3.5">
              {site.faqs?.map((faq, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs text-left dark:bg-slate-950 dark:border-slate-800">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white flex items-center justify-between font-sans">
                    <span>{faq.question}</span>
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mt-2 pt-2 border-t border-slate-100 dark:border-slate-850 font-sans">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      case "blog":
        return site.blog && (
          <section key="blog" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
            <h3 className={`text-center text-lg sm:text-xl font-bold text-slate-800 mb-6 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Latest Insights &amp; Articles
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {site.blog.map((post, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs text-left dark:bg-slate-950 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 block">{post.category}</span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 font-sans">{post.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-sans">{post.summary}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case "contact":
        return site.contactPage && (
          <section key="contact" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-left">
            <h3 className={`text-center text-lg sm:text-xl font-bold text-slate-800 mb-2 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              {site.contactPage.title}
            </h3>
            <p className="text-xs text-slate-600 text-center mb-8 font-sans">{site.contactPage.description}</p>

            {/* Responsive 2-Column Grid on Desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Interactive Lead Capture Form */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm dark:bg-slate-950 dark:border-slate-800">
              {submitStatus === "success" ? (
                <div className="text-center py-6 space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                    <Check className="h-6 w-6 stroke-[2.5]" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">Enquiry Received!</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto font-sans leading-relaxed">
                    {successMessage || `Thank you! Your enquiry has been sent directly to the team at ${site.businessName}. We will review your request and get back to you shortly.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSubmitStatus("idle");
                      setSuccessMessage("");
                    }}
                    className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
                      setErrorMessage("Please complete your name, email, and message.");
                      return;
                    }

                    setSubmitStatus("submitting");
                    setErrorMessage("");

                    try {
                      const token = site.previewToken || site.id;
                      const res = await fetch(`/api/preview/${token}/lead`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(formData)
                      });

                      const data = await res.json();
                      if (!res.ok || !data.success) {
                        throw new Error(data.error || "Failed to submit enquiry.");
                      }

                      logPreviewEvent("form_submitted", { service: formData.service || "general" });
                      setSuccessMessage(data.message);
                      setSubmitStatus("success");
                      setFormData({ name: "", email: "", phone: "", service: "", message: "", honeypot: "" });
                    } catch (err: any) {
                      setSubmitStatus("error");
                      setErrorMessage(err.message || "Failed to submit enquiry. Please try again or call us directly.");
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Request a Quote or Service Consultation</h4>
                    <p className="text-[11px] text-slate-500 font-sans mt-0.5">Fill in your requirements below and our team will get back to you promptly.</p>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium dark:bg-red-950/40 dark:border-red-800 dark:text-red-300">
                      {errorMessage}
                    </div>
                  )}

                  {/* Honeypot field for bot protection */}
                  <input
                    type="text"
                    name="website_url_hp"
                    value={formData.honeypot}
                    onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                    style={{ display: "none" }}
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Your Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Thabo Dlamini"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                        style={{ focusRingColor: site.primaryColor }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. thabo@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Phone / WhatsApp <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="e.g. +268 7600 0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Service of Interest <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <select
                        value={formData.service}
                        onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:border-slate-800 dark:text-white"
                      >
                        <option value="">General Consultation</option>
                        {site.services?.map((srv, idx) => (
                          <option key={idx} value={srv.title}>{srv.title}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Project Details / Message <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Please describe what you need assistance with, timeline, and any specific requirements..."
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 dark:bg-slate-900 dark:border-slate-800 dark:text-white resize-none font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitStatus === "submitting"}
                    className="w-full py-3 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                    style={{ backgroundColor: site.primaryColor }}
                  >
                    {submitStatus === "submitting" ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Transmitting Enquiry...</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-4 w-4" />
                        <span>Send Enquiry Directly to {site.businessName}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

              {/* Direct Instant Contact Details & Location Column */}
              <div className="space-y-6">
                <div className="bg-slate-50 rounded-2xl border border-slate-200/60 p-6 dark:bg-slate-900/50 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2 font-sans">
                    Prefer direct instant communication?
                  </h4>
                  <p className="text-xs text-slate-500 mb-4 font-sans">
                    Connect directly with our local team for immediate callback or quotation scheduling.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    {site.contactPage?.email && (
                      <a href={`mailto:${site.contactPage.email}`} onClick={() => logPreviewEvent("email_clicked")} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer transition-transform hover:scale-105" style={{ backgroundColor: site.accentColor }}>
                        <MessageSquare className="h-3.5 w-3.5" />
                        Email Us
                      </a>
                    )}
                    {site.phone && (
                      <a href={`tel:${site.phone}`} onClick={() => logPreviewEvent("phone_clicked")} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm border border-slate-200 bg-white text-slate-800 cursor-pointer transition-transform hover:scale-105 dark:bg-slate-900 dark:border-slate-700 dark:text-white">
                        <Phone className="h-3.5 w-3.5" />
                        Call {site.phone}
                      </a>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 dark:bg-slate-950 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2.5 font-sans"><Phone className="h-4 w-4 text-slate-400 shrink-0" /> <span>{site.phone}</span></div>
                  <div className="flex items-center gap-2.5 font-sans"><MapPin className="h-4 w-4 text-red-500 shrink-0" /> <span>{site.address}</span></div>
                  <div className="flex items-center gap-2.5 font-sans"><MessageSquare className="h-4 w-4 text-slate-400 shrink-0" /> <span>{site.contactPage?.email || "Email: Listed upon direct contact"}</span></div>
                </div>
                
                <div className="rounded-2xl overflow-hidden border border-slate-200 h-44 bg-slate-100 flex items-center justify-center relative">
                  <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center"></div>
                  <div className="relative z-10 bg-white/95 backdrop-blur-xs p-3.5 rounded-xl shadow-xs border border-slate-200 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-red-500" />
                    <span className="text-xs font-bold text-slate-800 font-sans">{site.businessName}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col h-full overflow-hidden" style={{ backgroundColor: site.backgroundColor, color: site.textColor }}>
      {/* Header Nav */}
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm p-4 flex items-center justify-between shrink-0" style={{ borderBottomColor: `${site.primaryColor}10` }}>
        {renderHeaderLogo()}
        <nav className="flex items-center space-x-4 text-[10px] font-bold text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-none max-w-[60%] sm:max-w-full">
          <button onClick={() => setActivePage('home')} className={`hover:text-slate-900 ${activePage === 'home' ? 'text-slate-900 font-extrabold' : ''} cursor-pointer`}>Home</button>
          {sectionsOrder.includes("about") && <button onClick={() => setActivePage('about')} className={`hover:text-slate-900 ${activePage === 'about' ? 'text-slate-900 font-extrabold' : ''} cursor-pointer`}>About</button>}
          {sectionsOrder.includes("services") && <button onClick={() => setActivePage('services')} className={`hover:text-slate-900 ${activePage === 'services' ? 'text-slate-900 font-extrabold' : ''} cursor-pointer`}>Services</button>}
          {sectionsOrder.includes("gallery") && <button onClick={() => setActivePage('gallery')} className={`hover:text-slate-900 ${activePage === 'gallery' ? 'text-slate-900 font-extrabold' : ''} cursor-pointer`}>Gallery</button>}
          {sectionsOrder.includes("blog") && <button onClick={() => setActivePage('blog')} className={`hover:text-slate-900 ${activePage === 'blog' ? 'text-slate-900 font-extrabold' : ''} cursor-pointer`}>Blog</button>}
          {sectionsOrder.includes("contact") && <button onClick={() => setActivePage('contact')} className={`hover:text-slate-900 ${activePage === 'contact' ? 'text-slate-900 font-extrabold' : ''} cursor-pointer`}>Contact</button>}
        </nav>
        <div className="flex items-center space-x-2.5 shrink-0">
          <a href={`tel:${site.phone}`} onClick={() => logPreviewEvent("phone_clicked")} className="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-xs transition-transform hover:scale-105" style={{ backgroundColor: site.accentColor }}>
            <Phone className="h-3.5 w-3.5" />
          </a>
          <a 
            href={generateWhatsappLink(site.phone, site.whatsappMessage, site.address)} 
            onClick={() => logPreviewEvent("whatsapp_clicked")}
            target="_blank" 
            rel="noopener noreferrer"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white bg-emerald-500 shadow-xs transition-transform hover:scale-105"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </a>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 overflow-y-auto">
        {activePage === 'home' ? (
          <div className="space-y-0">
            {sectionsOrder.map((sectionId) => renderSection(sectionId))}
          </div>
        ) : (
          <div className="animate-fade-in py-4">
            {activePage === 'about' && (
              <>
                {renderSection('about')}
                {sectionsOrder.includes('testimonials') && renderSection('testimonials')}
              </>
            )}
            {activePage === 'services' && renderSection('services')}
            {activePage === 'gallery' && renderSection('gallery')}
            {activePage === 'blog' && renderSection('blog')}
            {activePage === 'contact' && renderSection('contact')}
            
            {activePage === 'privacy' && site.privacyPolicy && (
              <section className="p-6 max-w-2xl mx-auto text-left">
                <h3 className={`text-base font-bold text-slate-800 mb-4 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                  Privacy Policy
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">{site.privacyPolicy}</p>
              </section>
            )}

            {activePage === 'terms' && site.termsOfService && (
              <section className="p-6 max-w-2xl mx-auto text-left">
                <h3 className={`text-base font-bold text-slate-800 mb-4 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                  Terms of Service
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">{site.termsOfService}</p>
              </section>
            )}

            {activePage === '404' && site.notFoundPage && (
              <section className="p-12 max-w-2xl mx-auto text-center space-y-4">
                <h3 className={`text-4xl font-black text-slate-800 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                  404
                </h3>
                <h4 className="text-lg font-bold text-slate-700 font-sans">{site.notFoundPage.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto font-sans">
                  {site.notFoundPage.message}
                </p>
                <button onClick={() => setActivePage('home')} className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer animate-pulse" style={{ backgroundColor: site.accentColor }}>
                  Return to Homepage
                </button>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Footer Block */}
      <footer className="p-8 text-center text-[10px] text-slate-400 border-t border-slate-100 bg-white" style={{ backgroundColor: `${site.primaryColor}05` }}>
        <p className="font-semibold text-slate-700">{site.businessName}</p>
        <p className="mt-1 flex items-center justify-center gap-1"><MapPin className="h-3 w-3" /> {site.address}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          <button onClick={() => setActivePage('privacy')} className="hover:underline cursor-pointer">Privacy Policy</button>
          <button onClick={() => setActivePage('terms')} className="hover:underline cursor-pointer">Terms of Service</button>
          <button onClick={() => setActivePage('404')} className="hover:underline cursor-pointer">404 Error Preview</button>
        </div>
        <p className="mt-2 text-[9px] text-slate-400">© 2026. Free website preview created by SiteScout AI.</p>
      </footer>
    </div>
  );
}
