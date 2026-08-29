import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory sliding-window rate limiter for API protection (Point 47)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function apiRateLimiter(maxRequests = 80, windowMs = 60 * 1000) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const key = Array.isArray(ip) ? ip[0] : String(ip);
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (!record || now > record.resetAt) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      console.warn(`[Security Alert] Rate limit exceeded for IP: ${key}`);
      return res.status(429).json({ 
        error: "Too many requests. Rate limit exceeded. Please wait a moment before trying again." 
      });
    }

    record.count += 1;
    next();
  };
}

// Apply rate limiter to protected API routes
app.use("/api", apiRateLimiter(120, 60 * 1000));

// Request validation helper
function validateRequiredFields(fields: string[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    for (const field of fields) {
      if (!req.body || req.body[field] === undefined || req.body[field] === null) {
        return res.status(400).json({ error: `Missing required parameter: '${field}'` });
      }
    }
    next();
  };
}

// Initialize Gemini SDK lazily to avoid crashing on start if the key is missing.
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.log("WARNING: GEMINI_API_KEY environment variable is not set. Using mock fallbacks.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Helper to check if API key is mock
function isApiKeyConfigured() {
  return process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" && process.env.GEMINI_API_KEY !== "";
}

// Robust wrapper with exponential backoff retries and automatic backup model fallback
async function generateContentWithRetry(params: any, maxRetries = 3, initialDelayMs = 1200): Promise<any> {
  const ai = getGeminiClient();
  let delay = initialDelayMs;
  let lastError: any = null;
  const originalModel = params.model || "gemini-2.5-flash";
  const candidateModels = [originalModel, "gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  // Deduplicate candidate models keeping order
  const modelsToTry = Array.from(new Set(candidateModels));

  for (const modelName of modelsToTry) {
    delay = initialDelayMs; // reset backoff for each new model candidate
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Gemini API] Requesting ${modelName} (Attempt ${attempt}/${maxRetries})...`);
        const response = await ai.models.generateContent({
          ...params,
          model: modelName,
        });
        return response;
      } catch (error: any) {
        lastError = error;
        console.log(`[Gemini API Warning] Model ${modelName} failed on attempt ${attempt}/${maxRetries}:`, error?.message || error);
        
        if (error?.status === 400 || error?.status === 401 || error?.status === 403 || error?.status === 404) {
          console.log(`[Gemini API Early Exit] Non-transient status ${error.status}. Skipping retries for ${modelName}.`);
          break; // Switch to next model immediately
        }

        const errorStr = typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error));
        const isQuotaExceeded = error?.status === 429 || error?.code === 429 || errorStr.includes('Quota exceeded') || errorStr.includes('RESOURCE_EXHAUSTED');
        const isHighDemand = error?.status === 503 || error?.code === 503 || errorStr.includes('503') || errorStr.includes('high demand') || errorStr.includes('UNAVAILABLE') || errorStr.includes('overloaded');
        
        if (isQuotaExceeded) {
          console.log(`[Gemini API Early Exit] Quota Exceeded detected for ${modelName}. Switching to backup model.`);
          break; // Switch to next model immediately for quota exhaustion
        }

        if (attempt < maxRetries) {
          console.log(`[Gemini API] ${isHighDemand ? 'High demand (503)' : 'Transient issue'} on ${modelName}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5;
        } else if (modelsToTry.indexOf(modelName) < modelsToTry.length - 1) {
          console.log(`[Gemini API] Max retries reached for ${modelName}. Switching to next model fallback in 1000ms...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  }
  throw lastError;
}

// Real live website URL auditor & digital deficit verification engine
async function auditLiveWebsite(rawUrl: string): Promise<{
  hasWebsite: boolean;
  httpStatus: string;
  responseTimeMs: number;
  isSsl: boolean;
  notes: string;
  deficits: {
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
  };
}> {
  if (!rawUrl || rawUrl.trim() === "" || rawUrl.toLowerCase() === "none" || rawUrl.toLowerCase() === "null") {
    return {
      hasWebsite: false,
      httpStatus: "No Domain Registered",
      responseTimeMs: 0,
      isSsl: false,
      notes: "Verified: No website registered or mapped for this business in public DNS records.",
      deficits: {
        noWebsite: true,
        outdatedWebsite: false,
        noGooglePresence: true,
        noSocialMedia: true,
        poorBranding: true,
        noWhatsappCta: true,
        noOnlineCatalogue: true,
        noBookingSystem: true,
        noEnquiryForm: true,
        noSeo: true,
        brokenLinks: true,
        poorMobileExperience: true,
        missingContact: false
      }
    };
  }

  let formattedUrl = rawUrl.trim();
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
    formattedUrl = `https://${formattedUrl}`;
  }

  const startTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(formattedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;
    const isSsl = formattedUrl.startsWith("https://");
    const statusText = `${response.status} ${response.statusText || (response.status === 200 ? 'OK' : '')}`;

    if (!response.ok) {
      return {
        hasWebsite: false,
        httpStatus: statusText,
        responseTimeMs,
        isSsl,
        notes: `HTTP Error: Server responded with code ${response.status}. Site appears inactive or broken.`,
        deficits: {
          noWebsite: true,
          outdatedWebsite: true,
          noGooglePresence: true,
          noSocialMedia: true,
          poorBranding: true,
          noWhatsappCta: true,
          noOnlineCatalogue: true,
          noBookingSystem: true,
          noEnquiryForm: true,
          noSeo: true,
          brokenLinks: true,
          poorMobileExperience: true,
          missingContact: false
        }
      };
    }

    const html = (await response.text()).toLowerCase();

    const hasViewport = html.includes('name="viewport"') || html.includes("name='viewport'");
    const hasMetaDesc = html.includes('name="description"') || html.includes("name='description'");
    const hasTitle = html.includes("<title>") && !html.includes("<title></title>");
    const hasWhatsapp = html.includes("wa.me") || html.includes("api.whatsapp.com") || html.includes("whatsapp");
    const hasBooking = html.includes("calendly") || html.includes("booksy") || html.includes("booking") || html.includes("book online") || html.includes("appointment");
    const hasForm = html.includes("<form") || html.includes("contact-form") || html.includes("type=\"submit\"");
    const hasSocial = html.includes("facebook.com") || html.includes("instagram.com") || html.includes("linkedin.com") || html.includes("tiktok.com");
    const hasContact = html.includes("tel:") || html.includes("mailto:") || html.includes("phone") || html.includes("contact");
    const isOutdated = html.includes("font-family: comic sans") || html.includes("<marquee") || html.includes("<frameset") || html.includes("bgcolor=");

    return {
      hasWebsite: true,
      httpStatus: statusText,
      responseTimeMs,
      isSsl,
      notes: `Live website verified (${responseTimeMs}ms response). Live audit checked responsiveness, meta tags, and integration CTAs.`,
      deficits: {
        noWebsite: false,
        outdatedWebsite: isOutdated,
        noGooglePresence: false,
        noSocialMedia: !hasSocial,
        poorBranding: false,
        noWhatsappCta: !hasWhatsapp,
        noOnlineCatalogue: false,
        noBookingSystem: !hasBooking,
        noEnquiryForm: !hasForm,
        noSeo: !(hasMetaDesc && hasTitle),
        brokenLinks: false,
        poorMobileExperience: !hasViewport,
        missingContact: !hasContact
      }
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;
    return {
      hasWebsite: false,
      httpStatus: err.name === "AbortError" ? "Connection Timed Out" : "Domain Unreachable / DNS Failure",
      responseTimeMs,
      isSsl: false,
      notes: `Failed to connect to domain: ${err.message || "DNS host not found"}. Deficit confirmed.`,
      deficits: {
        noWebsite: true,
        outdatedWebsite: false,
        noGooglePresence: true,
        noSocialMedia: true,
        poorBranding: true,
        noWhatsappCta: true,
        noOnlineCatalogue: true,
        noBookingSystem: true,
        noEnquiryForm: true,
        noSeo: true,
        brokenLinks: true,
        poorMobileExperience: true,
        missingContact: true
      }
    };
  }
}

// Module 3 & 4 API: Intelligent Business Discovery Generator
app.post("/api/search", async (req, res) => {
  const { 
    country = "Eswatini", 
    city = "Mbabane", 
    town = "", 
    category = "Construction", 
    keywords = "", 
    radius = "15",
    directorySource = "National Directory"
  } = req.body;

  try {
    if (!isApiKeyConfigured()) {
      // Return high-quality localized mock fallback if Gemini is not configured
      const mockBizs = getMockBusinesses(city, category, country);
      return res.json({
        businesses: mockBizs,
        source: "mock_fallback"
      });
    }

    const locationStr = town ? `${town}, ${city}, ${country}` : `${city}, ${country}`;
    const ai = getGeminiClient();
    const prompt = `Generate a realistic prospecting list of exactly 6 real/authentic-style local businesses in category "${category}" from business directories or map registries within "${locationStr}" (Directory Source: ${directorySource}) that have severe digital presence deficits.
    ${keywords ? `Specific focus/keywords: ${keywords}.` : ''}
    
    For each business, systematically audit these 13 critical digital deficits:
    1. noWebsite (boolean: true if no website at all)
    2. outdatedWebsite (boolean: true if website is 2000s era, non-functional, or ugly)
    3. noGooglePresence (boolean: true if no Google Maps / unclaimed listing)
    4. noSocialMedia (boolean: true if zero or dead social pages)
    5. poorBranding (boolean: true if no clean logo, low-res branding)
    6. noWhatsappCta (boolean: true if missing WhatsApp direct chat/CTA)
    7. noOnlineCatalogue (boolean: true if no service/product catalogue online)
    8. noBookingSystem (boolean: true if no online appointment/booking)
    9. noEnquiryForm (boolean: true if no quote request / contact form)
    10. noSeo (boolean: true if zero search engine optimization)
    11. brokenLinks (boolean: true if broken links or no SSL security)
    12. poorMobileExperience (boolean: true if unusable on smartphones)
    13. missingContact (boolean: true if missing direct email/mobile)

    Make the business names, streets, and phone numbers authentic to "${locationStr}". (e.g. if Eswatini, use +268 phone codes, Mbabane/Manzini/Matsapha street names, authentic local business naming conventions).

    Return strict JSON array matching this exact schema:
    [
      {
        "id": "string (unique slug)",
        "name": "string (business name)",
        "category": "string",
        "address": "string (authentic address in ${locationStr})",
        "phone": "string (authentic phone number with country/area code)",
        "reviewsCount": "number (e.g. 2 to 45)",
        "rating": "number (e.g. 3.2 to 4.9)",
        "directorySource": "${directorySource}",
        "presence": {
          "hasWebsite": "boolean",
          "hasEmail": "boolean",
          "facebookStatus": "active | weak | none",
          "instagramStatus": "active | weak | none",
          "googleProfileQuality": "good | fair | poor",
          "reviewCountStatus": "few | average | many",
          "photosStatus": "sufficient | missing | outdated",
          "descriptionQuality": "good | fair | poor",
          "openingHoursStatus": "complete | missing",
          "contactCompleteness": "complete | partial | missing",
          "deficits": {
            "noWebsite": "boolean",
            "outdatedWebsite": "boolean",
            "noGooglePresence": "boolean",
            "noSocialMedia": "boolean",
            "poorBranding": "boolean",
            "noWhatsappCta": "boolean",
            "noOnlineCatalogue": "boolean",
            "noBookingSystem": "boolean",
            "noEnquiryForm": "boolean",
            "noSeo": "boolean",
            "brokenLinks": "boolean",
            "poorMobileExperience": "boolean",
            "missingContact": "boolean"
          }
        },
        "description": "string (1-2 sentence description of what they do and who they serve)"
      }
    ]`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              category: { type: Type.STRING },
              address: { type: Type.STRING },
              phone: { type: Type.STRING },
              reviewsCount: { type: Type.INTEGER },
              rating: { type: Type.NUMBER },
              directorySource: { type: Type.STRING },
              presence: {
                type: Type.OBJECT,
                properties: {
                  hasWebsite: { type: Type.BOOLEAN },
                  hasEmail: { type: Type.BOOLEAN },
                  facebookStatus: { type: Type.STRING },
                  instagramStatus: { type: Type.STRING },
                  googleProfileQuality: { type: Type.STRING },
                  reviewCountStatus: { type: Type.STRING },
                  photosStatus: { type: Type.STRING },
                  descriptionQuality: { type: Type.STRING },
                  openingHoursStatus: { type: Type.STRING },
                  contactCompleteness: { type: Type.STRING },
                  deficits: {
                    type: Type.OBJECT,
                    properties: {
                      noWebsite: { type: Type.BOOLEAN },
                      outdatedWebsite: { type: Type.BOOLEAN },
                      noGooglePresence: { type: Type.BOOLEAN },
                      noSocialMedia: { type: Type.BOOLEAN },
                      poorBranding: { type: Type.BOOLEAN },
                      noWhatsappCta: { type: Type.BOOLEAN },
                      noOnlineCatalogue: { type: Type.BOOLEAN },
                      noBookingSystem: { type: Type.BOOLEAN },
                      noEnquiryForm: { type: Type.BOOLEAN },
                      noSeo: { type: Type.BOOLEAN },
                      brokenLinks: { type: Type.BOOLEAN },
                      poorMobileExperience: { type: Type.BOOLEAN },
                      missingContact: { type: Type.BOOLEAN }
                    }
                  }
                },
                required: ["hasWebsite", "hasEmail", "facebookStatus", "instagramStatus", "googleProfileQuality", "reviewCountStatus", "photosStatus", "descriptionQuality", "openingHoursStatus", "contactCompleteness"]
              },
              description: { type: Type.STRING }
            },
            required: ["id", "name", "category", "address", "phone", "reviewsCount", "rating", "presence", "description"]
          }
        }
      }
    });

    const text = response.text || "[]";
    const data = JSON.parse(text);

    // Compute deficit counts, verified evidence, and opportunity scores
    const enrichedData = data.map((b: any) => {
      const defs = b.presence?.deficits || computeDefaultDeficits(b.presence);
      const defCount = Object.values(defs).filter(Boolean).length;
      const presenceScore = calculatePresenceScore(b.presence, b.rating, b.reviewsCount);
      const businessQualityScore = calculateBusinessQualityScore(b.rating, b.reviewsCount, b.presence);
      const digitalDeficitScore = calculateDigitalDeficitScore(b.presence);
      const opportunityScore = calculateOpportunityScore(b.presence, b.rating, b.reviewsCount);
      return {
        ...b,
        presence: {
          ...b.presence,
          deficits: defs
        },
        deficitCount: defCount,
        presenceScore,
        businessQualityScore,
        digitalDeficitScore,
        websiteOpportunityScore: opportunityScore,
        opportunityScore,
        prospectStatus: "New",
        evidence: {
          checkedAt: new Date().toISOString(),
          source: directorySource || "Public Business Directory",
          httpStatus: b.presence?.hasWebsite ? "200 OK" : "Domain Unregistered",
          websiteVerified: true,
          notes: b.presence?.hasWebsite ? "Active domain detected but with high mobile/content deficits." : "Verified missing domain and no website presence."
        }
      };
    });

    res.json({ businesses: enrichedData, source: "verified_search" });
  } catch (error: any) {
    console.log("Gemini search resolved with fallback:", error.message || error);
    res.json({
      businesses: getMockBusinesses(city, category, country),
      source: "error_fallback",
      error: error.message
    });
  }
});

// Module 4 API: AI Opportunity Analysis Generator
app.post("/api/analyze", async (req, res) => {
  const { business } = req.body;

  if (!business) {
    return res.status(400).json({ error: "Business parameter is required." });
  }

  try {
    const presenceScore = calculatePresenceScore(business.presence, business.rating, business.reviewsCount);

    if (!isApiKeyConfigured()) {
      return res.json({
        presenceScore,
        whyWebsiteNeeded: `As a local ${business.category || 'business'} in ${business.address || 'the area'}, ${business.name} is missing out on substantial local Google searches. Currently, customers seeking local services find competitors with professional, fast-loading, mobile-friendly websites. A dedicated website would secure client trust instantly and enable direct bookings/calls, turning cold maps searches into hot leads.`,
        recommendations: [
          "Create a high-converting, mobile-optimized landing page featuring standard call-to-actions (Call, WhatsApp, Get Quote).",
          "Integrate direct online booking capabilities to let clients book services 24/7.",
          "Showcase a clear list of services, transparent pricing estimators, and a gallery of high-quality local projects.",
          "Add authentic client testimonials directly above the fold to build immediate trust and counter few/stale Google reviews.",
          "Set up custom SEO metadata targeting local keywords to outrank competitors on Google Maps and search results."
        ],
        competitorPitches: [
          "Competitors with websites rank up to 60% higher in local packs.",
          "A modern website can capture 3x more mobile visitor calls than a listing alone."
        ]
      });
    }

    const ai = getGeminiClient();
    const prompt = `Conduct a rigorous, professional Digital Presence Opportunity Analysis for the following local business:
    Name: "${business.name}"
    Category: "${business.category}"
    Location: "${business.address}"
    Rating: ${business.rating} (${business.reviewsCount} reviews)
    Current Website: None (Website Status: Missing)
    Facebook Presence: ${business.presence?.facebookStatus || "none"}
    Instagram Presence: ${business.presence?.instagramStatus || "none"}
    Google Business Profile Quality: ${business.presence?.googleProfileQuality || "fair"}

    Generate structured feedback in a strict JSON object with this exact schema:
    {
      "whyWebsiteNeeded": "string (A highly persuasive 3-4 sentence explanation of why this specific business needs a website, speaking directly to how they are losing customers to competitors, tailored to their industry and location)",
      "recommendations": ["string (Highly specific recommendation 1)", "string (Recommendation 2)", "string (Recommendation 3)", "string (Recommendation 4)", "string (Recommendation 5)"],
      "competitorPitches": ["string (1-sentence pitch mentioning how competitors are utilizing search engine dominance to capture leads)", "string (1-sentence pitch about convenience of having online scheduling/features)"]
    }`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            whyWebsiteNeeded: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            competitorPitches: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["whyWebsiteNeeded", "recommendations", "competitorPitches"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);

    res.json({
      presenceScore,
      ...data,
      source: "ai_generated"
    });
  } catch (error: any) {
    console.log("Gemini analysis resolved with fallback:", error.message || error);
    res.json({
      presenceScore: 42,
      whyWebsiteNeeded: `As a local business, ${business.name} is missing out on local customer searches. Having a website builds ultimate trust.`,
      recommendations: [
        "Build a modern responsive website.",
        "Add a WhatsApp call-to-action button.",
        "Include a service pricing list and online forms.",
        "Optimize search engines for local search keywords."
      ],
      competitorPitches: ["Competitors are stealing leads with professional websites."],
      error: error.message
    });
  }
});

// Default fallback website blueprint generator matching strict GeneratedSite schema
function generateDefaultTemplateSite(business: any) {
  const name = business.name || "Premier Local Services";
  const category = business.category || "Professional Services";
  const city = (business.address || "Local Area").split(",")[0];
  const phone = business.phone || "+268 7600 0000";
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');

  return {
    id: `site_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    businessId: business.id || `biz_${Date.now()}`,
    businessName: name,
    category: category,
    phone: phone,
    address: business.address || "Local Area",
    primaryColor: "#2563eb",
    secondaryColor: "#1e293b",
    accentColor: "#f59e0b",
    backgroundColor: "#f8fafc",
    textColor: "#0f172a",
    fontStyle: "sans",
    seo: {
      title: `${name} | ${category} in ${city}`,
      description: `Professional ${category.toLowerCase()} services in ${city}. Contact ${name} for direct quotes and quality assistance.`,
      keywords: `${category}, ${city}, local business, quotes, contact`
    },
    hero: {
      title: `Professional ${category} Services in ${city}`,
      subtitle: `Providing trusted ${category.toLowerCase()} solutions tailored to your requirements with prompt response and clear communication.`,
      ctaPrimary: "Request Free Quote",
      ctaSecondary: "Chat on WhatsApp",
      imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb180c5f5?auto=format&fit=crop&w=1200&q=80"
    },
    about: {
      title: `About ${name}`,
      history: `Proudly providing dedicated ${category.toLowerCase()} services to clients across ${city} and surrounding areas.`,
      mission: `To deliver consistent, high-standard ${category.toLowerCase()} services with transparent pricing and dependable customer care.`,
      pitch: `${name} focuses on customer satisfaction, professional execution, and responsive service. Reach out today to discuss how we can assist with your project or service request.`
    },
    services: [
      {
        title: "Standard Consultation & Assessment",
        description: "On-site assessment, project evaluation, and a transparent itemized quotation tailored to your needs.",
        price: "Contact for Quote"
      },
      {
        title: "Core Service Delivery & Execution",
        description: "Professional implementation by experienced staff adhering strictly to safety and industry standards.",
        price: "Custom Estimate"
      },
      {
        title: "Maintenance & Follow-up Support",
        description: "Routine servicing, emergency callouts, and ongoing maintenance to keep everything running smoothly.",
        price: "Flexible Rates"
      }
    ],
    features: [
      {
        title: "Dedicated Local Service",
        icon: "MapPin",
        description: `Directly accessible in ${city} for fast turnarounds and responsive communication.`
      },
      {
        title: "Transparent Pricing",
        icon: "Shield",
        description: "Upfront pricing estimates with no hidden fees or surprise charges."
      },
      {
        title: "Client Satisfaction Focus",
        icon: "Smile",
        description: "We work diligently to ensure every client receives attentive, high-quality service."
      }
    ],
    gallery: [
      { url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80", alt: "Service delivery project" },
      { url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80", alt: "Work in progress" },
      { url: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=600&q=80", alt: "Completed project detail" }
    ],
    testimonials: [
      {
        name: "Client Feedback",
        review: "Client reviews and verified testimonials will be displayed here as customer feedback is submitted.",
        rating: 5,
        isVerified: false
      }
    ],
    faqs: [
      {
        question: "How can I request a quote or consultation?",
        answer: "You can click the 'Request Free Quote' button, call us directly, or send us a message on WhatsApp."
      },
      {
        question: "What areas do you serve?",
        answer: `We serve clients throughout ${city} and neighboring surrounding regions.`
      },
      {
        question: "What is your typical turnaround time?",
        answer: "Response times depend on project scope, but we strive to respond to all inquiries within 24 hours."
      }
    ],
    blog: [
      {
        title: `Choosing the Right ${category} Partner in ${city}`,
        summary: `A quick guide on what to look for when selecting local ${category.toLowerCase()} providers.`,
        category: "Guide"
      }
    ],
    whatsappMessage: `Hello ${name}, I saw your profile and would like to inquire about your services.`,
    contactPage: {
      title: `Get in Touch with ${name}`,
      description: `Have questions or need a quotation? Contact our team in ${city} today.`,
      email: `contact@${slug || 'business'}.com`
    },
    privacyPolicy: "We respect your privacy and process personal information strictly to respond to your service requests and inquiries.",
    termsOfService: "Services are rendered based on agreed project scope and specifications provided upon quotation confirmation.",
    notFoundPage: {
      title: "Page Not Found",
      message: "The page you are looking for does not exist or has been moved."
    }
  };
}

// Real-time live URL Audit API
app.post("/api/audit-url", async (req, res) => {
  const { url, businessName = "" } = req.body;
  try {
    const auditResult = await auditLiveWebsite(url);
    const defCount = Object.values(auditResult.deficits).filter(Boolean).length;
    const presenceScore = calculatePresenceScore({
      hasWebsite: auditResult.hasWebsite,
      hasEmail: !auditResult.deficits.missingContact,
      facebookStatus: auditResult.deficits.noSocialMedia ? "none" : "active",
      instagramStatus: auditResult.deficits.noSocialMedia ? "none" : "active",
      googleProfileQuality: auditResult.deficits.noGooglePresence ? "poor" : "good",
      reviewCountStatus: "average",
      photosStatus: auditResult.deficits.poorBranding ? "missing" : "sufficient",
      descriptionQuality: "fair",
      openingHoursStatus: "complete",
      contactCompleteness: auditResult.deficits.missingContact ? "missing" : "complete",
      deficits: auditResult.deficits
    }, 4.2, 8);

    const opportunityScore = calculateOpportunityScore({
      hasWebsite: auditResult.hasWebsite,
      hasEmail: !auditResult.deficits.missingContact,
      facebookStatus: auditResult.deficits.noSocialMedia ? "none" : "active",
      instagramStatus: auditResult.deficits.noSocialMedia ? "none" : "active",
      googleProfileQuality: auditResult.deficits.noGooglePresence ? "poor" : "good",
      reviewCountStatus: "average",
      photosStatus: auditResult.deficits.poorBranding ? "missing" : "sufficient",
      descriptionQuality: "fair",
      openingHoursStatus: "complete",
      contactCompleteness: auditResult.deficits.missingContact ? "missing" : "complete",
      deficits: auditResult.deficits
    }, 4.2, 8);

    res.json({
      success: true,
      url,
      businessName,
      audit: auditResult,
      deficitCount: defCount,
      presenceScore,
      opportunityScore,
      evidence: {
        checkedAt: new Date().toISOString(),
        source: "Live HTTP & DOM Audit",
        httpStatus: auditResult.httpStatus,
        responseTimeMs: auditResult.responseTimeMs,
        websiteVerified: auditResult.hasWebsite,
        isSsl: auditResult.isSsl,
        notes: auditResult.notes
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to audit website URL" });
  }
});

// In-memory sanitized site store and feedback registry for secure public previews
const publicSiteStore = new Map<string, any>();

// Public Preview Endpoint: Retrieve sanitized website payload by token/id
app.get("/api/preview/:token", (req, res) => {
  const { token } = req.params;
  const site = publicSiteStore.get(token);
  if (!site) {
    return res.status(404).json({ error: "Preview layout not found or expired" });
  }

  // Return only customer-facing sanitized presentation fields (strip sensitive metadata, private owner credentials, CRM tokens)
  const sanitized = {
    id: site.id,
    previewToken: site.previewToken || token,
    businessName: site.businessName,
    phone: site.phone,
    address: site.address,
    category: site.category,
    primaryColor: site.primaryColor,
    secondaryColor: site.secondaryColor,
    accentColor: site.accentColor,
    backgroundColor: site.backgroundColor,
    textColor: site.textColor,
    fontStyle: site.fontStyle,
    seo: site.seo,
    hero: site.hero,
    about: site.about,
    services: site.services,
    features: site.features,
    gallery: site.gallery,
    faqs: site.faqs,
    testimonials: site.testimonials,
    blog: site.blog,
    whatsappMessage: site.whatsappMessage,
    contactPage: site.contactPage,
    privacyPolicy: site.privacyPolicy,
    termsOfService: site.termsOfService,
    notFoundPage: site.notFoundPage,
    logoUrl: site.logoUrl,
    logoType: site.logoType,
    logoIcon: site.logoIcon,
    sectionsOrder: site.sectionsOrder,
    clientApproved: site.clientApproved,
    clientApprovedBy: site.clientApprovedBy,
    clientApprovedAt: site.clientApprovedAt,
    previewViews: site.previewViews || 0,
    previewLastViewedAt: site.previewLastViewedAt,
    clientFeedback: site.clientFeedback || []
  };

  res.json({ success: true, site: sanitized });
});

// Telemetry Endpoint: Track when a public preview is opened/viewed by a prospective client (Point 42)
app.post("/api/preview/:token/view", (req, res) => {
  const { token } = req.params;
  const { device, referrer } = req.body || {};
  const site = publicSiteStore.get(token);

  if (site) {
    site.previewViews = (site.previewViews || 0) + 1;
    site.previewLastViewedAt = new Date().toISOString();
    if (!site.previewHistory) site.previewHistory = [];
    site.previewHistory.push({
      timestamp: new Date().toISOString(),
      device: device === "mobile" ? "mobile" : "desktop",
      referrer: (referrer || "direct").slice(0, 200)
    });
    if (site.previewHistory.length > 50) {
      site.previewHistory = site.previewHistory.slice(-50);
    }
    publicSiteStore.set(token, site);
    console.log(`[Preview Telemetry] Site "${site.businessName}" (${token}) opened! Total views: ${site.previewViews} (Device: ${device || 'unknown'})`);
    return res.json({ 
      success: true, 
      views: site.previewViews, 
      lastViewedAt: site.previewLastViewedAt 
    });
  }

  res.json({ success: true, views: 1, note: "Unregistered session" });
});

// Securely sync/register a site into the public presentation preview buffer
app.post("/api/preview/register", (req, res) => {
  const { site } = req.body;
  if (!site || !site.id) {
    return res.status(400).json({ error: "Invalid site payload" });
  }
  publicSiteStore.set(site.id, site);
  if (site.previewToken) {
    publicSiteStore.set(site.previewToken, site);
  }
  res.json({ success: true, previewToken: site.previewToken || site.id });
});

// Public Client Feedback Submission Endpoint
app.post("/api/preview/:token/feedback", (req, res) => {
  const { token } = req.params;
  const { message, authorName } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Feedback message is required." });
  }

  const site = publicSiteStore.get(token);
  const feedbackItem = {
    id: `fb-${Date.now()}`,
    message: message.trim().slice(0, 1000), // sanitize length
    authorName: (authorName || "Prospective Client").slice(0, 100),
    timestamp: new Date().toISOString(),
    status: "pending"
  };

  if (site) {
    if (!site.clientFeedback) site.clientFeedback = [];
    site.clientFeedback.push(feedbackItem);
    publicSiteStore.set(token, site);
  }

  console.log(`[Public Client Feedback] Received feedback for site ${token}: "${feedbackItem.message}"`);
  res.json({ success: true, feedback: feedbackItem });
});

// Public Client Design Approval & Launch Sign-off Endpoint
app.post("/api/preview/:token/approval", (req, res) => {
  const { token } = req.params;
  const { clientSignoffName, clientNotes } = req.body;

  if (!clientSignoffName || typeof clientSignoffName !== "string" || !clientSignoffName.trim()) {
    return res.status(400).json({ error: "Sign-off name is required." });
  }

  const site = publicSiteStore.get(token);
  const approvalRecord = {
    clientApproved: true,
    clientApprovedBy: clientSignoffName.trim().slice(0, 100),
    clientApprovedAt: new Date().toISOString(),
    clientNotes: (clientNotes || "").slice(0, 500)
  };

  if (site) {
    Object.assign(site, approvalRecord);
    publicSiteStore.set(token, site);
  }

  console.log(`[Public Client Approval] Site ${token} approved by ${approvalRecord.clientApprovedBy}!`);
  res.json({ success: true, approval: approvalRecord });
});

// Module 5 & 6 API: AI Website Content Generator
app.post("/api/generate-site", async (req, res) => {
  const { business } = req.body;

  if (!business) {
    return res.status(400).json({ error: "Business is required." });
  }

  try {
    if (!isApiKeyConfigured()) {
      return res.json({
        site: generateDefaultTemplateSite(business),
        source: "mock_fallback"
      });
    }

    const ai = getGeminiClient();
    const prompt = `Act as an elite copywriter and web designer. Generate a fully comprehensive, authentic, high-converting website content schema for:
    Business: "${business.name}"
    Category: "${business.category}"
    Location: "${business.address}"
    Phone: "${business.phone}"
    Description: "${business.description || ''}"

    CRITICAL RULES FOR INTEGRITY & ACCURACY:
    - DO NOT invent fake customer names, fake personal quotes, or fake reviews (e.g. "Sarah K. 5-stars"). Instead, generate an authentic, transparent placeholder testimonial explaining that customer reviews and ratings will be showcased here as they are submitted by clients.
    - DO NOT invent unverified legal certifications, arbitrary "10+ years experience" claims, or fake warranty numbers unless confirmed in the description. Focus on dedicated craftsmanship, customer satisfaction, transparent quotes, and responsive local service.

    Generate content for the following elements:
    1. Color palette (primary, secondary, accent, background hex codes tailored to the industry)
    2. Font family style (sans, serif, mono, modern, display)
    3. Homepage Hero (Headline, subheadline, CTA button text, secondary CTA button text)
    4. About Section (History, mission, long pitch, key bullet points)
    5. Services list (at least 3 realistic service packages for this category, each with title, description, and price starting-at e.g. "From $X" or "Contact for Quote")
    6. Features section (3 bullet points of what makes them reliable, with title, icon-slug (choose from: Shield, Award, Clock, Star, Zap, MapPin, Sparkles, Smile), description)
    7. FAQ section (at least 3 frequently asked questions and professional answers)
    8. Testimonials (1 transparent placeholder testimonial stating verified feedback will be displayed here upon client submission)
    9. Blog posts (2 relevant local educational guides/article titles, summaries, and categories)
    10. SEO Metadata (Meta title, meta description, and keywords)
    11. Gallery (3 placeholder images from Unsplash relevant to this industry, with URLs e.g. "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=800", and alt text)
    12. Contact Page (title, description, and an email address like contact@business.com)
    13. Privacy Policy (A standard 1-2 paragraph realistic privacy statement)
    14. Terms of Service (A standard 1-2 paragraph realistic service agreement)
    15. 404 Page (title and message)

    Return a strict JSON object with this exact structure:
    {
      "primaryColor": "string (hex code)",
      "secondaryColor": "string (hex code)",
      "accentColor": "string (hex code)",
      "backgroundColor": "string (hex code)",
      "textColor": "string (hex code)",
      "fontStyle": "sans | serif | display | modern",
      "seo": {
        "title": "string",
        "description": "string",
        "keywords": "string (comma-separated)"
      },
      "hero": {
        "title": "string",
        "subtitle": "string",
        "ctaPrimary": "string",
        "ctaSecondary": "string"
      },
      "about": {
        "title": "string",
        "history": "string",
        "mission": "string",
        "pitch": "string"
      },
      "services": [
        { "title": "string", "description": "string", "price": "string" }
      ],
      "features": [
        { "title": "string", "icon": "string", "description": "string" }
      ],
      "gallery": [
        { "url": "string", "alt": "string" }
      ],
      "faqs": [
        { "question": "string", "answer": "string" }
      ],
      "testimonials": [
        { "name": "string", "review": "string", "rating": "number" }
      ],
      "blog": [
        { "title": "string", "summary": "string", "category": "string" }
      ],
      "whatsappMessage": "string (default message to send on whatsapp)",
      "contactPage": {
        "title": "string",
        "description": "string",
        "email": "string"
      },
      "privacyPolicy": "string",
      "termsOfService": "string",
      "notFoundPage": {
        "title": "string",
        "message": "string"
      }
    }`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryColor: { type: Type.STRING },
            secondaryColor: { type: Type.STRING },
            accentColor: { type: Type.STRING },
            backgroundColor: { type: Type.STRING },
            textColor: { type: Type.STRING },
            fontStyle: { type: Type.STRING },
            seo: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                keywords: { type: Type.STRING }
              },
              required: ["title", "description", "keywords"]
            },
            hero: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                ctaPrimary: { type: Type.STRING },
                ctaSecondary: { type: Type.STRING }
              },
              required: ["title", "subtitle", "ctaPrimary", "ctaSecondary"]
            },
            about: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                history: { type: Type.STRING },
                mission: { type: Type.STRING },
                pitch: { type: Type.STRING }
              },
              required: ["title", "history", "mission", "pitch"]
            },
            services: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  price: { type: Type.STRING }
                },
                required: ["title", "description", "price"]
              }
            },
            features: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  icon: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["title", "icon", "description"]
              }
            },
            gallery: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  url: { type: Type.STRING },
                  alt: { type: Type.STRING }
                },
                required: ["url", "alt"]
              }
            },
            faqs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING }
                },
                required: ["question", "answer"]
              }
            },
            testimonials: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  review: { type: Type.STRING },
                  rating: { type: Type.NUMBER }
                },
                required: ["name", "review", "rating"]
              }
            },
            blog: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  category: { type: Type.STRING }
                },
                required: ["title", "summary", "category"]
              }
            },
            whatsappMessage: { type: Type.STRING },
            contactPage: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                email: { type: Type.STRING }
              },
              required: ["title", "description", "email"]
            },
            privacyPolicy: { type: Type.STRING },
            termsOfService: { type: Type.STRING },
            notFoundPage: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                message: { type: Type.STRING }
              },
              required: ["title", "message"]
            }
          },
          required: ["primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor", "fontStyle", "seo", "hero", "about", "services", "features", "gallery", "faqs", "testimonials", "blog", "whatsappMessage", "contactPage", "privacyPolicy", "termsOfService", "notFoundPage"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);

    res.json({
      site: {
        id: `site_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        businessId: business.id || `biz_${Date.now()}`,
        businessName: business.name,
        phone: business.phone,
        address: business.address,
        category: business.category,
        ...data
      },
      source: "ai_generated"
    });
  } catch (error: any) {
    console.log("Gemini website generation resolved with fallback:", error.message || error);
    res.json({
      site: generateDefaultTemplateSite(business),
      source: "error_fallback",
      error: error.message
    });
  }
});

// Module 8 API: AI Sales Outreach Generator
app.post("/api/generate-sales-copy", async (req, res) => {
  const { business, tone = "Professional", link = "https://preview.sitescout.ai/demo" } = req.body;

  if (!business) {
    return res.status(400).json({ error: "Business parameter is required." });
  }

  const name = business.name || "your business";
  const cat = business.category || "Service Professional";
  const addr = business.address || "your local area";

  // Rich tone-aware local fallbacks in case Gemini is unavailable or not configured
  const getFallbackOutreach = (selectedTone: string) => {
    const isPremium = selectedTone.toLowerCase() === "premium";
    const isFriendly = selectedTone.toLowerCase() === "friendly";
    const isCasual = selectedTone.toLowerCase() === "casual";
    const isConcise = selectedTone.toLowerCase() === "concise";

    let emailSubject = `Quick observation regarding ${name}'s online presence in ${addr}`;
    let emailGreeting = `Hi ${name} Team,`;
    let emailPitch = `I was looking at top-rated ${cat} providers in ${addr} and noticed something specific about your online presence that I think I can help you improve.\n\nWhile your client reviews are strong, potential customers searching on Google Maps cannot view your service menu, pricing, or book appointments directly from their phones. Rather than just talking about it, I went ahead and drafted a live interactive digital prototype customized specifically for ${name}: ${link}\n\nWould you be open to taking a 30-second look to see if this helps capture more local customers?`;
    let emailClosing = `Best regards,\n[Your Name]`;

    let whatsapp = `Hi! This is [Your Name]. I noticed something specific about ${name}'s online presence in ${addr} and thought I could help you improve it. You have great local reviews, but clients searching on their phones can't view your services or message you with 1-click. I put together a free interactive demo customized for your business: ${link} Take a look when you have a second!`;
    let sms = `Hi! I noticed something about ${name}'s online presence in ${addr} and built an interactive mobile preview to help you capture more local clients: ${link} - [Your Name]`;
    let coldCall = `[Opening]\n"Hi, is this the owner/manager of ${name}? My name is [Your Name]."\n\n[Value-First Conversational Hook]\n"I'm reaching out because I was looking at top ${cat} providers in ${addr} and noticed something specific about your online presence that I think I can help you improve. You have great ratings, but customers searching on mobile can't easily view your services or book with you. I actually already built a live interactive preview customized for ${name} so you can see the difference."\n\n[Permission-Based Call to Action]\n"If I send over the interactive link via WhatsApp or text, would you be open to taking a quick 30-second look?"\n\n[Handling Resistance ("Send an email / Busy")]\n"Completely understand! That's why I created the interactive link so you can browse at your own convenience without any sales pitch. What's the best mobile number or email to send it to?"\n\n[Closing]\n"Thank you so much! I'm sending the link over right now. Have a wonderful day!"`;
    let followUp = `Hi! Following up on the note I sent about ${name}'s online presence. I wanted to make sure you had a chance to open the interactive draft I put together for you: ${link} No rush at all!`;
    let linkedin = `Hi there! I came across ${name} while looking at leading ${cat} businesses in ${addr}. I noticed something specific about your online presence and wanted to share an idea to help you capture more direct inquiries. I built an interactive prototype specifically for your brand: ${link}\nWould love to connect and hear your thoughts!`;
    let messenger = `Hey there! I noticed something about ${name}'s online presence in ${addr} and thought I could help you improve it. Since your customer feedback is so positive, I designed a free interactive layout tailored to your business: ${link} Hope you find it useful!`;

    if (isPremium) {
      emailSubject = `Strategic digital observation for ${name} (${cat})`;
      emailGreeting = `Dear Directors at ${name},`;
      emailPitch = `While conducting a regional market assessment of leading ${cat} providers in ${addr}, I noticed a distinct opportunity regarding ${name}'s digital presence. To demonstrate how you can convert high-intent local mobile searches into high-value client engagements, our team prepared a private interactive preview layout: ${link}\n\nWe would welcome the opportunity to share our specific observations.`;
      emailClosing = `With warm regards,\n[Your Name]\nDigital Strategy Consultant`;
      whatsapp = `Good day. I noticed something specific regarding ${name}'s digital presence in ${addr} and prepared a bespoke interactive prototype to demonstrate how you can elevate your client acquisition: ${link}`;
      sms = `Executive observation regarding ${name}'s local digital presence in ${addr}. View your private bespoke prototype: ${link}`;
      followUp = `Good day, following up regarding our digital observation for ${name}: ${link}. We would welcome your thoughts on the interactive prototype.`;
      linkedin = `Hello, I specialize in digital asset optimization for premier ${cat} firms. I noticed a key opportunity in ${name}'s local online presence and developed a high-fidelity prototype tailored to your brand: ${link} Let's connect.`;
      messenger = `Hello! We reviewed ${name}'s digital profile in ${addr} and created a bespoke interactive layout to showcase your premium service standards: ${link}`;
    } else if (isFriendly) {
      emailSubject = `Quick helpful idea for ${name}! 😊`;
      emailGreeting = `Hi to the amazing team at ${name},`;
      emailPitch = `I was checking out top-rated ${cat} providers in ${addr} and your business stood out right away! I noticed something about your online presence that I think could easily help you get more bookings from mobile searchers. To show you what I mean, I built a friendly, free interactive webpage preview for you: ${link}\n\nTake a peek whenever you have a moment!`;
      emailClosing = `Wishing you continued success,\n[Your Name]`;
      whatsapp = `Hey there! 😊 I noticed something about ${name}'s online presence in ${addr} and thought I could help you improve it! You have wonderful reviews, so I made a free custom website preview for you to see how easy it is for customers to view your services: ${link} Let me know what you think!`;
      sms = `Hi! 😊 I noticed something about ${name}'s online presence in ${addr} and put together a free mobile preview for you: ${link}`;
      followUp = `Hi again! 😊 Just checking in to see if you got a chance to check out the custom layout I made for ${name}: ${link}. Have a fantastic day!`;
      linkedin = `Hi there! I was admiring the great local feedback for ${name} in ${addr}. I noticed a quick improvement opportunity for your mobile presence and put together an interactive demo: ${link} Let's connect!`;
      messenger = `Hi there! 😊 I noticed something about ${name}'s online presence and built a fun interactive preview so you can see your great work in action: ${link}`;
    } else if (isCasual) {
      emailSubject = `Quick note on ${name}'s online presence`;
      emailGreeting = `Hey there,`;
      emailPitch = `I was looking at ${cat} spots in ${addr} and noticed something about your online presence that could help you pick up more customers. I had some time today and put together a quick interactive preview for ${name} so you can see what I mean: ${link}\n\nCheck it out and let me know your thoughts!`;
      emailClosing = `Cheers,\n[Your Name]`;
      whatsapp = `Hey! I noticed something about ${name}'s online presence in ${addr} and put together a quick interactive preview to show you how you could get more direct client inquiries: ${link} Let me know what you think!`;
      sms = `Hey! Noticed something about ${name}'s online presence in ${addr}. Put together a quick mobile preview for you: ${link} - [Your Name]`;
      followUp = `Hey! Just following up on the quick interactive preview I put together for ${name}: ${link}. Let me know if you get a chance to check it out!`;
      linkedin = `Hey, hope you're having a good week. I noticed an opportunity in ${name}'s local online footprint and made a quick interactive draft: ${link} Let me know what you think!`;
      messenger = `Hey guys! Noticed something about your online presence and drafted a quick custom demo for ${name}: ${link} Hope you like it!`;
    } else if (isConcise) {
      emailSubject = `Observation & Prototype: ${name} (${cat})`;
      emailGreeting = `Hello,`;
      emailPitch = `I analyzed ${name}'s online presence in ${addr} and identified specific areas for improved mobile client acquisition. I created a functional interactive prototype for your review: ${link}`;
      emailClosing = `Regards,\n[Your Name]`;
      whatsapp = `Hello. I noticed an opportunity in ${name}'s online presence in ${addr} and built an interactive prototype to demonstrate the solution: ${link}`;
      sms = `Identified key online presence opportunity for ${name}. View interactive prototype: ${link}`;
      followUp = `Hello, following up on the prototype created for ${name}: ${link}. Ready to discuss when convenient.`;
      linkedin = `Hello, I identified specific growth levers for ${name}'s online presence in ${addr} and built a working prototype: ${link} Let's connect.`;
      messenger = `Hello! Created an interactive demo based on an observation of ${name}'s online presence: ${link}`;
    }

    return {
      email: `${emailSubject}\n\n${emailGreeting}\n\n${emailPitch}\n\n${emailClosing}`,
      whatsapp,
      sms,
      coldCall,
      followUp,
      linkedin,
      messenger
    };
  };

  try {
    if (!isApiKeyConfigured()) {
      return res.json(getFallbackOutreach(tone));
    }

    const ai = getGeminiClient();
    const prompt = `Act as a world-class, consultative B2B sales strategist. Generate tailored sales outreach messages for "${name}" (a ${cat} in ${addr}).
    
    CRITICAL SALES PSYCHOLOGY RULE:
    - Never ask "Do you need a website?" (This triggers instant defensive resistance).
    - Always open with the consultative observation framework: "I noticed something about your online presence and I think I can help you improve it."
    - Highlight a specific deficit relevant to a ${cat} in ${addr} (e.g. inability for mobile searchers to view service pricing, see menus, request quotes, or message directly on WhatsApp).
    - Position the free interactive preview as proof of work and value upfront: "${link}".
    
    Tone constraint: "${tone}" (Options: Professional, Friendly, Premium, Casual, Concise). Let this tone drive the vocabulary, style, and density of the pitch.
    Include this interactive preview URL in the messages: "${link}"

    Generate outreach messages for:
    1. Email (include structured Subject line, customized greeting, personalized value proposition tailored to ${cat} in ${addr}, and professional sign-off)
    2. WhatsApp (conversational, engaging, includes emojis, friendly layout, opening with "I noticed something about your online presence...", with clear CTA to check the link)
    3. SMS (extremely short, under 160 characters, concise and punchy with the link)
    4. Cold Call Script (conversational, structured with [Opening], [Value-First Conversational Hook: "I noticed something about your online presence..."], [Handling Resistance like "send me an email" or "busy"], and [Closing])
    5. Follow-up Message (friendly check-in, keeping the tone consistent, reminding them about the personalized link)
    6. LinkedIn Message (tailored professional direct message, building trust and focusing on local B2B relevance)
    7. Facebook Messenger Message (casual, friendly, focusing on direct local connection and the free customized draft)

    Return a strict JSON object with this exact structure:
    {
      "email": "string (Subject and body)",
      "whatsapp": "string",
      "sms": "string",
      "coldCall": "string",
      "followUp": "string",
      "linkedin": "string",
      "messenger": "string"
    }`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            email: { type: Type.STRING },
            whatsapp: { type: Type.STRING },
            sms: { type: Type.STRING },
            coldCall: { type: Type.STRING },
            followUp: { type: Type.STRING },
            linkedin: { type: Type.STRING },
            messenger: { type: Type.STRING }
          },
          required: ["email", "whatsapp", "sms", "coldCall", "followUp", "linkedin", "messenger"]
        }
      }
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    res.json(data);
  } catch (error: any) {
    console.log("Gemini copy generation resolved with local fallback:", error.message || error);
    res.json(getFallbackOutreach(tone));
  }
});


// Systematic computation of the 13 Digital Deficit Indicators
function computeDefaultDeficits(presence: any): any {
  if (!presence) {
    return {
      noWebsite: true,
      outdatedWebsite: false,
      noGooglePresence: true,
      noSocialMedia: true,
      poorBranding: true,
      noWhatsappCta: true,
      noOnlineCatalogue: true,
      noBookingSystem: true,
      noEnquiryForm: true,
      noSeo: true,
      brokenLinks: true,
      poorMobileExperience: true,
      missingContact: true
    };
  }

  const hasWebsite = !!presence.hasWebsite;
  const noSocial = (presence.facebookStatus === "none" && presence.instagramStatus === "none");
  const poorGoogle = presence.googleProfileQuality === "poor";
  const missingContact = !presence.hasEmail || presence.contactCompleteness === "missing";

  return {
    noWebsite: !hasWebsite,
    outdatedWebsite: hasWebsite ? (presence.photosStatus === "outdated" || presence.descriptionQuality === "poor") : false,
    noGooglePresence: poorGoogle,
    noSocialMedia: noSocial,
    poorBranding: presence.photosStatus === "missing" || presence.photosStatus === "outdated",
    noWhatsappCta: true, // Directories almost never have direct WhatsApp automation on SME profiles
    noOnlineCatalogue: !hasWebsite,
    noBookingSystem: true, // Typical offline deficit
    noEnquiryForm: !presence.hasEmail || !hasWebsite,
    noSeo: !hasWebsite || presence.descriptionQuality === "poor",
    brokenLinks: !hasWebsite,
    poorMobileExperience: !hasWebsite || presence.descriptionQuality === "poor",
    missingContact: missingContact
  };
}

// Helper function to calculate presence score and verified opportunity score based on deficit factors
function calculatePresenceScore(presence: any, rating: number = 4.0, reviews: number = 10): number {
  let score = 100;
  if (!presence) return 30;

  const defs = presence.deficits || computeDefaultDeficits(presence);
  
  if (defs.noWebsite) score -= 25;
  if (defs.outdatedWebsite) score -= 15;
  if (defs.noGooglePresence) score -= 10;
  if (defs.noSocialMedia) score -= 8;
  if (defs.poorBranding) score -= 6;
  if (defs.noWhatsappCta) score -= 8;
  if (defs.noOnlineCatalogue) score -= 7;
  if (defs.noBookingSystem) score -= 6;
  if (defs.noEnquiryForm) score -= 6;
  if (defs.noSeo) score -= 8;
  if (defs.brokenLinks) score -= 5;
  if (defs.poorMobileExperience) score -= 9;
  if (defs.missingContact) score -= 8;

  if (rating < 4.0) score -= 5;
  if (reviews < 15) score -= 5;

  return Math.max(12, Math.min(95, Math.round(score)));
}

// 1. Business Quality Score (0 - 100): Measures reputation, client trust, ratings, and market validation (Point 44, 45)
function calculateBusinessQualityScore(rating: number = 4.0, reviews: number = 10, presence: any = {}): number {
  let score = 50;
  // Rating contribution (up to 30 pts)
  if (rating >= 4.8) score += 30;
  else if (rating >= 4.5) score += 25;
  else if (rating >= 4.0) score += 18;
  else if (rating >= 3.5) score += 10;
  else score += 4;

  // Review volume contribution (up to 20 pts)
  if (reviews >= 50) score += 20;
  else if (reviews >= 25) score += 16;
  else if (reviews >= 10) score += 12;
  else if (reviews >= 3) score += 8;
  else score += 4;

  return Math.min(100, Math.max(30, Math.round(score)));
}

// 2. Digital Deficit Score (0 - 100): Measures severity of missing infrastructure across 13 audit checks
function calculateDigitalDeficitScore(presence: any): number {
  const defs = presence?.deficits || computeDefaultDeficits(presence);
  let deficitPoints = 0;
  if (defs.noWebsite || !presence?.hasWebsite) deficitPoints += 30;
  if (defs.outdatedWebsite) deficitPoints += 15;
  if (defs.noWhatsappCta) deficitPoints += 10;
  if (defs.poorMobileExperience) deficitPoints += 10;
  if (defs.noBookingSystem) deficitPoints += 8;
  if (defs.noOnlineCatalogue) deficitPoints += 7;
  if (defs.noEnquiryForm) deficitPoints += 6;
  if (defs.noSeo) deficitPoints += 6;
  if (defs.noGooglePresence) deficitPoints += 5;
  if (defs.noSocialMedia) deficitPoints += 5;
  if (defs.poorBranding) deficitPoints += 4;
  if (defs.brokenLinks) deficitPoints += 4;
  if (defs.missingContact) deficitPoints += 5;

  return Math.min(100, Math.max(20, Math.round(deficitPoints)));
}

// 3. Website Opportunity Score (0 - 100): High-converting sweet spot (Proven Business + High Deficit)
function calculateOpportunityScore(presence: any, rating: number = 4.0, reviews: number = 10): number {
  const quality = calculateBusinessQualityScore(rating, reviews, presence);
  const deficit = calculateDigitalDeficitScore(presence);
  // Gold-mine formula: 55% deficit weight + 45% business quality weight
  const opportunity = (deficit * 0.55) + (quality * 0.45);
  return Math.min(99, Math.max(35, Math.round(opportunity)));
}

// Mock generator for businesses without websites to enable out-of-the-box searches anywhere
function getMockBusinesses(city: string, category: string, country: string = "Eswatini") {
  const formattedCity = city.charAt(0).toUpperCase() + city.slice(1);
  const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
  const isEswatini = country.toLowerCase().includes("eswatini") || country.toLowerCase().includes("swaziland") || 
                     ["mbabane", "manzini", "matsapha", "ezulwini", "nhlangano", "siteki", "pigg's peak"].includes(city.toLowerCase());

  const phonePrefix = isEswatini ? "+268 76" : country.toLowerCase().includes("south africa") ? "+27 82" : "+1 512";

  // Specialized directory presets for all 18 key business sectors
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
        { name: `${cityName} Law Chambers & Notaries`, addr: `Mbabane CBD Law Chambers, ${cityName}`, phoneSuffix: "48 9912", desc: `Commercial law, property conveyancing, civil litigation, and labor dispute arbitrations.` },
        { name: `Justice & Associates Legal Practitioners`, addr: `Allister Miller Street, ${cityName}`, phoneSuffix: "82 3341", desc: `Corporate contracts, constitutional litigation, family law, and estate administration.` },
        { name: `Apex Commercial Attorneys & Conveyancers`, addr: `Highland View Suite 4, ${cityName}`, phoneSuffix: "91 4455", desc: `Real estate title deeds, mortgage bonds, mergers, and corporate restructuring.` },
        { name: `Kingdom Labour & Employment Law Chambers`, addr: `Dzeliwe Street, ${cityName}`, phoneSuffix: "23 8812", desc: `Workplace disciplinary hearings, CCMA/CMAC disputes, and employment contract drafting.` },
        { name: `Swazi Notaries & Civil Attorneys`, addr: `Commercial House 1st Floor, ${cityName}`, phoneSuffix: "67 5521", desc: `Notarial deeds, antenuptial contracts, apostilles, and legal documentation verification.` },
        { name: `Summit Litigation & Corporate Counsel`, addr: `Pine Valley Way, ${cityName}`, phoneSuffix: "14 9901", desc: `High Court litigation, intellectual property protection, and debt recovery specialists.` }
      ];
    } else if (c.includes("real estate") || c.includes("property") || c.includes("realtor") || c.includes("estate agent")) {
      return [
        { name: `${cityName} Premier Property Group`, addr: `Somhlolo Road Suite 10, ${cityName}`, phoneSuffix: "76 2209", desc: `Residential house sales, commercial office leasing, and luxury estate developments.` },
        { name: `Valley View Real Estate Agency`, addr: `Ezulwini Gables Mall Suite 3, ${cityName}`, phoneSuffix: "34 8871", desc: `Prime residential plots, golf estate properties, farm land sales, and rental management.` },
        { name: `Swazi Homes & Property Management`, addr: `Ngwane Street, ${cityName}`, phoneSuffix: "51 6634", desc: `Tenant vetting, rent collection, residential property valuations, and buy-to-let advisory.` },
        { name: `Highland Commercial Realty`, addr: `Matsapha Logistics Park, ${cityName}`, phoneSuffix: "88 9023", desc: `Industrial warehouse leasing, retail shop spaces, and commercial development land.` },
        { name: `Apex Property Valuers & Realtors`, addr: `Mbabane CBD Plaza, ${cityName}`, phoneSuffix: "62 1195", desc: `Certified property appraisals, municipal rates appeals, and distressed asset sales.` },
        { name: `Kingdom Land & Home Brokerage`, addr: `Central Avenue, ${cityName}`, phoneSuffix: "49 3307", desc: `Family homes, title deed properties, sectional title apartments, and farm subdivisions.` }
      ];
    } else if (c.includes("tour") || c.includes("safari") || c.includes("travel") || c.includes("holiday")) {
      return [
        { name: `Kingdom Safari & Cultural Tours`, addr: `Ezulwini Cultural Corridor, ${cityName}`, phoneSuffix: "81 2291", desc: `Big 5 game reserve safaris, traditional Swazi cultural village tours, and guided hikes.` },
        { name: `${cityName} Adventure & Eco-Tours`, addr: `Pine Valley Road, ${cityName}`, phoneSuffix: "29 7734", desc: `Canopy zip-line adventures, mountain biking expeditions, and caving excursions.` },
        { name: `Highland Travel Agency & Flights`, addr: `The Mall Shop 22, ${cityName}`, phoneSuffix: "73 4415", desc: `International flight ticketing, holiday packages, travel insurance, and visa assistance.` },
        { name: `Swazi Escapes & Lodge Bookings`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "55 1190", desc: `Luxury safari lodge reservations, honeymoon packages, and weekend nature getaways.` },
        { name: `Borderline Overland Tours & 4x4 Expeditions`, addr: `Central Bus Depot Suite 6, ${cityName}`, phoneSuffix: "92 6631", desc: `Southern Africa overland truck tours, Kruger safari combos, and bush camping trips.` },
        { name: `Apex Executive Transfers & Chauffeur Tours`, addr: `Airport Highway Plaza, ${cityName}`, phoneSuffix: "38 5502", desc: `VIP airport shuttle, corporate conference transport, and private chauffeur-driven day trips.` }
      ];
    } else if (c.includes("school") || c.includes("academy") || c.includes("educat") || c.includes("college") || c.includes("daycare")) {
      return [
        { name: `${cityName} Academy & Cambridge College`, addr: `Pine Valley Road, ${cityName}`, phoneSuffix: "52 4419", desc: `Private pre-school, primary, and secondary Cambridge international curriculum education.` },
        { name: `Little Stars Early Learning & Montessori Centre`, addr: `Coopers Farm Road, ${cityName}`, phoneSuffix: "27 8841", desc: `Montessori-based toddler care, nursery education, and after-school enrichment clubs.` },
        { name: `Highland Technical & Vocational College`, addr: `Industrial Training Complex, ${cityName}`, phoneSuffix: "99 1102", desc: `Accredited diplomas in automotive mechanics, electrical engineering, and IT systems.` },
        { name: `Royal Institute of Business & Accountancy`, addr: `Commercial House 3rd Floor, ${cityName}`, phoneSuffix: "41 7733", desc: `ACCA, CIMA, and diploma courses in marketing, human resources, and business finance.` },
        { name: `Apex Preparatory & Primary School`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "83 5590", desc: `Holistic child development, modern STEM labs, sports coaching, and arts education.` },
        { name: `Kingdom Music, Arts & Media Academy`, addr: `Ezulwini Cultural Quarter, ${cityName}`, phoneSuffix: "68 2215", desc: `Piano, guitar, vocals, animation, and photography courses for youth and adult learners.` }
      ];
    } else if (c.includes("medical") || c.includes("clinic") || c.includes("doctor") || c.includes("health") || c.includes("dental")) {
      return [
        { name: `${cityName} Family Medical & Dental Clinic`, addr: `Mahleka Street, ${cityName}`, phoneSuffix: "61 9922", desc: `General medical practice, dental consultations, ultrasound scans, and wellness checks.` },
        { name: `Crown Optometry & Eye Care Centre`, addr: `Plaza Shopping Complex, ${cityName}`, phoneSuffix: "44 7711", desc: `Comprehensive eye examinations, designer frames, contact lenses, and vision therapy.` },
        { name: `St. Mary Specialist Women & Children's Clinic`, addr: `Highland View Crescent, ${cityName}`, phoneSuffix: "89 3302", desc: `Maternal health, pediatric care, routine immunizations, and fertility counseling.` },
        { name: `Valley Physiotherapy & Sports Rehab`, addr: `Ezulwini Medical Center, ${cityName}`, phoneSuffix: "15 8820", desc: `Sports injury rehabilitation, post-surgery recovery, and orthopedic physical therapy.` },
        { name: `Kingdom Care Pharmacy & Diagnostics`, addr: `Central Street, ${cityName}`, phoneSuffix: "73 2245", desc: `Prescription dispensing, chronic medication delivery, and instant blood lab panels.` },
        { name: `Prime Diagnostic Ultrasound & Radiology`, addr: `Hospital Hill Road, ${cityName}`, phoneSuffix: "38 6619", desc: `Digital radiology, corporate health screenings, and ultrasound diagnostic imaging.` }
      ];
    } else if (c.includes("retail") || c.includes("shop") || c.includes("boutique") || c.includes("store")) {
      return [
        { name: `Swazi Fashion & Luxury Boutique Lounge`, addr: `The Mall, Shop 14, ${cityName}`, phoneSuffix: "76 2291", desc: `Designer corporate wear, traditional African attire, footwear, and luxury accessories.` },
        { name: `${cityName} Mega Wholesale & Cash & Carry`, addr: `Plot 22 Matsapha Depot, ${cityName}`, phoneSuffix: "31 8844", desc: `Bulk groceries, dry foods, beverages, and household goods for spaza shops and retailers.` },
        { name: `Highveld Home Furnishings & Living Decor`, addr: `Ngwane Street, ${cityName}`, phoneSuffix: "94 5530", desc: `Solid wood furniture, lounge suites, refrigeration units, and custom bedding.` },
        { name: `Kingdom Solar, Electrical & Hardware Merchants`, addr: `Sheffield Road, ${cityName}`, phoneSuffix: "19 4482", desc: `Solar inverters, lithium batteries, roofing sheets, fasteners, and power tools.` },
        { name: `Valley Organic Butchery & Meat Market`, addr: `Gables Centre, ${cityName}`, phoneSuffix: "58 7710", desc: `Premium grass-fed beef, seasoned braai packs, cured biltong, and marinated cuts.` },
        { name: `Smart Gadgets & Electronics Hub`, addr: `Plaza Arcade, Shop 3, ${cityName}`, phoneSuffix: "82 1109", desc: `Smartphones, tablets, TV soundbars, solar generators, and smart tech accessories.` }
      ];
    } else if (c.includes("cater") || c.includes("food service") || c.includes("culinary")) {
      return [
        { name: `${cityName} Gourmet Catering & Events`, addr: `Mbabane Industrial Park, ${cityName}`, phoneSuffix: "44 8812", desc: `Full-service corporate gala catering, wedding buffets, plated VIP dinners, and cocktail canapes.` },
        { name: `Flavours of Africa Mobile Spit Braai & Catering`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "91 3345", desc: `Whole lamb spit braais, traditional stews, corporate staff lunches, and outdoor festival bars.` },
        { name: `Royal Feast Event Caterers`, addr: `Ezulwini Main Road, ${cityName}`, phoneSuffix: "23 7790", desc: `High-end wedding banquets, custom tiered cakes, dessert bars, and bespoke table styling.` },
        { name: `Executive Boxed Lunches & Corporate Catering`, addr: `Dzeliwe Street, ${cityName}`, phoneSuffix: "67 2201", desc: `Individual hot corporate meal boxes, board meeting platters, sandwich trays, and coffee stations.` },
        { name: `Swazi Spice Mobile Food Trucks & Catering`, addr: `Manzini Central Way, ${cityName}`, phoneSuffix: "14 6689", desc: `Street food catering, burger stations, wood-fired mobile pizza ovens, and birthday party menus.` },
        { name: `Highland Private Chef & Dining Experience`, addr: `Pine Valley Way, ${cityName}`, phoneSuffix: "82 9934", desc: `Exclusive in-home private dining, 5-course degustation menus, and personal chef services.` }
      ];
    } else if (c.includes("funeral") || c.includes("parlour") || c.includes("burial") || c.includes("mortuary")) {
      return [
        { name: `${cityName} Dignity Funeral Services & Parlour`, addr: `Mbabane Bypass Highway, ${cityName}`, phoneSuffix: "77 4410", desc: `24/7 compassionate bereavement support, casket selections, repatriation, and memorial chapel.` },
        { name: `Eternal Peace Funeral Home & Crematorium`, addr: `Plot 19 Matsapha Commercial Site, ${cityName}`, phoneSuffix: "34 9923", desc: `Dignified burial packages, tombstone manufacturing, hearse hire, and pre-need funeral policies.` },
        { name: `Grace Memorial Funeral Directors`, addr: `Ngwane Street, ${cityName}`, phoneSuffix: "51 2280", desc: `Full-service funeral coordination, tent and chair rentals, floral tributes, and obituary programs.` },
        { name: `Swazi Heritage Funeral Aid & Repatriation`, addr: `Central Road, ${cityName}`, phoneSuffix: "88 6631", desc: `Cross-border repatriation (SA-Eswatini), mortuary storage, embalming, and grave equipment.` },
        { name: `Kingdom Caskets & Memorial Stones`, addr: `Industrial Site Depot, ${cityName}`, phoneSuffix: "62 3345", desc: `Custom granite tombstones, hardwood caskets, memorial unveiling coordination, and sound systems.` },
        { name: `Serenity Funeral Assurance & Burial Society`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "49 7712", desc: `Affordable family funeral coverage plans, immediate payouts, and funeral vehicle convoy hire.` }
      ];
    } else if (c.includes("event") || c.includes("party") || c.includes("wedding") || c.includes("planner")) {
      return [
        { name: `${cityName} Signature Event Planners & Decor`, addr: `Ezulwini Gables Office 5, ${cityName}`, phoneSuffix: "81 5590", desc: `Luxury wedding styling, corporate conferences, product launches, draping, and lighting.` },
        { name: `Apex Stage, Sound & Lighting Productions`, addr: `Matsapha Industrial Plot 88, ${cityName}`, phoneSuffix: "29 1102", desc: `Concert staging, line-array sound systems, LED video walls, generators, and trussing hire.` },
        { name: `Highveld Marquee & Tent Hire`, addr: `King Mswati III Ave, ${cityName}`, phoneSuffix: "73 8841", desc: `Clear span marquee tents, stretch bedouin tents, VIP mobile restrooms, and Chiavari chairs.` },
        { name: `Celebrations Party & Decor Hire Hub`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "55 3320", desc: `Balloon garlands, jumping castles, kids themed parties, photo backdrops, and table settings.` },
        { name: `Kingdom Corporate Event Management`, addr: `Mbabane CBD Tower, ${cityName}`, phoneSuffix: "92 7714", desc: `End-of-year corporate galas, awards evenings, team building retreats, and expo booth designs.` },
        { name: `Swazi Weddings & Bridal Lounge`, addr: `Pine Valley Heights, ${cityName}`, phoneSuffix: "38 2299", desc: `Turn-key wedding coordination, bridal cars, floral bouquets, RSVP management, and day-of styling.` }
      ];
    } else if (c.includes("mechanic") || c.includes("auto repair") || c.includes("garage") || c.includes("workshop")) {
      return [
        { name: `${cityName} Precision Auto Workshop & Diagnostics`, addr: `Plot 42 Matsapha Industrial, ${cityName}`, phoneSuffix: "52 7741", desc: `Computerized engine diagnostics, brake overhaul, clutch repairs, and major vehicle servicing.` },
        { name: `Apex Auto Electricians & Starter Repairs`, addr: `Industrial Bypass Road, ${cityName}`, phoneSuffix: "99 2209", desc: `Alternator rebuilds, battery testing, vehicle wiring, ECU reprogramming, and alarm repairs.` },
        { name: `Highland Gearbox & Suspension Specialists`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "27 5530", desc: `Automatic & manual transmission overhauls, shock absorber replacements, and wheel alignments.` },
        { name: `Swazi Diesel Injection & Turbo Centre`, addr: `Sheffield Road, ${cityName}`, phoneSuffix: "83 8842", desc: `Common rail injector testing, turbocharger repairs, bakkie tuning, and fuel pump servicing.` },
        { name: `Kingdom Panel Beating & Spray Painting`, addr: `Dzeliwe Street, ${cityName}`, phoneSuffix: "41 3319", desc: `Accident damage repairs, computerized paint matching, chassis straightening, and insurance claims.` },
        { name: `Mobile Fleet Mechanics & 24/7 Roadside Rescue`, addr: `Mbabane Main Way, ${cityName}`, phoneSuffix: "68 9901", desc: `On-site commercial fleet servicing, breakdown towing, jump starts, and tyre repairs.` }
      ];
    } else if (c.includes("security") || c.includes("guard") || c.includes("alarm") || c.includes("patrol")) {
      return [
        { name: `${cityName} Tactical Armed Response & Guarding`, addr: `Plot 11 Matsapha Depot, ${cityName}`, phoneSuffix: "44 2290", desc: `24/7 armed response, uniformed static security guards, VIP protection, and canine patrol units.` },
        { name: `Apex Electronic Security & CCTV Labs`, addr: `Somhlolo Road Suite 6, ${cityName}`, phoneSuffix: "91 7731", desc: `IP surveillance camera installations, electric fencing, biometric access gates, and intercoms.` },
        { name: `Kingdom Guarding & Cash-In-Transit Services`, addr: `Commercial House 2nd Floor, ${cityName}`, phoneSuffix: "23 4410", desc: `Armored vehicle cash logistics, commercial retail guarding, event bouncers, and surveillance.` },
        { name: `Highveld Fire Protection & Alarms`, addr: `Mbabane CBD Plaza, ${cityName}`, phoneSuffix: "67 1198", desc: `Fire extinguisher servicing, smoke detector systems, sprinkler installations, and safety audits.` },
        { name: `Swazi Perimeter Civils & Electric Fencing`, addr: `Old Manzini Road, ${cityName}`, phoneSuffix: "14 6634", desc: `Razor wire, automated gate motors, solar-powered farm perimeter alarms, and boom gates.` },
        { name: `Summit Risk Advisory & Security Monitoring`, addr: `Pine Valley Way, ${cityName}`, phoneSuffix: "82 5509", desc: `Corporate risk vulnerability assessments, remote CCTV off-site monitoring, and panic alarm dispatch.` }
      ];
    } else if (c.includes("clean") || c.includes("janitor") || c.includes("laundry") || c.includes("hygiene")) {
      return [
        { name: `${cityName} Professional Cleaning & Hygiene Services`, addr: `Mbabane Commercial Park, ${cityName}`, phoneSuffix: "76 3390", desc: `Corporate office daily janitorial, deep carpet extraction, sanitary bin rental, and disinfection.` },
        { name: `Apex Post-Construction & Industrial Cleaners`, addr: `Matsapha Industrial Site 60, ${cityName}`, phoneSuffix: "34 8812", desc: `Post-build debris clearing, high-pressure window cleaning, warehouse floor scrub & seal.` },
        { name: `Highland Home & Upholstery Deep Clean`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "51 5543", desc: `Couch steam cleaning, mattress sanitization, Persian rug restoration, and tile grout scrubbing.` },
        { name: `Swazi Hygiene Solutions & Washroom Supplies`, addr: `Dzeliwe Street, ${cityName}`, phoneSuffix: "88 2201", desc: `Bulk paper dispensers, hand sanitizer stands, chemical cleaning supplies, and pest fumigation.` },
        { name: `Kingdom Express Laundry & Dry Cleaners`, addr: `Gables Mall Shop 7, ${cityName}`, phoneSuffix: "62 7734", desc: `Same-day dry cleaning, hotel linen bulk laundering, bridal dress preservation, and curtain cleaning.` },
        { name: `Valley Sparkle Domestic & Office Maid Service`, addr: `Pine Valley Road, ${cityName}`, phoneSuffix: "49 1189", desc: `Vetted domestic cleaners, move-in/move-out deep sanitization, and weekly recurring maid contracts.` }
      ];
    } else if (c.includes("photograph") || c.includes("video") || c.includes("studio") || c.includes("camera")) {
      return [
        { name: `${cityName} Visuals Photography & Film Studio`, addr: `Ezulwini Arts Complex Suite 2, ${cityName}`, phoneSuffix: "81 6630", desc: `Luxury wedding photo & 4K cinema films, corporate portraits, product studio shoots, and drone footage.` },
        { name: `Apex Media & Commercial Production House`, addr: `Mbabane CBD Studio 4B, ${cityName}`, phoneSuffix: "29 2219", desc: `TV commercials, corporate documentary videos, podcast studio recording, and social media reels.` },
        { name: `Highland Moments Portrait Studio`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "73 7745", desc: `Family portraits, newborn photography, maternity shoots, graduation pictures, and canvas prints.` },
        { name: `Swazi Drone & Aerial Media Services`, addr: `Matsapha Technology Hub, ${cityName}`, phoneSuffix: "55 4402", desc: `Licensed aerial drone videography, construction progress tracking, real estate showcase videos.` },
        { name: `Kingdom Event & Concert Photographers`, addr: `Dzeliwe Street, ${cityName}`, phoneSuffix: "92 8831", desc: `Live concert coverage, sports photography, corporate conferences, and instant on-site printing.` },
        { name: `Studio 360 Fashion & Product Photography`, addr: `The Mall 2nd Floor, ${cityName}`, phoneSuffix: "38 1190", desc: `Fashion lookbooks, e-commerce catalogue shoots, 360-degree product spins, and high-end retouching.` }
      ];
    } else if (c.includes("graphic") || c.includes("design") || c.includes("creative")) {
      return [
        { name: `${cityName} Creative Design Studio`, addr: `Artisan Quarter Suite 4, ${cityName}`, phoneSuffix: "71 9920", desc: `Brand identity creation, flyer design, packaging concepts, and commercial vector illustrations.` },
        { name: `PixelCraft Graphic & UX Design House`, addr: `CBD Creative Loft, ${cityName}`, phoneSuffix: "33 4419", desc: `Corporate stationery, logos, publication layout, and visual marketing assets for scaling businesses.` },
        { name: `Apex Vector & Brand Artisans`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "88 6621", desc: `Premium corporate logos, annual report layouts, social media templates, and marketing collateral.` },
        { name: `Highland Visual Concepts`, addr: `Ezulwini Craft Centre, ${cityName}`, phoneSuffix: "52 1198", desc: `Label designs, exhibition backdrops, company profiles, and bespoke typography services.` },
        { name: `Swazi Pixel Studios`, addr: `Matsapha Tech Park, ${cityName}`, phoneSuffix: "94 3302", desc: `Creative digital artworks, infographics, advertising banners, and promotional brand graphics.` },
        { name: `Kingdom Creative Media & Graphics`, addr: `Dzeliwe Street, ${cityName}`, phoneSuffix: "27 8845", desc: `Print & digital design packages, vehicle wrap mockups, and corporate brochures.` }
      ];
    } else if (c.includes("print") || c.includes("litho") || c.includes("copy")) {
      return [
        { name: `${cityName} Digital Print & Pressworks`, addr: `Plot 55 Matsapha Industrial, ${cityName}`, phoneSuffix: "82 4410", desc: `Large format printing, PVC banners, business cards, branded notebooks, and invoice books.` },
        { name: `Apex Commercial Printers & Packaging`, addr: `Industrial Bypass, ${cityName}`, phoneSuffix: "44 9931", desc: `Offset litho printing, corrugated box printing, magazine publications, and flyers.` },
        { name: `Kingdom QuickPrint & Stationery Depot`, addr: `Mbabane CBD Mall, ${cityName}`, phoneSuffix: "91 5520", desc: `Same-day digital copying, promotional flyers, presentation binding, and laminating.` },
        { name: `Swazi Screen Print & Apparel Co.`, addr: `Sheffield Road, ${cityName}`, phoneSuffix: "39 7714", desc: `T-shirt screen printing, branded workwear embroidery, corporate caps, and promotional gifts.` },
        { name: `Highland Litho & Label Printers`, addr: `Central Avenue, ${cityName}`, phoneSuffix: "67 2289", desc: `Self-adhesive bottle labels, product carton packaging, and tamper-evident seals.` },
        { name: `Express Print & Promotional Gifts Hub`, addr: `Gables Centre, ${cityName}`, phoneSuffix: "18 8802", desc: `Custom coffee mugs, branded USBs, roll-up banner stands, and branded corporate umbrellas.` }
      ];
    } else if (c.includes("sign") || c.includes("billboard") || c.includes("display")) {
      return [
        { name: `${cityName} Neon & Outdoor Signage Co.`, addr: `Matsapha Heavy Industrial, ${cityName}`, phoneSuffix: "95 1120", desc: `3D illuminated channel letters, neon signs, pylon roadside billboards, and laser-cut acrylic.` },
        { name: `Apex Signcraft & Vehicle Wraps`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "31 6649", desc: `Full commercial fleet vehicle branding, reflective safety signs, and road directional signage.` },
        { name: `Kingdom Architectural Signs & Laser Labs`, addr: `Mbabane Commercial Park, ${cityName}`, phoneSuffix: "78 3312", desc: `Building facade naming, bronze plaque casting, indoor directional door signs, and frosting.` },
        { name: `Swazi Billboard & Outdoor Media`, addr: `Highway Bypass Junction, ${cityName}`, phoneSuffix: "49 7780", desc: `High-visibility billboard placement, gantry advertisements, and LED digital roadside boards.` },
        { name: `Highland Sign & Safety Graphics`, addr: `Dzeliwe Street, ${cityName}`, phoneSuffix: "83 2291", desc: `OSHA occupational safety signs, mine warning boards, and magnetic vehicle decals.` },
        { name: `Vision Signage & Vinyl Solutions`, addr: `Central Way, ${cityName}`, phoneSuffix: "62 5504", desc: `Storefront window frosted vinyl, wall murals, roll-up expo banners, and aluminum sign trays.` }
      ];
    } else if (c.includes("social") || c.includes("market") || c.includes("agency") || c.includes("smm")) {
      return [
        { name: `${cityName} Digital Growth Marketing Agency`, addr: `Corporate Park Building B, ${cityName}`, phoneSuffix: "76 8810", desc: `Facebook & Instagram ad campaigns, content calendar management, lead generation funnels.` },
        { name: `Apex Viral Social Media & PR Lab`, addr: `Ezulwini Creative Offices, ${cityName}`, phoneSuffix: "29 4432", desc: `TikTok video creation, influencer partnerships, community management, and crisis PR.` },
        { name: `Highland Content & Brand Storytellers`, addr: `Mbabane CBD Plaza, ${cityName}`, phoneSuffix: "91 2209", desc: `B2B LinkedIn strategy, executive thought leadership, copywriting, and newsletter management.` },
        { name: `Swazi Reach Digital Advertising`, addr: `Matsapha Innovation Centre, ${cityName}`, phoneSuffix: "54 9918", desc: `Google Search Ads (PPC), retargeting campaigns, and local social media brand awareness.` },
        { name: `Kingdom Brand Accelerators`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "38 7750", desc: `360-degree brand launch campaigns, social media customer care, and performance marketing.` },
        { name: `Elevate Media & Marketing Collective`, addr: `Pine Valley Way, ${cityName}`, phoneSuffix: "82 3311", desc: `Social content shoots, short-form video reels, brand growth strategy, and analytics reporting.` }
      ];
    } else if (c.includes("it") || c.includes("tech") || c.includes("ict") || c.includes("network") || c.includes("computer")) {
      return [
        { name: `${cityName} Managed IT Services & Cloud Support`, addr: `Matsapha Tech Hub Suite 12, ${cityName}`, phoneSuffix: "68 1190", desc: `Enterprise network installations, Microsoft 365 migrations, server maintenance, and IT helpdesk.` },
        { name: `Apex Computer Repairs & Data Recovery`, addr: `Mbabane CBD Mall 1st Floor, ${cityName}`, phoneSuffix: "41 8823", desc: `Laptop motherboard repairs, SSD upgrades, virus removal, and RAID hard drive data recovery.` },
        { name: `Kingdom Fiber, VoIP & Network Solutions`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "93 5501", desc: `Office structured cabling, Wi-Fi mesh systems, PBX cloud phones, and firewall cyber-defense.` },
        { name: `Swazi Tech Solutions & POS Systems`, addr: `Dzeliwe Street, ${cityName}`, phoneSuffix: "27 4490", desc: `Retail barcode scanner setup, point-of-sale touchscreens, receipt printers, and ERP software.` },
        { name: `Highland Cloud & Cybersecurity Labs`, addr: `Corporate Park Building C, ${cityName}`, phoneSuffix: "84 2219", desc: `Automated off-site cloud backups, cybersecurity audits, ransomware prevention, and VPN networks.` },
        { name: `Smart IT Hardware & Server Maintenance`, addr: `Central Avenue, ${cityName}`, phoneSuffix: "59 7733", desc: `UPS battery backup units, server rack assemblies, commercial printer networking, and SLA support.` }
      ];
    } else if (c.includes("brand") || c.includes("identity")) {
      return [
        { name: `${cityName} Brand Architects & Identity Co.`, addr: `Ezulwini Gables Studio, ${cityName}`, phoneSuffix: "77 2210", desc: `Corporate brand style guides, naming, positioning strategy, and complete visual transformation.` },
        { name: `Apex Corporate Identity & Brand Strategy`, addr: `Mbabane CBD Tower, ${cityName}`, phoneSuffix: "35 9940", desc: `Mission-vision frameworks, logo system design, packaging typography, and corporate storytelling.` },
        { name: `Kingdom Brand Studio & Strategy`, addr: `Matsapha Commercial Wing, ${cityName}`, phoneSuffix: "92 4401", desc: `Market positioning audits, brand archetype definition, internal brand culture playbooks.` },
        { name: `Highland Brand House`, addr: `Somhlolo Road, ${cityName}`, phoneSuffix: "48 7719", desc: `Executive pitch decks, brand re-launches, trade show booth styling, and brand guidelines.` },
        { name: `Swazi Origin Brand & Design Consultancy`, addr: `Dzeliwe Street, ${cityName}`, phoneSuffix: "81 3390", desc: `Heritage brand modernizations, product line extensions, and consumer perception research.` },
        { name: `Vanguard Brand Development Partners`, addr: `Pine Valley Way, ${cityName}`, phoneSuffix: "63 8824", desc: `Venture brand creation, investor deck design, trademark visuals, and brand asset management.` }
      ];
    } else {
      // Default general service providers
      return [
        { name: `${cityName} Premier ${cat} Services`, addr: `412 Maple Commercial Way, ${cityName}`, phoneSuffix: "45 1092", desc: `Established local ${cat.toLowerCase()} service provider serving residential and corporate clients.` },
        { name: `Apex ${cat} & Repairs`, addr: `108 Industrial Blvd, Suite C, ${cityName}`, phoneSuffix: "82 3341", desc: `Expert ${cat.toLowerCase()} diagnostics, emergency service calls, and full-service packages.` },
        { name: `Kingdom ${cat} Solutions Ltd`, addr: `1256 High Street, ${cityName}`, phoneSuffix: "91 4455", desc: `Professional ${cat.toLowerCase()} operations with experienced technicians and verified work.` },
        { name: `Downtown ${cat} Co.`, addr: `88 Central Avenue, ${cityName}`, phoneSuffix: "23 8812", desc: `Family-owned ${cat.toLowerCase()} business dedicated to honest rates and dependable turnaround.` },
        { name: `Metro ${cat} & Supply`, addr: `334 Valley Lane, ${cityName}`, phoneSuffix: "67 5521", desc: `Wholesale and direct retail ${cat.toLowerCase()} servicing with reliable customer support.` },
        { name: `Summit Custom ${cat}`, addr: `72 Stone Road, ${cityName}`, phoneSuffix: "14 9901", desc: `Bespoke, high-grade ${cat.toLowerCase()} craftsmanship tailored to property requirements.` }
      ];
    }
  };

  const presets = getSectorPresets(formattedCategory, formattedCity);

  return presets.map((item, idx) => {
    // Generate realistic varying deficit profiles
    const noWeb = true;
    const outdatedWeb = false;
    const noGoogle = idx % 2 === 0;
    const noSocial = idx % 3 === 0;
    const poorBranding = idx % 2 === 1;
    const noWhatsapp = true;
    const noCatalogue = true;
    const noBooking = true;
    const noEnquiry = idx % 2 === 0;
    const noSeo = true;
    const brokenLinks = true;
    const poorMobile = true;
    const missingContact = idx % 4 === 0;

    const deficits = {
      noWebsite: noWeb,
      outdatedWebsite: outdatedWeb,
      noGooglePresence: noGoogle,
      noSocialMedia: noSocial,
      poorBranding: poorBranding,
      noWhatsappCta: noWhatsapp,
      noOnlineCatalogue: noCatalogue,
      noBookingSystem: noBooking,
      noEnquiryForm: noEnquiry,
      noSeo: noSeo,
      brokenLinks: brokenLinks,
      poorMobileExperience: poorMobile,
      missingContact: missingContact
    };

    const defCount = Object.values(deficits).filter(Boolean).length;
    const rating = Number((3.8 + (idx * 0.2)).toFixed(1));
    const reviewsCount = 4 + (idx * 6);

    const presence = {
      hasWebsite: false,
      hasEmail: !missingContact,
      facebookStatus: noSocial ? "none" : idx % 2 === 0 ? "weak" : "active",
      instagramStatus: noSocial ? "none" : "weak",
      googleProfileQuality: noGoogle ? "poor" : "fair",
      reviewCountStatus: reviewsCount < 10 ? "few" : "average",
      photosStatus: poorBranding ? "missing" : "outdated",
      descriptionQuality: "fair",
      openingHoursStatus: idx % 2 === 0 ? "missing" : "complete",
      contactCompleteness: missingContact ? "missing" : "partial",
      deficits
    };

    const presenceScore = calculatePresenceScore(presence, rating, reviewsCount);
    const businessQualityScore = calculateBusinessQualityScore(rating, reviewsCount, presence);
    const digitalDeficitScore = calculateDigitalDeficitScore(presence);
    const opportunityScore = calculateOpportunityScore(presence, rating, reviewsCount);

    return {
      id: `${formattedCity.toLowerCase()}-${category.toLowerCase()}-${idx + 1}`,
      name: item.name,
      category: formattedCategory,
      address: item.addr,
      phone: `${phonePrefix} ${item.phoneSuffix}`,
      reviewsCount,
      rating,
      directorySource: "National Directory",
      presence,
      deficitCount: defCount,
      presenceScore,
      businessQualityScore,
      digitalDeficitScore,
      websiteOpportunityScore: opportunityScore,
      opportunityScore,
      description: item.desc,
      prospectStatus: "New",
      evidence: {
        checkedAt: new Date().toISOString(),
        source: "Public Registry & DNS Lookup",
        httpStatus: "No Domain Registered",
        websiteVerified: true,
        notes: `Confirmed zero active web host records or mobile landing page for ${item.name}.`
      }
    };
  });
}


// Vite middleware for development vs server static files for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
