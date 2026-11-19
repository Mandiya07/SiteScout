import { useState, useEffect, useRef } from "react";
import { GeneratedSite } from "../types";
import {
  getCategoryHeroImage,
  getCategorySectionImages,
  resolveHeroImageUrl,
  CATEGORY_HERO_IMAGES,
  INLINE_SVG_IMAGE_FALLBACK,
  INLINE_SVG_MAP_FALLBACK,
  isBrokenOrInvalidImageUrl
} from "../lib/heroImages";
import { normalizePhoneNumber, generateWhatsappLink } from "../lib/formatters";
import { normalizeWebsiteSchema } from "../lib/websiteSchema";
import WebsiteNavbar, { WebsitePageId } from "./WebsiteNavbar";
import { 
  Phone, MapPin, MessageSquare, ChevronDown, Check, Sparkles, Wrench, Utensils, HeartPulse, Scale, Briefcase, Home, Camera, Scissors, ShieldCheck,
  GraduationCap, Church, Building2, Zap, TreePine, Trophy, Flag, HeartHandshake, Dumbbell, ShoppingBag, Users,
  Menu, X
} from "lucide-react";

interface WebsiteViewProps {
  site: GeneratedSite;
  forcedViewport?: "desktop" | "mobile";
}

interface ResilientImageProps {
  src?: string | null;
  fallbacks?: Array<string | null | undefined>;
  lastResort?: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  decoding?: "async" | "sync" | "auto";
}

function ResilientImage({
  src,
  fallbacks = [],
  lastResort = INLINE_SVG_IMAGE_FALLBACK,
  alt,
  className = "",
  loading = "lazy",
  decoding = "async"
}: ResilientImageProps) {
  const candidates: string[] = [];
  for (const candidate of [src, ...fallbacks, lastResort]) {
    if (candidate && typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed && !candidates.includes(trimmed)) {
        candidates.push(trimmed);
      }
    }
  }
  const safeList = candidates.length > 0 ? candidates : [lastResort];
  const listKey = safeList.join("|");
  const [attemptIndex, setAttemptIndex] = useState(0);

  useEffect(() => {
    setAttemptIndex(0);
  }, [listKey]);

  const activeSrc = safeList[Math.min(attemptIndex, safeList.length - 1)] || lastResort;

  return (
    <img
      src={activeSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        setAttemptIndex((prev) => (prev + 1 < safeList.length ? prev + 1 : prev));
      }}
    />
  );
}

export default function WebsiteView({ site: rawSite, forcedViewport }: WebsiteViewProps) {
  const site = normalizeWebsiteSchema(rawSite);
  const sectionFallbackImages = getCategorySectionImages(site.category);
  const [activePage, setActivePage] = useState<WebsitePageId>("home");
  const [heroImageSrc, setHeroImageSrc] = useState<string>(() => resolveHeroImageUrl(site));
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (containerRef.current.clientWidth > 0) {
      setContainerWidth(containerRef.current.clientWidth);
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Container-aware responsive breakpoints so simulated mobile frames (360-375px) NEVER trigger
  // desktop multi-column grids via browser window media queries, and simulated desktop previews
  // inside split-pane editors still organize as true multi-column desktop websites.
  const effectiveWidth =
    containerWidth != null && containerWidth > 0
      ? containerWidth
      : typeof window !== "undefined"
        ? window.innerWidth
        : 1024;

  const isMobileLayout =
    forcedViewport === "mobile" ||
    (forcedViewport === "desktop" ? effectiveWidth < 540 : effectiveWidth < 768);

  const isWideDesktop = !isMobileLayout && effectiveWidth >= 860;

  // Collapsible FAQ tracking (first 2 open by default; all toggleable cleanly without chevron overlap)
  const [collapsedFaqs, setCollapsedFaqs] = useState<Record<number, boolean>>({});
  const toggleFaq = (idx: number) => {
    setCollapsedFaqs((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

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
    // Graceful fallback chain: gallery[0] -> category hero -> default hero -> inline SVG
    const chain = [
      site.gallery?.[0]?.url,
      site.gallery?.[1]?.url,
      getCategoryHeroImage(site.category),
      CATEGORY_HERO_IMAGES.default,
      INLINE_SVG_IMAGE_FALLBACK
    ].filter((u): u is string => Boolean(u && !isBrokenOrInvalidImageUrl(u) && u !== heroImageSrc));
    if (chain.length > 0) {
      setHeroImageSrc(chain[0]);
    } else if (heroImageSrc !== INLINE_SVG_IMAGE_FALLBACK) {
      setHeroImageSrc(INLINE_SVG_IMAGE_FALLBACK);
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

  const sectionsOrder = site.sectionsOrder || ["hero", "features", "services", "about", "testimonials", "faqs", "gallery", "blog", "contact"];
  const sectionPad = isMobileLayout ? "py-10 px-4" : "py-16 px-6 lg:px-8";
  const hasPhone = Boolean(site.phone && site.phone.trim().toLowerCase() !== "unlisted");

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case "hero":
        return (
          <section
            key="hero"
            className={`relative text-center overflow-hidden flex items-center justify-center ${
              isMobileLayout ? "px-4 py-16 min-h-[360px]" : "px-8 py-24 lg:py-32 min-h-[460px]"
            }`}
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
            <div className={`relative z-10 max-w-3xl mx-auto ${isMobileLayout ? "space-y-4 px-1" : "space-y-6 px-4"}`}>
              {/* Zero-Pill Domain Kicker */}
              <div className={`flex items-center justify-center gap-2 font-semibold tracking-wider text-slate-200/90 uppercase ${isMobileLayout ? "text-[11px]" : "text-xs lg:text-sm"}`}>
                <span>{site.category || "Professional Services"}</span>
              </div>

              {/* Bold Hero Title */}
              <h1
                className={`font-extrabold text-white leading-tight tracking-tight drop-shadow-md break-words ${
                  isMobileLayout ? "text-2xl" : isWideDesktop ? "text-4xl lg:text-5xl" : "text-3xl"
                } ${getFontFamilyClass(site.fontStyle)}`}
              >
                {site.hero.title}
              </h1>

              {/* Hero Subtitle */}
              <p className={`text-slate-200/90 leading-relaxed font-sans max-w-2xl mx-auto drop-shadow-xs break-words ${isMobileLayout ? "text-xs" : "text-sm lg:text-base"}`}>
                {site.hero.subtitle}
              </p>

              {/* Action Buttons */}
              <div className={`flex items-center justify-center gap-3 pt-2 ${isMobileLayout ? "flex-col w-full" : "flex-row"}`}>
                <button
                  className={`${isMobileLayout ? "w-full px-6 py-3 text-xs" : "px-7 py-3.5 text-sm"} rounded-xl font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer`}
                  style={{ backgroundColor: site.accentColor || site.primaryColor }}
                  onClick={() => setActivePage("contact")}
                >
                  {site.hero.ctaPrimary}
                </button>
                <button
                  className={`${isMobileLayout ? "w-full px-6 py-3 text-xs" : "px-7 py-3.5 text-sm"} rounded-xl font-bold text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 shadow-sm active:scale-95 transition-all cursor-pointer`}
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
          <section key="features" className={`${sectionPad} max-w-5xl mx-auto w-full`}>
            <h3 className={`text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 ${getFontFamilyClass(site.fontStyle)}`}>
              Why Choose Us
            </h3>
            <div className={`grid gap-5 ${isMobileLayout ? "grid-cols-1" : "grid-cols-3 gap-6"}`}>
              {site.features?.map((feat, i) => (
                <div
                  key={i}
                  className={`bg-white rounded-xl border border-slate-200/80 shadow-xs text-center space-y-2.5 min-w-0 overflow-hidden dark:bg-slate-950 dark:border-slate-800 ${
                    isMobileLayout ? "p-5" : "p-6"
                  }`}
                >
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 shrink-0">
                    <Check className="h-5 w-5" />
                  </span>
                  <h4 className={`${isMobileLayout ? "text-sm" : "text-base"} font-bold text-slate-900 dark:text-white font-sans break-words`}>
                    {feat.title}
                  </h4>
                  <p className={`${isMobileLayout ? "text-xs" : "text-sm"} text-slate-500 leading-relaxed font-sans break-words`}>
                    {feat.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        );
      case "services":
        return (
          <section key="services" className={`${sectionPad} bg-slate-50/60 border-t border-b border-slate-200/60 dark:bg-slate-900/20 dark:border-slate-800 w-full`}>
            <div className="max-w-5xl mx-auto">
              <h3 className={`text-center ${isMobileLayout ? "text-lg" : "text-2xl"} font-bold text-slate-800 mb-2 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                Our Specialized Packages
              </h3>
              <p className={`text-center ${isMobileLayout ? "text-xs mb-6" : "text-sm mb-8"} text-slate-500 max-w-xl mx-auto font-sans`}>
                Transparent quote-based services tailored to your exact requirements.
              </p>
              <div className={`grid gap-5 ${isMobileLayout ? "grid-cols-1" : isWideDesktop ? "grid-cols-3 gap-6" : "grid-cols-2 gap-6"}`}>
                {site.services?.map((srv, i) => {
                  const serviceSrc = srv.imageUrl || sectionFallbackImages.services[i % sectionFallbackImages.services.length];
                  return (
                  <div key={i} className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col justify-between min-w-0 dark:bg-slate-950 dark:border-slate-800">
                    <div className="h-44 w-full overflow-hidden bg-slate-100 shrink-0">
                      <ResilientImage
                        src={serviceSrc}
                        fallbacks={[
                          sectionFallbackImages.services[i % sectionFallbackImages.services.length],
                          getCategoryHeroImage(site.category),
                          CATEGORY_HERO_IMAGES.default
                        ]}
                        alt={srv.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className={`${isMobileLayout ? "p-4" : "p-5"} flex-1 flex flex-col justify-between gap-4 min-w-0`}>
                      <div className="space-y-1.5 text-left min-w-0">
                        <h4 className={`${isMobileLayout ? "text-sm" : "text-base"} font-bold text-slate-900 dark:text-white font-sans break-words`}>
                          {srv.title}
                        </h4>
                        <p className={`${isMobileLayout ? "text-xs" : "text-sm"} text-slate-500 leading-relaxed font-sans break-words`}>
                          {srv.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-850 min-w-0">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 min-w-0 break-words leading-snug">
                          {srv.price || "Request a Quote"}
                        </span>
                        <button
                          onClick={() => {
                            setFormData(prev => ({ ...prev, service: srv.title }));
                            setActivePage("contact");
                          }}
                          className="px-3.5 py-1.5 text-xs font-bold rounded-lg text-white shadow-xs hover:brightness-105 transition-all cursor-pointer shrink-0 whitespace-nowrap"
                          style={{ backgroundColor: site.primaryColor }}
                        >
                          Enquire
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      case "about":
        return (
          <section key="about" className={`${sectionPad} max-w-5xl mx-auto w-full`}>
            <div className={`grid items-center text-left ${isMobileLayout ? "grid-cols-1 gap-6" : "grid-cols-2 gap-10 lg:gap-12"}`}>
              <div className="space-y-4 min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans block">
                  Local Commitment
                </span>
                <h3 className={`${isMobileLayout ? "text-xl" : "text-2xl lg:text-3xl"} font-bold text-slate-800 break-words ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                  {site.about.title}
                </h3>
                <p className={`${isMobileLayout ? "text-xs" : "text-sm"} text-slate-600 leading-relaxed font-sans break-words`}>
                  {site.about.history}
                </p>
                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 dark:bg-slate-900 dark:border-slate-800 min-w-0">
                  <p className={`${isMobileLayout ? "text-xs" : "text-sm"} text-slate-600 italic font-sans break-words`}>
                    "{site.about.mission}"
                  </p>
                </div>
              </div>
              {(site.about.imageUrl || sectionFallbackImages.about) && (
                <div className="rounded-2xl overflow-hidden shadow-sm aspect-4/3 border border-slate-200 bg-white w-full">
                  <ResilientImage
                    src={site.about.imageUrl || sectionFallbackImages.about}
                    fallbacks={[
                      sectionFallbackImages.about,
                      getCategoryHeroImage(site.category),
                      CATEGORY_HERO_IMAGES.default
                    ]}
                    alt={site.about.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </section>
        );
      case "gallery":
        return site.gallery && (
          <section key="gallery" className={`${sectionPad} max-w-5xl mx-auto w-full`}>
            <h3 className={`text-center ${isMobileLayout ? "text-lg" : "text-2xl"} font-bold text-slate-800 mb-6 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Gallery
            </h3>
            <div className={`grid gap-5 ${isMobileLayout ? "grid-cols-1" : isWideDesktop ? "grid-cols-3 gap-6" : "grid-cols-2 gap-6"}`}>
              {site.gallery.map((img, i) => (
                <div key={i} className="group bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col min-w-0 dark:bg-slate-950 dark:border-slate-800">
                  <div className="aspect-4/3 w-full overflow-hidden bg-slate-100 shrink-0">
                    <ResilientImage
                      src={img.url}
                      fallbacks={[
                        sectionFallbackImages.gallery[i % sectionFallbackImages.gallery.length].url,
                        getCategoryHeroImage(site.category),
                        CATEGORY_HERO_IMAGES.default
                      ]}
                      alt={img.alt || site.businessName}
                      loading="lazy"
                      decoding="async"
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  {img.alt && (
                    <div className="px-3.5 py-2.5 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-left min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-snug line-clamp-2 break-words">
                        {img.alt}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        );
      case "testimonials":
        return (site.testimonials && site.testimonials.length > 0) ? (
          <section key="testimonials" className={`${sectionPad} max-w-5xl mx-auto w-full`}>
            <h3 className={`text-center ${isMobileLayout ? "text-lg" : "text-2xl"} font-bold text-slate-800 mb-6 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Client Reviews
            </h3>
            <div className={`grid gap-5 ${isMobileLayout ? "grid-cols-1" : "grid-cols-2 gap-6"}`}>
              {site.testimonials.map((test, i) => (
                <div key={i} className={`bg-white rounded-xl border border-slate-200/80 shadow-xs text-left min-w-0 overflow-hidden flex flex-col justify-between dark:bg-slate-950 dark:border-slate-800 ${isMobileLayout ? "p-4" : "p-6"}`}>
                  <div className="min-w-0">
                    {test.rating > 0 && (
                      <div className="flex items-center gap-1 mb-2.5">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <svg key={j} className={`w-4 h-4 ${j < test.rating ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        ))}
                      </div>
                    )}
                    <p className={`${isMobileLayout ? "text-xs" : "text-sm"} text-slate-600 italic mb-3 leading-relaxed font-sans break-words`}>
                      "{test.review}"
                    </p>
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 font-sans break-words">
                    - {test.name}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null;
      case "faqs":
        return (
          <section key="faqs" className={`${sectionPad} max-w-5xl mx-auto w-full`}>
            <h3 className={`text-center ${isMobileLayout ? "text-lg" : "text-2xl"} font-bold text-slate-800 mb-6 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Frequently Asked Questions
            </h3>
            <div className={`grid gap-4 ${isMobileLayout ? "grid-cols-1" : isWideDesktop ? "grid-cols-2" : "grid-cols-1 max-w-4xl mx-auto"}`}>
              {site.faqs?.map((faq, i) => {
                const isCollapsed = !!collapsedFaqs[i];
                return (
                  <div key={i} className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs text-left min-w-0 overflow-hidden dark:bg-slate-950 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => toggleFaq(i)}
                      className={`w-full flex items-start justify-between gap-3 text-left font-bold text-slate-800 dark:text-white font-sans cursor-pointer ${isMobileLayout ? "text-xs" : "text-sm"}`}
                      aria-expanded={!isCollapsed}
                    >
                      <span className="flex-1 min-w-0 break-words leading-snug">{faq.question}</span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 mt-0.5 transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`} />
                    </button>
                    {!isCollapsed && (
                      <p className={`${isMobileLayout ? "text-xs" : "text-sm"} text-slate-500 leading-relaxed mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-850 font-sans break-words`}>
                        {faq.answer}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      case "blog":
        return site.blog && (
          <section key="blog" className={`${sectionPad} max-w-5xl mx-auto w-full`}>
            <h3 className={`text-center ${isMobileLayout ? "text-lg" : "text-2xl"} font-bold text-slate-800 mb-6 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              Latest Insights &amp; Articles
            </h3>
            <div className={`grid gap-5 ${isMobileLayout ? "grid-cols-1" : "grid-cols-2 gap-6"}`}>
              {site.blog.map((post, i) => (
                <div key={i} className={`bg-white rounded-xl border border-slate-200/80 shadow-xs text-left min-w-0 overflow-hidden dark:bg-slate-950 dark:border-slate-800 ${isMobileLayout ? "p-4" : "p-6"}`}>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 block break-words">{post.category}</span>
                  <h4 className={`${isMobileLayout ? "text-sm" : "text-base"} font-bold text-slate-900 dark:text-white mb-2 font-sans break-words`}>{post.title}</h4>
                  <p className={`${isMobileLayout ? "text-xs" : "text-sm"} text-slate-500 leading-relaxed font-sans break-words`}>{post.summary}</p>
                </div>
              ))}
            </div>
          </section>
        );
      case "contact":
        return site.contactPage && (
          <section key="contact" className={`${sectionPad} max-w-5xl mx-auto text-left w-full`}>
            <h3 className={`text-center ${isMobileLayout ? "text-lg" : "text-2xl"} font-bold text-slate-800 mb-2 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
              {site.contactPage.title}
            </h3>
            <p className={`${isMobileLayout ? "text-xs mb-6" : "text-sm mb-8"} text-slate-600 text-center max-w-2xl mx-auto font-sans break-words`}>
              {site.contactPage.description}
            </p>

            {/* Responsive 2-Column Grid on Desktop */}
            <div className={`grid items-start ${isMobileLayout ? "grid-cols-1 gap-6" : "grid-cols-2 gap-8"}`}>
              {/* Interactive Lead Capture Form */}
              <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm min-w-0 overflow-hidden dark:bg-slate-950 dark:border-slate-800 ${isMobileLayout ? "p-4" : "p-6"}`}>
                {submitStatus === "success" ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                      <Check className="h-6 w-6 stroke-[2.5]" />
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">Enquiry Received!</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto font-sans leading-relaxed break-words">
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

                    <div className={`grid gap-3 ${isMobileLayout ? "grid-cols-1" : "grid-cols-2"}`}>
                      <div className="min-w-0">
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
                        />
                      </div>
                      <div className="min-w-0">
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

                    <div className={`grid gap-3 ${isMobileLayout ? "grid-cols-1" : "grid-cols-2"}`}>
                      <div className="min-w-0">
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
                      <div className="min-w-0">
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
                      className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 text-center leading-snug transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                      style={{ backgroundColor: site.primaryColor }}
                    >
                      {submitStatus === "submitting" ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                          <span>Transmitting Enquiry...</span>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 break-words">Send Enquiry Directly to {site.businessName}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>

              {/* Direct Instant Contact Details & Location Column */}
              <div className="space-y-5 min-w-0">
                <div className={`bg-slate-50 rounded-2xl border border-slate-200/60 dark:bg-slate-900/50 dark:border-slate-800 min-w-0 overflow-hidden ${isMobileLayout ? "p-4" : "p-6"}`}>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2 font-sans">
                    Prefer direct instant communication?
                  </h4>
                  <p className="text-xs text-slate-500 mb-4 font-sans break-words">
                    Connect directly with our local team for immediate callback or quotation scheduling.
                  </p>
                  <div className={isMobileLayout ? "flex flex-col gap-2.5" : "flex flex-wrap gap-2.5"}>
                    {site.contactPage?.email && (
                      <a
                        href={`mailto:${site.contactPage.email}`}
                        onClick={() => logPreviewEvent("email_clicked")}
                        className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer transition-transform hover:scale-[1.02] text-center"
                        style={{ backgroundColor: site.accentColor }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                        <span>Email Us</span>
                      </a>
                    )}
                    {hasPhone && (
                      <a
                        href={`tel:${site.phone}`}
                        onClick={() => logPreviewEvent("phone_clicked")}
                        className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm border border-slate-200 bg-white text-slate-800 cursor-pointer transition-transform hover:scale-[1.02] text-center break-words dark:bg-slate-900 dark:border-slate-700 dark:text-white"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">Call {site.phone}</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className={`bg-white rounded-2xl border border-slate-200/80 dark:bg-slate-950 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-300 min-w-0 overflow-hidden ${isMobileLayout ? "p-4" : "p-5"}`}>
                  <div className="flex items-start gap-2.5 font-sans min-w-0">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="min-w-0 flex-1 break-words">{hasPhone ? site.phone : "Phone: Unlisted"}</span>
                  </div>
                  <div className="flex items-start gap-2.5 font-sans min-w-0">
                    <MapPin className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="min-w-0 flex-1 break-words">{site.address}</span>
                  </div>
                  <div className="flex items-start gap-2.5 font-sans min-w-0">
                    <MessageSquare className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="min-w-0 flex-1 break-all">{site.contactPage?.email || "Email: Listed upon direct contact"}</span>
                  </div>
                </div>

                <div className="rounded-2xl overflow-hidden border border-slate-200 h-44 bg-slate-100 flex items-center justify-center relative px-4">
                  <ResilientImage
                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80"
                    lastResort={INLINE_SVG_MAP_FALLBACK}
                    alt={`${site.businessName} service area map`}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover opacity-45"
                  />
                  <div className="relative z-10 bg-white/95 backdrop-blur-xs px-3.5 py-2.5 rounded-xl shadow-xs border border-slate-200 flex items-center gap-2 max-w-[calc(100%-1rem)]">
                    <MapPin className="h-4 w-4 text-red-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800 font-sans truncate">{site.businessName}</span>
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
    <div
      ref={containerRef}
      className="flex-1 min-h-0 w-full flex flex-col overflow-y-auto overflow-x-hidden"
      style={{ backgroundColor: site.backgroundColor, color: site.textColor }}
    >
      {/* Responsive Navbar with Hamburger Menu replacing standard navigation links on small screens (< 768px) */}
      <WebsiteNavbar
        site={site}
        activePage={activePage}
        onNavigate={(page) => setActivePage(page)}
        onLogEvent={logPreviewEvent}
        forcedViewport={forcedViewport}
        containerWidth={containerWidth}
      />

      {/* Main Content Layout */}
      <div className="flex-1 w-full">
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
              <section className="p-6 max-w-3xl mx-auto text-left">
                <h3 className={`text-lg font-bold text-slate-800 mb-4 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                  Privacy Policy
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-sans break-words">{site.privacyPolicy}</p>
              </section>
            )}

            {activePage === 'terms' && site.termsOfService && (
              <section className="p-6 max-w-3xl mx-auto text-left">
                <h3 className={`text-lg font-bold text-slate-800 mb-4 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                  Terms of Service
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-sans break-words">{site.termsOfService}</p>
              </section>
            )}

            {activePage === '404' && site.notFoundPage && (
              <section className="p-12 max-w-2xl mx-auto text-center space-y-4">
                <h3 className={`text-4xl font-black text-slate-800 ${getFontFamilyClass(site.fontStyle)}`} style={{ color: site.primaryColor }}>
                  404
                </h3>
                <h4 className="text-lg font-bold text-slate-700 font-sans">{site.notFoundPage.title}</h4>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto font-sans">
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
      <footer
        className={`${isMobileLayout ? "p-6 text-center" : "px-8 py-10 text-left"} text-xs text-slate-500 border-t border-slate-100 bg-white shrink-0`}
        style={{ backgroundColor: `${site.primaryColor}05` }}
      >
        {isMobileLayout ? (
          <div className="space-y-2">
            <p className="font-bold text-sm text-slate-800 break-words">{site.businessName}</p>
            <p className="flex items-center justify-center gap-1.5 text-[11px] break-words">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" />
              <span>{site.address}</span>
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-[11px]">
              <button onClick={() => setActivePage('privacy')} className="hover:underline cursor-pointer">Privacy Policy</button>
              <button onClick={() => setActivePage('terms')} className="hover:underline cursor-pointer">Terms of Service</button>
              <button onClick={() => setActivePage('404')} className="hover:underline cursor-pointer">404 Page</button>
            </div>
            <p className="pt-2 text-[10px] text-slate-400">© 2026. Free website preview created by SiteScout AI.</p>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-3 gap-8 pb-6 border-b border-slate-200/70">
              <div className="space-y-2 min-w-0">
                <p className="font-bold text-sm text-slate-800 break-words">{site.businessName}</p>
                <p className="text-xs text-slate-500 leading-relaxed break-words">{site.category || "Local Business"}</p>
                <p className="flex items-start gap-1.5 text-xs text-slate-500 break-words">
                  <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-500" />
                  <span>{site.address}</span>
                </p>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-xs uppercase tracking-wider text-slate-700">Navigation</p>
                <div className="flex flex-col space-y-1.5 text-xs">
                  <button onClick={() => setActivePage('home')} className="text-left hover:text-slate-900 cursor-pointer">Home</button>
                  {sectionsOrder.includes('about') && <button onClick={() => setActivePage('about')} className="text-left hover:text-slate-900 cursor-pointer">About</button>}
                  {sectionsOrder.includes('services') && <button onClick={() => setActivePage('services')} className="text-left hover:text-slate-900 cursor-pointer">Services</button>}
                  {sectionsOrder.includes('contact') && <button onClick={() => setActivePage('contact')} className="text-left hover:text-slate-900 cursor-pointer">Contact</button>}
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-xs uppercase tracking-wider text-slate-700">Direct &amp; Legal</p>
                <div className="flex flex-col space-y-1.5 text-xs">
                  {hasPhone && <span className="text-slate-600">{site.phone}</span>}
                  {site.contactPage?.email && <span className="text-slate-600 break-all">{site.contactPage.email}</span>}
                  <div className="flex items-center gap-3 pt-1">
                    <button onClick={() => setActivePage('privacy')} className="hover:underline cursor-pointer">Privacy Policy</button>
                    <button onClick={() => setActivePage('terms')} className="hover:underline cursor-pointer">Terms of Service</button>
                  </div>
                </div>
              </div>
            </div>
            <p className="pt-4 text-[11px] text-slate-400 text-center">© 2026 {site.businessName}. Website preview created by SiteScout AI.</p>
          </div>
        )}
      </footer>
    </div>
  );
}
