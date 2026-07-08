export interface PresenceMetrics {
  hasWebsite: boolean;
  hasEmail: boolean;
  facebookStatus: "active" | "weak" | "none";
  instagramStatus: "active" | "weak" | "none";
  googleProfileQuality: "good" | "fair" | "poor";
  reviewCountStatus: "few" | "average" | "many";
  photosStatus: "sufficient" | "missing" | "outdated";
  descriptionQuality: "good" | "fair" | "poor";
  openingHoursStatus: "complete" | "missing";
  contactCompleteness: "complete" | "partial" | "missing";
}

export interface Business {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  reviewsCount: number;
  rating: number;
  presence: PresenceMetrics;
  description: string;
  presenceScore?: number;
  analysis?: OpportunityAnalysis;
}

export interface OpportunityAnalysis {
  presenceScore: number;
  whyWebsiteNeeded: string;
  recommendations: string[];
  competitorPitches: string[];
}

export interface SeoMetadata {
  title: string;
  description: string;
  keywords: string;
}

export interface HeroSection {
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  imageUrl?: string;
}

export interface AboutSection {
  title: string;
  history: string;
  mission: string;
  pitch: string;
}

export interface ServiceItem {
  title: string;
  description: string;
  price: string;
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
}

export interface BlogPostItem {
  title: string;
  summary: string;
  category: string;
}

export interface GalleryImage {
  url: string;
  alt: string;
}

export interface GeneratedSite {
  id: string;
  businessName: string;
  phone: string;
  address: string;
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
}

export interface UserSession {
  uid: string;
  email: string;
  name: string;
  role: "Admin" | "User";
  subscription: "Free Trial" | "Pro Plan" | "Agency VIP";
  isVerified: boolean;
}
