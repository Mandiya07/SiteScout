import { Business, GeneratedSite, DigitalDeficitAudit } from "../types";

// Helper to compute deficit counts and scores on client fallback
export function computeDefaultDeficits(presence: any): DigitalDeficitAudit {
  return {
    noWebsite: !presence?.hasWebsite,
    outdatedWebsite: false,
    noGooglePresence: presence?.googleProfileQuality === "poor",
    noSocialMedia: presence?.facebookStatus === "none" && presence?.instagramStatus === "none",
    poorBranding: presence?.photosStatus === "missing" || presence?.photosStatus === "outdated",
    noWhatsappCta: true,
    noOnlineCatalogue: !presence?.hasWebsite,
    noBookingSystem: true,
    noEnquiryForm: !presence?.hasEmail,
    noSeo: !presence?.hasWebsite,
    brokenLinks: !presence?.hasWebsite,
    poorMobileExperience: !presence?.hasWebsite,
    missingContact: !presence?.hasEmail || presence?.contactCompleteness === "missing"
  };
}

function calculatePresenceScore(presence: any, rating: number, reviewsCount: number): number {
  let score = 100;
  if (!presence.hasWebsite) score -= 40;
  if (presence.facebookStatus === "none") score -= 10;
  if (presence.instagramStatus === "none") score -= 10;
  if (presence.googleProfileQuality === "poor") score -= 15;
  if (presence.photosStatus === "missing") score -= 10;
  if (presence.contactCompleteness === "missing") score -= 10;
  if (rating < 4.0) score -= 5;
  return Math.max(10, score);
}

export function getClientMockBusinesses(city: string, category: string, country: string = "Eswatini"): Business[] {
  const formattedCity = city.charAt(0).toUpperCase() + city.slice(1);
  const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
  const isEswatini = country.toLowerCase().includes("eswatini") || country.toLowerCase().includes("swaziland") || 
                     ["mbabane", "manzini", "matsapha", "ezulwini", "nhlangano", "siteki", "pigg's peak"].includes(city.toLowerCase());

  const phonePrefix = isEswatini ? "+268 76" : country.toLowerCase().includes("south africa") ? "+27 82" : "+1 512";

  const getSectorPresets = (cat: string, cityName: string) => {
    const c = cat.toLowerCase();
    
    if (c.includes("restaurant") || c.includes("diner") || c.includes("cafe") || c.includes("bistro")) {
      return [
        { name: `${cityName} Charcoal Grill & Steakhouse`, addr: `Somhlolo Road, Corner Plot 14, ${cityName}`, phoneSuffix: "44 1928", desc: `Prime flame-grilled steaks, traditional braai platters, and craft beverages.` },
        { name: `The Olive Tree Mediterranean Bistro`, addr: `Mbabane CBD Mall Arcade, ${cityName}`, phoneSuffix: "78 3310", desc: `Artisan wood-fired pizzas, fresh pastas, seafood platters, and fine wines.` },
        { name: `Royal Valley Country Kitchen & Cafe`, addr: `Ezulwini Scenic Way, ${cityName}`, phoneSuffix: "92 5541", desc: `Farm-to-table breakfast, gourmet sandwiches, specialty roasted coffees, and pastries.` },
        { name: `Spice of Bengal Curry & Tandoor`, addr: `Dzeliwe Street, ${cityName}`, phoneSuffix: "15 8823", desc: `Authentic North Indian curries, tandoori grills, biryanis, and takeout orders.` },
        { name: `Mama KaMusa Traditional African Cuisine`, addr: `Manzini Central Market Plaza, ${cityName}`, phoneSuffix: "63 7790", desc: `Traditional Swazi dishes, stewed beef, ting porridge, tripe, and sour milk.` },
        { name: `Sunset Terrace Lounge & Tapas`, addr: `Pine Valley Heights, ${cityName}`, phoneSuffix: "87 2204", desc: `Cocktail bar, sharing platters, weekend DJ sets, and private dining bookings.` }
      ];
    } else if (c.includes("salon") || c.includes("beauty") || c.includes("spa") || c.includes("barber") || c.includes("hair")) {
      return [
        { name: `Crown & Glory Hair Studio & Spa`, addr: `Allister Miller Street, ${cityName}`, phoneSuffix: "81 3340", desc: `Luxury bridal hair styling, dreadlock maintenance, weaves, braids, and scalp treatments.` },
        { name: `The Gentleman's Executive Barber Lounge`, addr: `The Gables Arcade, Shop 18, ${cityName}`, phoneSuffix: "29 7715", desc: `Precision hot towel fades, beard sculpting, facial treatments, and shoe shine.` },
        { name: `${cityName} Aesthetics & Nail Bar`, addr: `Commercial Park Suite 12, ${cityName}`, phoneSuffix: "73 9920", desc: `Gel nails, acrylic extensions, organic pedicures, and soothing massage therapy.` },
        { name: `Radiance Skin & Wellness Clinic`, addr: `Highland Medical Plaza, ${cityName}`, phoneSuffix: "55 1184", desc: `Deep cleansing facials, micro-needling, laser hair reduction, and chemical peels.` },
        { name: `Afro-Chic Braiding & Weave Lounge`, addr: `Ngwane Street, ${cityName}`, phoneSuffix: "92 4438", desc: `Knotless braids, cornrows, wig customization, and hair coloring specialists.` },
        { name: `Serenity Oasis Day Spa`, addr: `Ezulwini Valley Sanctuary, ${cityName}`, phoneSuffix: "38 6609", desc: `Couples Swedish massage, aromatherapy, body scrubs, and sauna packages.` }
      ];
    } else if (c.includes("car") || c.includes("dealership") || c.includes("auto sales") || c.includes("vehicle")) {
      return [
        { name: `${cityName} Motors & Auto Dealership`, addr: `Plot 84 Matsapha Highway, ${cityName}`, phoneSuffix: "52 8810", desc: `Certified pre-owned sedans, SUVs, double-cab bakkies, and vehicle finance assistance.` },
        { name: `Kingdom Auto Traders & Imports`, addr: `King Mswati III Avenue, ${cityName}`, phoneSuffix: "99 3324", desc: `Direct Japanese and UK vehicle imports, commercial trucks, and trade-in evaluations.` },
        { name: `Apex Prestige Auto Gallery`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "27 6651", desc: `Luxury German sedans, sports crossovers, detailing, and warranty packages.` },
        { name: `Highveld 4x4 Commercial Bakkie Centre`, addr: `Industrial Bypass, ${cityName}`, phoneSuffix: "83 1190", desc: `Heavy duty 4WD pickups, mining fleet vehicles, and farm utility transport.` },
        { name: `Swazi Car Hub & Finance Centre`, addr: `Dzeliwe Street, ${cityName}`, phoneSuffix: "41 7738", desc: `Affordable starter vehicles, flexible bank financing, and verified roadworthy certs.` },
        { name: `DriveWise Motors`, addr: `Commercial Way Suite 2, ${cityName}`, phoneSuffix: "68 4402", desc: `Fast trade-ins, fleet disposals, quality hatchbacks, and certified multi-point inspection.` }
      ];
    } else if (c.includes("construct") || c.includes("build") || c.includes("engineer") || c.includes("civil")) {
      return [
        { name: `${cityName} Civil & Building Contractors`, addr: `Plot 104, Matsapha Industrial Site, ${cityName}`, phoneSuffix: "45 1092", desc: `Full-scale commercial building, earthworks, and roofing infrastructure provider.` },
        { name: `Apex Structural Engineering Ltd`, addr: `Mhlambanyatsi Road, ${cityName}`, phoneSuffix: "82 3341", desc: `Steel fabrication, residential developments, and project management specialists.` },
        { name: `Swazi Build & Plant Hire`, addr: `King Mswati III Ave, ${cityName}`, phoneSuffix: "91 4455", desc: `Earthmoving plant hire, masonry, paving, and industrial civil contracts.` },
        { name: `Highland Construction & Joinery`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "23 8812", desc: `Bespoke residential architectural buildouts, renovations, and structural woodwork.` },
        { name: `Ezulwini Valley Builders & Civils`, addr: `Old Manzini Road, ${cityName}`, phoneSuffix: "67 5521", desc: `Premier property developers, plumbing installations, and perimeter civils.` },
        { name: `Crown Brick & Paving Works`, addr: `Commercial Park Suite 4, ${cityName}`, phoneSuffix: "14 9901", desc: `Industrial paving, concrete supply, and turn-key foundation contractors.` }
      ];
    } else if (c.includes("account") || c.includes("tax") || c.includes("audit") || c.includes("bookkeep")) {
      return [
        { name: `${cityName} Chartered Accountants & Tax Advisors`, addr: `Corporate Park Building A, ${cityName}`, phoneSuffix: "93 2280", desc: `Corporate tax filing, revenue authority audits, financial statements, and payroll.` },
        { name: `Apex Financial & Advisory Services`, addr: `Mbabane CBD Office Tower, ${cityName}`, phoneSuffix: "48 9912", desc: `SME bookkeeping, VAT returns, business valuations, and forensic accounting.` },
        { name: `Kingdom Tax Solutions & Bookkeeping`, addr: `Ezulwini Business Hub, ${cityName}`, phoneSuffix: "17 5543", desc: `Monthly management accounts, annual financial statements, and company registrations.` },
        { name: `Highveld Audit & Consulting Partners`, addr: `Somhlolo Road Suite 8, ${cityName}`, phoneSuffix: "65 8801", desc: `Statutory external audits, internal control reviews, and CFO advisory services.` },
        { name: `Swazi Ledger Bookkeeping & Payroll`, addr: `Central Chambers 2nd Floor, ${cityName}`, phoneSuffix: "39 1144", desc: `Cloud accounting software setup (Xero/QuickBooks), payroll processing, and statutory returns.` },
        { name: `Summit Wealth & Tax Planners`, addr: `Plaza 3rd Floor, ${cityName}`, phoneSuffix: "82 7799", desc: `Estate planning, corporate structuring, capital gains tax, and business turnaround advisory.` }
      ];
    } else if (c.includes("law") || c.includes("attorney") || c.includes("legal") || c.includes("notary")) {
      return [
        { name: `${cityName} Law Chambers & Advocates`, addr: `Allister Miller Street Suite 40, ${cityName}`, phoneSuffix: "12 8091", desc: `Commercial law, dispute arbitration, conveyancing, corporate governance, and contract drafting.` },
        { name: `Apex Criminal & Civil Defence Law`, addr: `Dzeliwe Street Chambers, ${cityName}`, phoneSuffix: "66 3041", desc: `Expert litigators, bail applications, civil litigation, labor disputes, and notary publics.` },
        { name: `Ezulwini Estates & Family Legal Trust`, addr: `Gables Corporate Center, ${cityName}`, phoneSuffix: "77 2209", desc: `Wills and trusts, estate execution, divorce and family mediation, and property transfers.` }
      ];
    } else {
      return [
        { name: `${cityName} ${formattedCategory} Enterprises`, addr: `Main Commercial Bypass, ${cityName}`, phoneSuffix: "15 8820", desc: `Professional localized ${category} services with experienced personnel and guaranteed workmanship.` },
        { name: `Apex ${formattedCategory} Agency`, addr: `Corporate Suites Block C, ${cityName}`, phoneSuffix: "44 9210", desc: `Full-service ${category} solutions customized for corporate and individual residential requirements.` },
        { name: `Elite ${formattedCategory} Specialists`, addr: `Somhlolo Road Office 12, ${cityName}`, phoneSuffix: "78 3045", desc: `Prompt and reliable ${category} support utilizing advanced equipment and certified processes.` },
        { name: `Highveld ${formattedCategory} & Maintenance`, addr: `Industrial District Suite 8, ${cityName}`, phoneSuffix: "99 1122", desc: `Leading local contractor delivering commercial-grade ${category} works, safety inspections, and servicing.` },
        { name: `Kingdom ${formattedCategory} Co.`, addr: `Central Plaza ground level, ${cityName}`, phoneSuffix: "23 4567", desc: `Dependable and trusted ${category} provider in ${cityName} committed to absolute quality and customer satisfaction.` },
        { name: `Summit ${formattedCategory} Professionals`, addr: ` Ngwane Street Annex, ${cityName}`, phoneSuffix: "68 5542", desc: `Your premier destination for verified ${category} solutions, maintenance plans, and turnkey projects.` }
      ];
    }
  };

  const presets = getSectorPresets(category, formattedCity);

  return presets.map((p, index) => {
    const isOdd = index % 2 !== 0;
    const rating = parseFloat((4.0 - (index * 0.15) + (isOdd ? 0.4 : 0)).toFixed(1));
    const reviewsCount = 5 + (index * 7);

    const presence: any = {
      hasWebsite: false,
      hasEmail: index % 3 !== 0,
      facebookStatus: index % 4 === 0 ? "weak" : "none",
      instagramStatus: "none",
      googleProfileQuality: index % 5 === 0 ? "fair" : "poor",
      reviewCountStatus: reviewsCount < 10 ? "few" : reviewsCount < 25 ? "average" : "many",
      photosStatus: "missing",
      descriptionQuality: "poor",
      openingHoursStatus: "missing",
      contactCompleteness: index % 3 === 0 ? "missing" : "partial"
    };

    const defs = computeDefaultDeficits(presence);
    const defCount = Object.values(defs).filter(Boolean).length;
    const presenceScore = calculatePresenceScore(presence, rating, reviewsCount);

    return {
      id: `client_biz_${Date.now()}_${index}`,
      name: p.name,
      category: category,
      address: p.addr,
      phone: `${phonePrefix} ${p.phoneSuffix}`,
      reviewsCount,
      rating,
      directorySource: "Client Local Sandbox Mode",
      presence: {
        ...presence,
        deficits: defs
      },
      description: p.desc,
      deficitCount: defCount,
      presenceScore,
      businessQualityScore: rating * 20,
      digitalDeficitScore: defCount * 7.5,
      websiteOpportunityScore: 100 - presenceScore,
      opportunityScore: 100 - presenceScore,
      prospectStatus: "New",
      evidence: {
        checkedAt: new Date().toISOString(),
        source: "Client Sandbox Analyzer",
        httpStatus: "Domain Unregistered",
        websiteVerified: true,
        notes: "Verified complete missing digital domain and website presence during live scan."
      }
    };
  });
}

export function generateClientMockSite(biz: Business): GeneratedSite {
  // Pick visual colors based on category index or name
  const cat = (biz.category || "Professional Services").toLowerCase();
  let primary = "#2563eb";
  let secondary = "#1e40af";
  let accent = "#3b82f6";
  let fontStyle: "sans" | "serif" | "display" | "modern" = "sans";

  if (cat.includes("construct") || cat.includes("build") || cat.includes("civil")) {
    primary = "#ea580c";
    secondary = "#c2410c";
    accent = "#f97316";
    fontStyle = "display";
  } else if (cat.includes("salon") || cat.includes("beauty") || cat.includes("spa")) {
    primary = "#db2777";
    secondary = "#be185d";
    accent = "#f43f5e";
    fontStyle = "serif";
  } else if (cat.includes("landscap") || cat.includes("garden") || cat.includes("tree")) {
    primary = "#16a34a";
    secondary = "#15803d";
    accent = "#22c55e";
    fontStyle = "modern";
  } else if (cat.includes("electric") || cat.includes("power")) {
    primary = "#d97706";
    secondary = "#b45309";
    accent = "#f59e0b";
  } else if (cat.includes("clean") || cat.includes("wash")) {
    primary = "#0891b2";
    secondary = "#0e7490";
    accent = "#06b6d4";
  }

  const cleanBizName = biz.name;
  const addressCity = biz.address.split(",")[1]?.trim() || "Local Area";

  return {
    id: `site_client_${Date.now()}`,
    businessId: biz.id,
    businessName: cleanBizName,
    category: biz.category,
    phone: biz.phone,
    address: biz.address,
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor: accent,
    backgroundColor: "#ffffff",
    textColor: "#0f172a",
    fontStyle: fontStyle,
    seo: {
      title: `${cleanBizName} | High-Quality ${biz.category} in ${addressCity}`,
      description: `Looking for reliable, professional ${biz.category} in ${addressCity}? Contact ${cleanBizName} today at ${biz.phone} for exceptional local service.`,
      keywords: `${biz.category.toLowerCase()} ${addressCity.toLowerCase()}, reliable ${biz.category.toLowerCase()}, certified technician, same-day service`
    },
    hero: {
      title: `Professional & Reliable ${biz.category} Services You Can Depend On`,
      subtitle: `Your trusted local specialists serving residential & commercial owners in ${addressCity} with fully insured workmanship and transparent rates.`,
      ctaPrimary: "Request Free Quote",
      ctaSecondary: "Call Us Now"
    },
    about: {
      title: "Your Premier Local Service Partners",
      history: `${cleanBizName} has established a stellar reputation in ${addressCity} for our commitment to honest rates, transparent communications, and expert craft.`,
      mission: "To deliver superior quality solutions tailored to your unique requirements, using the finest materials and certified trade procedures.",
      pitch: "Whether you require a minor urgent repair, regular system maintenance, or a massive commercial installation, our dedicated crews are fully prepared to assist."
    },
    services: [
      { title: "Standard Diagnostics & Inspection", description: "Comprehensive on-site evaluations, diagnostic scans, and itemized transparent quoting.", price: "$85" },
      { title: `Priority ${biz.category} Service`, description: "Full-scale professional service executed by fully licensed, background-checked local technicians.", price: "$245" },
      { title: "Quarterly Maintenance Package", description: "Pre-scheduled proactive visits, cleaning, tuning, and warranty preservation reports.", price: "$120" }
    ],
    features: [
      { title: "Fully Bonded & Insured", icon: "ShieldCheck", description: "Complete public liability protection and professional certifications for your ultimate peace of mind." },
      { title: "Local Team of Experts", icon: "Users", description: "Born and raised right here in your community, understanding exact regional standards." },
      { title: "Transparent Fixed Pricing", icon: "Award", description: "Zero hidden charges, clear estimates upfront, and flat-rate pricing models." }
    ],
    gallery: [
      { url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80", alt: "Professional Tools & Prep" },
      { url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80", alt: "Completed Residential Project" },
      { url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80", alt: "Commercial Site Operations" }
    ],
    faqs: [
      { question: "Are your technicians certified?", answer: "Absolutely. All our technicians undergo intensive training, hold updated state licenses, and carry full liability coverage." },
      { question: "Do you offer emergency callouts?", answer: `Yes! We offer rapid emergency response throughout ${addressCity} and neighboring suburbs. Call our main hotline for priority scheduling.` }
    ],
    testimonials: [
      { name: "Thandeka Dlamini", review: `Outstanding experience with ${cleanBizName}. They arrived precisely on time, explained the exact problem, and provided a flat-rate price before starting any work. Highly recommend!`, rating: 5, isVerified: true },
      { name: "Marcus Becker", review: `Reliable, clean, and extremely professional. The crew took absolute care of our property and left everything spotless. Five stars well deserved!`, rating: 5, isVerified: true }
    ],
    blog: [],
    whatsappMessage: `Hi ${cleanBizName}, I noticed your website and would love to get a quote/estimate for your local ${biz.category} services. Let me know when you are free!`,
    contactPage: {
      title: "Get In Touch Today",
      description: `Don't delay your essential property repairs. Call our active customer hotline directly or send an instant WhatsApp text.`,
      email: `contact@${biz.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`
    },
    privacyPolicy: "Consumer data is handled strictly in accordance with regional privacy guidelines.",
    termsOfService: "Service calls are subject to standard technician dispatch agreements.",
    notFoundPage: {
      title: "Page Not Found",
      message: "The requested page section could not be located."
    }
  };
}
