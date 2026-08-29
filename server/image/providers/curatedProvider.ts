import { ImageProvider } from "./baseProvider.js";
import { ImageMetadata, ImageSearchOptions } from "../types.js";
import { matchIndustryTaxonomy, INDUSTRY_TAXONOMY } from "../taxonomy.js";

export class CuratedTaxonomyProvider implements ImageProvider {
  name = "curated_taxonomy";

  isAvailable(): boolean {
    return true; // Always available, zero-latency, highly accurate
  }

  async search(query: string, options: ImageSearchOptions): Promise<ImageMetadata[]> {
    const taxonomy = matchIndustryTaxonomy(options.industry || query);
    let images: ImageMetadata[] = [...taxonomy.curatedImages];

    // If query or service matches other industries, merge them if needed
    if (images.length === 0) {
      images = [...INDUSTRY_TAXONOMY.general_business.curatedImages];
    }

    // Filter or re-order based on section
    if (options.section) {
      const sectionMatches = images.filter(img => img.section === options.section);
      if (sectionMatches.length > 0) {
        images = sectionMatches.concat(images.filter(img => img.section !== options.section));
      }
    }

    // Filter out excluded IDs
    if (options.excludeIds && options.excludeIds.length > 0) {
      images = images.filter(img => !options.excludeIds?.includes(img.id));
    }

    // Map section context to result
    return images.slice(0, options.limit || 8).map(img => ({
      ...img,
      section: options.section || img.section,
      query: query || img.query
    }));
  }
}
