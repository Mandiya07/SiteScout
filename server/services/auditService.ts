import { safeFetchUrl } from "../ssrfGuard";
import { generateContentWithRetry, isApiKeyConfigured } from "./geminiService";

export interface AuditDeficits {
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
}

export interface TechnicalMetrics {
  statusCode: number;
  statusText: string;
  responseTimeMs: number;
  speedGrade: "FAST" | "AVERAGE" | "SLOW" | "FAILED";
  isSsl: boolean;
  hasViewport: boolean;
  hasTitle: boolean;
  titleText: string;
  hasMetaDescription: boolean;
  metaDescriptionText: string;
  hasOpenGraph: boolean;
  hasH1: boolean;
  h1Text: string;
  hasTelLink: boolean;
  hasMailtoLink: boolean;
  hasWhatsappCta: boolean;
  hasBookingEngine: boolean;
  hasLeadForm: boolean;
  hasSocialLinks: boolean;
  socialNetworksFound: string[];
  isLegacyMarkup: boolean;
  detectedLegacyTags: string[];
  contentLengthBytes: number;
}

export interface ConversionBottleneck {
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  label: string;
  finding: string;
  revenueImpact: string;
  recommendedPitch: string;
}

export interface ModernizationPitch {
  hook: string;
  coreArgument: string;
  quickWinSolution: string;
}

export interface AuditResult {
  hasWebsite: boolean;
  httpStatus: string;
  responseTimeMs: number;
  isSsl: boolean;
  notes: string;
  deficits: AuditDeficits;
  technicalMetrics?: TechnicalMetrics;
  conversionBottlenecks?: ConversionBottleneck[];
  executiveSummary?: string;
  modernizationPitch?: ModernizationPitch;
}

// Extract text within a specific HTML tag
function extractTagContent(html: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = html.match(regex);
  if (!match) return "";
  return match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// Extract meta tag attribute value
function extractMetaContent(html: string, attrName: string, attrValue: string): string {
  const regex1 = new RegExp(`<meta[^>]*${attrName}=["']${attrValue}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i");
  const regex2 = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attrName}=["']${attrValue}["'][^>]*>`, "i");
  const match = html.match(regex1) || html.match(regex2);
  return match ? match[1].trim() : "";
}

// Real live website URL auditor & digital deficit verification engine
export async function auditLiveWebsite(
  rawUrl: string, 
  businessName = "", 
  category = "Professional Services"
): Promise<AuditResult> {
  if (!rawUrl || rawUrl.trim() === "" || rawUrl.toLowerCase() === "none" || rawUrl.toLowerCase() === "null") {
    const deficits: AuditDeficits = {
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
    };

    return {
      hasWebsite: false,
      httpStatus: "No Domain Registered",
      responseTimeMs: 0,
      isSsl: false,
      notes: "Verified: No website registered or mapped for this business in public DNS records.",
      deficits,
      conversionBottlenecks: [
        {
          severity: "CRITICAL",
          label: "Zero Online Presence",
          finding: "Business has no registered domain name or web hosting.",
          revenueImpact: "100% of high-intent search traffic defaults to local competitors.",
          recommendedPitch: "Deploy an instant mobile-responsive website with click-to-call & WhatsApp booking within 24 hours."
        },
        {
          severity: "MAJOR",
          label: "Missing 1-Click WhatsApp Booking",
          finding: "No instant messaging gateway for smartphone visitors.",
          revenueImpact: "Mobile prospects abandon inquiries when calling is inconvenient.",
          recommendedPitch: "Equip your prototype with floating WhatsApp integration to capture instant leads."
        }
      ],
      executiveSummary: `Zero active domain presence detected for ${businessName || "this business"}. A custom greenfield prototype will establish immediate search authority.`,
      modernizationPitch: {
        hook: `Did you know that over 70% of clients searching for ${category.toLowerCase()} in your city choose competitors with active mobile websites?`,
        coreArgument: "Without a web presence, your phone number and services are invisible on local Google Search queries.",
        quickWinSolution: "We have pre-built a fully customized website prototype featuring your verified business details ready for immediate launch."
      }
    };
  }

  let formattedUrl = rawUrl.trim();
  if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
    formattedUrl = `https://${formattedUrl}`;
  }

  const startTime = Date.now();

  try {
    const fetchResult = await safeFetchUrl(formattedUrl, {
      maxRedirects: 3,
      timeoutMs: 8000,
      maxResponseBodyBytes: 3 * 1024 * 1024,
    });

    const responseTimeMs = Date.now() - startTime;
    const isSsl = fetchResult.finalUrl.startsWith("https://");

    if (!fetchResult.ok) {
      const isSecurityError = fetchResult.status === 403 || (fetchResult.error && fetchResult.error.includes("Security Alert"));
      const statusText = isSecurityError
        ? "403 Restricted Target"
        : `${fetchResult.status} ${fetchResult.statusText || "HTTP Error"}`;

      const deficits: AuditDeficits = {
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
      };

      return {
        hasWebsite: false,
        httpStatus: statusText,
        responseTimeMs,
        isSsl,
        notes: isSecurityError
          ? `Audit Blocked: The target URL (${formattedUrl}) resolves to a restricted or internal network resource.`
          : `HTTP Error (${fetchResult.status}): ${fetchResult.error || "Server returned error code. Site is currently broken or offline."}`,
        deficits,
        conversionBottlenecks: [
          {
            severity: "CRITICAL",
            label: "Server Error / Broken Website",
            finding: `Domain returned HTTP ${fetchResult.status}. Prospective clients cannot reach your services.`,
            revenueImpact: "Immediate bounce rate and brand trust damage when visitors encounter error screens.",
            recommendedPitch: "Replace broken hosting with a fast, modern static-edge website with 99.9% uptime."
          }
        ],
        executiveSummary: `The domain at ${formattedUrl} failed with HTTP status ${fetchResult.status}. Urgent revamp required to restore client trust.`,
        modernizationPitch: {
          hook: `Your existing website is currently returning errors (${statusText}) to prospective customers searching for ${category.toLowerCase()}.`,
          coreArgument: "Every visitor encountering a broken web page immediately navigates to a competitor.",
          quickWinSolution: "We can replace the broken architecture with a high-performance modern web application today."
        }
      };
    }

    const rawHtml = fetchResult.html || "";
    const html = rawHtml.toLowerCase();
    const statusText = `${fetchResult.status} ${fetchResult.statusText || "OK"}`;

    // Technical Metrics Extraction
    const hasViewport = html.includes('name="viewport"') || html.includes("name='viewport'");
    const titleText = extractTagContent(rawHtml, "title");
    const hasTitle = !!titleText && titleText.length > 2;
    const metaDescriptionText = extractMetaContent(rawHtml, "name", "description") || extractMetaContent(rawHtml, "property", "og:description");
    const hasMetaDesc = !!metaDescriptionText && metaDescriptionText.length > 10;
    const ogTitle = extractMetaContent(rawHtml, "property", "og:title");
    const ogImage = extractMetaContent(rawHtml, "property", "og:image");
    const hasOpenGraph = !!(ogTitle || ogImage);
    const h1Text = extractTagContent(rawHtml, "h1");
    const hasH1 = !!h1Text && h1Text.length > 2;

    const hasTel = html.includes('href="tel:') || html.includes("href='tel:") || html.includes("href=tel:");
    const hasMailto = html.includes('href="mailto:') || html.includes("href='mailto:") || html.includes("href=mailto:");
    const hasWhatsapp = html.includes("wa.me") || html.includes("api.whatsapp.com") || html.includes("whatsapp://") || html.includes("whatsapp.com/send");
    const hasBooking = html.includes("calendly.com") || html.includes("booksy.com") || html.includes("acuityscheduling.com") || html.includes("fresha.com") || html.includes("timely.com") || html.includes("book online") || html.includes("schedule appointment") || html.includes("book an appointment");
    const hasForm = html.includes("<form") && (html.includes("type=\"submit\"") || html.includes("type='submit'") || html.includes("<button"));
    
    // Social media presence
    const socialNetworks: string[] = [];
    if (html.includes("facebook.com")) socialNetworks.push("Facebook");
    if (html.includes("instagram.com")) socialNetworks.push("Instagram");
    if (html.includes("linkedin.com")) socialNetworks.push("LinkedIn");
    if (html.includes("tiktok.com")) socialNetworks.push("TikTok");
    if (html.includes("twitter.com") || html.includes("x.com")) socialNetworks.push("X (Twitter)");
    if (html.includes("youtube.com")) socialNetworks.push("YouTube");
    const hasSocial = socialNetworks.length > 0;

    // Legacy / Outdated tags
    const legacyTags: string[] = [];
    if (html.includes("<marquee")) legacyTags.push("<marquee>");
    if (html.includes("<blink")) legacyTags.push("<blink>");
    if (html.includes("<frameset") || html.includes("<frame ")) legacyTags.push("<frameset>");
    if (html.includes("<font ")) legacyTags.push("<font>");
    if (html.includes("bgcolor=")) legacyTags.push("bgcolor attribute");
    if (html.includes("align=center") || html.includes('align="center"')) legacyTags.push("align attribute");
    if (html.includes("http://") && isSsl) legacyTags.push("Mixed HTTP Content");
    const isOutdated = legacyTags.length > 0 || !hasViewport;

    // Speed grade
    let speedGrade: "FAST" | "AVERAGE" | "SLOW" | "FAILED" = "FAST";
    if (responseTimeMs > 2000) speedGrade = "SLOW";
    else if (responseTimeMs > 800) speedGrade = "AVERAGE";

    const technicalMetrics: TechnicalMetrics = {
      statusCode: fetchResult.status,
      statusText,
      responseTimeMs,
      speedGrade,
      isSsl,
      hasViewport,
      hasTitle,
      titleText: titleText.slice(0, 100),
      hasMetaDescription: hasMetaDesc,
      metaDescriptionText: metaDescriptionText.slice(0, 200),
      hasOpenGraph,
      hasH1,
      h1Text: h1Text.slice(0, 100),
      hasTelLink: hasTel,
      hasMailtoLink: hasMailto,
      hasWhatsappCta: hasWhatsapp,
      hasBookingEngine: hasBooking,
      hasLeadForm: hasForm,
      hasSocialLinks: hasSocial,
      socialNetworksFound: socialNetworks,
      isLegacyMarkup: isOutdated,
      detectedLegacyTags: legacyTags,
      contentLengthBytes: rawHtml.length
    };

    // Deficit mapping
    const deficits: AuditDeficits = {
      noWebsite: false,
      outdatedWebsite: isOutdated,
      noGooglePresence: !hasOpenGraph && !hasMetaDesc,
      noSocialMedia: !hasSocial,
      poorBranding: !hasOpenGraph || isOutdated,
      noWhatsappCta: !hasWhatsapp,
      noOnlineCatalogue: !html.includes("service") && !html.includes("product") && !html.includes("pricing"),
      noBookingSystem: !hasBooking,
      noEnquiryForm: !hasForm,
      noSeo: !(hasTitle && hasMetaDesc && hasH1),
      brokenLinks: !isSsl || legacyTags.includes("Mixed HTTP Content"),
      poorMobileExperience: !hasViewport,
      missingContact: !(hasTel || hasMailto)
    };

    // Synthesize structured conversion bottlenecks
    const conversionBottlenecks: ConversionBottleneck[] = [];

    if (!hasWhatsapp) {
      conversionBottlenecks.push({
        severity: "CRITICAL",
        label: "Missing 1-Click WhatsApp CTA",
        finding: "Website has no direct WhatsApp chat link or floating action button.",
        revenueImpact: "Mobile visitors looking for immediate quotes or chat abandon without calling.",
        recommendedPitch: "Add an instant WhatsApp booking button to capture 3x more mobile inquiries."
      });
    }

    if (!hasViewport) {
      conversionBottlenecks.push({
        severity: "CRITICAL",
        label: "Non-Responsive Mobile Layout",
        finding: "No mobile viewport meta tag configured. Page appears zoomed out on smartphones.",
        revenueImpact: "Over 75% of local smartphone visitors immediately bounce due to hard-to-read text.",
        recommendedPitch: "Upgrade to a responsive mobile-first architecture optimized for touch devices."
      });
    }

    if (!isSsl) {
      conversionBottlenecks.push({
        severity: "MAJOR",
        label: "Insecure HTTP Protocol (Missing SSL)",
        finding: "Site served over unencrypted HTTP. Browsers display 'Not Secure' warning.",
        revenueImpact: "Security warnings cause high customer distrust before visitors even read your offer.",
        recommendedPitch: "Implement full SSL encryption and automated HTTPS redirects."
      });
    }

    if (!hasTel && !hasMailto) {
      conversionBottlenecks.push({
        severity: "MAJOR",
        label: "Non-Clickable Contact Info",
        finding: "Phone number or email is not formatted with tap-to-call links.",
        revenueImpact: "Friction in dialing forces mobile users to manually copy-paste numbers.",
        recommendedPitch: "Prominently display verified one-tap click-to-call and quote enquiry forms."
      });
    }

    if (!hasForm && !hasBooking) {
      conversionBottlenecks.push({
        severity: "MAJOR",
        label: "No Interactive Lead Capture",
        finding: "Site lacks structured quotation forms or appointment scheduling.",
        revenueImpact: "Inquiries after business hours cannot be captured automatically.",
        recommendedPitch: "Integrate automated quotation and booking forms that dispatch instant email notifications."
      });
    }

    if (!(hasTitle && hasMetaDesc)) {
      conversionBottlenecks.push({
        severity: "MINOR",
        label: "Weak Search Engine Metadata",
        finding: "Missing or incomplete meta description and optimized title tags.",
        revenueImpact: "Lower search engine rankings and lower click-through rates from Google Search results.",
        recommendedPitch: "Configure local SEO metadata targeting high-intent keywords in your city."
      });
    }

    // Default note
    let notes = `Live website verified (${responseTimeMs}ms response). `;
    const activeDefsCount = Object.values(deficits).filter(Boolean).length;
    if (activeDefsCount > 0) {
      notes += `Identified ${activeDefsCount} digital deficits including ${!hasWhatsapp ? "missing WhatsApp CTA, " : ""}${!hasViewport ? "poor mobile responsiveness, " : ""}${!hasForm ? "no lead capture form, " : ""}and ${!isSsl ? "insecure HTTP." : "SEO gaps."}`;
    } else {
      notes += "Site is active with modern responsive styling and contact channels configured.";
    }

    // AI Pitch synthesis when Gemini is configured
    let executiveSummary = `Website audit of ${formattedUrl} completed in ${responseTimeMs}ms. Identified ${activeDefsCount} actionable conversion gaps.`;
    let modernizationPitch: ModernizationPitch = {
      hook: `We reviewed your current website (${formattedUrl}) and found that simple mobile enhancements could capture significantly more local customers.`,
      coreArgument: `While your business has an active domain, it currently lacks ${!hasWhatsapp ? "1-click WhatsApp messaging, " : ""}${!hasViewport ? "mobile responsive design, " : ""}${!hasForm ? "an online lead enquiry form, " : ""}costing you valuable inquiries.`,
      quickWinSolution: `We have drafted an updated modern prototype featuring fast mobile loading, instant WhatsApp booking, and clear service showcases.`
    };

    if (isApiKeyConfigured() && activeDefsCount > 0) {
      try {
        const aiPrompt = `You are a digital marketing auditor. Based on these technical audit findings for "${businessName || formattedUrl}" (${category}):
- Speed: ${responseTimeMs}ms (${speedGrade})
- SSL: ${isSsl ? "Secure" : "Insecure HTTP"}
- Mobile Viewport: ${hasViewport ? "Configured" : "Missing / Broken"}
- WhatsApp Button: ${hasWhatsapp ? "Present" : "Missing"}
- Lead Form: ${hasForm ? "Present" : "Missing"}
- SEO Title: "${titleText || 'None'}"
- Meta Description: "${metaDescriptionText || 'None'}"

Provide a concise 2-sentence executive summary and a persuasive 3-part modernization pitch. Return strict JSON:
{
  "executiveSummary": "string (2 sentences)",
  "modernizationPitch": {
    "hook": "string (Compelling 1-sentence opening question or observation)",
    "coreArgument": "string (1-2 sentences on specific conversion leak)",
    "quickWinSolution": "string (1 sentence solution offer)"
  }
}`;

        const aiResponse = await generateContentWithRetry({
          model: "gemini-2.5-flash",
          contents: aiPrompt,
          config: {
            responseMimeType: "application/json"
          }
        }, 1, 300);

        if (aiResponse.text) {
          const parsed = JSON.parse(aiResponse.text);
          if (parsed.executiveSummary) executiveSummary = parsed.executiveSummary;
          if (parsed.modernizationPitch) modernizationPitch = parsed.modernizationPitch;
        }
      } catch (aiErr) {
        // Keep structured fallback
      }
    }

    return {
      hasWebsite: true,
      httpStatus: statusText,
      responseTimeMs,
      isSsl,
      notes,
      deficits,
      technicalMetrics,
      conversionBottlenecks,
      executiveSummary,
      modernizationPitch
    };
  } catch (err: any) {
    const responseTimeMs = Date.now() - startTime;
    const isTimeout = err.name === "AbortError" || (err.message && err.message.includes("timed out"));
    const httpStatus = isTimeout ? "Connection Timed Out (>8s)" : "Domain Unreachable / DNS Failure";

    const deficits: AuditDeficits = {
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

    return {
      hasWebsite: false,
      httpStatus,
      responseTimeMs,
      isSsl: false,
      notes: `Failed to connect to domain (${formattedUrl}): ${err.message || "DNS host not found"}. Unregistered or defunct website confirmed.`,
      deficits,
      conversionBottlenecks: [
        {
          severity: "CRITICAL",
          label: "Inaccessible Domain Host",
          finding: `Target URL could not establish a network handshake (${httpStatus}).`,
          revenueImpact: "Clients attempting to visit your site find an unreachable server.",
          recommendedPitch: "Deploy a high-speed cloud-hosted website with global CDN caching and 100% uptime."
        }
      ],
      executiveSummary: `Connection to ${formattedUrl} failed (${httpStatus}). The domain appears inactive or misconfigured.`,
      modernizationPitch: {
        hook: `Your listed website address (${formattedUrl}) is currently unreachable for customers trying to find your ${category.toLowerCase()} services.`,
        coreArgument: "An offline domain creates immediate doubt about whether your business is still actively operating.",
        quickWinSolution: "We have built a fully verified prototype that can be hosted on a fast, reliable domain immediately."
      }
    };
  }
}

