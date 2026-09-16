import { GoogleGenAI, Type } from "@google/genai";
import { getGeminiClient, isApiKeyConfigured } from "./geminiService";

export interface SalesCopyParams {
  site: any;
  prospect?: any;
  salesPitchTone?: string;
}

export function generateFallbackSalesCopy(site: any, tone: string = "Professional") {
  const businessName = site?.businessName || "Local Business";
  const category = site?.category || "Professional Services";
  const address = site?.address || "Local Area";
  const phone = site?.phone || "";

  return {
    pitchHook: `Did you know that local clients searching for ${category.toLowerCase()} in ${address} choose providers with fast mobile booking?`,
    auditSummary: `Audit verified for ${businessName}: Currently missing instant 1-tap WhatsApp consultation and online quote form.`,
    corePitch: `We built a custom interactive prototype for ${businessName} featuring your verified contact details (${phone}) and high-converting service showcases.`,
    callToAction: "Review your live prototype link and let us know if you would like us to launch it on your official domain.",
    whatsappScript: `Hi ${businessName}! I created a custom mobile website preview for your business: [Link]. Take a look and let me know if you'd like to launch it!`,
    proposalDraft: `Proposal for ${businessName}: Modern static web application deployment, mobile viewport optimization, SSL certificate setup, and 1-tap WhatsApp lead integration.`
  };
}

export function getFallbackOutreach(tone: string = "Professional") {
  return {
    email: `Subject: Modern Web Prototype for Your Business\n\nHi Team,\n\nI created a customized mobile website prototype for your business. Take a look and let me know your thoughts.\n\nBest regards,\nDigital Partner`,
    whatsapp: `Hi! I created a custom mobile site preview for your team. Check it out here: [Link]`,
    sms: `Hi! Check out the mobile website prototype we built for your business: [Link]`,
    coldCall: `[Opening]: Hi, I noticed your business listing on Google Maps...\n[Hook]: We created a custom mobile prototype for you...\n[Closing]: Can I send you the link to review on your phone?`,
    followUp: `Hi! Just following up on the mobile site preview we sent earlier. Let us know if you have any questions!`,
    linkedin: `Hi! I put together a mobile-first digital prototype for your business. Would love to share the live link with you.`,
    messenger: `Hey there! Check out this free website preview we created for your local business: [Link]`
  };
}

export async function generateSalesCopyService(params: SalesCopyParams) {
  const { site, prospect, salesPitchTone = "Professional" } = params;
  if (!isApiKeyConfigured()) {
    return generateFallbackSalesCopy(site, salesPitchTone);
  }

  const ai = getGeminiClient();
  const prompt = `You are a world-class sales copywriter and digital strategist. Produce evidence-grounded outreach copy for:
Business Name: "${site.businessName || prospect?.name}"
Category: "${site.category || prospect?.category}"
Location: "${site.address || prospect?.address}"
Tone: "${salesPitchTone}"

Grounding Rules:
- STRICTLY DO NOT FABRICATE metrics, visitor counts, or revenue figures.
- Ground arguments in actual observed Google Maps listing elements or missing digital capabilities (missing mobile site, missing 1-tap WhatsApp, missing online quote form).

Return JSON:
{
  "pitchHook": "string",
  "auditSummary": "string",
  "corePitch": "string",
  "callToAction": "string",
  "whatsappScript": "string",
  "proposalDraft": "string"
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (err: any) {
    return generateFallbackSalesCopy(site, salesPitchTone);
  }
}
