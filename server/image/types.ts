export interface VisualAnalysisReport {
  detectedSubject: string;
  tradeAuthenticity: "high_fidelity_trade_match" | "acceptable_context" | "generic_stock_warning";
  focalPointPosition: "left_weighted" | "center" | "right_weighted" | "distributed";
  negativeSpaceLocation: "left" | "right" | "top" | "center" | "minimal";
  overlayReadabilityScore: number; // 0 - 100
  contrastRating: "optimal_dark_overlay" | "optimal_light_overlay" | "high_contrast" | "busy_background";
  analysisSummary: string;
  visualDefects?: string[];
}

export interface ImageMetadata {
  id: string;
  provider: "unsplash" | "pexels" | "pixabay" | "curated_taxonomy" | "user_upload" | "business_asset" | "ai_generated";
  source?: string;
  selectionMethod?: string;
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
    // 4-Stage Genuine Intelligence Breakdown (User Architecture)
    metadataRelevance: number;      // max 25 (textual keyword, industry aliases, service name)
    visualRelevance: number;        // max 35 (actual visual subject authenticity, specific trade tools/environment vs generic worker)
    composition: number;            // max 20 (rule-of-thirds, visual balance, focal weight distribution)
    textOverlaySuitability: number; // max 20 (negative space headroom, luminance contrast, readability for headings)
    // Legacy fields for backward compatibility
    industryMatch?: number;
    serviceMatch?: number;
    sectionMatch?: number;
    visualQuality?: number;
    orientation?: number;
    resolution?: number;
  };
  visualAnalysis?: VisualAnalysisReport;
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
  businessName?: string;
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
  businessName?: string;
  brandPersonality?: string;
  customerType?: string[];
  localContext?: string;
}
