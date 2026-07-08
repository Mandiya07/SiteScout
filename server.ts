import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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
async function generateContentWithRetry(params: any, maxRetries = 3, initialDelayMs = 1000): Promise<any> {
  const ai = getGeminiClient();
  let delay = initialDelayMs;
  let lastError: any = null;
  const originalModel = params.model || "gemini-3.1-flash-lite";
  const modelsToTry = [originalModel, "gemini-flash-latest"];

  for (const modelName of modelsToTry) {
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
        console.log(`[Gemini API Warning] Model ${modelName} failed on attempt ${attempt}/${maxRetries}:`, error.message || error);
        
        if (error.status === 400 || error.status === 401 || error.status === 403 || error.status === 404) {
          console.log(`[Gemini API Early Exit] Non-transient status ${error.status}. Skipping retries for ${modelName}.`);
          break; // Switch to next model immediately
        }

        const errorStr = typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error));
        const isQuotaExceeded = error.status === 429 && errorStr.includes('Quota exceeded');
        const isHighDemand = error.status === 503 || errorStr.includes('high demand');
        
        if (isQuotaExceeded || isHighDemand) {
          console.log(`[Gemini API Early Exit] Quota Exceeded or High Demand detected. Skipping retries for ${modelName}.`);
          break; // Switch to next model immediately
        }

        if (attempt < maxRetries) {
          console.log(`[Gemini API] Transient issue detected. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5;
        }
      }
    }
  }
  throw lastError;
}

// Module 3 & 4 API: Intelligent Business Discovery Generator
app.post("/api/search", async (req, res) => {
  const { country = "USA", city = "Austin", town = "", category = "Plumbers", keywords = "", radius = "5" } = req.body;

  try {
    if (!isApiKeyConfigured()) {
      // Return high-quality localized mock fallback if Gemini is not configured
      return res.json({
        businesses: getMockBusinesses(city, category),
        source: "mock_fallback"
      });
    }

    const locationStr = town ? `${town}, ${city}, ${country}` : `${city}, ${country}`;
    const ai = getGeminiClient();
    const prompt = `Generate a list of exactly 6 realistic, detailed local businesses of category "${category}" within a ${radius}km radius of "${locationStr}" that do not have websites or have extremely poor digital presence.
    ${keywords ? `Ensure these businesses relate to the following keywords: ${keywords}.` : ''}
    Make the results highly specific to "${locationStr}". Use authentic street names, local area codes for phone numbers, and typical local business names.
    Format your response as a strict JSON array matching this exact schema:
    [
      {
        "id": "string (unique slug)",
        "name": "string (business name)",
        "category": "string",
        "address": "string (realistic street address in ${city})",
        "phone": "string (realistic phone number with local area code)",
        "reviewsCount": "number (typical local business reviews, e.g. 5 to 150)",
        "rating": "number (e.g. 3.2 to 4.8)",
        "presence": {
          "hasWebsite": false,
          "hasEmail": "boolean",
          "facebookStatus": "active | weak | none",
          "instagramStatus": "active | weak | none",
          "googleProfileQuality": "good | fair | poor",
          "reviewCountStatus": "few | average | many",
          "photosStatus": "sufficient | missing | outdated",
          "descriptionQuality": "good | fair | poor",
          "openingHoursStatus": "complete | missing",
          "contactCompleteness": "complete | partial | missing"
        },
        "description": "string (1-2 sentence description of what they do and who they serve)"
      }
    ]`;

    const response = await generateContentWithRetry({
      model: "gemini-3.1-flash-lite",
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
                  contactCompleteness: { type: Type.STRING }
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
    res.json({ businesses: data, source: "ai_generated" });
  } catch (error: any) {
    console.log("Gemini search resolved with fallback:", error.message || error);
    res.json({
      businesses: getMockBusinesses(city, category),
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
      model: "gemini-3.1-flash-lite",
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
    const prompt = `Act as an elite copywriter and web designer. Generate a fully comprehensive, high-converting website content schema for:
    Business: "${business.name}"
    Category: "${business.category}"
    Location: "${business.address}"
    Phone: "${business.phone}"
    Description: "${business.description || ''}"

    Generate content for the following elements:
    1. Color palette (primary, secondary, accent, background hex codes)
    2. Font family style (sans, serif, mono, modern, display)
    3. Homepage Hero (Headline, subheadline, CTA button text, secondary CTA button text)
    4. About Section (History, mission, long pitch, key bullet points)
    5. Services list (at least 3 premium service packages, each with title, description, and price starting-at)
    6. Features section (3 bullet points of what makes them stand out, with title, icon-slug (choose from: Shield, Award, Clock, Star, Zap, MapPin, Sparkles, Smile), description)
    7. FAQ section (at least 3 frequently asked questions and high-quality answers)
    8. Testimonials (at least 2 realistic reviews from local customers with names and ratings)
    9. Blog posts (2 realistic blog post titles, short descriptions, and categories)
    10. SEO Metadata (Meta title, meta description, and keywords)
    11. Gallery (3 placeholder images from Unsplash, with URLs e.g. "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=800" related to the category, and alt text)
    12. Contact Page (title, description, and an email address like contact@business.com)
    13. Privacy Policy (A short 1-2 paragraph realistic privacy policy)
    14. Terms of Service (A short 1-2 paragraph realistic terms of service)
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
      model: "gemini-3.1-flash-lite",
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
        id: business.id,
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

    let emailSubject = `Custom Website Blueprint Created for ${name} in ${addr}`;
    let emailGreeting = `Dear ${name} Team,`;
    let emailPitch = `I noticed your business on Google, and you do a fantastic job serving your clients as a leading ${cat} in ${addr}. However, I noticed you do not currently have a dedicated website. We designed a fully customized, mobile-optimized preview website specifically for you to see what is possible. You can view the live interactive preview here: ${link}`;
    let emailClosing = `Best regards,\n[Your Name]`;

    let whatsapp = `Hi! This is [Your Name]. I noticed ${name} is highly rated in ${addr} but doesn't have a website yet. I built a free interactive preview website for you to see how your professional services would look online: ${link} Let me know what you think!`;
    let sms = `Hi! Built a custom mobile preview website for ${name} to help you secure more local customers in ${addr}. View it here: ${link} - [Your Name]`;
    let coldCall = `[Opening]\n"Hi, is this the owner of ${name}? My name is [Your Name]."\n\n[Value Pitch]\n"I was looking at your excellent ratings in ${addr} as a ${cat} and realized you don't have a website. I actually built a free interactive preview website customized specifically for ${name} so you can see how it would attract more calls. If I send over the link, would you be open to taking a 30-second look?"\n\n[Handling Resistance ("Send an email / Busy")]\n"Completely understand! That's why I wanted to send the interactive link directly so you can look at your own leisure. What's the best mobile number or email to send it to?"\n\n[Closing]\n"Thank you so much! I'll send it over now. Talk soon!"`;
    let followUp = `Hi! Just wanted to follow up and see if you had a moment to look at the custom website draft we built for ${name}: ${link} No rush at all!`;
    let linkedin = `Hi there, I hope you are having a great week. I came across ${name} while looking for leading ${cat} businesses in the ${addr} region. I specialize in helping local service companies capture more map search leads. I went ahead and drafted a fully responsive, custom preview website specifically for ${name}: ${link}\nWould love to connect and see if this aligns with your growth strategy!`;
    let messenger = `Hey there! Just wanted to share this with you—I designed a free interactive preview website customized specifically for ${name}: ${link} Since you have such great ratings, this will help you stand out even more. Hope you like it!`;

    if (isPremium) {
      emailSubject = `Exclusive Digital Presentation Blueprint: ${name}`;
      emailGreeting = `Dear Directors at ${name},`;
      emailPitch = `We have recently completed an analysis of premium service providers in the ${addr} area. As a distinguished ${cat}, your client reputation is exemplary. To complement your stature, we have meticulously drafted an exclusive, high-fidelity interactive digital layout tailored specifically for ${name}. You may experience the live bespoke layout here: ${link}`;
      emailClosing = `With warm regards,\n[Your Name]\nDigital Strategy Specialist`;
      whatsapp = `Good day. I have crafted a bespoke, premium digital layout presentation designed specifically to reflect the elite service caliber of ${name} in ${addr}. View your interactive draft here: ${link}`;
      sms = `Bespoke digital layout created exclusively for ${name} to elevate your local presence. View the private interactive preview: ${link}`;
      followUp = `Good day, just following up on the exclusive digital layout designed for ${name}: ${link}. We would be honored to receive your perspective on it.`;
      linkedin = `Hello, I hope this message finds you well. I specialize in digital asset creation for leading ${cat} providers. Given the stellar profile of ${name} in ${addr}, I have prepared a custom high-fidelity web blueprint for your review: ${link} Let's connect.`;
      messenger = `Hello! We've designed a bespoke online presentation layout for ${name} to showcase your exceptional local ratings in ${addr}. Take a premium preview here: ${link}`;
    } else if (isFriendly) {
      emailSubject = `Built a custom webpage draft for ${name}! 😊`;
      emailGreeting = `Hi to the friendly team at ${name},`;
      emailPitch = `I was searching for top-rated ${cat} providers in ${addr} and your business stood out immediately! You clearly care deeply about your customers. I thought it would be a fun and helpful surprise to build a free interactive website layout designed just for you. Take a peek here: ${link}`;
      emailClosing = `Wishing you continued success,\n[Your Name]`;
      whatsapp = `Hey there! 😊 Hope you're having a wonderful day. I love what you're doing with ${name} in ${addr}! I actually made a free custom website preview for you to see how awesome your services look online: ${link} Let me know what you think!`;
      sms = `Hi! 😊 Made a custom web preview for ${name} to help you get more friendly local reviews. Check it out here: ${link}`;
      followUp = `Hi again! 😊 Just checking in to see if you had a chance to check out the custom webpage preview I sent over: ${link}. Have a great day!`;
      linkedin = `Hi there! I was admiring the great local reviews for ${name} in ${addr} and wanted to reach out. I put together a quick, friendly, and fully custom homepage layout so you can see your business shine online: ${link} Let's connect!`;
      messenger = `Hi there! 😊 I put together a special interactive homepage layout just for ${name} to showcase your great work in ${addr}. You can play around with it live here: ${link} Hope you love it!`;
    } else if (isCasual) {
      emailSubject = `Quick website preview I put together for ${name}`;
      emailGreeting = `Hey there,`;
      emailPitch = `I'm a local designer and was looking at ${cat} businesses in ${addr}. I noticed ${name} has awesome reviews but doesn't have a website yet. I had some free time and put together a quick, interactive website preview for you to see how it would look. Check it out here: ${link}`;
      emailClosing = `Cheers,\n[Your Name]`;
      whatsapp = `Hey! I put together a quick website draft for ${name} since you guys have awesome reviews in ${addr} but no active site yet. Check out the interactive preview here: ${link} - let me know if it hits the mark!`;
      sms = `Hey! Put together a quick web preview for ${name} in ${addr}. Tap here to check it out: ${link} - [Your Name]`;
      followUp = `Hey! Just checking if you got a second to check out that custom web draft for ${name}: ${link}. Let me know your thoughts!`;
      linkedin = `Hey, hope all is well. I was checking out some local ${cat} options in ${addr} and saw ${name}. I went ahead and made a fast interactive homepage mockup for you to look over: ${link} Let's connect if you want to chat!`;
      messenger = `Hey guys! I built a cool interactive draft website for ${name} so you can see your great ratings in a customized local web layout. Check it out: ${link}`;
    } else if (isConcise) {
      emailSubject = `Interactive Draft: ${name}`;
      emailGreeting = `Hello,`;
      emailPitch = `I have generated a customized, interactive website preview tailored specifically for ${name} in ${addr} (${cat}): ${link}\n\nThis responsive homepage includes call-to-actions, services, and map optimizations ready for setup.`;
      emailClosing = `Regards,\n[Your Name]`;
      whatsapp = `Hello. Created a custom interactive website preview for ${name} to grow your ${cat} leads in ${addr}: ${link}`;
      sms = `Interactive mobile web preview for ${name} is live. View draft: ${link}`;
      followUp = `Hello, following up on the interactive draft website for ${name}: ${link}. Let me know if you would like to proceed.`;
      linkedin = `Hello, I designed a responsive homepage preview for ${name} (${cat} in ${addr}) to capture local mobile traffic: ${link} Let's connect to review details.`;
      messenger = `Hello! Created a custom interactive website draft for ${name} to showcase your local services: ${link}`;
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
    const prompt = `Act as a world-class, highly persuasive sales copywriter. Generate tailored sales outreach messages for "${name}" (a ${cat} in ${addr}).
    The messaging must be persuasive without being pushy. Every message must be highly personalized using the business's name, industry/category, and location/address.
    Tone constraint: "${tone}" (Options: Professional, Friendly, Premium, Casual, Concise). Let this tone drive the vocabulary, style, and density of the pitch.
    Include this interactive preview URL in the messages: "${link}"

    Generate outreach messages for:
    1. Email (include structured Subject line, customized greeting, personalized value proposition tailored to ${cat} in ${addr}, and professional sign-off)
    2. WhatsApp (conversational, engaging, includes emojis, friendly layout, with clear call-to-action to check the link)
    3. SMS (extremely short, under 160 characters, concise and punchy with the link)
    4. Cold Call Script (conversational, structured with [Opening], [Value Pitch based on their category/location], [Handling Resistance like "send me an email" or "busy"], and [Closing])
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
      model: "gemini-3.1-flash-lite",
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


// Helper function to calculate presence score
function calculatePresenceScore(presence: any, rating: number, reviews: number): number {
  let score = 100;
  if (!presence) return 45;

  if (!presence.hasWebsite) score -= 25;
  if (!presence.hasEmail) score -= 10;
  
  if (presence.facebookStatus === "none") score -= 8;
  else if (presence.facebookStatus === "weak") score -= 4;

  if (presence.instagramStatus === "none") score -= 8;
  else if (presence.instagramStatus === "weak") score -= 4;

  if (presence.googleProfileQuality === "poor") score -= 10;
  else if (presence.googleProfileQuality === "fair") score -= 5;
  
  if (presence.descriptionQuality === "poor") score -= 5;
  else if (presence.descriptionQuality === "fair") score -= 2;
  
  if (presence.openingHoursStatus === "missing") score -= 5;
  
  if (presence.contactCompleteness === "missing") score -= 10;
  else if (presence.contactCompleteness === "partial") score -= 5;

  if (rating < 4.0) score -= 10;
  if (reviews < 20) score -= 5;

  return Math.max(15, Math.min(95, score));
}

// Default layout templates based on industry/category
function generateDefaultTemplateSite(business: any) {
  const isRestaurant = business.category?.toLowerCase().includes("restaurant") || business.category?.toLowerCase().includes("food") || business.category?.toLowerCase().includes("cafe");
  const isMedical = business.category?.toLowerCase().includes("doctor") || business.category?.toLowerCase().includes("clinic") || business.category?.toLowerCase().includes("medical") || business.category?.toLowerCase().includes("dentist");
  const isLegal = business.category?.toLowerCase().includes("law") || business.category?.toLowerCase().includes("attorney") || business.category?.toLowerCase().includes("legal");
  
  let primaryColor = "#0f172a"; // slate-900
  let secondaryColor = "#475569"; // slate-600
  let accentColor = "#2563eb"; // blue-600
  let fontStyle = "sans";

  if (isRestaurant) {
    primaryColor = "#7c2d12"; // orange-900
    secondaryColor = "#c2410c"; // orange-700
    accentColor = "#ea580c"; // orange-600
    fontStyle = "display";
  } else if (isMedical) {
    primaryColor = "#0f766e"; // teal-700
    secondaryColor = "#0d9488"; // teal-600
    accentColor = "#06b6d4"; // cyan-500
    fontStyle = "sans";
  } else if (isLegal) {
    primaryColor = "#1e1b4b"; // indigo-950
    secondaryColor = "#312e81"; // indigo-900
    accentColor = "#b45309"; // amber-700
    fontStyle = "serif";
  } else {
    // Default blue tech/trade color for trades, beauty, plumbers, mechanics
    primaryColor = "#1e293b";
    secondaryColor = "#0284c7";
    accentColor = "#0ea5e9";
    fontStyle = "modern";
  }

  return {
    id: business.id || "slug",
    businessName: business.name || "Local Business Ltd",
    phone: business.phone || "555-0199",
    address: business.address || "123 Main Street",
    category: business.category || "Service Professional",
    primaryColor,
    secondaryColor,
    accentColor,
    backgroundColor: "#f8fafc",
    textColor: "#1e293b",
    fontStyle,
    seo: {
      title: `${business.name} | Expert ${business.category} in Local Area`,
      description: `Professional, reliable ${business.category} services offered by ${business.name}. Contact us today for direct inquiries, bookings, or pricing details.`,
      keywords: `${business.category}, ${business.name}, professional, local services`
    },
    hero: {
      title: `Premium ${business.category} Services You Can Rely On`,
      subtitle: `Proudly serving the local community with years of experience, professional standards, and guaranteed satisfaction.`,
      ctaPrimary: "Get Free Quote",
      ctaSecondary: "View Services"
    },
    about: {
      title: "Our Story",
      history: `We have been working in the ${business.category} industry for years, earning the trust of customers through absolute dedication, transparency, and top-tier craft.`,
      mission: `To provide dependable, elite services with transparent upfront pricing and direct, responsive support for every client.`,
      pitch: `Whether you need a quick repair, a comprehensive scheduled project, or emergency service, our dedicated local team handles every job with precision and custom solutions.`
    },
    services: [
      {
        title: "Standard Service Package",
        description: "Includes initial diagnostic check, expert resolution, and full service warranty coverage.",
        price: "$149"
      },
      {
        title: "Premium Full Support",
        description: "Comprehensive maintenance, comprehensive multi-point inspection, and high-priority immediate queue dispatch.",
        price: "$299"
      },
      {
        title: "Emergency / Custom Dispatch",
        description: "SLA response team dispatch for urgent tasks, custom consultation, and direct lead supervisor management.",
        price: "Custom Estimate"
      }
    ],
    features: [
      {
        title: "Fully Guaranteed",
        icon: "Shield",
        description: "All of our projects and support packages carry a comprehensive quality-of-craft warranty."
      },
      {
        title: "Experienced Team",
        icon: "Award",
        description: "Our staff consists solely of certified professionals with over 10+ years of active field service."
      },
      {
        title: "Direct Support 24/7",
        icon: "Clock",
        description: "We are always available via Call or WhatsApp for urgent inquiries or immediate bookings."
      }
    ],
    faqs: [
      {
        question: `What are your regular service hours?`,
        answer: `We serve the local area 6 days a week from 8:00 AM to 6:00 PM. Emergency services are available 24/7 by calling our hotlines.`
      },
      {
        question: `Do you provide transparent pricing upfront?`,
        answer: `Yes, we outline all pricing and expected parts/labor options before starting any work so you never face surprise costs.`
      },
      {
        question: `How quickly can you dispatch a professional?`,
        answer: `Usually, we have a technician or consultant at your location within 2 hours for active local calls, and same-day scheduling for routine appointments.`
      }
    ],
    testimonials: [
      {
        name: "Jessica Miller",
        review: `Absolutely flawless service! They responded within 30 minutes, diagnosed the issue immediately, and charged exactly what they quoted. Highly recommended.`,
        rating: 5
      },
      {
        name: "Robert Henderson",
        review: `It is rare to find a service company this professional. Prompt, clean, and fully transparent throughout the process. A true local asset!`,
        rating: 5
      }
    ],
    blog: [
      {
        title: `5 Crucial Checklist Tips for Choosing a Reliable ${business.category}`,
        summary: `Don't get caught with poor service. Learn the specific credentials, insurance requirements, and pricing signs you must verify before hiring.`,
        category: "Safety Advice"
      },
      {
        title: `How Regular Maintenance Prevents Massive Emergency Repair Costs`,
        summary: `A small routine checkup can save thousands in sudden breakdown expenses. Read our straightforward seasonal schedule guide.`,
        category: "Cost Savings"
      }
    ],
    gallery: [
      { url: "https://images.unsplash.com/photo-1542013936693-884638332954?auto=format&fit=crop&w=800", alt: "Professional service image" },
      { url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800", alt: "Business premise" },
      { url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800", alt: "Customer satisfaction" }
    ],
    whatsappMessage: `Hi, I saw your website preview and would like to request a service callback!`,
    contactPage: {
      title: "Contact Us",
      description: "We would love to hear from you. Fill out the form or reach us via phone or email.",
      email: "hello@localbusiness.com"
    },
    privacyPolicy: "We value your privacy. We collect basic contact information to fulfill our service obligations and never sell your data to third parties.",
    termsOfService: "By using our services, you agree to our standard terms and conditions. Quotes are estimates and subject to final inspection.",
    notFoundPage: {
      title: "Page Not Found",
      message: "Sorry, the page you are looking for does not exist."
    }
  };
}

// Mock generator for businesses without websites to enable out-of-the-box searches anywhere
function getMockBusinesses(city: string, category: string) {
  const formattedCity = city.charAt(0).toUpperCase() + city.slice(1);
  const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
  const singularCategory = formattedCategory.endsWith("s") ? formattedCategory.slice(0, -1) : formattedCategory;

  return [
    {
      id: `${formattedCity.toLowerCase()}-${category.toLowerCase()}-1`,
      name: `${formattedCity} Family ${singularCategory}`,
      category: formattedCategory,
      address: `412 Maple Avenue, ${formattedCity}`,
      phone: `(${formattedCity === "London" ? "+44 20" : "512"}) 555-0143`,
      reviewsCount: 18,
      rating: 4.3,
      presence: {
        hasWebsite: false,
        hasEmail: false,
        facebookStatus: "weak",
        instagramStatus: "none",
        googleProfileQuality: "fair",
        reviewCountStatus: "few",
        photosStatus: "missing",
        descriptionQuality: "fair",
        openingHoursStatus: "missing",
        contactCompleteness: "partial"
      },
      description: `A highly rated family-owned ${singularCategory.toLowerCase()} business dedicated to serving local residents with prompt, personal attention and direct care.`
    },
    {
      id: `${formattedCity.toLowerCase()}-${category.toLowerCase()}-2`,
      name: `Apex ${formattedCategory} Group`,
      category: formattedCategory,
      address: `108 Industrial Blvd, Suite C, ${formattedCity}`,
      phone: `(${formattedCity === "London" ? "+44 20" : "512"}) 555-0177`,
      reviewsCount: 42,
      rating: 4.6,
      presence: {
        hasWebsite: false,
        hasEmail: true,
        facebookStatus: "none",
        instagramStatus: "none",
        googleProfileQuality: "poor",
        reviewCountStatus: "average",
        photosStatus: "outdated",
        descriptionQuality: "poor",
        openingHoursStatus: "complete",
        contactCompleteness: "partial"
      },
      description: `Experienced commercial and residential ${singularCategory.toLowerCase()} specialists providing affordable bulk package options and fast service.`
    },
    {
      id: `${formattedCity.toLowerCase()}-${category.toLowerCase()}-3`,
      name: `Prestige ${singularCategory} Solutions`,
      category: formattedCategory,
      address: `1256 High Street, ${formattedCity}`,
      phone: `(${formattedCity === "London" ? "+44 20" : "512"}) 555-0199`,
      reviewsCount: 9,
      rating: 3.8,
      presence: {
        hasWebsite: false,
        hasEmail: false,
        facebookStatus: "none",
        instagramStatus: "weak",
        googleProfileQuality: "poor",
        reviewCountStatus: "few",
        photosStatus: "missing",
        descriptionQuality: "poor",
        openingHoursStatus: "missing",
        contactCompleteness: "missing"
      },
      description: `Reliable local ${singularCategory.toLowerCase()} services offering emergency calls and flexible scheduling, but struggling with a virtually invisible web presence.`
    },
    {
      id: `${formattedCity.toLowerCase()}-${category.toLowerCase()}-4`,
      name: `Downtown ${singularCategory} & Co.`,
      category: formattedCategory,
      address: `88 Broadway St, ${formattedCity}`,
      phone: `(${formattedCity === "London" ? "+44 20" : "512"}) 555-0212`,
      reviewsCount: 65,
      rating: 4.7,
      presence: {
        hasWebsite: false,
        hasEmail: true,
        facebookStatus: "active",
        instagramStatus: "none",
        googleProfileQuality: "good",
        reviewCountStatus: "many",
        photosStatus: "sufficient",
        descriptionQuality: "good",
        openingHoursStatus: "complete",
        contactCompleteness: "complete"
      },
      description: `A high-performing hub for quality local ${singularCategory.toLowerCase()} services with great reviews on maps, but completely lacking a dedicated website to convert mobile visitors.`
    },
    {
      id: `${formattedCity.toLowerCase()}-${category.toLowerCase()}-5`,
      name: `Metro ${singularCategory} Services`,
      category: formattedCategory,
      address: `334 Oak Lane, ${formattedCity}`,
      phone: `(${formattedCity === "London" ? "+44 20" : "512"}) 555-0255`,
      reviewsCount: 5,
      rating: 4.0,
      presence: {
        hasWebsite: false,
        hasEmail: false,
        facebookStatus: "none",
        instagramStatus: "none",
        googleProfileQuality: "poor",
        reviewCountStatus: "few",
        photosStatus: "missing",
        descriptionQuality: "poor",
        openingHoursStatus: "missing",
        contactCompleteness: "missing"
      },
      description: `A neighborhood expert providing direct, honest work, currently operating strictly via word-of-mouth and map listings.`
    },
    {
      id: `${formattedCity.toLowerCase()}-${category.toLowerCase()}-6`,
      name: `Summit Custom ${singularCategory}`,
      category: formattedCategory,
      address: `72 Stone Road, ${formattedCity}`,
      phone: `(${formattedCity === "London" ? "+44 20" : "512"}) 555-0288`,
      reviewsCount: 29,
      rating: 4.2,
      presence: {
        hasWebsite: false,
        hasEmail: false,
        facebookStatus: "weak",
        instagramStatus: "weak",
        googleProfileQuality: "fair",
        reviewCountStatus: "average",
        photosStatus: "outdated",
        descriptionQuality: "fair",
        openingHoursStatus: "complete",
        contactCompleteness: "partial"
      },
      description: `Bespoke, high-quality ${singularCategory.toLowerCase()} solutions matching custom requirements for residential and industrial property owners.`
    }
  ];
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
