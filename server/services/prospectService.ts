import { GoogleGenAI, Type } from "@google/genai";
import { getGeminiClient, isApiKeyConfigured } from "./geminiService";

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

export function calculateOpportunityScore(presence: any, rating?: number, reviewsCount?: number): number {
  const presenceScore = calculatePresenceScore(presence, rating, reviewsCount);
  return 100 - presenceScore;
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
    const response = await ai.models.generateContent({
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
