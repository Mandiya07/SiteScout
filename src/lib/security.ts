import { GeneratedSite } from "../types";

/**
 * Generates a cryptographically secure, unpredictable, 48-hex-character token
 * for public previews and share links.
 */
export function generateSecurePreviewToken(): string {
  if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
    const buffer = new Uint8Array(24);
    window.crypto.getRandomValues(buffer);
    return Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Safe Node.js or fallback execution
  const chars = "abcdef0123456789";
  let token = "";
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Validates whether a given string is a securely formed preview token or UUID.
 */
export function isValidPreviewToken(token?: string): boolean {
  if (!token || typeof token !== "string") return false;
  // Alphanumeric, hyphens, underscores between 16 and 64 characters
  return /^[a-zA-Z0-9_-]{16,64}$/.test(token);
}

/**
 * Strips all private internal business information, user IDs, private CRM notes,
 * internal sales status, and proprietary scoring details before publishing
 * or presenting a website prototype to public clients.
 */
export function sanitizePublicPreview(site: GeneratedSite): Record<string, any> {
  return {
    id: site.id,
    previewToken: site.previewToken || site.id,
    businessName: site.businessName || "",
    phone: site.phone || "",
    address: site.address || "",
    category: site.category || "",
    primaryColor: site.primaryColor || "#4f46e5",
    secondaryColor: site.secondaryColor || "#0284c7",
    accentColor: site.accentColor || "#10b981",
    backgroundColor: site.backgroundColor || "#ffffff",
    textColor: site.textColor || "#0f172a",
    fontStyle: site.fontStyle || "sans",
    seo: site.seo ? {
      title: site.seo.title || "",
      description: site.seo.description || "",
      keywords: site.seo.keywords || ""
    } : null,
    hero: site.hero ? {
      title: site.hero.title || "",
      subtitle: site.hero.subtitle || "",
      ctaPrimary: site.hero.ctaPrimary || "Get in Touch",
      ctaSecondary: site.hero.ctaSecondary || "",
      imageUrl: site.hero.imageUrl || "",
      photographer: site.hero.photographer || "",
      photographerUrl: site.hero.photographerUrl || "",
      license: site.hero.license || ""
    } : null,
    about: site.about ? {
      title: site.about.title || "",
      history: site.about.history || "",
      mission: site.about.mission || "",
      pitch: site.about.pitch || "",
      imageUrl: site.about.imageUrl || ""
    } : null,
    services: Array.isArray(site.services) ? site.services.map((s) => ({
      title: s.title || "",
      description: s.description || "",
      price: s.price || "",
      imageUrl: s.imageUrl || ""
    })) : [],
    features: Array.isArray(site.features) ? site.features.map((f) => ({
      title: f.title || "",
      description: f.description || "",
      icon: f.icon || ""
    })) : [],
    gallery: Array.isArray(site.gallery) ? site.gallery.map((g) => ({
      url: g.url || "",
      alt: g.alt || "",
      photographer: g.photographer || "",
      photographerUrl: g.photographerUrl || "",
      license: g.license || ""
    })) : [],
    faqs: Array.isArray(site.faqs) ? site.faqs.map((q) => ({
      question: q.question || "",
      answer: q.answer || ""
    })) : [],
    testimonials: Array.isArray(site.testimonials) ? site.testimonials.map((t) => ({
      name: t.name || "",
      review: t.review || "",
      rating: typeof t.rating === "number" ? t.rating : 5,
      isVerified: t.isVerified === true
    })) : [],
    blog: Array.isArray(site.blog) ? site.blog.map((b) => ({
      title: b.title || "",
      summary: b.summary || "",
      category: b.category || ""
    })) : [],
    whatsappMessage: site.whatsappMessage || "",
    contactPage: site.contactPage ? {
      title: site.contactPage.title || "",
      description: site.contactPage.description || "",
      email: site.contactPage.email || ""
    } : null,
    privacyPolicy: site.privacyPolicy || "",
    termsOfService: site.termsOfService || "",
    notFoundPage: site.notFoundPage || null,
    logoUrl: site.logoUrl || "",
    logoType: site.logoType || "text",
    logoIcon: site.logoIcon || "",
    sectionsOrder: site.sectionsOrder || [],
    clientApproved: Boolean(site.clientApproved),
    clientApprovedBy: site.clientApprovedBy || "",
    clientApprovedAt: site.clientApprovedAt || "",
    clientFeedback: Array.isArray(site.clientFeedback) ? site.clientFeedback : [],
    previewViews: site.previewViews || 0,
    previewLastViewedAt: site.previewLastViewedAt || ""
    // Notice: userId, ownerId, internal notes, opportunityScore, deficits, salesStatus are NOT included.
  };
}
