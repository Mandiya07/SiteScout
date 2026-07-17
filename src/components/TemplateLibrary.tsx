import React, { useState } from "react";
import { GeneratedSite } from "../types";
import { 
  Layers, Globe, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, 
  Smartphone, Monitor, Search, Building2, Utensils, HeartPulse, Scale, 
  Wrench, Camera, Home, ShoppingBag, Dumbbell, GraduationCap, Church as ChurchIcon,
  TreePine, Trophy, Flag, Users as UsersIcon, Briefcase
} from "lucide-react";

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
  fontStyle: "sans" | "serif" | "display" | "modern";
  seoTitle: string;
  seoDesc: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaText: string;
  sampleServices: { title: string; description: string; price: string }[];
}

export const ALL_INDUSTRY_TEMPLATES: IndustryTemplateMeta[] = [
  {
    id: "tpl-restaurant",
    name: "Gourmet Bistro & Cafe",
    category: "Hospitality & Food",
    icon: Utensils,
    description: "Mouthwatering culinary layout featuring online menu cards, table reservations, and daily specials.",
    primaryColor: "#d97706",
    secondaryColor: "#b45309",
    fontStyle: "serif",
    seoTitle: "Gourmet Bistro | Fine Dining & Artisanal Coffee",
    seoDesc: "Experience exquisite artisanal dishes and specialty coffees in a warm, inviting atmosphere. Reserve your table online today.",
    heroTitle: "Artisanal Flavors Crafted with Passion",
    heroSubtitle: "Welcome to Gourmet Bistro. Experience hand-selected ingredients, farm-to-table dining, and unforgettable culinary moments.",
    ctaText: "Reserve a Table",
    sampleServices: [
      { title: "Chef's Tasting Menu 5-Course", description: "An exquisite journey through local seasonal flavors paired with fine wines.", price: "$85" },
      { title: "Artisanal Weekend Brunch", description: "Freshly baked pastries, organic farm eggs, and signature mimosas.", price: "$32" }
    ]
  },
  {
    id: "tpl-church",
    name: "Grace Community Church",
    category: "Faith & Community",
    icon: ChurchIcon,
    description: "Uplifting spiritual sanctuary layout featuring sermon archives, live streams, and community fellowship groups.",
    primaryColor: "#0284c7",
    secondaryColor: "#0369a1",
    fontStyle: "serif",
    seoTitle: "Grace Community Church | Worship & Fellowship",
    seoDesc: "Join our welcoming congregation every Sunday for uplifting worship, inspirational messages, and vibrant community programs.",
    heroTitle: "A Welcoming Home for Faith & Fellowship",
    heroSubtitle: "Join us this Sunday at 10:00 AM as we explore faith, community, and service together in an inspiring environment.",
    ctaText: "Plan Your Visit",
    sampleServices: [
      { title: "Sunday Morning Worship", description: "In-person and live-streamed contemporary worship service with choir and message.", price: "Free" },
      { title: "Youth Ministry & Teens", description: "Engaging weekly programs designed to nurture youth faith and leadership.", price: "Free" }
    ]
  },
  {
    id: "tpl-school",
    name: "Summit Academy & College",
    category: "Education & Learning",
    icon: GraduationCap,
    description: "Academic excellence portal showcasing admissions, course catalogs, student achievements, and campus tours.",
    primaryColor: "#4f46e5",
    secondaryColor: "#4338ca",
    fontStyle: "sans",
    seoTitle: "Summit Academy | Shaping Tomorrow's Leaders",
    seoDesc: "Discover world-class academic programs, dedicated faculty, and vibrant campus life at Summit Academy.",
    heroTitle: "Empowering Minds, Shaping Tomorrow",
    heroSubtitle: "Welcome to Summit Academy. We cultivate critical thinking, academic rigor, and character development in every student.",
    ctaText: "Apply For Admissions",
    sampleServices: [
      { title: "K-12 College Preparatory", description: "Comprehensive curriculum with AP courses, STEM labs, and arts integration.", price: "Tuition" },
      { title: "After-School Tutoring & Enrichment", description: "Targeted academic support and extracurricular coding, music, and athletics.", price: "$150/mo" }
    ]
  },
  {
    id: "tpl-medical",
    name: "Aura Health & Medical Clinic",
    category: "Healthcare & Wellness",
    icon: HeartPulse,
    description: "Professional medical facility layout with appointment booking, practitioner profiles, and patient care resources.",
    primaryColor: "#0d9488",
    secondaryColor: "#0f766e",
    fontStyle: "sans",
    seoTitle: "Aura Health Clinic | Trusted Family & Specialized Healthcare",
    seoDesc: "Providing compassionate, state-of-the-art medical care for individuals and families. Book your consultation online.",
    heroTitle: "Compassionate Care for Your Family's Health",
    heroSubtitle: "Aura Health Clinic offers comprehensive primary care, wellness screenings, and specialist consultations with zero waiting times.",
    ctaText: "Book Appointment",
    sampleServices: [
      { title: "Comprehensive Health Checkup", description: "Full blood panel, cardiovascular screening, and consultation with senior physician.", price: "$199" },
      { title: "Pediatric Wellness Exam", description: "Gentle, expert pediatric care ensuring healthy growth and immunization tracking.", price: "$120" }
    ]
  },
  {
    id: "tpl-law",
    name: "Vance & Sterling Legal Counsel",
    category: "Legal & Advisory",
    icon: Scale,
    description: "Authoritative law firm layout featuring practice areas, attorney credentials, and confidential consultation forms.",
    primaryColor: "#1e3a8a",
    secondaryColor: "#1e293b",
    fontStyle: "serif",
    seoTitle: "Vance & Sterling Law | Experienced Attorneys & Legal Counsel",
    seoDesc: "Protecting your rights with rigorous representation and strategic legal counsel across corporate law, litigation, and estate planning.",
    heroTitle: "Uncompromising Legal Defense & Strategic Counsel",
    heroSubtitle: "When your business or future is on the line, trust Vance & Sterling to deliver results-driven advocacy.",
    ctaText: "Request Consultation",
    sampleServices: [
      { title: "Corporate Contract Review", description: "Detailed risk assessment and drafting for commercial agreements and mergers.", price: "$450" },
      { title: "Estate Planning & Trusts", description: "Protect your family's assets with airtight wills, trusts, and power of attorney.", price: "$750" }
    ]
  },
  {
    id: "tpl-construction",
    name: "Apex Builders & Civil Contractors",
    category: "Construction & Engineering",
    icon: Building2,
    description: "Heavy-duty commercial and residential construction portfolio showcasing completed projects and engineering bids.",
    primaryColor: "#ea580c",
    secondaryColor: "#c2410c",
    fontStyle: "modern",
    seoTitle: "Apex Builders | Commercial & Residential Construction",
    seoDesc: "Building tomorrow's infrastructure today. Licensed general contractors delivering exceptional quality on time and on budget.",
    heroTitle: "Building Excellence from Groundbreaking to Finish",
    heroSubtitle: "Apex Builders brings decades of precision engineering, structural integrity, and architectural mastery to every build.",
    ctaText: "Request Project Bid",
    sampleServices: [
      { title: "Commercial General Contracting", description: "Full turnkey construction management for retail spaces, offices, and warehouses.", price: "Custom Quote" },
      { title: "Custom Architectural Homes", description: "Luxury residential building crafted to exact specifications with premium materials.", price: "Custom Quote" }
    ]
  },
  {
    id: "tpl-plumber",
    name: "FlowMaster Emergency Plumbing",
    category: "Home Trades & Repair",
    icon: Wrench,
    description: "High-conversion home services layout with 24/7 click-to-call buttons and instant repair booking.",
    primaryColor: "#2563eb",
    secondaryColor: "#1d4ed8",
    fontStyle: "sans",
    seoTitle: "FlowMaster Plumbing | 24/7 Emergency Repairs & Drain Cleaning",
    seoDesc: "Experiencing a plumbing emergency? FlowMaster provides rapid 24/7 dispatch across the city for leaks, clogs, and water heaters.",
    heroTitle: "Fast, Reliable 24/7 Emergency Plumbing Services",
    heroSubtitle: "Licensed master plumbers ready to tackle leaks, burst pipes, water heaters, and sewer clogs with zero hassle.",
    ctaText: "Call Dispatch Now",
    sampleServices: [
      { title: "24/7 Emergency Leak & Pipe Repair", description: "Immediate dispatch for burst pipes, flooding risks, and major plumbing failures.", price: "$149" },
      { title: "Drain Hydro-Jetting", description: "Advanced high-pressure cleaning clearing stubborn grease, roots, and blockages.", price: "$249" }
    ]
  },
  {
    id: "tpl-electrician",
    name: "VoltGuard Electrical Solutions",
    category: "Home Trades & Repair",
    icon: Wrench,
    description: "Certified electrical contractor template highlighting residential wiring, panel upgrades, and EV charger installs.",
    primaryColor: "#eab308",
    secondaryColor: "#ca8a04",
    fontStyle: "sans",
    seoTitle: "VoltGuard Electrical | Licensed Residential & Commercial Electricians",
    seoDesc: "Safe, certified electrical installations, panel upgrades, and emergency troubleshooting by master electricians.",
    heroTitle: "Powering Your Home & Business Safely",
    heroSubtitle: "From panel upgrades to smart home integrations, VoltGuard delivers certified electrical expertise with strict safety codes.",
    ctaText: "Book Electrician",
    sampleServices: [
      { title: "Electrical Panel Upgrade (200A)", description: "Modernize your breaker box for safe power distribution and appliance loads.", price: "$1,299" },
      { title: "EV Home Charger Installation", description: "Level 2 high-speed electric vehicle charging station installed and inspected.", price: "$599" }
    ]
  },
  {
    id: "tpl-mechanic",
    name: "Precision Auto Care & Repair",
    category: "Automotive Services",
    icon: Wrench,
    description: "Auto repair shop layout with diagnostic services, pricing calculators, and online service booking.",
    primaryColor: "#475569",
    secondaryColor: "#334155",
    fontStyle: "sans",
    seoTitle: "Precision Auto Care | Expert Diagnostics & Mechanic Repairs",
    seoDesc: "Trusted auto repair, brake service, engine diagnostics, and routine maintenance by certified master technicians.",
    heroTitle: "Expert Auto Repairs & Honest Diagnostics",
    heroSubtitle: "Keep your vehicle running smoothly with Precision Auto Care. Certified mechanics, transparent pricing, and warranty on all repairs.",
    ctaText: "Schedule Service",
    sampleServices: [
      { title: "Full Synthetic Oil & Filter Service", description: "High-grade synthetic oil change, fluid top-off, and 50-point safety inspection.", price: "$79" },
      { title: "Brake Pad Replacement & Rotor Turn", description: "Premium ceramic brake pads and precision rotor resurfacing.", price: "$229" }
    ]
  },
  {
    id: "tpl-salon",
    name: "Lumina Beauty & Spa Salon",
    category: "Beauty & Wellness",
    icon: Sparkles,
    description: "Chic luxury beauty salon layout featuring styling services, appointment scheduler, and photo gallery.",
    primaryColor: "#f43f5e",
    secondaryColor: "#e11d48",
    fontStyle: "modern",
    seoTitle: "Lumina Beauty Salon | Hair, Skin & Luxury Spa Treatments",
    seoDesc: "Pamper yourself at Lumina Beauty Salon. Expert hair stylists, rejuvenating facial treatments, and luxury nail care.",
    heroTitle: "Elevate Your Natural Radiance & Style",
    heroSubtitle: "Step into Lumina Beauty Spa and experience transformative hair styling, glowing facials, and ultimate relaxation.",
    ctaText: "Book Your Makeover",
    sampleServices: [
      { title: "Signature Balayage & Cut", description: "Custom hand-painted highlights, gloss toner, precision haircut, and blowout.", price: "$180" },
      { title: "Rejuvenating Hydrafacial", description: "Deep cleansing, exfoliation, and hydration infusion for glowing skin.", price: "$150" }
    ]
  },
  {
    id: "tpl-photographer",
    name: "Aperture Dreams Photography",
    category: "Creative & Arts",
    icon: Camera,
    description: "Stunning visual portfolio template highlighting weddings, portraits, and commercial shoots with immersive galleries.",
    primaryColor: "#0f172a",
    secondaryColor: "#1e293b",
    fontStyle: "display",
    seoTitle: "Aperture Dreams | Professional Wedding & Portrait Photography",
    seoDesc: "Capturing your most precious moments with artistic vision and timeless elegance. Book your photoshoot session today.",
    heroTitle: "Capturing Timeless Stories Through the Lens",
    heroSubtitle: "Award-winning photography capturing authentic emotions, breathtaking weddings, and striking commercial portraits.",
    ctaText: "View Portfolio",
    sampleServices: [
      { title: "Wedding Day Storytelling", description: "Full-day coverage by two lead photographers, online gallery, and heirloom album.", price: "$2,400" },
      { title: "Professional Brand Headshots", description: "Studio session with professional lighting and digital retouching for LinkedIn/Web.", price: "$250" }
    ]
  },
  {
    id: "tpl-realestate",
    name: "PrimeKey Real Estate Group",
    category: "Real Estate & Housing",
    icon: Home,
    description: "Property listings showcase with interactive search, agent profiles, and mortgage estimation tools.",
    primaryColor: "#0284c7",
    secondaryColor: "#0369a1",
    fontStyle: "sans",
    seoTitle: "PrimeKey Real Estate | Luxury Homes & Commercial Properties",
    seoDesc: "Find your dream home or commercial property with PrimeKey Real Estate. Expert local agents ready to guide you.",
    heroTitle: "Your Key to Exceptional Properties",
    heroSubtitle: "Discover exclusive residential listings, waterfront estates, and prime commercial investments with PrimeKey Group.",
    ctaText: "Browse Listings",
    sampleServices: [
      { title: "Free Home Valuation Report", description: "Comprehensive market analysis determining your property's maximum resale value.", price: "Free" },
      { title: "Buyer Representation & Tours", description: "Dedicated agent guiding you through property viewings, negotiations, and closing.", price: "Commission" }
    ]
  },
  {
    id: "tpl-hotel",
    name: "Grand Horizon Luxury Hotel",
    category: "Hospitality & Travel",
    icon: Home,
    description: "Boutique hotel template featuring room suites, amenities, online booking engine, and guest reviews.",
    primaryColor: "#b45309",
    secondaryColor: "#92400e",
    fontStyle: "serif",
    seoTitle: "Grand Horizon Hotel | Luxury Suites & Resort Amenities",
    seoDesc: "Experience uncompromised luxury at Grand Horizon Hotel. Book elegant suites, fine dining, and spa experiences.",
    heroTitle: "A Sanctuary of Elegance & Comfort",
    heroSubtitle: "Welcome to Grand Horizon Hotel. Indulge in world-class accommodations, breathtaking views, and bespoke hospitality.",
    ctaText: "Check Room Availability",
    sampleServices: [
      { title: "Deluxe Oceanview Suite", description: "King bed, private balcony overlooking the coast, marble bath, and room service.", price: "$320/night" },
      { title: "Executive Penthouse Suite", description: "Spacious luxury living area, panoramic skyline views, and VIP lounge access.", price: "$650/night" }
    ]
  },
  {
    id: "tpl-guesthouse",
    name: "Whispering Pines Guest House",
    category: "Hospitality & Travel",
    icon: Home,
    description: "Cozy bed and breakfast retreat layout with room booking, local guides, and breakfast menu.",
    primaryColor: "#047857",
    secondaryColor: "#065f46",
    fontStyle: "serif",
    seoTitle: "Whispering Pines Guest House | Cozy Countryside Bed & Breakfast",
    seoDesc: "Escape to Whispering Pines Guest House. Enjoy serene nature surroundings, homemade breakfasts, and cozy rooms.",
    heroTitle: "Your Peaceful Countryside Escape",
    heroSubtitle: "Unwind at Whispering Pines Guest House. Warm hospitality, homemade morning breakfasts, and tranquil gardens await.",
    ctaText: "Book Your Stay",
    sampleServices: [
      { title: "Garden View Cottage Room", description: "Cozy queen bed, private ensuite bathroom, and homemade breakfast included.", price: "$145/night" },
      { title: "Family Suite with Hearth", description: "Two connecting bedrooms, fireplace sitting area, and morning breakfast basket.", price: "$210/night" }
    ]
  },
  {
    id: "tpl-retail",
    name: "Urban Chic Boutique & Shop",
    category: "Retail & E-Commerce",
    icon: ShoppingBag,
    description: "Trendy retail shop layout featuring product showcases, seasonal collections, and click-and-collect ordering.",
    primaryColor: "#db2777",
    secondaryColor: "#be185d",
    fontStyle: "modern",
    seoTitle: "Urban Chic Boutique | Trendy Fashion & Accessories",
    seoDesc: "Discover the latest fashion trends, accessories, and curated style collections at Urban Chic Boutique.",
    heroTitle: "Curated Style for the Modern Wardrobe",
    heroSubtitle: "Explore our new seasonal arrivals at Urban Chic Boutique. Stand out with unique designs and premium quality.",
    ctaText: "Shop New Collection",
    sampleServices: [
      { title: "Personal Styling Session", description: "One-on-one styling consultation with our in-house fashion experts.", price: "$50" },
      { title: "VIP Loyalty Rewards Club", description: "Earn points on every purchase with exclusive early access to sales.", price: "Free" }
    ]
  },
  {
    id: "tpl-fitness",
    name: "IronFit Elite Fitness Centre",
    category: "Sports & Fitness",
    icon: Dumbbell,
    description: "High-energy gym template featuring class timetables, personal trainer profiles, and membership signups.",
    primaryColor: "#ef4444",
    secondaryColor: "#dc2626",
    fontStyle: "display",
    seoTitle: "IronFit Fitness Centre | Strength Training & Group Classes",
    seoDesc: "Transform your body at IronFit Elite Fitness. State-of-the-art equipment, expert personal trainers, and high-energy classes.",
    heroTitle: "Forge Your Strength, Push Your Limits",
    heroSubtitle: "IronFit Centre offers cutting-edge equipment, elite coaching, and a driven community to help you crush your fitness goals.",
    ctaText: "Claim Free Pass",
    sampleServices: [
      { title: "Unlimited Gym & Class Membership", description: "24/7 access to all weights, cardio zones, and unlimited HIIT/Yoga classes.", price: "$69/mo" },
      { title: "1-on-1 Personal Training", description: "Customized workout blueprints and nutritional coaching with elite trainers.", price: "$75/session" }
    ]
  },
  {
    id: "tpl-consultant",
    name: "Nexus Strategic Business Advisory",
    category: "Business & Consulting",
    icon: Briefcase,
    description: "Executive corporate consulting layout featuring case studies, advisory services, and strategy booking.",
    primaryColor: "#4f46e5",
    secondaryColor: "#4338ca",
    fontStyle: "sans",
    seoTitle: "Nexus Strategic Advisory | Business Growth & Management Consultants",
    seoDesc: "Accelerate your enterprise growth with expert management consulting, operational streamlining, and strategic planning.",
    heroTitle: "Strategic Clarity & Accelerated Growth",
    heroSubtitle: "Nexus Advisory partners with ambitious executives to solve complex operational challenges and scale profitability.",
    ctaText: "Schedule Strategy Call",
    sampleServices: [
      { title: "Operational Efficiency Audit", description: "Comprehensive review of workflows, cost structures, and technological bottlenecks.", price: "$2,500" },
      { title: "Executive Growth Roadmap", description: "90-day strategic blueprint designed to expand market share and revenue.", price: "$5,000" }
    ]
  },
  {
    id: "tpl-ngo",
    name: "Global Hope Foundation (NGO)",
    category: "NGO & Advocacy",
    icon: UsersIcon,
    description: "Impactful non-governmental organization template highlighting humanitarian missions, donation drives, and volunteer signups.",
    primaryColor: "#059669",
    secondaryColor: "#047857",
    fontStyle: "sans",
    seoTitle: "Global Hope Foundation | Humanitarian Aid & Community Development",
    seoDesc: "Support our mission to empower vulnerable communities through education, healthcare, and sustainable development.",
    heroTitle: "Empowering Communities, Inspiring Hope",
    heroSubtitle: "Join Global Hope Foundation in our mission to deliver education, healthcare, and economic opportunity worldwide.",
    ctaText: "Donate & Support",
    sampleServices: [
      { title: "Community Education Sponsorship", description: "Fund school supplies and textbooks for underprivileged children.", price: "$30/mo" },
      { title: "Clean Water Initiative Fund", description: "Contribute to building solar-powered clean water wells in rural areas.", price: "$50" }
    ]
  },
  {
    id: "tpl-agriculture",
    name: "GreenValley Organic Agriculture",
    category: "Agriculture & Farming",
    icon: TreePine,
    description: "Sustainable farming and agricultural produce template featuring farm-to-table supply, crops, and wholesale orders.",
    primaryColor: "#16a34a",
    secondaryColor: "#15803d",
    fontStyle: "sans",
    seoTitle: "GreenValley Agriculture | Sustainable Organic Crops & Produce",
    seoDesc: "Producing premium organic crops and sustainable agricultural goods with regenerative farming practices.",
    heroTitle: "Sustainable Farming for a Greener Tomorrow",
    heroSubtitle: "GreenValley Agriculture combines regenerative farming methods with modern crop science to deliver pure, organic produce.",
    ctaText: "Explore Wholesale",
    sampleServices: [
      { title: "Organic Produce Box Delivery", description: "Weekly subscription of freshly harvested seasonal organic vegetables and fruits.", price: "$45/box" },
      { title: "Agricultural Consulting & Soil Testing", description: "Professional soil nutrient analysis and crop yield optimization guidance.", price: "$350" }
    ]
  },
  {
    id: "tpl-sports",
    name: "Apex Athletic Performance Club",
    category: "Sports & Recreation",
    icon: Trophy,
    description: "Active sports club template featuring training programs, tournament schedules, court bookings, and member leagues.",
    primaryColor: "#2563eb",
    secondaryColor: "#1d4ed8",
    fontStyle: "modern",
    seoTitle: "Apex Athletic Club | Professional Training & Sports Leagues",
    seoDesc: "Join Apex Athletic Club for premier sports training, competitive leagues, and state-of-the-art courts and pitches.",
    heroTitle: "Unleash Your Athletic Potential",
    heroSubtitle: "Apex Athletic Club brings athletes together with professional coaching, premier facilities, and competitive leagues.",
    ctaText: "Join Club Today",
    sampleServices: [
      { title: "Court & Pitch Membership", description: "Unlimited booking access to indoor tennis, badminton, and turf soccer fields.", price: "$89/mo" },
      { title: "Youth Elite Sports Camp", description: "Intensive summer training camp led by professional athletes and coaches.", price: "$299" }
    ]
  },
  {
    id: "tpl-football",
    name: "United FC Pro Football Club",
    category: "Sports & Recreation",
    icon: Flag,
    description: "Professional football club layout with match fixtures, league standings, ticket sales, and youth academy.",
    primaryColor: "#1e3a8a",
    secondaryColor: "#172554",
    fontStyle: "display",
    seoTitle: "United FC | Official Football Club & Academy",
    seoDesc: "Official portal for United FC. Get match schedules, buy season tickets, and join our elite youth football academy.",
    heroTitle: "Pride, Passion & Victory on the Pitch",
    heroSubtitle: "Welcome to United FC. Experience the electric atmosphere of match day and support our journey to the championship.",
    ctaText: "Buy Season Tickets",
    sampleServices: [
      { title: "Season Ticket Pass 2026/27", description: "Guaranteed entry to all home matches plus exclusive club merchandise discounts.", price: "$499" },
      { title: "Junior Football Academy", description: "Professional youth training sessions fostering skills, teamwork, and discipline.", price: "$120/mo" }
    ]
  },
  {
    id: "tpl-nonprofit",
    name: "Future Horizons Non-Profit Trust",
    category: "NGO & Advocacy",
    icon: UsersIcon,
    description: "Mission-driven non-profit trust template highlighting advocacy campaigns, annual impact reports, and donor portals.",
    primaryColor: "#7c3aed",
    secondaryColor: "#6d28d9",
    fontStyle: "sans",
    seoTitle: "Future Horizons Trust | Non-Profit Advocacy & Social Impact",
    seoDesc: "Driving systemic social change through advocacy, grants, and community-led programs. Partner with us for a better future.",
    heroTitle: "Advancing Social Justice & Equal Opportunity",
    heroSubtitle: "Future Horizons Trust champions policies and programs that empower marginalized communities and protect civil rights.",
    ctaText: "Partner & Donate",
    sampleServices: [
      { title: "Community Grant Program", description: "Financial and administrative grants for grassroots social entrepreneurs.", price: "Grant Funded" },
      { title: "Policy Research & Reports", description: "In-depth investigative whitepapers on economic mobility and education reform.", price: "Free Access" }
    ]
  },
  {
    id: "tpl-smallbiz",
    name: "Cornerstone General Store & Services",
    category: "Small Business & Retail",
    icon: Building2,
    description: "Versatile small business template tailored for local merchants, specialty shops, and community services.",
    primaryColor: "#0284c7",
    secondaryColor: "#0369a1",
    fontStyle: "sans",
    seoTitle: "Cornerstone General Store | Quality Local Goods & Services",
    seoDesc: "Your neighborhood favorite for quality goods, friendly service, and community convenience.",
    heroTitle: "Serving Our Neighborhood with Pride",
    heroSubtitle: "Cornerstone Store brings you trusted local products, expert friendly advice, and a commitment to our community.",
    ctaText: "Get in Touch",
    sampleServices: [
      { title: "Local Delivery & Pickup", description: "Same-day doorstep delivery or convenient curbside pickup for all orders.", price: "$5" },
      { title: "Custom Order Special Request", description: "Looking for a specific item? We source hard-to-find goods for our neighbors.", price: "Varies" }
    ]
  }
];

export default function TemplateLibrary({ onSelectTemplate, onBack }: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Hospitality & Food", "Faith & Community", "Education & Learning", "Healthcare & Wellness", "Legal & Advisory", "Construction & Engineering", "Home Trades & Repair", "Automotive Services", "Beauty & Wellness", "Creative & Arts", "Real Estate & Housing", "Retail & E-Commerce", "Sports & Fitness", "Business & Consulting", "NGO & Advocacy", "Agriculture & Farming", "Sports & Recreation", "Small Business & Retail"];

  const filteredTemplates = ALL_INDUSTRY_TEMPLATES.filter(tpl => {
    const matchesSearch = tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) || tpl.description.toLowerCase().includes(searchQuery.toLowerCase()) || tpl.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "All" || tpl.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const instantiateTemplate = (tpl: IndustryTemplateMeta) => {
    const additionalServices = [
      { title: "Priority Consultation & Assessment", description: "Comprehensive initial review and customized plan tailored to your specific needs.", price: "$99" },
      { title: "VIP Ongoing Support & Maintenance", description: "Dedicated ongoing assistance, priority booking, and periodic checkups.", price: "$150/mo" }
    ];
    const fullServices = [...tpl.sampleServices, ...additionalServices];

    const newSite: GeneratedSite = {
      id: `site-${Date.now()}`,
      businessName: tpl.name,
      phone: "(555) 019-2834",
      address: "100 Innovation Way, Suite 400",
      category: tpl.category,
      primaryColor: tpl.primaryColor,
      secondaryColor: tpl.secondaryColor,
      accentColor: tpl.primaryColor,
      backgroundColor: "#ffffff",
      textColor: "#0f172a",
      fontStyle: tpl.fontStyle,
      seo: {
        title: tpl.seoTitle,
        description: tpl.seoDesc,
        keywords: `${tpl.name.toLowerCase()}, ${tpl.category.toLowerCase()}, professional services, expert solutions`
      },
      hero: {
        title: tpl.heroTitle,
        subtitle: tpl.heroSubtitle,
        ctaPrimary: tpl.ctaText,
        ctaSecondary: "Explore Services"
      },
      about: {
        title: `About ${tpl.name}`,
        history: `Established with a steadfast commitment to excellence, ${tpl.name} has grown into a trusted leader in the ${tpl.category} industry.`,
        mission: `Our mission is to deliver uncompromising quality, innovative solutions, and exceptional client satisfaction in every engagement.`,
        pitch: `With years of specialized expertise, our dedicated team combines industry best practices with personalized service to achieve outstanding outcomes for our clients.`
      },
      services: fullServices,
      features: [
        { title: "Certified Professional Expertise", icon: "ShieldCheck", description: "Led by industry-certified specialists with a proven track record of top-tier delivery." },
        { title: "Responsive & Accessible", icon: "Smartphone", description: "Fully optimized for seamless viewing and interaction across mobile, tablet, and desktop screens." },
        { title: "Fast & Reliable Execution", icon: "Zap", description: "Streamlined operational workflows ensuring rapid turnaround without compromising craftsmanship." },
        { title: "100% Satisfaction Guarantee", icon: "Award", description: "We stand firmly behind our work with dedicated follow-up and client assurance." }
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80", alt: "Professional environment showcase" },
        { url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80", alt: "Team collaboration in action" },
        { url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80", alt: "High quality output preview" }
      ],
      faqs: [
        { question: "How quickly can we get started?", answer: "We provide rapid onboarding and can initiate your project or service within 24-48 hours." },
        { question: "What is included in your service packages?", answer: "All packages include professional consultation, premium execution, dedicated support, and our 100% satisfaction guarantee." },
        { question: "Are your team members licensed and insured?", answer: "Yes, all our professionals hold full industry credentials, active licenses, and comprehensive liability insurance." },
        { question: "Can I customize the scope of work?", answer: "Absolutely. We tailor every solution to fit your exact requirements, timeline, and budget." }
      ],
      testimonials: [
        { name: "Jessica Taylor", review: `Working with ${tpl.name} was an absolute game-changer. Exceptional professionalism and outstanding results!`, rating: 5 },
        { name: "Marcus Vance", review: "Prompt, incredibly knowledgeable, and truly dedicated to customer satisfaction. Highly recommended.", rating: 5 },
        { name: "Elena Rostova", review: "The level of care and precision they brought to the table exceeded all our expectations.", rating: 5 }
      ],
      blog: [
        { title: `Top Best Practices in ${tpl.category} for 2026`, summary: "Discover expert strategies and proven methodologies to maximize success and efficiency.", category: "Industry Insights" },
        { title: `Why Professional Excellence Matters More Than Ever`, summary: "An in-depth look at how premium standards drive long-term client trust and satisfaction.", category: "Expertise" }
      ],
      whatsappMessage: `Hello ${tpl.name}, I would like to inquire about your services and schedule a consultation.`,
      contactPage: {
        title: "Get in Touch With Us Today",
        description: "Reach out to our team for inquiries, quotes, or consultations. We are here to help.",
        email: `contact@${tpl.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`
      },
      privacyPolicy: "We protect your privacy with strict data security standards and never share your information.",
      termsOfService: "Standard terms and conditions apply to all service agreements.",
      notFoundPage: {
        title: "Page Not Found",
        message: "The page you are looking for does not exist or has been relocated."
      }
    };
    onSelectTemplate(newSite);
  };

  return (
    <div className="space-y-8 text-left py-6 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6 gap-4">
        <div>
          <button 
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mb-2 cursor-pointer"
          >
            ← Back to Dashboard
          </button>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Layers className="h-8 w-8 text-blue-600 dark:text-blue-400" /> Professional Industry Template Library
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Explore 23+ modern, responsive, accessible, SEO-friendly, and conversion-optimized templates for every major industry.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates or industries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === cat 
                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((tpl) => {
          const Icon = tpl.icon;
          return (
            <div 
              key={tpl.id}
              className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-xl hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {tpl.category}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {tpl.description}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                    <ShieldCheck className="h-3 w-3" /> Responsive
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 text-[10px] font-bold">
                    <Globe className="h-3 w-3" /> SEO Ready
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                    <Sparkles className="h-3 w-3" /> High Conversion
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => instantiateTemplate(tpl)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-blue-600 text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-xs font-bold py-3 transition-all cursor-pointer shadow-sm group-hover:shadow-md"
              >
                <span>Use & Customize Template</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
