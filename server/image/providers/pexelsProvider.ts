import { ImageProvider } from "./baseProvider.js";
import { ImageMetadata, ImageSearchOptions } from "../types.js";

export class PexelsImageProvider implements ImageProvider {
  name = "pexels";

  isAvailable(): boolean {
    return !!process.env.PEXELS_API_KEY && process.env.PEXELS_API_KEY.trim().length > 0;
  }

  async search(query: string, options: ImageSearchOptions): Promise<ImageMetadata[]> {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) return [];

    try {
      const orientationParam = options.orientation === "landscape" ? "&orientation=landscape" :
                               options.orientation === "portrait" ? "&orientation=portrait" :
                               options.orientation === "square" ? "&orientation=square" : "";
      
      const perPage = options.limit || 8;
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}${orientationParam}`;

      const res = await fetch(url, {
        headers: {
          Authorization: apiKey,
          "User-Agent": "SiteScoutAI-WebsiteGenerator/1.0"
        }
      });

      if (!res.ok) {
        console.warn(`[PexelsProvider] search failed with status ${res.status}: ${res.statusText}`);
        return [];
      }

      const data = await res.json();
      if (!data.photos || !Array.isArray(data.photos)) {
        return [];
      }

      return data.photos.map((photo: any): ImageMetadata => {
        return {
          id: `pexels_${photo.id}`,
          provider: "pexels",
          sourceUrl: photo.url,
          thumbnailUrl: photo.src?.medium || photo.src?.small || photo.src?.tiny,
          fullUrl: photo.src?.large2x || photo.src?.large || photo.src?.original,
          width: photo.width,
          height: photo.height,
          alt: photo.alt || `${options.industry} professional service photo by ${photo.photographer}`,
          photographer: photo.photographer || "Pexels Contributor",
          photographerUrl: photo.photographer_url,
          license: "Pexels License - Free commercial use, no attribution strictly required",
          licenseUrl: "https://www.pexels.com/license/",
          usageType: "stock",
          section: options.section,
          query,
          industry: options.industry,
          subcategory: options.subcategory,
          relevanceScore: 92,
          orientation: photo.width > photo.height ? "landscape" : photo.width < photo.height ? "portrait" : "square",
          createdAt: new Date().toISOString()
        };
      });
    } catch (err: any) {
      console.warn(`[PexelsProvider] search error for "${query}":`, err.message);
      return [];
    }
  }
}
