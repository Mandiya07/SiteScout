import { ImageProvider } from "./baseProvider.js";
import { ImageMetadata, ImageSearchOptions } from "../types.js";

export class UnsplashImageProvider implements ImageProvider {
  name = "unsplash";

  isAvailable(): boolean {
    return !!process.env.UNSPLASH_ACCESS_KEY && process.env.UNSPLASH_ACCESS_KEY.trim().length > 0;
  }

  async search(query: string, options: ImageSearchOptions): Promise<ImageMetadata[]> {
    const accessKey = process.env.UNSPLASH_ACCESS_KEY;
    if (!accessKey) return [];

    try {
      const orientationParam = options.orientation === "landscape" ? "&orientation=landscape" :
                               options.orientation === "portrait" ? "&orientation=portrait" :
                               options.orientation === "square" ? "&orientation=squarish" : "";
      
      const perPage = options.limit || 8;
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}${orientationParam}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          "Accept-Version": "v1"
        }
      });

      if (!res.ok) {
        console.warn(`[UnsplashProvider] search failed with status ${res.status}: ${res.statusText}`);
        return [];
      }

      const data = await res.json();
      if (!data.results || !Array.isArray(data.results)) {
        return [];
      }

      return data.results.map((photo: any): ImageMetadata => {
        return {
          id: `unsplash_${photo.id}`,
          provider: "unsplash",
          sourceUrl: photo.links?.html || photo.urls?.raw,
          thumbnailUrl: photo.urls?.small || photo.urls?.thumb,
          fullUrl: photo.urls?.regular || photo.urls?.full,
          width: photo.width,
          height: photo.height,
          alt: photo.alt_description || photo.description || `${options.industry} professional photography by ${photo.user?.name}`,
          photographer: photo.user?.name || "Unsplash Photographer",
          photographerUrl: photo.user?.links?.html || `https://unsplash.com/@${photo.user?.username}`,
          license: "Unsplash License - Free commercial and non-commercial use",
          licenseUrl: "https://unsplash.com/license",
          usageType: "stock",
          section: options.section,
          query,
          industry: options.industry,
          subcategory: options.subcategory,
          relevanceScore: 94,
          orientation: photo.width > photo.height ? "landscape" : photo.width < photo.height ? "portrait" : "square",
          createdAt: new Date().toISOString()
        };
      });
    } catch (err: any) {
      console.warn(`[UnsplashProvider] search error for "${query}":`, err.message);
      return [];
    }
  }
}
