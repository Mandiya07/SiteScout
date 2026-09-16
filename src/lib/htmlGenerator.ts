import { resolveHeroImageUrl } from "./heroImages";
import { normalizePhoneNumber, generateWhatsappLink } from "./formatters";

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
 * Generates production-grade, responsive static HTML matching WebsiteView.tsx with 1:1 visual parity.
 */
export function generateStaticHtml(site: any): string {
  const businessName = escapeHtml(site.businessName || "Local Business");
  const phone = escapeHtml(site.phone || "");
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
  const contactEmail = escapeHtml(site.contactPage?.email || site.email || "");

  const seoTitle = escapeHtml(site.seo?.title || site.businessName);
  const seoDesc = escapeHtml(site.seo?.description || `${site.businessName} - Quality ${category} in ${address}`);
  const seoKeywords = escapeHtml(site.seo?.keywords || `${category}, ${site.businessName}, services`);

  const sectionsOrder: string[] = site.sectionsOrder && Array.isArray(site.sectionsOrder) && site.sectionsOrder.length > 0
    ? site.sectionsOrder
    : ["hero", "features", "services", "about", "testimonials", "faqs", "gallery", "blog", "contact"];

  const fontClass = getFontFamilyClass(fontStyle);

  // Logo Rendering
  let logoHtml = `<span class="text-sm font-bold ${fontClass}" style="color: ${primaryColor}">${businessName}</span>`;
  if (site.logoType === "image" && site.logoUrl) {
    logoHtml = `<img src="${sanitizeUrl(site.logoUrl)}" alt="${businessName}" class="h-8 w-auto object-contain max-w-[150px]" referrerpolicy="no-referrer" />`;
  } else if (site.logoType === "icon") {
    logoHtml = `
      <div class="text-sm font-bold flex items-center gap-2 ${fontClass}" style="color: ${primaryColor}">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="color: ${primaryColor}">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span>${businessName}</span>
      </div>
    `;
  }

  // Hero Section
  const renderHero = () => `
    <section id="hero" class="relative px-5 py-20 sm:py-28 md:py-32 text-center overflow-hidden flex items-center justify-center min-h-[380px] sm:min-h-[460px]">
      <div class="absolute inset-0 z-0 select-none">
        <img src="${heroImageSrc}" alt="${escapeHtml(site.hero?.title || businessName)}" class="w-full h-full object-cover object-center" referrerpolicy="no-referrer" />
        <div class="absolute inset-0" style="background: linear-gradient(180deg, rgba(15, 23, 42, 0.72) 0%, rgba(15, 23, 42, 0.84) 50%, rgba(15, 23, 42, 0.94) 100%);"></div>
        <div class="absolute inset-0 opacity-20 mix-blend-color" style="background-color: ${primaryColor}"></div>
      </div>

      <div class="relative z-10 max-w-2xl mx-auto space-y-4 sm:space-y-5 px-2">
        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-[11px] font-semibold tracking-wide shadow-sm">
          <span class="w-2 h-2 rounded-full animate-pulse" style="background-color: ${accentColor}"></span>
          <span>${category}</span>
        </div>

        <h1 class="text-2xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight sm:leading-tight tracking-tight drop-shadow-md ${fontClass}">
          ${escapeHtml(site.hero?.title || `Welcome to ${site.businessName}`)}
        </h1>

        <p class="text-xs sm:text-base text-slate-200/90 leading-relaxed font-sans max-w-xl mx-auto drop-shadow-xs">
          ${escapeHtml(site.hero?.subtitle || `Premier ${category} delivering excellence, reliability, and satisfaction.`)}
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
          <a href="#contact" class="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer text-center" style="background-color: ${accentColor}">
            ${escapeHtml(site.hero?.ctaPrimary || "Get a Free Quote")}
          </a>
          <a href="#services" class="w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-bold text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 shadow-sm active:scale-95 transition-all cursor-pointer text-center">
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
    <section id="features" class="p-6 max-w-2xl mx-auto">
      <h3 class="text-center text-sm font-bold text-slate-400 uppercase tracking-wider mb-5 ${fontClass}">
        Why Choose Us
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        ${site.features.map((feat: any) => `
          <div class="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-center space-y-2">
            <span class="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <svg class="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
            </span>
            <h4 class="text-xs font-bold text-slate-900 font-sans">${escapeHtml(feat.title)}</h4>
            <p class="text-[10px] text-slate-500 leading-relaxed font-sans">${escapeHtml(feat.description)}</p>
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
    <section id="services" class="p-6 bg-slate-50/50 max-w-2xl mx-auto border-t border-b border-slate-100/50">
      <h3 class="text-center text-base font-bold text-slate-800 mb-5 ${fontClass}" style="color: ${primaryColor}">
        Our Specialized Packages
      </h3>
      <div class="space-y-4">
        ${site.services.map((srv: any) => `
          <div class="bg-white rounded-xl border border-slate-100 p-4 shadow-sm flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              ${srv.imageUrl ? `
                <div class="h-12 w-12 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                  <img src="${sanitizeUrl(srv.imageUrl)}" alt="${escapeHtml(srv.title)}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
                </div>
              ` : ""}
              <div class="text-left space-y-1">
                <h4 class="text-xs font-bold text-slate-900 font-sans">${escapeHtml(srv.title)}</h4>
                <p class="text-[10px] text-slate-500 leading-relaxed font-sans line-clamp-2">${escapeHtml(srv.description)}</p>
              </div>
            </div>
            <span class="shrink-0 rounded-lg bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
              ${escapeHtml(srv.price || "Contact for Quote")}
            </span>
          </div>
        `).join("")}
      </div>
    </section>
    `;
  };

  // About Section
  const renderAbout = () => {
    if (!site.about) return "";
    return `
    <section id="about" class="p-6 max-w-2xl mx-auto text-center space-y-4">
      <h3 class="text-base font-bold text-slate-800 ${fontClass}" style="color: ${primaryColor}">
        ${escapeHtml(site.about.title || `About ${site.businessName}`)}
      </h3>
      ${site.about.imageUrl ? `
        <div class="my-3 max-w-md mx-auto rounded-xl overflow-hidden shadow-xs aspect-4/3 border border-slate-200 bg-white">
          <img src="${sanitizeUrl(site.about.imageUrl)}" alt="${escapeHtml(site.about.title)}" class="w-full h-full object-cover" referrerpolicy="no-referrer" />
        </div>
      ` : ""}
      <p class="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto font-sans">
        ${escapeHtml(site.about.history || "")}
      </p>
      ${site.about.mission ? `
        <blockquote class="border-l-4 border-slate-200 pl-4 py-1 italic text-xs text-slate-500 text-left max-w-md mx-auto font-sans" style="border-left-color: ${accentColor}">
          "${escapeHtml(site.about.mission)}"
        </blockquote>
      ` : ""}
    </section>
    `;
  };

  // Gallery Section
  const renderGallery = () => {
    if (!site.gallery || !site.gallery.length) return "";
    return `
    <section id="gallery" class="p-6 max-w-2xl mx-auto">
      <h3 class="text-center text-base font-bold text-slate-800 mb-5 ${fontClass}" style="color: ${primaryColor}">
        Gallery
      </h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        ${site.gallery.map((img: any) => `
          <div class="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 shadow-xs">
            <img src="${sanitizeUrl(img.url)}" alt="${escapeHtml(img.alt || businessName)}" class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" referrerpolicy="no-referrer" />
            ${img.alt ? `
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-transparent p-2.5 pt-6 text-white text-[11px] font-semibold leading-tight drop-shadow-xs">
                ${escapeHtml(img.alt)}
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
    <section id="testimonials" class="p-6 max-w-2xl mx-auto">
      <h3 class="text-center text-sm font-bold text-slate-800 mb-5 ${fontClass}" style="color: ${primaryColor}">
        What Our Clients Say
      </h3>
      <div class="grid gap-4 sm:grid-cols-2">
        ${site.testimonials.map((test: any) => `
          <div class="bg-white rounded-xl border border-slate-100 p-4 shadow-sm text-left">
            <div class="flex items-center gap-1 mb-2">
              ${Array.from({ length: 5 }).map((_, j) => `
                <svg class="w-3.5 h-3.5 ${j < (test.rating || 5) ? 'text-amber-400' : 'text-slate-200'}" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
              `).join("")}
            </div>
            <p class="text-[10px] text-slate-600 italic mb-2 leading-relaxed font-sans">"${escapeHtml(test.review)}"</p>
            <p class="text-xs font-bold text-slate-800 font-sans">- ${escapeHtml(test.name)}</p>
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
    <section id="faqs" class="p-6 bg-slate-50 max-w-2xl mx-auto rounded-t-2xl">
      <h3 class="text-center text-sm font-bold text-slate-800 mb-5 ${fontClass}" style="color: ${primaryColor}">
        Frequently Asked Questions
      </h3>
      <div class="space-y-3">
        ${site.faqs.map((faq: any) => `
          <details class="group bg-white rounded-xl p-3.5 shadow-xs text-left">
            <summary class="text-xs font-bold text-slate-800 flex items-center justify-between font-sans cursor-pointer list-none">
              <span>${escapeHtml(faq.question)}</span>
              <svg class="h-3.5 w-3.5 text-slate-400 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
            </summary>
            <p class="text-[10px] text-slate-500 leading-relaxed mt-1.5 pt-1.5 border-t border-slate-50 font-sans">
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
    <section id="blog" class="p-6 max-w-2xl mx-auto">
      <h3 class="text-center text-base font-bold text-slate-800 mb-5 ${fontClass}" style="color: ${primaryColor}">
        Latest News &amp; Articles
      </h3>
      <div class="space-y-4">
        ${site.blog.map((post: any) => `
          <div class="bg-white rounded-xl border border-slate-100 p-5 shadow-sm text-left">
            <span class="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2 block">${escapeHtml(post.category || "Article")}</span>
            <h4 class="text-sm font-bold text-slate-900 mb-2 font-sans">${escapeHtml(post.title)}</h4>
            <p class="text-xs text-slate-500 leading-relaxed font-sans">${escapeHtml(post.summary)}</p>
            <button class="mt-3 text-[10px] font-bold text-slate-800 hover:underline">Read More &rarr;</button>
          </div>
        `).join("")}
      </div>
    </section>
    `;
  };

  // Contact Section
  const renderContact = () => `
    <section id="contact" class="p-6 max-w-2xl mx-auto">
      <h3 class="text-center text-base font-bold text-slate-800 mb-2 ${fontClass}" style="color: ${primaryColor}">
        ${escapeHtml(site.contactPage?.title || "Contact Us")}
      </h3>
      <p class="text-xs text-slate-600 text-center mb-6 font-sans">${escapeHtml(site.contactPage?.description || "Reach out directly via email or phone to discuss your needs.")}</p>
      
      <div class="bg-white rounded-xl border border-slate-100 p-6 shadow-sm text-center">
        <div class="flex flex-col items-center justify-center space-y-4">
          <p class="text-sm text-slate-600">Reach out directly via email or phone to discuss your needs.</p>
          
          <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            ${contactEmail ? `
              <a href="mailto:${contactEmail}" class="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md cursor-pointer transition-transform hover:scale-105" style="background-color: ${accentColor}">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                Email Us
              </a>
            ` : ""}
            ${phone ? `
              <a href="tel:${phone}" class="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold shadow-sm border border-slate-200 bg-white text-slate-800 cursor-pointer transition-transform hover:scale-105">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                Call ${phone}
              </a>
            ` : ""}
          </div>
        </div>
      </div>

      <div class="mt-6 flex flex-col items-center gap-2 text-xs text-slate-600">
        ${phone ? `<div class="flex items-center gap-2 font-sans"><svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg> ${phone}</div>` : ""}
        ${address ? `<div class="flex items-center gap-2 font-sans"><svg class="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg> ${address}</div>` : ""}
        ${contactEmail ? `<div class="flex items-center gap-2 font-sans"><svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> ${contactEmail}</div>` : ""}
      </div>
      
      <div class="mt-8 rounded-xl overflow-hidden border border-slate-200 h-48 bg-slate-100 flex items-center justify-center relative">
        <div class="absolute inset-0 opacity-50 bg-[url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=800&q=80')] bg-cover bg-center"></div>
        <div class="relative z-10 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-sm border border-slate-200 flex items-center gap-2">
          <svg class="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span class="text-xs font-bold text-slate-800 font-sans">${businessName}</span>
        </div>
      </div>
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
  </style>
</head>
<body class="antialiased min-h-screen flex flex-col font-sans" style="background-color: ${backgroundColor}; color: ${textColor};">
  <!-- Sticky Header Nav -->
  <header class="sticky top-0 z-30 border-b border-slate-100 bg-white/95 backdrop-blur-sm p-4 flex items-center justify-between shrink-0" style="border-bottom-color: ${primaryColor}10;">
    <a href="#hero" class="cursor-pointer">
      ${logoHtml}
    </a>
    <nav class="flex items-center space-x-4 text-[10px] font-bold text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-none max-w-[60%] sm:max-w-full">
      <a href="#hero" class="hover:text-slate-900 cursor-pointer">Home</a>
      ${sectionsOrder.includes("about") ? `<a href="#about" class="hover:text-slate-900 cursor-pointer">About</a>` : ""}
      ${sectionsOrder.includes("services") ? `<a href="#services" class="hover:text-slate-900 cursor-pointer">Services</a>` : ""}
      ${sectionsOrder.includes("gallery") ? `<a href="#gallery" class="hover:text-slate-900 cursor-pointer">Gallery</a>` : ""}
      ${sectionsOrder.includes("blog") ? `<a href="#blog" class="hover:text-slate-900 cursor-pointer">Blog</a>` : ""}
      ${sectionsOrder.includes("contact") ? `<a href="#contact" class="hover:text-slate-900 cursor-pointer">Contact</a>` : ""}
    </nav>
    <div class="flex items-center space-x-2.5 shrink-0">
      ${phone ? `
        <a href="tel:${phone}" class="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-xs transition-transform hover:scale-105" style="background-color: ${accentColor}">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
        </a>
      ` : ""}
      ${cleanPhone ? `
        <a href="${waLink}" target="_blank" rel="noopener noreferrer" class="flex h-7 w-7 items-center justify-center rounded-lg text-white bg-emerald-500 shadow-xs transition-transform hover:scale-105">
          <svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
        </a>
      ` : ""}
    </div>
  </header>

  <!-- Main Body Content -->
  <main class="flex-1 overflow-y-auto">
    ${renderedSectionsHtml}

    ${site.privacyPolicy ? `
      <section id="privacy" class="p-6 max-w-2xl mx-auto text-left hidden border-t border-slate-100">
        <h3 class="text-base font-bold text-slate-800 mb-4 ${fontClass}" style="color: ${primaryColor}">Privacy Policy</h3>
        <p class="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">${escapeHtml(site.privacyPolicy)}</p>
      </section>
    ` : ""}

    ${site.termsOfService ? `
      <section id="terms" class="p-6 max-w-2xl mx-auto text-left hidden border-t border-slate-100">
        <h3 class="text-base font-bold text-slate-800 mb-4 ${fontClass}" style="color: ${primaryColor}">Terms of Service</h3>
        <p class="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">${escapeHtml(site.termsOfService)}</p>
      </section>
    ` : ""}
  </main>

  <!-- Footer Block -->
  <footer class="p-8 text-center text-[10px] text-slate-400 border-t border-slate-100 bg-white" style="background-color: ${primaryColor}05;">
    <p class="font-semibold text-slate-700">${businessName}</p>
    ${address ? `<p class="mt-1 flex items-center justify-center gap-1"><svg class="h-3 w-3 text-red-500 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg> ${address}</p>` : ""}
    <div class="mt-4 flex items-center justify-center gap-3">
      ${site.privacyPolicy ? `<a href="#privacy" onclick="document.getElementById('privacy').classList.remove('hidden')" class="hover:underline cursor-pointer">Privacy Policy</a>` : ""}
      ${site.termsOfService ? `<a href="#terms" onclick="document.getElementById('terms').classList.remove('hidden')" class="hover:underline cursor-pointer">Terms of Service</a>` : ""}
    </div>
    <p class="mt-2 text-[9px] text-slate-400">&copy; ${new Date().getFullYear()}. Website built by SiteScout AI.</p>
  </footer>
</body>
</html>`;
}
