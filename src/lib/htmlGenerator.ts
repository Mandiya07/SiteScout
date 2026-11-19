import {
  resolveHeroImageUrl,
  getCategoryHeroImage,
  getCategorySectionImages,
  INLINE_SVG_IMAGE_FALLBACK,
  INLINE_SVG_MAP_FALLBACK
} from "./heroImages";
import { normalizePhoneNumber, generateWhatsappLink } from "./formatters";
import { normalizeWebsiteSchema } from "./websiteSchema";

/**
 * Escapes HTML characters to prevent XSS in generated static HTML.
 */
export function escapeHtml(str?: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sanitizes URLs to prevent malicious protocols (javascript:, data:, etc.) in href/src.
 */
export function sanitizeUrl(url?: string): string {
  if (!url) return "#";
  const trimmed = String(url).trim();
  if (/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(trimmed)) {
    return escapeHtml(trimmed);
  }
  return "#";
}

/**
 * Returns Font Family CSS class string matching WebsiteView.tsx
 */
function getFontFamilyClass(style?: string): string {
  switch (style) {
    case "serif": return "font-serif";
    case "display": return "font-sans tracking-tight font-black";
    case "modern": return "font-sans uppercase tracking-wider font-semibold";
    default: return "font-sans";
  }
}

/**
 * Returns SVG path matching icon identifiers in WebsiteView.tsx
 */
function getLogoIconSvg(iconId?: string, color: string = "#2563eb"): string {
  const id = (iconId || "Sparkles").toLowerCase();
  let pathD = "M13 10V3L4 14h7v7l9-11h-7z"; // Default Zap
  if (id.includes("wrench")) {
    pathD = "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z";
  } else if (id.includes("utensil")) {
    pathD = "M18 2v10M18 20v2M12 2v20M6 2v7a3 3 0 003 3v0a3 3 0 003-3V2";
  } else if (id.includes("phone")) {
    pathD = "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z";
  } else if (id.includes("shield") || id.includes("check")) {
    pathD = "M9 12l2 2 4-4m5.618-4.016A11.955 11.045 0 0112 2.944a11.955 11.045 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z";
  } else if (id.includes("home") || id.includes("building")) {
    pathD = "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6";
  } else if (id.includes("sparkle") || id.includes("star")) {
    pathD = "M5 3v4M3 5h4M6 17v4M4 19h4M13 3l1.868 6.132L21 11l-6.132 1.868L13 19l-1.868-6.132L5 11l6.132-1.868L13 3z";
  }

  return `
    <svg class="h-5 w-5" fill="none" stroke="${color}" viewBox="0 0 24 24" style="color: ${color}">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${pathD}" />
    </svg>
  `;
}

/**
 * Generates production-grade, responsive static HTML matching WebsiteView.tsx with 1:1 visual parity.
 */
export function generateStaticHtml(rawSite: any): string {
  const site = normalizeWebsiteSchema(rawSite);
  const businessName = escapeHtml(site.businessName || "Local Business");
  const rawPhoneStr = (site.phone || "").trim();
  const phone = rawPhoneStr && !["unlisted", "none", "n/a", "not available"].includes(rawPhoneStr.toLowerCase()) ? escapeHtml(rawPhoneStr) : "";
  const cleanPhone = normalizePhoneNumber(site.phone, site.address);
  const waLink = sanitizeUrl(generateWhatsappLink(site.phone, site.whatsappMessage, site.address));
  const address = escapeHtml(site.address || "");
  const category = escapeHtml(site.category || "Professional Services");
  const primaryColor = escapeHtml(site.primaryColor || "#1e3a8a");
  const secondaryColor = escapeHtml(site.secondaryColor || "#0284c7");
  const accentColor = escapeHtml(site.accentColor || "#10b981");
  const backgroundColor = escapeHtml(site.backgroundColor || "#ffffff");
  const textColor = escapeHtml(site.textColor || "#0f172a");
  const fontStyle = site.fontStyle || "sans";
  const heroImageSrc = sanitizeUrl(resolveHeroImageUrl(site));
  const sectionFallbacks = getCategorySectionImages(site.category);
  const categoryHeroFallback = sanitizeUrl(getCategoryHeroImage(site.category));
  const contactEmail = escapeHtml(site.contactPage?.email || site.email || "");

  const seoTitle = escapeHtml(site.seo?.ogTitle || site.seo?.title || site.businessName);
  const seoDesc = escapeHtml(site.seo?.ogDescription || site.seo?.description || `${site.businessName} - Quality ${category} in ${address}`);
  const seoKeywords = escapeHtml(site.seo?.keywords || `${category}, ${site.businessName}, services`);
  const ogImage = sanitizeUrl(site.seo?.ogImage || site.hero?.imageUrl || heroImageSrc);

  const sectionsOrder: string[] = site.sectionsOrder && Array.isArray(site.sectionsOrder) && site.sectionsOrder.length > 0
    ? site.sectionsOrder
    : ["hero", "features", "services", "about", "testimonials", "faqs", "gallery", "blog", "contact"];

  const fontClass = getFontFamilyClass(fontStyle);

  // Logo Rendering (gracefully falls back to text logo if image fails to load)
  let logoHtml = `<span class="text-sm font-bold truncate block min-w-0 ${fontClass}" style="color: ${primaryColor}" title="${businessName}">${businessName}</span>`;
  if (site.logoType === "image" && site.logoUrl) {
    logoHtml = `<img src="${sanitizeUrl(site.logoUrl)}" alt="${businessName}" class="h-8 w-auto object-contain max-w-[150px]" referrerpolicy="no-referrer" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='block';" /><span class="text-sm font-bold truncate min-w-0 ${fontClass}" style="display:none;color: ${primaryColor}" title="${businessName}">${businessName}</span>`;
  } else if (site.logoType === "icon") {
    logoHtml = `
      <div class="text-sm font-bold flex items-center gap-2 min-w-0 ${fontClass}" style="color: ${primaryColor}" title="${businessName}">
        ${getLogoIconSvg(site.logoIcon, primaryColor)}
        <span class="truncate block min-w-0">${businessName}</span>
      </div>
    `;
  }

  // Hero Section
  const renderHero = () => `
    <section id="hero" class="relative px-5 py-20 sm:py-28 md:py-32 text-center overflow-hidden flex items-center justify-center min-h-[380px] sm:min-h-[460px]">
      <div class="absolute inset-0 z-0 select-none">
        <img src="${heroImageSrc}" alt="${escapeHtml(site.hero?.title || businessName)}" class="w-full h-full object-cover object-center" referrerpolicy="no-referrer" onerror="window.__scImgFallback&&window.__scImgFallback(this,'${categoryHeroFallback}',false)" />
        <div class="absolute inset-0" style="background: linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.84) 50%, rgba(15, 23, 42, 0.94) 100%);"></div>
        <div class="absolute inset-0 opacity-20 mix-blend-color" style="background-color: ${primaryColor}"></div>
      </div>

      <div class="relative z-10 max-w-3xl mx-auto space-y-4 sm:space-y-6 px-4">
        <div class="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold tracking-wider text-slate-200/90 uppercase">
          <span>${category}</span>
          <span aria-hidden="true">&bull;</span>
          <span>${businessName}</span>
        </div>

        <h1 class="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight sm:leading-tight tracking-tight drop-shadow-md ${fontClass}">
          ${escapeHtml(site.hero?.title || `${site.businessName}`)}
        </h1>

        <p class="text-xs sm:text-base text-slate-200/90 leading-relaxed font-sans max-w-2xl mx-auto drop-shadow-xs">
          ${escapeHtml(site.hero?.subtitle || `Trusted ${category} delivering quality craftsmanship and transparent quotes.`)}
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <a href="#contact" class="w-full sm:w-auto px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer text-center" style="background-color: ${accentColor}">
            ${escapeHtml(site.hero?.ctaPrimary || "Get a Free Quote")}
          </a>
          <a href="#services" class="w-full sm:w-auto px-7 py-3.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 shadow-sm active:scale-95 transition-all cursor-pointer text-center">
            ${escapeHtml(site.hero?.ctaSecondary || "Explore Services")}
          </a>
        </div>

        ${site.hero?.photographer ? `
          <div class="pt-2 text-[10px] text-white/50">
            Photo by ${escapeHtml(site.hero.photographer)}
          </div>
        ` : ""}
      </div>
    </section>
  `;

  // Features Section
  const renderFeatures = () => {
    if (!site.features || !site.features.length) return "";
    return `
    <section id="features" class="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <h3 class="text-center text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 ${fontClass}">
        Why Choose Us
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        ${site.features.map((feat: any) => `
          <div class="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs text-center space-y-2.5 min-w-0 overflow-hidden">
            <span class="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            </span>
            <h4 class="text-sm sm:text-base font-bold text-slate-900 font-sans break-words">${escapeHtml(feat.title)}</h4>
            <p class="text-xs sm:text-sm text-slate-500 leading-relaxed font-sans break-words">${escapeHtml(feat.description)}</p>
          </div>
        `).join("")}
      </div>
    </section>
    `;
  };

  // Services Section
  const renderServices = () => {
    if (!site.services || !site.services.length) return "";
    return `
    <section id="services" class="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-slate-50/60 border-t border-b border-slate-200/60">
      <div class="max-w-5xl mx-auto">
        <h3 class="text-center text-lg sm:text-2xl font-bold text-slate-800 mb-2 ${fontClass}" style="color: ${primaryColor}">
          Our Specialized Packages
        </h3>
        <p class="text-center text-xs sm:text-sm text-slate-500 mb-8 max-w-xl mx-auto font-sans">
          Transparent quote-based services tailored to your exact requirements.
        </p>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${site.services.map((srv: any, idx: number) => `
            <div class="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col justify-between min-w-0">
              ${srv.imageUrl ? `
                <div class="h-44 w-full overflow-hidden bg-slate-100 shrink-0">
                  <img src="${sanitizeUrl(srv.imageUrl)}" alt="${escapeHtml(srv.title)}" loading="lazy" decoding="async" class="w-full h-full object-cover" referrerpolicy="no-referrer" onerror="window.__scImgFallback&&window.__scImgFallback(this,'${sanitizeUrl(sectionFallbacks.services[idx % sectionFallbacks.services.length])}',false)" />
                </div>
              ` : ""}
              <div class="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4 min-w-0">
                <div class="space-y-1.5 text-left min-w-0">
                  <h4 class="text-sm sm:text-base font-bold text-slate-900 font-sans break-words">${escapeHtml(srv.title)}</h4>
                  <p class="text-xs sm:text-sm text-slate-500 leading-relaxed font-sans break-words">${escapeHtml(srv.description)}</p>
                </div>
                <div class="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100 min-w-0">
                  <span class="text-xs font-bold text-slate-700 min-w-0 break-words leading-snug">
                    ${escapeHtml(srv.price || "Request a Quote")}
                  </span>
                  <a href="#contact" class="px-3.5 py-1.5 text-xs font-bold rounded-lg text-white shadow-xs hover:brightness-105 transition-all text-center shrink-0 whitespace-nowrap" style="background-color: ${primaryColor}">
                    Enquire
                  </a>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
    `;
  };

  // About Section
  const renderAbout = () => {
    if (!site.about) return "";
    return `
    <section id="about" class="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center text-left">
        <div class="space-y-4 min-w-0">
          <span class="text-xs font-bold uppercase tracking-wider text-slate-400 font-sans block">
            Local Commitment
          </span>
          <h3 class="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-800 break-words ${fontClass}" style="color: ${primaryColor}">
            ${escapeHtml(site.about.title || `About ${site.businessName}`)}
          </h3>
          <p class="text-xs sm:text-sm text-slate-600 leading-relaxed font-sans break-words">
            ${escapeHtml(site.about.history || "")}
          </p>
          ${site.about.mission ? `
            <div class="rounded-xl bg-slate-50 border border-slate-200/80 p-4 min-w-0">
              <p class="text-xs sm:text-sm text-slate-600 italic font-sans break-words">
                "${escapeHtml(site.about.mission)}"
              </p>
            </div>
          ` : ""}
        </div>
        ${site.about.imageUrl ? `
          <div class="rounded-2xl overflow-hidden shadow-sm aspect-4/3 border border-slate-200 bg-white w-full">
            <img src="${sanitizeUrl(site.about.imageUrl)}" alt="${escapeHtml(site.about.title)}" loading="lazy" decoding="async" class="w-full h-full object-cover" referrerpolicy="no-referrer" onerror="window.__scImgFallback&&window.__scImgFallback(this,'${sanitizeUrl(sectionFallbacks.about)}',false)" />
          </div>
        ` : ""}
      </div>
    </section>
    `;
  };

  // Gallery Section
  const renderGallery = () => {
    if (!site.gallery || !site.gallery.length) return "";
    return `
    <section id="gallery" class="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <h3 class="text-center text-lg sm:text-2xl font-bold text-slate-800 mb-6 ${fontClass}" style="color: ${primaryColor}">
        Gallery
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        ${site.gallery.map((img: any, idx: number) => `
          <div class="group bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs flex flex-col min-w-0">
            <div class="aspect-4/3 w-full overflow-hidden bg-slate-100 shrink-0">
              <img src="${sanitizeUrl(img.url)}" alt="${escapeHtml(img.alt || businessName)}" loading="lazy" decoding="async" class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" referrerpolicy="no-referrer" onerror="window.__scImgFallback&&window.__scImgFallback(this,'${sanitizeUrl(sectionFallbacks.gallery[idx % sectionFallbacks.gallery.length].url)}',false)" />
            </div>
            ${img.alt ? `
              <div class="px-3.5 py-2.5 bg-white border-t border-slate-100 text-left min-w-0">
                <p class="text-xs font-semibold text-slate-700 leading-snug line-clamp-2 break-words">
                  ${escapeHtml(img.alt)}
                </p>
              </div>
            ` : ""}
          </div>
        `).join("")}
      </div>
    </section>
    `;
  };

  // Testimonials Section
  const renderTestimonials = () => {
    if (!site.testimonials || !site.testimonials.length) return "";
    return `
    <section id="testimonials" class="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <h3 class="text-center text-lg sm:text-2xl font-bold text-slate-800 mb-6 ${fontClass}" style="color: ${primaryColor}">
        Client Reviews
      </h3>
      <div class="grid gap-6 md:grid-cols-2">
        ${site.testimonials.map((test: any) => `
          <div class="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs text-left min-w-0 overflow-hidden flex flex-col justify-between">
            <div class="min-w-0">
              ${test.rating > 0 ? `
              <div class="flex items-center gap-1 mb-2.5">
                ${Array.from({ length: 5 }).map((_, j) => `
                  <svg class="w-4 h-4 ${j < test.rating ? 'text-amber-400' : 'text-slate-200'}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                `).join("")}
              </div>
              ` : ''}
              <p class="text-xs sm:text-sm text-slate-600 italic mb-3 leading-relaxed font-sans break-words">"${escapeHtml(test.review)}"</p>
            </div>
            <p class="text-xs font-bold text-slate-800 font-sans break-words">- ${escapeHtml(test.name)}</p>
          </div>
        `).join("")}
      </div>
    </section>
    `;
  };

  // FAQs Section
  const renderFaqs = () => {
    if (!site.faqs || !site.faqs.length) return "";
    return `
    <section id="faqs" class="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <h3 class="text-center text-lg sm:text-2xl font-bold text-slate-800 mb-6 ${fontClass}" style="color: ${primaryColor}">
        Frequently Asked Questions
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${site.faqs.map((faq: any) => `
          <details open class="group bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs text-left min-w-0 overflow-hidden">
            <summary class="text-xs sm:text-sm font-bold text-slate-800 flex items-start justify-between gap-3 font-sans cursor-pointer list-none">
              <span class="flex-1 min-w-0 break-words leading-snug">${escapeHtml(faq.question)}</span>
              <svg class="h-4 w-4 text-slate-400 shrink-0 mt-0.5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <p class="text-xs sm:text-sm text-slate-500 leading-relaxed mt-2.5 pt-2.5 border-t border-slate-100 font-sans break-words">
              ${escapeHtml(faq.answer)}
            </p>
          </details>
        `).join("")}
      </div>
    </section>
    `;
  };

  // Blog Section
  const renderBlog = () => {
    if (!site.blog || !site.blog.length) return "";
    return `
    <section id="blog" class="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <h3 class="text-center text-lg sm:text-2xl font-bold text-slate-800 mb-6 ${fontClass}" style="color: ${primaryColor}">
        Latest Insights &amp; Articles
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${site.blog.map((post: any) => `
          <div class="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-xs text-left min-w-0 overflow-hidden">
            <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 block break-words">${escapeHtml(post.category || "Article")}</span>
            <h4 class="text-sm sm:text-base font-bold text-slate-900 mb-2 font-sans break-words">${escapeHtml(post.title)}</h4>
            <p class="text-xs sm:text-sm text-slate-500 leading-relaxed font-sans break-words">${escapeHtml(post.summary)}</p>
          </div>
        `).join("")}
      </div>
    </section>
    `;
  };

  // Contact Section
  const renderContact = () => `
    <section id="contact" class="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-left">
      <h3 class="text-center text-lg sm:text-2xl font-bold text-slate-800 mb-2 ${fontClass}" style="color: ${primaryColor}">
        ${escapeHtml(site.contactPage?.title || "Contact Us")}
      </h3>
      <p class="text-xs sm:text-sm text-slate-600 text-center mb-8 max-w-2xl mx-auto font-sans break-words">${escapeHtml(site.contactPage?.description || "Reach out directly via email or phone to discuss your needs.")}</p>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <!-- Interactive Lead Capture Form -->
        <div class="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm min-w-0 overflow-hidden">
          <div id="form-success-banner" class="hidden text-center py-6 space-y-3">
            <div class="mx-auto w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xl">✓</div>
            <h4 class="text-base font-bold text-slate-900">Enquiry Received!</h4>
            <p id="form-success-text" class="text-xs text-slate-600 max-w-md mx-auto font-sans leading-relaxed break-words">
              Thank you! Your enquiry has been delivered directly to the team at ${businessName}.
            </p>
            <button type="button" onclick="resetContactForm()" class="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer">
              Send Another Message
            </button>
          </div>

          <form id="lead-contact-form" onsubmit="submitLeadForm(event)" class="space-y-4">
            <div class="border-b border-slate-100 pb-3">
              <h4 class="text-sm font-bold text-slate-900">Request a Quote or Service Consultation</h4>
              <p class="text-[11px] text-slate-500 font-sans mt-0.5">Fill in your requirements below and our team will get back to you promptly.</p>
            </div>

            <div id="form-error-banner" class="hidden p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium"></div>

            <!-- Honeypot field for bot protection -->
            <input type="text" name="website_url_hp" id="form-honeypot" style="display: none;" tabindex="-1" autocomplete="off" />

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="min-w-0">
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Your Full Name <span class="text-red-500">*</span></label>
                <input type="text" id="form-name" required placeholder="e.g. Thabo Dlamini" class="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2" />
              </div>
              <div class="min-w-0">
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Email Address <span class="text-red-500">*</span></label>
                <input type="email" id="form-email" required placeholder="e.g. thabo@example.com" class="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2" />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="min-w-0">
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Phone / WhatsApp <span class="text-slate-400 font-normal">(Optional)</span></label>
                <input type="tel" id="form-phone" placeholder="e.g. +268 7600 0000" class="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2" />
              </div>
              <div class="min-w-0">
                <label class="block text-[11px] font-bold text-slate-700 mb-1">Service of Interest <span class="text-slate-400 font-normal">(Optional)</span></label>
                <select id="form-service" class="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2">
                  <option value="">General Consultation</option>
                  ${(site.services || []).map((srv: any) => `<option value="${escapeHtml(srv.title)}">${escapeHtml(srv.title)}</option>`).join("")}
                </select>
              </div>
            </div>

            <div>
              <label class="block text-[11px] font-bold text-slate-700 mb-1">Project Details / Message <span class="text-red-500">*</span></label>
              <textarea id="form-message" required rows="3" placeholder="Please describe what you need assistance with, timeline, and any specific requirements..." class="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 resize-none font-sans"></textarea>
            </div>

            <button type="submit" id="form-submit-btn" class="w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 text-center leading-snug cursor-pointer transition-transform hover:scale-[1.01]" style="background-color: ${primaryColor}">
              <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              <span class="min-w-0 break-words">Send Enquiry Directly to ${businessName}</span>
            </button>
          </form>
        </div>

        <!-- Direct Instant Contact Options & Map -->
        <div class="space-y-5 min-w-0">
          <div class="bg-slate-50 rounded-2xl border border-slate-200/60 p-5 sm:p-6 min-w-0 overflow-hidden">
            <h4 class="text-sm font-bold text-slate-800 mb-2 font-sans">Prefer direct instant communication?</h4>
            <p class="text-xs text-slate-500 mb-4 font-sans break-words">Connect directly with our local team for immediate callback or quotation scheduling.</p>
            <div class="flex flex-col sm:flex-row sm:flex-wrap gap-2.5">
              ${contactEmail ? `
                <a href="mailto:${contactEmail}" class="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer transition-transform hover:scale-[1.02] text-center" style="background-color: ${accentColor}">
                  <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  <span>Email Us</span>
                </a>
              ` : ""}
              ${phone ? `
                <a href="tel:${phone}" class="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm border border-slate-200 bg-white text-slate-800 cursor-pointer transition-transform hover:scale-[1.02] text-center break-words">
                  <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                  <span class="break-words">Call ${phone}</span>
                </a>
              ` : ""}
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-3 text-xs text-slate-600 min-w-0 overflow-hidden">
            ${phone ? `<div class="flex items-start gap-2.5 font-sans min-w-0"><svg class="h-4 w-4 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg> <span class="min-w-0 flex-1 break-words">${phone}</span></div>` : ""}
            ${address ? `<div class="flex items-start gap-2.5 font-sans min-w-0"><svg class="h-4 w-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg> <span class="min-w-0 flex-1 break-words">${address}</span></div>` : ""}
            ${contactEmail ? `<div class="flex items-start gap-2.5 font-sans min-w-0"><svg class="h-4 w-4 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> <span class="min-w-0 flex-1 break-all">${contactEmail}</span></div>` : ""}
          </div>
          
          <div class="rounded-2xl overflow-hidden border border-slate-200 h-44 bg-slate-100 flex items-center justify-center relative px-4">
            <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80" alt="${businessName} location map" loading="lazy" decoding="async" class="absolute inset-0 w-full h-full object-cover opacity-45" referrerpolicy="no-referrer" onerror="window.__scImgFallback&&window.__scImgFallback(this,'',true)" />
            <div class="relative z-10 bg-white/95 backdrop-blur-xs px-3.5 py-2.5 rounded-xl shadow-xs border border-slate-200 flex items-center gap-2 max-w-[calc(100%-1rem)]">
              <svg class="h-4 w-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span class="text-xs font-bold text-slate-800 font-sans truncate">${businessName}</span>
            </div>
          </div>
        </div>
      </div>

      <script>
        async function submitLeadForm(event) {
          event.preventDefault();
          var btn = document.getElementById('form-submit-btn');
          var errorBanner = document.getElementById('form-error-banner');
          var successBanner = document.getElementById('form-success-banner');
          var form = document.getElementById('lead-contact-form');
          
          var name = document.getElementById('form-name').value.trim();
          var email = document.getElementById('form-email').value.trim();
          var phone = document.getElementById('form-phone').value.trim();
          var service = document.getElementById('form-service').value;
          var message = document.getElementById('form-message').value.trim();
          var honeypot = document.getElementById('form-honeypot').value;

          errorBanner.classList.add('hidden');
          btn.disabled = true;
          btn.innerText = 'Transmitting Enquiry...';

          try {
            var token = '${site.previewToken || site.id}';
            var res = await fetch('/api/preview/' + token + '/lead', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: name, email: email, phone: phone, service: service, message: message, honeypot: honeypot })
            });
            var data = await res.json();
            if (!res.ok || !data.success) {
              throw new Error(data.error || 'Failed to submit enquiry.');
            }
            form.classList.add('hidden');
            successBanner.classList.remove('hidden');
            if (data.message) {
              document.getElementById('form-success-text').innerText = data.message;
            }
          } catch (err) {
            errorBanner.innerText = err.message || 'Submission failed. Please try again.';
            errorBanner.classList.remove('hidden');
            btn.disabled = false;
            btn.innerText = 'Send Enquiry Directly to ${businessName}';
          }
        }

        function resetContactForm() {
          document.getElementById('lead-contact-form').reset();
          document.getElementById('lead-contact-form').classList.remove('hidden');
          document.getElementById('form-success-banner').classList.add('hidden');
          document.getElementById('form-submit-btn').disabled = false;
          document.getElementById('form-submit-btn').innerText = 'Send Enquiry Directly to ${businessName}';
        }
      </script>
    </section>
  `;

  // Section Renders Mapping
  const sectionRenders: Record<string, () => string> = {
    hero: renderHero,
    features: renderFeatures,
    services: renderServices,
    about: renderAbout,
    testimonials: renderTestimonials,
    faqs: renderFaqs,
    gallery: renderGallery,
    blog: renderBlog,
    contact: renderContact
  };

  const renderedSectionsHtml = sectionsOrder
    .map((secId) => sectionRenders[secId] ? sectionRenders[secId]() : "")
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${seoTitle}</title>
  <meta name="description" content="${seoDesc}">
  <meta name="keywords" content="${seoKeywords}">
  <meta property="og:title" content="${seoTitle}">
  <meta property="og:description" content="${seoDesc}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:type" content="website">
  
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    :root {
      --primary: ${primaryColor};
      --secondary: ${secondaryColor};
      --accent: ${accentColor};
      --bg: ${backgroundColor};
      --text: ${textColor};
    }
    body {
      background-color: var(--bg);
      color: var(--text);
    }
    @media (max-width: 767.98px) {
      .site-desktop-nav {
        display: none !important;
      }
      .site-hamburger-toggle {
        display: flex !important;
      }
    }
    @media (min-width: 768px) {
      .site-desktop-nav {
        display: flex !important;
      }
      .site-hamburger-toggle {
        display: none !important;
      }
      #mobile-menu-drawer {
        display: none !important;
      }
    }
    #mobile-menu-drawer {
      max-height: min(70vh, 460px);
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }
    #mobile-menu-drawer::-webkit-scrollbar {
      width: 5px;
    }
    #mobile-menu-drawer::-webkit-scrollbar-track {
      background: transparent;
    }
    #mobile-menu-drawer::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.4);
      border-radius: 9999px;
    }
  </style>
</head>
<body class="antialiased min-h-screen flex flex-col font-sans overflow-x-hidden" style="background-color: ${backgroundColor}; color: ${textColor};">
  <!-- Sticky Header Nav -->
  <header class="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm px-4 sm:px-6 lg:px-8 py-3.5 shrink-0 shadow-2xs" style="border-bottom-color: ${primaryColor}15;">
    <div class="flex items-center justify-between gap-4 w-full max-w-5xl mx-auto">
      <a href="#hero" class="cursor-pointer min-w-0 flex-1 md:flex-none max-w-[60%] md:max-w-[230px]">
        ${logoHtml}
      </a>

      <!-- Desktop Nav (Hidden when screen width < 768px) -->
      <nav class="site-desktop-nav hidden md:flex items-center gap-5 lg:gap-7 text-xs font-semibold text-slate-600 shrink-0" aria-label="Main Navigation">
        <a href="#hero" class="hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap">Home</a>
        ${sectionsOrder.includes("about") ? `<a href="#about" class="hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap">About</a>` : ""}
        ${sectionsOrder.includes("services") ? `<a href="#services" class="hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap">Services</a>` : ""}
        ${sectionsOrder.includes("gallery") ? `<a href="#gallery" class="hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap">Gallery</a>` : ""}
        ${sectionsOrder.includes("blog") ? `<a href="#blog" class="hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap">Blog</a>` : ""}
        ${sectionsOrder.includes("contact") ? `<a href="#contact" class="hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap">Contact</a>` : ""}
      </nav>

      <!-- Actions & Mobile Hamburger Button -->
      <div class="flex items-center gap-2 shrink-0">
        ${phone ? `
          <a href="tel:${phone}" class="flex h-8 w-8 md:h-8.5 md:w-auto md:px-3 items-center justify-center gap-1.5 rounded-lg text-white text-xs font-bold shadow-xs transition-transform hover:scale-105 shrink-0" style="background-color: ${accentColor}" title="Call now">
            <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            <span class="hidden md:inline">Call</span>
          </a>
        ` : ""}
        ${cleanPhone ? `
          <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="flex h-8 w-8 md:h-8.5 md:w-auto md:px-3 items-center justify-center gap-1.5 rounded-lg text-white text-xs font-bold bg-emerald-500 shadow-xs transition-transform hover:scale-105 shrink-0" title="WhatsApp">
            <svg class="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            <span class="hidden md:inline">WhatsApp</span>
          </a>
        ` : ""}
        <!-- Hamburger Menu Toggle Button (replaces standard navigation links on small screens < 768px) -->
        <button id="mobile-menu-toggle" class="site-hamburger-toggle flex md:hidden h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shrink-0" aria-label="Toggle navigation menu" aria-expanded="false">
          <svg id="hamburger-icon" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
          <svg id="close-icon" class="h-4 w-4 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
    </div>

    <!-- Mobile Vertical Dropdown Menu (revealed when hamburger open/close toggle state is open) -->
    <div id="mobile-menu-drawer" class="hidden md:hidden mt-3 pt-3 border-t border-slate-100 flex flex-col space-y-1 max-h-[min(70vh,460px)] overflow-y-auto overscroll-contain pr-1.5 pb-3">
      <a href="#hero" class="mobile-nav-link flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">Home</a>
      ${sectionsOrder.includes("about") ? `<a href="#about" class="mobile-nav-link flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">About</a>` : ""}
      ${sectionsOrder.includes("services") ? `<a href="#services" class="mobile-nav-link flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">Services</a>` : ""}
      ${sectionsOrder.includes("gallery") ? `<a href="#gallery" class="mobile-nav-link flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">Gallery</a>` : ""}
      ${sectionsOrder.includes("blog") ? `<a href="#blog" class="mobile-nav-link flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">Blog</a>` : ""}
      ${sectionsOrder.includes("contact") ? `<a href="#contact" class="mobile-nav-link flex items-center px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors">Contact</a>` : ""}
      ${site.privacyPolicy ? `<a href="#privacy" onclick="document.getElementById('privacy').classList.remove('hidden')" class="mobile-nav-link flex items-center px-3.5 py-2 rounded-xl text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors">Privacy Policy</a>` : ""}
      ${site.termsOfService ? `<a href="#terms" onclick="document.getElementById('terms').classList.remove('hidden')" class="mobile-nav-link flex items-center px-3.5 py-2 rounded-xl text-[11px] font-semibold text-slate-500 hover:bg-slate-100 transition-colors">Terms of Service</a>` : ""}
    </div>
  </header>

  <!-- Main Body Content -->
  <main class="flex-1">
    ${renderedSectionsHtml}

    ${site.privacyPolicy ? `
      <section id="privacy" class="p-6 max-w-3xl mx-auto text-left hidden border-t border-slate-100">
        <h3 class="text-lg font-bold text-slate-800 mb-4 ${fontClass}" style="color: ${primaryColor}">Privacy Policy</h3>
        <p class="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-sans break-words">${escapeHtml(site.privacyPolicy)}</p>
      </section>
    ` : ""}

    ${site.termsOfService ? `
      <section id="terms" class="p-6 max-w-3xl mx-auto text-left hidden border-t border-slate-100">
        <h3 class="text-lg font-bold text-slate-800 mb-4 ${fontClass}" style="color: ${primaryColor}">Terms of Service</h3>
        <p class="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-sans break-words">${escapeHtml(site.termsOfService)}</p>
      </section>
    ` : ""}
  </main>

  <!-- Footer Block -->
  <footer class="px-6 sm:px-8 py-8 sm:py-10 text-center md:text-left text-xs text-slate-500 border-t border-slate-100 bg-white" style="background-color: ${primaryColor}05;">
    <div class="max-w-5xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-200/70">
        <div class="space-y-1.5 min-w-0">
          <p class="font-bold text-sm text-slate-800 break-words">${businessName}</p>
          <p class="text-xs text-slate-500 break-words">${category}</p>
          ${address ? `<p class="mt-1 flex items-center justify-center md:justify-start gap-1.5 break-words"><svg class="h-3.5 w-3.5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg> <span>${address}</span></p>` : ""}
        </div>
        <div class="space-y-1.5 hidden md:block">
          <p class="font-bold text-xs uppercase tracking-wider text-slate-700">Navigation</p>
          <div class="flex flex-col space-y-1">
            <a href="#hero" class="hover:text-slate-900">Home</a>
            ${sectionsOrder.includes("about") ? `<a href="#about" class="hover:text-slate-900">About</a>` : ""}
            ${sectionsOrder.includes("services") ? `<a href="#services" class="hover:text-slate-900">Services</a>` : ""}
            ${sectionsOrder.includes("contact") ? `<a href="#contact" class="hover:text-slate-900">Contact</a>` : ""}
          </div>
        </div>
        <div class="space-y-1.5">
          <p class="font-bold text-xs uppercase tracking-wider text-slate-700 hidden md:block">Direct &amp; Legal</p>
          ${phone ? `<p class="text-slate-600 hidden md:block">${phone}</p>` : ""}
          ${contactEmail ? `<p class="text-slate-600 hidden md:block break-all">${contactEmail}</p>` : ""}
          <div class="flex items-center justify-center md:justify-start gap-3 pt-1">
            ${site.privacyPolicy ? `<a href="#privacy" onclick="document.getElementById('privacy').classList.remove('hidden')" class="hover:underline cursor-pointer">Privacy Policy</a>` : ""}
            ${site.termsOfService ? `<a href="#terms" onclick="document.getElementById('terms').classList.remove('hidden')" class="hover:underline cursor-pointer">Terms of Service</a>` : ""}
          </div>
        </div>
      </div>
      <p class="pt-4 text-[10px] sm:text-xs text-slate-400 text-center">&copy; ${new Date().getFullYear()} ${businessName}. Website built by SiteScout AI.</p>
    </div>
  </footer>

  <script>
    window.__scImgFallback = function(el, fallbackUrl, isMap) {
      if (!el) return;
      var step = el.getAttribute('data-fb-step') || '0';
      if (step === '0' && fallbackUrl && fallbackUrl !== '#' && el.src !== fallbackUrl) {
        el.setAttribute('data-fb-step', '1');
        el.src = fallbackUrl;
        return;
      }
      if (step !== 'done') {
        el.setAttribute('data-fb-step', 'done');
        el.onerror = null;
        el.src = isMap ? ${JSON.stringify(INLINE_SVG_MAP_FALLBACK)} : ${JSON.stringify(INLINE_SVG_IMAGE_FALLBACK)};
      }
    };
    (function() {
      var menuBtn = document.getElementById('mobile-menu-toggle');
      var menuDrawer = document.getElementById('mobile-menu-drawer');
      var hamburgerIcon = document.getElementById('hamburger-icon');
      var closeIcon = document.getElementById('close-icon');
      if (menuBtn && menuDrawer) {
        menuBtn.addEventListener('click', function() {
          var isClosed = menuDrawer.classList.contains('hidden');
          if (isClosed) {
            menuDrawer.classList.remove('hidden');
            if (hamburgerIcon) hamburgerIcon.classList.add('hidden');
            if (closeIcon) closeIcon.classList.remove('hidden');
          } else {
            menuDrawer.classList.add('hidden');
            if (hamburgerIcon) hamburgerIcon.classList.remove('hidden');
            if (closeIcon) closeIcon.classList.add('hidden');
          }
        });
        var links = document.querySelectorAll('.mobile-nav-link');
        for (var i = 0; i < links.length; i++) {
          links[i].addEventListener('click', function() {
            menuDrawer.classList.add('hidden');
            if (hamburgerIcon) hamburgerIcon.classList.remove('hidden');
            if (closeIcon) closeIcon.classList.add('hidden');
          });
        }
      }
    })();
  </script>
</body>
</html>`;
}
