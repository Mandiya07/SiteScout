import { ImageMetadata, VisualBusinessProfile, ImageRequirement, ImageSearchOptions } from "./types.js";
import { matchIndustryTaxonomy, INDUSTRY_TAXONOMY } from "./taxonomy.js";
import { PexelsImageProvider } from "./providers/pexelsProvider.js";
import { UnsplashImageProvider } from "./providers/unsplashProvider.js";
import { CuratedTaxonomyProvider } from "./providers/curatedProvider.js";
import { sortAndRankCandidates, ScoreContext } from "./imageRanking.js";
import { imageCache } from "./imageCache.js";
import { visualAnalyzer } from "./visualAnalyzer.js";

export class ImageSearchAssistant {
  private pexelsProvider = new PexelsImageProvider();
  private unsplashProvider = new UnsplashImageProvider();
  private curatedProvider = new CuratedTaxonomyProvider();

  /**
   * Constructs a complete Visual Business Profile with image requirements for all sections.
   */
  createVisualProfile(
    businessName: string,
    category: string,
    servicesList: string[] = [],
    localContext: string = ""
  ): VisualBusinessProfile {
    const taxonomy = matchIndustryTaxonomy(category);
    const services = servicesList.length > 0 ? servicesList : taxonomy.services;

    // 1. Determine tailored brand style/personality based on business name
    let style = taxonomy.defaultStyle;
    const nameLower = businessName.toLowerCase();
    if (nameLower.match(/\b(green|organic|eco|nature|leaf|earth|natural|bio|plant|garden)\b/)) {
      style = "Friendly"; // Natural & Eco-friendly focus
    } else if (nameLower.match(/\b(summit|apex|elite|prime|luxury|signature|global|executive|grand|prestige|royal|crest|crown|peak|pinnacle|silver|gold|platinum|boutique)\b/)) {
      style = "Luxury";
    } else if (nameLower.match(/\b(family|cozy|local|home|friendly|neighborhood|little|mama|papa|grandma|community|nest|hearth|care|love)\b/)) {
      style = "Family-friendly";
    } else if (nameLower.match(/\b(tech|digital|smart|future|nexus|sync|cyber|quantum|hyper|next|alpha|lab|matrix|cloud|code)\b/)) {
      style = "Modern";
    } else if (nameLower.match(/\b(classic|heritage|traditional|old|vintage|legacy|historic|ancient|foundry|craft|trust|founding)\b/)) {
      style = "Traditional";
    } else if (nameLower.match(/\b(bold|iron|steel|thunder|blaze|strike|vivid|wild|nexus|force|power|vertex|beast|surge|apex)\b/)) {
      style = "Bold";
    } else if (nameLower.match(/\b(minimal|pure|clean|white|light|space|form|zero|zen|calm|quiet)\b/)) {
      style = "Minimal";
    }

    // 2. Formulate highly tailored subject descriptions for the search engine
    // Hero Subject tailoring: combine industry + primary service + local context if provided
    let heroSubject = taxonomy.preferredSubjects[0] || `${taxonomy.industry} professional workplace`;
    if (services.length > 0) {
      heroSubject = `${services[0]} professional`;
    }
    if (localContext) {
      heroSubject += ` in ${localContext}`;
    }

    // Include subtle style modifiers directly inside search subjects for premium results
    if (style === "Luxury" || style === "Premium" || style === "Elegant") {
      heroSubject = `premium elegant ${heroSubject}`;
    } else if (style === "Warm" || style === "Friendly" || style === "Family-friendly") {
      heroSubject = `warm welcoming ${heroSubject}`;
    } else if (style === "Minimal") {
      heroSubject = `clean minimalist ${heroSubject}`;
    } else if (style === "Modern") {
      heroSubject = `modern contemporary ${heroSubject}`;
    }

    const heroReq: ImageRequirement = {
      section: "hero",
      subject: heroSubject,
      style: style,
      orientation: "landscape",
      aspectRatio: "16:9",
      keywords: [taxonomy.industry, taxonomy.subcategory, "professional", style, localContext].filter(Boolean),
      negativeKeywords: taxonomy.avoidSubjects,
      purpose: `Establish immediate credibility for ${businessName} with a visual atmosphere optimized for ${taxonomy.audience.join(" & ")}.`
    };

    // About Subject tailoring
    let aboutSubject = taxonomy.preferredSubjects[1] || `${taxonomy.industry} specialist team craftsmanship`;
    if (localContext) {
      aboutSubject = `${aboutSubject} ${localContext}`;
    }
    const aboutReq: ImageRequirement = {
      section: "about",
      subject: aboutSubject,
      style: style,
      orientation: "landscape",
      aspectRatio: "4:3",
      keywords: [taxonomy.industry, "craftsman", "team", "care", "trust", style].filter(Boolean),
      negativeKeywords: taxonomy.avoidSubjects,
      purpose: `Build client trust in ${localContext || "our local community"} by showcasing our high-end ${style.toLowerCase()} focus.`
    };

    // Services Subject tailoring
    const servicesRequirements: ImageRequirement[] = services.map((srv, idx) => {
      let query = taxonomy.serviceQueries[srv] || `${taxonomy.industry} ${srv}`;
      if (localContext && idx === 0) {
        query = `${query} ${localContext}`;
      }
      return {
        section: "services",
        serviceName: srv,
        subject: query,
        style: style,
        orientation: "landscape",
        aspectRatio: "4:3",
        keywords: [taxonomy.industry, srv, "service", "quality", style].filter(Boolean),
        negativeKeywords: taxonomy.avoidSubjects,
        purpose: `Showcase actual execution of ${srv} with a ${style.toLowerCase()} style matching ${businessName}.`
      };
    });

    // Gallery Requirements tailoring
    const galleryRequirements: ImageRequirement[] = taxonomy.galleryThemes.map((theme, idx) => {
      return {
        section: "gallery",
        subject: theme,
        style: style,
        orientation: "square",
        aspectRatio: "1:1",
        keywords: [taxonomy.industry, theme, "portfolio", "detail", style].filter(Boolean),
        negativeKeywords: taxonomy.avoidSubjects,
        purpose: `Portfolio visual proof for ${theme} aligned with our target audience: ${taxonomy.audience[0]}.`
      };
    });

    return {
      industry: taxonomy.industry,
      subcategory: taxonomy.subcategory,
      services,
      audience: taxonomy.audience,
      visualStyle: style,
      preferredSubjects: taxonomy.preferredSubjects,
      avoidSubjects: taxonomy.avoidSubjects,
      localContext,
      heroRequirement: heroReq,
      aboutRequirement: aboutReq,
      servicesRequirements,
      galleryRequirements,
      businessName
    };
  }

  /**
   * Searches across configured providers, caches results, and ranks images against criteria.
   */
  async searchImages(query: string, options: ImageSearchOptions): Promise<ImageMetadata[]> {
    const cached = imageCache.get(query, options.section, options.orientation);
    if (cached && cached.length > 0) {
      return cached;
    }

    const candidatePool: ImageMetadata[] = [];

    // 1. Check Pexels if available
    if (this.pexelsProvider.isAvailable()) {
      try {
        const pexelsResults = await this.pexelsProvider.search(query, options);
        candidatePool.push(...pexelsResults);
      } catch (e) {
        console.warn("[ImageAssistant] Pexels search failed:", e);
      }
    }

    // 2. Check Unsplash if available
    if (this.unsplashProvider.isAvailable()) {
      try {
        const unsplashResults = await this.unsplashProvider.search(query, options);
        candidatePool.push(...unsplashResults);
      } catch (e) {
        console.warn("[ImageAssistant] Unsplash search failed:", e);
      }
    }

    // 3. Always include Curated Taxonomy (ensures 100% reliability and zero-broken states)
    const curatedResults = await this.curatedProvider.search(query, options);
    candidatePool.push(...curatedResults);

    // Rank and sort candidates
    const scoreContext: ScoreContext = {
      industry: options.industry,
      subcategory: options.subcategory,
      serviceName: options.serviceName,
      requirement: {
        section: options.section,
        subject: query,
        style: options.style || "Professional",
        orientation: options.orientation || "landscape",
        aspectRatio: options.orientation === "square" ? "1:1" : "16:9",
        keywords: [options.industry, query]
      },
      usedImageIds: new Set(options.excludeIds || []),
      businessName: options.businessName,
      brandPersonality: options.brandPersonality,
      customerType: options.customerType,
      localContext: options.localContext
    };

    const ranked = sortAndRankCandidates(candidatePool, scoreContext);
    const finalResults = ranked.slice(0, options.limit || 12);

    imageCache.set(query, options.section, options.orientation, finalResults);
    return finalResults;
  }

  /**
   * Batch resolves all images for a site generation with strict deduplication across sections.
   */
  async batchResolveSiteImages(profile: VisualBusinessProfile): Promise<{
    heroImage: ImageMetadata;
    aboutImage: ImageMetadata;
    serviceImages: ImageMetadata[];
    galleryImages: ImageMetadata[];
  }> {
    const usedIds = new Set<string>();

    // 1. Hero Image
    const heroCandidates = await this.searchImages(profile.heroRequirement.subject, {
      industry: profile.industry,
      subcategory: profile.subcategory,
      section: "hero",
      orientation: "landscape",
      limit: 6,
      excludeIds: Array.from(usedIds),
      businessName: profile.businessName,
      brandPersonality: profile.visualStyle,
      customerType: profile.audience,
      localContext: profile.localContext
    });
    const heroImage = heroCandidates[0] || matchIndustryTaxonomy(profile.industry).curatedImages[0];
    usedIds.add(heroImage.id);
    usedIds.add(heroImage.fullUrl);

    // 2. About Image
    const aboutCandidates = await this.searchImages(profile.aboutRequirement.subject, {
      industry: profile.industry,
      subcategory: profile.subcategory,
      section: "about",
      orientation: "landscape",
      limit: 6,
      excludeIds: Array.from(usedIds),
      businessName: profile.businessName,
      brandPersonality: profile.visualStyle,
      customerType: profile.audience,
      localContext: profile.localContext
    });
    const aboutImage = aboutCandidates.find(c => !usedIds.has(c.id)) || aboutCandidates[0] || heroImage;
    usedIds.add(aboutImage.id);
    usedIds.add(aboutImage.fullUrl);

    // 3. Service Images
    const serviceImages: ImageMetadata[] = [];
    for (const srvReq of profile.servicesRequirements.slice(0, 4)) {
      const srvCandidates = await this.searchImages(srvReq.subject, {
        industry: profile.industry,
        subcategory: profile.subcategory,
        section: "services",
        serviceName: srvReq.serviceName,
        orientation: "landscape",
        limit: 4,
        excludeIds: Array.from(usedIds),
        businessName: profile.businessName,
        brandPersonality: profile.visualStyle,
        customerType: profile.audience,
        localContext: profile.localContext
      });
      const chosen = srvCandidates.find(c => !usedIds.has(c.id)) || srvCandidates[0];
      if (chosen) {
        usedIds.add(chosen.id);
        usedIds.add(chosen.fullUrl);
        serviceImages.push(chosen);
      }
    }

    // 4. Gallery Images
    const galleryImages: ImageMetadata[] = [];
    for (const galReq of profile.galleryRequirements.slice(0, 6)) {
      const galCandidates = await this.searchImages(galReq.subject, {
        industry: profile.industry,
        subcategory: profile.subcategory,
        section: "gallery",
        orientation: "square",
        limit: 4,
        excludeIds: Array.from(usedIds),
        businessName: profile.businessName,
        brandPersonality: profile.visualStyle,
        customerType: profile.audience,
        localContext: profile.localContext
      });
      const chosen = galCandidates.find(c => !usedIds.has(c.id)) || galCandidates[0];
      if (chosen) {
        usedIds.add(chosen.id);
        usedIds.add(chosen.fullUrl);
        galleryImages.push(chosen);
      }
    }

    // Deep Visual Intelligence Enrichment using Gemini Vision
    // To respect and conserve user daily API quota and prevent 429 errors,
    // we only execute deep multimodal Gemini Vision analysis for the primary Hero Image.
    // The rest of the images (about, services, gallery) are already beautifully scored and analyzed
    // with high fidelity by our local synchronous heuristic visual intelligence engine.
    let finalHero = heroImage;
    const finalAbout = aboutImage;
    const finalServices = serviceImages;
    const finalGallery = galleryImages;

    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" && process.env.GEMINI_API_KEY !== "") {
      try {
        console.log(`[ImageAssistant] Enhancing primary Hero image with deep Gemini Vision analysis...`);
        finalHero = await visualAnalyzer.enhanceImageWithGeminiVision(heroImage, profile.industry, profile.heroRequirement);
      } catch (e) {
        console.log("[ImageAssistant Status] Deep visual analysis deferred or offline.");
      }
    }

    return {
      heroImage: finalHero,
      aboutImage: finalAbout,
      serviceImages: finalServices,
      galleryImages: finalGallery
    };
  }

  /**
   * Expands natural language user requests into provider search terms.
   */
  expandNaturalLanguageQuery(userPrompt: string, industry: string, section: string): string {
    const promptLower = userPrompt.toLowerCase();
    const taxonomy = matchIndustryTaxonomy(industry);

    let baseTerm = `${taxonomy.industry} ${userPrompt}`;

    if (promptLower.includes("luxury") || promptLower.includes("premium") || promptLower.includes("upscale")) {
      baseTerm += " luxury modern elegant aesthetic high end";
    } else if (promptLower.includes("cozy") || promptLower.includes("warm") || promptLower.includes("friendly")) {
      baseTerm += " warm ambient comfortable welcoming";
    } else if (promptLower.includes("action") || promptLower.includes("working") || promptLower.includes("tools")) {
      baseTerm += " active professional technician tools craftsmanship";
    } else if (promptLower.includes("minimal") || promptLower.includes("clean")) {
      baseTerm += " clean minimalist contemporary bright";
    }

    return baseTerm;
  }
}

export const imageAssistant = new ImageSearchAssistant();
