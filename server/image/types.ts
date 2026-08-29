export interface ImageMetadata {
  id: string;
  provider: "unsplash" | "pexels" | "pixabay" | "curated_taxonomy" | "user_upload" | "business_asset" | "ai_generated";
  sourceUrl: string;
  thumbnailUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  alt: string;
  photographer: string;
  photographerUrl?: string;
  license: string;
  licenseUrl?: string;
  usageType: "stock" | "client_asset" | "user_upload" | "ai_generated";
  section: "hero" | "about" | "services" | "gallery" | "contact" | "features";
  query: string;
  industry: string;
  subcategory?: string;
  relevanceScore: number;
  relevanceBreakdown?: {
    industryMatch: number; // max 30
    serviceMatch: number;  // max 25
    sectionMatch: number;  // max 15
    visualQuality: number; // max 10
    composition: number;   // max 10
    orientation: number;   // max 5
    resolution: number;    // max 5
  };
  explanation?: string;
  orientation?: "landscape" | "portrait" | "square";
  createdAt: string;
  tags?: string[];
}

export type VisualStyle = 
  | "Professional"
  | "Modern"
  | "Premium"
  | "Warm"
  | "Friendly"
  | "Minimal"
  | "Luxury"
  | "Bold"
  | "Corporate"
  | "Local"
  | "Family-friendly"
  | "Youthful"
  | "Traditional"
  | "Elegant";

export interface ImageRequirement {
  section: "hero" | "about" | "services" | "gallery" | "contact" | "features";
  subject: string;
  serviceName?: string;
  style: VisualStyle | string;
  orientation: "landscape" | "portrait" | "square";
  aspectRatio: "16:9" | "4:3" | "1:1" | "3:2";
  keywords: string[];
  negativeKeywords?: string[];
  purpose?: string;
}

export interface VisualBusinessProfile {
  industry: string;
  subcategory: string;
  services: string[];
  audience: string[];
  visualStyle: VisualStyle;
  preferredSubjects: string[];
  avoidSubjects: string[];
  localContext?: string;
  heroRequirement: ImageRequirement;
  aboutRequirement: ImageRequirement;
  servicesRequirements: ImageRequirement[];
  galleryRequirements: ImageRequirement[];
}

export interface ImageSearchOptions {
  industry: string;
  subcategory?: string;
  section: "hero" | "about" | "services" | "gallery" | "contact" | "features";
  serviceName?: string;
  style?: string;
  orientation?: "landscape" | "portrait" | "square";
  limit?: number;
  excludeIds?: string[];
  preferredSubjects?: string[];
}
