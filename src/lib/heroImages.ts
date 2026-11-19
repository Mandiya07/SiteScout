// Curated, HTTP-200 verified category-specific hero and section images for all demo sites and generated websites

export const BROKEN_UNSPLASH_IDS = [
  "1581094288338-2314dddb7ecc",
  "1486006920555-c77dce18193b",
  "1508098682722-e99c43a406b2",
  "1541888946425-d0fbb186a5b3",
];

/**
 * Last-resort inline SVG fallback so images never render as broken icons or blank white boxes
 * even if the user's network blocks external CDNs.
 */
export const INLINE_SVG_IMAGE_FALLBACK =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0f172a"/><stop offset="50%" stop-color="#1e293b"/><stop offset="100%" stop-color="#334155"/></linearGradient></defs><rect width="1200" height="800" fill="url(#g)"/><circle cx="960" cy="180" r="220" fill="#3b82f6" fill-opacity="0.14"/><circle cx="240" cy="640" r="260" fill="#0ea5e9" fill-opacity="0.12"/><g fill="none" stroke="#94a3b8" stroke-opacity="0.35" stroke-width="2"><rect x="470" y="310" width="260" height="180" rx="18"/><circle cx="545" cy="375" r="22"/><path d="M490 460l65-65 45 45 35-35 75 55"/></g></svg>`
  );

export const INLINE_SVG_MAP_FALLBACK =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 320" preserveAspectRatio="xMidYMid slice"><rect width="800" height="320" fill="#e2e8f0"/><g stroke="#cbd5e1" stroke-width="10" fill="none"><path d="M0 80 L800 140"/><path d="M0 220 L800 180"/><path d="M180 0 L240 320"/><path d="M520 0 L470 320"/><path d="M680 0 L710 320"/></g><g stroke="#f8fafc" stroke-width="4" fill="none"><path d="M0 80 L800 140"/><path d="M0 220 L800 180"/><path d="M180 0 L240 320"/><path d="M520 0 L470 320"/></g></svg>`
  );

export function isBrokenOrInvalidImageUrl(url?: string | null): boolean {
  if (!url || typeof url !== "string") return true;
  const trimmed = url.trim();
  if (trimmed.length < 6) return true;
  const lower = trimmed.toLowerCase();
  if (
    lower === "undefined" ||
    lower === "null" ||
    lower.includes("/undefined") ||
    lower.includes("/null") ||
    lower.startsWith("javascript:") ||
    lower.startsWith("#") ||
    lower.includes("placeholder.com") ||
    lower.includes("via.placeholder")
  ) {
    return true;
  }
  if (BROKEN_UNSPLASH_IDS.some((id) => lower.includes(id))) {
    return true;
  }
  // Reject bare numeric placeholder photo IDs such as https://images.unsplash.com/photo-1
  if (/images\.unsplash\.com\/photo-\d{1,5}(?:$|[?&])/.test(lower)) {
    return true;
  }
  return false;
}

export const CATEGORY_HERO_IMAGES: Record<string, string> = {
  construction: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&q=80&w=1200",
  building: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&q=80&w=1200",
  restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200",
  food: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=1200",
  bistro: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200",
  salon: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200",
  beauty: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1200",
  spa: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=1200",
  barber: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&q=80&w=1200",
  law: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=1200",
  legal: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=1200",
  accounting: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1200",
  tax: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1200",
  finance: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1200",
  medical: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1200",
  health: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=1200",
  clinic: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200",
  automotive: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=1200",
  mechanic: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=1200",
  car: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=1200",
  realestate: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200",
  "real estate": "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1200",
  property: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200",
  education: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1200",
  school: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1200",
  preschool: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1200",
  daycare: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1200",
  football: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=1200",
  sports: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200",
  church: "https://images.unsplash.com/photo-1544427920-c49ccfb85579?auto=format&fit=crop&q=80&w=1200",
  hotel: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200",
  resort: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200",
  cleaning: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=1200",
  janitorial: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=1200",
  security: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&q=80&w=1200",
  catering: "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&q=80&w=1200",
  events: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200",
  event: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80&w=1200",
  retail: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200",
  shop: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200",
  boutique: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1200",
  printer: "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?auto=format&fit=crop&q=80&w=1200",
  print: "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?auto=format&fit=crop&q=80&w=1200",
  graphic: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=1200",
  sign: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=1200",
  marketing: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200",
  agriculture: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200",
  farm: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200",
  transport: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200",
  logistics: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200",
  tech: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=1200",
  it: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&q=80&w=1200",
  plumbing: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&q=80&w=1200",
  trades: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=1200",
  electric: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&q=80&w=1200",
  dental: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=1200",
  dentist: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&q=80&w=1200",
  bakery: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1200",
  pastry: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1200",
  hospitality: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200",
  default: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200"
};

export interface CategorySectionImageSet {
  hero: string;
  about: string;
  services: [string, string, string];
  gallery: Array<{ url: string; alt: string }>;
}

const u = (id: string, w = 1000) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=${w}`;

export function getCategorySectionImages(category?: string): CategorySectionImageSet {
  const c = (category || "").toLowerCase();

  if (c.includes("plumb") || c.includes("pipe") || c.includes("drain") || c.includes("geyser")) {
    return {
      hero: u("1585704032915-c3400ca199e7", 1200),
      about: u("1542013936693-884638332954"),
      services: [u("1542013936693-884638332954", 800), u("1505798577917-a65157d3320a", 800), u("1584622650111-993a426fbf0a", 800)],
      gallery: [
        { url: u("1585704032915-c3400ca199e7", 800), alt: "Professional plumbing tools and installation" },
        { url: u("1505798577917-a65157d3320a", 800), alt: "Pipework and pressure testing" },
        { url: u("1584622650111-993a426fbf0a", 800), alt: "Modern bathroom fixtures fitted cleanly" }
      ]
    };
  }

  if (c.includes("construct") || c.includes("build") || c.includes("civil") || c.includes("renovat") || c.includes("roof") || c.includes("electric") || c.includes("engineer")) {
    return {
      hero: u("1504307651254-35680f356dfd", 1200),
      about: u("1541888946425-d81bb19240f5"),
      services: [u("1541888946425-d81bb19240f5", 800), u("1581094794329-c8112a89af12", 800), u("1621905251189-08b45d6a269e", 800)],
      gallery: [
        { url: u("1504307651254-35680f356dfd", 800), alt: "Commercial construction site execution" },
        { url: u("1541888946425-d81bb19240f5", 800), alt: "Structural timber and steel framing" },
        { url: u("1621905251189-08b45d6a269e", 800), alt: "Electrical and finishing installation" }
      ]
    };
  }

  if (c.includes("bakery") || c.includes("pastry") || c.includes("cake") || c.includes("bread")) {
    return {
      hero: u("1509440159596-0249088772ff", 1200),
      about: u("1556910103-1c02745aae4d"),
      services: [u("1509440159596-0249088772ff", 800), u("1555244162-803834f70033", 800), u("1414235077428-338989a2e8c0", 800)],
      gallery: [
        { url: u("1509440159596-0249088772ff", 800), alt: "Fresh artisan loaves and pastries" },
        { url: u("1556910103-1c02745aae4d", 800), alt: "Morning bakery kitchen preparation" },
        { url: u("1414235077428-338989a2e8c0", 800), alt: "Plated specialty cafe selection" }
      ]
    };
  }

  if (c.includes("restaurant") || c.includes("food") || c.includes("diner") || c.includes("cafe") || c.includes("bistro") || c.includes("cater") || c.includes("grill")) {
    return {
      hero: u("1517248135467-4c7edcad34c4", 1200),
      about: u("1556910103-1c02745aae4d"),
      services: [u("1517248135467-4c7edcad34c4", 800), u("1555244162-803834f70033", 800), u("1565299624946-b28f40a0ae38", 800)],
      gallery: [
        { url: u("1555396273-367ea4eb4db5", 800), alt: "Signature dining room atmosphere" },
        { url: u("1414235077428-338989a2e8c0", 800), alt: "Chef-prepared seasonal dish" },
        { url: u("1555244162-803834f70033", 800), alt: "Catering platters and event spread" }
      ]
    };
  }

  if (c.includes("salon") || c.includes("beauty") || c.includes("hair") || c.includes("spa") || c.includes("barber") || c.includes("nail")) {
    return {
      hero: u("1560066984-138dadb4c035", 1200),
      about: u("1540555700478-4be289fbecef"),
      services: [u("1562322140-8baeececf3df", 800), u("1570172619644-dfd03ed5d881", 800), u("1604654894610-df63bc536371", 800)],
      gallery: [
        { url: u("1560066984-138dadb4c035", 800), alt: "Modern hair styling salon studio" },
        { url: u("1522337360788-8b13dee7a37e", 800), alt: "Beauty and cosmetic artistry" },
        { url: u("1503951914875-452162b0f3f1", 800), alt: "Precision grooming and barber care" }
      ]
    };
  }

  if (c.includes("mechanic") || c.includes("auto") || c.includes("car") || c.includes("garage") || c.includes("tyre") || c.includes("vehicle")) {
    return {
      hero: u("1619642751034-765dfdf7c58e", 1200),
      about: u("1487754180451-c456f719a1fc"),
      services: [u("1487754180451-c456f719a1fc", 800), u("1619642751034-765dfdf7c58e", 800), u("1503376780353-7e6692767b70", 800)],
      gallery: [
        { url: u("1619642751034-765dfdf7c58e", 800), alt: "Vehicle inspection in service bay" },
        { url: u("1487754180451-c456f719a1fc", 800), alt: "Engine oil and fluid maintenance" },
        { url: u("1552519507-da3b142c6e3d", 800), alt: "Road-ready vehicle handover" }
      ]
    };
  }

  if (c.includes("dental") || c.includes("dentist") || c.includes("orthodont")) {
    return {
      hero: u("1588776814546-1ffcf47267a5", 1200),
      about: u("1606811971618-4486d14f3f99"),
      services: [u("1588776814546-1ffcf47267a5", 800), u("1606811971618-4486d14f3f99", 800), u("1629909613654-28e377c37b09", 800)],
      gallery: [
        { url: u("1588776814546-1ffcf47267a5", 800), alt: "Modern dental examination chair" },
        { url: u("1606811971618-4486d14f3f99", 800), alt: "Clean dental treatment suite" },
        { url: u("1519494026892-80bbd2d6fd0d", 800), alt: "Welcoming patient reception" }
      ]
    };
  }

  if (c.includes("medical") || c.includes("clinic") || c.includes("doctor") || c.includes("health") || c.includes("optom") || c.includes("pharm")) {
    return {
      hero: u("1629909613654-28e377c37b09", 1200),
      about: u("1519494026892-80bbd2d6fd0d"),
      services: [u("1576091160550-2173dba999ef", 800), u("1582719478250-c89cae4dc85b", 800), u("1629909613654-28e377c37b09", 800)],
      gallery: [
        { url: u("1519494026892-80bbd2d6fd0d", 800), alt: "Bright clinical examination corridor" },
        { url: u("1576091160550-2173dba999ef", 800), alt: "Diagnostic medical consultation" },
        { url: u("1582719478250-c89cae4dc85b", 800), alt: "Laboratory testing equipment" }
      ]
    };
  }

  if (c.includes("law") || c.includes("legal") || c.includes("attorney") || c.includes("notary")) {
    return {
      hero: u("1589829545856-d10d557cf95f", 1200),
      about: u("1450133064473-71024230f91b"),
      services: [u("1589829545856-d10d557cf95f", 800), u("1450133064473-71024230f91b", 800), u("1497366216548-37526070297c", 800)],
      gallery: [
        { url: u("1589829545856-d10d557cf95f", 800), alt: "Law library and legal volumes" },
        { url: u("1450133064473-71024230f91b", 800), alt: "Attorney consultation and contract review" },
        { url: u("1497366216548-37526070297c", 800), alt: "Private legal chambers boardroom" }
      ]
    };
  }

  if (c.includes("account") || c.includes("tax") || c.includes("audit") || c.includes("finance") || c.includes("bookkeep") || c.includes("consult")) {
    return {
      hero: u("1554224155-8d04cb21cd6c", 1200),
      about: u("1454165804606-c3d57bc86b40"),
      services: [u("1554224155-8d04cb21cd6c", 800), u("1454165804606-c3d57bc86b40", 800), u("1507679799987-c73779587ccf", 800)],
      gallery: [
        { url: u("1554224155-8d04cb21cd6c", 800), alt: "Financial statements and tax analysis" },
        { url: u("1454165804606-c3d57bc86b40", 800), alt: "Quarterly business advisory review" },
        { url: u("1556761175-5973dc0f32e7", 800), alt: "Corporate advisory consultation" }
      ]
    };
  }

  if (c.includes("estate") || c.includes("property") || c.includes("realtor") || c.includes("realty")) {
    return {
      hero: u("1560518883-ce09059eeffa", 1200),
      about: u("1600596542815-ffad4c1539a9"),
      services: [u("1560518883-ce09059eeffa", 800), u("1600596542815-ffad4c1539a9", 800), u("1600585154340-be6161a56a0c", 800)],
      gallery: [
        { url: u("1600596542815-ffad4c1539a9", 800), alt: "Modern residential home exterior" },
        { url: u("1600585154340-be6161a56a0c", 800), alt: "Bright open-plan living interior" },
        { url: u("1560518883-ce09059eeffa", 800), alt: "Property handover keys and inspection" }
      ]
    };
  }

  if (c.includes("hotel") || c.includes("resort") || c.includes("lodge") || c.includes("inn") || c.includes("hospitality") || c.includes("tour") || c.includes("travel")) {
    return {
      hero: u("1566073771259-6a8506099945", 1200),
      about: u("1600585154340-be6161a56a0c"),
      services: [u("1566073771259-6a8506099945", 800), u("1600585154340-be6161a56a0c", 800), u("1517248135467-4c7edcad34c4", 800)],
      gallery: [
        { url: u("1566073771259-6a8506099945", 800), alt: "Boutique hotel courtyard and pool" },
        { url: u("1600585154340-be6161a56a0c", 800), alt: "Luxury guest suite interior" },
        { url: u("1517248135467-4c7edcad34c4", 800), alt: "Hospitality dining lounge" }
      ]
    };
  }

  if (c.includes("school") || c.includes("academy") || c.includes("educat") || c.includes("college") || c.includes("daycare") || c.includes("preschool")) {
    return {
      hero: u("1523240795612-9a054b0db644", 1200),
      about: u("1580582932707-520aed937b7b"),
      services: [u("1523240795612-9a054b0db644", 800), u("1580582932707-520aed937b7b", 800), u("1503676260728-1c00da094a0b", 800)],
      gallery: [
        { url: u("1523240795612-9a054b0db644", 800), alt: "Students collaborating on coursework" },
        { url: u("1580582932707-520aed937b7b", 800), alt: "Bright organized classroom environment" },
        { url: u("1503676260728-1c00da094a0b", 800), alt: "Hands-on early learning supplies" }
      ]
    };
  }

  if (c.includes("football") || c.includes("soccer") || c.includes("sport") || c.includes("athlet") || c.includes("gym") || c.includes("fitness")) {
    return {
      hero: u("1579952363873-27f3bade9f55", 1200),
      about: u("1574629810360-7efbbe195018"),
      services: [u("1579952363873-27f3bade9f55", 800), u("1574629810360-7efbbe195018", 800), u("1522071820081-009f0129c71c", 800)],
      gallery: [
        { url: u("1579952363873-27f3bade9f55", 800), alt: "Match ball on stadium turf" },
        { url: u("1574629810360-7efbbe195018", 800), alt: "Stadium training session under lights" },
        { url: u("1522071820081-009f0129c71c", 800), alt: "Team coordination and coaching" }
      ]
    };
  }

  if (c.includes("security") || c.includes("guard") || c.includes("alarm") || c.includes("cctv")) {
    return {
      hero: u("1557597774-9d273605dfa9", 1200),
      about: u("1558494949-ef010cbdcc31"),
      services: [u("1557597774-9d273605dfa9", 800), u("1558494949-ef010cbdcc31", 800), u("1518770660439-4636190af475", 800)],
      gallery: [
        { url: u("1557597774-9d273605dfa9", 800), alt: "Access control and security monitoring" },
        { url: u("1558494949-ef010cbdcc31", 800), alt: "Alarm and monitoring command hardware" },
        { url: u("1497366216548-37526070297c", 800), alt: "Commercial building security perimeter" }
      ]
    };
  }

  if (c.includes("clean") || c.includes("janitor") || c.includes("laundry") || c.includes("maid")) {
    return {
      hero: u("1581578731548-c64695cc6952", 1200),
      about: u("1507207611509-ec012433ff52"),
      services: [u("1581578731548-c64695cc6952", 800), u("1507207611509-ec012433ff52", 800), u("1600585154340-be6161a56a0c", 800)],
      gallery: [
        { url: u("1581578731548-c64695cc6952", 800), alt: "Professional deep cleaning equipment" },
        { url: u("1507207611509-ec012433ff52", 800), alt: "Spotless sanitized commercial workspace" },
        { url: u("1600585154340-be6161a56a0c", 800), alt: "Freshly detailed residential living area" }
      ]
    };
  }

  if (c.includes("print") || c.includes("graphic") || c.includes("sign") || c.includes("design") || c.includes("brand") || c.includes("market")) {
    return {
      hero: u("1562654501-a0ccc0fc3fb1", 1200),
      about: u("1561070791-2526d30994b5"),
      services: [u("1562654501-a0ccc0fc3fb1", 800), u("1561070791-2526d30994b5", 800), u("1460925895917-afdab827c52f", 800)],
      gallery: [
        { url: u("1562654501-a0ccc0fc3fb1", 800), alt: "Commercial printing press and color proofs" },
        { url: u("1561070791-2526d30994b5", 800), alt: "Brand identity swatches and layout design" },
        { url: u("1460925895917-afdab827c52f", 800), alt: "Digital campaign planning workspace" }
      ]
    };
  }

  if (c.includes("it ") || c === "it" || c.includes("tech") || c.includes("computer") || c.includes("network") || c.includes("software")) {
    return {
      hero: u("1519389950473-47ba0277781c", 1200),
      about: u("1558494949-ef010cbdcc31"),
      services: [u("1558494949-ef010cbdcc31", 800), u("1518770660439-4636190af475", 800), u("1519389950473-47ba0277781c", 800)],
      gallery: [
        { url: u("1558494949-ef010cbdcc31", 800), alt: "Managed server and network rack" },
        { url: u("1518770660439-4636190af475", 800), alt: "Precision electronics hardware servicing" },
        { url: u("1519389950473-47ba0277781c", 800), alt: "Technical support engineering team" }
      ]
    };
  }

  if (c.includes("event") || c.includes("wedding") || c.includes("party") || c.includes("church") || c.includes("ministry")) {
    return {
      hero: c.includes("church") ? u("1544427920-c49ccfb85579", 1200) : u("1511795409834-ef04bbd61622", 1200),
      about: c.includes("church") ? u("1438032005730-c779502df39b") : u("1555244162-803834f70033"),
      services: [u("1511795409834-ef04bbd61622", 800), u("1555244162-803834f70033", 800), u("1438032005730-c779502df39b", 800)],
      gallery: [
        { url: u("1511795409834-ef04bbd61622", 800), alt: "Decorated banquet and event setup" },
        { url: u("1555244162-803834f70033", 800), alt: "Hosted celebration reception" },
        { url: u("1544427920-c49ccfb85579", 800), alt: "Community gathering space" }
      ]
    };
  }

  if (c.includes("agricult") || c.includes("farm") || c.includes("crop") || c.includes("livestock")) {
    return {
      hero: u("1500382017468-9049fed747ef", 1200),
      about: u("1504917595217-d4dc5ebe6122"),
      services: [u("1500382017468-9049fed747ef", 800), u("1586528116311-ad8dd3c8310d", 800), u("1504917595217-d4dc5ebe6122", 800)],
      gallery: [
        { url: u("1500382017468-9049fed747ef", 800), alt: "Cultivated agricultural fields" },
        { url: u("1586528116311-ad8dd3c8310d", 800), alt: "Produce distribution and storage" },
        { url: u("1504917595217-d4dc5ebe6122", 800), alt: "Farm equipment maintenance" }
      ]
    };
  }

  if (c.includes("transport") || c.includes("logistics") || c.includes("freight") || c.includes("courier") || c.includes("delivery")) {
    return {
      hero: u("1586528116311-ad8dd3c8310d", 1200),
      about: u("1504917595217-d4dc5ebe6122"),
      services: [u("1586528116311-ad8dd3c8310d", 800), u("1619642751034-765dfdf7c58e", 800), u("1556742049-0cfed4f6a45d", 800)],
      gallery: [
        { url: u("1586528116311-ad8dd3c8310d", 800), alt: "Warehouse logistics and dispatch bays" },
        { url: u("1504917595217-d4dc5ebe6122", 800), alt: "Industrial fleet operations" },
        { url: u("1556742049-0cfed4f6a45d", 800), alt: "Client order tracking and delivery" }
      ]
    };
  }

  if (c.includes("retail") || c.includes("shop") || c.includes("store") || c.includes("boutique") || c.includes("clothing") || c.includes("merch")) {
    return {
      hero: u("1441986300917-64674bd600d8", 1200),
      about: u("1556742049-0cfed4f6a45d"),
      services: [u("1441986300917-64674bd600d8", 800), u("1556742049-0cfed4f6a45d", 800), u("1521737711867-e3b97375f902", 800)],
      gallery: [
        { url: u("1441986300917-64674bd600d8", 800), alt: "Curated storefront merchandise display" },
        { url: u("1556742049-0cfed4f6a45d", 800), alt: "Point-of-sale customer service counter" },
        { url: u("1521737711867-e3b97375f902", 800), alt: "Dedicated retail team assisting clients" }
      ]
    };
  }

  // General Business verified set
  return {
    hero: u("1497366216548-37526070297c", 1200),
    about: u("1521737711867-e3b97375f902"),
    services: [u("1556761175-5973dc0f32e7", 800), u("1521737711867-e3b97375f902", 800), u("1581092921461-eab62e97a780", 800)],
    gallery: [
      { url: u("1497366216548-37526070297c", 800), alt: "Modern client consultation space" },
      { url: u("1521737711867-e3b97375f902", 800), alt: "Dedicated local team in action" },
      { url: u("1556761175-5973dc0f32e7", 800), alt: "Completed quality project delivery" }
    ]
  };
}

export function getCategoryHeroImage(category?: string): string {
  if (!category) return CATEGORY_HERO_IMAGES.default;
  const lower = category.toLowerCase();
  for (const [key, url] of Object.entries(CATEGORY_HERO_IMAGES)) {
    if (key !== "default" && lower.includes(key)) {
      return url;
    }
  }
  return getCategorySectionImages(category).hero || CATEGORY_HERO_IMAGES.default;
}

export function resolveHeroImageUrl(site?: {
  hero?: { imageUrl?: string | null };
  gallery?: Array<{ url: string }>;
  category?: string;
} | null): string {
  if (!site) return CATEGORY_HERO_IMAGES.default;
  if (!isBrokenOrInvalidImageUrl(site.hero?.imageUrl)) {
    return site.hero!.imageUrl!.trim();
  }
  if (site.gallery && site.gallery.length > 0) {
    const firstValid = site.gallery.find((g) => !isBrokenOrInvalidImageUrl(g?.url));
    if (firstValid) return firstValid.url.trim();
  }
  return getCategoryHeroImage(site.category);
}
