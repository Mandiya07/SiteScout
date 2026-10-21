/**
 * Category-by-Category AI Website Generation & Visual Quality Verification Script
 * Micro-Phase 19C
 */

import { normalizeWebsiteSchema, validateWebsiteSchema } from "../lib/websiteSchema";
import { resolveIndustryArchetype, auditSiteCopyQuality } from "../lib/aiCopyQuality";
import { resolveHeroImageUrl } from "../lib/heroImages";
import { generateStaticHtml } from "../lib/htmlGenerator";
import { matchIndustryTaxonomy } from "../../server/image/taxonomy";

interface TestBusinessInput {
  name: string;
  category: string;
  address: string;
  phone: string;
  description?: string;
  email?: string;
}

const TEST_CATEGORIES: TestBusinessInput[] = [
  {
    name: "La Piazza Trattoria & Pizzeria",
    category: "Catering & Restaurant",
    address: "Mbabane, Eswatini",
    phone: "+268 7601 2233",
    description: "Authentic wood-fired pizza, handmade pasta, and family Italian dining."
  },
  {
    name: "Kukhanya Civil Engineering & Construction",
    category: "Construction",
    address: "Matsapha Industrial Site, Eswatini",
    phone: "+268 7611 4455",
    description: "Commercial building, civil roadworks, concrete structures, and project management."
  },
  {
    name: "Ezulwini Glow Hair & Beauty Studio",
    category: "Hair Salon & Barber",
    address: "Ezulwini Valley, Eswatini",
    phone: "+268 7622 6677",
    description: "Modern hair styling, braids, bridal beauty packages, and natural skin treatments."
  },
  {
    name: "Matsapha Precision Auto Repair & Diagnostics",
    category: "Auto Repair & Mechanic",
    address: "Matsapha, Eswatini",
    phone: "+268 7633 8899",
    description: "Engine diagnostics, mechanical servicing, brake replacement, and automotive air conditioning."
  },
  {
    name: "Vanguard Corporate & Commercial Legal",
    category: "Legal Services",
    address: "Mbabane Central, Eswatini",
    phone: "+268 7644 0011",
    description: "Corporate governance, contract litigation, labor disputes, and commercial arbitration."
  }
];

export function runCategoryVisualValidation() {
  console.log("================================================================================");
  console.log("  MICRO-PHASE 19C: 5-CATEGORY VISUAL GENERATION & FIDELITY VALIDATION          ");
  console.log("================================================================================\n");

  const results: any[] = [];

  for (const biz of TEST_CATEGORIES) {
    const startTime = Date.now();
    const archetype = resolveIndustryArchetype(biz.category);
    const taxonomy = matchIndustryTaxonomy(biz.category);

    const site = normalizeWebsiteSchema({
      businessName: biz.name,
      category: biz.category,
      address: biz.address,
      phone: biz.phone
    }, biz as any);

    const durationMs = Date.now() - startTime;
    const validation = validateWebsiteSchema(site);
    const heroImg = resolveHeroImageUrl(site);
    const copyAudit = auditSiteCopyQuality(site);
    const staticHtml = generateStaticHtml(site);

    const result = {
      category: biz.category,
      businessName: biz.name,
      valid: validation.valid,
      durationMs,
      archetypeKey: archetype.name,
      palette: {
        primary: site.primaryColor,
        secondary: site.secondaryColor,
        accent: site.accentColor,
        background: site.backgroundColor,
        text: site.textColor
      },
      fontStyle: site.fontStyle,
      hero: {
        title: site.hero.title,
        subtitle: site.hero.subtitle,
        ctaPrimary: site.hero.ctaPrimary,
        ctaSecondary: site.hero.ctaSecondary,
        imageUrl: heroImg
      },
      sectionsCount: site.sectionsOrder.length,
      sectionsOrder: site.sectionsOrder,
      servicesCount: site.services.length,
      services: site.services.map(s => s.title),
      pricingAllQuoteBased: site.services.every(s => !s.price || s.price.includes("Quote") || s.price.includes("Pricing") || s.price.includes("Contact")),
      testimonialsZeroFabricated: site.testimonials.length === 0,
      copyQualityScore: copyAudit.score,
      criticalClichesCount: copyAudit.criticalIssuesCount,
      staticHtmlLength: staticHtml.length,
      hasZeroPillDiscipline: !staticHtml.includes("rounded-full bg-white/10"),
      hasResponsive2ColContact: staticHtml.includes("grid-cols-1 lg:grid-cols-2")
    };

    results.push(result);

    console.log(`▶ [${biz.category.toUpperCase()}] — ${biz.name}`);
    console.log(`  ✓ Schema Validity: ${validation.valid ? "VALID" : "INVALID"}`);
    console.log(`  ✓ Archetype: ${archetype.name} (Font: ${site.fontStyle}, Primary: ${site.primaryColor})`);
    console.log(`  ✓ Hero Image: ${heroImg.substring(0, 60)}...`);
    console.log(`  ✓ Section Sequence: ${site.sectionsOrder.slice(0, 4).join(" -> ")}...`);
    console.log(`  ✓ Services: ${site.services.map(s => s.title).join(", ")}`);
    console.log(`  ✓ Pricing Safe: ${result.pricingAllQuoteBased ? "QUOTE-BASED (SAFE)" : "FAILED"}`);
    console.log(`  ✓ Zero Fabricated Reviews: ${result.testimonialsZeroFabricated ? "ENFORCED" : "FAILED"}`);
    console.log(`  ✓ Copy Score: ${copyAudit.score}/100 (Clichés: ${copyAudit.totalClichesDetected})`);
    console.log(`  ✓ Visual Parity HTML: ${staticHtml.length} bytes (Zero-Pill: ${result.hasZeroPillDiscipline}, 2-Col Contact: ${result.hasResponsive2ColContact})\n`);
  }

  console.log("================================================================================");
  console.log("  SUMMARY OF 5-CATEGORY VISUAL GENERATION EVALUATION");
  console.log("================================================================================");
  console.log(`Total Tested: ${results.length}`);
  console.log(`All Valid: ${results.every(r => r.valid)}`);
  console.log(`All Quote-Based (Zero Invented Prices): ${results.every(r => r.pricingAllQuoteBased)}`);
  console.log(`All Zero Fabricated Reviews: ${results.every(r => r.testimonialsZeroFabricated)}`);
  console.log(`All Distinct Color Palettes: ${new Set(results.map(r => r.palette.primary)).size === results.length}`);
  console.log(`Average Generation/Normalization Time: ${(results.reduce((acc, r) => acc + r.durationMs, 0) / results.length).toFixed(2)}ms\n`);

  return results;
}

if (process.argv[1]?.includes("generateCategoryValidation.ts")) {
  runCategoryVisualValidation();
}
