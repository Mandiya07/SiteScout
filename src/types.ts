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

export type EvidenceSourceType =
  | "GOOGLE_MAPS"
  | "GOOGLE_SEARCH"
  | "BUSINESS_WEBSITE"
  | "BUSINESS_DIRECTORY"
  | "SOCIAL_PROFILE";

export interface EvidenceItem {
  sourceType: EvidenceSourceType;
  url: string;
  title?: string;
  retrievedAt: string;
  supports: string[];
}

export type BusinessVerificationState =
  | "DEMO"
  | "UNVERIFIED"
  | "CANDIDATE"
  | "VERIFIED"
  | "CONTACT_READY";

export type WebsiteStatus =
  | "NONE"
  | "LIVE"
  | "BROKEN"
  | "PARKED"
  | "DIRECTORY_ONLY"
  | "SOCIAL_ONLY"
  | "UNKNOWN";

export type DeficitFindingStatus = "PRESENT" | "MISSING" | "UNKNOWN" | "WEAK" | "BROKEN";

export interface DeficitFinding {
  status: DeficitFindingStatus;
  notes?: string;
  verifiedAt?: string;
  source?: string;
}

export type CanonicalSalesStage =
  | "NEW"
  | "ANALYZED"
  | "PREVIEW_READY"
  | "PREVIEW_SENT"
  | "FOLLOW_UP_1"
  | "FOLLOW_UP_2"
  | "INTERESTED"
  | "PROPOSAL_SENT"
  | "WON"
  | "LOST";

export type ActivityType =
  | "business_discovered"
  | "business_verified"
  | "website_checked"
  | "audit_completed"
  | "opportunity_scored"
  | "preview_generated"
  | "preview_sent"
  | "preview_viewed"
  | "whatsapp_clicked"
  | "phone_clicked"
  | "email_clicked"
  | "follow_up_sent"
  | "prospect_replied"
  | "proposal_sent"
  | "proposal_accepted"
  | "deal_won";

export interface ProspectActivity {
  id: string;
  businessId: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string;
  actorId?: string;
  metadata?: Record<string, any>;
}

export type PreviewEventType =
  | "preview_opened"
  | "page_viewed"
  | "cta_clicked"
  | "whatsapp_clicked"
  | "phone_clicked"
  | "email_clicked"
  | "feedback_submitted"
  | "approval_submitted";

export interface PreviewTelemetryEvent {
  id: string;
  previewToken: string;
  eventType: PreviewEventType;
  timestamp: string;
  device: "mobile" | "desktop";
  referrer?: string;
  details?: Record<string, any>;
}

export interface PresenceMetrics {
  hasWebsite: boolean;
  websiteStatus?: WebsiteStatus;
  websiteUrl?: string;
  canonicalUrl?: string;
  domain?: string;
  httpStatus?: number | string;
  sslStatus?: boolean;
  lastCheckedAt?: string;
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
  detailedDeficits?: Record<string, DeficitFinding>;
}

export interface AuditEvidence {
  checkedAt: string;
  source: string;
  httpStatus?: number | string;
  websiteVerified: boolean;
  notes: string;
  sourceUrls?: string[];
  verificationStatus?: "verified_live_listing" | "directory_found" | "sample_demo";
  isEstimated?: boolean;
}

export interface VerificationChecklistItem {
  status: "passed" | "failed" | "unconfirmed";
  details: string;
}

export interface VerificationChecklist {
  businessIdentity: VerificationChecklistItem;
  exactPhone: VerificationChecklistItem;
  exactAddress: VerificationChecklistItem;
  websiteAbsenceCheck: VerificationChecklistItem;
  operatingStatus: VerificationChecklistItem;
  ratingSync: VerificationChecklistItem;
  socialMediaPresence: VerificationChecklistItem;
  independentVerificationAuditStamp: VerificationChecklistItem;
}

export type ContentLevel = "VERIFIED" | "BUSINESS_SUPPLIED" | "AI_DRAFT";

export interface TruthField {
  label: string;
  key: string;
  value: string;
  status: "confirmed" | "unconfirmed" | "not_found";
  statusText: string;
  level: ContentLevel;
  notes?: string;
  source?: string;
}

export interface BusinessTruthProfile {
  id: string;
  businessId: string;
  businessName: TruthField;
  phone: TruthField;
  address: TruthField;
  website: TruthField;
  category: TruthField;
  services: TruthField;
  openingHours: TruthField;
  rating: TruthField;
  reviews: TruthField;
  email: TruthField;
  socialLinks: TruthField;
  summary: {
    confirmedCount: number;
    unconfirmedCount: number;
    verifiedCount: number;
    businessSuppliedCount: number;
    aiDraftCount: number;
    draftPolicy: string;
  };
  generatedAt?: string;
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
  evidenceList?: EvidenceItem[];
  verificationState?: BusinessVerificationState;
  verificationChecklist?: VerificationChecklist;
  sourceUrl?: string;
  isDemo?: boolean;
  dataType?: "real" | "demo";
  truthProfile?: BusinessTruthProfile;
  userId?: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
  salesStage?: CanonicalSalesStage;
  // Enhanced Tripartite Scoring (Point 43, 44, 45)
  businessQualityScore?: number;
  digitalDeficitScore?: number;
  websiteOpportunityScore?: number;
  // Pipeline Architecture Classification
  pipelineBranch?: "BRANCH_A_WEBSITE_AUDITED" | "BRANCH_B_CANDIDATE_VERIFIED";
  pipelineStage?: "REAL_SOURCE_FETCHED" | "URL_DETECTED_AUDITED" | "CANDIDATE_VERIFIED" | "CONFIRMED_REVAMP_PROSPECT" | "GENERATION_READY";
  liveAuditDetails?: {
    rawUrl?: string;
    httpStatus?: string;
    responseTimeMs?: number;
    isSsl?: boolean;
    geminiAnalysisSummary?: string;
  };
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
  | "Interested"
  | "Proposal"
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
    metadataRelevance?: number;      // max 25
    visualRelevance?: number;        // max 35 (authentic trade tools/scene vs generic stock)
    composition?: number;            // max 20 (rule-of-thirds, visual balance)
    textOverlaySuitability?: number; // max 20 (clean negative space, headline headroom)
    // Legacy support
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
  truthProfile?: BusinessTruthProfile;
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
  isDemo?: boolean;
  dataType?: "real" | "demo";
  visualProfile?: VisualBusinessProfile;
  imageAttributions?: ImageMetadata[];
  presence?: any;
  deficits?: any;
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
  page?: number;
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
