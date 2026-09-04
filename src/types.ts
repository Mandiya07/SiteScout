export interface DigitalDeficitAudit {
  noWebsite: boolean;
  outdatedWebsite: boolean;
  noGooglePresence: boolean;
  noSocialMedia: boolean;
  poorBranding: boolean;
  noWhatsappCta: boolean;
  noOnlineCatalogue: boolean;
  noBookingSystem: boolean;
  noEnquiryForm: boolean;
  noSeo: boolean;
  brokenLinks: boolean;
  poorMobileExperience: boolean;
  missingContact: boolean;
}

export interface PresenceMetrics {
  hasWebsite: boolean;
  websiteUrl?: string;
  hasEmail: boolean;
  facebookStatus: "active" | "weak" | "none";
  instagramStatus: "active" | "weak" | "none";
  googleProfileQuality: "good" | "fair" | "poor";
  reviewCountStatus: "few" | "average" | "many";
  photosStatus: "sufficient" | "missing" | "outdated";
  descriptionQuality: "good" | "fair" | "poor";
  openingHoursStatus: "complete" | "missing";
  contactCompleteness: "complete" | "partial" | "missing";
  // Detailed 13-point deficit flags
  deficits?: DigitalDeficitAudit;
}

export interface AuditEvidence {
  checkedAt: string;
  source: string;
  httpStatus?: number | string;
  websiteVerified: boolean;
  notes: string;
}

export interface Business {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  email?: string;
  reviewsCount: number;
  rating: number;
  presence: PresenceMetrics;
  description: string;
  presenceScore?: number;
  opportunityScore?: number;
  analysis?: OpportunityAnalysis;
  directorySource?: string;
  deficitCount?: number;
  evidence?: AuditEvidence;
  sourceUrl?: string;
  // Enhanced Tripartite Scoring (Point 43, 44, 45)
  businessQualityScore?: number;
  digitalDeficitScore?: number;
  websiteOpportunityScore?: number;
  // Prospect pipeline fields
  prospectStatus?: ProspectStatus;
  lastContactedAt?: string;
  nextFollowUpDate?: string;
  prospectNotes?: string;
  siteId?: string;
  previewToken?: string;
  previewViews?: number;
  previewLastViewedAt?: string;
  previewDevice?: "mobile" | "desktop";
}

export type ProspectStatus = 
  | "New"
  | "Analyzed"
  | "Preview Ready"
  | "Preview Sent"
  | "Follow-up 1"
  | "Follow-up 2"
  | "Interested"
  | "Proposal Sent"
  | "Won"
  | "Lost";

export interface OpportunityAnalysis {
  presenceScore: number;
  opportunityScore: number;
  whyWebsiteNeeded: string;
  recommendations: string[];
  competitorPitches: string[];
  evidenceSummary?: string;
}

export interface SeoMetadata {
  title: string;
  description: string;
  keywords: string;
}

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
    industryMatch: number;
    serviceMatch: number;
    sectionMatch: number;
    visualQuality: number;
    composition: number;
    orientation: number;
    resolution: number;
  };
  explanation?: string;
  orientation?: "landscape" | "portrait" | "square";
  createdAt: string;
}

export interface ImageRequirement {
  section: "hero" | "about" | "services" | "gallery" | "contact";
  subject: string;
  serviceName?: string;
  style: string;
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
  visualStyle: string;
  preferredSubjects: string[];
  avoidSubjects: string[];
  localContext?: string;
  heroRequirement?: ImageRequirement;
  aboutRequirement?: ImageRequirement;
  servicesRequirements?: ImageRequirement[];
  galleryRequirements?: ImageRequirement[];
}

export interface HeroSection {
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  imageUrl?: string;
  photographer?: string;
  photographerUrl?: string;
  license?: string;
  imageMetadata?: ImageMetadata;
}

export interface AboutSection {
  title: string;
  history: string;
  mission: string;
  pitch: string;
  imageUrl?: string;
  imageMetadata?: ImageMetadata;
}

export interface ServiceItem {
  title: string;
  description: string;
  price: string;
  imageUrl?: string;
  imageMetadata?: ImageMetadata;
}

export interface FeatureItem {
  title: string;
  icon: string;
  description: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface TestimonialItem {
  name: string;
  review: string;
  rating: number;
  isVerified?: boolean;
}

export interface BlogPostItem {
  title: string;
  summary: string;
  category: string;
}

export interface GalleryImage {
  url: string;
  alt: string;
  photographer?: string;
  photographerUrl?: string;
  license?: string;
  usageType?: "stock" | "client_asset" | "user_upload" | "ai_generated";
  relevanceScore?: number;
  explanation?: string;
  imageMetadata?: ImageMetadata;
}

export type SalesStatus = "Lead" | "Contacted" | "Negotiation" | "Proposal Sent" | "Closed" | "Lost";

export interface GeneratedSite {
  id: string;
  businessId?: string;
  salesStatus?: SalesStatus;
  tags?: string[];
  ownerId?: string;
  previewToken?: string;
  createdAt?: string;
  updatedAt?: string;
  businessName: string;
  phone: string;
  email?: string;
  clientEmail?: string;
  address: string;
  country?: string;
  category: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontStyle: "sans" | "serif" | "display" | "modern";
  seo: SeoMetadata;
  hero: HeroSection;
  about: AboutSection;
  services: ServiceItem[];
  features: FeatureItem[];
  gallery: GalleryImage[];
  faqs: FAQItem[];
  testimonials: TestimonialItem[];
  blog: BlogPostItem[];
  whatsappMessage: string;
  contactPage: {
    title: string;
    description: string;
    email: string;
  };
  privacyPolicy: string;
  termsOfService: string;
  notFoundPage: {
    title: string;
    message: string;
  };
  logoUrl?: string;
  publishedUrl?: string;
  sectionsOrder?: string[];
  logoType?: "text" | "icon" | "image";
  logoIcon?: string;
  clientFeedback?: { message: string; timestamp: string; status: string; }[];
  clientApproved?: boolean;
  clientApprovedBy?: string;
  clientApprovedAt?: string;
  previewViews?: number;
  previewLastViewedAt?: string;
  previewHistory?: { timestamp: string; device: "mobile" | "desktop"; referrer?: string }[];
  proposal?: Proposal;
  publishing?: {
    customDomain?: string;
    subdomain?: string;
    hostingProvider?: string;
    sslActive?: boolean;
    sitemapUrl?: string;
    lastPublished?: string;
    status?: "published" | "unpublished";
  };
  crmSynced?: boolean;
  visualProfile?: VisualBusinessProfile;
  imageAttributions?: ImageMetadata[];
}

export interface SalesOutreach {
  email: string;
  whatsapp: string;
  sms: string;
  coldCall: string;
  followUp: string;
  linkedin: string;
  messenger: string;
}

export interface PricingCalculator {
  packageName: string;
  packagePrice: number;
  hostingPrice: number;
  maintenancePrice: number;
  domainPrice: number;
  emailPrice: number;
  seoPrice: number;
  gbpOtpPrice: number;
  logoPrice: number;
  supportMonthlyPrice: number;
  isRecurring: boolean;
}

export interface Proposal {
  id: string;
  businessId: string;
  businessName: string;
  clientEmail: string;
  clientName: string;
  dateCreated: string;
  expiryDate: string;
  features: string[];
  pricing: PricingCalculator;
  status: "draft" | "sent" | "approved" | "rejected";
  timeline: string;
  terms: string;
}

export interface SearchFilters {
  country: string;
  city: string;
  town: string;
  category: string;
  keywords: string;
  radius: string;
  directorySource?: string;
  deficitFilters?: {
    noWebsite?: boolean;
    outdatedWebsite?: boolean;
    noGooglePresence?: boolean;
    noSocialMedia?: boolean;
    poorBranding?: boolean;
    noWhatsappCta?: boolean;
    noOnlineCatalogue?: boolean;
    noBookingSystem?: boolean;
    noEnquiryForm?: boolean;
    noSeo?: boolean;
    brokenLinks?: boolean;
    poorMobileExperience?: boolean;
    missingContact?: boolean;
  };
}

export interface UserSession {
  uid: string;
  email: string;
  name: string;
  role: "Admin" | "User";
  subscription: "Free Trial" | "Pro Plan" | "Agency VIP";
  isVerified: boolean;
}

export interface PartnerNiche {
  id: string;
  name: string;
  icon: string;
  tagline: string;
  whyTheyNeedUs: string;
  averageClientNeed: string;
  pitchHook: string;
  typicalTicketSize: string;
  suggestedSplit: string;
  searchQuery: string;
}

export interface PartnerDeal {
  id: string;
  partnerName: string;
  partnerType: string;
  partnerEmail: string;
  partnerPhone: string;
  status: "Targeted" | "Prospecting" | "Contacted" | "In Negotiation" | "Agreement Signed" | "Active Partner";
  splitPercentage: number;
  referredClientCount: number;
  totalRevenueGenerated: number;
  notes: string;
}
