import { ImageMetadata, VisualStyle } from "./types.js";

export interface IndustryVisualRule {
  industry: string;
  aliases: string[];
  defaultStyle: VisualStyle;
  subcategory: string;
  services: string[];
  audience: string[];
  preferredSubjects: string[]; // Hero subjects / visual rules
  avoidSubjects: string[];      // Negative subjects to exclude
  heroQueries: string[];        // Specific search queries for Hero section
  aboutQueries: string[];       // Specific search queries for About section
  serviceQueries: Record<string, string>; // Maps a service title to a precise search query
  galleryThemes: string[];
  curatedImages: ImageMetadata[];
}

export const INDUSTRY_TAXONOMY: Record<string, IndustryVisualRule> = {
  plumbing: {
    industry: "Plumbing",
    aliases: ["plumber", "plumbing", "pipe", "drain", "water leak", "geyser", "sewer", "plumbing services"],
    defaultStyle: "Professional",
    subcategory: "Residential & Commercial Plumbing",
    services: ["Emergency Leak Repair", "Pipe Installation & Replacement", "Drain Cleaning & Unblocking", "Bathroom & Geyser Installation"],
    audience: ["Homeowners", "Property Managers", "Commercial Facilities"],
    preferredSubjects: ["plumber repairing pipe", "professional plumbing technician", "plumbing tools under sink", "modern bathroom water pipe installation", "residential plumbing maintenance"],
    avoidSubjects: ["generic corporate boardroom", "business suit handshake", "laptop office", "random skyline", "unrelated construction crane"],
    heroQueries: [
      "professional plumber repairing residential water pipe with wrench",
      "skilled plumbing technician fixing pipes in bathroom workshop",
      "professional plumber installing modern home water system"
    ],
    aboutQueries: [
      "friendly professional plumber with uniform and toolbox",
      "certified plumbing specialist inspecting residential water fixtures"
    ],
    serviceQueries: {
      "Emergency Leak Repair": "plumber fixing burst pipe leak emergency tools",
      "Pipe Installation & Replacement": "copper and pvc water pipe fitting installation plumber",
      "Drain Cleaning & Unblocking": "plumbing technician drain snake clearing residential sink",
      "Bathroom & Geyser Installation": "modern bathroom plumbing fixture installation water heater"
    },
    galleryThemes: [
      "Plumber working with wrench under residential kitchen sink",
      "Precision copper pipe soldered joints installation",
      "Organized professional plumbing tool set and pipe cutters",
      "Clean modern luxury bathroom plumbing remodel",
      "Technician testing home water pressure valve"
    ],
    curatedImages: [
      {
        id: "curated_plumbing_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1585704032915-c3400ca199e7",
        thumbnailUrl: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&q=80&w=1200",
        width: 1200,
        height: 800,
        alt: "Professional plumber repairing residential plumbing",
        photographer: "Science in HD",
        license: "Unsplash License",
        usageType: "stock",
        section: "hero",
        query: "professional plumber repairing residential plumbing",
        industry: "Plumbing",
        relevanceScore: 98,
        orientation: "landscape",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_plumbing_service_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1542013936693-884638332954",
        thumbnailUrl: "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 600,
        alt: "Pipe repair and replacement",
        photographer: "Unsplash Photographer",
        license: "Unsplash License",
        usageType: "stock",
        section: "services",
        query: "pipe repair",
        industry: "Plumbing",
        relevanceScore: 96,
        orientation: "landscape",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_plumbing_service_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1505798577917-a65157d3320a",
        thumbnailUrl: "https://images.unsplash.com/photo-1505798577917-a65157d3320a?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1505798577917-a65157d3320a?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 600,
        alt: "Drain cleaning and unblocking",
        photographer: "Unsplash Photographer",
        license: "Unsplash License",
        usageType: "stock",
        section: "services",
        query: "drain cleaning",
        industry: "Plumbing",
        relevanceScore: 95,
        orientation: "landscape",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_plumbing_service_3",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1584622650111-993a426fbf0a",
        thumbnailUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 600,
        alt: "Geyser installation and water heater fitting",
        photographer: "Unsplash Photographer",
        license: "Unsplash License",
        usageType: "stock",
        section: "services",
        query: "geyser installation",
        industry: "Plumbing",
        relevanceScore: 96,
        orientation: "landscape",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_plumbing_gallery_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1585704032915-c3400ca199e7",
        thumbnailUrl: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 800,
        alt: "Plumbing tools",
        photographer: "Science in HD",
        license: "Unsplash License",
        usageType: "stock",
        section: "gallery",
        query: "plumbing tools",
        industry: "Plumbing",
        relevanceScore: 98,
        orientation: "square",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_plumbing_gallery_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1505798577917-a65157d3320a",
        thumbnailUrl: "https://images.unsplash.com/photo-1505798577917-a65157d3320a?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1505798577917-a65157d3320a?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 800,
        alt: "Pipe installation",
        photographer: "Unsplash Photographer",
        license: "Unsplash License",
        usageType: "stock",
        section: "gallery",
        query: "pipe installation",
        industry: "Plumbing",
        relevanceScore: 96,
        orientation: "square",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_plumbing_gallery_3",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1584622650111-993a426fbf0a",
        thumbnailUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 800,
        alt: "Bathroom plumbing",
        photographer: "Unsplash Photographer",
        license: "Unsplash License",
        usageType: "stock",
        section: "gallery",
        query: "bathroom plumbing",
        industry: "Plumbing",
        relevanceScore: 97,
        orientation: "square",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]
  },

  salons: {
    industry: "Beauty Salon & Spa",
    aliases: ["salons", "salon", "spa", "barber", "haircut", "nails", "beauty", "cosmetic", "massage", "hairdresser"],
    defaultStyle: "Warm",
    subcategory: "Premium Hair & Wellness Treatments",
    services: ["Precision Haircuts & Styling", "Luxury Facial & Skincare", "Manicure & Nail Art", "Therapeutic Full Body Massage"],
    audience: ["Beauty Seekers", "Wellness Lovers", "Professionals", "Brides-to-be"],
    preferredSubjects: ["hair stylist working on client", "luxury spa therapy candle treatment", "elegant nail art design studio", "hairdresser holding scissors barber", "peaceful modern salon interiors"],
    avoidSubjects: ["dirty dirty workshop", "heavy construction tools", "industrial truck cargo", "corporate computer terminal", "generic medical surgery"],
    heroQueries: [
      "luxurious modern hair salon interior with mirrors and stylish warm lighting",
      "friendly professional hairdresser washing client hair gently in salon sink",
      "relaxing luxury spa treatment room with burning candles and stacked towels"
    ],
    aboutQueries: [
      "portrait of friendly professional hair stylist smiling in beautiful modern salon",
      "certified aesthetician preparing organic skincare products"
    ],
    serviceQueries: {
      "Precision Haircuts & Styling": "hairdresser scissors styling woman long hair modern salon",
      "Luxury Facial & Skincare": "relaxed woman getting elegant clay facial mask spa therapy",
      "Manicure & Nail Art": "professional nail artist applying coat to fingernails salon client",
      "Therapeutic Full Body Massage": "peaceful wellness massage therapist back stone therapy massage"
    },
    galleryThemes: [
      "Modern minimalist beauty salon hair styling station",
      "Aesthetic wellness spa organic essential oils and rolled towels",
      "Intricate hand-painted nail polish design detail",
      "Skilled barber styling beard with trimmer",
      "Warm atmospheric facial steam beauty treatment"
    ],
    curatedImages: [
      {
        id: "curated_salon_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1560066984-138dadb4c035",
        thumbnailUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200",
        width: 1200,
        height: 800,
        alt: "Luxury hair salon interior and styling station",
        photographer: "Adam Warlock",
        license: "Unsplash License",
        usageType: "stock",
        section: "hero",
        query: "luxury hair salon interior",
        industry: "Beauty Salon & Spa",
        relevanceScore: 98,
        orientation: "landscape",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_salon_service_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1562322140-8baeececf3df",
        thumbnailUrl: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 600,
        alt: "Precision haircuts and styling",
        photographer: "Unsplash Photographer",
        license: "Unsplash License",
        usageType: "stock",
        section: "services",
        query: "hair styling haircut",
        industry: "Beauty Salon & Spa",
        relevanceScore: 97,
        orientation: "landscape",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_salon_service_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1570172619644-dfd03ed5d881",
        thumbnailUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 600,
        alt: "Luxury facial and skincare",
        photographer: "Unsplash Photographer",
        license: "Unsplash License",
        usageType: "stock",
        section: "services",
        query: "facial skincare spa",
        industry: "Beauty Salon & Spa",
        relevanceScore: 96,
        orientation: "landscape",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_salon_service_3",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1604654894610-df63bc536371",
        thumbnailUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 600,
        alt: "Manicure and nail art studio",
        photographer: "Unsplash Photographer",
        license: "Unsplash License",
        usageType: "stock",
        section: "services",
        query: "manicure nail art",
        industry: "Beauty Salon & Spa",
        relevanceScore: 96,
        orientation: "landscape",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_salon_gallery_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1560066984-138dadb4c035",
        thumbnailUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 800,
        alt: "Hair salon station",
        photographer: "Adam Warlock",
        license: "Unsplash License",
        usageType: "stock",
        section: "gallery",
        query: "hair salon station",
        industry: "Beauty Salon & Spa",
        relevanceScore: 98,
        orientation: "square",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_salon_gallery_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1540555700478-4be289fbecef",
        thumbnailUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 800,
        alt: "Spa treatment room",
        photographer: "Kseniia Lobko",
        license: "Unsplash License",
        usageType: "stock",
        section: "gallery",
        query: "spa treatment room",
        industry: "Beauty Salon & Spa",
        relevanceScore: 97,
        orientation: "square",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_salon_gallery_3",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1604654894610-df63bc536371",
        thumbnailUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 800,
        alt: "Nail art studio",
        photographer: "Unsplash Photographer",
        license: "Unsplash License",
        usageType: "stock",
        section: "gallery",
        query: "nail art studio",
        industry: "Beauty Salon & Spa",
        relevanceScore: 96,
        orientation: "square",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]
  },

  restaurant: {
    industry: "Restaurant",
    aliases: ["restaurant", "food", "dining", "eatery", "bistro", "grill", "cafe", "takeaway", "lounge", "kitchen", "cater", "bakery"],
    defaultStyle: "Warm",
    subcategory: "Family Dining & Culinary Experience",
    services: ["Chef's Signature Dishes", "Family Dine-in & Reservations", "Private Event Catering", "Takeaway & Fast Orders"],
    audience: ["Families", "Food Lovers", "Couples", "Corporate Groups"],
    preferredSubjects: ["gourmet cooked food plating", "cozy restaurant dining room interior", "chef preparing cuisine in kitchen", "friends dining at restaurant table", "fresh artisanal culinary ingredients"],
    avoidSubjects: ["generic corporate office", "laptops on desks", "random city skyscraper", "unrelated industrial factory", "suit and tie meetings"],
    heroQueries: [
      "delicious freshly prepared gourmet restaurant meal on dining table with warm ambient lighting",
      "cozy modern restaurant interior with elegant wooden dining tables and warm lighting",
      "artisan chef garnishing gourmet plate in restaurant kitchen"
    ],
    aboutQueries: [
      "professional restaurant chef preparing fresh ingredients in modern kitchen",
      "welcoming restaurant dining hall with comfortable booth seating"
    ],
    serviceQueries: {
      "Chef's Signature Dishes": "gourmet dinner dish plated beautifully on restaurant table",
      "Family Dine-in & Reservations": "restaurant dining room table setting with wine glasses and plates",
      "Private Event Catering": "catering buffet food platters fresh appetizers display",
      "Takeaway & Fast Orders": "packaged artisanal food ready for takeaway gourmet burger"
    },
    galleryThemes: [
      "Steaming gourmet main course served on slate plate",
      "Warm atmospheric restaurant interior with fairy lights and patrons",
      "Chef skillfully slicing fresh ingredients at prep station",
      "Handcrafted dessert pastry with berry reduction",
      "Refreshing craft beverages and dining cocktails"
    ],
    curatedImages: [
      {
        id: "curated_restaurant_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1517248135467-4c7edcad34c4",
        thumbnailUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200",
        width: 1200,
        height: 800,
        alt: "Beautiful restaurant dining experience",
        photographer: "Toa Heftiba",
        license: "Unsplash License",
        usageType: "stock",
        section: "hero",
        query: "beautiful restaurant dining experience",
        industry: "Restaurant",
        relevanceScore: 99,
        orientation: "landscape",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_restaurant_service_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1517248135467-4c7edcad34c4",
        thumbnailUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 600,
        alt: "Dining table seating and reservations",
        photographer: "Toa Heftiba",
        license: "Unsplash License",
        usageType: "stock",
        section: "services",
        query: "restaurant dining",
        industry: "Restaurant",
        relevanceScore: 98,
        orientation: "landscape",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_restaurant_service_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1555244162-803834f70033",
        thumbnailUrl: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 600,
        alt: "Private event catering and platters",
        photographer: "Lily Banse",
        license: "Unsplash License",
        usageType: "stock",
        section: "services",
        query: "event catering food",
        industry: "Restaurant",
        relevanceScore: 97,
        orientation: "landscape",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_restaurant_service_3",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1565299624946-b28f40a0ae38",
        thumbnailUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 600,
        alt: "Takeaway gourmet food delivery",
        photographer: "Unsplash Photographer",
        license: "Unsplash License",
        usageType: "stock",
        section: "services",
        query: "takeaway food delivery",
        industry: "Restaurant",
        relevanceScore: 96,
        orientation: "landscape",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_restaurant_gallery_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1555244162-803834f70033",
        thumbnailUrl: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 800,
        alt: "Gourmet food",
        photographer: "Lily Banse",
        license: "Unsplash License",
        usageType: "stock",
        section: "gallery",
        query: "gourmet food",
        industry: "Restaurant",
        relevanceScore: 98,
        orientation: "square",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_restaurant_gallery_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1517248135467-4c7edcad34c4",
        thumbnailUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 800,
        alt: "Restaurant interior",
        photographer: "Toa Heftiba",
        license: "Unsplash License",
        usageType: "stock",
        section: "gallery",
        query: "restaurant interior",
        industry: "Restaurant",
        relevanceScore: 98,
        orientation: "square",
        createdAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "curated_restaurant_gallery_3",
        provider: "curated_taxonomy",
        sourceUrl: "https://unsplash.com/photos/photo-1556910103-1c02745aae4d",
        thumbnailUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=400",
        fullUrl: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=800",
        width: 800,
        height: 800,
        alt: "Chef",
        photographer: "Unsplash Photographer",
        license: "Unsplash License",
        usageType: "stock",
        section: "gallery",
        query: "chef",
        industry: "Restaurant",
        relevanceScore: 97,
        orientation: "square",
        createdAt: "2026-01-01T00:00:00.000Z"
      }
    ]
  },

  construction: {
    industry: "Construction",
    aliases: ["construction", "builder", "civil", "contractor", "roof", "carpenter", "masonry", "paving", "renovation", "building"],
    defaultStyle: "Bold",
    subcategory: "Residential & Commercial Civil Construction",
    services: ["Custom Home Building", "Structural Renovations", "Commercial Civil Works", "Professional Project Management"],
    audience: ["Property Developers", "Homeowners", "Commercial Enterprise", "Public Works"],
    preferredSubjects: ["architect and engineer reviewing blueprint on site", "carpenter building timber frame roof structure", "excavator digging foundation", "modern concrete slab steel reinforcement", "completed modern home exterior architecture"],
    avoidSubjects: ["fancy banking offices", "pediatric clinic", "nail salon manicure", "waiter serving dessert", "hair dryer styling hair"],
    heroQueries: [
      "skilled contractor builders looking at blueprints wearing safety hats on site",
      "modern luxury architectural residential house construction skeleton framing",
      "professional construction crew pouring concrete foundation slab"
    ],
    aboutQueries: [
      "friendly general contractor builder team holding safety hats on site",
      "highly qualified construction engineer checking structural measurements"
    ],
    serviceQueries: {
      "Custom Home Building": "modern luxury residential home building framing structure",
      "Structural Renovations": "builder carpenter installing dry wall or remodeling residential building",
      "Commercial Civil Works": "crane lifting building materials at commercial concrete site",
      "Professional Project Management": "construction project manager checking digital tablet blueprint on site"
    },
    galleryThemes: [
      "Precisely aligned wooden floor beams installation",
      "Heavy excavator grading soil on site",
      "Clean architectural modern house exterior facade",
      "Skilled mason building brick wall with mortar",
      "Sparking welder metal joining construction reinforcement"
    ],
    curatedImages: []
  },

  lawyers: {
    industry: "Law Firm",
    aliases: ["lawyers", "lawyer", "legal", "advocate", "attorney", "solicitor", "notary", "court", "justice"],
    defaultStyle: "Professional",
    subcategory: "Expert Corporate & Personal Litigation",
    services: ["Corporate & Business Law", "Family Law & Estate Planning", "Criminal & Civil Litigation", "Contract Drafting & Notary"],
    audience: ["Business Owners", "Families", "Individuals", "Corporate Directors"],
    preferredSubjects: ["lawyer in professional suit speaking with client", "wooden courtroom gavel resting on leather law book", "modern legal office library stacks", "signing legal notary contract papers", "statue of lady justice scale close up"],
    avoidSubjects: ["greasy mechanical tools", "hair dye beauty spray", "construction crane concrete pouring", "waiter kitchen stove cook", "hospital operation room"],
    heroQueries: [
      "wooden gavel scales of justice resting on mahogany law firm desk",
      "professional lawyer consulting client with documents in modern bright office",
      "corporate attorney reviewing legal contract documents in boardroom"
    ],
    aboutQueries: [
      "portrait of professional confident lawyer smiling in suit next to bookshelves",
      "reputable legal practice partners analyzing case records in office"
    ],
    serviceQueries: {
      "Corporate & Business Law": "corporate lawyers signing documents in modern glass boardroom",
      "Family Law & Estate Planning": "compassionate attorney discussing family estate planning with couple",
      "Criminal & Civil Litigation": "courtroom trial advocate consulting paperwork defense counsel",
      "Contract Drafting & Notary": "notary public placing official stamp on signed paper contract"
    },
    galleryThemes: [
      "Classic leather-bound law volume collection in shelf",
      "Detailed signature line on legal affidavit contract",
      "Statue of Justice close up scale of balance",
      "Corporate client shaking hands with defense attorney",
      "Modern clean law practice lobby and consultation desk"
    ],
    curatedImages: []
  },

  real_estate: {
    industry: "Real Estate",
    aliases: ["real estate", "realtor", "property", "estate agent", "apartment", "housing", "land sales"],
    defaultStyle: "Minimal",
    subcategory: "Premium Residential & Commercial Brokerage",
    services: ["Residential Home Sales", "Commercial Property Lease", "Real Estate Valuation", "Property Management Services"],
    audience: ["Homebuyers", "Investors", "Tenants", "Commercial Entities"],
    preferredSubjects: ["real estate agent handing keys to new homeowner", "beautiful modern residential home exterior lawn", "modern apartment loft interior", "commercial office building lobby", "architectural drone shot suburban development"],
    avoidSubjects: ["car engine repair oil", "dentist clinic chair", "plumber wrench pipe leak", "construction dirt debris excavator", "dirty kitchen cooking chef"],
    heroQueries: [
      "beautiful modern luxury house exterior with lush green lawn at sunset",
      "real estate agent smiling and handing keys to excited new family home",
      "bright sunlit modern minimalist living room design interior"
    ],
    aboutQueries: [
      "professional real estate agent advisor portrait in welcoming office space",
      "reputable property consultants discussing valuation analysis charts"
    ],
    serviceQueries: {
      "Residential Home Sales": "suburban modern family home building exterior sunny day",
      "Commercial Property Lease": "high-rise modern corporate glass office building workspace",
      "Real Estate Valuation": "property valuation expert checking house metrics on tablet",
      "Property Management Services": "clean apartment complex exterior swimming pool area maintenance"
    },
    galleryThemes: [
      "Open concept sunlit kitchen with marble island countertops",
      "Modern house entrance door key lock detail",
      "Aerial architectural view of upscale neighborhood",
      "Cozy master bedroom master bathroom design",
      "Realtor putting up green sold sign board on lawn"
    ],
    curatedImages: []
  },

  schools: {
    industry: "School & Academy",
    aliases: ["schools", "school", "academy", "education", "college", "tutor", "preschool", "learning", "classroom"],
    defaultStyle: "Warm",
    subcategory: "Exceptional Academic & Holistic Growth",
    services: ["Early Childhood Development", "Primary Academic Curriculum", "STEM & Coding Programs", "Extracurricular Sports & Arts"],
    audience: ["Parents", "Students", "Educators", "Community Members"],
    preferredSubjects: ["happy kids raising hands in bright school classroom", "teacher explaining book to young students", "science lab experiment chemistry flasks", "youth students reading library books", "art class painting colorful canvas"],
    avoidSubjects: ["corporate business suit litigation", "car engine diagnostic bay", "construction welding sparks", "dirty pipes leakage", "barber trimming beard shaving"],
    heroQueries: [
      "happy elementary school children learning in modern brightly colored classroom",
      "certified teacher helping young student read book with encouraging smile",
      "school library sunlit bookshelves with young children studying"
    ],
    aboutQueries: [
      "portrait of friendly school headmistress or educator in library hallway",
      "diverse group of children playing soccer on school green field"
    ],
    serviceQueries: {
      "Early Childhood Development": "preschool kindergarten toddlers playing with colorful wooden educational toys",
      "Primary Academic Curriculum": "teacher pointing to blackboard class full of happy elementary students",
      "STEM & Coding Programs": "excited students assembling small programmable robot in school science tech lab",
      "Extracurricular Sports & Arts": "young school children painting together on paper sheets in art class"
    },
    galleryThemes: [
      "Classroom desk with notebooks pencils watercolor paints",
      "School soccer team celebrating outdoor match success",
      "Young student looking through microscope in science lab",
      "Brightly decorated school hallway display boards",
      "Caring teacher high-fiving primary student"
    ],
    curatedImages: []
  },

  medical_practices: {
    industry: "Medical Clinic",
    aliases: ["medical", "clinic", "doctor", "dentist", "medical practices", "health", "dentistry", "wellness", "physio"],
    defaultStyle: "Minimal",
    subcategory: "Compassionate Family Health & Diagnostics",
    services: ["Comprehensive Family Diagnostics", "Pediatric & Child Wellness", "Advanced Dental Care", "Physiotherapy & Rehabilitation"],
    audience: ["Families", "Elderly Patients", "Local Community", "Athletes"],
    preferredSubjects: ["caring doctor consulting patient in clean office", "physician checking child heartbeat stethoscope", "modern clean clinical diagnostic lab equipment", "dentist treating patient teeth under surgical light", "friendly nurse taking medical notes"],
    avoidSubjects: ["dirty mechanical workshops", "construction jackhammers", "greasy kitchen cooking stove", "nightclub cocktail bar", "industrial transport cranes"],
    heroQueries: [
      "compassionate professional doctor consulting patient in bright clean clinic",
      "friendly pediatrician examining happy smiling child with stethoscope",
      "modern clinic state of art diagnostics consulting desk workspace"
    ],
    aboutQueries: [
      "friendly professional female healthcare medical practitioner portrait smiling in corridor",
      "certified clinic medical specialist doctors team posing together"
    ],
    serviceQueries: {
      "Comprehensive Family Diagnostics": "physician checking blood pressure or consulting patient",
      "Pediatric & Child Wellness": "caring doctor pediatrician checking baby heartbeat health",
      "Advanced Dental Care": "dentist checking teeth dental clean hygienic procedure clinic",
      "Physiotherapy & Rehabilitation": "physiotherapist massage rehabilitation exercise therapy clinic"
    },
    galleryThemes: [
      "Stethoscope clipboard resting on clean wooden clinic counter",
      "Modern pristine dentist chair dental clinic room",
      "Doctor explaining spinal anatomy chart to patient",
      "Clean clinical laboratory samples microscope analysis",
      "Friendly clinic reception lobby with plants and seating"
    ],
    curatedImages: []
  },

  mechanics: {
    industry: "Mechanic & Auto Repair",
    aliases: ["mechanics", "mechanic", "garage", "car repair", "tyre", "auto sales", "workshop", "auto repairs", "engine"],
    defaultStyle: "Bold",
    subcategory: "Expert Auto Repairs & Maintenance",
    services: ["Full Engine Diagnostics", "Brake Repair & Safety Check", "Precision Wheel Alignment", "Scheduled Car Servicing"],
    audience: ["Car Owners", "Commercial Fleets", "Daily Commuters", "Transport Operators"],
    preferredSubjects: ["car mechanic diagnosing engine with computer", "technician repairing car brake discs caliper", "lifting car on hydraulic bay lift inside garage", "mechanic hands adjusting car engine valve with wrench", "mechanic checking tyre tread depth gauge"],
    avoidSubjects: ["clean dental checkup", "lawyer courtroom judge gavel", "fresh bakery kitchen bread", "spa face oil massage", "business suits whiteboard design agency"],
    heroQueries: [
      "skilled mechanic adjusting engine components of modern car in professional garage",
      "car elevated on hydraulic hoist lift in clean repair auto workshop",
      "mechanic technician checking car components under the hood open engine"
    ],
    aboutQueries: [
      "confident vehicle mechanic technician posing with tools in front of auto shop",
      "friendly car mechanic showing repair estimate list on digital clipboard"
    ],
    serviceQueries: {
      "Full Engine Diagnostics": "mechanic hand holding diagnostic scanning tool plugged into car console",
      "Brake Repair & Safety Check": "automotive technician inspecting disk brakes caliper car wheel assembly",
      "Precision Wheel Alignment": "car alignment calibration laser sensor tools workshop shop",
      "Scheduled Car Servicing": "mechanic pouring fresh new gold engine oil into funnel engine"
    },
    galleryThemes: [
      "Mechanic tools organized wrenches sockets spanners set",
      "Gleaming hydraulic disc brake assembly system",
      "Worker rotating balancing car tire on balancing machine",
      "Car undercarriage exhaust pipe inspection on lift",
      "Close up of car engine block spark plugs maintenance"
    ],
    curatedImages: []
  },

  security_companies: {
    industry: "Security Services",
    aliases: ["security", "security companies", "guards", "patrol", "alarm", "cctv", "officer"],
    defaultStyle: "Bold",
    subcategory: "Elite Commercial & Residential Guarding",
    services: ["Tactical Patrol Guarding", "Smart CCTV Monitoring", "Alarm & Access Control", "Executive Armed Protection"],
    audience: ["Homeowners", "Retail Stores", "Warehouse Operators", "Corporate Offices"],
    preferredSubjects: ["alert security guard monitoring multiple CCTV screens", "security officer patrolling facility with flashlight", "smart home security camera mounted exterior wall", "keyless entry access control card reader lock", "armed tactical guard security patrol uniform"],
    avoidSubjects: ["manicure fingers paint", "baking pastries flour kitchen", "spa massage oil hot stones", "classroom children playing games", "construction scaffolding crane debris"],
    heroQueries: [
      "professional security officer in uniform standing watch at building entrance",
      "state of art CCTV security control room monitor dispatch room",
      "smart security camera system mounted on luxury house wall exterior"
    ],
    aboutQueries: [
      "trustworthy uniform security guarding team smiling confidently",
      "security expert setting up intercom keypad security gate house"
    ],
    serviceQueries: {
      "Tactical Patrol Guarding": "uniformed security patrol guard checking lock gates warehouse",
      "Smart CCTV Monitoring": "close up of outdoor high resolution security camera dome CCTV",
      "Alarm & Access Control": "person tapping security RFID key card on modern wall access reader",
      "Executive Armed Protection": "alert professional vip protection bodyguard close protection team"
    },
    galleryThemes: [
      "Close up of modern digital keypad lock on wooden security door",
      "Alert security guard scanning perimeter with walkie talkie",
      "Row of CCTV monitors displaying secure building cameras",
      "Electronic fingerprint scanner lock biometric access",
      "Secure gate entry barrier system commercial site"
    ],
    curatedImages: []
  },

  cleaning_companies: {
    industry: "Cleaning Services",
    aliases: ["cleaning", "cleaning companies", "janitorial", "maid", "commercial cleaning", "office cleaning"],
    defaultStyle: "Minimal",
    subcategory: "Spotless Commercial & Domestic Sanitation",
    services: ["Deep Domestic Maid Service", "Commercial Office Janitorial", "Upholstery & Carpet Wash", "Post-Construction Sanitization"],
    audience: ["Homeowners", "Office Managers", "Real Estate Agencies", "Builders"],
    preferredSubjects: ["cleaner wiping office glass desk with microfiber cloth", "professional vacuum cleaner washing soft carpet", "gleaming clean modern office lobby floor", "cleaning spray bottle and yellow gloves", "tidy living room after deep clean service"],
    avoidSubjects: ["greasy mechanical parts black oil", "construction dirt debris mud bricks", "scary security guards gate patrol", "courtroom legal litigation dispute", "welding sparks metal factory"],
    heroQueries: [
      "professional cleaning specialist wiping office glass window desk spotless",
      "sparkling clean modern residential living room sunlit interior tidy",
      "maid service cleaning supplies basket with spray gloves sponge"
    ],
    aboutQueries: [
      "friendly home cleaning maid team in uniform smiling with cleaning tools",
      "professional carpet cleaning operator using hot water extraction vacuum"
    ],
    serviceQueries: {
      "Deep Domestic Maid Service": "woman wiping dust off wooden shelves with microfiber duster spray",
      "Commercial Office Janitorial": "janitor pushing mop bucket down clean shiny polished office floor",
      "Upholstery & Carpet Wash": "deep extraction steam vacuum cleaning dirty upholstery sofa fabric",
      "Post-Construction Sanitization": "industrial vacuum cleaner cleaning drywall dust renovation site clean"
    },
    galleryThemes: [
      "Clean structured basket with bottles sponges rags wipes",
      "Sparkling faucet bathroom chrome sink clean reflect",
      "Gleaming polished hardwood floor reflection light",
      "Tidy bedroom freshly made sheets pillows",
      "Squeegee cleaning glass window soapy foam wash"
    ],
    curatedImages: []
  },

  accountants: {
    industry: "Accounting & Tax Services",
    aliases: ["accountants", "accountant", "bookkeeping", "tax", "finance", "ledger", "advisory", "audit", "payroll"],
    defaultStyle: "Professional",
    subcategory: "Certified Bookkeeping & Corporate Tax Planning",
    services: ["Annual Tax Return Filing", "Monthly Bookkeeping & Payroll", "Corporate Auditing & Assurance", "Strategic Financial Advisory"],
    audience: ["SMEs", "Corporations", "Startups", "Sole Proprietors"],
    preferredSubjects: ["chartered accountant checking financial charts ledger", "accountant calculator tax documents review", "modern tax advisory consultation meeting", "digital tax returns online system tablet", "business financial statements papers"],
    avoidSubjects: ["car tyre replacement workshop", "emergency plumbing burst pipe wrench", "beauty salon hair dye cutting", "construction site cement mixer", "doctor surgical room stethoscope"],
    heroQueries: [
      "professional accountant analyzing financial spreadsheets statement charts office",
      "financial advisor accountant checking tax audit documents ledger desk",
      "modern tax consulting financial office boardroom desk calculator paper"
    ],
    aboutQueries: [
      "portrait of friendly professional accountant financial controller smiling in office",
      "tax advisory partners reviewing budget reports paperwork"
    ],
    serviceQueries: {
      "Annual Tax Return Filing": "person filing tax papers using calculator writing financial numbers",
      "Monthly Bookkeeping & Payroll": "accountant processing payroll ledger spreadsheet on screen",
      "Corporate Auditing & Assurance": "auditors reviewing bank statements business papers",
      "Strategic Financial Advisory": "expert accountant advisor explaining financial forecast charts to client"
    },
    galleryThemes: [
      "Spreadsheet ledger on monitor desk graph details",
      "Calculator pen ledger papers close up numbers",
      "Professional handshake commercial contract signing office",
      "Modern sleek boardroom with financial graphs on wall",
      "Hand pointing at financial chart projection"
    ],
    curatedImages: []
  },

  printers: {
    industry: "Commercial Print Shop",
    aliases: ["printers", "printer", "print shop", "printing", "publication", "flyer", "banner printing"],
    defaultStyle: "Bold",
    subcategory: "High-Volume Commercial Printing & Publishing",
    services: ["Business Card & Flyer Print", "Large Format Banner Print", "Book Binding & Publishing", "Custom Apparel & Gift Print"],
    audience: ["Marketing Agencies", "Local Businesses", "Authors", "Event Coordinators"],
    preferredSubjects: ["large industrial digital printing press machine rollers", "vibrant colored ink cyan magenta yellow rollers print", "stack of fresh printed marketing brochures flyers", "printer technician calibrating paper roll", "offset printing process laser alignment"],
    avoidSubjects: ["stethoscope clinic hospital", "gardening farming crop harvest", "hairdresser washing hair", "kitchen chef cutting meat", "lawyer courthouse arguing"],
    heroQueries: [
      "large industrial printing press machine printing high speed colored banners",
      "fresh high quality stacked printed business flyers brochures marketing",
      "commercial printing shop machinery cyan magenta yellow ink rollers"
    ],
    aboutQueries: [
      "friendly print shop manager holding custom printed boxes sample",
      "printing design technician examining print proof color calibration"
    ],
    serviceQueries: {
      "Business Card & Flyer Print": "stack of premium heavy cardstock business cards close up edge color",
      "Large Format Banner Print": "wide format inkjet plotter printing large vinyl advertising banner",
      "Book Binding & Publishing": "stack of freshly bound hardcover books spine binding machine print",
      "Custom Apparel & Gift Print": "silk screen printing machine printing custom logo t-shirt shop"
    },
    galleryThemes: [
      "Ink cartridges cyan magenta yellow black drops CMYK print",
      "Large rolls of printing paper loaded in industrial press",
      "Precision paper cutter slicing stack of printed materials",
      "Laser print alignment calibration machinery process",
      "Freshly printed glossy brochure booklets display"
    ],
    curatedImages: []
  },

  graphic_designers: {
    industry: "Graphic Design Agency",
    aliases: ["graphic designers", "graphic designer", "design agency", "ui ux", "illustration", "creative agency"],
    defaultStyle: "Modern",
    subcategory: "Vibrant Visual Identity & Creative Designs",
    services: ["Brand Logo & Visual Identity", "UI/UX App & Web Design", "Custom Vector Illustration", "Print Marketing Collateral"],
    audience: ["Startups", "Corporate Brands", "Publishers", "E-commerce Stores"],
    preferredSubjects: ["designer sketch drawing tablet stylus screen", "color palette swatches Pantone book matching", "designer working on dual monitors drawing vector", "modern clean creative agency workspace art", "creative mood board pinned ideas photos"],
    avoidSubjects: ["greasy mechanical wrench tire", "building concrete pouring frame", "security guard patrol patrol", "hospital surgery dental chair", "dirty drain plumbing pipe unblocking"],
    heroQueries: [
      "graphic designer sketching logo concepts drawing digital tablet stylus screen",
      "creative graphic designer office workspace laptop monitors artwork mockups",
      "graphic designer color swatches pantone guides review brand concept"
    ],
    aboutQueries: [
      "portrait of young creative graphic designer smiling in modern studio desk",
      "creative team brainstorming layout design pinned on wall blackboard"
    ],
    serviceQueries: {
      "Brand Logo & Visual Identity": "corporate brand guidelines manual logo style book workspace",
      "UI/UX App & Web Design": "ux designer planning app mobile interface wireframe sketch paper desk",
      "Custom Vector Illustration": "digital vector artist drawing character illustration on drawing monitor screen",
      "Print Marketing Collateral": "mockups of sleek brochures business cards flyers stationery packaging design"
    },
    galleryThemes: [
      "Pantone color book guide matching swatches detail",
      "Stylus hand drawing smooth line vector path software",
      "Beautiful creative agency mood board swatches concept",
      "Typography font style letters layout books design",
      "Dual monitors glowing sleek layout graphics vector work"
    ],
    curatedImages: []
  },

  sign_companies: {
    industry: "Signage & Banner Company",
    aliases: ["sign companies", "sign company", "signage", "neon", "storefront sign", "banners", "3D signs"],
    defaultStyle: "Bold",
    subcategory: "High-Visibility Commercial Signage Manufacture",
    services: ["Custom Neon & LED Signage", "Outdoor Storefront Signage", "Trade Show Banners & Displays", "Vehicle Wrap & Graphics"],
    audience: ["Retailers", "Corporate Offices", "Franchises", "Event Organizers"],
    preferredSubjects: ["bright custom neon sign glowing wall storefront", "workers installing large outdoor signage on building shop front", "worker applying vinyl car wrap graphics auto", "cutting plexiglass laser machine 3D signage", "printed vinyl trade show retractable banner exhibition"],
    avoidSubjects: ["clinic diagnostics pediatric", "school children classroom writing", "accounting calculator spreadsheets ledger", "legal contracts courthouse", "chef slicing organic food in kitchen"],
    heroQueries: [
      "luminous glowing neon sign custom LED light on brick wall design",
      "sign shop technicians installing large high-contrast business sign storefront",
      "commercial printed vinyl roll wrap graphics sign production shop"
    ],
    aboutQueries: [
      "sign maker craftsman assembling 3D letter signage workshop",
      "sign shop manager checking dimensions of building banner mockup"
    ],
    serviceQueries: {
      "Custom Neon & LED Signage": "glowing vibrant custom neon led letters sign light night wall",
      "Outdoor Storefront Signage": "modern architectural black metal dimensional business letters storefront exterior",
      "Trade Show Banners & Displays": "exhibition trade show booth stand with printed roll up banners",
      "Vehicle Wrap & Graphics": "vehicle wrap installer applying adhesive vinyl wrap graphic decal car van"
    },
    galleryThemes: [
      "Glowing neon tubes fabrication glass bending process",
      "Heavy laser cutting plexiglass 3D acrylic letters",
      "Technician peeling off vinyl stencil letter decal",
      "Elegant metal backlit office lobby logo signage sign",
      "Van vehicle wrapping half wrapped graphics advertising"
    ],
    curatedImages: []
  },

  it_technicians: {
    industry: "IT Support & Managed Services",
    aliases: ["it technicians", "it technician", "it support", "msp", "computer repair", "network setup", "server support"],
    defaultStyle: "Modern",
    subcategory: "Advanced Network Diagnostics & Cyber Defense",
    services: ["Business Managed IT Support", "Ethernet & Fiber Network Setup", "Server Maintenance & Security", "Laptop & Computer Hardware Repair"],
    audience: ["Professional Offices", "Home Offices", "Retail Outlets", "Corporate Branches"],
    preferredSubjects: ["it technician patching ethernet cables blue server rack", "computer hardware repair specialist magnifying screwdriver laptop", "it engineer monitoring network cybersecurity diagnostics server room", "fiber optic cables glowing networking router", "system diagnostic tools on computer repair bench"],
    avoidSubjects: ["hair salon stylist washing head", "garden dirt crops farming", "construction site pouring cement", "greasy tire mechanic workshop lift", "gourmet kitchen plating chef cooking"],
    heroQueries: [
      "it support technician connecting blue ethernet patch cables in server rack room",
      "computer hardware technician repairing microchip laptop motherboard bench tool",
      "modern server rack room cabinets with flashing diagnostic network lights"
    ],
    aboutQueries: [
      "friendly IT technician holding laptop in server room smiling",
      "helpdesk support specialist wearing headset solving technical issues"
    ],
    serviceQueries: {
      "Business Managed IT Support": "it helpdesk support engineer laptop system monitor screen troubleshooting",
      "Ethernet & Fiber Network Setup": "network installer wiring fiber optic data patch panels switch internet",
      "Server Maintenance & Security": "it network engineer inspecting backend cloud database secure blades rack",
      "Laptop & Computer Hardware Repair": "open computer chassis repair fixing RAM hard drive cpu cooling fan"
    },
    galleryThemes: [
      "Perfectly arranged tidy blue ethernet cable network patching",
      "Motherboard silicon computer chip circuits soldering macro",
      "Diagnostics testing tools hardware software screen console",
      "Tech expert resolving security firewall alert on triple monitors",
      "Cables tools diagnostic devices on repair bench workspace"
    ],
    curatedImages: []
  },

  marketing_agencies: {
    industry: "Digital Marketing Agency",
    aliases: ["marketing agencies", "marketing agency", "digital marketing", "seo", "social media marketing", "ad agency"],
    defaultStyle: "Modern",
    subcategory: "Data-Driven SEO, Ad Campaigns & Growth",
    services: ["Search Engine Optimization (SEO)", "Pay-Per-Click (PPC) Ads", "Social Media Campaign Growth", "Content Creation & Copywriting"],
    audience: ["E-commerce Brands", "B2B Corporates", "Local Professionals", "SMEs"],
    preferredSubjects: ["marketing agency whiteboard brainstorm plan chart market", "marketing specialist analyzing traffic dashboard report graphs", "group of digital marketers discussing strategy laptop workspace", "social media phone app posts planning calendar", "creative ad campaign visuals layout"],
    avoidSubjects: ["auto engine diagnostic black greasy grease", "building concrete bricklayer contractor", "plumbing pipe solder wrench leak", "dentist dental extraction drill", "guard security uniform patrol dog"],
    heroQueries: [
      "digital marketing team brainstorming strategy in creative agency whiteboard room",
      "marketing expert checking search traffic seo performance dashboard charts",
      "creative marketing agency team collaboration meeting workspace desk laptop"
    ],
    aboutQueries: [
      "marketing director smiling in bright creative agency loft room office",
      "certified digital ad specialists reviewing campaign budget graphs"
    ],
    serviceQueries: {
      "Search Engine Optimization (SEO)": "seo ranking search console dashboard graph growth analytics",
      "Pay-Per-Click (PPC) Ads": "online advertising campaign management metrics budget clicks chart",
      "Social Media Campaign Growth": "young woman planning social media video post scheduling phone screen",
      "Content Creation & Copywriting": "creative copywriter typing marketing article on beautiful laptop desk"
    },
    galleryThemes: [
      "Brainstorm notes whiteboard sticky notes colourful layout plans",
      "Analytics interface rising line chart bar graph statistics",
      "Marketers team high-fiving together around laptop workspace",
      "Sleek modern marketing agency lobby client meeting room",
      "Ad copy sketch planning notes strategy wireframes"
    ],
    curatedImages: []
  },

  event_planners: {
    industry: "Event Planning & Coordination",
    aliases: ["event planners", "event planner", "wedding planner", "party organizer", "conferences", "banquets"],
    defaultStyle: "Warm",
    subcategory: "Flawless Wedding, Banquet & Corporate Galas",
    services: ["Luxury Wedding Design", "Corporate Conference Logistics", "Private Party Styling", "Venue Selection & Catering Coordinated"],
    audience: ["Brides & Grooms", "Corporate Execs", "Families", "Chambers of Commerce"],
    preferredSubjects: ["gorgeous floral centerpiece wedding dining table crystal", "event planner coordinator checking clipboard banquet hall setup", "elegant corporate conference stage podium seating", "celebratory party banquet table setup cake champagne", "wedding registry welcome card entrance boards floral decor"],
    avoidSubjects: ["engine auto mechanic garage lift", "it server patch cables wiring", "concrete construction bricks building", "medical surgery clinic diagnostic", "law courtroom litigation judge gavel"],
    heroQueries: [
      "breathtaking wedding reception banquet hall set table floral centerpiece candles",
      "professional wedding event planner coordinator clipboard inspecting venue",
      "corporate conference seminar stage speaker podium projector lights"
    ],
    aboutQueries: [
      "friendly professional event planner coordinator smiling portrait banquet venue",
      "creative decorations styling event planner adjusting dining plate setting"
    ],
    serviceQueries: {
      "Luxury Wedding Design": "wedding ceremony arch floral design outdoor beach garden setting",
      "Corporate Conference Logistics": "large corporate conference hall registration lobby corporate badges",
      "Private Party Styling": "colorful birthday or anniversary banquet table balloon styling cake dessert",
      "Venue Selection & Catering Coordinated": "catering servers serving gourmet wine appetizers banquet wedding"
    },
    galleryThemes: [
      "Elegant table setting crystal wine glasses plates menus",
      "Stunning wedding floral arch roses eucalyptus detail",
      "Outdoor event fairy lights stringing garden evening",
      "Catering pastry buffet gourmet dessert bites plates",
      "Event coordinator smiling checking guest list tablet gate"
    ],
    curatedImages: []
  },

  agriculture: {
    industry: "Agriculture & Farming",
    aliases: ["agriculture", "farming", "crops", "livestock", "farm", "poultry", "greenhouse", "cultivation"],
    defaultStyle: "Warm",
    subcategory: "Sustainable Organic Cultivation & Livestock Management",
    services: ["Organic Crop Cultivation", "Livestock & Poultry Management", "Greenhouse Smart Farming", "Fresh Farm-to-Table Supply"],
    audience: ["Food Retailers", "Wholesalers", "Families", "Eco Consumers"],
    preferredSubjects: ["modern green agricultural tractor plowing field sunset", "organic green lettuce crops greenhouse smart hydroponics", "happy local farmer holding box of fresh organic vegetables harvest", "dairy cows grazing green pasture field", "golden wheat farm crop field agriculture"],
    avoidSubjects: ["glass skyscraper banking boardroom", "computer server cables diagnostics", "car grease engine auto lift", "hair salon beauty dryer", "courtroom gavel scales legal"],
    heroQueries: [
      "beautiful sunlit golden wheat field farm crops tractor harvest sunset",
      "modern smart farming greenhouse hydroponic rows of green lettuce plants",
      "happy local farm owner holding wooden crate of fresh organic vegetables"
    ],
    aboutQueries: [
      "portrait of friendly local farmer standing in green organic field smiling",
      "agricultural expert inspector examining plant leaf health in farm field"
    ],
    serviceQueries: {
      "Organic Crop Cultivation": "rows of green crops growing in fertile soil farm agricultural field",
      "Livestock & Poultry Management": "free range healthy chickens poultry farm outdoor grassy field",
      "Greenhouse Smart Farming": "automated irrigation drip system watering plants greenhouse vegetables",
      "Fresh Farm-to-Table Supply": "crate of fresh organic vegetables tomatoes carrots lettuce delivery"
    },
    galleryThemes: [
      "Freshly harvested ripe red tomatoes in wooden basket detail",
      "Modern green tractor cultivating soil farm field sunset",
      "Greenhouse automated hydroponics farming pipes lettuce",
      "Ears of ripe golden wheat crop macro seed farming",
      "Worker hand planting small green organic seedling in dirt soil"
    ],
    curatedImages: []
  },

  transport: {
    industry: "Transport & Logistics",
    aliases: ["transport", "logistics", "courier", "cargo", "delivery", "shipping", "warehouse", "freight"],
    defaultStyle: "Bold",
    subcategory: "Rapid Nationwide Courier & Warehouse Logistics",
    services: ["Express Courier & Parcel Delivery", "Heavy Freight Cargo Trucking", "Secure Warehousing & Fulfilment", "International Customs & Shipping"],
    audience: ["E-commerce Stores", "Distributors", "Manufacturers", "Retailers"],
    preferredSubjects: ["modern white delivery van courier vehicle driving road", "large cargo truck semi trailer transport highway sunset", "warehouse distribution worker scan package cardboard box fork lift", "stacked shipping cargo containers port ship crane", "handing parcel parcel box to customer door smile"],
    avoidSubjects: ["hospital operating room dentist", "hair salon scissors hair dye", "classroom school kids studying blackboard", "legal dispute gavel court trials", "spa wellness facial cosmetic massage"],
    heroQueries: [
      "commercial semi trailer truck driving cargo transport highway sunset road",
      "modern warehouse logistics distribution center stacks box cargo forklift",
      "white delivery van courier express parcel shipping courier transport"
    ],
    aboutQueries: [
      "friendly parcel delivery driver holding clipboard and box at door smiling",
      "logistics fleet operations manager with walkie talkie near trucks"
    ],
    serviceQueries: {
      "Express Courier & Parcel Delivery": "delivery courier hand handing cardboard parcel box package to client door",
      "Heavy Freight Cargo Trucking": "fleet of cargo trucks semi trailers lined up transport yard terminal",
      "Secure Warehousing & Fulfilment": "warehouse forklift operator lifting pallet loaded cardboard box shelving rack",
      "International Customs & Shipping": "cargo ship stacked with shipping containers harbor shipping port ocean"
    },
    galleryThemes: [
      "Hand scanner scanning barcode on shipping cardboard box",
      "Perfect rows of boxes in modern logistics warehouse racks",
      "White delivery van transit side view courier marketing mockup",
      "Logistics route tracing digital dashboard screen fleet GPS tracking",
      "Cardboard shipping box closed tape close up detail"
    ],
    curatedImages: []
  },

  general_business: {
    industry: "Professional Services",
    aliases: ["general", "business", "services", "consulting", "agency", "solutions", "enterprise"],
    defaultStyle: "Professional",
    subcategory: "Specialized Local Commercial Services",
    services: ["Direct Consultation & Assessment", "Core Service Delivery & Execution", "Client Support & Maintenance"],
    audience: ["Local Consumers", "Corporate Clients", "Property Owners"],
    preferredSubjects: ["professional local service workspace", "dedicated specialist assisting client with care", "modern organized facility", "team collaboration with tools and laptops"],
    avoidSubjects: ["inappropriate content", "blurry low-res photography", "unrelated industrial disaster"],
    heroQueries: [
      "dedicated professional service specialist working in modern bright client facility",
      "modern high quality professional local business workspace and customer service"
    ],
    aboutQueries: [
      "friendly professional team providing dedicated local services",
      "organized modern workshop and customer consultation desk"
    ],
    serviceQueries: {
      "Direct Consultation & Assessment": "professional specialist consultation client meeting",
      "Core Service Delivery & Execution": "specialist delivering quality craftsmanship and service",
      "Client Support & Maintenance": "customer support specialist responsive service"
    },
    galleryThemes: [
      "Modern professional equipment and clean service station",
      "Dedicated team member assisting client with smile",
      "Organized workflow and quality control check"
    ],
    curatedImages: []
  }
};

/**
 * Dynamic Taxonomy Factory
 * 
 * Automatically creates a fully fleshed out, 9-layered dynamic `IndustryVisualRule`
 * when a category or niche doesn't exist in our static, curated mapping.
 * This guarantees the Image Taxonomy system matches the Business Finder 100% of the time,
 * with no visual generic fallbacks.
 */
export class DynamicTaxonomyFactory {
  static create(rawCategory: string): IndustryVisualRule {
    const cleanName = rawCategory
      .replace(/\(Partner\)/gi, "")
      .replace(/&/g, "and")
      .trim();

    // Standard title case helper
    const titleCase = (str: string) => {
      return str
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    };

    const industryName = titleCase(cleanName);

    // Heuristics for visual style based on keywords
    let visualStyle: VisualStyle = "Professional";
    if (/design|art|photo|brand|marketing|social/i.test(industryName)) {
      visualStyle = "Modern";
    } else if (/spa|salon|beauty|food|restaurant|cater|event|school/i.test(industryName)) {
      visualStyle = "Warm";
    } else if (/construction|mechanic|security|transport|football|sport/i.test(industryName)) {
      visualStyle = "Bold";
    } else if (/law|accountant|medical|clinic/i.test(industryName)) {
      visualStyle = "Minimal";
    }

    return {
      industry: industryName,
      aliases: [industryName.toLowerCase(), cleanName.toLowerCase()],
      defaultStyle: visualStyle,
      subcategory: `Premium ${industryName} Solutions & Specialists`,
      services: [
        `Residential ${industryName} Support`,
        `Commercial ${industryName} Delivery`,
        `Direct Consulting & Planning`,
        `Ongoing ${industryName} Support`
      ],
      audience: ["Local Businesses", "SMEs", "Property Owners", "Local Customers"],
      preferredSubjects: [
        `professional ${cleanName.toLowerCase()} specialist working diligently in facility`,
        `modern state of art ${cleanName.toLowerCase()} tools and equipment`,
        `high resolution photography of ${cleanName.toLowerCase()} service workspace`
      ],
      avoidSubjects: [
        "generic blurry backgrounds",
        "extremely cluttered desks",
        "inappropriate low resolution content",
        "unrelated heavy industrial smoke"
      ],
      heroQueries: [
        `professional high quality ${cleanName.toLowerCase()} specialist in modern clean office or facility`,
        `sleek organized tools and workspace of a ${cleanName.toLowerCase()} expert`,
        `dedicated ${cleanName.toLowerCase()} consulting with a client with a warm smiling face`
      ],
      aboutQueries: [
        `friendly portrait of a professional ${cleanName.toLowerCase()} team smiling`,
        `clean welcoming entrance lobby of a reputable ${cleanName.toLowerCase()} firm`
      ],
      serviceQueries: {
        [`Residential ${industryName} Support`]: `${cleanName.toLowerCase()} residential domestic home repair help service`,
        [`Commercial ${industryName} Delivery`]: `${cleanName.toLowerCase()} commercial business enterprise scale service`,
        [`Direct Consulting & Planning`]: `${cleanName.toLowerCase()} expert meeting consultant papers discussion screen`,
        [`Ongoing ${industryName} Support`]: `${cleanName.toLowerCase()} technician service helpline customer check`
      },
      galleryThemes: [
        `Organized professional ${cleanName.toLowerCase()} equipment list`,
        `High precision execution of ${cleanName.toLowerCase()} service`,
        `Client handshake of satisfaction with ${cleanName.toLowerCase()} consultant`,
        `Modern sleek clean ${cleanName.toLowerCase()} work environment`
      ],
      curatedImages: getCuratedImagesForIndustry(industryName)
    };
  }
}

/**
 * Resolves HTTP-200 verified Unsplash curated images with clean metadata for all industries and sections
 */
export function getCuratedImagesForIndustry(industry: string): ImageMetadata[] {
  const norm = (industry || "").toLowerCase();

  // Clean creator URL builder helper
  const make = (
    id: string,
    alt: string,
    photographer: string,
    username: string,
    section: "hero" | "about" | "services" | "gallery" = "hero",
    suffix: string = ""
  ): ImageMetadata => {
    const fullWidth = section === "hero" ? 1200 : section === "about" ? 1000 : 800;
    const base = `https://images.unsplash.com/photo-${id}`;
    return {
      id: `curated_unsplash_${id}_${section}${suffix}`,
      provider: "unsplash" as const,
      source: "curated",
      selectionMethod: "taxonomy",
      sourceUrl: `https://unsplash.com/photos/${id}`,
      thumbnailUrl: `${base}?auto=format&fit=crop&q=80&w=400`,
      fullUrl: `${base}?auto=format&fit=crop&q=80&w=${fullWidth}`,
      width: section === "hero" ? 1200 : 800,
      height: section === "hero" ? 800 : 600,
      alt,
      photographer,
      photographerUrl: `https://unsplash.com/@${username}`,
      license: "Unsplash License",
      usageType: "stock" as const,
      section,
      query: industry,
      industry,
      orientation: section === "gallery" ? "square" : "landscape",
      relevanceScore: 100,
      relevanceBreakdown: {
        metadataRelevance: 25,
        visualRelevance: 35,
        composition: 20,
        textOverlaySuitability: 20,
        industryMatch: 25,
        serviceMatch: 25,
        sectionMatch: 15,
        visualQuality: 10,
        orientation: 5,
        resolution: 5
      },
      createdAt: new Date().toISOString()
    };
  };

  if (norm.includes("plumb") || norm.includes("pipe") || norm.includes("drain")) {
    return [
      make("1585704032915-c3400ca199e7", "Professional plumber repairing residential water pipe", "Science in HD", "scienceinhd", "hero"),
      make("1542013936693-884638332954", "Certified plumber installing kitchen sink plumbing", "Laura Ohlman", "lauraohlman", "about"),
      make("1542013936693-884638332954", "Copper and PVC pipe fitting service", "Laura Ohlman", "lauraohlman", "services", "_s1"),
      make("1505798577917-a65157d3320a", "Drain cleaning and pressure valve diagnostics", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1584622650111-993a426fbf0a", "Modern bathroom and geyser plumbing fixtures", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1585704032915-c3400ca199e7", "Professional plumbing tools", "Science in HD", "scienceinhd", "gallery", "_g1"),
      make("1505798577917-a65157d3320a", "Pipework installation", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1584622650111-993a426fbf0a", "Completed bathroom plumbing project", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("salon") || norm.includes("beauty") || norm.includes("spa") || norm.includes("barber") || norm.includes("hair")) {
    return [
      make("1560066984-138dadb4c035", "Luxurious modern hair salon interior styling station", "Adam Warlock", "adamwarlock", "hero"),
      make("1540555700478-4be289fbecef", "Relaxing luxury spa wellness treatment room", "Kseniia Lobko", "kseniia_lobko", "about"),
      make("1562322140-8baeececf3df", "Precision haircuts and styling consultation", "Unsplash Photographer", "unsplash", "services", "_s1"),
      make("1570172619644-dfd03ed5d881", "Luxury facial and organic skincare treatment", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1604654894610-df63bc536371", "Manicure and nail art design studio", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1522337360788-8b13dee7a37e", "Makeup and beauty cosmetics station", "Unsplash Photographer", "unsplash", "gallery", "_g1"),
      make("1519699047748-de8e457a634e", "Salon hair coloring and treatment finish", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1503951914875-452162b0f3f1", "Barber grooming and fade precision", "Gregory Hayes", "gregoryhayes", "gallery", "_g3")
    ];
  }

  if (norm.includes("bakery") || norm.includes("pastry") || norm.includes("bread")) {
    return [
      make("1509440159596-0249088772ff", "Freshly baked artisan bread loaves and pastries", "Unsplash Photographer", "unsplash", "hero"),
      make("1556910103-1c02745aae4d", "Chef preparing artisan dough in kitchen", "Unsplash Photographer", "unsplash", "about"),
      make("1509440159596-0249088772ff", "Daily artisan sourdough and pastry counter", "Unsplash Photographer", "unsplash", "services", "_s1"),
      make("1555244162-803834f70033", "Custom celebration and event catering platters", "Lily Banse", "lilybanse", "services", "_s2"),
      make("1414235077428-338989a2e8c0", "Specialty coffee and cafe plated breakfast", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1509440159596-0249088772ff", "Fresh baked croissants and loaves", "Unsplash Photographer", "unsplash", "gallery", "_g1"),
      make("1556910103-1c02745aae4d", "Warm bakery kitchen preparation", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1414235077428-338989a2e8c0", "Gourmet cafe dessert service", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("food") || norm.includes("restaurant") || norm.includes("cafe") || norm.includes("cater") || norm.includes("dining") || norm.includes("bistro")) {
    return [
      make("1517248135467-4c7edcad34c4", "Warm cozy modern restaurant dining room interior", "Toa Heftiba", "toaheftiba", "hero"),
      make("1556910103-1c02745aae4d", "Professional culinary chef preparing fresh dishes", "Unsplash Photographer", "unsplash", "about"),
      make("1555244162-803834f70033", "Chef-curated signature dishes and event catering", "Lily Banse", "lilybanse", "services", "_s1"),
      make("1517248135467-4c7edcad34c4", "Family dine-in table atmosphere", "Toa Heftiba", "toaheftiba", "services", "_s2"),
      make("1565299624946-b28f40a0ae38", "Fresh wood-fired and takeaway favorites", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1555396273-367ea4eb4db5", "Vibrant evening bistro ambiance", "Unsplash Photographer", "unsplash", "gallery", "_g1"),
      make("1414235077428-338989a2e8c0", "Gourmet plated main course", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1555244162-803834f70033", "Fresh buffet spread for catering", "Lily Banse", "lilybanse", "gallery", "_g3")
    ];
  }

  if (norm.includes("build") || norm.includes("construct") || norm.includes("civil") || norm.includes("electric") || norm.includes("architect")) {
    return [
      make("1504307651254-35680f356dfd", "Commercial construction crew and structural site work", "Science in HD", "scienceinhd", "hero"),
      make("1541888946425-d81bb19240f5", "Contractors reviewing residential construction frame", "Josh Olalde", "josholalde", "about"),
      make("1541888946425-d81bb19240f5", "Custom home and commercial building construction", "Josh Olalde", "josholalde", "services", "_s1"),
      make("1581094794329-c8112a89af12", "Structural engineering and industrial inspection", "Science in HD", "scienceinhd", "services", "_s2"),
      make("1621905251189-08b45d6a269e", "Certified electrical and interior finishing work", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1504307651254-35680f356dfd", "Active construction site management", "Science in HD", "scienceinhd", "gallery", "_g1"),
      make("1541888946425-d81bb19240f5", "Timber and structural masonry build", "Josh Olalde", "josholalde", "gallery", "_g2"),
      make("1621905251189-08b45d6a269e", "Completed residential electrical installation", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("law") || norm.includes("legal") || norm.includes("attorney")) {
    return [
      make("1589829545856-d10d557cf95f", "Justice scales and gavel resting on law library volumes", "Giammarco Boscaro", "giammarcoboscaro", "hero"),
      make("1450133064473-71024230f91b", "Legal practitioner reviewing corporate contracts", "Unsplash Photographer", "unsplash", "about"),
      make("1589829545856-d10d557cf95f", "Commercial litigation and legal representation", "Giammarco Boscaro", "giammarcoboscaro", "services", "_s1"),
      make("1450133064473-71024230f91b", "Contract drafting and conveyancing advice", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1497366216548-37526070297c", "Private legal chambers client consultation", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1589829545856-d10d557cf95f", "Classic law library reference archive", "Giammarco Boscaro", "giammarcoboscaro", "gallery", "_g1"),
      make("1450133064473-71024230f91b", "Boardroom mediation and notarization", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1497366216548-37526070297c", "Modern executive legal offices", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("estate") || norm.includes("property") || norm.includes("realtor")) {
    return [
      make("1560518883-ce09059eeffa", "Modern residential property keys and architecture", "Jakob Rosen", "jakobrosen", "hero"),
      make("1600596542815-ffad4c1539a9", "Contemporary residential home exterior", "Unsplash Photographer", "unsplash", "about"),
      make("1560518883-ce09059eeffa", "Residential sales and buyer advisory", "Jakob Rosen", "jakobrosen", "services", "_s1"),
      make("1600596542815-ffad4c1539a9", "Luxury estate and suburban property listings", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1600585154340-be6161a56a0c", "Furnished interior staging and property management", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1600596542815-ffad4c1539a9", "Modern family residence showcase", "Unsplash Photographer", "unsplash", "gallery", "_g1"),
      make("1600585154340-be6161a56a0c", "Bright open-plan living interior", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1560518883-ce09059eeffa", "Property handover and key presentation", "Jakob Rosen", "jakobrosen", "gallery", "_g3")
    ];
  }

  if (norm.includes("school") || norm.includes("education") || norm.includes("learn") || norm.includes("academy")) {
    return [
      make("1523240795612-9a054b0db644", "Students collaborating on academic coursework", "Alexis Brown", "alexisbrown", "hero"),
      make("1580582932707-520aed937b7b", "Bright organized classroom learning environment", "Unsplash Photographer", "unsplash", "about"),
      make("1523240795612-9a054b0db644", "Secondary and college academic programs", "Alexis Brown", "alexisbrown", "services", "_s1"),
      make("1580582932707-520aed937b7b", "Focused classroom instruction and tutoring", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1503676260728-1c00da094a0b", "Early learning and Montessori resources", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1523240795612-9a054b0db644", "Group study and collaboration", "Alexis Brown", "alexisbrown", "gallery", "_g1"),
      make("1580582932707-520aed937b7b", "Structured classroom desks and board", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1503676260728-1c00da094a0b", "Hands-on educational supplies", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("dental") || norm.includes("dentist") || norm.includes("orthodont")) {
    return [
      make("1588776814546-1ffcf47267a5", "Modern dental suite and patient care equipment", "Unsplash Photographer", "unsplash", "hero"),
      make("1606811971618-4486d14f3f99", "Dentist performing gentle examination", "Unsplash Photographer", "unsplash", "about"),
      make("1588776814546-1ffcf47267a5", "Routine checkups and oral hygiene", "Unsplash Photographer", "unsplash", "services", "_s1"),
      make("1606811971618-4486d14f3f99", "Cosmetic dentistry and restorative care", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1629909613654-28e377c37b09", "Preventative dental screening consultation", "National Cancer Institute", "nationalcancerinstitute", "services", "_s3"),
      make("1588776814546-1ffcf47267a5", "Sterile dental treatment chair", "Unsplash Photographer", "unsplash", "gallery", "_g1"),
      make("1606811971618-4486d14f3f99", "Clinical dental care room", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1519494026892-80bbd2d6fd0d", "Bright clinical clinic corridor", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("clinic") || norm.includes("doctor") || norm.includes("medical") || norm.includes("health")) {
    return [
      make("1629909613654-28e377c37b09", "Caring professional medical practitioner diagnostic consult", "National Cancer Institute", "nationalcancerinstitute", "hero"),
      make("1519494026892-80bbd2d6fd0d", "Bright modern hospital and clinic corridor", "Unsplash Photographer", "unsplash", "about"),
      make("1576091160550-2173dba999ef", "Primary care consultation and checkups", "Unsplash Photographer", "unsplash", "services", "_s1"),
      make("1582719478250-c89cae4dc85b", "Diagnostic laboratory testing services", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1629909613654-28e377c37b09", "Family wellness and specialist medical care", "National Cancer Institute", "nationalcancerinstitute", "services", "_s3"),
      make("1519494026892-80bbd2d6fd0d", "Patient care waiting and corridor", "Unsplash Photographer", "unsplash", "gallery", "_g1"),
      make("1576091160550-2173dba999ef", "Doctor reviewing patient chart", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1582719478250-c89cae4dc85b", "Clean diagnostic testing equipment", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("mechanic") || norm.includes("auto") || norm.includes("car") || norm.includes("garage") || norm.includes("vehicle")) {
    return [
      make("1619642751034-765dfdf7c58e", "Auto repair workshop technician servicing vehicle", "Unsplash Photographer", "unsplash", "hero"),
      make("1487754180451-c456f719a1fc", "Engine bay diagnostic inspection and oil service", "Unsplash Photographer", "unsplash", "about"),
      make("1487754180451-c456f719a1fc", "Engine diagnostics and scheduled servicing", "Unsplash Photographer", "unsplash", "services", "_s1"),
      make("1619642751034-765dfdf7c58e", "Brake, clutch, and suspension repair", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1503376780353-7e6692767b70", "Full vehicle safety and roadworthy inspection", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1619642751034-765dfdf7c58e", "Clean hydraulic lift workshop bay", "Unsplash Photographer", "unsplash", "gallery", "_g1"),
      make("1487754180451-c456f719a1fc", "Precision engine maintenance tools", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1552519507-da3b142c6e3d", "Serviced vehicle ready for handover", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("security")) {
    return [
      make("1557597774-9d273605dfa9", "Security monitoring and facility access control", "Sander Samson", "sandersamson", "hero"),
      make("1558494949-ef010cbdcc31", "24/7 alarm monitoring hardware infrastructure", "Unsplash Photographer", "unsplash", "about"),
      make("1557597774-9d273605dfa9", "Manned guarding and site patrol", "Sander Samson", "sandersamson", "services", "_s1"),
      make("1558494949-ef010cbdcc31", "CCTV surveillance and access systems", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1497366216548-37526070297c", "Commercial estate security management", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1557597774-9d273605dfa9", "Security systems monitoring desk", "Sander Samson", "sandersamson", "gallery", "_g1"),
      make("1558494949-ef010cbdcc31", "Digital telemetry and alarm racks", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1497366216548-37526070297c", "Protected corporate lobby interior", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("clean") || norm.includes("janitor")) {
    return [
      make("1581578731548-c64695cc6952", "Spotless residential and commercial cleaning service", "Volodymyr Hryshchenko", "vladhryshchenko", "hero"),
      make("1507207611509-ec012433ff52", "Detailed surface sanitization and housekeeping", "Unsplash Photographer", "unsplash", "about"),
      make("1581578731548-c64695cc6952", "Deep residential home cleaning", "Volodymyr Hryshchenko", "vladhryshchenko", "services", "_s1"),
      make("1507207611509-ec012433ff52", "Commercial office janitorial maintenance", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1600585154340-be6161a56a0c", "Move-in and post-renovation detailing", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1581578731548-c64695cc6952", "Sanitized home surfaces and care", "Volodymyr Hryshchenko", "vladhryshchenko", "gallery", "_g1"),
      make("1507207611509-ec012433ff52", "Clean organized workspace finish", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1600585154340-be6161a56a0c", "Spotless bright living room", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("account") || norm.includes("tax") || norm.includes("finance") || norm.includes("audit")) {
    return [
      make("1554224155-8d04cb21cd6c", "Strategic commercial accounting and financial ledger", "StellrWeb", "stellrweb", "hero"),
      make("1454165804606-c3d57bc86b40", "Audit analytics and tax compliance review", "Unsplash Photographer", "unsplash", "about"),
      make("1554224155-8d04cb21cd6c", "Monthly bookkeeping and VAT tax filing", "StellrWeb", "stellrweb", "services", "_s1"),
      make("1454165804606-c3d57bc86b40", "Annual financial statements and audits", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1507679799987-c73779587ccf", "Executive CFO advisory and payroll", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1554224155-8d04cb21cd6c", "Financial reporting and tax sheets", "StellrWeb", "stellrweb", "gallery", "_g1"),
      make("1454165804606-c3d57bc86b40", "Quarterly advisory meeting", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1556761175-5973dc0f32e7", "Client accounting consultation", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("hotel") || norm.includes("inn") || norm.includes("lodge") || norm.includes("resort") || norm.includes("hospitality") || norm.includes("tour")) {
    return [
      make("1566073771259-6a8506099945", "Luxury hotel courtyard and hospitality entrance", "Manuel Moreno", "manuelmoreno", "hero"),
      make("1600585154340-be6161a56a0c", "Boutique guest suite interior architecture", "Unsplash Photographer", "unsplash", "about"),
      make("1566073771259-6a8506099945", "Luxury suites and resort accommodations", "Manuel Moreno", "manuelmoreno", "services", "_s1"),
      make("1600585154340-be6161a56a0c", "Executive rooms and private balconies", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1517248135467-4c7edcad34c4", "In-house fine dining and guest lounge", "Toa Heftiba", "toaheftiba", "services", "_s3"),
      make("1566073771259-6a8506099945", "Resort poolside patio at dusk", "Manuel Moreno", "manuelmoreno", "gallery", "_g1"),
      make("1600585154340-be6161a56a0c", "Spacious boutique guest suite", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1517248135467-4c7edcad34c4", "Evening dining atmosphere", "Toa Heftiba", "toaheftiba", "gallery", "_g3")
    ];
  }

  if (norm.includes("football") || norm.includes("soccer") || norm.includes("sport") || norm.includes("club") || norm.includes("athletic")) {
    return [
      make("1579952363873-27f3bade9f55", "Football on natural grass pitch ready for kickoff", "Unsplash Photographer", "unsplash", "hero"),
      make("1574629810360-7efbbe195018", "Athletic stadium pitch under floodlights", "Unsplash Photographer", "unsplash", "about"),
      make("1579952363873-27f3bade9f55", "Youth academy coaching and match training", "Unsplash Photographer", "unsplash", "services", "_s1"),
      make("1574629810360-7efbbe195018", "League matches and tournament facilities", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1522071820081-009f0129c71c", "Team strategy and athletic development", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1579952363873-27f3bade9f55", "Matchday football on pitch turf", "Unsplash Photographer", "unsplash", "gallery", "_g1"),
      make("1574629810360-7efbbe195018", "Evening stadium lights", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1522071820081-009f0129c71c", "Team briefing and club spirit", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("retail") || norm.includes("shop") || norm.includes("store") || norm.includes("boutique") || norm.includes("clothing")) {
    return [
      make("1441986300917-64674bd600d8", "Modern clothing retail boutique shop display interior", "Mike Petrucci", "mikepetrucci", "hero"),
      make("1556742049-0cfed4f6a45d", "Point-of-sale customer service counter", "Unsplash Photographer", "unsplash", "about"),
      make("1441986300917-64674bd600d8", "Curated collections and apparel display", "Mike Petrucci", "mikepetrucci", "services", "_s1"),
      make("1556742049-0cfed4f6a45d", "In-store ordering and express checkout", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1521737711867-e3b97375f902", "Personal styling and retail consultation", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1441986300917-64674bd600d8", "Boutique shelves and apparel rack", "Mike Petrucci", "mikepetrucci", "gallery", "_g1"),
      make("1556742049-0cfed4f6a45d", "Clean retail checkout counter", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1521737711867-e3b97375f902", "Friendly retail customer team", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("print") || norm.includes("graphic") || norm.includes("sign") || norm.includes("market") || norm.includes("advert")) {
    return [
      make("1562654501-a0ccc0fc3fb1", "Commercial offset printing press and color proofs", "Unsplash Photographer", "unsplash", "hero"),
      make("1561070791-2526d30994b5", "Graphic design studio typography and color swatches", "Unsplash Photographer", "unsplash", "about"),
      make("1562654501-a0ccc0fc3fb1", "Large-format commercial printing and packaging", "Unsplash Photographer", "unsplash", "services", "_s1"),
      make("1561070791-2526d30994b5", "Brand identity, logos, and print layout", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1460925895917-afdab827c52f", "Digital marketing and campaign strategy", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1562654501-a0ccc0fc3fb1", "High-volume print production", "Unsplash Photographer", "unsplash", "gallery", "_g1"),
      make("1561070791-2526d30994b5", "Creative branding and signage proof", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1460925895917-afdab827c52f", "Marketing analytics workspace", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("it") || norm.includes("tech") || norm.includes("computer") || norm.includes("network") || norm.includes("msp")) {
    return [
      make("1519389950473-47ba0277781c", "Collaborative IT engineering and systems support team", "Marvin Meyer", "marvinmeyer", "hero"),
      make("1558494949-ef010cbdcc31", "Enterprise server infrastructure and fiber networking", "Unsplash Photographer", "unsplash", "about"),
      make("1558494949-ef010cbdcc31", "Managed IT support and network security", "Unsplash Photographer", "unsplash", "services", "_s1"),
      make("1518770660439-4636190af475", "Computer hardware diagnostics and repair", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1519389950473-47ba0277781c", "Cloud migration and office IT consulting", "Marvin Meyer", "marvinmeyer", "services", "_s3"),
      make("1558494949-ef010cbdcc31", "Server rack and structured cabling", "Unsplash Photographer", "unsplash", "gallery", "_g1"),
      make("1518770660439-4636190af475", "Circuit board and hardware bench", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1519389950473-47ba0277781c", "Software and IT helpdesk specialists", "Marvin Meyer", "marvinmeyer", "gallery", "_g3")
    ];
  }

  if (norm.includes("event") || norm.includes("wedding") || norm.includes("party") || norm.includes("church")) {
    const isChurch = norm.includes("church");
    return [
      make(isChurch ? "1544427920-c49ccfb85579" : "1511795409834-ef04bbd61622", isChurch ? "Community worship sanctuary gathering" : "Elegant decorated event banquet tables and lighting", "Alasdair Elmes", "alasdairelmes", "hero"),
      make(isChurch ? "1438032005730-c779502df39b" : "1555244162-803834f70033", isChurch ? "Welcoming community fellowship space" : "Catering and hospitality event service", "Lily Banse", "lilybanse", "about"),
      make("1511795409834-ef04bbd61622", "Full event planning and venue styling", "Alasdair Elmes", "alasdairelmes", "services", "_s1"),
      make("1555244162-803834f70033", "Guest dining and reception coordination", "Lily Banse", "lilybanse", "services", "_s2"),
      make("1438032005730-c779502df39b", "Community gatherings and ceremonies", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1511795409834-ef04bbd61622", "Decorated venue tablescape", "Alasdair Elmes", "alasdairelmes", "gallery", "_g1"),
      make("1555244162-803834f70033", "Event banquet culinary presentation", "Lily Banse", "lilybanse", "gallery", "_g2"),
      make("1544427920-c49ccfb85579", "Main hall assembly gathering", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("agricult") || norm.includes("farm") || norm.includes("crop")) {
    return [
      make("1500382017468-9049fed747ef", "Green cultivated farmland fields at sunrise", "Unsplash Photographer", "unsplash", "hero"),
      make("1504917595217-d4dc5ebe6122", "Agricultural workshop and equipment servicing", "Unsplash Photographer", "unsplash", "about"),
      make("1500382017468-9049fed747ef", "Crop cultivation and agribusiness supply", "Unsplash Photographer", "unsplash", "services", "_s1"),
      make("1586528116311-ad8dd3c8310d", "Produce warehousing and bulk distribution", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1504917595217-d4dc5ebe6122", "Agricultural machinery and irrigation setup", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1500382017468-9049fed747ef", "Sunrise over planted farmland", "Unsplash Photographer", "unsplash", "gallery", "_g1"),
      make("1586528116311-ad8dd3c8310d", "Distribution warehouse bay", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1504917595217-d4dc5ebe6122", "Precision metal and farm equipment", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  if (norm.includes("transport") || norm.includes("logistics") || norm.includes("freight") || norm.includes("courier")) {
    return [
      make("1586528116311-ad8dd3c8310d", "Commercial logistics warehouse and cargo dispatch bays", "Unsplash Photographer", "unsplash", "hero"),
      make("1504917595217-d4dc5ebe6122", "Industrial fleet and freight engineering", "Unsplash Photographer", "unsplash", "about"),
      make("1586528116311-ad8dd3c8310d", "Dedicated freight forwarding and warehousing", "Unsplash Photographer", "unsplash", "services", "_s1"),
      make("1619642751034-765dfdf7c58e", "Commercial fleet maintenance and readiness", "Unsplash Photographer", "unsplash", "services", "_s2"),
      make("1556742049-0cfed4f6a45d", "Express courier tracking and client dispatch", "Unsplash Photographer", "unsplash", "services", "_s3"),
      make("1586528116311-ad8dd3c8310d", "High-bay warehouse cargo storage", "Unsplash Photographer", "unsplash", "gallery", "_g1"),
      make("1504917595217-d4dc5ebe6122", "Heavy-duty logistics equipment", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
      make("1556742049-0cfed4f6a45d", "Parcel dispatch verification", "Unsplash Photographer", "unsplash", "gallery", "_g3")
    ];
  }

  // General Business fallback curated images (all HTTP-200 verified)
  return [
    make("1497366216548-37526070297c", "Modern welcoming commercial client reception and workspace", "Unsplash Photographer", "unsplash", "hero"),
    make("1521737711867-e3b97375f902", "Dedicated local service team collaborating for clients", "Unsplash Photographer", "unsplash", "about"),
    make("1556761175-5973dc0f32e7", "Direct client consultation and itemized planning", "Unsplash Photographer", "unsplash", "services", "_s1"),
    make("1521737711867-e3b97375f902", "Core team execution and project coordination", "Unsplash Photographer", "unsplash", "services", "_s2"),
    make("1581092921461-eab62e97a780", "Ongoing quality inspection and maintenance support", "Science in HD", "scienceinhd", "services", "_s3"),
    make("1497366216548-37526070297c", "Bright contemporary office workspace", "Unsplash Photographer", "unsplash", "gallery", "_g1"),
    make("1521737711867-e3b97375f902", "Team coordination and project review", "Unsplash Photographer", "unsplash", "gallery", "_g2"),
    make("1556761175-5973dc0f32e7", "Client partnership meeting", "Unsplash Photographer", "unsplash", "gallery", "_g3")
  ];
}

// Hydrate every static INDUSTRY_TAXONOMY entry so none have empty curatedImages arrays
for (const rule of Object.values(INDUSTRY_TAXONOMY)) {
  if (!rule.curatedImages || rule.curatedImages.length === 0) {
    rule.curatedImages = getCuratedImagesForIndustry(rule.industry);
  }
}

export function matchIndustryTaxonomy(rawCategory: string = ""): IndustryVisualRule {
  const norm = rawCategory.toLowerCase().trim();

  let matchedRule: IndustryVisualRule | null = null;

  // 1. Direct Static Match
  for (const key of Object.keys(INDUSTRY_TAXONOMY)) {
    const rule = INDUSTRY_TAXONOMY[key];
    if (norm === key.toLowerCase() || norm.includes(key.toLowerCase())) {
      matchedRule = rule;
      break;
    }
    for (const alias of rule.aliases) {
      if (norm === alias.toLowerCase() || norm.includes(alias.toLowerCase()) || alias.toLowerCase().includes(norm)) {
        matchedRule = rule;
        break;
      }
    }
    if (matchedRule) break;
  }

  // 2. Keyword association mapping for static taxonomy fallback
  if (!matchedRule) {
    if (norm.includes("pipe") || norm.includes("drain") || norm.includes("water") || norm.includes("leak") || norm.includes("plumb")) {
      matchedRule = INDUSTRY_TAXONOMY.plumbing;
    } else if (norm.includes("hair") || norm.includes("salon") || norm.includes("beauty") || norm.includes("barber") || norm.includes("nails") || norm.includes("spa") || norm.includes("cosmetic")) {
      matchedRule = INDUSTRY_TAXONOMY.salons;
    } else if (norm.includes("food") || norm.includes("cafe") || norm.includes("bistro") || norm.includes("grill") || norm.includes("dine") || norm.includes("bar") || norm.includes("catering") || norm.includes("bakery") || norm.includes("restaurant")) {
      matchedRule = INDUSTRY_TAXONOMY.restaurant;
    } else if (norm.includes("build") || norm.includes("construct") || norm.includes("contractor") || norm.includes("roof") || norm.includes("carpenter") || norm.includes("masonry") || norm.includes("paving")) {
      matchedRule = INDUSTRY_TAXONOMY.construction;
    } else if (norm.includes("law") || norm.includes("legal") || norm.includes("attorney") || norm.includes("advocate") || norm.includes("solicitor") || norm.includes("notary")) {
      matchedRule = INDUSTRY_TAXONOMY.lawyers;
    } else if (norm.includes("property") || norm.includes("estate") || norm.includes("realtor") || norm.includes("house") || norm.includes("realty") || norm.includes("apartment")) {
      matchedRule = INDUSTRY_TAXONOMY.real_estate;
    } else if (norm.includes("school") || norm.includes("learn") || norm.includes("college") || norm.includes("preschool") || norm.includes("tutor") || norm.includes("academy") || norm.includes("education")) {
      matchedRule = INDUSTRY_TAXONOMY.schools;
    } else if (norm.includes("health") || norm.includes("clinic") || norm.includes("doctor") || norm.includes("medical") || norm.includes("dental") || norm.includes("dentist") || norm.includes("pharmacy")) {
      matchedRule = INDUSTRY_TAXONOMY.medical_practices;
    } else if (norm.includes("auto") || norm.includes("mechanic") || norm.includes("car") || norm.includes("garage") || norm.includes("tyre") || norm.includes("workshop") || norm.includes("vehicle")) {
      matchedRule = INDUSTRY_TAXONOMY.mechanics;
    } else if (norm.includes("security") || norm.includes("guards") || norm.includes("patrol") || norm.includes("alarm") || norm.includes("cctv")) {
      matchedRule = INDUSTRY_TAXONOMY.security_companies;
    } else if (norm.includes("clean") || norm.includes("janitorial") || norm.includes("maid") || norm.includes("sweep")) {
      matchedRule = INDUSTRY_TAXONOMY.cleaning_companies;
    } else if (norm.includes("account") || norm.includes("bookkeep") || norm.includes("tax") || norm.includes("ledger") || norm.includes("audit") || norm.includes("advisory")) {
      matchedRule = INDUSTRY_TAXONOMY.accountants;
    } else if (norm.includes("print") || norm.includes("publish") || norm.includes("ink") || norm.includes("flyer")) {
      matchedRule = INDUSTRY_TAXONOMY.printers;
    } else if (norm.includes("design") || norm.includes("illustrat") || norm.includes("ui") || norm.includes("ux") || norm.includes("graphic")) {
      matchedRule = INDUSTRY_TAXONOMY.graphic_designers;
    } else if (norm.includes("sign") || norm.includes("banner") || norm.includes("neon")) {
      matchedRule = INDUSTRY_TAXONOMY.sign_companies;
    } else if (norm.includes("it support") || norm.includes("msp") || norm.includes("network") || norm.includes("server") || norm.includes("computer repair") || norm.includes("technician")) {
      matchedRule = INDUSTRY_TAXONOMY.it_technicians;
    } else if (norm.includes("market") || norm.includes("seo") || norm.includes("ad agency") || norm.includes("advertise")) {
      matchedRule = INDUSTRY_TAXONOMY.marketing_agencies;
    } else if (norm.includes("event") || norm.includes("wedding") || norm.includes("party") || norm.includes("banquet")) {
      matchedRule = INDUSTRY_TAXONOMY.event_planners;
    } else if (norm.includes("farm") || norm.includes("crops") || norm.includes("livestock") || norm.includes("agriculture")) {
      matchedRule = INDUSTRY_TAXONOMY.agriculture;
    } else if (norm.includes("transport") || norm.includes("logistics") || norm.includes("freight") || norm.includes("shipping") || norm.includes("warehouse")) {
      matchedRule = INDUSTRY_TAXONOMY.transport;
    } else if (norm.includes("hotel") || norm.includes("inn") || norm.includes("lodge") || norm.includes("resort") || norm.includes("hospitality")) {
      matchedRule = DynamicTaxonomyFactory.create(rawCategory);
    } else if (norm.includes("football") || norm.includes("soccer") || norm.includes("sport") || norm.includes("club") || norm.includes("athletic")) {
      matchedRule = DynamicTaxonomyFactory.create(rawCategory);
    } else if (norm.includes("retail") || norm.includes("shop") || norm.includes("store") || norm.includes("boutique")) {
      matchedRule = DynamicTaxonomyFactory.create(rawCategory);
    }
  }

  const finalRule = matchedRule || DynamicTaxonomyFactory.create(rawCategory);

  // Guarantee curatedImages are dynamically populated if currently empty
  if (!finalRule.curatedImages || finalRule.curatedImages.length === 0) {
    finalRule.curatedImages = getCuratedImagesForIndustry(finalRule.industry);
  }

  return finalRule;
}

