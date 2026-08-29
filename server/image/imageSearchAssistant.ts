import { ImageMetadata, VisualBusinessProfile, ImageRequirement, ImageSearchOptions } from "./types.js";
import { matchIndustryTaxonomy, INDUSTRY_TAXONOMY } from "./taxonomy.js";
import { PexelsImageProvider } from "./providers/pexelsProvider.js";
import { UnsplashImageProvider } from "./providers/unsplashProvider.js";
import { CuratedTaxonomyProvider } from "./providers/curatedProvider.js";
import { sortAndRankCandidates, ScoreContext } from "./imageRanking.js";
import { imageCache } from "./imageCache.js";

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

    const heroReq: ImageRequirement = {
      section: "hero",
      subject: taxonomy.preferredSubjects[0] || `${taxonomy.industry} professional workplace`,
      style: taxonomy.defaultStyle,
      orientation: "landscape",
      aspectRatio: "16:9",
      keywords: [taxonomy.industry, taxonomy.subcategory, "professional", "high quality"],
      negativeKeywords: taxonomy.avoidSubjects,
      purpose: "Establish immediate industry credibility, quality, and visual atmosphere in the hero viewport."
    };

    const aboutReq: ImageRequirement = {
      section: "about",
      subject: taxonomy.preferredSubjects[1] || `${taxonomy.industry} specialist team craftsmanship`,
      style: taxonomy.defaultStyle,
      orientation: "landscape",
      aspectRatio: "4:3",
      keywords: [taxonomy.industry, "craftsman", "team", "care", "trust"],
      negativeKeywords: taxonomy.avoidSubjects,
      purpose: "Reinforce customer trust, craftsmanship, and local community service."
    };

    const servicesRequirements: ImageRequirement[] = services.map((srv, idx) => {
      const query = taxonomy.serviceQueries[srv] || `${taxonomy.industry} ${srv}`;
      return {
        section: "services",
        serviceName: srv,
        subject: query,
        style: taxonomy.defaultStyle,
        orientation: "landscape",
        aspectRatio: "4:3",
        keywords: [taxonomy.industry, srv, "service", "quality"],
        negativeKeywords: taxonomy.avoidSubjects,
        purpose: `Showcase actual execution and package value for ${srv}.`
      };
    });

    const galleryRequirements: ImageRequirement[] = taxonomy.galleryThemes.map((theme, idx) => {
      return {
        section: "gallery",
        subject: theme,
        style: taxonomy.defaultStyle,
        orientation: "square",
        aspectRatio: "1:1",
        keywords: [taxonomy.industry, theme, "portfolio", "detail"],
        negativeKeywords: taxonomy.avoidSubjects,
        purpose: `Portfolio visual proof for ${theme}.`
      };
    });

    return {
      industry: taxonomy.industry,
      subcategory: taxonomy.subcategory,
      services,
      audience: taxonomy.audience,
      visualStyle: taxonomy.defaultStyle,
      preferredSubjects: taxonomy.preferredSubjects,
      avoidSubjects: taxonomy.avoidSubjects,
      localContext,
      heroRequirement: heroReq,
      aboutRequirement: aboutReq,
      servicesRequirements,
      galleryRequirements
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
      usedImageIds: new Set(options.excludeIds || [])
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
      excludeIds: Array.from(usedIds)
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
      excludeIds: Array.from(usedIds)
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
        excludeIds: Array.from(usedIds)
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
        excludeIds: Array.from(usedIds)
      });
      const chosen = galCandidates.find(c => !usedIds.has(c.id)) || galCandidates[0];
      if (chosen) {
        usedIds.add(chosen.id);
        usedIds.add(chosen.fullUrl);
        galleryImages.push(chosen);
      }
    }

    return {
      heroImage,
      aboutImage,
      serviceImages,
      galleryImages
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
