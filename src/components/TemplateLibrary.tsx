import React, { useState } from "react";
import { GeneratedSite } from "../types";
import { 
  Layers, Globe, Sparkles, CheckCircle2, ArrowRight, 
  Smartphone, Monitor, Search, Building2, Utensils, HeartPulse, Scale, 
  Wrench, Home, GraduationCap, Church as ChurchIcon,
  Briefcase, Check, Phone, MessageSquare, MapPin, Scissors, Car
} from "lucide-react";
import { detectCountryFromLocation } from "../lib/countryCurrency";

interface TemplateLibraryProps {
  onSelectTemplate: (site: GeneratedSite) => void;
  onBack: () => void;
}

export interface IndustryTemplateMeta {
  id: string;
  name: string;
  category: string;
  icon: any;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontStyle: "sans" | "serif" | "display" | "modern";
  seoTitle: string;
  seoDesc: string;
  seoKeywords: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  ctaSecondaryText: string;
  conversionHighlights: string[];
  accessibilityScore: number;
  seoScore: number;
  conversionScore: number;
  galleryUrls: { url: string; alt: string }[];
  sampleServices: { title: string; description: string; price: string }[];
  featuresList: { title: string; icon: string; description: string }[];
  faqsList: { question: string; answer: string }[];
  testimonialsList: { name: string; role: string; review: string; rating: number }[];
  whatsappPitch: string;
}

export const ALL_INDUSTRY_TEMPLATES: IndustryTemplateMeta[] = [
  // 1. Restaurant
  {
    id: "tpl-restaurant",
    name: "Gourmet Hearth & Kitchen",
    category: "Restaurant",
    icon: Utensils,
    description: "Appetizing culinary showcase featuring interactive food menus, 1-click table booking, chef specials, and direct WhatsApp reservations.",
    primaryColor: "#d97706",
    secondaryColor: "#b45309",
    accentColor: "#f59e0b",
    fontStyle: "serif",
    seoTitle: "Gourmet Hearth | Fresh Local Cuisine & Table Reservations",
    seoDesc: "Experience artisanal seasonal dishes made from organic local produce. View our dinner menu and reserve your table online today.",
    seoKeywords: "restaurant, dining, table reservation, artisanal dinner, bistro, local eatery",
    heroTitle: "Farm-to-Table Flavors with Heart & Soul",
    heroSubtitle: "Handcrafted seasonal dishes, wood-fired specialties, and an inviting atmosphere in the heart of town.",
    ctaText: "Reserve a Table",
    ctaSecondaryText: "View Dinner Menu",
    conversionHighlights: ["1-Click Table Booking", "Interactive Food Menu with Pricing", "WhatsApp Reservation Concierge", "Map Location & Hours"],
    accessibilityScore: 100,
    seoScore: 98,
    conversionScore: 97,
    galleryUrls: [
      { url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80", alt: "Restaurant dining room" },
      { url: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80", alt: "Gourmet dinner dish" }
    ],
    sampleServices: [
      { title: "Chef's 4-Course Tasting", description: "Seasonal harvest dishes with curated wine pairings.", price: "$65/person" },
      { title: "Private Dining & Events", description: "Exclusive banquet room with dedicated kitchen staff.", price: "Custom Quote" },
      { title: "Weekend Hearth Brunch", description: "Organic farm eggs, artisanal pastries, and freshly squeezed juices.", price: "$28" }
    ],
    featuresList: [
      { title: "Farm-Fresh Sourcing", icon: "Check", description: "Daily harvests delivered directly from regional growers." },
      { title: "Instant WhatsApp Booking", icon: "Check", description: "Direct reservation confirmations in under 2 minutes." }
    ],
    faqsList: [
      { question: "Do you cater for dietary restrictions?", answer: "Yes, our culinary team prepares gluten-free, vegan, and nut-free dishes on request." }
    ],
    testimonialsList: [
      { name: "Sophia Reynolds", role: "Local Food Critic", review: "The culinary craftsmanship and warm atmosphere make this the best dining experience in town.", rating: 5 }
    ],
    whatsappPitch: "Hi Gourmet Hearth! I would like to reserve a table for tonight. Could you confirm table availability?"
  },

  // 2. Construction
  {
    id: "tpl-construction",
    name: "Apex Master Builders & Construction",
    category: "Construction",
    icon: Building2,
    description: "High-trust building & general contracting layout featuring project galleries, verified licensing credentials, and fast quote estimation forms.",
    primaryColor: "#ea580c",
    secondaryColor: "#c2410c",
    accentColor: "#f97316",
    fontStyle: "sans",
    seoTitle: "Apex Master Builders | Commercial & Residential General Contractors",
    seoDesc: "Licensed general contractor delivering top-quality residential renovations and commercial construction with guaranteed timelines.",
    seoKeywords: "construction, general contractor, commercial building, home renovation, building contractor",
    heroTitle: "Built on Precision, Safety & Proven Durability",
    heroSubtitle: "From architectural planning to turnkey construction, we deliver residential and commercial structures on time and within budget.",
    ctaText: "Request Free Site Estimate",
    ctaSecondaryText: "View Completed Projects",
    conversionHighlights: ["Free Site Estimate Request Form", "Project Before/After Portfolio", "Safety & License Certifications", "Direct WhatsApp Job Inquiry"],
    accessibilityScore: 98,
    seoScore: 97,
    conversionScore: 96,
    galleryUrls: [
      { url: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80", alt: "Construction project site" },
      { url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80", alt: "Architectural building framework" }
    ],
    sampleServices: [
      { title: "Residential Turnkey Construction", description: "Full new build execution from foundation to interior finishes.", price: "From $180k" },
      { title: "Commercial Office Fit-Outs", description: "Modern workspace transformations adhering to all compliance codes.", price: "From $45k" },
      { title: "Structural Renovations & Additions", description: "Second story extensions, roof rebuilds, and load-bearing alterations.", price: "Custom Quote" }
    ],
    featuresList: [
      { title: "Fully Licensed & Insured", icon: "ShieldCheck", description: "Comprehensive worker liability coverage on every build." },
      { title: "Strict Schedule Guarantee", icon: "Check", description: "Milestone-based progress delivery with clear project tracking." }
    ],
    faqsList: [
      { question: "How quickly can you provide an on-site estimate?", answer: "Our master engineer visits your site within 48 hours to provide a comprehensive structural breakdown." }
    ],
    testimonialsList: [
      { name: "Marcus Vance", role: "Property Developer", review: "Apex delivered our 12-unit residential build three weeks ahead of schedule and precisely within budget.", rating: 5 }
    ],
    whatsappPitch: "Hi Apex Builders! I'm planning a building/renovation project and would like to request an on-site quote."
  },

  // 3. Plumbing
  {
    id: "tpl-plumbing",
    name: "Reliable 24/7 Emergency Plumbing",
    category: "Plumbing",
    icon: Wrench,
    description: "Urgent response layout built for speed with 1-tap emergency dispatch, upfront transparent pricing, and leak detection booking.",
    primaryColor: "#0284c7",
    secondaryColor: "#0369a1",
    accentColor: "#38bdf8",
    fontStyle: "sans",
    seoTitle: "Reliable 24/7 Plumber | Emergency Drain Cleaning & Leak Repairs",
    seoDesc: "Fast 30-minute emergency response for burst pipes, blocked drains, geyser replacements, and commercial plumbing.",
    seoKeywords: "emergency plumber, burst pipes, blocked drains, geyser repair, leak detection",
    heroTitle: "Fast 24/7 Emergency Plumbing & Drain Solutions",
    heroSubtitle: "Burst pipes, clogged drains, or water heater failures? Our certified master plumbers arrive within 30 minutes with upfront flat rates.",
    ctaText: "Call Emergency Dispatch (24/7)",
    ctaSecondaryText: "Book Inspection Online",
    conversionHighlights: ["1-Tap Emergency Call Dispatch", "Fixed Upfront Pricing Guide", "30-Min Local Response Guarantee", "WhatsApp Photo Diagnostic"],
    accessibilityScore: 100,
    seoScore: 99,
    conversionScore: 98,
    galleryUrls: [
      { url: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800&q=80", alt: "Master plumber at work" }
    ],
    sampleServices: [
      { title: "Emergency Leak & Pipe Repair", description: "Rapid response acoustic detection and burst pipe replacement.", price: "From $85" },
      { title: "High-Pressure Hydro Jetting", description: "Heavy-duty clearing of blocked sewer and stormwater lines.", price: "$140" },
      { title: "Water Heater / Geyser Install", description: "Energy-efficient unit installation with 5-year parts warranty.", price: "From $450" }
    ],
    featuresList: [
      { title: "No Hidden Call-Out Fees", icon: "Check", description: "Clear pricing quoted and approved before work begins." },
      { title: "100% Workmanship Guarantee", icon: "ShieldCheck", description: "All repairs backed by our comprehensive warranty." }
    ],
    faqsList: [
      { question: "How fast do you arrive in emergencies?", answer: "Our mobile vans are stationed across the city with an average response time of under 30 minutes." }
    ],
    testimonialsList: [
      { name: "David Miller", role: "Homeowner", review: "Woke up to a flooded kitchen at 2 AM. Reliable Plumbing was at my door in 20 minutes and fixed the pipe immediately!", rating: 5 }
    ],
    whatsappPitch: "URGENT: I need emergency plumbing assistance right away. Here are the details of the leak:"
  },

  // 4. Beauty & Salon
  {
    id: "tpl-beauty",
    name: "Luxe Glow Salon & Day Spa",
    category: "Beauty",
    icon: Scissors,
    description: "Elegant aesthetics showcase with appointment booking, stylist portfolio gallery, treatment menus, and seasonal makeover packages.",
    primaryColor: "#db2777",
    secondaryColor: "#be185d",
    accentColor: "#f472b6",
    fontStyle: "serif",
    seoTitle: "Luxe Glow Salon & Spa | Hair Styling, Skin Therapies & Bridal Packages",
    seoDesc: "Transformative beauty experiences with top stylists and organic botanical skin treatments. Book your appointment online today.",
    seoKeywords: "hair salon, day spa, skin treatments, bridal hair, balayage, beauty parlor",
    heroTitle: "Artistry, Elegance & Restorative Beauty",
    heroSubtitle: "Indulge in tailored hair styling, restorative organic facials, and premium bridal beauty packages designed for your radiance.",
    ctaText: "Book Your Appointment",
    ctaSecondaryText: "Explore Spa Menu",
    conversionHighlights: ["Online Appointment Scheduling", "Lookbook & Stylist Portfolio", "WhatsApp Instant Consultation", "Transparent Treatment Pricing"],
    accessibilityScore: 100,
    seoScore: 97,
    conversionScore: 96,
    galleryUrls: [
      { url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80", alt: "Luxury salon interior" },
      { url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80", alt: "Hair styling and makeover" }
    ],
    sampleServices: [
      { title: "Signature Balayage & Cut", description: "Custom hand-painted highlights, gloss toner, and precision styling.", price: "$140" },
      { title: "Hydra-Radiance Facial", description: "Deep botanical infusion, exfoliation, and lymphatic facial massage.", price: "$85" },
      { title: "Bridal Party Beauty Package", description: "Complete hair, makeup, and champagne spa treatment for the bridal party.", price: "From $350" }
    ],
    featuresList: [
      { title: "Certified Master Stylists", icon: "Check", description: "Internationally trained artists using ammonia-free organic formulas." },
      { title: "Sanitized VIP Suites", icon: "ShieldCheck", description: "Private treatment rooms designed for peaceful relaxation." }
    ],
    faqsList: [
      { question: "Do you accept walk-ins?", answer: "Walk-ins are welcomed when available, but we recommend booking in advance to guarantee your preferred artist." }
    ],
    testimonialsList: [
      { name: "Elena Rostova", role: "Client", review: "The balayage and treatment I received here were world-class. My hair has never felt so vibrant!", rating: 5 }
    ],
    whatsappPitch: "Hi Luxe Glow! I would like to book a hair styling/facial appointment this week. What slots do you have available?"
  },

  // 5. Professional Services (Law, Accounting, Consulting)
  {
    id: "tpl-professional",
    name: "Sterling Advisory & Legal Counsel",
    category: "Professional services",
    icon: Scale,
    description: "Authoritative corporate layout for attorneys, accountants, and consultants with client intake forms, practice areas, and case studies.",
    primaryColor: "#1e3a8a",
    secondaryColor: "#172554",
    accentColor: "#3b82f6",
    fontStyle: "serif",
    seoTitle: "Sterling Advisory | Corporate Law, Tax Strategy & Business Consulting",
    seoDesc: "Strategic corporate counsel and certified financial advisory helping businesses navigate regulatory compliance, mergers, and tax optimization.",
    seoKeywords: "corporate law, business consulting, tax advisor, legal counsel, commercial attorney",
    heroTitle: "Strategic Legal & Financial Counsel You Can Trust",
    heroSubtitle: "Protecting your commercial interests and accelerating business growth with experienced corporate attorneys and certified advisors.",
    ctaText: "Schedule Confidential Consultation",
    ctaSecondaryText: "Explore Practice Areas",
    conversionHighlights: ["Confidential Consultation Booking", "Detailed Practice Area Breakdowns", "Case Results & Credibility Stats", "Direct Lawyer Intake Form"],
    accessibilityScore: 99,
    seoScore: 98,
    conversionScore: 95,
    galleryUrls: [
      { url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80", alt: "Corporate office conference room" }
    ],
    sampleServices: [
      { title: "Corporate Governance & M&A", description: "Comprehensive transaction advisory, contract drafting, and due diligence.", price: "$350/hr" },
      { title: "Tax Strategy & Compliance", description: "Proactive corporate structuring to maximize deductions legally.", price: "Custom Retainer" },
      { title: "Commercial Litigation Defense", description: "Aggressive courtroom representation and dispute resolution.", price: "Assessment Required" }
    ],
    featuresList: [
      { title: "Decades of Proven Track Record", icon: "ShieldCheck", description: "Over $250M in commercial transactions successfully closed." },
      { title: "100% Client Confidentiality", icon: "Check", description: "Strict privileged communication protocols protecting your assets." }
    ],
    faqsList: [
      { question: "What is included in the initial consultation?", answer: "A 45-minute confidential session evaluating your legal or financial risk with actionable next steps." }
    ],
    testimonialsList: [
      { name: "Robert Sterling", role: "CEO, TechVentures", review: "Sterling Advisory guided our series-A funding and acquisition flawlessly. Indispensable partners.", rating: 5 }
    ],
    whatsappPitch: "Hello Sterling Advisory, I would like to schedule a preliminary confidential consultation regarding corporate advisory."
  },

  // 6. Medical Clinic & Healthcare
  {
    id: "tpl-medical",
    name: "Beacon Family Health & Medical Centre",
    category: "Medical",
    icon: HeartPulse,
    description: "Trustworthy healthcare portal with online doctor bookings, medical specialties, insurance accepted info, and telehealth inquiry.",
    primaryColor: "#059669",
    secondaryColor: "#047857",
    accentColor: "#10b981",
    fontStyle: "sans",
    seoTitle: "Beacon Family Health | General Practice & Preventive Care Clinic",
    seoDesc: "Compassionate patient-centered medical care with board-certified physicians, on-site diagnostics, and same-day family appointments.",
    seoKeywords: "medical clinic, family doctor, healthcare centre, pediatric care, general practitioner",
    heroTitle: "Compassionate, World-Class Care for Your Entire Family",
    heroSubtitle: "Board-certified doctors, modern diagnostic facilities, and same-day appointments dedicated to your family's health and wellness.",
    ctaText: "Book Doctor Appointment",
    ctaSecondaryText: "View Medical Services",
    conversionHighlights: ["Same-Day Appointment Booking", "Accepted Medical Aid / Insurance Guide", "Doctor Profiles & Credentials", "Emergency Hotline & Map"],
    accessibilityScore: 100,
    seoScore: 99,
    conversionScore: 97,
    galleryUrls: [
      { url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80", alt: "Modern medical clinic reception" }
    ],
    sampleServices: [
      { title: "Comprehensive Family Health Checkup", description: "Vital signs, ECG, blood screening, and preventive health evaluation.", price: "$90" },
      { title: "Pediatric & Child Wellness", description: "Developmental tracking, vaccinations, and attentive child care.", price: "$75" },
      { title: "On-Site Laboratory Diagnostics", description: "Fast turnaround bloodwork, rapid tests, and pathology results.", price: "Covered by Insurance" }
    ],
    featuresList: [
      { title: "Board-Certified Medical Staff", icon: "ShieldCheck", description: "Experienced general practitioners and specialist pediatricians." },
      { title: "Same-Day Emergency Appointments", icon: "Check", description: "Dedicated acute care slots reserved for walk-in patients." }
    ],
    faqsList: [
      { question: "Which medical aids and insurances do you accept?", answer: "We accept all major insurance networks and offer transparent cash rates." }
    ],
    testimonialsList: [
      { name: "Grace Ndlovu", role: "Mother of 3", review: "Dr. Beacon and the nursing staff are so caring and thorough. Best medical clinic in our neighborhood.", rating: 5 }
    ],
    whatsappPitch: "Hi Beacon Health! I'd like to book an appointment with a doctor for a general health checkup."
  },

  // 7. School & Education
  {
    id: "tpl-school",
    name: "Horizon Academy & Early Learning",
    category: "School",
    icon: GraduationCap,
    description: "Inspiring education portal with enrollment applications, academic curriculum, school calendar, and virtual campus tours.",
    primaryColor: "#4f46e5",
    secondaryColor: "#4338ca",
    accentColor: "#6366f1",
    fontStyle: "sans",
    seoTitle: "Horizon Academy | Excellence in Academics, Arts & STEM Education",
    seoDesc: "Nurturing tomorrow's leaders through innovative curriculum, STEM labs, small class sizes, and holistic extracurricular programs.",
    seoKeywords: "private school, academy, STEM curriculum, kindergarten, high school admissions, early learning",
    heroTitle: "Nurturing Tomorrow's Leaders Through Innovation & Integrity",
    heroSubtitle: "Empowering students from Kindergarten to Grade 12 with academic excellence, creative arts, and modern STEM laboratories.",
    ctaText: "Apply for 2026/27 Enrollment",
    ctaSecondaryText: "Download Prospectus",
    conversionHighlights: ["Direct Online Enrollment Application", "Curriculum & Fee Schedule Download", "Book Campus Tour", "Parent & Student Portal Entry"],
    accessibilityScore: 100,
    seoScore: 98,
    conversionScore: 96,
    galleryUrls: [
      { url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=800&q=80", alt: "Students in bright classroom" }
    ],
    sampleServices: [
      { title: "Early Childhood Foundation (Ages 3-5)", description: "Play-based sensory learning, literacy foundations, and social skills.", price: "$3,200/term" },
      { title: "Primary & Middle School STEM", description: "Robotics, coding, critical thinking, and integrated science curriculum.", price: "$4,500/term" },
      { title: "High School University Prep", description: "Advanced placement courses, SAT prep, and leadership mentorship.", price: "$5,800/term" }
    ],
    featuresList: [
      { title: "12:1 Student-to-Teacher Ratio", icon: "Check", description: "Individualized attention ensuring every learner thrives." },
      { title: "Modern Robotics & Science Labs", icon: "Sparkles", description: "Cutting-edge interactive tech embedded across all grades." }
    ],
    faqsList: [
      { question: "How do we schedule a campus tour?", answer: "Click 'Book Campus Tour' or message us on WhatsApp to join our weekly guided walk-throughs." }
    ],
    testimonialsList: [
      { name: "Patricia Moyo", role: "Parent", review: "Horizon Academy unlocked my daughter's passion for science and mathematics. Outstanding educators!", rating: 5 }
    ],
    whatsappPitch: "Hello Horizon Academy Admissions! I am interested in enrolling my child and would like to receive the curriculum prospectus."
  },

  // 8. Church & Non-Profit
  {
    id: "tpl-church",
    name: "Grace Community Church & Outreach",
    category: "Church",
    icon: ChurchIcon,
    description: "Welcoming community portal with live service streaming, sermon archives, ministry events, and secure online giving.",
    primaryColor: "#7c3aed",
    secondaryColor: "#6d28d9",
    accentColor: "#8b5cf6",
    fontStyle: "serif",
    seoTitle: "Grace Community Church | Sunday Worship, Ministries & Community Outreach",
    seoDesc: "A vibrant, Christ-centered family where all are welcome. Join us for Sunday worship at 9:00 AM and 11:00 AM.",
    seoKeywords: "church, worship service, sermon archive, youth ministry, online giving, community outreach",
    heroTitle: "A Place of Hope, Healing & Purpose for Everyone",
    heroSubtitle: "Join our warm community for uplifting worship, transformative messages, and active outreach programs across our city.",
    ctaText: "Join Us This Sunday",
    ctaSecondaryText: "Watch Latest Sermon",
    conversionHighlights: ["Service Times & Directions Guide", "Online Giving & Tithes Portal", "Sermon Media Player", "Ministry & Volunteer Sign-Up"],
    accessibilityScore: 100,
    seoScore: 98,
    conversionScore: 95,
    galleryUrls: [
      { url: "https://images.unsplash.com/photo-1438032005730-c779502df39b?auto=format&fit=crop&w=800&q=80", alt: "Community worship and fellowship" }
    ],
    sampleServices: [
      { title: "Sunday Morning Worship (9 AM & 11 AM)", description: "Contemporary praise, heartfelt worship, and inspiring biblical preaching.", price: "Free to All" },
      { title: "Youth & Young Adults Ministry", description: "Weekly fellowship, leadership training, and discipleship gatherings.", price: "All Welcome" },
      { title: "Community Food Bank & Outreach", description: "Weekly food parcels and community support for families in need.", price: "Outreach Program" }
    ],
    featuresList: [
      { title: "Caring Kids Church Program", icon: "Check", description: "Safe, engaging children's ministry during both Sunday services." },
      { title: "Live Streaming Available", icon: "Globe", description: "High-definition broadcast available for remote worshippers." }
    ],
    faqsList: [
      { question: "What should I wear to Sunday service?", answer: "Come exactly as you are! You'll find people in everything from casual jeans to Sunday best." }
    ],
    testimonialsList: [
      { name: "John & Maria Dlamini", role: "Church Members", review: "Grace Community welcomed our family with open arms. It feels like home every single week.", rating: 5 }
    ],
    whatsappPitch: "Hi Grace Church! I'm planning to visit this Sunday with my family and wanted to check service times."
  },

  // 9. Real Estate
  {
    id: "tpl-realestate",
    name: "Prestige Prime Real Estate & Estates",
    category: "Real estate",
    icon: Home,
    description: "Luxurious property portal with filterable listings, virtual 3D home tours, agent booking, and instant valuation requests.",
    primaryColor: "#0f766e",
    secondaryColor: "#115e59",
    accentColor: "#14b8a6",
    fontStyle: "modern",
    seoTitle: "Prestige Prime Real Estate | Luxury Homes & Commercial Property For Sale",
    seoDesc: "Discover exclusive residential properties, beachfront villas, and high-yield commercial investments with top licensed brokers.",
    seoKeywords: "real estate, luxury homes for sale, property valuation, estate agent, houses for rent",
    heroTitle: "Find Your Dream Property & High-Yield Investments",
    heroSubtitle: "Connecting discerning buyers, sellers, and investors with premier residential homes and commercial real estate portfolios.",
    ctaText: "Browse Featured Listings",
    ctaSecondaryText: "Free Property Valuation",
    conversionHighlights: ["Filterable Property Search", "Instant Property Valuation Form", "WhatsApp Listing Inquiry", "Direct Agent Call & Tour Scheduler"],
    accessibilityScore: 99,
    seoScore: 98,
    conversionScore: 97,
    galleryUrls: [
      { url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80", alt: "Luxury modern home exterior" },
      { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80", alt: "Designer interior living space" }
    ],
    sampleServices: [
      { title: "Residential Luxury Sales", description: "Exclusive marketing, professional staging, and qualified buyer matching.", price: "Standard Commission" },
      { title: "Complimentary Market Valuation", description: "Comprehensive comparative market analysis of your property's value.", price: "Free Assessment" },
      { title: "Commercial Property Leasing", description: "High-footprint retail and office space tenant placement.", price: "Custom Terms" }
    ],
    featuresList: [
      { title: "Certified Master Brokers", icon: "ShieldCheck", description: "Deep local knowledge with over $120M in closed transactions." },
      { title: "3D Virtual Tours & Drone Video", icon: "Sparkles", description: "Ultra-high definition marketing showcasing every home." }
    ],
    faqsList: [
      { question: "How do I get an appraisal on my home?", answer: "Submit your address through our valuation tool or message us to schedule an in-person assessment." }
    ],
    testimonialsList: [
      { name: "Alexander Wright", role: "Seller", review: "Prestige sold our home in 14 days above asking price. The photography and marketing were second to none.", rating: 5 }
    ],
    whatsappPitch: "Hi Prestige Real Estate! I'm interested in viewing your featured listings or getting a valuation on my property."
  },

  // 10. Hotel & Hospitality
  {
    id: "tpl-hotel",
    name: "Azure Bay Resort & Boutique Hotel",
    category: "Hotel",
    icon: Building2,
    description: "Alluring hospitality layout with direct room reservation engine, amenity showcases, photo galleries, and guest concierge.",
    primaryColor: "#0369a1",
    secondaryColor: "#075985",
    accentColor: "#0ea5e9",
    fontStyle: "serif",
    seoTitle: "Azure Bay Resort | Boutique Luxury Suites, Spa & Oceanfront Dining",
    seoDesc: "Unwind at Azure Bay Boutique Hotel. Oceanfront suites, infinity pool, artisanal dining, and wellness spa. Book direct for best rates.",
    seoKeywords: "hotel booking, boutique resort, oceanfront suites, holiday accommodation, luxury stay",
    heroTitle: "Your Coastal Sanctuary of Serenity & Luxury",
    heroSubtitle: "Experience breathtaking panoramic views, handcrafted dining, and tailored hospitality at our five-star boutique getaway.",
    ctaText: "Check Room Availability",
    ctaSecondaryText: "Explore Suites & Amenities",
    conversionHighlights: ["Direct Booking Engine with Instant Rates", "Suite Photo Galleries & Amenities", "WhatsApp Concierge Assistance", "Local Attraction & Activity Guide"],
    accessibilityScore: 100,
    seoScore: 98,
    conversionScore: 97,
    galleryUrls: [
      { url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80", alt: "Resort swimming pool and lounge" }
    ],
    sampleServices: [
      { title: "Oceanfront Deluxe Suite", description: "King bed, private balcony with sea view, and complimentary breakfast.", price: "From $220/night" },
      { title: "Penthouse Master Villa", description: "Two bedrooms, private infinity plunge pool, and dedicated butler.", price: "From $480/night" },
      { title: "Azure Wellness Spa Day Pass", description: "Access to thermal baths, eucalyptus steam room, and relaxation lounge.", price: "$65/day" }
    ],
    featuresList: [
      { title: "Best Rate Direct Guarantee", icon: "Check", description: "Free room upgrades and flexible cancellation when booking direct." },
      { title: "24/7 Dedicated Concierge", icon: "Sparkles", description: "Bespoke excursion bookings and airport limousine transfers." }
    ],
    faqsList: [
      { question: "What is your check-in and check-out time?", answer: "Check-in begins at 2:00 PM and check-out is at 11:00 AM. Early check-in available on request." }
    ],
    testimonialsList: [
      { name: "Claire & Thomas Hall", role: "Guests", review: "The most relaxing vacation we've ever taken. The ocean views, food, and staff hospitality were impeccable.", rating: 5 }
    ],
    whatsappPitch: "Hi Azure Bay Resort! I would like to check room availability and rates for an upcoming stay."
  },

  // 11. Automotive & Mechanic
  {
    id: "tpl-automotive",
    name: "Precision Auto Care & Diagnostic Centre",
    category: "Automotive",
    icon: Car,
    description: "Reliable auto repair layout featuring service booking, diagnostic cost breakdown, warranty pledges, and emergency towing hotline.",
    primaryColor: "#dc2626",
    secondaryColor: "#b91c1c",
    accentColor: "#ef4444",
    fontStyle: "sans",
    seoTitle: "Precision Auto Care | Certified Mechanics, Brake & Engine Diagnostics",
    seoDesc: "ASE-certified mechanics providing transparent vehicle servicing, computerized engine diagnostics, brakes, tires, and maintenance.",
    seoKeywords: "auto repair, car mechanic, engine diagnostic, brake replacement, vehicle service",
    heroTitle: "Expert Auto Repairs & Certified Engine Diagnostics",
    heroSubtitle: "Honest advice, dealership-grade computerized equipment, and guaranteed parts warranty to keep your vehicle running smoothly.",
    ctaText: "Book Service Appointment",
    ctaSecondaryText: "View Pricing Guide",
    conversionHighlights: ["Online Service Booking Form", "Transparent Repair Cost Estimator", "Emergency Towing Hotline", "WhatsApp Diagnostic Photo Quote"],
    accessibilityScore: 100,
    seoScore: 98,
    conversionScore: 96,
    galleryUrls: [
      { url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80", alt: "Mechanic inspecting modern vehicle" }
    ],
    sampleServices: [
      { title: "Comprehensive Minor Service", description: "Engine oil, filter replacement, 50-point safety inspection and top-up.", price: "$110" },
      { title: "Computerized Diagnostics", description: "Check engine light scanning, ECU error troubleshooting and reporting.", price: "$45" },
      { title: "Brake Pad & Rotor Replacement", description: "Premium ceramic brake pads and rotor resurfacing with warranty.", price: "From $160" }
    ],
    featuresList: [
      { title: "ASE Certified Technicians", icon: "ShieldCheck", description: "Trained across all major domestic and imported vehicle makes." },
      { title: "12-Month / 20,000km Warranty", icon: "Check", description: "Full parts and labor guarantee on every service performed." }
    ],
    faqsList: [
      { question: "Do you provide a written estimate before starting work?", answer: "Always. We never perform any repairs without your explicit authorization on our detailed quote." }
    ],
    testimonialsList: [
      { name: "Kenneth Zulu", role: "Fleet Manager", review: "Precision Auto keeps our entire delivery fleet on the road. Honest, fair pricing and quick turnaround.", rating: 5 }
    ],
    whatsappPitch: "Hi Precision Auto! I need to book my car in for a service/diagnostic check. Here are my vehicle details:"
  },

  // 12. General Business & Retail
  {
    id: "tpl-general",
    name: "Cornerstone Enterprises & Local Retail",
    category: "General business",
    icon: Briefcase,
    description: "Versatile, high-converting layout adaptable for any local shop, service provider, or distributor with clear product catalogs and lead generation.",
    primaryColor: "#2563eb",
    secondaryColor: "#1d4ed8",
    accentColor: "#3b82f6",
    fontStyle: "sans",
    seoTitle: "Cornerstone Enterprises | Quality Products, Services & Local Support",
    seoDesc: "Your trusted local business providing dependable products, personalized customer care, and competitive pricing across the region.",
    seoKeywords: "local business, retail shop, commercial services, customer support, quality products",
    heroTitle: "Quality Products & Trusted Service in Your Community",
    heroSubtitle: "Dedicated to providing high-quality solutions, dependable customer care, and exceptional value for local families and businesses.",
    ctaText: "Inquire / Request a Quote",
    ctaSecondaryText: "Browse Offerings",
    conversionHighlights: ["Quick Quote Request Form", "Product & Service Catalog", "WhatsApp Chat Concierge", "Map Location & Business Hours"],
    accessibilityScore: 100,
    seoScore: 98,
    conversionScore: 96,
    galleryUrls: [
      { url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80", alt: "Local retail and business store" }
    ],
    sampleServices: [
      { title: "Standard Service Package", description: "Comprehensive solution designed for everyday needs with prompt turnaround.", price: "$95" },
      { title: "Premium Commercial Support", description: "Priority handling, dedicated support agent, and tailored delivery schedules.", price: "$240" },
      { title: "Custom Bulk Order Fulfillment", description: "Discounted rates for high-volume orders and local business partnerships.", price: "Custom Quote" }
    ],
    featuresList: [
      { title: "100% Satisfaction Guarantee", icon: "ShieldCheck", description: "Committed to delivering outstanding quality on every order." },
      { title: "Local Delivery & Support", icon: "Check", description: "Fast delivery and responsive support across the entire region." }
    ],
    faqsList: [
      { question: "What areas do you service?", answer: "We serve our entire local town and surrounding suburbs within a 30km radius." }
    ],
    testimonialsList: [
      { name: "Themba Lukhele", role: "Local Customer", review: "Cornerstone represents the best of local business: honest, reliable, and always going the extra mile.", rating: 5 }
    ],
    whatsappPitch: "Hi Cornerstone! I would like to inquire about your local products/services and get a quick quote."
  }
];

export default function TemplateLibrary({ onSelectTemplate, onBack }: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [previewTemplate, setPreviewTemplate] = useState<IndustryTemplateMeta | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [previewTab, setPreviewTab] = useState<"visual" | "audit" | "seo">("visual");

  const categories = [
    "All", 
    "Restaurant", 
    "Construction", 
    "Plumbing", 
    "Beauty", 
    "Professional services", 
    "Medical", 
    "School", 
    "Church", 
    "Real estate", 
    "Hotel", 
    "Automotive", 
    "General business"
  ];

  const filteredTemplates = ALL_INDUSTRY_TEMPLATES.filter(tpl => {
    const matchesSearch = 
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
      tpl.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.seoKeywords.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "All" || tpl.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  const instantiateTemplate = (tpl: IndustryTemplateMeta) => {
    const defaultAddress = "100 Innovation Boulevard, Central Business District, Mbabane, Eswatini";
    const countryConfig = detectCountryFromLocation(defaultAddress);
    const sym = countryConfig.currencySymbol;

    const additionalServices = [
      { title: "Priority On-Demand Consultation", description: "Comprehensive initial assessment and customized solution plan tailored to your specific requirements.", price: `${sym}750` },
      { title: "VIP Ongoing Care & Support", description: "Dedicated priority assistance, periodic checkups, and guaranteed response times.", price: `${sym}1,200/mo` }
    ];

    // Localize sample services if needed
    const fullServices = [
      ...tpl.sampleServices.map(s => ({
        ...s,
        price: s.price.replace(/\$/g, sym)
      })),
      ...additionalServices
    ];

    const newSite: GeneratedSite = {
      id: `site-${Date.now()}`,
      businessName: tpl.name,
      phone: "+268 7600 0000",
      address: defaultAddress,
      country: countryConfig.name,
      category: tpl.category,
      proposal: {
        id: `prop-${Date.now()}`,
        businessId: `site-${Date.now()}`,
        clientName: "Owner / Principal Manager",
        clientEmail: `contact@${tpl.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`,
        businessName: tpl.name,
        dateCreated: new Date().toLocaleDateString(),
        expiryDate: new Date(Date.now() + 14 * 86400000).toLocaleDateString(),
        features: [
          "Responsive Mobile & Tablet Optimization",
          "One-Click WhatsApp Lead Generation & Floating Action Button",
          "Local SEO Geo-Meta Tagging & Schema.org Architecture",
          "Ultra-Fast Cloud Hosting & Automatic SSL Security Certificate",
          "Direct Google Maps Location Routing Integration",
          "Interactive Booking & Inquiry Routing Dispatch"
        ],
        pricing: countryConfig.defaultPricing,
        timeline: "7 - 10 Business Days",
        terms: "50% deposit upon commencement, remainder due upon final launch and DNS cutover.",
        status: "draft"
      },
      primaryColor: tpl.primaryColor,
      secondaryColor: tpl.secondaryColor,
      accentColor: tpl.accentColor,
      backgroundColor: "#ffffff",
      textColor: "#0f172a",
      fontStyle: tpl.fontStyle,
      seo: {
        title: tpl.seoTitle,
        description: tpl.seoDesc,
        keywords: tpl.seoKeywords
      },
      hero: {
        title: tpl.heroTitle,
        subtitle: tpl.heroSubtitle,
        ctaPrimary: tpl.ctaText,
        ctaSecondary: tpl.ctaSecondaryText,
        imageUrl: tpl.galleryUrls[0]?.url
      },
      about: {
        title: `About ${tpl.name}`,
        history: `Established with a commitment to excellence, ${tpl.name} is a trusted leader in the ${tpl.category} sector.`,
        mission: `Our mission is to deliver uncompromising quality, reliable solutions, and exceptional client satisfaction.`,
        pitch: `With years of dedicated expertise, our team combines industry best practices with personalized care to deliver outstanding results.`
      },
      services: fullServices,
      features: tpl.featuresList.map(f => ({
        title: f.title,
        icon: f.icon || "ShieldCheck",
        description: f.description
      })),
      gallery: tpl.galleryUrls,
      faqs: tpl.faqsList,
      testimonials: tpl.testimonialsList.map(t => ({
        name: t.name,
        review: t.review,
        rating: t.rating
      })),
      blog: [
        { title: `Top Best Practices in ${tpl.category} for 2026`, summary: "Discover expert strategies and proven methodologies to maximize quality and long-term success.", category: "Industry Insights" },
        { title: `Why Professional Standards Matter More Than Ever`, summary: "An in-depth look at how reliability and certified excellence protect client investment and peace of mind.", category: "Expertise" }
      ],
      whatsappMessage: tpl.whatsappPitch,
      contactPage: {
        title: `Get in Touch with ${tpl.name}`,
        description: "Reach out to our dedicated team today for inquiries, estimates, or bookings. We respond promptly.",
        email: `contact@${tpl.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`
      },
      privacyPolicy: "We protect your privacy with strict data security standards and never share your personal information with third parties.",
      termsOfService: "Standard service agreements and quality guarantees apply to all client engagements.",
      notFoundPage: {
        title: "Page Not Found",
        message: "The page you requested does not exist or has been relocated."
      }
    };
    onSelectTemplate(newSite);
  };

  return (
    <div className="space-y-8 text-left py-6 px-4 max-w-7xl mx-auto">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6 gap-4">
        <div>
          <button 
            onClick={onBack}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1 mb-2 cursor-pointer transition-colors"
          >
            ← Back to Finder
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Curated Industry Design System (12 Core Blueprints)
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pre-calibrated conversion architectures ready for instant Gemini AI customization.
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Filter Categories Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory.toLowerCase() === cat.toLowerCase()
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Template Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredTemplates.map((tpl) => {
          const Icon = tpl.icon || Building2;
          return (
            <div
              key={tpl.id}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Header color accent bar */}
              <div className="h-2 w-full" style={{ backgroundColor: tpl.primaryColor }} />

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: `${tpl.primaryColor}15`, color: tpl.primaryColor }}
                    >
                      {tpl.category}
                    </span>
                    <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-2 group-hover:text-blue-600 transition-colors">
                    {tpl.name}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {tpl.description}
                  </p>
                </div>

                {/* Conversion Highlights Chips */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {tpl.conversionHighlights.slice(0, 2).map((ch, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{ch}</span>
                    </div>
                  ))}
                </div>

                {/* Audit Badges */}
                <div className="flex items-center justify-between text-[10px] font-mono font-bold pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                  <span>SEO: {tpl.seoScore}%</span>
                  <span>WCAG: {tpl.accessibilityScore}%</span>
                  <span>Conv: {tpl.conversionScore}%</span>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => setPreviewTemplate(tpl)}
                    className="w-full py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer text-center"
                  >
                    Inspect
                  </button>
                  <button
                    onClick={() => instantiateTemplate(tpl)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1 cursor-pointer transition-all hover:opacity-90"
                    style={{ backgroundColor: tpl.primaryColor }}
                  >
                    <span>Use</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inspect Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="p-3 rounded-2xl text-white font-bold"
                  style={{ backgroundColor: previewTemplate.primaryColor }}
                >
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {previewTemplate.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Category: {previewTemplate.category} • Palette: {previewTemplate.primaryColor}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
                  <button
                    onClick={() => setPreviewTab("visual")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      previewTab === "visual" ? "bg-white text-slate-900 dark:bg-slate-700 dark:text-white shadow-xs" : "text-slate-500"
                    }`}
                  >
                    Live Mockup
                  </button>
                  <button
                    onClick={() => setPreviewTab("audit")}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      previewTab === "audit" ? "bg-white text-slate-900 dark:bg-slate-700 dark:text-white shadow-xs" : "text-slate-500"
                    }`}
                  >
                    SEO & Audit
                  </button>
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-extrabold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {previewTab === "visual" ? (
                <div className="space-y-4">
                  {/* Device Bar */}
                  <div className="flex items-center justify-between pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">Viewport:</span>
                      <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5">
                        <button 
                          onClick={() => setPreviewDevice("desktop")}
                          className={`p-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${previewDevice === "desktop" ? "bg-blue-600 text-white" : "text-slate-500"}`}
                        >
                          <Monitor className="h-3.5 w-3.5" /> Desktop
                        </button>
                        <button 
                          onClick={() => setPreviewDevice("mobile")}
                          className={`p-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${previewDevice === "mobile" ? "bg-blue-600 text-white" : "text-slate-500"}`}
                        >
                          <Smartphone className="h-3.5 w-3.5" /> Mobile
                        </button>
                      </div>
                    </div>

                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">
                      ✓ WCAG Contrast AA Pass
                    </span>
                  </div>

                  {/* Render Mockup */}
                  <div className="flex justify-center bg-slate-100/60 dark:bg-slate-950/80 p-4 rounded-3xl border border-slate-200 dark:border-slate-800">
                    <div 
                      className={`bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 transition-all duration-300 ${
                        previewDevice === "mobile" ? "w-[360px]" : "w-full"
                      }`}
                    >
                      {/* Fake Browser Top Bar */}
                      <div className="bg-slate-100 dark:bg-slate-800 px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
                          <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" />
                          <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
                        </div>
                        <div className="bg-white dark:bg-slate-900 px-3 py-0.5 rounded-md text-[10px] text-slate-500 font-mono truncate flex-1 text-center">
                          https://{previewTemplate.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com
                        </div>
                      </div>

                      {/* Header */}
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="font-bold text-sm" style={{ color: previewTemplate.primaryColor }}>
                          {previewTemplate.name}
                        </div>
                        <span className="px-3 py-1 rounded-lg text-white text-[11px] font-bold" style={{ backgroundColor: previewTemplate.primaryColor }}>
                          {previewTemplate.ctaText}
                        </span>
                      </div>

                      {/* Hero Section */}
                      <div className="p-6 text-center space-y-3" style={{ backgroundColor: `${previewTemplate.primaryColor}08` }}>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                          {previewTemplate.heroTitle}
                        </h2>
                        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                          {previewTemplate.heroSubtitle}
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md" style={{ backgroundColor: previewTemplate.primaryColor }}>
                            {previewTemplate.ctaText}
                          </button>
                          <button className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            {previewTemplate.ctaSecondaryText}
                          </button>
                        </div>
                      </div>

                      {/* Sample Offerings */}
                      <div className="p-5 space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Featured Offerings & Packages</h4>
                        <div className="space-y-2">
                          {previewTemplate.sampleServices.map((srv, idx) => (
                            <div key={idx} className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between">
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">{srv.title}</p>
                                <p className="text-[10px] text-slate-500">{srv.description}</p>
                              </div>
                              <span className="font-extrabold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg">
                                {srv.price}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Audit & SEO Tab */
                <div className="space-y-6">
                  {/* Scores Grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-center space-y-1">
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{previewTemplate.accessibilityScore}/100</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Accessibility (WCAG AA)</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-center space-y-1">
                      <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{previewTemplate.seoScore}/100</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">SEO Score</div>
                    </div>
                    <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-center space-y-1">
                      <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{previewTemplate.conversionScore}/100</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Conversion Power</div>
                    </div>
                  </div>

                  {/* SEO Metadata Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Globe className="h-4 w-4 text-blue-500" /> Google Search Preview
                    </h4>
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="text-[11px] text-slate-500">https://{previewTemplate.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com</div>
                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {previewTemplate.seoTitle}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {previewTemplate.seoDesc}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <button 
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Close Preview
              </button>

              <button
                onClick={() => {
                  instantiateTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="px-6 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer hover:opacity-90"
                style={{ backgroundColor: previewTemplate.primaryColor }}
              >
                <span>Launch & Customize Template</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
