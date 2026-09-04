import { PricingCalculator } from "../types";

export interface CountryPricingConfig {
  countryCode: string;
  countryName: string;
  name: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  currencyLabel: string;
  defaultCity: string;
  cities: string[];
  phonePrefix: string;
  pricing: PricingCalculator;
  defaultPricing: PricingCalculator;
  partner: {
    avgDealSize: number;
    minDealSize: number;
    maxDealSize: number;
    stepDealSize: number;
    monthlyRetainer: number;
    minRetainer: number;
    maxRetainer: number;
    stepRetainer: number;
    typicalTicketSizes: Record<string, string>;
  };
  sampleServicePrices: {
    diagnostic: string;
    standard: string;
    premium: string;
    custom: string;
  };
}

const RAW_SUPPORTED_COUNTRIES = [
  {
    countryCode: "SZ",
    countryName: "Eswatini",
    currencyCode: "SZL",
    currencySymbol: "E",
    currencyLabel: "E (SZL - Eswatini)",
    defaultCity: "Mbabane",
    cities: ["Mbabane", "Manzini", "Matsapha", "Ezulwini", "Nhlangano", "Siteki", "Pigg's Peak"],
    phonePrefix: "+268 76",
    pricing: {
      packageName: "Website Package & Mobile Design",
      packagePrice: 4500,
      hostingPrice: 300,
      maintenancePrice: 0,
      domainPrice: 0,
      emailPrice: 0,
      seoPrice: 0,
      gbpOtpPrice: 0,
      logoPrice: 0,
      supportMonthlyPrice: 0,
      isRecurring: true
    },
    partner: {
      avgDealSize: 4500,
      minDealSize: 1500,
      maxDealSize: 20000,
      stepDealSize: 500,
      monthlyRetainer: 300,
      minRetainer: 100,
      maxRetainer: 2000,
      stepRetainer: 50,
      typicalTicketSizes: {
        "graphic-designers": "E3,500 - E12,000",
        "photographers": "E2,500 - E8,500",
        "accountants": "E4,000 - E15,000",
        "printers": "E2,000 - E6,500",
        "sign-companies": "E3,500 - E10,000",
        "social-media-managers": "E3,000 - E9,500",
        "it-technicians": "E4,500 - E18,000",
        "marketing-agencies": "E5,500 - E25,000",
        "event-planners": "E2,500 - E8,000",
        "branding-companies": "E4,500 - E16,000"
      }
    },
    sampleServicePrices: {
      diagnostic: "E350",
      standard: "E850",
      premium: "E1,800",
      custom: "Custom Quote"
    }
  },
  {
    countryCode: "ZA",
    countryName: "South Africa",
    currencyCode: "ZAR",
    currencySymbol: "R",
    currencyLabel: "R (ZAR - South Africa)",
    defaultCity: "Johannesburg",
    cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Sandton", "Centurion", "Port Elizabeth"],
    phonePrefix: "+27 82",
    pricing: {
      packageName: "Website Package & Mobile Design",
      packagePrice: 4500,
      hostingPrice: 300,
      maintenancePrice: 0,
      domainPrice: 0,
      emailPrice: 0,
      seoPrice: 0,
      gbpOtpPrice: 0,
      logoPrice: 0,
      supportMonthlyPrice: 0,
      isRecurring: true
    },
    partner: {
      avgDealSize: 4500,
      minDealSize: 1500,
      maxDealSize: 25000,
      stepDealSize: 500,
      monthlyRetainer: 300,
      minRetainer: 100,
      maxRetainer: 2500,
      stepRetainer: 50,
      typicalTicketSizes: {
        "graphic-designers": "R4,000 - R15,000",
        "photographers": "R3,000 - R10,000",
        "accountants": "R5,000 - R18,000",
        "printers": "R2,500 - R8,000",
        "sign-companies": "R4,000 - R12,000",
        "social-media-managers": "R3,500 - R11,000",
        "it-technicians": "R5,500 - R20,000",
        "marketing-agencies": "R7,000 - R30,000",
        "event-planners": "R3,000 - R9,500",
        "branding-companies": "R5,500 - R18,000"
      }
    },
    sampleServicePrices: {
      diagnostic: "R450",
      standard: "R950",
      premium: "R2,200",
      custom: "Custom Quote"
    }
  },
  {
    countryCode: "US",
    countryName: "United States",
    currencyCode: "USD",
    currencySymbol: "$",
    currencyLabel: "$ (USD - United States)",
    defaultCity: "Austin",
    cities: ["Austin", "New York", "Los Angeles", "Chicago", "Houston", "Miami", "Seattle", "Atlanta"],
    phonePrefix: "+1 512",
    pricing: {
      packageName: "Website Package & Mobile Design",
      packagePrice: 650,
      hostingPrice: 45,
      maintenancePrice: 0,
      domainPrice: 0,
      emailPrice: 0,
      seoPrice: 0,
      gbpOtpPrice: 0,
      logoPrice: 0,
      supportMonthlyPrice: 0,
      isRecurring: true
    },
    partner: {
      avgDealSize: 1200,
      minDealSize: 400,
      maxDealSize: 6000,
      stepDealSize: 100,
      monthlyRetainer: 50,
      minRetainer: 20,
      maxRetainer: 300,
      stepRetainer: 10,
      typicalTicketSizes: {
        "graphic-designers": "$800 - $3,500",
        "photographers": "$600 - $2,500",
        "accountants": "$1,000 - $4,000",
        "printers": "$500 - $1,800",
        "sign-companies": "$900 - $3,000",
        "social-media-managers": "$700 - $2,800",
        "it-technicians": "$1,200 - $5,000",
        "marketing-agencies": "$1,500 - $6,000+",
        "event-planners": "$600 - $2,200",
        "branding-companies": "$1,200 - $4,500"
      }
    },
    sampleServicePrices: {
      diagnostic: "$85",
      standard: "$245",
      premium: "$490",
      custom: "Custom Quote"
    }
  },
  {
    countryCode: "GB",
    countryName: "United Kingdom",
    currencyCode: "GBP",
    currencySymbol: "£",
    currencyLabel: "£ (GBP - United Kingdom)",
    defaultCity: "London",
    cities: ["London", "Manchester", "Birmingham", "Leeds", "Glasgow", "Edinburgh", "Bristol"],
    phonePrefix: "+44 20",
    pricing: {
      packageName: "Website Package & Mobile Design",
      packagePrice: 500,
      hostingPrice: 35,
      maintenancePrice: 0,
      domainPrice: 0,
      emailPrice: 0,
      seoPrice: 0,
      gbpOtpPrice: 0,
      logoPrice: 0,
      supportMonthlyPrice: 0,
      isRecurring: true
    },
    partner: {
      avgDealSize: 1000,
      minDealSize: 350,
      maxDealSize: 5000,
      stepDealSize: 100,
      monthlyRetainer: 45,
      minRetainer: 20,
      maxRetainer: 250,
      stepRetainer: 5,
      typicalTicketSizes: {
        "graphic-designers": "£650 - £2,800",
        "photographers": "£500 - £2,000",
        "accountants": "£800 - £3,200",
        "printers": "£400 - £1,500",
        "sign-companies": "£750 - £2,500",
        "social-media-managers": "£600 - £2,200",
        "it-technicians": "£950 - £4,000",
        "marketing-agencies": "£1,200 - £5,000",
        "event-planners": "£500 - £1,800",
        "branding-companies": "£950 - £3,500"
      }
    },
    sampleServicePrices: {
      diagnostic: "£75",
      standard: "£195",
      premium: "£380",
      custom: "Custom Quote"
    }
  },
  {
    countryCode: "EU",
    countryName: "European Union",
    currencyCode: "EUR",
    currencySymbol: "€",
    currencyLabel: "€ (EUR - Eurozone)",
    defaultCity: "Berlin",
    cities: ["Berlin", "Paris", "Amsterdam", "Dublin", "Madrid", "Rome", "Brussels", "Vienna"],
    phonePrefix: "+49 30",
    pricing: {
      packageName: "Website Package & Mobile Design",
      packagePrice: 550,
      hostingPrice: 40,
      maintenancePrice: 0,
      domainPrice: 0,
      emailPrice: 0,
      seoPrice: 0,
      gbpOtpPrice: 0,
      logoPrice: 0,
      supportMonthlyPrice: 0,
      isRecurring: true
    },
    partner: {
      avgDealSize: 1100,
      minDealSize: 400,
      maxDealSize: 5500,
      stepDealSize: 100,
      monthlyRetainer: 45,
      minRetainer: 20,
      maxRetainer: 250,
      stepRetainer: 5,
      typicalTicketSizes: {
        "graphic-designers": "€700 - €3,000",
        "photographers": "€550 - €2,200",
        "accountants": "€850 - €3,500",
        "printers": "€450 - €1,600",
        "sign-companies": "€800 - €2,700",
        "social-media-managers": "€650 - €2,400",
        "it-technicians": "€1,000 - €4,200",
        "marketing-agencies": "€1,300 - €5,500",
        "event-planners": "€550 - €2,000",
        "branding-companies": "€1,000 - €3,800"
      }
    },
    sampleServicePrices: {
      diagnostic: "€80",
      standard: "€210",
      premium: "€420",
      custom: "Custom Quote"
    }
  },
  {
    countryCode: "KE",
    countryName: "Kenya",
    currencyCode: "KES",
    currencySymbol: "KSh",
    currencyLabel: "KSh (KES - Kenya)",
    defaultCity: "Nairobi",
    cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"],
    phonePrefix: "+254 7",
    pricing: {
      packageName: "Website Package & Mobile Design",
      packagePrice: 50000,
      hostingPrice: 3500,
      maintenancePrice: 0,
      domainPrice: 0,
      emailPrice: 0,
      seoPrice: 0,
      gbpOtpPrice: 0,
      logoPrice: 0,
      supportMonthlyPrice: 0,
      isRecurring: true
    },
    partner: {
      avgDealSize: 50000,
      minDealSize: 15000,
      maxDealSize: 250000,
      stepDealSize: 5000,
      monthlyRetainer: 3500,
      minRetainer: 1000,
      maxRetainer: 25000,
      stepRetainer: 500,
      typicalTicketSizes: {
        "graphic-designers": "KSh 35,000 - KSh 120,000",
        "photographers": "KSh 25,000 - KSh 85,000",
        "accountants": "KSh 45,000 - KSh 150,000",
        "printers": "KSh 20,000 - KSh 70,000",
        "sign-companies": "KSh 35,000 - KSh 110,000",
        "social-media-managers": "KSh 30,000 - KSh 95,000",
        "it-technicians": "KSh 50,000 - KSh 180,000",
        "marketing-agencies": "KSh 60,000 - KSh 250,000",
        "event-planners": "KSh 25,000 - KSh 80,000",
        "branding-companies": "KSh 45,000 - KSh 160,000"
      }
    },
    sampleServicePrices: {
      diagnostic: "KSh 4,500",
      standard: "KSh 12,000",
      premium: "KSh 25,000",
      custom: "Custom Quote"
    }
  },
  {
    countryCode: "NG",
    countryName: "Nigeria",
    currencyCode: "NGN",
    currencySymbol: "₦",
    currencyLabel: "₦ (NGN - Nigeria)",
    defaultCity: "Lagos",
    cities: ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Enugu"],
    phonePrefix: "+234 80",
    pricing: {
      packageName: "Website Package & Mobile Design",
      packagePrice: 350000,
      hostingPrice: 25000,
      maintenancePrice: 0,
      domainPrice: 0,
      emailPrice: 0,
      seoPrice: 0,
      gbpOtpPrice: 0,
      logoPrice: 0,
      supportMonthlyPrice: 0,
      isRecurring: true
    },
    partner: {
      avgDealSize: 350000,
      minDealSize: 100000,
      maxDealSize: 2000000,
      stepDealSize: 50000,
      monthlyRetainer: 25000,
      minRetainer: 10000,
      maxRetainer: 150000,
      stepRetainer: 5000,
      typicalTicketSizes: {
        "graphic-designers": "₦250,000 - ₦800,000",
        "photographers": "₦180,000 - ₦600,000",
        "accountants": "₦300,000 - ₦1,200,000",
        "printers": "₦150,000 - ₦500,000",
        "sign-companies": "₦250,000 - ₦750,000",
        "social-media-managers": "₦200,000 - ₦700,000",
        "it-technicians": "₦350,000 - ₦1,500,000",
        "marketing-agencies": "₦450,000 - ₦2,000,000",
        "event-planners": "₦180,000 - ₦650,000",
        "branding-companies": "₦300,000 - ₦1,200,000"
      }
    },
    sampleServicePrices: {
      diagnostic: "₦35,000",
      standard: "₦85,000",
      premium: "₦180,000",
      custom: "Custom Quote"
    }
  },
  {
    countryCode: "BW",
    countryName: "Botswana",
    currencyCode: "BWP",
    currencySymbol: "P",
    currencyLabel: "P (BWP - Botswana)",
    defaultCity: "Gaborone",
    cities: ["Gaborone", "Francistown", "Maun", "Kasane", "Selebi-Phikwe"],
    phonePrefix: "+267 7",
    pricing: {
      packageName: "Website Package & Mobile Design",
      packagePrice: 4000,
      hostingPrice: 250,
      maintenancePrice: 0,
      domainPrice: 0,
      emailPrice: 0,
      seoPrice: 0,
      gbpOtpPrice: 0,
      logoPrice: 0,
      supportMonthlyPrice: 0,
      isRecurring: true
    },
    partner: {
      avgDealSize: 4000,
      minDealSize: 1200,
      maxDealSize: 20000,
      stepDealSize: 500,
      monthlyRetainer: 250,
      minRetainer: 100,
      maxRetainer: 1800,
      stepRetainer: 50,
      typicalTicketSizes: {
        "graphic-designers": "P3,000 - P10,000",
        "photographers": "P2,200 - P7,500",
        "accountants": "P3,800 - P12,000",
        "printers": "P1,800 - P5,500",
        "sign-companies": "P3,000 - P9,000",
        "social-media-managers": "P2,500 - P8,000",
        "it-technicians": "P4,000 - P15,000",
        "marketing-agencies": "P5,000 - P20,000",
        "event-planners": "P2,200 - P7,000",
        "branding-companies": "P3,800 - P13,000"
      }
    },
    sampleServicePrices: {
      diagnostic: "P350",
      standard: "P800",
      premium: "P1,600",
      custom: "Custom Quote"
    }
  },
  {
    countryCode: "NA",
    countryName: "Namibia",
    currencyCode: "NAD",
    currencySymbol: "N$",
    currencyLabel: "N$ (NAD - Namibia)",
    defaultCity: "Windhoek",
    cities: ["Windhoek", "Walvis Bay", "Swakopmund", "Oshakati"],
    phonePrefix: "+264 81",
    pricing: {
      packageName: "Website Package & Mobile Design",
      packagePrice: 4500,
      hostingPrice: 300,
      maintenancePrice: 0,
      domainPrice: 0,
      emailPrice: 0,
      seoPrice: 0,
      gbpOtpPrice: 0,
      logoPrice: 0,
      supportMonthlyPrice: 0,
      isRecurring: true
    },
    partner: {
      avgDealSize: 4500,
      minDealSize: 1500,
      maxDealSize: 22000,
      stepDealSize: 500,
      monthlyRetainer: 300,
      minRetainer: 100,
      maxRetainer: 2200,
      stepRetainer: 50,
      typicalTicketSizes: {
        "graphic-designers": "N$3,500 - N$12,000",
        "photographers": "N$2,500 - N$8,500",
        "accountants": "N$4,200 - N$14,000",
        "printers": "N$2,200 - N$6,500",
        "sign-companies": "N$3,500 - N$10,000",
        "social-media-managers": "N$3,000 - N$9,000",
        "it-technicians": "N$4,500 - N$16,000",
        "marketing-agencies": "N$5,500 - N$22,000",
        "event-planners": "N$2,500 - N$8,000",
        "branding-companies": "N$4,200 - N$14,000"
      }
    },
    sampleServicePrices: {
      diagnostic: "N$400",
      standard: "N$900",
      premium: "N$1,900",
      custom: "Custom Quote"
    }
  },
  {
    countryCode: "GH",
    countryName: "Ghana",
    currencyCode: "GHS",
    currencySymbol: "GH₵",
    currencyLabel: "GH₵ (GHS - Ghana)",
    defaultCity: "Accra",
    cities: ["Accra", "Kumasi", "Tamale", "Takoradi", "Tema"],
    phonePrefix: "+233 24",
    pricing: {
      packageName: "Website Package & Mobile Design",
      packagePrice: 6500,
      hostingPrice: 450,
      maintenancePrice: 0,
      domainPrice: 0,
      emailPrice: 0,
      seoPrice: 0,
      gbpOtpPrice: 0,
      logoPrice: 0,
      supportMonthlyPrice: 0,
      isRecurring: true
    },
    partner: {
      avgDealSize: 6500,
      minDealSize: 2000,
      maxDealSize: 35000,
      stepDealSize: 500,
      monthlyRetainer: 450,
      minRetainer: 150,
      maxRetainer: 3000,
      stepRetainer: 50,
      typicalTicketSizes: {
        "graphic-designers": "GH₵ 5,000 - GH₵ 18,000",
        "photographers": "GH₵ 3,500 - GH₵ 12,000",
        "accountants": "GH₵ 6,000 - GH₵ 22,000",
        "printers": "GH₵ 3,000 - GH₵ 9,500",
        "sign-companies": "GH₵ 5,000 - GH₵ 15,000",
        "social-media-managers": "GH₵ 4,000 - GH₵ 14,000",
        "it-technicians": "GH₵ 6,500 - GH₵ 25,000",
        "marketing-agencies": "GH₵ 8,000 - GH₵ 35,000",
        "event-planners": "GH₵ 3,500 - GH₵ 12,000",
        "branding-companies": "GH₵ 6,000 - GH₵ 22,000"
      }
    },
    sampleServicePrices: {
      diagnostic: "GH₵ 600",
      standard: "GH₵ 1,400",
      premium: "GH₵ 2,800",
      custom: "Custom Quote"
    }
  },
  {
    countryCode: "AU",
    countryName: "Australia",
    currencyCode: "AUD",
    currencySymbol: "A$",
    currencyLabel: "A$ (AUD - Australia)",
    defaultCity: "Sydney",
    cities: ["Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast"],
    phonePrefix: "+61 4",
    pricing: {
      packageName: "Website Package & Mobile Design",
      packagePrice: 850,
      hostingPrice: 55,
      maintenancePrice: 0,
      domainPrice: 0,
      emailPrice: 0,
      seoPrice: 0,
      gbpOtpPrice: 0,
      logoPrice: 0,
      supportMonthlyPrice: 0,
      isRecurring: true
    },
    partner: {
      avgDealSize: 1600,
      minDealSize: 500,
      maxDealSize: 8000,
      stepDealSize: 100,
      monthlyRetainer: 75,
      minRetainer: 25,
      maxRetainer: 400,
      stepRetainer: 10,
      typicalTicketSizes: {
        "graphic-designers": "A$1,000 - A$4,500",
        "photographers": "A$800 - A$3,200",
        "accountants": "A$1,200 - A$5,000",
        "printers": "A$600 - A$2,200",
        "sign-companies": "A$1,100 - A$4,000",
        "social-media-managers": "A$900 - A$3,500",
        "it-technicians": "A$1,500 - A$6,000",
        "marketing-agencies": "A$2,000 - A$8,000",
        "event-planners": "A$800 - A$2,800",
        "branding-companies": "A$1,500 - A$5,500"
      }
    },
    sampleServicePrices: {
      diagnostic: "A$120",
      standard: "A$320",
      premium: "A$650",
      custom: "Custom Quote"
    }
  },
  {
    countryCode: "CA",
    countryName: "Canada",
    currencyCode: "CAD",
    currencySymbol: "CA$",
    currencyLabel: "CA$ (CAD - Canada)",
    defaultCity: "Toronto",
    cities: ["Toronto", "Vancouver", "Montreal", "Calgary", "Ottawa", "Edmonton"],
    phonePrefix: "+1 416",
    pricing: {
      packageName: "Website Package & Mobile Design",
      packagePrice: 800,
      hostingPrice: 50,
      maintenancePrice: 0,
      domainPrice: 0,
      emailPrice: 0,
      seoPrice: 0,
      gbpOtpPrice: 0,
      logoPrice: 0,
      supportMonthlyPrice: 0,
      isRecurring: true
    },
    partner: {
      avgDealSize: 1500,
      minDealSize: 500,
      maxDealSize: 7500,
      stepDealSize: 100,
      monthlyRetainer: 70,
      minRetainer: 25,
      maxRetainer: 350,
      stepRetainer: 10,
      typicalTicketSizes: {
        "graphic-designers": "CA$950 - CA$4,200",
        "photographers": "CA$750 - CA$3,000",
        "accountants": "CA$1,150 - CA$4,800",
        "printers": "CA$550 - CA$2,000",
        "sign-companies": "CA$1,000 - CA$3,800",
        "social-media-managers": "CA$850 - CA$3,200",
        "it-technicians": "CA$1,400 - CA$5,800",
        "marketing-agencies": "CA$1,800 - CA$7,500",
        "event-planners": "CA$750 - CA$2,600",
        "branding-companies": "CA$1,400 - CA$5,200"
      }
    },
    sampleServicePrices: {
      diagnostic: "CA$110",
      standard: "CA$295",
      premium: "CA$590",
      custom: "Custom Quote"
    }
  },
  {
    countryCode: "IN",
    countryName: "India",
    currencyCode: "INR",
    currencySymbol: "₹",
    currencyLabel: "₹ (INR - India)",
    defaultCity: "Mumbai",
    cities: ["Mumbai", "Bengaluru", "Delhi", "Hyderabad", "Chennai", "Pune", "Kolkata"],
    phonePrefix: "+91 98",
    pricing: {
      packageName: "Website Package & Mobile Design",
      packagePrice: 35000,
      hostingPrice: 2500,
      maintenancePrice: 0,
      domainPrice: 0,
      emailPrice: 0,
      seoPrice: 0,
      gbpOtpPrice: 0,
      logoPrice: 0,
      supportMonthlyPrice: 0,
      isRecurring: true
    },
    partner: {
      avgDealSize: 40000,
      minDealSize: 12000,
      maxDealSize: 200000,
      stepDealSize: 5000,
      monthlyRetainer: 3000,
      minRetainer: 1000,
      maxRetainer: 20000,
      stepRetainer: 500,
      typicalTicketSizes: {
        "graphic-designers": "₹25,000 - ₹90,000",
        "photographers": "₹18,000 - ₹65,000",
        "accountants": "₹30,000 - ₹120,000",
        "printers": "₹15,000 - ₹50,000",
        "sign-companies": "₹25,000 - ₹80,000",
        "social-media-managers": "₹20,000 - ₹75,000",
        "it-technicians": "₹35,000 - ₹150,000",
        "marketing-agencies": "₹45,000 - ₹200,000",
        "event-planners": "₹18,000 - ₹70,000",
        "branding-companies": "₹30,000 - ₹120,000"
      }
    },
    sampleServicePrices: {
      diagnostic: "₹3,500",
      standard: "₹9,500",
      premium: "₹19,000",
      custom: "Custom Quote"
    }
  }
];

const COUNTRY_FLAGS: Record<string, string> = {
  SZ: "🇸🇿",
  ZA: "🇿🇦",
  US: "🇺🇸",
  GB: "🇬🇧",
  EU: "🇪🇺",
  KE: "🇰🇪",
  NG: "🇳🇬",
  BW: "🇧🇼",
  NA: "🇳🇦",
  GH: "🇬🇭",
  AU: "🇦🇺",
  CA: "🇨🇦",
  IN: "🇮🇳"
};

export const SUPPORTED_COUNTRIES: CountryPricingConfig[] = RAW_SUPPORTED_COUNTRIES.map((c) => ({
  ...c,
  name: c.countryName,
  flag: COUNTRY_FLAGS[c.countryCode] || "🌐",
  defaultPricing: c.pricing
}));

export const DEFAULT_COUNTRY: CountryPricingConfig = SUPPORTED_COUNTRIES[0]; // Eswatini

export function detectCountryFromLocation(locationText: string = ""): CountryPricingConfig {
  if (!locationText || typeof locationText !== "string") return DEFAULT_COUNTRY;
  const text = locationText.toLowerCase();

  // Eswatini
  if (
    text.includes("eswatini") ||
    text.includes("swaziland") ||
    text.includes("mbabane") ||
    text.includes("manzini") ||
    text.includes("matsapha") ||
    text.includes("ezulwini") ||
    text.includes("nhlangano") ||
    text.includes("siteki") ||
    text.includes("pigg's peak") ||
    text.includes("piggs peak")
  ) {
    return SUPPORTED_COUNTRIES.find(c => c.countryCode === "SZ") || DEFAULT_COUNTRY;
  }

  // South Africa
  if (
    text.includes("south africa") ||
    text.includes("johannesburg") ||
    text.includes("cape town") ||
    text.includes("durban") ||
    text.includes("pretoria") ||
    text.includes("sandton") ||
    text.includes("centurion") ||
    text.includes(", sa") ||
    text.endsWith(" sa") ||
    text.includes(" gauteng") ||
    text.includes(" kwazulu") ||
    text.includes(" western cape")
  ) {
    return SUPPORTED_COUNTRIES.find(c => c.countryCode === "ZA") || DEFAULT_COUNTRY;
  }

  // United Kingdom
  if (
    text.includes("united kingdom") ||
    text.includes("london") ||
    text.includes("manchester") ||
    text.includes("birmingham") ||
    text.includes("glasgow") ||
    text.includes("edinburgh") ||
    text.includes("bristol") ||
    text.includes(", uk") ||
    text.endsWith(" uk") ||
    text.includes("england") ||
    text.includes("scotland") ||
    text.includes("wales")
  ) {
    return SUPPORTED_COUNTRIES.find(c => c.countryCode === "GB") || DEFAULT_COUNTRY;
  }

  // United States
  if (
    text.includes("united states") ||
    text.includes("usa") ||
    text.includes("austin") ||
    text.includes("texas") ||
    text.includes("new york") ||
    text.includes("los angeles") ||
    text.includes("california") ||
    text.includes("chicago") ||
    text.includes("houston") ||
    text.includes("miami") ||
    text.includes("seattle") ||
    text.includes("atlanta") ||
    text.includes(", tx") ||
    text.includes(", ca") ||
    text.includes(", ny") ||
    text.includes(", fl") ||
    text.includes(", il") ||
    text.includes(", wa")
  ) {
    return SUPPORTED_COUNTRIES.find(c => c.countryCode === "US") || DEFAULT_COUNTRY;
  }

  // European Union
  if (
    text.includes("germany") ||
    text.includes("france") ||
    text.includes("spain") ||
    text.includes("italy") ||
    text.includes("ireland") ||
    text.includes("netherlands") ||
    text.includes("berlin") ||
    text.includes("paris") ||
    text.includes("amsterdam") ||
    text.includes("dublin") ||
    text.includes("madrid") ||
    text.includes("rome") ||
    text.includes("brussels") ||
    text.includes("vienna") ||
    text.includes("europe") ||
    text.includes("eu")
  ) {
    return SUPPORTED_COUNTRIES.find(c => c.countryCode === "EU") || DEFAULT_COUNTRY;
  }

  // Kenya
  if (
    text.includes("kenya") ||
    text.includes("nairobi") ||
    text.includes("mombasa") ||
    text.includes("kisumu") ||
    text.includes("nakuru")
  ) {
    return SUPPORTED_COUNTRIES.find(c => c.countryCode === "KE") || DEFAULT_COUNTRY;
  }

  // Nigeria
  if (
    text.includes("nigeria") ||
    text.includes("lagos") ||
    text.includes("abuja") ||
    text.includes("port harcourt") ||
    text.includes("ibadan") ||
    text.includes("kano")
  ) {
    return SUPPORTED_COUNTRIES.find(c => c.countryCode === "NG") || DEFAULT_COUNTRY;
  }

  // Botswana
  if (
    text.includes("botswana") ||
    text.includes("gaborone") ||
    text.includes("francistown") ||
    text.includes("maun")
  ) {
    return SUPPORTED_COUNTRIES.find(c => c.countryCode === "BW") || DEFAULT_COUNTRY;
  }

  // Namibia
  if (
    text.includes("namibia") ||
    text.includes("windhoek") ||
    text.includes("walvis bay") ||
    text.includes("swakopmund")
  ) {
    return SUPPORTED_COUNTRIES.find(c => c.countryCode === "NA") || DEFAULT_COUNTRY;
  }

  // Ghana
  if (
    text.includes("ghana") ||
    text.includes("accra") ||
    text.includes("kumasi") ||
    text.includes("takoradi")
  ) {
    return SUPPORTED_COUNTRIES.find(c => c.countryCode === "GH") || DEFAULT_COUNTRY;
  }

  // Australia
  if (
    text.includes("australia") ||
    text.includes("sydney") ||
    text.includes("melbourne") ||
    text.includes("brisbane") ||
    text.includes("perth") ||
    text.includes("adelaide")
  ) {
    return SUPPORTED_COUNTRIES.find(c => c.countryCode === "AU") || DEFAULT_COUNTRY;
  }

  // Canada
  if (
    text.includes("canada") ||
    text.includes("toronto") ||
    text.includes("vancouver") ||
    text.includes("montreal") ||
    text.includes("calgary") ||
    text.includes("ottawa")
  ) {
    return SUPPORTED_COUNTRIES.find(c => c.countryCode === "CA") || DEFAULT_COUNTRY;
  }

  // India
  if (
    text.includes("india") ||
    text.includes("mumbai") ||
    text.includes("bengaluru") ||
    text.includes("bangalore") ||
    text.includes("delhi") ||
    text.includes("hyderabad") ||
    text.includes("chennai") ||
    text.includes("pune")
  ) {
    return SUPPORTED_COUNTRIES.find(c => c.countryCode === "IN") || DEFAULT_COUNTRY;
  }

  // Fallback to default
  return DEFAULT_COUNTRY;
}

export function getCountryByCode(code: string): CountryPricingConfig {
  return SUPPORTED_COUNTRIES.find(c => c.countryCode.toLowerCase() === code.toLowerCase()) || DEFAULT_COUNTRY;
}

export function getCountryBySymbol(symbol: string): CountryPricingConfig {
  return SUPPORTED_COUNTRIES.find(c => c.currencySymbol === symbol) || DEFAULT_COUNTRY;
}

export function formatPriceWithSymbol(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString()}`;
}
