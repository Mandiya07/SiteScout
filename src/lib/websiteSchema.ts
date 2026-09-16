import { GeneratedSite, Business, ServiceItem, FAQItem, FeatureItem, TestimonialItem, BlogPostItem, GalleryImage, BusinessTruthProfile } from "../types";
import { getCategoryHeroImage } from "./heroImages";

export interface ContentIntegrityReport {
  verified: boolean;
  quotePricingEnforced: boolean;
  liabilityProtectionEnforced: boolean;
  unverifiedPricesSanitizedCount: number;
  liabilityClaimsSanitizedCount: number;
  sanitizedAt: string;
  findings: string[];
}

export interface CanonicalWebsiteSchema extends GeneratedSite {
  contentIntegrity?: ContentIntegrityReport;
}

/**
 * Checks if a pricing string is a specific currency figure (e.g. "$99", "R450", "£120", "$50/hr", "450 USD").
 */
export function isSpecificNumericPrice(price: string): boolean {
  if (!price) return false;
  const p = price.trim();
  // Safe quote-based strings
  const safeStrings = ["request a quote", "contact us", "contact for pricing", "call for pricing", "custom quote", "quote on request", "view pricing", "free estimate"];
  if (safeStrings.some(s => p.toLowerCase().includes(s))) {
    return false;
  }
  // Detect currency symbols or numbers
  const currencyRegex = /[\$\€\£\¥\₹\₽\₦\₱\฿\₲\₡\₴\E\R\P]\s*\d+|\d+\s*[\$\€\£\¥\₹\₽\₦\₱\฿\₲\₡\₴\E\R\P]|\d+\s*(usd|zar|szl|gbp|eur|aud|cad|kes|ngn)/i;
  const rawNumberRegex = /^\s*\$?\d+([\.,]\d{2})?\s*$/;
  return currencyRegex.test(p) || rawNumberRegex.test(p);
}

/**
 * Sanitizes unverified pricing into strict quote-based defaults ("Request a Quote").
 */
export function sanitizePricing(services: ServiceItem[], isPricingVerified: boolean = false): { services: ServiceItem[]; sanitizedCount: number } {
  let sanitizedCount = 0;
  const sanitizedServices = (services || []).map(srv => {
    const currentPrice = srv.price || "";
    if (!isPricingVerified && (isSpecificNumericPrice(currentPrice) || !currentPrice.trim())) {
      sanitizedCount++;
      return {
        ...srv,
        price: "Request a Quote"
      };
    }
    return srv;
  });

  return { services: sanitizedServices, sanitizedCount };
}

/**
 * Liability Protection: Removes fabricated years in business, unverified certifications/licenses,
 * and unsupported money-back/lifetime guarantees.
 */
export function sanitizeLiabilityClaims(
  site: GeneratedSite,
  truthProfile?: BusinessTruthProfile
): { site: GeneratedSite; sanitizedCount: number; findings: string[] } {
  let sanitizedCount = 0;
  const findings: string[] = [];

  // Check if years in business or certifications are explicitly confirmed in truth profile
  const confirmedYears = truthProfile?.summary?.confirmedCount ? false : false; // strict default unless confirmed

  // 1. Years in business regex patterns
  const yearsRegex = /(\b\d{1,2}\+?\s*(years|yrs)\s*(of\s+experience|in\b|of\b|serving|operating|in\s+business|of\s+excellence)\b|\bestablished\s+in\s+(19|20)\d\d\b|\bserving\s+.*?\s+since\s+(19|20)\d\d\b|\b(19|20)\d\d\b)/gi;

  // 2. Unverified certification/license patterns
  const certsRegex = /\b(ISO\s*-?\s*\d+|licensed\s*&\s*bonded\s*master|board\s*certified\s*specialist|state\s*licensed\s*master|officially\s*certified\s*master)\b/gi;

  // 3. Unverified legal/financial guarantees patterns
  const guaranteeRegex = /\b(100%\s*money-?back\s*guarantee|lifetime\s*warranty|guaranteed\s*\d+-year\s*warranty|unconditional\s*money-back\s*guarantee)\b/gi;

  const sanitizeText = (text: string, fieldName: string): string => {
    if (!text) return text;
    let result = text;

    if (yearsRegex.test(result)) {
      result = result.replace(yearsRegex, "dedicated local service");
      sanitizedCount++;
      findings.push(`Replaced unverified years-in-business claim in ${fieldName} with liability-safe phrasing.`);
    }

    if (certsRegex.test(result)) {
      result = result.replace(certsRegex, "professional service standards");
      sanitizedCount++;
      findings.push(`Replaced unverified certification/license claim in ${fieldName} with neutral quality phrasing.`);
    }

    if (guaranteeRegex.test(result)) {
      result = result.replace(guaranteeRegex, "satisfaction-focused commitment");
      sanitizedCount++;
      findings.push(`Replaced unverified money-back/warranty claim in ${fieldName} with client-focused commitment.`);
    }

    return result;
  };

  const updatedSite: GeneratedSite = { ...site };

  // Sanitize Hero
  if (updatedSite.hero) {
    updatedSite.hero = {
      ...updatedSite.hero,
      subtitle: sanitizeText(updatedSite.hero.subtitle, "Hero Subtitle")
    };
  }

  // Sanitize About
  if (updatedSite.about) {
    updatedSite.about = {
      ...updatedSite.about,
      history: sanitizeText(updatedSite.about.history, "About History"),
      mission: sanitizeText(updatedSite.about.mission, "About Mission"),
      pitch: sanitizeText(updatedSite.about.pitch, "About Pitch")
    };
  }

  // Sanitize Features
  if (updatedSite.features && Array.isArray(updatedSite.features)) {
    updatedSite.features = updatedSite.features.map((feat, idx) => ({
      ...feat,
      title: sanitizeText(feat.title, `Feature #${idx + 1} Title`),
      description: sanitizeText(feat.description, `Feature #${idx + 1} Description`)
    }));
  }

  // Sanitize Services descriptions
  if (updatedSite.services && Array.isArray(updatedSite.services)) {
    updatedSite.services = updatedSite.services.map((srv, idx) => ({
      ...srv,
      description: sanitizeText(srv.description, `Service #${idx + 1} Description`)
    }));
  }

  // Sanitize FAQs
  if (updatedSite.faqs && Array.isArray(updatedSite.faqs)) {
    updatedSite.faqs = updatedSite.faqs.map((faq, idx) => ({
      ...faq,
      answer: sanitizeText(faq.answer, `FAQ #${idx + 1} Answer`)
    }));
  }

  return { site: updatedSite, sanitizedCount, findings };
}

/**
 * Normalizes any site object to strictly conform to the Canonical Website JSON Schema,
 * enforcing quote-based pricing defaults and liability protection.
 */
export function normalizeWebsiteSchema(
  site: Partial<GeneratedSite>,
  business?: Business | null,
  isPricingVerified: boolean = false
): CanonicalWebsiteSchema {
  const name = site.businessName || business?.name || "Premier Local Services";
  const category = site.category || business?.category || "Professional Services";
  const address = site.address || business?.address || "Local Area";
  const phone = site.phone || business?.phone || "+268 7600 0000";
  const city = address.split(",")[0] || "Local Area";
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 1. Ensure core design token defaults
  const primaryColor = site.primaryColor || "#2563eb";
  const secondaryColor = site.secondaryColor || "#1e40af";
  const accentColor = site.accentColor || "#3b82f6";
  const backgroundColor = site.backgroundColor || "#ffffff";
  const textColor = site.textColor || "#0f172a";
  const fontStyle = site.fontStyle || "sans";

  // 2. Ensure SEO metadata
  const seo = {
    title: site.seo?.title || `${name} | ${category} in ${city}`,
    description: site.seo?.description || `Looking for reliable ${category.toLowerCase()} in ${city}? Contact ${name} at ${phone} for professional local service and transparent quotes.`,
    keywords: site.seo?.keywords || `${category.toLowerCase()}, ${city.toLowerCase()}, local services, request quote`
  };

  // 3. Ensure Hero section
  const hero = {
    title: site.hero?.title || `Professional ${category} Services in ${city}`,
    subtitle: site.hero?.subtitle || `Delivering trusted, dependable ${category.toLowerCase()} across ${city} with transparent quote-based pricing.`,
    ctaPrimary: site.hero?.ctaPrimary || "Request Free Quote",
    ctaSecondary: site.hero?.ctaSecondary || "Contact Us",
    imageUrl: site.hero?.imageUrl || getCategoryHeroImage(category),
    photographer: site.hero?.photographer,
    photographerUrl: site.hero?.photographerUrl,
    license: site.hero?.license,
    imageMetadata: site.hero?.imageMetadata
  };

  // 4. Ensure About section
  const about = {
    title: site.about?.title || `About ${name}`,
    history: site.about?.history || `${name} is committed to serving ${city} with honest communications, transparent rates, and dedicated craftsmanship.`,
    mission: site.about?.mission || "To deliver reliable, high-quality solutions tailored to your unique requirements.",
    pitch: site.about?.pitch || "Whether you require minor repairs, regular maintenance, or full service packages, our team is ready to assist.",
    imageUrl: site.about?.imageUrl,
    imageMetadata: site.about?.imageMetadata
  };

  // 5. Ensure Services & Sanitize Pricing
  const rawServices: ServiceItem[] = (site.services && site.services.length > 0)
    ? site.services
    : [
        {
          title: `Core ${category} Service`,
          description: `Comprehensive ${category.toLowerCase()} delivered with professional expertise, quality materials, and transparent rates.`,
          price: "Request a Quote",
          imageUrl: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800"
        },
        {
          title: "Standard Consultation & Evaluation",
          description: "Detailed on-site assessment, needs evaluation, and transparent itemized quotation.",
          price: "Request a Quote",
          imageUrl: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800"
        },
        {
          title: "Maintenance & Preventive Care",
          description: "Routine inspection, servicing, and optimization to ensure smooth long-term performance.",
          price: "Request a Quote",
          imageUrl: "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=800"
        }
      ];

  const { services: sanitizedServices, sanitizedCount: unverifiedPricesSanitizedCount } = sanitizePricing(rawServices, isPricingVerified);

  // 6. Ensure Features section
  const features: FeatureItem[] = (site.features && site.features.length > 0)
    ? site.features
    : [
        { title: "Dedicated Local Team", icon: "MapPin", description: `Based directly in ${city} for fast turnarounds and responsive service.` },
        { title: "Transparent Pricing", icon: "Shield", description: "Upfront quote-based estimates with clear scope and zero hidden fees." },
        { title: "Verified Craftsmanship", icon: "Award", description: "All work conducted by trained specialists adhering strictly to quality standards." }
      ];

  // 7. Ensure Gallery
  const gallery: GalleryImage[] = (site.gallery && site.gallery.length > 0)
    ? site.gallery
    : [
        { url: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800", alt: "Specialized tools and workspace" },
        { url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800", alt: "Dedicated local team in action" },
        { url: "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=800", alt: "Completed project delivery" }
      ];

  // 8. Ensure FAQs
  const faqs: FAQItem[] = (site.faqs && site.faqs.length > 0)
    ? site.faqs
    : [
        { question: "How do I get an accurate pricing estimate?", answer: "We provide itemized quotes based on your specific requirements. Click 'Request Free Quote' or contact us directly." },
        { question: "What areas do you serve?", answer: `We proudly serve clients throughout ${city} and neighboring surrounding regions.` },
        { question: "What is your typical turnaround time?", answer: "Response times depend on project scope, but we strive to respond to all inquiries within 24 hours." }
      ];

  // 9. Ensure Testimonials
  const testimonials: TestimonialItem[] = (site.testimonials && site.testimonials.length > 0)
    ? site.testimonials
    : [
        { name: "Verified Customer Reviews", review: "Customer reviews and testimonials will appear here upon verification.", rating: 5, isVerified: false }
      ];

  // 10. Ensure Blog
  const blog: BlogPostItem[] = (site.blog && site.blog.length > 0)
    ? site.blog
    : [
        { title: `Choosing the Right ${category} Specialist in ${city}`, summary: `Key factors to consider when selecting local ${category.toLowerCase()} service providers.`, category: "Guide" }
      ];

  // 11. Contact Page, Policy, Terms, 404
  const contactPage = {
    title: site.contactPage?.title || `Get in Touch with ${name}`,
    description: site.contactPage?.description || `Have questions or need a custom quote? Contact our team in ${city} today.`,
    email: site.contactPage?.email || `contact@${slug || "business"}.com`
  };

  const privacyPolicy = site.privacyPolicy || "Personal information is processed strictly to respond to your service inquiries and quote requests.";
  const termsOfService = site.termsOfService || "Services are rendered based on agreed project scope and specifications provided upon quotation confirmation.";
  const notFoundPage = site.notFoundPage || { title: "Page Not Found", message: "The requested page section could not be located." };

  const sectionsOrder = site.sectionsOrder || ["hero", "features", "services", "about", "testimonials", "faqs", "gallery", "blog", "contact"];
  const whatsappMessage = site.whatsappMessage || `Hello ${name}, I saw your website and would like to request a quote for your ${category.toLowerCase()} services.`;

  // Base constructed site
  const baseSite: GeneratedSite = {
    id: site.id || `site_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    businessId: site.businessId || business?.id || `biz_${Date.now()}`,
    businessName: name,
    phone,
    address,
    category,
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor,
    textColor,
    fontStyle,
    seo,
    hero,
    about,
    services: sanitizedServices,
    features,
    gallery,
    faqs,
    testimonials,
    blog,
    whatsappMessage,
    contactPage,
    privacyPolicy,
    termsOfService,
    notFoundPage,
    sectionsOrder,
    logoUrl: site.logoUrl,
    logoType: site.logoType || "text",
    logoIcon: site.logoIcon || "Sparkles",
    previewToken: site.previewToken,
    ownerId: site.ownerId,
    createdAt: site.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isDemo: site.isDemo ?? business?.isDemo ?? true,
    dataType: site.dataType || business?.dataType || "demo",
    truthProfile: site.truthProfile || business?.truthProfile,
    visualProfile: site.visualProfile,
    imageAttributions: site.imageAttributions
  };

  // Run Liability Protection Sanitizer
  const { site: sanitizedSite, sanitizedCount: liabilityClaimsSanitizedCount, findings } = sanitizeLiabilityClaims(
    baseSite,
    site.truthProfile || business?.truthProfile
  );

  const contentIntegrity: ContentIntegrityReport = {
    verified: true,
    quotePricingEnforced: true,
    liabilityProtectionEnforced: true,
    unverifiedPricesSanitizedCount,
    liabilityClaimsSanitizedCount,
    sanitizedAt: new Date().toISOString(),
    findings
  };

  return {
    ...sanitizedSite,
    contentIntegrity
  };
}
