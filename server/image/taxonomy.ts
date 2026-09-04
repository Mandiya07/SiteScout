import { ImageMetadata, VisualStyle } from "./types.js";

export interface IndustryVisualRule {
  industry: string;
  aliases: string[];
  defaultStyle: VisualStyle;
  subcategory: string;
  services: string[];
  audience: string[];
  preferredSubjects: string[];
  avoidSubjects: string[];
  heroQueries: string[];
  aboutQueries: string[];
  serviceQueries: Record<string, string>;
  galleryThemes: string[];
  curatedImages: ImageMetadata[];
}

export const INDUSTRY_TAXONOMY: Record<string, IndustryVisualRule> = {
  plumber: {
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
        id: "plumb_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Professional plumbing technician adjusting water valve under residential sink",
        photographer: "CDC",
        photographerUrl: "https://unsplash.com/@cdc",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "professional plumber working on residential pipe installation",
        industry: "Plumbing",
        subcategory: "Residential Plumbing",
        relevanceScore: 98,
        explanation: "Matches business category (Plumbing), service focus (Pipe repair), 16:9 landscape aspect ratio, and authentic technician framing.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "plumb_hero_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Professional technician with toolbox inspecting residential plumbing systems",
        photographer: "Anton Darius",
        photographerUrl: "https://unsplash.com/@the勇敢",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "plumber with tools inspecting water installation",
        industry: "Plumbing",
        subcategory: "Residential Plumbing",
        relevanceScore: 95,
        explanation: "Shows active plumbing work environment with specialized equipment.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "plumb_about_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        alt: "Skilled craftsman and trade professional with work gloves and safety gear",
        photographer: "Chevanon Photography",
        photographerUrl: "https://unsplash.com/@chevanon",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "about",
        query: "professional tradesman technician portrait trust",
        industry: "Plumbing",
        relevanceScore: 92,
        explanation: "Reinforces trust, safety standards, and craftsmanship.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "plumb_srv_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Emergency bathroom leak inspection and water pipe maintenance",
        photographer: "Frames For Your Heart",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "bathroom water pipe leak repair",
        industry: "Plumbing",
        relevanceScore: 94,
        explanation: "Directly illustrates emergency water leak repair service.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "plumb_srv_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Clean modern bathroom plumbing and chrome faucet fixtures",
        photographer: "Sanibell BV",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "modern bathroom fixtures and pipe installation",
        industry: "Plumbing",
        relevanceScore: 93,
        explanation: "Exemplifies bathroom fitting and renovation capabilities.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "plumb_gal_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 800,
        alt: "Specialized plumbing toolset, wrenches, and copper fitting connectors",
        photographer: "Barn Images",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "gallery",
        query: "plumbing tools and brass fittings",
        industry: "Plumbing",
        relevanceScore: 90,
        explanation: "Shows trade precision and equipment readiness.",
        orientation: "square",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "plumb_gal_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 800,
        alt: "Precision pipe alignment and water filtration installation",
        photographer: "Sigmund",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "gallery",
        query: "pipe alignment water pressure testing",
        industry: "Plumbing",
        relevanceScore: 91,
        explanation: "Highlights clean workmanship and finished residential piping.",
        orientation: "square",
        createdAt: "2026-08-29T10:00:00Z"
      }
    ]
  },

  restaurant: {
    industry: "Restaurant",
    aliases: ["restaurant", "food", "dining", "eatery", "bistro", "grill", "cafe", "takeaway", "lounge", "kitchen", "cater"],
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
        id: "rest_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Warm and inviting restaurant interior with elegant wooden dining tables and ambient lighting",
        photographer: "Jay Wennington",
        photographerUrl: "https://unsplash.com/@jaywennington",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "restaurant dining room interior atmosphere warm lighting",
        industry: "Restaurant",
        relevanceScore: 97,
        explanation: "Immediately communicates hospitality, dining ambiance, and welcoming atmosphere in a wide 16:9 frame.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "rest_hero_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Chef preparing and plating artisanal cuisine in a busy restaurant kitchen",
        photographer: "Eiliv Aceron",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "chef cooking food in restaurant kitchen",
        industry: "Restaurant",
        relevanceScore: 96,
        explanation: "Showcases culinary passion, fresh food preparation, and appetizing dining quality.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "rest_about_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1200&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        alt: "Professional head chef in white uniform posing in kitchen",
        photographer: "Fabrizio Magoni",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "about",
        query: "chef portrait kitchen culinary passion",
        industry: "Restaurant",
        relevanceScore: 93,
        explanation: "Builds culinary authority and kitchen authenticity.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "rest_srv_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Freshly prepared gourmet steak and roasted vegetables dish",
        photographer: "Lily Banse",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "gourmet main course food plate restaurant",
        industry: "Restaurant",
        relevanceScore: 95,
        explanation: "Appetizing representation of signature menu options.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "rest_srv_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Artisan grilled burger with crispy fries ready for dine-in or takeaway",
        photographer: "Jonathan Borba",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "craft burger fries meal takeaway dine in",
        industry: "Restaurant",
        relevanceScore: 94,
        explanation: "Showcases casual dining and popular takeaway menu favorites.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "rest_gal_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 800,
        alt: "Fresh salad bowl with crisp greens, tomatoes, and balsamic glaze",
        photographer: "Ella Olsson",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "gallery",
        query: "healthy organic salad restaurant dish",
        industry: "Restaurant",
        relevanceScore: 91,
        explanation: "Emphasizes ingredient freshness and variety.",
        orientation: "square",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "rest_gal_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 800,
        alt: "Handcrafted dessert with chocolate fondant and fresh mint garnish",
        photographer: "Brooke Lark",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "gallery",
        query: "dessert pastry restaurant dining plate",
        industry: "Restaurant",
        relevanceScore: 92,
        explanation: "Appeals to sweet tooth and dessert course selections.",
        orientation: "square",
        createdAt: "2026-08-29T10:00:00Z"
      }
    ]
  },

  construction: {
    industry: "Construction",
    aliases: ["construction", "builder", "building", "contractor", "civil", "masonry", "roofing", "renovation", "carpentry", "paving"],
    defaultStyle: "Bold",
    subcategory: "General Contracting & Infrastructure",
    services: ["Residential Home Builds", "Commercial Contracting", "Structural Renovations & Additions", "Roofing & Civil Earthworks"],
    audience: ["Property Developers", "Homeowners", "Commercial Clients", "Public Municipalities"],
    preferredSubjects: ["construction workers on building site with safety helmets", "modern architectural building framing", "heavy civil equipment and machinery", "blueprint plans and engineer with tools", "completed contemporary brick and steel building"],
    avoidSubjects: ["generic corporate office worker", "laptop screen", "random hospital room", "unrelated boutique salon"],
    heroQueries: [
      "construction workers and engineers in hard hats reviewing architectural blueprints on active building site",
      "modern residential and commercial building construction with steel structure and clear sky",
      "skilled construction craftsman measuring concrete foundation on build project"
    ],
    aboutQueries: [
      "lead construction contractor with blueprints and safety gear on site",
      "dedicated building crew collaborating on modern architectural project"
    ],
    serviceQueries: {
      "Residential Home Builds": "modern new home construction frame architecture",
      "Commercial Contracting": "commercial office building construction steel glass",
      "Structural Renovations & Additions": "home renovation remodeling interior framing tools",
      "Roofing & Civil Earthworks": "roofing installation wooden trusses construction site"
    },
    galleryThemes: [
      "Active building site with steel framework and cranes",
      "Engineers inspecting architectural foundations with laser level",
      "Carpenter assembling solid wood structural roof trusses",
      "Mason laying precision brickwork on boundary wall",
      "Stunning completed modern residential property exterior"
    ],
    curatedImages: [
      {
        id: "const_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Construction workers in high-visibility vests and helmets on an active commercial building site",
        photographer: "Mika Baumeister",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "construction site workers building frame",
        industry: "Construction",
        relevanceScore: 98,
        explanation: "Instantly communicates structural building, professional safety standards, and project scale.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "const_hero_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Architectural blueprint plans with helmet and precision construction tools on wooden table",
        photographer: "Daniel McCullough",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "architectural blueprints engineering construction planning",
        industry: "Construction",
        relevanceScore: 94,
        explanation: "Emphasizes precision planning, structural engineering, and design integrity.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "const_about_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 800,
        alt: "Civil engineer holding tablet inspecting project build progress",
        photographer: "ThisisEngineering RAEng",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "about",
        query: "engineer building site contractor inspection",
        industry: "Construction",
        relevanceScore: 92,
        explanation: "Shows modern site management and engineering supervision.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "const_srv_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Modern home renovation and interior structural wall remodeling",
        photographer: "Curtis Adams",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "residential building remodeling house renovation",
        industry: "Construction",
        relevanceScore: 93,
        explanation: "Visualizes home construction and interior extension work.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "const_gal_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 800,
        alt: "Heavy duty construction concrete foundation work and reinforcement rebar",
        photographer: "Scott Blake",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "gallery",
        query: "concrete foundation rebar construction",
        industry: "Construction",
        relevanceScore: 91,
        explanation: "Demonstrates strong foundational integrity.",
        orientation: "square",
        createdAt: "2026-08-29T10:00:00Z"
      }
    ]
  },

  beauty_salon: {
    industry: "Beauty Salon",
    aliases: ["beauty salon", "salon", "hair salon", "hairdresser", "barber", "barbershop", "nails", "spa", "cosmetics", "makeup", "aesthetics"],
    defaultStyle: "Elegant",
    subcategory: "Hair, Aesthetics & Personal Care",
    services: ["Precision Hair Cuts & Color", "Luxury Nail Art & Manicures", "Bridal & Glam Makeup", "Revitalizing Facial Treatments"],
    audience: ["Women", "Men", "Bridal Parties", "Self-Care Enthusiasts"],
    preferredSubjects: ["hairstylist styling client hair in modern salon", "elegant salon interior with mirrors and vanity lights", "nail technician painting manicure", "professional makeup artist applying cosmetics", "spa aesthetics treatment"],
    avoidSubjects: ["generic corporate office", "construction cranes", "industrial engines", "random spreadsheets", "unrelated vehicles"],
    heroQueries: [
      "professional hairstylist styling woman hair in bright luxury modern salon",
      "chic aesthetic beauty salon interior with plush styling chairs and warm ring lights",
      "expert hair coloring and styling in upscale beauty studio"
    ],
    aboutQueries: [
      "friendly professional beauty specialist with styling shears in modern studio",
      "welcoming salon reception and styling stations with fresh botanical decor"
    ],
    serviceQueries: {
      "Precision Hair Cuts & Color": "hairstylist cutting and blow drying client hair salon",
      "Luxury Nail Art & Manicures": "nail technician applying gel polish manicure nails",
      "Bridal & Glam Makeup": "makeup artist applying luxury eyeshadow cosmetics brush",
      "Revitalizing Facial Treatments": "aesthetician providing gentle facial skincare mask treatment"
    },
    galleryThemes: [
      "Flawless balayage hair color transformation",
      "Detailed luxury gel nail art with gold leaf accents",
      "Glamorous bridal makeup application before mirror",
      "Cozy salon washing basin and organic hair product display",
      "Professional styling station with premium shears and hot tools"
    ],
    curatedImages: [
      {
        id: "salon_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Chic and modern hair and beauty salon interior with styling chairs and warm lighting",
        photographer: "Adam Winger",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "modern hair salon interior styling stations mirrors",
        industry: "Beauty Salon",
        relevanceScore: 98,
        explanation: "Sets a sophisticated, clean, and luxurious tone immediately for salon clients.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "salon_hero_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Professional hairstylist cutting and styling client hair with precision",
        photographer: "Guilherme Petri",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "hairstylist cutting hair salon styling",
        industry: "Beauty Salon",
        relevanceScore: 96,
        explanation: "Shows active styling expertise and customer transformation in a high-end salon.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "salon_srv_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1632345031435-8727f6897d53?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Nail artist performing luxury gel manicure and cuticle treatment",
        photographer: "Kris Cole",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "manicure nail salon care polish",
        industry: "Beauty Salon",
        relevanceScore: 94,
        explanation: "Accurately represents nail and manicure packages.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "salon_gal_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 800,
        alt: "Professional makeup brush kit and cosmetic eyeshadow palette",
        photographer: "Element5 Digital",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "gallery",
        query: "makeup brushes cosmetics beauty kit",
        industry: "Beauty Salon",
        relevanceScore: 91,
        explanation: "Illustrates glam beauty, bridal prep, and cosmetic tools.",
        orientation: "square",
        createdAt: "2026-08-29T10:00:00Z"
      }
    ]
  },

  mechanic: {
    industry: "Auto Repair",
    aliases: ["mechanic", "auto repair", "garage", "workshop", "auto electrician", "panel beating", "tyre", "car service", "brakes", "auto dealer"],
    defaultStyle: "Bold",
    subcategory: "Vehicle Diagnostics & Mechanical Services",
    services: ["Computerized Engine Diagnostics", "Brake & Suspension Overhaul", "Full Mechanical Maintenance Service", "Auto Electrical & Battery Repairs"],
    audience: ["Car Owners", "Commercial Fleet Operators", "Bakkie & Truck Drivers"],
    preferredSubjects: ["certified mechanic working under vehicle on hydraulic lift", "mechanic holding wrench testing car engine", "organized clean automotive workshop", "diagnostic scan tool connected to engine", "brake disc and wheel assembly maintenance"],
    avoidSubjects: ["generic corporate office", "random hospital room", "unrelated restaurant plate", "laptop desk"],
    heroQueries: [
      "professional automotive mechanic working on car engine in clean modern garage workshop",
      "experienced mechanic inspecting vehicle on hydraulic hoist in auto repair centre",
      "technician using computerized engine diagnostic scanner in auto workshop"
    ],
    aboutQueries: [
      "friendly certified auto mechanic in work uniform standing in garage workshop",
      "automotive repair team with safety gear in modern auto service centre"
    ],
    serviceQueries: {
      "Computerized Engine Diagnostics": "auto mechanic connecting digital diagnostic scanner engine",
      "Brake & Suspension Overhaul": "mechanic replacing brake pads and disc rotor wheel",
      "Full Mechanical Maintenance Service": "technician changing oil filter engine car servicing",
      "Auto Electrical & Battery Repairs": "auto electrician testing car battery and alternator voltmeter"
    },
    galleryThemes: [
      "Car elevated on hydraulic lift inside clean workshop",
      "Close up of precision torque wrench tightening engine manifold",
      "Brand new brake caliper and ceramic rotor installation",
      "Diagnostic tablet displaying vehicle sensor performance",
      "Spotless automotive repair service bay ready for clients"
    ],
    curatedImages: [
      {
        id: "mech_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Professional mechanic inspecting engine bay in clean modern workshop",
        photographer: "Neophytos Neophytou",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "mechanic inspecting car engine workshop",
        industry: "Auto Repair",
        relevanceScore: 98,
        explanation: "Crisply highlights auto repair, mechanical inspection, and garage professionalism.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "mech_srv_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Mechanic tightening wheel hub and inspecting vehicle brake assembly",
        photographer: "Chad Kirchoff",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "car brake maintenance mechanic workshop",
        industry: "Auto Repair",
        relevanceScore: 94,
        explanation: "Accurately represents brake and suspension service.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "mech_gal_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 800,
        alt: "Organized mechanic tools, sockets, and ratchets in garage workshop",
        photographer: "Barna Bartis",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "gallery",
        query: "mechanic toolset sockets workshop garage",
        industry: "Auto Repair",
        relevanceScore: 91,
        explanation: "Highlights tool readiness and mechanical care.",
        orientation: "square",
        createdAt: "2026-08-29T10:00:00Z"
      }
    ]
  },

  hotel: {
    industry: "Hotel",
    aliases: ["hotel", "guest house", "lodge", "resort", "accommodation", "tourism", "bed and breakfast", "b&b", "motel", "hospitality", "safari lodge"],
    defaultStyle: "Luxury",
    subcategory: "Boutique Hospitality & Accommodation",
    services: ["Luxury Suites & King Rooms", "Complimentary Gourmet Breakfast", "Conferencing & Event Venues", "Concierge & Airport Transfers"],
    audience: ["Business Travelers", "Tourists", "Couples on Holiday", "Conference Delegates"],
    preferredSubjects: ["elegantly furnished hotel bedroom with king bed", "resort swimming pool with sun loungers and view", "boutique hotel reception lobby and concierge", "gourmet breakfast spread for hotel guests", "stunning scenic view from balcony"],
    avoidSubjects: ["generic corporate office cubicles", "construction wreckage", "industrial garage", "random plumbers"],
    heroQueries: [
      "luxury boutique hotel bedroom with king size bed warm ambient lighting and scenic balcony view",
      "stunning resort hotel swimming pool with sun loungers and mountain view",
      "elegant modern hotel lobby reception with warm hospitality lighting"
    ],
    aboutQueries: [
      "welcoming hotel concierge reception desk with smiling professional staff",
      "tranquil hotel garden patio with outdoor lounge seating"
    ],
    serviceQueries: {
      "Luxury Suites & King Rooms": "luxury hotel king bedroom suite interior crisp white linens",
      "Complimentary Gourmet Breakfast": "hotel breakfast buffet fresh pastries fruit and coffee",
      "Conferencing & Event Venues": "hotel conference room executive boardroom table presentation",
      "Concierge & Airport Transfers": "luxury hospitality transfer travel luggage concierge"
    },
    galleryThemes: [
      "Spacious master suite with plush pillows and balcony view",
      "Crystal clear swimming pool reflecting sunset sky",
      "Gourmet room service dining platter with fresh juices",
      "Marble hotel bathroom with standalone soaking tub",
      "Serene landscaped gardens and private guest terrace"
    ],
    curatedImages: [
      {
        id: "hotel_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Luxury resort hotel exterior with serene swimming pool and sun loungers",
        photographer: "Visualsofdana",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "luxury resort hotel pool tropical hospitality",
        industry: "Hotel",
        relevanceScore: 98,
        explanation: "Evokes instant tranquility, luxury, and five-star hospitality.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "hotel_hero_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Impeccably styled hotel bedroom suite with plush king bed and ambient reading lamps",
        photographer: "Point3D Commercial Imaging",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "luxury hotel room king bed interior",
        industry: "Hotel",
        relevanceScore: 96,
        explanation: "Focuses on comfort, spotless clean suites, and room quality.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "hotel_srv_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Hotel luxury resort bedroom and private lounge patio",
        photographer: "Sara Dubler",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "boutique hotel suite room interior",
        industry: "Hotel",
        relevanceScore: 94,
        explanation: "Accurately represents executive suite lodging.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      }
    ]
  },

  law_firm: {
    industry: "Law Firm",
    aliases: ["law firm", "lawyer", "attorney", "legal", "advocate", "notary", "solicitor", "legal counsel", "paralegal"],
    defaultStyle: "Corporate",
    subcategory: "Legal Advisory & Litigation Practice",
    services: ["Corporate & Commercial Law", "Litigation & Dispute Resolution", "Property & Conveyancing Transfers", "Estate Planning & Notarial Services"],
    audience: ["Business Executives", "Property Buyers", "Individuals Seeking Counsel"],
    preferredSubjects: ["modern professional law firm office with legal library", "attorneys consulting client across conference table", "signed legal documents with fountain pen", "clean sophisticated boardroom", "professional legal architecture"],
    avoidSubjects: ["overdramatic theatrical courtrooms", "excessive stereotypical wooden gavels everywhere", "random construction sites", "hospital surgery"],
    heroQueries: [
      "professional law firm office interior with legal volumes and sophisticated wooden conference table",
      "attorney consulting with client in modern executive office",
      "professional legal counsel meeting in high end conference room"
    ],
    aboutQueries: [
      "experienced attorney in suit reviewing legal brief in modern office",
      "legal partners discussing case files in law library"
    ],
    serviceQueries: {
      "Corporate & Commercial Law": "corporate legal contract review document pen business",
      "Litigation & Dispute Resolution": "attorney meeting client discussion legal advice",
      "Property & Conveyancing Transfers": "real estate deed legal signing keys contract",
      "Estate Planning & Notarial Services": "notary seal legal document estate planning"
    },
    galleryThemes: [
      "Prestigious law office library with leather-bound legal texts",
      "Executive boardroom with city views and briefing documents",
      "Signed legal agreement with fountain pen and wax seal",
      "Attorneys collaborating on case research with laptop",
      "Modern architectural entrance of premier legal firm"
    ],
    curatedImages: [
      {
        id: "law_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Sophisticated law firm conference table with legal documents and professional justice symbol",
        photographer: "Sora Shimazaki",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "law firm office legal justice books",
        industry: "Law Firm",
        relevanceScore: 98,
        explanation: "Evokes integrity, trust, deep legal acumen, and professional stature.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "law_srv_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Signing of legal contract and business agreement with fountain pen",
        photographer: "Scott Graham",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "signing legal agreement contract document",
        industry: "Law Firm",
        relevanceScore: 94,
        explanation: "Perfect for contract and conveyancing legal services.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      }
    ]
  },

  medical_clinic: {
    industry: "Medical Clinic",
    aliases: ["medical clinic", "doctor", "clinic", "hospital", "healthcare", "general practitioner", "gp", "physician", "dental", "dentist", "pharmacy"],
    defaultStyle: "Warm",
    subcategory: "Healthcare & Patient Wellness",
    services: ["General Consultations & Check-ups", "Preventative Care & Health Screenings", "Diagnostic Pathology & Vitals", "Chronic Disease Management"],
    audience: ["Families", "Seniors", "Community Patients"],
    preferredSubjects: ["friendly doctor with stethoscope smiling with patient", "clean modern medical consultation room", "medical professional in scrubs holding stethoscope", "state-of-the-art clinic reception", "compassionate healthcare consultation"],
    avoidSubjects: ["graphic surgical trauma imagery", "disturbing medical wounds", "scary syringes", "generic office laptops"],
    heroQueries: [
      "compassionate doctor with stethoscope consulting patient in bright modern medical clinic",
      "clean contemporary healthcare clinic consultation room with medical equipment",
      "friendly healthcare professional in white coat in bright clinic environment"
    ],
    aboutQueries: [
      "smiling physician with stethoscope in modern consultation office",
      "caring healthcare team collaborating in clinic hallway"
    ],
    serviceQueries: {
      "General Consultations & Check-ups": "doctor examining patient blood pressure stethoscope",
      "Preventative Care & Health Screenings": "health wellness screening medical chart checklist",
      "Diagnostic Pathology & Vitals": "medical diagnostic testing laboratory equipment clinic",
      "Chronic Disease Management": "doctor explaining health plan to patient consultation"
    },
    galleryThemes: [
      "Spotless and calming medical examination room",
      "Doctor discussing test results clearly with patient",
      "Modern digital vital signs monitoring equipment",
      "Comfortable welcoming patient waiting lounge",
      "Certified pharmacy and prescription dispensary counter"
    ],
    curatedImages: [
      {
        id: "med_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Bright, clean, and modern medical clinic hallway and consultation rooms",
        photographer: "Pina Messina",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "medical clinic bright hospital interior clean",
        industry: "Medical Clinic",
        relevanceScore: 97,
        explanation: "Communicates clinical hygiene, professionalism, and state-of-the-art healthcare.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "med_hero_2",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Caring doctor with stethoscope consulting patient with digital health chart",
        photographer: "National Cancer Institute",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "doctor consulting patient clinic stethoscope",
        industry: "Medical Clinic",
        relevanceScore: 96,
        explanation: "Builds deep patient trust and empathy.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "med_srv_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Medical stethoscope, diagnostic notes, and health chart on doctor desk",
        photographer: "Online Marketing",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "stethoscope medical notes doctor desk",
        industry: "Medical Clinic",
        relevanceScore: 93,
        explanation: "Illustrates medical consultation and routine vital checkups.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      }
    ]
  },

  real_estate: {
    industry: "Real Estate",
    aliases: ["real estate", "property", "realtor", "estate agent", "letting", "property management", "homes for sale", "commercial property"],
    defaultStyle: "Premium",
    subcategory: "Residential & Commercial Property Brokerage",
    services: ["Property Sales & Buyer Representation", "Rental Letting & Tenant Management", "Commercial Property Leasing", "Free Market Property Valuations"],
    audience: ["Homebuyers", "Property Investors", "Tenants", "Commercial Tenants"],
    preferredSubjects: ["stunning modern architectural luxury home exterior", "contemporary open plan living room with natural light", "realtor handing keys to new homeowner", "chic kitchen with marble countertop", "curated property development"],
    avoidSubjects: ["generic office desk", "random plumbers", "auto repair garage", "hospital wards"],
    heroQueries: [
      "stunning modern luxury residential home exterior with manicured lawn and warm sunset lighting",
      "contemporary open plan designer living room with expansive floor to ceiling windows",
      "professional real estate agent showing luxury property to buyers"
    ],
    aboutQueries: [
      "professional estate agent in modern property holding keys",
      "trusted real estate agency team in contemporary property lounge"
    ],
    serviceQueries: {
      "Property Sales & Buyer Representation": "modern luxury house exterior architecture for sale",
      "Rental Letting & Tenant Management": "stylish apartment interior living room natural light",
      "Commercial Property Leasing": "modern glass commercial office building exterior",
      "Free Market Property Valuations": "real estate valuation documents keys contract on table"
    },
    galleryThemes: [
      "Architectural facade of modern designer villa with pool",
      "Spacious master suite with panoramic garden balcony",
      "Gourmet kitchen with waterfall quartz island and barstools",
      "Open concept dining area with sculptural pendant chandelier",
      "Sun-drenched private patio and landscaped courtyard"
    ],
    curatedImages: [
      {
        id: "prop_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Breathtaking modern luxury home with manicured landscape and warm interior lighting",
        photographer: "R Architecture",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "luxury modern house exterior architecture",
        industry: "Real Estate",
        relevanceScore: 98,
        explanation: "Uncompromising premium real estate presentation with wide 16:9 ratio.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "prop_srv_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Modern luxury home patio with outdoor pool and architecture",
        photographer: "R Architecture",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "modern luxury home architecture pool",
        industry: "Real Estate",
        relevanceScore: 94,
        explanation: "Demonstrates prime residential property listings.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      }
    ]
  },

  school: {
    industry: "School",
    aliases: ["school", "preschool", "education", "academy", "college", "kindergarten", "training", "tutoring", "creche", "learning centre"],
    defaultStyle: "Warm",
    subcategory: "Primary, Secondary & Early Childhood Learning",
    services: ["Holistic Academic Curriculum", "Early Childhood Development (ECD)", "STEM & Digital Literacy Labs", "Sports & Extracurricular Development"],
    audience: ["Parents", "Students", "Guardians"],
    preferredSubjects: ["enthusiastic students learning in modern classroom", "teacher guiding engaged school pupils with books", "bright well-equipped science or computer lab", "school library with children reading", "outdoor school playground and sports pitch"],
    avoidSubjects: ["generic corporate boardroom", "auto repair garage", "nightclub", "hospital surgery"],
    heroQueries: [
      "engaged diverse students and teacher in bright modern educational classroom with books",
      "inspiring school campus building with students collaborating outdoors",
      "children learning in interactive well-equipped classroom environment"
    ],
    aboutQueries: [
      "dedicated educator teacher smiling with lesson materials in classroom",
      "vibrant school learning hall with student artwork on walls"
    ],
    serviceQueries: {
      "Holistic Academic Curriculum": "students reading books classroom educational learning",
      "Early Childhood Development (ECD)": "kindergarten children learning building blocks colorful classroom",
      "STEM & Digital Literacy Labs": "students in modern computer laboratory technology learning",
      "Sports & Extracurricular Development": "school students playing sports on grass field athletics"
    },
    galleryThemes: [
      "Students actively raising hands during interactive lesson",
      "Modern STEM computer lab with interactive monitors",
      "Spacious school library stocked with educational books",
      "Outdoor athletics field and sports pavilion",
      "Creative art studio showcasing colorful student projects"
    ],
    curatedImages: [
      {
        id: "school_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Bright, welcoming, and well-equipped modern classroom learning environment",
        photographer: "Ksenia Chernaya",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "modern school classroom learning education",
        industry: "School",
        relevanceScore: 97,
        explanation: "Accurately conveys academic excellence and vibrant learning spaces.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "school_srv_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Young students engaged in creative educational activities",
        photographer: "Element5 Digital",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "education classroom children learning",
        industry: "School",
        relevanceScore: 94,
        explanation: "Exemplifies early childhood and primary education curriculum.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      }
    ]
  },

  church: {
    industry: "Church",
    aliases: ["church", "worship", "ministry", "fellowship", "congregation", "chapel", "faith", "parish", "cathedral", "religious"],
    defaultStyle: "Warm",
    subcategory: "Faith Community & Worship Fellowship",
    services: ["Weekly Sunday Worship Celebrations", "Youth & Children's Ministry", "Community Outreach & Food Pantry", "Biblical Counseling & Life Groups"],
    audience: ["Families", "Community Members", "Youth", "Worshippers"],
    preferredSubjects: ["bright welcoming worship sanctuary interior with warm ambient stage lighting", "church congregation with hands raised in respectful worship", "friendly community fellowship in church courtyard", "open Bible with warm light", "worship musical instruments on stage"],
    avoidSubjects: ["generic corporate suit meetings", "construction wreckage", "auto mechanics", "nightclubs"],
    heroQueries: [
      "warm welcoming church worship sanctuary with beautiful ambient lighting and stage",
      "congregation worshipping together in bright modern church auditorium",
      "open holy bible on wooden communion table in serene church sanctuary"
    ],
    aboutQueries: [
      "friendly pastoral ministry team in welcoming church foyer",
      "community fellowship gathering on church lawn with smiling members"
    ],
    serviceQueries: {
      "Weekly Sunday Worship Celebrations": "church worship service stage lighting sanctuary",
      "Youth & Children's Ministry": "church youth group fellowship gathering smiling",
      "Community Outreach & Food Pantry": "volunteers serving food community outreach charity",
      "Biblical Counseling & Life Groups": "open bible on wooden table sunlight peaceful"
    },
    galleryThemes: [
      "Modern worship stage with acoustic guitar and warm soft lighting",
      "Community members embracing with smiles in church foyer",
      "Vibrant children's Sunday school classroom with bible story charts",
      "Outreach team packing charity care parcels for local families",
      "Inspiring church architecture with sunlight streaming through windows"
    ],
    curatedImages: [
      {
        id: "church_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Beautiful and serene church sanctuary with warm ambient lighting and wooden pews",
        photographer: "Karl Fredrickson",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "church sanctuary interior worship wooden pews",
        industry: "Church",
        relevanceScore: 98,
        explanation: "Communicates reverence, peaceful community, and welcoming worship.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "church_srv_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Open Holy Bible on wooden table with warm golden sunlight",
        photographer: "Aaron Burden",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "open bible wooden table sunlight worship",
        industry: "Church",
        relevanceScore: 95,
        explanation: "Represents biblical foundation, study groups, and prayer life.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      }
    ]
  },

  football_club: {
    industry: "Football Club",
    aliases: ["football", "soccer", "sports club", "sports", "rugby", "cricket", "basketball", "athletics", "gym", "fitness"],
    defaultStyle: "Bold",
    subcategory: "Athletics, Youth Academy & Competitive League",
    services: ["Senior Premier Team Matchdays", "Youth Development Football Academy", "Official Club Merchandise & Kits", "Matchday Ticket Bookings & Season Passes"],
    audience: ["Supporters", "Youth Players", "Parents", "Sports Enthusiasts"],
    preferredSubjects: ["football players training or competing on lush green pitch", "close up of soccer ball on penalty spot under stadium lights", "youth soccer team celebration in team jerseys", "modern sports club training ground", "football boot striking ball"],
    avoidSubjects: ["generic corporate cubicles", "hospitals", "auto repairs", "plumbers"],
    heroQueries: [
      "soccer players training on lush green football pitch under stadium floodlights",
      "football soccer ball resting on grass pitch before kickoff in modern stadium",
      "youth soccer academy team running drills with cones on sports field"
    ],
    aboutQueries: [
      "dedicated football coach instructing players with tactical board on pitch",
      "sports club trophy cabinet and team history jerseys"
    ],
    serviceQueries: {
      "Senior Premier Team Matchdays": "soccer ball in goal net stadium match celebration",
      "Youth Development Football Academy": "youth soccer players running training drills grass field",
      "Official Club Merchandise & Kits": "football jerseys hanging in modern team locker room",
      "Matchday Ticket Bookings & Season Passes": "excited sports supporters in stadium stands cheering"
    },
    galleryThemes: [
      "Dynamic action shot of striker shooting ball towards goal",
      "Soccer boots and training equipment lined up on sideline",
      "Team huddle and motivational speech before match whistle",
      "Locker room with neatly arranged jerseys and captain armband",
      "Lush grass turf with sharp painted white field boundary lines"
    ],
    curatedImages: [
      {
        id: "fc_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Soccer ball on lush grass pitch under bright stadium floodlights",
        photographer: "Connor Coyne",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "soccer football pitch stadium floodlights ball",
        industry: "Football Club",
        relevanceScore: 98,
        explanation: "Instantly communicates competitive sports, pitch excellence, and match excitement.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      },
      {
        id: "fc_srv_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=400&q=80",
        fullUrl: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
        width: 800,
        height: 600,
        alt: "Football player kicking ball in action on green pitch",
        photographer: "Fauzan Saari",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "services",
        query: "football player kicking ball match action",
        industry: "Football Club",
        relevanceScore: 95,
        explanation: "Showcases active matchday and academy player training.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      }
    ]
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
    curatedImages: [
      {
        id: "gen_hero_1",
        provider: "curated_taxonomy",
        sourceUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
        thumbnailUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
        fullUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80",
        width: 1600,
        height: 900,
        alt: "Clean and modern professional workspace with expansive natural light",
        photographer: "Jason Goodman",
        license: "Unsplash License - Free Commercial Use",
        usageType: "stock",
        section: "hero",
        query: "modern clean professional business office",
        industry: "Professional Services",
        relevanceScore: 90,
        explanation: "Provides a crisp, reliable, and modern commercial backdrop.",
        orientation: "landscape",
        createdAt: "2026-08-29T10:00:00Z"
      }
    ]
  }
};

export function matchIndustryTaxonomy(rawCategory: string = ""): IndustryVisualRule {
  const norm = rawCategory.toLowerCase().trim();
  
  for (const key of Object.keys(INDUSTRY_TAXONOMY)) {
    const rule = INDUSTRY_TAXONOMY[key];
    if (norm.includes(key)) return rule;
    for (const alias of rule.aliases) {
      if (norm.includes(alias) || alias.includes(norm)) {
        return rule;
      }
    }
  }

  // Check partial keyword associations
  if (norm.includes("pipe") || norm.includes("drain") || norm.includes("water") || norm.includes("leak")) {
    return INDUSTRY_TAXONOMY.plumber;
  }
  if (norm.includes("food") || norm.includes("cafe") || norm.includes("bistro") || norm.includes("grill") || norm.includes("dine") || norm.includes("bar") || norm.includes("catering") || norm.includes("bakery")) {
    return INDUSTRY_TAXONOMY.restaurant;
  }
  if (norm.includes("build") || norm.includes("construct") || norm.includes("contractor") || norm.includes("roof") || norm.includes("carpenter") || norm.includes("masonry") || norm.includes("paving")) {
    return INDUSTRY_TAXONOMY.construction;
  }
  if (norm.includes("hair") || norm.includes("salon") || norm.includes("beauty") || norm.includes("barber") || norm.includes("nails") || norm.includes("spa") || norm.includes("cosmetic")) {
    return INDUSTRY_TAXONOMY.beauty_salon;
  }
  if (norm.includes("auto") || norm.includes("mechanic") || norm.includes("car") || norm.includes("garage") || norm.includes("tyre") || norm.includes("workshop")) {
    return INDUSTRY_TAXONOMY.mechanic;
  }
  if (norm.includes("hotel") || norm.includes("lodge") || norm.includes("guest") || norm.includes("room") || norm.includes("stay") || norm.includes("resort") || norm.includes("tourism")) {
    return INDUSTRY_TAXONOMY.hotel;
  }
  if (norm.includes("law") || norm.includes("legal") || norm.includes("attorney") || norm.includes("advocate") || norm.includes("solicitor") || norm.includes("notary")) {
    return INDUSTRY_TAXONOMY.law_firm;
  }
  if (norm.includes("health") || norm.includes("clinic") || norm.includes("doctor") || norm.includes("medical") || norm.includes("dental") || norm.includes("dentist") || norm.includes("pharmacy")) {
    return INDUSTRY_TAXONOMY.medical_clinic;
  }
  if (norm.includes("property") || norm.includes("estate") || norm.includes("realtor") || norm.includes("house") || norm.includes("realty")) {
    return INDUSTRY_TAXONOMY.real_estate;
  }
  if (norm.includes("school") || norm.includes("learn") || norm.includes("college") || norm.includes("preschool") || norm.includes("tutor") || norm.includes("academy")) {
    return INDUSTRY_TAXONOMY.school;
  }
  if (norm.includes("church") || norm.includes("worship") || norm.includes("ministry") || norm.includes("faith") || norm.includes("chapel") || norm.includes("pastor")) {
    return INDUSTRY_TAXONOMY.church;
  }
  if (norm.includes("football") || norm.includes("soccer") || norm.includes("sport") || norm.includes("club") || norm.includes("gym") || norm.includes("fitness")) {
    return INDUSTRY_TAXONOMY.football_club;
  }

  return INDUSTRY_TAXONOMY.general_business;
}
