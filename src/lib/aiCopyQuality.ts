/**
 * AI Website Copy Quality & Anti-Cliché Validation Engine
 * 
 * Enforces high-fidelity commercial tone for SiteScout AI websites:
 * - Detects and neutralizes generic "AI slop" clichés and inflated jargon
 * - Provides industry-specific copywriting archetypes
 * - Computes copy quality scores and ensures human-sounding, verified commercial copy
 */

import { GeneratedSite } from "../types";

export interface ClicheRule {
  pattern: RegExp;
  label: string;
  replacement: string | ((match: string, p1?: string) => string);
  severity: "critical" | "warning";
  explanation: string;
}

export const BANNED_AI_CLICHES: ClicheRule[] = [
  {
    pattern: /\bwelcome to\s+([A-Za-z0-9\s&'-]+?)(?:!|\.|\band\b|,|\bwhere\b|$)/gi,
    label: "Welcome to [Business]",
    replacement: (_match, name) => `Trusted ${name ? name.trim() : "Local"} Services`,
    severity: "critical",
    explanation: "Generic greeting adds no commercial value. Modern websites lead with customer outcome."
  },
  {
    pattern: /\bin today's (fast-paced|rapidly changing|modern|digital) (world|landscape|environment)\b/gi,
    label: "In today's fast-paced world",
    replacement: "for your everyday demands",
    severity: "critical",
    explanation: "Overused AI transition phrase. Replace with direct benefit."
  },
  {
    pattern: /\b(your )?(premier|ultimate) destination\b/gi,
    label: "Premier destination",
    replacement: "trusted local specialist",
    severity: "critical",
    explanation: "Empty marketing superlative that erodes credibility."
  },
  {
    pattern: /\b(your )?one-stop (shop|solution)\b/gi,
    label: "One-stop shop",
    replacement: "comprehensive service provider",
    severity: "warning",
    explanation: "Dated retail idiom. Use specific service terminology."
  },
  {
    pattern: /\ba? ?tapestry of\b/gi,
    label: "Tapestry of",
    replacement: "a full range of",
    severity: "critical",
    explanation: "Classic hallmark of unedited LLM generation."
  },
  {
    pattern: /\ba? ?testament to\b/gi,
    label: "Testament to",
    replacement: "clear proof of",
    severity: "critical",
    explanation: "Pretentious AI trope. Use simple, grounded commercial vocabulary."
  },
  {
    pattern: /\belevate your ([a-z0-9\s]+?)(?:to new heights|\.|\bwith\b|,|$)/gi,
    label: "Elevate your [X]",
    replacement: (_match, noun) => `improve your ${noun ? noun.trim() : "results"}`,
    severity: "critical",
    explanation: "Vague corporate cliché lacking concrete meaning."
  },
  {
    pattern: /\bcutting-edge (solutions?|technology|methods?)\b/gi,
    label: "Cutting-edge solutions",
    replacement: "proven, modern techniques",
    severity: "critical",
    explanation: "Buzzword without substance. Clients want proven, reliable solutions."
  },
  {
    pattern: /\bdelivering excellence\b/gi,
    label: "Delivering excellence",
    replacement: "delivering dependable quality",
    severity: "warning",
    explanation: "Vague abstraction; grounded craftsmanship language builds stronger trust."
  },
  {
    pattern: /\blook no further\b/gi,
    label: "Look no further",
    replacement: "we are ready to assist",
    severity: "warning",
    explanation: "Tired infomercial idiom."
  },
  {
    pattern: /\bpassionate about (delivering|providing|crafting)\b/gi,
    label: "Passionate about providing",
    replacement: "committed to providing",
    severity: "warning",
    explanation: "Overused filler phrase. 'Committed' conveys professional accountability."
  },
  {
    pattern: /\bsecond to none\b/gi,
    label: "Second to none",
    replacement: "thorough and dependable",
    severity: "warning",
    explanation: "Unsubstantiated superlative claim."
  },
  {
    pattern: /\bseamless(ly)? blend(s)?\b/gi,
    label: "Seamless blend",
    replacement: "combining",
    severity: "warning",
    explanation: "Typical flowery AI phrasing."
  },
  {
    pattern: /\bunparalleled (expertise|service|quality|craftsmanship)\b/gi,
    label: "Unparalleled expertise",
    replacement: "reliable, high-standard $1",
    severity: "critical",
    explanation: "Unsubstantiated hyperbole."
  },
  {
    pattern: /\bdelve into\b/gi,
    label: "Delve into",
    replacement: "explore",
    severity: "warning",
    explanation: "High-frequency AI marker."
  },
  {
    pattern: /\bgame-changer\b/gi,
    label: "Game-changer",
    replacement: "practical improvement",
    severity: "warning",
    explanation: "Hyperbolic buzzword."
  },
  {
    pattern: /\bstate-of-the-art\b/gi,
    label: "State-of-the-art",
    replacement: "modern and well-equipped",
    severity: "warning",
    explanation: "Overused cliché."
  }
];

export interface CopySanitizeResult {
  cleanedText: string;
  clichesFound: string[];
  replacementCount: number;
}

/**
 * Scans a text snippet for AI clichés and replaces them with natural, professional commercial phrasing.
 */
export function sanitizeCopyCliches(text: string): CopySanitizeResult {
  if (!text || typeof text !== "string") {
    return { cleanedText: text || "", clichesFound: [], replacementCount: 0 };
  }

  let result = text;
  const found: string[] = [];
  let count = 0;

  for (const rule of BANNED_AI_CLICHES) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(result)) {
      found.push(rule.label);
      rule.pattern.lastIndex = 0;
      result = result.replace(rule.pattern, (match, ...args) => {
        count++;
        if (typeof rule.replacement === "function") {
          return rule.replacement(match, args[0]);
        }
        return rule.replacement;
      });
    }
  }

  return {
    cleanedText: result,
    clichesFound: found,
    replacementCount: count
  };
}

export interface CopyQualityFinding {
  section: string;
  field: string;
  cliche: string;
  snippet: string;
  severity: "critical" | "warning";
  suggestion: string;
}

export interface CopyQualityAuditReport {
  score: number; // 0 to 100
  passed: boolean;
  totalClichesDetected: number;
  criticalIssuesCount: number;
  warningCount: number;
  findings: CopyQualityFinding[];
  summary: string;
}

/**
 * Audits a generated website schema for copy quality and anti-cliché discipline.
 */
export function auditSiteCopyQuality(site: GeneratedSite): CopyQualityAuditReport {
  const findings: CopyQualityFinding[] = [];

  const inspectField = (section: string, field: string, text?: string) => {
    if (!text || typeof text !== "string") return;
    for (const rule of BANNED_AI_CLICHES) {
      rule.pattern.lastIndex = 0;
      const match = rule.pattern.exec(text);
      if (match) {
        findings.push({
          section,
          field,
          cliche: rule.label,
          snippet: match[0],
          severity: rule.severity,
          suggestion: rule.explanation
        });
      }
    }
  };

  // Inspect Hero
  if (site.hero) {
    inspectField("Hero", "title", site.hero.title);
    inspectField("Hero", "subtitle", site.hero.subtitle);
  }

  // Inspect About
  if (site.about) {
    inspectField("About", "history", site.about.history);
    inspectField("About", "mission", site.about.mission);
    inspectField("About", "pitch", site.about.pitch);
  }

  // Inspect Services
  if (Array.isArray(site.services)) {
    site.services.forEach((srv, idx) => {
      inspectField("Services", `Service #${idx + 1} Title`, srv.title);
      inspectField("Services", `Service #${idx + 1} Description`, srv.description);
    });
  }

  // Inspect Features
  if (Array.isArray(site.features)) {
    site.features.forEach((feat, idx) => {
      inspectField("Features", `Feature #${idx + 1} Title`, feat.title);
      inspectField("Features", `Feature #${idx + 1} Description`, feat.description);
    });
  }

  // Inspect FAQs
  if (Array.isArray(site.faqs)) {
    site.faqs.forEach((faq, idx) => {
      inspectField("FAQs", `FAQ #${idx + 1} Answer`, faq.answer);
    });
  }

  const criticalIssuesCount = findings.filter(f => f.severity === "critical").length;
  const warningCount = findings.filter(f => f.severity === "warning").length;
  const totalClichesDetected = findings.length;

  // Score starts at 100, docks 15 per critical issue, 5 per warning
  const penalty = criticalIssuesCount * 15 + warningCount * 5;
  const score = Math.max(0, 100 - penalty);
  const passed = score >= 85 && criticalIssuesCount === 0;

  let summary = "Copy quality adheres strictly to authentic commercial standards with zero generic AI tropes.";
  if (criticalIssuesCount > 0) {
    summary = `Detected ${criticalIssuesCount} critical generic AI clichés requiring automated sanitization.`;
  } else if (warningCount > 0) {
    summary = `Detected ${warningCount} stylistic warnings; language is generally sound.`;
  }

  return {
    score,
    passed,
    totalClichesDetected,
    criticalIssuesCount,
    warningCount,
    findings,
    summary
  };
}

/**
 * Curated Industry Archetypes for Diverse, Non-Repetitive AI Website Generation
 */
export interface IndustryArchetype {
  id: string;
  name: string;
  categoryAliases: string[];
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fontStyle: "sans" | "serif" | "display" | "modern";
  sectionsOrder: string[];
  heroLayout: "split-quote" | "reassurance-split" | "authoritative-centered" | "sensory-immersive" | "fullwidth-editorial";
  defaultHeroHeadline: (city: string) => string;
  defaultHeroSubtitle: (city: string) => string;
  primaryCta: string;
  secondaryCta: string;
  typicalServices: string[];
}

export const INDUSTRY_ARCHETYPES: Record<string, IndustryArchetype> = {
  plumbing_trades: {
    id: "plumbing_trades",
    name: "Plumbing & Trade Services",
    categoryAliases: ["plumber", "plumbing", "electrician", "hvac", "roofing", "locksmith", "drainage", "handyman", "trades"],
    palette: {
      primary: "#1d4ed8", // Deep Trade Blue
      secondary: "#1e3a8a", // Navy
      accent: "#f59e0b", // Safety Amber
      background: "#ffffff",
      text: "#0f172a"
    },
    fontStyle: "sans",
    sectionsOrder: ["hero", "services", "contact", "features", "about", "faqs", "testimonials", "gallery", "blog"],
    heroLayout: "split-quote",
    defaultHeroHeadline: (city) => `Fast, Dependable Plumbing & Repair Across ${city}`,
    defaultHeroSubtitle: (city) => `Upfront itemized quotes, clean workmanship, and rapid response for homeowners and businesses in ${city}.`,
    primaryCta: "Request Immediate Quote",
    secondaryCta: "Call Dispatch",
    typicalServices: ["Emergency Leak Repair", "Pipe Installation & Geysers", "Drain Clearing & Inspection", "Preventative Maintenance"]
  },
  dental_healthcare: {
    id: "dental_healthcare",
    name: "Dental & Healthcare",
    categoryAliases: ["dentist", "dental", "clinic", "healthcare", "doctor", "medical", "physiotherapy", "orthodontist"],
    palette: {
      primary: "#0891b2", // Calming Medical Cyan
      secondary: "#155e75", // Deep Slate Blue
      accent: "#10b981", // Reassurance Emerald
      background: "#ffffff",
      text: "#0f172a"
    },
    fontStyle: "sans",
    sectionsOrder: ["hero", "services", "about", "features", "faqs", "testimonials", "gallery", "blog", "contact"],
    heroLayout: "reassurance-split",
    defaultHeroHeadline: (city) => `Gentle, Comprehensive Dental Care in ${city}`,
    defaultHeroSubtitle: (city) => `Patient-centered dentistry delivering modern oral health care in a calm, welcoming environment.`,
    primaryCta: "Book Consultation",
    secondaryCta: "View Services",
    typicalServices: ["Routine Hygiene & Exams", "Restorative Dental Care", "Teeth Whitening & Aesthetics", "Emergency Toothache Relief"]
  },
  law_legal: {
    id: "law_legal",
    name: "Legal & Professional Advisory",
    categoryAliases: ["law", "lawyer", "attorney", "legal", "solicitor", "advocate", "notary", "accounting", "tax advisory"],
    palette: {
      primary: "#1e293b", // Prestige Slate
      secondary: "#0f172a", // Midnight Obsidian
      accent: "#b45309", // Warm Brass / Gold
      background: "#ffffff",
      text: "#0f172a"
    },
    fontStyle: "serif",
    sectionsOrder: ["hero", "about", "features", "services", "faqs", "testimonials", "gallery", "blog", "contact"],
    heroLayout: "authoritative-centered",
    defaultHeroHeadline: (city) => `Strategic Legal Counsel & Advocacy in ${city}`,
    defaultHeroSubtitle: (city) => `Protecting your commercial interests, family assets, and regulatory compliance with rigorous integrity.`,
    primaryCta: "Request Confidential Case Review",
    secondaryCta: "Explore Practice Areas",
    typicalServices: ["Commercial & Contract Law", "Property & Conveyancing", "Estate Planning & Probate", "Dispute Resolution & Litigation"]
  },
  artisan_bakery_food: {
    id: "artisan_bakery_food",
    name: "Artisan Bakery, Cafe & Food",
    categoryAliases: ["bakery", "pastry", "cafe", "coffee", "bistro", "restaurant", "artisan bread", "catering", "dessert"],
    palette: {
      primary: "#78350f", // Rich Roast Espresso
      secondary: "#92400e", // Terracotta
      accent: "#d97706", // Warm Amber
      background: "#fcfbf7", // Warm Linen
      text: "#1c1917"
    },
    fontStyle: "modern",
    sectionsOrder: ["hero", "gallery", "services", "about", "features", "testimonials", "faqs", "blog", "contact"],
    heroLayout: "sensory-immersive",
    defaultHeroHeadline: (city) => `Handcrafted Daily Baking & Specialty Coffee in ${city}`,
    defaultHeroSubtitle: (city) => `Slow-fermented sourdough, fresh morning viennoiserie, and seasonal local ingredients baked fresh every sunrise.`,
    primaryCta: "View Daily Bake Menu",
    secondaryCta: "Find Our Shop",
    typicalServices: ["Daily Sourdough Loaves", "Viennoiserie & Pastries", "Custom Celebration Cakes", "Catering & Event Platters"]
  },
  boutique_hotel: {
    id: "boutique_hotel",
    name: "Boutique Hotel & Hospitality",
    categoryAliases: ["hotel", "lodge", "boutique hotel", "resort", "guesthouse", "bed and breakfast", "hospitality", "suites"],
    palette: {
      primary: "#14532d", // Forest Moss
      secondary: "#052e16", // Deep Botanical
      accent: "#c2410c", // Terracotta Bronze
      background: "#fafaf9", // Soft Stone
      text: "#1c1917"
    },
    fontStyle: "serif",
    sectionsOrder: ["hero", "gallery", "services", "about", "testimonials", "faqs", "features", "blog", "contact"],
    heroLayout: "fullwidth-editorial",
    defaultHeroHeadline: (city) => `Distinctive Stays & Quiet Elegance in ${city}`,
    defaultHeroSubtitle: (city) => `Thoughtfully curated rooms, local gastronomy, and intimate hospitality in the heart of the region.`,
    primaryCta: "Check Room Availability",
    secondaryCta: "View The Property",
    typicalServices: ["Heritage Suites & Rooms", "Private Garden Dining", "Conferencing & Retreats", "Curated Regional Excursions"]
  },
  construction_engineering: {
    id: "construction_engineering",
    name: "Construction & Engineering",
    categoryAliases: ["construction", "contractor", "builder", "civil", "renovation", "engineering", "architect"],
    palette: {
      primary: "#ea580c", // Industrial Blaze Orange
      secondary: "#9a3412", // Rust
      accent: "#f97316", // Bright Orange
      background: "#ffffff",
      text: "#0f172a"
    },
    fontStyle: "display",
    sectionsOrder: ["hero", "gallery", "services", "features", "about", "testimonials", "faqs", "blog", "contact"],
    heroLayout: "split-quote",
    defaultHeroHeadline: (city) => `Precision Construction & Contracting in ${city}`,
    defaultHeroSubtitle: (city) => `Delivering structural integrity, accurate cost estimating, and disciplined project timelines from concept to handover.`,
    primaryCta: "Request Tender Evaluation",
    secondaryCta: "Review Completed Projects",
    typicalServices: ["Residential Contracting", "Commercial Turnkey Builds", "Structural Renovation", "Architectural Project Management"]
  },
  beauty_salon: {
    id: "beauty_salon",
    name: "Hair Salon & Beauty Sanctuary",
    categoryAliases: ["beauty", "salon", "barber", "hair", "spa", "cosmetics", "styling", "nails", "aesthetic"],
    palette: {
      primary: "#be185d", // Rose Garnet
      secondary: "#831843", // Deep Plum
      accent: "#f43f5e", // Radiant Rose
      background: "#fdf8f9", // Silky Blush
      text: "#1e1b1d"
    },
    fontStyle: "serif",
    sectionsOrder: ["hero", "gallery", "services", "about", "testimonials", "faqs", "features", "blog", "contact"],
    heroLayout: "sensory-immersive",
    defaultHeroHeadline: (city) => `Artisan Hair Styling & Beauty Sanctuary in ${city}`,
    defaultHeroSubtitle: (city) => `Dedicated to hair health, bridal aesthetics, and rejuvenating skin rituals in a tranquil studio environment.`,
    primaryCta: "Book Your Appointment",
    secondaryCta: "View Style Portfolio",
    typicalServices: ["Precision Haircut & Styling", "Balayage & Color Formulation", "Bridal & Event Glamour", "Restorative Scalp Rituals"]
  },
  auto_repair: {
    id: "auto_repair",
    name: "Automotive Repair & Diagnostics",
    categoryAliases: ["auto", "mechanic", "automotive", "car repair", "garage", "vehicle", "brakes", "transmission", "diagnostics", "motor"],
    palette: {
      primary: "#dc2626", // Performance Crimson
      secondary: "#991b1b", // Deep Engine Red
      accent: "#ef4444", // Bright Amber Flame
      background: "#ffffff",
      text: "#0f172a"
    },
    fontStyle: "display",
    sectionsOrder: ["hero", "services", "contact", "features", "about", "faqs", "testimonials", "gallery", "blog"],
    heroLayout: "split-quote",
    defaultHeroHeadline: (city) => `Master Automotive Diagnostics & Repair in ${city}`,
    defaultHeroSubtitle: (city) => `Dealer-grade computerized scanning, transparent estimates, and certified mechanical repairs with zero surprise charges.`,
    primaryCta: "Schedule Diagnostic Service",
    secondaryCta: "Call Mechanic Directly",
    typicalServices: ["Computerized Engine Diagnostics", "Brake & Suspension Replacement", "Scheduled Preventive Maintenance", "Air Conditioning & Electrical Repair"]
  },
  restaurant_dining: {
    id: "restaurant_dining",
    name: "Restaurant & Fine Dining",
    categoryAliases: ["restaurant", "trattoria", "pizzeria", "dining", "eatery", "steakhouse", "grill", "gastropub"],
    palette: {
      primary: "#c2410c", // Warm Terracotta
      secondary: "#7c2d12", // Roasted Umber
      accent: "#d97706", // Amber
      background: "#fcfbf7", // Warm Linen
      text: "#1c1917"
    },
    fontStyle: "serif",
    sectionsOrder: ["hero", "gallery", "services", "about", "testimonials", "faqs", "features", "blog", "contact"],
    heroLayout: "sensory-immersive",
    defaultHeroHeadline: (city) => `Distinctive Culinary Dining & Authentic Flavors in ${city}`,
    defaultHeroSubtitle: (city) => `Farm-fresh local ingredients, heritage recipes, and warm hospitality served daily in a memorable setting.`,
    primaryCta: "Reserve a Table",
    secondaryCta: "Explore Dinner Menu",
    typicalServices: ["A La Carte Dining", "Chef's Tasting Experience", "Private Events & Celebrations", "Weekend Brunch & Cocktails"]
  }
};

/**
 * Resolves the best matching industry archetype for a given category query.
 */
export function resolveIndustryArchetype(category: string = ""): IndustryArchetype {
  const norm = (category || "").toLowerCase().trim();
  for (const arch of Object.values(INDUSTRY_ARCHETYPES)) {
    if (arch.categoryAliases.some(alias => norm.includes(alias))) {
      return arch;
    }
  }
  // Default to plumbing/trades as universal service archetype
  return INDUSTRY_ARCHETYPES.plumbing_trades;
}
