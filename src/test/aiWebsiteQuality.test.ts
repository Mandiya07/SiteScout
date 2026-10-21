/**
 * AI Website Generation & Visual Quality Validation Test Suite
 * Micro-Phase 19C
 * 
 * Validates:
 * 1. Multi-Industry Distinctiveness (5+ commercial archetypes: Trades, Dental, Legal, Bakery, Hotel)
 * 2. Strict Adherence to Verified Facts & Anti-Fabrication Safeguards
 * 3. Provenance & AI-Draft Content Flagging
 * 4. Image Intelligence, Category Alignment & Fallback Resilience
 * 5. Anti-Cliché Content Validator & Tone Quality Engine
 * 6. Responsive Structure, Zero-Pill Discipline & Accessibility
 * 7. End-to-End Round-Trip Integrity (Generation -> Editor -> Export HTML)
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { normalizeWebsiteSchema, validateWebsiteSchema, sanitizePricing, sanitizeLiabilityClaims } from "../lib/websiteSchema";
import { resolveIndustryArchetype, sanitizeCopyCliches, auditSiteCopyQuality, INDUSTRY_ARCHETYPES } from "../lib/aiCopyQuality";
import { resolveHeroImageUrl, getCategoryHeroImage } from "../lib/heroImages";
import { generateStaticHtml, escapeHtml, sanitizeUrl } from "../lib/htmlGenerator";
import { Business, GeneratedSite, BusinessTruthProfile } from "../types";

describe("MICRO-PHASE 19C: AI Website Generation & Visual Quality Validation", () => {

  describe("A. Business-Specific Website Generation Across 5+ Industries", () => {
    const industries = [
      { category: "Emergency Plumbing & Pipe Repair", expectedArchetype: "plumbing_trades", expectedFont: "sans" },
      { category: "Family Dental Care & Orthodontics", expectedArchetype: "dental_healthcare", expectedFont: "sans" },
      { category: "Corporate & Litigation Legal Practice", expectedArchetype: "law_legal", expectedFont: "serif" },
      { category: "Artisan Bakery & Specialty Cafe", expectedArchetype: "artisan_bakery_food", expectedFont: "modern" },
      { category: "Boutique Heritage Hotel & Suites", expectedArchetype: "boutique_hotel", expectedFont: "serif" },
      { category: "Commercial Civil Construction", expectedArchetype: "construction_engineering", expectedFont: "display" }
    ];

    it("generates distinct visual and typographic systems for each commercial archetype", () => {
      const generatedSites = industries.map(ind => {
        const dummyBiz: Business = {
          id: `biz_${ind.expectedArchetype}`,
          name: `${ind.expectedArchetype.replace('_', ' ').toUpperCase()} Co`,
          category: ind.category,
          address: "Mbabane, Eswatini",
          phone: "+268 7600 1234",
          createdAt: new Date().toISOString()
        } as any;
        return {
          industry: ind,
          site: normalizeWebsiteSchema({}, dummyBiz)
        };
      });

      // 1. Verify all sites pass schema validation
      for (const { site, industry } of generatedSites) {
        const val = validateWebsiteSchema(site);
        assert.strictEqual(val.valid, true, `Site schema for ${industry.category} must be valid`);
        assert.ok(site.primaryColor, "Primary color must be set");
        assert.ok(site.hero.title, "Hero title must be populated");
        assert.ok(site.hero.ctaPrimary, "Primary CTA must be populated");
      }

      // 2. Verify palettes are not identical clones
      const primaryColors = new Set(generatedSites.map(g => g.site.primaryColor));
      assert.ok(primaryColors.size >= 5, "At least 5 distinct primary colors must be used across industries");

      // 3. Verify section orders reflect industry-specific conversion psychology
      const plumbing = generatedSites.find(g => g.industry.expectedArchetype === "plumbing_trades")!.site;
      const hotel = generatedSites.find(g => g.industry.expectedArchetype === "boutique_hotel")!.site;
      const legal = generatedSites.find(g => g.industry.expectedArchetype === "law_legal")!.site;

      // Plumbing is urgent: services comes early
      assert.strictEqual(plumbing.sectionsOrder[1], "services", "Urgent trade site should lead with services");
      // Hotel is sensory/visual: gallery comes early
      assert.strictEqual(hotel.sectionsOrder[1], "gallery", "Hospitality site should lead with visual gallery");
      // Legal is credential/trust: about comes early
      assert.strictEqual(legal.sectionsOrder[1], "about", "Legal site should lead with credentials/about");

      // 4. Verify typography styles match domain native tone
      assert.strictEqual(legal.fontStyle, "serif", "Legal site should use authoritative serif typography");
      assert.strictEqual(plumbing.fontStyle, "sans", "Plumbing trade site should use clear sans typography");
    });
  });

  describe("B. Fact Adherence & Liability Protection Safeguards", () => {
    it("neutralizes unverified specific monetary prices into quote-based defaults", () => {
      const unverifiedServices = [
        { title: "Standard Callout", description: "Diagnosis and inspection", price: "$150" },
        { title: "Emergency Burst Pipe", description: "Immediate repair", price: "R850 / hr" },
        { title: "Custom Consultation", description: "Personalized review", price: "Request a Quote" }
      ];

      const { services, sanitizedCount } = sanitizePricing(unverifiedServices, false);
      assert.strictEqual(sanitizedCount, 2, "Should sanitize the 2 specific numerical prices");
      assert.strictEqual(services[0].price, "Request a Quote");
      assert.strictEqual(services[1].price, "Request a Quote");
      assert.strictEqual(services[2].price, "Request a Quote");
    });

    it("sanitizes unverified years in business, staff claims, and absolute guarantees", () => {
      const mockSite: Partial<GeneratedSite> = {
        businessName: "Elite Mechanical",
        category: "Auto Repair",
        address: "Manzini, Eswatini",
        phone: "+268 7611 2233",
        hero: {
          title: "Over 25 years in business serving the community",
          subtitle: "100% money-back guarantee with 24/7 emergency dispatch.",
          ctaPrimary: "Book Now",
          ctaSecondary: "Call Us"
        },
        about: {
          title: "About Us",
          history: "Established in 1995 by Dr. John Smith, serving over 10,000 happy customers.",
          mission: "Lifetime warranty on all repairs.",
          pitch: "State licensed master technicians offering 50% discount this month."
        }
      };

      const normalized = normalizeWebsiteSchema(mockSite);
      assert.ok(normalized.contentIntegrity, "Content integrity report must exist");
      assert.ok(normalized.contentIntegrity.liabilityProtectionEnforced, "Liability protection must be enforced");
      assert.ok(normalized.contentIntegrity.liabilityClaimsSanitizedCount > 0, "Must sanitize liability claims");

      // Verify sanitized strings
      assert.ok(!normalized.hero.title.includes("25 years in business"), "Years in business must be neutralized");
      assert.ok(!normalized.hero.subtitle.includes("100% money-back guarantee"), "Money back guarantee must be neutralized");
      assert.ok(!normalized.about.history.includes("10,000 happy customers"), "Unverified metrics must be neutralized");
    });

    it("filters out fabricated synthetic reviews when no source reviews exist", () => {
      const mockSite: Partial<GeneratedSite> = {
        businessName: "Solo Artisan",
        category: "Bakery",
        address: "Ezulwini",
        phone: "+268 7655 4433",
        testimonials: [
          { name: "Fake John", review: "Greatest bread in the world!", rating: 5 },
          { name: "Synthetic Jane", review: "Amazing service 10/10", rating: 5 }
        ]
      };

      // Unverified, non-user-supplied reviews must be sanitized
      const normalized = normalizeWebsiteSchema(mockSite, null, false);
      assert.strictEqual(normalized.testimonials.length, 0, "Fabricated synthetic testimonials must be completely stripped");
    });
  });

  describe("C. Provenance & AI-Draft Content Flagging", () => {
    it("strictly flags AI-generated copy as AI_DRAFT and preserves BUSINESS_SUPPLIED facts", () => {
      const dummyBiz: Business = {
        id: "biz_truth_test",
        name: "Authentic Dental Clinic",
        category: "Dental Care",
        address: "Mbabane Central",
        phone: "+268 7600 9999",
        createdAt: new Date().toISOString()
      } as any;

      const site = normalizeWebsiteSchema({
        hero: {
          title: "Authentic Dental",
          subtitle: "AI generated draft copy for dental clinic",
          ctaPrimary: "Book",
          ctaSecondary: "Call"
        }
      }, dummyBiz);

      assert.ok(site.provenance, "Provenance record must be defined");
      assert.strictEqual(site.provenance.businessName, "AI_DRAFT");
      assert.strictEqual(site.provenance.heroSubtitle, "AI_DRAFT", "Hero subtitle must be flagged as AI_DRAFT");
      assert.strictEqual(site.provenance.services, "AI_DRAFT", "Unverified services must be flagged as AI_DRAFT");
    });

    it("elevates facts to BUSINESS_SUPPLIED when explicitly marked as user supplied", () => {
      const site = normalizeWebsiteSchema({
        isUserSupplied: true,
        businessName: "Directly Verified Plumbing",
        phone: "+268 7800 1122",
        address: "Matsapha",
        category: "Plumbing"
      });

      assert.strictEqual(site.provenance.businessName, "BUSINESS_SUPPLIED");
      assert.strictEqual(site.provenance.phone, "BUSINESS_SUPPLIED");
      assert.strictEqual(site.provenance.address, "BUSINESS_SUPPLIED");
    });
  });

  describe("D. Image Intelligence, Category Alignment & Fallback Resilience", () => {
    it("maps categories to relevant high-resolution curated hero imagery", () => {
      const dentalHero = getCategoryHeroImage("Dental Clinic");
      const plumbingHero = getCategoryHeroImage("Plumbing Services");
      const hotelHero = getCategoryHeroImage("Boutique Hotel & Resort");
      const bakeryHero = getCategoryHeroImage("Artisan Bakery & Cafe");

      assert.ok(dentalHero.includes("unsplash.com"), "Dental hero must be a valid Unsplash image");
      assert.ok(plumbingHero.includes("unsplash.com"), "Plumbing hero must be a valid Unsplash image");
      assert.ok(hotelHero.includes("unsplash.com"), "Hotel hero must be a valid Unsplash image");
      assert.ok(bakeryHero.includes("unsplash.com"), "Bakery hero must be a valid Unsplash image");

      // Verify images are distinct and not all pointing to the default fallback
      const heroSet = new Set([dentalHero, plumbingHero, hotelHero, bakeryHero]);
      assert.strictEqual(heroSet.size, 4, "Each industry must have a distinct curated hero image");
    });

    it("gracefully resolves fallback hero when primary imageUrl is broken or null", () => {
      const siteWithNullHero: any = {
        category: "Dental Care",
        hero: { imageUrl: null },
        gallery: [{ url: "https://images.unsplash.com/photo-gallery-1" }]
      };

      const resolved = resolveHeroImageUrl(siteWithNullHero);
      assert.strictEqual(resolved, "https://images.unsplash.com/photo-gallery-1", "Should step down to gallery image first");

      const siteWithNoGallery: any = {
        category: "Law Firm",
        hero: { imageUrl: "   " },
        gallery: []
      };
      const resolvedFallback = resolveHeroImageUrl(siteWithNoGallery);
      assert.ok(resolvedFallback.startsWith("https://images.unsplash.com"), "Should fallback to category curated image");
    });
  });

  describe("E. Anti-Cliché Content Validator", () => {
    it("detects and replaces generic AI tropes with grounded commercial phrasing", () => {
      const badCopy = "Welcome to Mbabane Plumbing! In today's fast-paced world, we are your premier destination and one-stop shop. Elevate your experience with our cutting-edge solutions as we delve into delivering excellence.";
      const { cleanedText, clichesFound, replacementCount } = sanitizeCopyCliches(badCopy);

      assert.ok(replacementCount >= 5, `Expected multiple cliches detected, got ${replacementCount}`);
      assert.ok(!cleanedText.toLowerCase().includes("welcome to"), "Should remove 'Welcome to'");
      assert.ok(!cleanedText.toLowerCase().includes("in today's fast-paced world"), "Should remove 'In today's fast-paced world'");
      assert.ok(!cleanedText.toLowerCase().includes("premier destination"), "Should remove 'premier destination'");
      assert.ok(!cleanedText.toLowerCase().includes("one-stop shop"), "Should remove 'one-stop shop'");
      assert.ok(!cleanedText.toLowerCase().includes("cutting-edge solutions"), "Should remove 'cutting-edge solutions'");
      assert.ok(!cleanedText.toLowerCase().includes("delivering excellence"), "Should remove 'delivering excellence'");
    });

    it("audits site copy quality and generates actionable report with quality score", () => {
      const uncleanedSite: any = {
        businessName: "Premier Law Practice",
        category: "Legal Services",
        hero: {
          title: "Welcome to Premier Law Practice",
          subtitle: "In today's fast-paced world, we elevate your experience with cutting-edge solutions.",
          ctaPrimary: "Consult",
          ctaSecondary: "Explore"
        },
        services: [
          { title: "One-stop shop services", description: "Delivering excellence in our community.", price: "Request a Quote" }
        ],
        about: {
          pitch: "We are the premier destination for all your legal needs."
        }
      };

      const audit = auditSiteCopyQuality(uncleanedSite);
      assert.ok(audit.totalClichesDetected >= 2, `Should flag multiple clichés in the uncleaned copy, found ${audit.totalClichesDetected}`);
      assert.ok(audit.criticalIssuesCount > 0, "Should identify critical clichés");
      assert.ok(audit.score < 85, "Score should reflect cliché penalties");
    });
  });

  describe("F. Responsive Structure, Zero-Pill Discipline & Accessibility", () => {
    it("verifies static HTML export produces zero-pill kicker, expansive containers, and WCAG-compliant attributes", () => {
      const site = normalizeWebsiteSchema({
        businessName: "Mbabane Artisan Bakery",
        category: "Bakery",
        address: "Mbabane, Eswatini",
        phone: "+268 7600 5555"
      });

      const html = generateStaticHtml(site);

      // 1. Zero-Pill check: No rounded-full pill boxes in hero metadata
      assert.ok(!html.includes("rounded-full bg-white/10"), "Hero category must not be enclosed in a rounded pill badge");
      // 2. Clean typographic separator check
      assert.ok(html.includes("aria-hidden=\"true\""), "Typographic separator must have aria-hidden for accessibility");
      // 3. Container width check: must use max-w-5xl, not cramped max-w-2xl
      assert.ok(html.includes("max-w-5xl"), "Static HTML must use expansive max-w-5xl container width");
      // 4. Contact form with honeypot bot prevention
      assert.ok(html.includes("name=\"website_url_hp\""), "Contact form must have anti-spam honeypot");
      // 5. Contact layout 2-column check
      assert.ok(html.includes("grid-cols-1 lg:grid-cols-2"), "Contact section must use responsive 2-column layout on desktop");
    });
  });

  describe("G. Round-Trip Integrity: Generation -> Editor -> Export", () => {
    it("maintains schema integrity, custom edits, and XSS safety through full round-trip", () => {
      // 1. Generate site
      const initial = normalizeWebsiteSchema({
        businessName: "Apex Dental Clinic",
        category: "Dental Care",
        address: "Matsapha Industrial",
        phone: "+268 7622 3344"
      });

      // 2. Simulate User Editor Modifications
      const edited: GeneratedSite = {
        ...initial,
        businessName: "Apex Dental & Smile Centre",
        services: [
          ...initial.services,
          {
            title: "Cosmetic Veneers & Bonding",
            description: "Custom cosmetic restorations crafted with high-grade porcelain.",
            price: "Request a Quote",
            imageUrl: "https://images.unsplash.com/photo-dental-veneer"
          }
        ],
        sectionsOrder: ["hero", "services", "gallery", "about", "faqs", "contact"]
      };

      // 3. Normalize edited schema
      const reNormalized = normalizeWebsiteSchema(edited, null, false);
      const val = validateWebsiteSchema(reNormalized);
      assert.strictEqual(val.valid, true, "Edited schema must remain completely valid");
      assert.strictEqual(reNormalized.businessName, "Apex Dental & Smile Centre");
      assert.strictEqual(reNormalized.services.length, initial.services.length + 1);

      // 4. Export static HTML
      const html = generateStaticHtml(reNormalized);
      assert.ok(html.includes("Apex Dental &amp; Smile Centre") || html.includes("Apex Dental & Smile Centre"), "Exported HTML must contain updated business name");
      assert.ok(html.includes("Cosmetic Veneers"), "Exported HTML must contain newly added service package");

      // 5. Verify XSS sanitization in HTML export
      const maliciousSite = {
        ...reNormalized,
        businessName: "Safe Dental <script>alert('xss')</script>",
        hero: {
          ...reNormalized.hero,
          title: "Quality Care <img src=x onerror=alert(1)>"
        }
      };
      const safeHtml = generateStaticHtml(maliciousSite);
      assert.ok(!safeHtml.includes("<script>alert('xss')</script>"), "HTML export must escape malicious user-supplied script tags");
      assert.ok(!safeHtml.includes("<img src=x onerror="), "HTML export must not render unescaped malicious image tags");
      assert.ok(safeHtml.includes("&lt;img src=x onerror=alert(1)&gt;"), "Malicious image tag must be HTML-escaped");
    });
  });

});
