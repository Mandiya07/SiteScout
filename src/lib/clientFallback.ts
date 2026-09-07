import { Business, GeneratedSite, DigitalDeficitAudit } from "../types";
import { detectCountryFromLocation } from "./countryCurrency";
import { getCategoryHeroImage } from "./heroImages";
import { buildBusinessTruthProfile } from "./businessTruth";

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

// Procedural generator to create robust, randomized high-fidelity mock businesses
function generateProceduralMockBusinesses(city: string, category: string, country: string, searchKeywords: string = "", page: number = 1): { name: string; addr: string; phoneSuffix: string; desc: string }[] {
  const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
  const localPrefixes = [
    "Apex", "Summit", "Crown", "Royal", "Valley", "National", "Elite", "Prime", 
    "Global", "Direct", "True", "Swift", "Bright", "First", "Metro", "Vanguard", 
    "Horizon", "Blue Ribbon", "Highland", "Kingdom", "Emerald", "Gold Star", "Alpha", 
    "Cornerstone", "Pinnacle", "Heritage", "Sovereign", "Omni", "Dynamic", "Avenue",
    "Prestige", "Pioneer", "Sterling", "Beacon", "Alliance", "Legacy", "Signature"
  ];

  const cityStreetsMap: Record<string, string[]> = {
    mbabane: ["Somhlolo Road", "Dzeliwe Street", "Allister Miller Street", "Mhlambanyatsi Road", "Pine Valley Road", "Hospital Hill", "Mahleka Street", "Polinjane Road", "Gilson Street"],
    manzini: ["Ngwane Street", "Mhlakuvane Street", "Tenbergen Street", "Central Way", "Market Street", "Meintjes Street", "Kelly Street", "Nkoseluhlaza Street"],
    matsapha: ["King Mswati III Avenue", "Industrial Bypass", "Sheffield Road", "Matsapha Highway", "Police College Road", "Airport Road"],
    ezulwini: ["Scenic Way", "Gables Mall Bypass", "Old Manzini Road", "Mantenga Drive", "Cultural Corridor"]
  };

  const genericStreets = ["Commercial Way", "Main Street", "Link Road", "Industrial Boulevard", "Central Avenue", "Corporate Parkway", "Market Square"];

  const cityLower = city.toLowerCase();
  const streets = cityStreetsMap[cityLower] || Object.values(cityStreetsMap).find((_, idx) => cityLower.includes(Object.keys(cityStreetsMap)[idx])) || genericStreets;

  // Let's get sector specific nouns/suffixes
  let nouns: string[] = [];
  let descs: string[] = [];

  const c = category.toLowerCase();
  if (c.includes("restaurant") || c.includes("diner") || c.includes("cafe") || c.includes("bistro") || c.includes("food") || c.includes("cater")) {
    nouns = ["Charcoal Grill & Steakhouse", "Mediterranean Bistro", "Country Kitchen & Cafe", "Spice Curry & Tandoor", "Traditional Cuisine", "Sunset Terrace Lounge", "Food Palace", "Local Diner & Pub", "Sizzle Steakhouse", "Flavors Garden Bistro", "Gourmet Catering", "Spit Braai & Catering", "Feast Event Caterers"];
    descs = ["Prime flame-grilled steaks, traditional local platters, and craft beverages.", "Artisan wood-fired pizzas, fresh pastas, seafood platters, and fine wines.", "Farm-to-table breakfast, gourmet sandwiches, specialty roasted coffees, and fresh pastries.", "Authentic local curries, tandoori grills, biryanis, and fast takeout orders.", "Traditional local dishes, stewed beef, traditional porridge, tripe, and sour milk."];
  } else if (c.includes("salon") || c.includes("beauty") || c.includes("spa") || c.includes("barber") || c.includes("hair")) {
    nouns = ["Hair Studio & Spa", "Executive Barber Lounge", "Aesthetics & Nail Bar", "Skin & Wellness Clinic", "Braiding & Weave Lounge", "Oasis Day Spa", "Crown & Mane Studio", "Beauty Boutique", "Reflections Hair & Makeup"];
    descs = ["Luxury bridal hair styling, dreadlock maintenance, weaves, braids, and scalp treatments.", "Precision hot towel fades, beard sculpting, facial treatments, and premium styling.", "Gel nails, acrylic extensions, organic pedicures, and soothing massage therapy.", "Deep cleansing facials, micro-needling, laser hair reduction, and chemical peels.", "Knotless braids, cornrows, wig customization, and hair coloring specialists."];
  } else if (c.includes("car") || c.includes("dealership") || c.includes("auto sales") || c.includes("vehicle") || c.includes("mechanic") || c.includes("auto repair") || c.includes("garage") || c.includes("workshop")) {
    nouns = ["Motors & Auto Dealership", "Auto Traders & Imports", "Prestige Auto Gallery", "Commercial Bakkie Centre", "Car Hub & Finance Centre", "DriveWise Motors", "Preowned Vehicle Market", "Performance Auto Group", "Precision Auto Workshop & Diagnostics", "Auto Electricians & Starter Repairs", "Gearbox & Suspension Specialists", "Diesel Injection & Turbo Centre", "Panel Beating & Spray Painting", "Mobile Fleet Mechanics & Roadside Rescue"];
    descs = ["Certified pre-owned sedans, SUVs, double-cab bakkies, and vehicle finance assistance.", "Direct quality vehicle imports, commercial trucks, and trade-in evaluations.", "Luxury sports crossovers, professional detailing, and extensive warranty packages.", "Heavy duty 4WD pickups, mining fleet vehicles, and farm utility transport.", "Computerized engine diagnostics, brake overhaul, clutch repairs, and major vehicle servicing.", "Alternator rebuilds, vehicle wiring, ECU reprogramming, and alarm repairs.", "Automatic & manual transmission overhauls, shock absorber replacements, and wheel alignments."];
  } else if (c.includes("construct") || c.includes("build") || c.includes("engineer") || c.includes("civil") || c.includes("contractor") || c.includes("trade") || c.includes("plumb") || c.includes("electric")) {
    nouns = ["Civil & Building Contractors", "Structural Engineering Ltd", "Build & Plant Hire", "Construction & Joinery", "Valley Builders & Civils", "Brick & Paving Works", "Infrastructure Group", "General Contractors", "Expert Plumbers & Drainlayers", "Commercial Electricians & Wiremen", "Roofing & Ceiling Specialists", "Tiling & Masonry Group"];
    descs = ["Full-scale commercial building, earthworks, and roofing infrastructure provider.", "Steel fabrication, residential developments, and project management specialists.", "Earthmoving plant hire, masonry, paving, and industrial civil contracts.", "Bespoke residential architectural buildouts, renovations, and structural woodwork.", "Emergency leak detection, hot water cylinder geyser installations, and blocked drain clearing.", "Industrial electrical certificates of compliance, solar inverter wiring, and light fittings."];
  } else if (c.includes("account") || c.includes("tax") || c.includes("audit") || c.includes("bookkeep") || c.includes("finance")) {
    nouns = ["Chartered Accountants & Tax Advisors", "Financial & Advisory Services", "Tax Solutions & Bookkeeping", "Audit & Consulting Partners", "Ledger Bookkeeping & Payroll", "SME Accountants"];
    descs = ["Corporate tax filing, revenue authority audits, financial statements, and payroll.", "SME bookkeeping, VAT returns, business valuations, and forensic accounting.", "Monthly management accounts, annual financial statements, and company registrations.", "Statutory external audits, internal control reviews, and CFO advisory services."];
  } else if (c.includes("law") || c.includes("attorney") || c.includes("legal") || c.includes("notary")) {
    nouns = ["Law Chambers & Notaries", "Legal Practitioners & Partners", "Commercial Attorneys & Conveyancers", "Labour & Employment Law Chambers", "Notaries & Civil Attorneys", "Litigation & Corporate Counsel"];
    descs = ["Commercial law, property conveyancing, civil litigation, and labor dispute arbitrations.", "Corporate contracts, constitutional litigation, family law, and estate administration.", "Real estate title deeds, mortgage bonds, mergers, and corporate restructuring.", "Workplace disciplinary hearings, local disputes, and employment contract drafting."];
  } else if (c.includes("real estate") || c.includes("property") || c.includes("realtor") || c.includes("estate agent")) {
    nouns = ["Premier Property Group", "Valley View Real Estate Agency", "Homes & Property Management", "Commercial Realty Group", "Property Valuers & Realtors", "Land & Home Brokerage"];
    descs = ["Residential house sales, commercial office leasing, and luxury estate developments.", "Prime residential plots, golf estate properties, farm land sales, and rental management.", "Tenant vetting, rent collection, residential property valuations, and buy-to-let advisory.", "Industrial warehouse leasing, retail shop spaces, and commercial development land."];
  } else if (c.includes("tour") || c.includes("safari") || c.includes("travel") || c.includes("holiday")) {
    nouns = ["Safari & Cultural Tours", "Adventure & Eco-Tours", "Travel Agency & Flights", "Escapes & Lodge Bookings", "Overland Tours & 4x4 Expeditions", "Executive Chauffeur Tours"];
    descs = ["Game reserve safaris, traditional cultural village tours, and guided hikes.", "Canopy zip-line adventures, mountain biking expeditions, and caving excursions.", "International flight ticketing, holiday packages, travel insurance, and visa assistance.", "Luxury safari lodge reservations, honeymoon packages, and weekend nature getaways."];
  } else if (c.includes("school") || c.includes("academy") || c.includes("educat") || c.includes("college") || c.includes("daycare")) {
    nouns = ["Academy & Cambridge College", "Early Learning & Montessori Centre", "Technical & Vocational College", "Institute of Business & Accountancy", "Preparatory & Primary School", "Music, Arts & Media Academy"];
    descs = ["Private pre-school, primary, and secondary Cambridge international curriculum education.", "Montessori-based toddler care, nursery education, and after-school enrichment clubs.", "Accredited diplomas in automotive mechanics, electrical engineering, and IT systems.", "Professional courses in marketing, human resources, and business finance."];
  } else if (c.includes("medical") || c.includes("clinic") || c.includes("doctor") || c.includes("health") || c.includes("dental") || c.includes("optom")) {
    nouns = ["Family Medical & Dental Clinic", "Optometry & Eye Care Centre", "Specialist Women & Children's Clinic", "Physiotherapy & Sports Rehab", "Care Pharmacy & Diagnostics", "Diagnostic Ultrasound & Radiology"];
    descs = ["General medical practice, dental consultations, ultrasound scans, and wellness checks.", "Comprehensive eye examinations, designer frames, contact lenses, and vision therapy.", "Maternal health, pediatric care, routine immunizations, and fertility counseling.", "Sports injury rehabilitation, post-surgery recovery, and orthopedic physical therapy."];
  } else if (c.includes("retail") || c.includes("shop") || c.includes("boutique") || c.includes("store")) {
    nouns = ["Fashion & Luxury Boutique Lounge", "Mega Wholesale & Cash & Carry", "Home Furnishings & Living Decor", "Solar, Electrical & Hardware Merchants", "Organic Butchery & Meat Market", "Gadgets & Electronics Hub"];
    descs = ["Designer corporate wear, traditional local attire, footwear, and luxury accessories.", "Bulk groceries, dry foods, beverages, and household goods for local shops and retailers.", "Solid wood furniture, lounge suites, refrigeration units, and custom bedding.", "Solar inverters, lithium batteries, roofing sheets, fasteners, and power tools."];
  } else {
    nouns = [`Premier ${formattedCategory} Services`, `${formattedCategory} & Repairs`, `${formattedCategory} Solutions Ltd`, `Downtown ${formattedCategory} Co.`, `Metro ${formattedCategory} & Supply`, `Summit Custom ${formattedCategory}`];
    descs = [`Established local ${formattedCategory.toLowerCase()} service provider serving residential and corporate clients.`, `Expert ${formattedCategory.toLowerCase()} diagnostics, emergency service calls, and full-service packages.`, `Professional ${formattedCategory.toLowerCase()} operations with experienced technicians and verified work.`];
  }

  const generated: { name: string; addr: string; phoneSuffix: string; desc: string }[] = [];
  const seedString = `${city}-${category}-${searchKeywords}-page-${page}`;
  let seedNum = 0;
  for (let i = 0; i < seedString.length; i++) {
    seedNum += seedString.charCodeAt(i);
  }

  // Generate up to 25 distinct businesses per category
  for (let i = 0; i < 25; i++) {
    const prefixIdx = (seedNum + i * 7) % localPrefixes.length;
    const nounIdx = (seedNum + i * 13) % nouns.length;
    const streetIdx = (seedNum + i * 3) % streets.length;
    const descIdx = (seedNum + i * 17) % descs.length;
    
    const prefix = localPrefixes[prefixIdx];
    const noun = nouns[nounIdx];
    
    let name = `${prefix} ${noun}`;
    if (i % 5 === 1) {
      name = `${city} ${noun}`;
    } else if (i % 5 === 2) {
      name = `${prefix} ${formattedCategory} Hub`;
    } else if (i % 5 === 3) {
      name = `${prefix} & Sons ${formattedCategory}`;
    } else if (i % 5 === 4) {
      name = `The ${prefix} ${formattedCategory} Group`;
    }

    if (searchKeywords) {
      const kw = searchKeywords.toLowerCase();
      const inName = name.toLowerCase().includes(kw);
      const inDesc = (descs[descIdx] || "").toLowerCase().includes(kw);
      if (!inName && !inDesc) {
        continue;
      }
    }

    const plotNum = 10 + (i * 12) + (seedNum % 80);
    const addr = `${streets[streetIdx]}, Plot ${plotNum}, ${city}`;
    const phoneSuffix = `${Math.floor(10 + ((seedNum + i * 31) % 90))} ${Math.floor(1000 + ((seedNum + i * 47) % 9000))}`;
    
    generated.push({
      name,
      addr,
      phoneSuffix,
      desc: descs[descIdx] || `High quality professional ${category.toLowerCase()} services tailored for your satisfaction.`
    });
  }

  if (generated.length === 0) {
    return generateProceduralMockBusinesses(city, category, country, "", page);
  }

  return generated;
}

export function getClientMockBusinesses(city: string, category: string, country: string = "Eswatini", searchKeywords: string = "", page: number = 1): Business[] {
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

  const presets = generateProceduralMockBusinesses(formattedCity, formattedCategory, country, searchKeywords, page);

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

    const domainSlug = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const domainExt = isEswatini ? "co.sz" : "com";
    const businessEmail = `info@${domainSlug}.${domainExt}`;

    return {
      id: `client_biz_${Date.now()}_${index}`,
      name: p.name,
      category: category,
      address: p.addr,
      phone: `${phonePrefix} ${p.phoneSuffix}`,
      email: businessEmail,
      reviewsCount,
      rating,
      directorySource: "Client Local Sandbox Mode",
      presence: {
        ...presence,
        deficits: defs
      },
      isDemo: true,
      dataType: "demo",
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
        source: "Client Demo Data Sample",
        httpStatus: "Demo Sandbox",
        websiteVerified: false,
        verificationStatus: "sample_demo",
        notes: "Demo sample prospect for testing - Not verified through live web search."
      }
    };
  });
}

export function getIndustryDetails(category: string, city: string) {
  const cat = (category || "").toLowerCase();

  if (cat.includes("plumb") || cat.includes("pipe") || cat.includes("drain") || cat.includes("geyser")) {
    return {
      heroTitle: "Expert Residential & Commercial Plumbing",
      heroSubtitle: `Fast, reliable plumbing solutions including pipe repairs, drain cleaning, and geyser installations in ${city}.`,
      heroImage: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&q=80&w=1200",
      services: [
        {
          title: "Pipe repair",
          description: "Prompt, precision repairs and replacements for leaking, burst, or worn copper and PVC water pipes.",
          price: "Request a Quote",
          imageUrl: "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=800"
        },
        {
          title: "Drain cleaning",
          description: "High-pressure clearing and electro-snake unblocking for clogged kitchen sinks, drains, and main sewer lines.",
          price: "Contact Us",
          imageUrl: "https://images.unsplash.com/photo-1505798577917-a65157d3320a?auto=format&fit=crop&w=800"
        },
        {
          title: "Geyser installation",
          description: "Professional electric and solar geyser fitting, thermostat replacements, and pressure-equalizing safety valves.",
          price: "Call for Pricing",
          imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800"
        }
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=800", alt: "Plumbing tools and wrench set" },
        { url: "https://images.unsplash.com/photo-1505798577917-a65157d3320a?auto=format&fit=crop&w=800", alt: "Pipe installation work" },
        { url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800", alt: "Bathroom plumbing fixtures" }
      ]
    };
  }

  if (cat.includes("restaurant") || cat.includes("food") || cat.includes("diner") || cat.includes("cafe") || cat.includes("bistro") || cat.includes("grill") || cat.includes("eatery") || cat.includes("kitchen")) {
    return {
      heroTitle: "Beautiful Restaurant & Dining Experience",
      heroSubtitle: `Fresh, artisanal dishes crafted with local ingredients and warm hospitality in ${city}.`,
      heroImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200",
      services: [
        {
          title: "Dining",
          description: "Cozy table seating, vibrant ambient lighting, and chef-curated seasonal lunch and dinner menus.",
          price: "Reserve Table",
          imageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800"
        },
        {
          title: "Catering",
          description: "Full-service private event catering, corporate buffet setups, and custom gourmet party platters.",
          price: "Custom Quote",
          imageUrl: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800"
        },
        {
          title: "Takeaway",
          description: "Hot, freshly prepared takeaway meals packed securely for fast pickup or express local delivery.",
          price: "View Menu",
          imageUrl: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800"
        }
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=800", alt: "Gourmet food plating" },
        { url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800", alt: "Restaurant interior dining room" },
        { url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800", alt: "Professional chef preparing dishes" }
      ]
    };
  }

  if (cat.includes("salon") || cat.includes("beauty") || cat.includes("hair") || cat.includes("spa") || cat.includes("barber") || cat.includes("nail")) {
    return {
      heroTitle: "Luxury Hair, Beauty & Wellness Spa",
      heroSubtitle: `Transformative styling, organic skin care, and soothing spa therapies tailored for ${city}.`,
      heroImage: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200",
      services: [
        {
          title: "Precision Haircuts & Styling",
          description: "Custom haircuts, highlights, color treatments, weaves, and bridal styling tailored to your unique aesthetic.",
          price: "Book Appointment",
          imageUrl: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=800"
        },
        {
          title: "Luxury Facial & Skincare",
          description: "Deep cleansing facial therapies, botanical hydration, and organic skincare treatments.",
          price: "View Packages",
          imageUrl: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=800"
        },
        {
          title: "Manicure & Nail Art",
          description: "Gel extensions, soothing pedicures, intricate nail design, and pampering hand treatments.",
          price: "Contact Us",
          imageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800"
        }
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800", alt: "Hair salon interior and styling station" },
        { url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800", alt: "Relaxing spa treatment room" },
        { url: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800", alt: "Nail art studio" }
      ]
    };
  }

  if (cat.includes("construct") || cat.includes("build") || cat.includes("civil") || cat.includes("renovat") || cat.includes("roof")) {
    return {
      heroTitle: "Premier Building & Civil Construction Contractors",
      heroSubtitle: `Turnkey residential developments, structural renovations, and commercial construction in ${city}.`,
      heroImage: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1200",
      services: [
        {
          title: "Custom Building",
          description: "End-to-end residential home construction, structural foundations, and architectural framework execution.",
          price: "Request Proposal",
          imageUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800"
        },
        {
          title: "Structural Renovations",
          description: "Commercial structural extensions, roofing upgrades, interior remodeling, and concrete masonry.",
          price: "Free Estimate",
          imageUrl: "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=800"
        },
        {
          title: "Civil Engineering Works",
          description: "Heavy excavation, site clearing, drainage infrastructure, and commercial plant operations.",
          price: "Contact Us",
          imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800"
        }
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=800", alt: "Architectural blueprints and engineering" },
        { url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800", alt: "Construction site operations" },
        { url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800", alt: "Building structural timber framing" }
      ]
    };
  }

  if (cat.includes("mechanic") || cat.includes("auto") || cat.includes("car") || cat.includes("garage") || cat.includes("tyre") || cat.includes("repair")) {
    return {
      heroTitle: "Expert Mechanic & Auto Repair Workshop",
      heroSubtitle: `Computerized engine diagnostics, precision brake service, and major vehicle maintenance in ${city}.`,
      heroImage: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=1200",
      services: [
        {
          title: "Engine Diagnostics & Tuning",
          description: "Computerized OBD diagnostic scans, engine fault troubleshooting, component overhaul, and tuning.",
          price: "Book Scan",
          imageUrl: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800"
        },
        {
          title: "Brake & Suspension Service",
          description: "Brake pad replacement, disc skimming, shock absorber testing, and steering safety checks.",
          price: "Request Quote",
          imageUrl: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800"
        },
        {
          title: "Scheduled Vehicle Service",
          description: "Full oil change, filter replacement, spark plugs, fluid top-up, and multi-point roadworthy checks.",
          price: "View Pricing",
          imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800"
        }
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800", alt: "Mechanic tools and engine repair" },
        { url: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=800", alt: "Hydraulic lift garage bay" },
        { url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800", alt: "Engine bay diagnostic inspection" }
      ]
    };
  }

  // Default fallback for other industries
  return {
    heroTitle: `Professional & Reliable ${category} Services`,
    heroSubtitle: `Your trusted local specialists serving residential and commercial clients in ${city} with dedicated craftsmanship.`,
    heroImage: getCategoryHeroImage(category),
    services: [
      {
        title: "Standard Consultation & Inspection",
        description: "Comprehensive on-site evaluations, needs assessment, and itemized transparent quoting.",
        price: "Request a Quote",
        imageUrl: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800"
      },
      {
        title: `Core ${category} Service`,
        description: "Professional execution by our dedicated local team with certified workmanship.",
        price: "Contact Us",
        imageUrl: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800"
      },
      {
        title: "Maintenance & Preventative Care",
        description: "Routine inspection, servicing, and tuning to keep your systems operating at peak efficiency.",
        price: "Call for Pricing",
        imageUrl: "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=800"
      }
    ],
    gallery: [
      { url: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800", alt: "Professional specialized tools and workspace" },
      { url: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800", alt: "Dedicated local team in action" },
      { url: "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?auto=format&fit=crop&w=800", alt: "Completed quality project delivery" }
    ]
  };
}

export function generateClientMockSite(biz: Business): GeneratedSite {
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
  const addressCity = biz.address.split(",")[1]?.trim() || biz.address.split(",")[0]?.trim() || "Local Area";
  const industryConfig = getIndustryDetails(biz.category, addressCity);

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
      title: industryConfig.heroTitle,
      subtitle: industryConfig.heroSubtitle,
      ctaPrimary: "Request Free Quote",
      ctaSecondary: "Contact Us",
      imageUrl: industryConfig.heroImage
    },
    about: {
      title: "Your Local Service Partners",
      history: `${cleanBizName} is committed to serving ${addressCity} with honest rates, transparent communications, and expert craft.`,
      mission: "To deliver reliable solutions tailored to your unique requirements.",
      pitch: "Whether you require minor repairs, regular maintenance, or large installations, our dedicated crews are ready to assist."
    },
    services: industryConfig.services,
    features: [
      { title: "Dedicated Professionals", icon: "ShieldCheck", description: "Committed to delivering high-quality results for your peace of mind." },
      { title: "Local Team", icon: "Users", description: "Based right here in your community, understanding local needs." },
      { title: "Transparent Pricing", icon: "Award", description: "Clear estimates upfront and straightforward pricing models." }
    ],
    gallery: industryConfig.gallery,
    faqs: [
      { question: "How do you handle pricing?", answer: "We believe in complete transparency. We provide clear, itemized quotes before any work begins." },
      { question: "What areas do you serve?", answer: `We proudly serve ${addressCity} and the surrounding local communities.` }
    ],
    testimonials: [
      { name: "Customer Reviews Coming Soon", review: "Your verified customer reviews will appear here.", rating: 5, isVerified: false }
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
    },
    truthProfile: buildBusinessTruthProfile(biz),
    presence: biz.presence || null,
    deficits: biz.presence?.deficits || null
  };
}
