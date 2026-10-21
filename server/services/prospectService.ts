import { GoogleGenAI, Type } from "@google/genai";
import { getGeminiClient, isApiKeyConfigured, generateContentWithRetry } from "./geminiService";

export function calculatePresenceScore(presence: any, rating?: number, reviewsCount?: number): number {
  let score = 50;

  if (presence) {
    if (presence.hasWebsite) score += 20;
    else score -= 15;

    if (presence.hasEmail) score += 5;
    if (presence.facebookStatus === "active") score += 5;
    if (presence.instagramStatus === "active") score += 5;

    if (presence.googleProfileQuality === "good") score += 10;
    else if (presence.googleProfileQuality === "poor") score -= 5;
  }

  if (rating !== undefined && rating > 0) {
    if (rating >= 4.5) score += 10;
    else if (rating >= 4.0) score += 5;
    else if (rating < 3.5) score -= 10;
  }

  if (reviewsCount !== undefined) {
    if (reviewsCount > 50) score += 10;
    else if (reviewsCount > 10) score += 5;
    else if (reviewsCount === 0) score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * HIGH-INTENT local commercial niches where web presence & fast mobile booking drive primary customer acquisition
 */
const HIGH_INTENT_CATEGORIES = [
  "plumber", "plumbing", "dentist", "dental", "lawyer", "legal", "attorney",
  "auto repair", "mechanic", "hvac", "electrician", "electrical", "roofing",
  "contractor", "construction", "salon", "hair salon", "barbershop", "spa",
  "restaurant", "catering", "veterinary", "vet", "physiotherapy", "clinic",
  "cleaning", "locksmith", "pest control", "security", "event planner", "photography"
];

/**
 * Calculates a rigorous, evidence-aware structured opportunity assessment.
 * Replaces simplistic '100 - presenceScore' with separate evidence dimensions:
 * - DIGITAL_DEFICIT (35% weight)
 * - BUSINESS_QUALITY (25% weight)
 * - COMMERCIAL_FIT (20% weight)
 * - CONTACTABILITY (20% weight)
 * - EVIDENCE_CONFIDENCE (Provenance index)
 */
export function calculateOpportunityScore(
  businessOrPresence: any,
  ratingInput?: number,
  reviewsCountInput?: number,
  categoryInput?: string,
  phoneInput?: string,
  addressInput?: string,
  evidenceInput?: any
): number {
  const result = calculateStructuredOpportunityResult(businessOrPresence, ratingInput, reviewsCountInput, categoryInput, phoneInput, addressInput, evidenceInput);
  return result.score;
}

export function calculateStructuredOpportunityResult(
  businessOrPresence: any,
  ratingInput?: number,
  reviewsCountInput?: number,
  categoryInput?: string,
  phoneInput?: string,
  addressInput?: string,
  evidenceInput?: any
) {
  // Normalize input: could be a full Business object or presence object
  const isFullBiz = businessOrPresence && (businessOrPresence.name || businessOrPresence.businessName || businessOrPresence.presence);
  const presence = isFullBiz ? businessOrPresence.presence : businessOrPresence;
  const rating = typeof ratingInput === "number" ? ratingInput : (typeof businessOrPresence?.rating === "number" ? businessOrPresence.rating : 0);
  const reviewsCount = typeof reviewsCountInput === "number" ? reviewsCountInput : (typeof businessOrPresence?.reviewsCount === "number" ? businessOrPresence.reviewsCount : 0);
  const category = categoryInput || businessOrPresence?.category || "";
  const phone = phoneInput || businessOrPresence?.phone || businessOrPresence?.contactPhone || "";
  const email = businessOrPresence?.email || businessOrPresence?.contactEmail || "";
  const address = addressInput || businessOrPresence?.address || "";
  const evidence = evidenceInput || businessOrPresence?.evidence;
  const verificationState = businessOrPresence?.verificationState || businessOrPresence?.verificationStatus || "UNVERIFIED";

  // 1. DIGITAL DEFICIT DIMENSION (35% weight)
  // Evaluates ONLY confirmed deficits and audited failures. UNKNOWN conditions are NEVER penalized.
  let digitalDeficitScore = 0;
  let confirmedDeficitCount = 0;
  const confirmedOpportunities: string[] = [];
  const unknownAreas: string[] = [];
  const supportingEvidence: Array<{ criterion: string; status: "PRESENT" | "MISSING" | "WEAK" | "BROKEN" | "UNKNOWN"; details: string; source?: string }> = [];

  const websiteStatus = presence?.websiteStatus || businessOrPresence?.websiteStatus;
  const hasWebsite = presence?.hasWebsite ?? businessOrPresence?.hasWebsite ?? false;

  if (websiteStatus === "UNREACHABLE" || websiteStatus === "WEBSITE_UNREACHABLE" || websiteStatus === "BROKEN") {
    digitalDeficitScore = 85;
    confirmedDeficitCount += 2;
    confirmedOpportunities.push("Website candidate is unreachable / connection failed");
    supportingEvidence.push({ criterion: "Website Host", status: "BROKEN", details: "Direct HTTP check failed or timed out", source: "HTTP Check" });
  } else if (!hasWebsite || websiteStatus === "WEBSITE_NOT_DISCOVERED" || websiteStatus === "NONE") {
    digitalDeficitScore = 80;
    confirmedDeficitCount += 1;
    confirmedOpportunities.push("No website discovered from public sources");
    supportingEvidence.push({ criterion: "Website Presence", status: "MISSING", details: "No website was discovered from available sources", source: "Domain / Search Index" });
  } else {
    // Live audited site: evaluate confirmed deficits
    let auditedPoints = 15; // Baseline for having a live site
    const deficits = presence?.deficits || businessOrPresence?.deficits;
    
    if (deficits) {
      if (deficits.poorMobileExperience) {
        auditedPoints += 18;
        confirmedDeficitCount++;
        confirmedOpportunities.push("Confirmed sub-optimal mobile viewport rendering");
        supportingEvidence.push({ criterion: "Mobile Viewport", status: "WEAK", details: "Missing or incomplete viewport meta tag", source: "HTML Audit" });
      }
      if (deficits.noSeo) {
        auditedPoints += 15;
        confirmedDeficitCount++;
        confirmedOpportunities.push("Missing or incomplete on-page SEO meta tags");
        supportingEvidence.push({ criterion: "SEO Metadata", status: "WEAK", details: "Title or meta description tags missing", source: "HTML Audit" });
      }
      if (deficits.outdatedWebsite) {
        auditedPoints += 15;
        confirmedDeficitCount++;
        confirmedOpportunities.push("Legacy web markup detected");
        supportingEvidence.push({ criterion: "Design Modernity", status: "WEAK", details: "Deprecated HTML tags detected", source: "HTML Audit" });
      }
      if (deficits.brokenLinks) {
        auditedPoints += 15;
        confirmedDeficitCount++;
        confirmedOpportunities.push("Broken on-page links detected");
        supportingEvidence.push({ criterion: "Broken Links", status: "BROKEN", details: "Internal links returned 404/500 errors", source: "Link Crawler" });
      }
    }
    digitalDeficitScore = Math.min(95, auditedPoints);
  }

  // Record unknown areas that were not inspected
  if (!presence?.hasWebsite) {
    unknownAreas.push("Subpage booking widgets (untested without website)");
    unknownAreas.push("Internal enquiry forms (untested without website)");
    unknownAreas.push("Interactive mobile navigation (untested without website)");
  }

  // 2. BUSINESS QUALITY DIMENSION (25% weight)
  // Evaluates verified reputation signals without assumption
  let businessQualityScore = 40; // Neutral baseline
  if (rating >= 4.8) businessQualityScore = 90;
  else if (rating >= 4.5) businessQualityScore = 80;
  else if (rating >= 4.0) businessQualityScore = 65;
  else if (rating >= 3.5) businessQualityScore = 50;
  else if (rating > 0) businessQualityScore = 35;

  if (reviewsCount >= 50) businessQualityScore = Math.min(100, businessQualityScore + 10);
  else if (reviewsCount >= 10) businessQualityScore = Math.min(100, businessQualityScore + 5);

  // 3. COMMERCIAL FIT DIMENSION (20% weight)
  // Evaluates high-intent customer acquisition fit based on category
  const catLower = (category || "").toLowerCase();
  const isHighIntent = HIGH_INTENT_CATEGORIES.some(c => catLower.includes(c));
  let commercialFitScore = 65;
  let fitRating: "HIGH" | "MEDIUM" | "STANDARD" = "STANDARD";

  if (isHighIntent) {
    commercialFitScore = 90;
    fitRating = "HIGH";
  } else if (catLower.length > 2) {
    commercialFitScore = 75;
    fitRating = "MEDIUM";
  }

  // 4. CONTACTABILITY DIMENSION (20% weight)
  // Evaluates available direct outreach channels (Missing email does NOT make contactability low if phone exists)
  let contactabilityScore = 40;
  const contactChannels: string[] = [];

  const hasPhone = Boolean(phone && phone.trim() !== "" && phone.toLowerCase() !== "none");
  const hasEmail = Boolean(email && email.trim() !== "" && email.toLowerCase() !== "none");
  const hasAddress = Boolean(address && address.trim() !== "" && address.toLowerCase() !== "none");

  if (hasPhone) {
    contactabilityScore += 35;
    contactChannels.push("Phone");
  }
  if (hasEmail) {
    contactabilityScore += 15;
    contactChannels.push("Email");
  }
  if (hasAddress) {
    contactabilityScore += 10;
    contactChannels.push("Physical Address");
  }
  contactabilityScore = Math.min(100, contactabilityScore);

  // 5. EVIDENCE CONFIDENCE INDEX (Provenance)
  let confidenceScore = 30; // Baseline
  let verifiedSignals = 0;
  const totalSignals = 4;

  if (verificationState === "VERIFIED" || (evidence && evidence.verificationStatus === "source_backed")) {
    confidenceScore += 30;
    verifiedSignals++;
  }
  if (presence?.lastCheckedAt || evidence?.checkedAt) {
    confidenceScore += 20;
    verifiedSignals++;
  }
  if (hasPhone) {
    confidenceScore += 10;
    verifiedSignals++;
  }
  if (rating > 0 && reviewsCount > 0) {
    confidenceScore += 10;
    verifiedSignals++;
  }
  confidenceScore = Math.min(100, confidenceScore);
  const confidenceLevel: "HIGH" | "MEDIUM" | "LOW" = confidenceScore >= 75 ? "HIGH" : confidenceScore >= 50 ? "MEDIUM" : "LOW";

  // FINAL COMPOSITE SCORE
  const defWeight = 0.35;
  const qualWeight = 0.25;
  const commWeight = 0.20;
  const contWeight = 0.20;

  const totalScore = Math.min(99, Math.max(25, Math.round(
    (digitalDeficitScore * defWeight) +
    (businessQualityScore * qualWeight) +
    (commercialFitScore * commWeight) +
    (contactabilityScore * contWeight)
  )));

  return {
    score: totalScore,
    scoreComponents: {
      digitalDeficit: {
        score: digitalDeficitScore,
        weight: defWeight,
        contribution: Math.round(digitalDeficitScore * defWeight),
        description: "Confirmed technical and digital discovery deficits",
        confirmedDeficitCount
      },
      businessQuality: {
        score: businessQualityScore,
        weight: qualWeight,
        contribution: Math.round(businessQualityScore * qualWeight),
        description: "Customer rating and social proof volume",
        rating,
        reviewsCount
      },
      commercialFit: {
        score: commercialFitScore,
        weight: commWeight,
        contribution: Math.round(commercialFitScore * commWeight),
        description: "Commercial acquisition suitability based on industry category",
        category: category || "General Trade",
        fitRating
      },
      contactability: {
        score: contactabilityScore,
        weight: contWeight,
        contribution: Math.round(contactabilityScore * contWeight),
        description: "Direct outreach accessibility channels",
        channels: contactChannels
      }
    },
    evidenceConfidence: {
      score: confidenceScore,
      level: confidenceLevel,
      verifiedSignals,
      totalSignals,
      provenanceNotes: `Evaluated ${verifiedSignals}/${totalSignals} verified evidence signals.`
    },
    confirmedOpportunities,
    unknownAreas,
    supportingEvidence,
    timestamp: new Date().toISOString(),
    assessmentStatement: "Opportunity assessment based on available evidence."
  };
}

export async function analyzeProspectOpportunity(business: any) {
  const presenceScore = calculatePresenceScore(business.presence, business.rating, business.reviewsCount);

  if (!isApiKeyConfigured()) {
    return {
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
    };
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

  try {
    const response = await generateContentWithRetry({
      model: "gemini-3.8-flash",
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
    return {
      presenceScore,
      ...data,
      source: "ai_generated"
    };
  } catch (err: any) {
    return {
      presenceScore,
      whyWebsiteNeeded: `As a local business, ${business.name} is missing out on local customer searches. Having a website builds ultimate trust.`,
      recommendations: [
        "Build a modern responsive website.",
        "Add a WhatsApp call-to-action button.",
        "Include a service pricing list and online forms.",
        "Optimize search engines for local search keywords."
      ],
      competitorPitches: ["Competitors are stealing leads with professional websites."],
      error: err.message
    };
  }
}
