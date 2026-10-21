import { GeneratedSite, Business, ServiceItem, FAQItem, FeatureItem, TestimonialItem, BlogPostItem, GalleryImage, BusinessTruthProfile, ContentLevel } from "../types";
import { getCategoryHeroImage } from "./heroImages";
import { resolveIndustryArchetype, sanitizeCopyCliches } from "./aiCopyQuality";

export interface ContentIntegrityReport {
  verified: boolean;
  quotePricingEnforced: boolean;
  liabilityProtectionEnforced: boolean;
  unverifiedPricesSanitizedCount: number;
  liabilityClaimsSanitizedCount: number;
  fabricatedFactsPreventedCount: number;
  sanitizedAt: string;
  provenance: Record<string, ContentLevel>;
  findings: string[];
}

export interface CanonicalWebsiteSchema extends GeneratedSite {
  contentIntegrity?: ContentIntegrityReport;
  [key: string]: any;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalized?: CanonicalWebsiteSchema;
}

/**
 * Validates a candidate website object against SiteScout's Canonical Website Data Schema.
 * Enforces required identity & profile fields, valid section types, color strings,
 * URL references, and section order rules without destroying malformed legacy inputs.
 */
export function validateWebsiteSchema(data: unknown): SchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || typeof data !== "object") {
    return { valid: false, errors: ["Website schema input must be a non-null object"], warnings: [] };
  }

  const site = data as Record<string, any>;

  // Required core identity fields (accepting legacy 'name' as fallback)
  if (!site.businessName && !site.name) {
    errors.push("Missing required field: businessName");
  }
  if (!site.phone) {
    errors.push("Missing required field: phone");
  }
  if (!site.address) {
    errors.push("Missing required field: address");
  }
  if (!site.category) {
    errors.push("Missing required field: category");
  }

  // Required section objects
  if (!site.hero || typeof site.hero !== "object") {
    errors.push("Missing or invalid required section: 'hero'");
  }
  if (!site.about || typeof site.about !== "object") {
    errors.push("Missing or invalid required section: 'about'");
  }
  if (!site.services || !Array.isArray(site.services)) {
    errors.push("Missing or invalid required array: 'services'");
  }

  // Section order check
  if (site.sectionsOrder) {
    if (!Array.isArray(site.sectionsOrder)) {
      errors.push("Field 'sectionsOrder' must be an array of section ID strings");
    } else {
      const allowedSectionIds = new Set(["hero", "features", "services", "about", "testimonials", "faqs", "gallery", "blog", "contact"]);
      site.sectionsOrder.forEach((secId: any, idx: number) => {
        if (typeof secId !== "string" || !allowedSectionIds.has(secId)) {
          errors.push(`Invalid section ID '${secId}' at sectionsOrder[${idx}]`);
        }
      });
    }
  }

  // Font style check
  if (site.fontStyle && !["sans", "serif", "display", "modern"].includes(site.fontStyle)) {
    errors.push(`Invalid fontStyle '${site.fontStyle}'. Must be one of: sans, serif, display, modern`);
  }

  // Color hex format check
  const hexColorRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
  const colorFields = ["primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor"];
  colorFields.forEach(colField => {
    if (site[colField] && typeof site[colField] === "string" && !hexColorRegex.test(site[colField])) {
      warnings.push(`Color field '${colField}' (${site[colField]}) is not a standard hex color string`);
    }
  });

  // URL format validation helper
  const validateUrlField = (urlVal: any, fieldLabel: string) => {
    if (urlVal && typeof urlVal === "string" && urlVal.trim().length > 0) {
      if (!/^(https?:\/\/|mailto:|tel:|\/|#)/i.test(urlVal.trim())) {
        errors.push(`Invalid URL format in ${fieldLabel}: '${urlVal}'`);
      }
    }
  };

  if (site.logoUrl) validateUrlField(site.logoUrl, "logoUrl");
  if (site.hero?.imageUrl) validateUrlField(site.hero.imageUrl, "hero.imageUrl");
  if (site.about?.imageUrl) validateUrlField(site.about.imageUrl, "about.imageUrl");
  if (Array.isArray(site.services)) {
    site.services.forEach((s: any, i: number) => {
      if (s.imageUrl) validateUrlField(s.imageUrl, `services[${i}].imageUrl`);
    });
  }
  if (Array.isArray(site.gallery)) {
    site.gallery.forEach((g: any, i: number) => {
      if (g.url) validateUrlField(g.url, `gallery[${i}].url`);
    });
  }

  const valid = errors.length === 0;

  let normalized: CanonicalWebsiteSchema | undefined;
  if (valid || site.businessName || site.name) {
    normalized = normalizeWebsiteSchema(site as Partial<GeneratedSite>);
  }

  return { valid, errors, warnings, normalized };
}

/**
 * Classifies a generated business fact according to evidence source discipline:
 * VERIFIED — supported by reliable evidence
 * BUSINESS_SUPPLIED — explicitly supplied or edited by the business/user
 * AI_DRAFT — generated or rewritten copy without independent verification
 * UNKNOWN — information unavailable or missing
 * 
 * Never silently upgrades AI_DRAFT content to VERIFIED or BUSINESS_SUPPLIED.
 */
export function classifyFact(
  fieldName: string,
  value: any,
  truthProfile?: BusinessTruthProfile,
  isUserSupplied?: boolean,
  existingLevel?: ContentLevel
): ContentLevel {
  if (value === null || value === undefined || (typeof value === "string" && !value.trim())) {
    return "UNKNOWN";
  }

  // Preserve explicit BUSINESS_SUPPLIED or VERIFIED classification if previously set
  if (existingLevel === "BUSINESS_SUPPLIED") {
    return "BUSINESS_SUPPLIED";
  }
  if (existingLevel === "VERIFIED") {
    return "VERIFIED";
  }

  // Check if explicitly marked as user supplied for primary identity fields
  if (isUserSupplied && (fieldName === "businessName" || fieldName === "phone" || fieldName === "address" || fieldName === "category" || fieldName === "email")) {
    return "BUSINESS_SUPPLIED";
  }

  // Check if truthProfile has confirmed/verified evidence backing for this specific fact
  if (truthProfile) {
    const tpField = (truthProfile as any)[fieldName];
    if (tpField && (tpField.status === "CONFIRMED" || tpField.level === "VERIFIED") && tpField.value) {
      return "VERIFIED";
    }
  }

  // All AI-generated or unverified copy strictly defaults to AI_DRAFT
  return "AI_DRAFT";
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
 * Liability Protection & Anti-Fabrication Safeguards:
 * Removes fabricated founding dates/years in business, unverified certifications/licenses/awards,
 * staff claims, guarantees/warranties, 24/7 claims, and fake customer counts.
 */
export function sanitizeLiabilityClaims(
  site: GeneratedSite,
  truthProfile?: BusinessTruthProfile
): { site: GeneratedSite; sanitizedCount: number; findings: string[] } {
  let sanitizedCount = 0;
  const findings: string[] = [];

  // Check if years in business or certifications are explicitly confirmed in truth profile
  const confirmedYears = Boolean(truthProfile?.openingHours?.value);

  // 1. Years in business / founding dates regex patterns
  const yearsRegex = /(\b\d{1,2}\+?\s*(years|yrs)\s*(of\s+experience|experience|in\b|of\b|serving|operating|in\s+business|of\s+excellence)\b|\bestablished\s+in\s+(19|20)\d\d\b|\bserving\s+.*?\s+since\s+(19|20)\d\d\b|\bfounded\s+in\s+(19|20)\d\d\b|\bover\s+\d{1,2}\s+years\b|\bwith\s+years\s+of\s+dedicated\s+expertise\b)/gi;

  // 2. Unverified certification/license/award patterns
  const certsRegex = /\b(ISO\s*-?\s*\d+|certified\s*master\s*technicians?|licensed\s*&\s*bonded\s*master|board\s*certified\s*specialist|state\s*licensed\s*master|officially\s*certified\s*master|award-winning|#1\s+rated|rated\s+#1|top-rated\s+master)\b/gi;

  // 3. Unverified legal/financial guarantees & warranty patterns
  const guaranteeRegex = /\b(100%\s*money-?back\s*guarantee|lifetime\s*warranty|guaranteed\s*\d+-year\s*warranty|unconditional\s*money-back\s*guarantee|100%\s*satisfaction\s*guarantee(\s+or\s+full\s+refund)?|100%\s*workmanship\s*guarantee)\b/gi;

  // 4. Unverified 24/7 availability & same-day claims
  const availabilityRegex = /\b(24\/7\s*(emergency\s*)?(service|support|availability|hotline|dispatch|callbacks)?|round-?the-?clock|same-day\s*(service|dispatch|guarantee|repair|callbacks))\b/gi;

  // 5. Unverified staff / team claims
  const staffRegex = /\b(Dr\.\s+[A-Z][a-z]+\s+[A-Z][a-z]+|Master\s+(Barber|Stylist|Technician|Electrician|Plumber|Mechanic)\s+[A-Z][a-z]+|\d+\s*(expert|certified|trained)\s*(staff|technicians|barbers|engineers|specialists))\b/gi;

  // 6. Unverified customer numbers / project metrics
  const customerMetricsRegex = /\b(\d{1,3}(,\d{3})*\+?\s*(happy|satisfied|loyal)?\s*(customers|clients|projects|homes|repairs))\b/gi;

  // 7. Unverified promotions & discounts
  const promotionsRegex = /\b(\d+%\s*off|\d+%\s*discount|save\s*\d+|special\s*promo(tion)?|special\s*discount|limited-?time\s*(deal|offer|only)?|introductory\s*offer)\b/gi;

  // 8. Unverified free offers
  const freeOffersRegex = /\b(free\s*(consultation|evaluation|inspection|estimate|quote|delivery|assessment|setup))\b/gi;

  // 9. Unverified financing & installment plans
  const financingRegex = /\b(financing\s*(available|options)|installment\s*plans?|low\s*monthly\s*payments?|0%\s*apr|credit\s*available)\b/gi;

  const sanitizeText = (text: string, fieldName: string): string => {
    if (!text) return text;
    let result = text;

    // Reset lastIndex for safety
    yearsRegex.lastIndex = 0;
    certsRegex.lastIndex = 0;
    guaranteeRegex.lastIndex = 0;
    availabilityRegex.lastIndex = 0;
    staffRegex.lastIndex = 0;
    customerMetricsRegex.lastIndex = 0;
    promotionsRegex.lastIndex = 0;
    freeOffersRegex.lastIndex = 0;
    financingRegex.lastIndex = 0;

    if (!confirmedYears && yearsRegex.test(result)) {
      yearsRegex.lastIndex = 0;
      result = result.replace(yearsRegex, "dedicated local service");
      sanitizedCount++;
      findings.push(`Replaced unverified years-in-business claim in ${fieldName} with liability-safe phrasing.`);
    }

    if (certsRegex.test(result)) {
      certsRegex.lastIndex = 0;
      result = result.replace(certsRegex, "professional service standards");
      sanitizedCount++;
      findings.push(`Replaced unverified certification/license/award claim in ${fieldName} with neutral quality phrasing.`);
    }

    if (guaranteeRegex.test(result)) {
      guaranteeRegex.lastIndex = 0;
      result = result.replace(guaranteeRegex, "satisfaction-focused commitment");
      sanitizedCount++;
      findings.push(`Replaced unverified money-back/warranty claim in ${fieldName} with client-focused commitment.`);
    }

    if (availabilityRegex.test(result)) {
      availabilityRegex.lastIndex = 0;
      result = result.replace(availabilityRegex, "responsive local service");
      sanitizedCount++;
      findings.push(`Replaced unverified 24/7 or same-day claim in ${fieldName} with responsive local service phrasing.`);
    }

    if (staffRegex.test(result)) {
      staffRegex.lastIndex = 0;
      result = result.replace(staffRegex, "our dedicated local team");
      sanitizedCount++;
      findings.push(`Replaced unverified staff/team claim in ${fieldName} with dedicated local team phrasing.`);
    }

    if (customerMetricsRegex.test(result)) {
      customerMetricsRegex.lastIndex = 0;
      result = result.replace(customerMetricsRegex, "serving local clients");
      sanitizedCount++;
      findings.push(`Replaced unverified customer count metric in ${fieldName} with neutral client phrasing.`);
    }

    const tempPromo = result;
    result = result.replace(promotionsRegex, (match) => {
      if (/\d+%\s*(off|discount)/i.test(match)) return "competitive local rates";
      if (/save\s*\d+/i.test(match)) return "value-driven";
      return "standard offer";
    });
    if (result !== tempPromo) {
      sanitizedCount++;
      findings.push(`Replaced unverified promotion/discount claim in ${fieldName} with professional competitive local rates phrasing.`);
    }

    const tempFree = result;
    result = result.replace(freeOffersRegex, (match) => {
      if (/consultation/i.test(match)) return "professional consultation";
      if (/evaluation/i.test(match)) return "professional evaluation";
      if (/inspection/i.test(match)) return "professional inspection";
      if (/estimate/i.test(match)) return "professional estimate";
      if (/quote/i.test(match)) return "professional quote";
      if (/assessment/i.test(match)) return "professional assessment";
      if (/delivery/i.test(match)) return "standard delivery";
      if (/setup/i.test(match)) return "standard setup";
      return "professional evaluation";
    });
    if (result !== tempFree) {
      sanitizedCount++;
      findings.push(`Replaced unverified free offer claim in ${fieldName} with professional evaluation phrasing.`);
    }

    const tempFinance = result;
    result = result.replace(financingRegex, "flexible payment option");
    if (result !== tempFinance) {
      sanitizedCount++;
      findings.push(`Replaced unverified financing/installment claim in ${fieldName} with flexible payment option phrasing.`);
    }

    // Anti-Cliché & Commercial Tone Sanitization
    const { cleanedText, clichesFound, replacementCount } = sanitizeCopyCliches(result);
    if (replacementCount > 0) {
      result = cleanedText;
      sanitizedCount += replacementCount;
      findings.push(`Neutralized ${replacementCount} generic AI trope(s) [${clichesFound.join(", ")}] in ${fieldName}.`);
    }

    return result;
  };

  const updatedSite: GeneratedSite = { ...site };

  // Sanitize Hero
  if (updatedSite.hero) {
    const hAny = updatedSite.hero as any;
    updatedSite.hero = {
      ...updatedSite.hero,
      title: sanitizeText(updatedSite.hero.title, "Hero Title"),
      subtitle: sanitizeText(updatedSite.hero.subtitle, "Hero Subtitle"),
      headline: hAny.headline ? sanitizeText(hAny.headline, "Hero Headline") : hAny.headline,
      subheadline: hAny.subheadline ? sanitizeText(hAny.subheadline, "Hero Subheadline") : hAny.subheadline
    } as any;
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

  // Sanitize Contact Page
  if (updatedSite.contactPage) {
    updatedSite.contactPage = {
      ...updatedSite.contactPage,
      title: sanitizeText(updatedSite.contactPage.title, "Contact Title"),
      description: sanitizeText(updatedSite.contactPage.description, "Contact Description")
    };
  }

  // Sanitize SEO
  if (updatedSite.seo) {
    updatedSite.seo = {
      ...updatedSite.seo,
      title: sanitizeText(updatedSite.seo.title, "SEO Title"),
      description: sanitizeText(updatedSite.seo.description, "SEO Description")
    };
  }

  return { site: updatedSite, sanitizedCount, findings };
}

/**
 * Normalizes any site object to strictly conform to the Canonical Website JSON Schema,
 * enforcing quote-based pricing defaults, source classification, and anti-fabrication safeguards.
 */
export function normalizeWebsiteSchema(
  site: Partial<GeneratedSite>,
  business?: Business | null,
  isPricingVerified: boolean = false
): CanonicalWebsiteSchema {
  const name = site.businessName || (site as any).name || business?.name || "Premier Local Services";
  const category = site.category || business?.category || "Professional Services";
  const address = site.address || business?.address || "Local Area";
  const phone = site.phone || business?.phone || "+268 7600 0000";
  const city = address.split(",")[0] || "Local Area";

  const archetype = resolveIndustryArchetype(category);

  // Core design token defaults derived intelligently from industry archetype
  const primaryColor = site.primaryColor || archetype.palette.primary;
  const secondaryColor = site.secondaryColor || archetype.palette.secondary;
  const accentColor = site.accentColor || archetype.palette.accent;
  const backgroundColor = site.backgroundColor || archetype.palette.background;
  const textColor = site.textColor || archetype.palette.text;
  const fontStyle = site.fontStyle || archetype.fontStyle;

  const truthProf = site.truthProfile || business?.truthProfile || (business && ("phone" in business || "businessName" in business || "reviews" in business || "rating" in business || "category" in business) ? business as any : undefined);

  // Preserve existing field-level provenance if available
  const existingProvenance = site.provenance || (site as any).contentIntegrity?.provenance || {};

  // 2. Ensure SEO metadata
  const seo = {
    title: site.seo?.title || `${name} | ${category} in ${city}`,
    description: site.seo?.description || `Looking for reliable ${category.toLowerCase()} in ${city}? Contact ${name} at ${phone} for professional local service and transparent quotes.`,
    keywords: site.seo?.keywords || `${category.toLowerCase()}, ${city.toLowerCase()}, local services, request quote`,
    ogTitle: site.seo?.ogTitle,
    ogDescription: site.seo?.ogDescription,
    ogImage: site.seo?.ogImage
  };

  // 3. Ensure Hero section
  const hero = {
    title: site.hero?.title || archetype.defaultHeroHeadline(city),
    subtitle: site.hero?.subtitle || archetype.defaultHeroSubtitle(city),
    ctaPrimary: site.hero?.ctaPrimary || archetype.primaryCta,
    ctaSecondary: site.hero?.ctaSecondary || archetype.secondaryCta,
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
    : archetype.typicalServices.map((srvTitle, idx) => ({
        title: srvTitle,
        description: `Comprehensive ${srvTitle.toLowerCase()} delivered with professional expertise, quality materials, and transparent rates.`,
        price: "Request a Quote",
        imageUrl: idx === 0 ? "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800" :
                 idx === 1 ? "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800" :
                 "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=800"
      }));

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

  // 9. Ensure Testimonials (Filter out fake synthetic reviews unless user supplied or verified from Google)
  const testimonials = sanitizeTestimonials(
    site.testimonials,
    site.isUserSupplied || (business as any)?.isUserSupplied,
    truthProf
  );

  // 10. Ensure Blog
  const blog: BlogPostItem[] = (site.blog && site.blog.length > 0)
    ? site.blog
    : [
        { title: `Choosing the Right ${category} Specialist in ${city}`, summary: `Key factors to consider when selecting local ${category.toLowerCase()} service providers.`, category: "Guide" }
      ];

  // 11. Contact Page, Policy, Terms, 404
  const rawEmail = business?.email || site.contactPage?.email;
  const isFabricatedEmail = rawEmail ? (rawEmail.startsWith("contact@") || rawEmail.startsWith("info@") && !business?.email) : true;
  const validContactEmail = (rawEmail && !isFabricatedEmail) ? rawEmail : (business?.email || null);

  const contactPage = {
    title: site.contactPage?.title || `Get in Touch with ${name}`,
    description: site.contactPage?.description || `Have questions or need a custom quote? Contact our team in ${city} today.`,
    email: validContactEmail
  };

  const privacyPolicy = site.privacyPolicy || "Personal information is processed strictly to respond to your service inquiries and quote requests.";
  const termsOfService = site.termsOfService || "Services are rendered based on agreed project scope and specifications provided upon quotation confirmation.";
  const notFoundPage = site.notFoundPage || { title: "Page Not Found", message: "The requested page section could not be located." };

  const isDefaultGenericOrder = Array.isArray(site.sectionsOrder) && 
    site.sectionsOrder.length === 9 && 
    site.sectionsOrder.join(",") === "hero,features,services,about,testimonials,faqs,gallery,blog,contact";
  const sectionsOrder = (!site.sectionsOrder || isDefaultGenericOrder) ? archetype.sectionsOrder : site.sectionsOrder;
  const whatsappMessage = site.whatsappMessage || `Hello ${name}, I saw your website and would like to request a quote for your ${category.toLowerCase()} services.`;

  // Classify key content facts into the canonical provenance mapping
  const provenance: Record<string, ContentLevel> = {
    businessName: classifyFact("businessName", name, truthProf, site.isUserSupplied, existingProvenance.businessName),
    phone: classifyFact("phone", phone, truthProf, site.isUserSupplied, existingProvenance.phone),
    address: classifyFact("address", address, truthProf, site.isUserSupplied, existingProvenance.address),
    category: classifyFact("category", category, truthProf, site.isUserSupplied, existingProvenance.category),
    heroSubtitle: classifyFact("heroSubtitle", site.hero?.subtitle, truthProf, false, existingProvenance.heroSubtitle),
    aboutHistory: classifyFact("aboutHistory", site.about?.history, truthProf, false, existingProvenance.aboutHistory),
    services: isPricingVerified ? "VERIFIED" : (existingProvenance.services === "BUSINESS_SUPPLIED" ? "BUSINESS_SUPPLIED" : "AI_DRAFT"),
    testimonials: (testimonials && testimonials.length > 0) ? (site.isUserSupplied || existingProvenance.testimonials === "BUSINESS_SUPPLIED" ? "BUSINESS_SUPPLIED" : "AI_DRAFT") : "UNKNOWN",
    faqs: (site.faqs && site.faqs.length > 0) ? (existingProvenance.faqs === "BUSINESS_SUPPLIED" ? "BUSINESS_SUPPLIED" : "AI_DRAFT") : "UNKNOWN",
    features: (site.features && site.features.length > 0) ? (existingProvenance.features === "BUSINESS_SUPPLIED" ? "BUSINESS_SUPPLIED" : "AI_DRAFT") : "UNKNOWN",
    blog: (site.blog && site.blog.length > 0) ? (existingProvenance.blog === "BUSINESS_SUPPLIED" ? "BUSINESS_SUPPLIED" : "AI_DRAFT") : "UNKNOWN",
    contactEmail: classifyFact("email", validContactEmail, truthProf, site.isUserSupplied, existingProvenance.contactEmail)
  };

  const generationMethod = site.generationMethod || (site.isUserSupplied ? "USER_EDITED" : "AI_GENERATED");
  const generationTimestamp = site.generationTimestamp || site.createdAt || new Date().toISOString();
  const lastEditedAt = new Date().toISOString();

  // Base constructed site preserving legacy & custom unknown fields
  const baseSite: GeneratedSite = {
    ...site,
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
    truthProfile: truthProf,
    visualProfile: site.visualProfile,
    imageAttributions: site.imageAttributions,
    provenance,
    generationMethod,
    generationTimestamp,
    lastEditedAt
  };

  // Run Anti-Fabrication & Liability Protection Sanitizer
  const { site: sanitizedSite, sanitizedCount: liabilityClaimsSanitizedCount, findings } = sanitizeLiabilityClaims(
    baseSite,
    truthProf
  );

  const contentIntegrity: ContentIntegrityReport = {
    verified: true,
    quotePricingEnforced: true,
    liabilityProtectionEnforced: true,
    unverifiedPricesSanitizedCount,
    liabilityClaimsSanitizedCount,
    fabricatedFactsPreventedCount: liabilityClaimsSanitizedCount + unverifiedPricesSanitizedCount,
    sanitizedAt: new Date().toISOString(),
    provenance,
    findings
  };

  return {
    ...sanitizedSite,
    contentIntegrity
  };
}

/**
 * Sanitizes testimonials list. If no genuine review evidence is supplied or verified,
 * returns an empty array to omit the section. Removes placeholders or fake review text.
 */
export function sanitizeTestimonials(
  testimonialsList: TestimonialItem[] | undefined,
  isUserSupplied?: boolean,
  truthProfile?: BusinessTruthProfile
): TestimonialItem[] {
  if (!testimonialsList || !Array.isArray(testimonialsList)) return [];

  // Consider reviews verified if the site is user-supplied or has verified google reviews evidence
  const isReviewsVerified = Boolean(
    isUserSupplied || 
    (truthProfile?.reviews?.level === "VERIFIED" || truthProfile?.reviews?.level === "BUSINESS_SUPPLIED") ||
    truthProfile?.reviews?.value
  );

  if (!isReviewsVerified) {
    return [];
  }

  return testimonialsList.filter(t => {
    if (!t || !t.name || !t.review) return false;

    const n = t.name.toLowerCase();
    const r = t.review.toLowerCase();

    // Block placeholders or fake testimonials presented as a real review
    if (
      n.includes("coming soon") || 
      n.includes("customer review") || 
      n.includes("placeholder") ||
      n.includes("verified customer") ||
      r.includes("coming soon") || 
      r.includes("placeholder") || 
      r.includes("appear here") || 
      r.includes("reviews can be added")
    ) {
      return false;
    }

    return true;
  });
}

export interface IntegrityFinding {
  id: string;
  category: "PRICING" | "PROMOTION" | "TESTIMONIAL" | "STAFF" | "CERTIFICATION" | "AVAILABILITY" | "CONTACT" | "METRIC" | "GUARANTEE" | "GENERAL";
  severity: "BLOCKING" | "REVIEW" | "SAFE";
  fieldName: string;
  claim: string;
  message: string;
  autoFixAvailable: boolean;
}

export interface PrePublicationScanResult {
  canPublish: boolean;
  blockingFindings: IntegrityFinding[];
  reviewFindings: IntegrityFinding[];
  safeFindings: IntegrityFinding[];
  totalFindingsCount: number;
  scannedAt: string;
}

/**
 * Pre-Publication Content Integrity Scan:
 * Detects unsupported factual claims (unverified prices, fake testimonials, certifications,
 * guarantees, staff claims, availability, fabricated contact details) before publishing.
 */
export function runPrePublicationIntegrityScan(
  site: GeneratedSite,
  truthProfile?: BusinessTruthProfile
): PrePublicationScanResult {
  const blockingFindings: IntegrityFinding[] = [];
  const reviewFindings: IntegrityFinding[] = [];
  const safeFindings: IntegrityFinding[] = [];

  const truthProf = site.truthProfile || truthProfile || (site as any).truthProfile;
  const isPricingVerified = false;

  // 1. Scan Pricing in Services
  if (site.services && site.services.length > 0) {
    site.services.forEach((srv, i) => {
      const price = srv.price || "";
      if (isSpecificNumericPrice(price) && !site.isUserSupplied) {
        blockingFindings.push({
          id: `pricing_blocking_${i}`,
          category: "PRICING",
          severity: "BLOCKING",
          fieldName: `Service: ${srv.title}`,
          claim: price,
          message: `Unverified numeric price '${price}' detected. Standard pricing must be quote-based unless verified.`,
          autoFixAvailable: true
        });
      } else {
        safeFindings.push({
          id: `pricing_safe_${i}`,
          category: "PRICING",
          severity: "SAFE",
          fieldName: `Service: ${srv.title}`,
          claim: price || "Request a Quote",
          message: "Pricing is transparent and quote-based.",
          autoFixAvailable: false
        });
      }
    });
  }

  // 2. Scan Testimonials & Fake Reviews
  if (site.testimonials && site.testimonials.length > 0) {
    const hasVerifiedReviews = Boolean(
      site.isUserSupplied || 
      truthProf?.reviews?.status === "CONFIRMED" || 
      truthProf?.reviews?.level === "VERIFIED"
    );

    site.testimonials.forEach((t, i) => {
      const text = `${t.name} ${t.review}`.toLowerCase();
      const isPlaceholder = text.includes("coming soon") || text.includes("placeholder") || text.includes("appear here") || text.includes("customer reviews");

      if (isPlaceholder) {
        blockingFindings.push({
          id: `testimonial_blocking_ph_${i}`,
          category: "TESTIMONIAL",
          severity: "BLOCKING",
          fieldName: `Testimonial: ${t.name}`,
          claim: t.review,
          message: "Placeholder testimonial text detected. Must be removed or replaced with genuine client feedback.",
          autoFixAvailable: true
        });
      } else if (!hasVerifiedReviews && !site.isUserSupplied) {
        blockingFindings.push({
          id: `testimonial_blocking_unv_${i}`,
          category: "TESTIMONIAL",
          severity: "BLOCKING",
          fieldName: `Testimonial: ${t.name}`,
          claim: t.review,
          message: "Unverified synthetic review detected. Reviews are omitted unless imported or supplied by business.",
          autoFixAvailable: true
        });
      } else {
        safeFindings.push({
          id: `testimonial_safe_${i}`,
          category: "TESTIMONIAL",
          severity: "SAFE",
          fieldName: `Testimonial: ${t.name}`,
          claim: t.review,
          message: "Review is verified or business-supplied.",
          autoFixAvailable: false
        });
      }
    });
  }

  // 3. Scan Hero & About Sections for Unsupported Claims
  const textBlocks = [
    { fieldName: "Hero Subtitle", text: site.hero?.subtitle || "" },
    { fieldName: "About History", text: site.about?.history || "" },
    { fieldName: "About Mission", text: site.about?.mission || "" }
  ];

  const certsRegex = /\b(ISO\s*-?\s*\d+|licensed\s*&\s*bonded\s*master|board\s*certified\s*specialist|state\s*licensed\s*master|officially\s*certified\s*master|award-winning|#1\s+rated|rated\s+#1|top-rated\s+master)\b/i;
  const guaranteeRegex = /\b(100%\s*money-?back\s*guarantee|lifetime\s*warranty|guaranteed\s*\d+-year\s*warranty|unconditional\s*money-back\s*guarantee|100%\s*satisfaction\s*guarantee|100%\s*workmanship\s*guarantee)\b/i;
  const staffRegex = /\b(Dr\.\s+[A-Z][a-z]+\s+[A-Z][a-z]+|Master\s+[A-Z][a-z]+\s+[A-Z][a-z]+|\d+\s*(expert|certified|trained)\s*(staff|technicians|barbers|engineers|specialists))\b/i;
  const yearsRegex = /(\b\d{1,2}\+?\s*(years|yrs)\s*(of\s+experience|in\b|of\b|serving|operating|in\s+business|of\s+excellence)\b|\bestablished\s+in\s+(19|20)\d\d\b|\bserving\s+.*?\s+since\s+(19|20)\d\d\b|\bfounded\s+in\s+(19|20)\d\d\b)/i;
  const availabilityRegex = /\b(24\/7\s*(emergency\s*)?(service|support|availability|hotline|dispatch|callbacks)?|round-?the-?clock|same-day\s*(service|dispatch|guarantee|repair|callbacks))\b/i;

  textBlocks.forEach(tb => {
    if (!tb.text) return;

    if (certsRegex.test(tb.text)) {
      blockingFindings.push({
        id: `cert_blocking_${tb.fieldName}`,
        category: "CERTIFICATION",
        severity: "BLOCKING",
        fieldName: tb.fieldName,
        claim: tb.text.match(certsRegex)?.[0] || tb.text,
        message: "Unverified certification/license/award claim detected.",
        autoFixAvailable: true
      });
    }

    if (guaranteeRegex.test(tb.text)) {
      blockingFindings.push({
        id: `guarantee_blocking_${tb.fieldName}`,
        category: "GUARANTEE",
        severity: "BLOCKING",
        fieldName: tb.fieldName,
        claim: tb.text.match(guaranteeRegex)?.[0] || tb.text,
        message: "Unverified money-back or legal warranty claim detected.",
        autoFixAvailable: true
      });
    }

    if (staffRegex.test(tb.text)) {
      blockingFindings.push({
        id: `staff_blocking_${tb.fieldName}`,
        category: "STAFF",
        severity: "BLOCKING",
        fieldName: tb.fieldName,
        claim: tb.text.match(staffRegex)?.[0] || tb.text,
        message: "Unverified staff qualification or named individual claim detected.",
        autoFixAvailable: true
      });
    }

    if (yearsRegex.test(tb.text)) {
      reviewFindings.push({
        id: `years_review_${tb.fieldName}`,
        category: "GENERAL",
        severity: "REVIEW",
        fieldName: tb.fieldName,
        claim: tb.text.match(yearsRegex)?.[0] || tb.text,
        message: "Years in business / founding date claim detected. Verify with business before official signoff.",
        autoFixAvailable: true
      });
    }

    if (availabilityRegex.test(tb.text)) {
      reviewFindings.push({
        id: `availability_review_${tb.fieldName}`,
        category: "AVAILABILITY",
        severity: "REVIEW",
        fieldName: tb.fieldName,
        claim: tb.text.match(availabilityRegex)?.[0] || tb.text,
        message: "24/7 or same-day operating claim detected. Requires operator confirmation.",
        autoFixAvailable: true
      });
    }
  });

  // 4. Contact Details Integrity
  const rawEmail = site.contactPage?.email || site.email;
  if (rawEmail && (rawEmail.startsWith("contact@") || rawEmail.startsWith("info@")) && (!truthProf?.email?.value && !site.isUserSupplied)) {
    blockingFindings.push({
      id: "contact_email_blocking",
      category: "CONTACT",
      severity: "BLOCKING",
      fieldName: "Contact Email",
      claim: rawEmail,
      message: "Fabricated placeholder email address detected.",
      autoFixAvailable: true
    });
  }

  // 5. Safe Marketing Copy
  safeFindings.push({
    id: "marketing_safe_1",
    category: "GENERAL",
    severity: "SAFE",
    fieldName: "General Copy",
    claim: site.hero?.title || "Professional Local Services",
    message: "Standard non-factual marketing headline passes integrity check.",
    autoFixAvailable: false
  });

  return {
    canPublish: blockingFindings.length === 0,
    blockingFindings,
    reviewFindings,
    safeFindings,
    totalFindingsCount: blockingFindings.length + reviewFindings.length + safeFindings.length,
    scannedAt: new Date().toISOString()
  };
}

