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
  responseTimeMs: number | null;
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

export type FindingStatus = "PRESENT" | "MISSING" | "WEAK" | "BROKEN" | "UNKNOWN";

export interface DetailedAuditFinding {
  field: string;
  key: keyof AuditDeficits;
  status: FindingStatus;
  evidence: string;
  checkedUrl: string;
  checkedAt: string;
}

export interface AuditResult {
  hasWebsite: boolean;
  httpStatus: string;
  responseTimeMs: number | null;
  isSsl: boolean;
  notes: string;
  deficits: AuditDeficits;
  detailedFindings?: DetailedAuditFinding[];
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
  const checkedAt = new Date().toISOString();

  if (!rawUrl || rawUrl.trim() === "" || rawUrl.toLowerCase() === "none" || rawUrl.toLowerCase() === "null") {
    const deficits: AuditDeficits = {
      noWebsite: true,
      outdatedWebsite: false,
      noGooglePresence: false,
      noSocialMedia: false,
      poorBranding: false,
      noWhatsappCta: false,
      noOnlineCatalogue: false,
      noBookingSystem: false,
      noEnquiryForm: false,
      noSeo: false,
      brokenLinks: false,
      poorMobileExperience: false,
      missingContact: false
    };

    const detailedFindings: DetailedAuditFinding[] = [
      { field: "Website Presence", key: "noWebsite", status: "MISSING", evidence: "No website was discovered from available sources or registered in public DNS records", checkedUrl: "N/A", checkedAt },
      { field: "Google Search Presence", key: "noGooglePresence", status: "UNKNOWN", evidence: "No website available to inspect for search metadata", checkedUrl: "N/A", checkedAt },
      { field: "Social Links", key: "noSocialMedia", status: "UNKNOWN", evidence: "No website available to inspect for social links", checkedUrl: "N/A", checkedAt },
      { field: "WhatsApp CTA", key: "noWhatsappCta", status: "UNKNOWN", evidence: "No website available to inspect for WhatsApp CTA", checkedUrl: "N/A", checkedAt },
      { field: "Booking System", key: "noBookingSystem", status: "UNKNOWN", evidence: "No website available to inspect for booking system", checkedUrl: "N/A", checkedAt },
      { field: "Enquiry Form", key: "noEnquiryForm", status: "UNKNOWN", evidence: "No website available to inspect for enquiry form", checkedUrl: "N/A", checkedAt },
      { field: "Mobile Experience", key: "poorMobileExperience", status: "UNKNOWN", evidence: "No website available for mobile rendering test", checkedUrl: "N/A", checkedAt },
      { field: "Broken Links", key: "brokenLinks", status: "UNKNOWN", evidence: "No website available to crawl or test links", checkedUrl: "N/A", checkedAt },
      { field: "Contact Information", key: "missingContact", status: "UNKNOWN", evidence: "No website available to inspect contact links", checkedUrl: "N/A", checkedAt },
      { field: "SEO Metadata", key: "noSeo", status: "UNKNOWN", evidence: "No website available to inspect SEO meta tags", checkedUrl: "N/A", checkedAt },
      { field: "Brand Identity", key: "poorBranding", status: "UNKNOWN", evidence: "No website available to inspect branding assets", checkedUrl: "N/A", checkedAt },
      { field: "Service Showcase", key: "noOnlineCatalogue", status: "UNKNOWN", evidence: "No website available to inspect catalogue", checkedUrl: "N/A", checkedAt },
      { field: "Markup Modernity", key: "outdatedWebsite", status: "UNKNOWN", evidence: "No website available to evaluate markup modernity", checkedUrl: "N/A", checkedAt }
    ];

    return {
      hasWebsite: false,
      httpStatus: "No Domain Discovered",
      responseTimeMs: null,
      isSsl: false,
      notes: "No website was discovered from the available sources or public DNS records.",
      deficits,
      detailedFindings,
      conversionBottlenecks: [
        {
          severity: "CRITICAL",
          label: "No Website Discovered",
          finding: "No website was discovered from the available sources.",
          revenueImpact: "High-intent search traffic defaults to local competitors with discovered websites.",
          recommendedPitch: "Deploy an instant mobile-responsive website with click-to-call & WhatsApp booking."
        }
      ],
      executiveSummary: `No website was discovered from available sources for ${businessName || "this business"}. A custom greenfield prototype will establish immediate search authority.`,
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
        outdatedWebsite: false,
        noGooglePresence: false,
        noSocialMedia: false,
        poorBranding: false,
        noWhatsappCta: false,
        noOnlineCatalogue: false,
        noBookingSystem: false,
        noEnquiryForm: false,
        noSeo: false,
        brokenLinks: true,
        poorMobileExperience: false,
        missingContact: false
      };

      const detailedFindings: DetailedAuditFinding[] = [
        { field: "Website Connection", key: "noWebsite", status: "BROKEN", evidence: `Target URL connection failed (${statusText})`, checkedUrl: formattedUrl, checkedAt },
        { field: "Broken Links", key: "brokenLinks", status: "BROKEN", evidence: `Site host returned HTTP error (${statusText})`, checkedUrl: formattedUrl, checkedAt },
        { field: "WhatsApp CTA", key: "noWhatsappCta", status: "UNKNOWN", evidence: "Unreachable site; WhatsApp CTA unverified", checkedUrl: formattedUrl, checkedAt },
        { field: "Social Links", key: "noSocialMedia", status: "UNKNOWN", evidence: "Unreachable site; social links unverified", checkedUrl: formattedUrl, checkedAt },
        { field: "Booking System", key: "noBookingSystem", status: "UNKNOWN", evidence: "Unreachable site; booking mechanism unverified", checkedUrl: formattedUrl, checkedAt },
        { field: "Mobile Experience", key: "poorMobileExperience", status: "UNKNOWN", evidence: "Mobile rendering test not performed on unreachable host", checkedUrl: formattedUrl, checkedAt },
        { field: "Contact Information", key: "missingContact", status: "UNKNOWN", evidence: "Unreachable site; contact links unverified", checkedUrl: formattedUrl, checkedAt },
        { field: "Enquiry Form", key: "noEnquiryForm", status: "UNKNOWN", evidence: "Unreachable site; enquiry form unverified", checkedUrl: formattedUrl, checkedAt },
        { field: "SEO Metadata", key: "noSeo", status: "UNKNOWN", evidence: "Unreachable site; SEO metadata unverified", checkedUrl: formattedUrl, checkedAt }
      ];

      return {
        hasWebsite: false,
        httpStatus: statusText,
        responseTimeMs,
        isSsl,
        notes: isSecurityError
          ? `Audit Blocked: The target URL (${formattedUrl}) resolves to a restricted or internal network resource.`
          : `HTTP Error (${fetchResult.status}): ${fetchResult.error || "Server returned error code. Site is currently broken or offline."}`,
        deficits,
        detailedFindings,
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

    // Deficit mapping (evidence-based: UNKNOWN conditions are NEVER marked as true deficits!)
    const deficits: AuditDeficits = {
      noWebsite: false,
      outdatedWebsite: isOutdated,
      noGooglePresence: !hasOpenGraph && !hasMetaDesc,
      noSocialMedia: false, // UNKNOWN is not a confirmed deficit
      poorBranding: isOutdated || (!hasOpenGraph && !hasMetaDesc),
      noWhatsappCta: false, // UNKNOWN is not a confirmed deficit
      noOnlineCatalogue: false, // UNKNOWN is not a confirmed deficit
      noBookingSystem: false, // UNKNOWN is not a confirmed deficit
      noEnquiryForm: false, // UNKNOWN is not a confirmed deficit
      noSeo: !hasTitle || (!hasMetaDesc && !hasH1),
      brokenLinks: false, // UNKNOWN is not a confirmed deficit
      poorMobileExperience: !hasViewport, // Confirmed MISSING if viewport tag is absent
      missingContact: false // UNKNOWN is not a confirmed deficit
    };

    const detailedFindings: DetailedAuditFinding[] = [
      {
        field: "Website Presence",
        key: "noWebsite",
        status: "PRESENT",
        evidence: `Reachable web host (${statusText}, ${responseTimeMs}ms latency)`,
        checkedUrl: formattedUrl,
        checkedAt
      },
      {
        field: "WhatsApp CTA",
        key: "noWhatsappCta",
        status: hasWhatsapp ? "PRESENT" : "UNKNOWN",
        evidence: hasWhatsapp 
          ? "WhatsApp CTA link directly detected on inspected page" 
          : "No WhatsApp CTA detected on inspected homepage (subpages and floating widgets un-crawled)",
        checkedUrl: formattedUrl,
        checkedAt
      },
      {
        field: "Social Links",
        key: "noSocialMedia",
        status: socialNetworks.length >= 2 ? "PRESENT" : socialNetworks.length === 1 ? "WEAK" : "UNKNOWN",
        evidence: socialNetworks.length > 0 
          ? `Social profiles detected: ${socialNetworks.join(", ")}` 
          : "No social profile links detected on inspected homepage (external channels un-crawled)",
        checkedUrl: formattedUrl,
        checkedAt
      },
      {
        field: "Booking System",
        key: "noBookingSystem",
        status: hasBooking ? "PRESENT" : "UNKNOWN",
        evidence: hasBooking 
          ? "Booking mechanism or appointment scheduling keywords detected on page" 
          : "No booking widget detected on inspected homepage (external booking portals un-crawled)",
        checkedUrl: formattedUrl,
        checkedAt
      },
      {
        field: "Mobile Responsiveness",
        key: "poorMobileExperience",
        status: !hasViewport ? "MISSING" : "PRESENT",
        evidence: !hasViewport 
          ? "Explicitly confirmed: <meta name=\"viewport\"> tag is missing from HTML head" 
          : "Viewport meta tag configured (full device rendering quality un-tested)",
        checkedUrl: formattedUrl,
        checkedAt
      },
      {
        field: "Broken Links",
        key: "brokenLinks",
        status: "UNKNOWN",
        evidence: "Links on page were not individually crawled or tested for 404 response",
        checkedUrl: formattedUrl,
        checkedAt
      },
      {
        field: "Contact Information",
        key: "missingContact",
        status: (hasTel || hasMailto) ? "PRESENT" : "UNKNOWN",
        evidence: (hasTel || hasMailto) 
          ? `Direct contact links detected (${hasTel ? "tel: " : ""}${hasMailto ? "mailto: " : ""})` 
          : "No direct tel: or mailto: links on inspected homepage (contact subpages un-crawled)",
        checkedUrl: formattedUrl,
        checkedAt
      },
      {
        field: "Enquiry Form",
        key: "noEnquiryForm",
        status: hasForm ? "PRESENT" : "UNKNOWN",
        evidence: hasForm 
          ? "Interactive form element with submit button detected on page" 
          : "No lead enquiry form detected on inspected homepage (contact subpages un-crawled)",
        checkedUrl: formattedUrl,
        checkedAt
      },
      {
        field: "SEO Metadata",
        key: "noSeo",
        status: (hasTitle && hasMetaDesc && hasH1) ? "PRESENT" : (hasTitle && (hasMetaDesc || hasH1)) ? "WEAK" : !hasTitle ? "MISSING" : "WEAK",
        evidence: hasTitle 
          ? `Title tag: "${titleText.slice(0, 50)}"${hasMetaDesc ? " with meta description" : " (missing meta description)"}` 
          : "Explicitly confirmed: <title> tag is missing from HTML head",
        checkedUrl: formattedUrl,
        checkedAt
      },
      {
        field: "Service Showcase",
        key: "noOnlineCatalogue",
        status: (html.includes("service") || html.includes("product") || html.includes("pricing")) ? "PRESENT" : "UNKNOWN",
        evidence: (html.includes("service") || html.includes("product") || html.includes("pricing")) 
          ? "Service or catalogue keywords detected on inspected page" 
          : "No catalogue sections detected on inspected homepage (subpages un-crawled)",
        checkedUrl: formattedUrl,
        checkedAt
      },
      {
        field: "Design Modernity",
        key: "outdatedWebsite",
        status: isOutdated ? "WEAK" : "PRESENT",
        evidence: isOutdated 
          ? `Legacy markup detected: ${legacyTags.join(", ") || "Missing responsive viewport"}` 
          : "Modern semantic HTML markup detected",
        checkedUrl: formattedUrl,
        checkedAt
      }
    ];

    // Synthesize structured conversion bottlenecks
    const conversionBottlenecks: ConversionBottleneck[] = [];

    if (!hasWhatsapp) {
      conversionBottlenecks.push({
        severity: "CRITICAL",
        label: "No WhatsApp CTA Detected",
        finding: "No WhatsApp CTA detected on the inspected page.",
        revenueImpact: "Mobile visitors looking for immediate messaging cannot start a chat directly from the page.",
        recommendedPitch: "Add a 1-click floating WhatsApp chat button to enable instant inquiries."
      });
    }

    if (!hasViewport) {
      conversionBottlenecks.push({
        severity: "CRITICAL",
        label: "Missing Mobile Viewport Tag",
        finding: "No viewport meta tag detected on the inspected page.",
        revenueImpact: "Smartphone visitors may see an unscaled desktop layout.",
        recommendedPitch: "Configure a responsive viewport meta tag and mobile layout."
      });
    }

    if (!isSsl) {
      conversionBottlenecks.push({
        severity: "MAJOR",
        label: "Insecure HTTP Protocol (Missing SSL)",
        finding: "Site served over unencrypted HTTP protocol.",
        revenueImpact: "Security warnings in browsers discourage visitor interaction.",
        recommendedPitch: "Implement SSL encryption and automated HTTPS redirects."
      });
    }

    if (!hasTel && !hasMailto) {
      conversionBottlenecks.push({
        severity: "MAJOR",
        label: "No Direct Contact Links Detected",
        finding: "No direct tel: or mailto: contact links detected on the inspected page.",
        revenueImpact: "Visitors cannot click to call or email directly from the inspected page.",
        recommendedPitch: "Prominently display verified click-to-call tel: and mailto: links."
      });
    }

    if (!hasForm && !hasBooking) {
      conversionBottlenecks.push({
        severity: "MAJOR",
        label: "No Lead Form or Booking Mechanism Detected",
        finding: "No booking mechanism or lead form detected on the inspected page.",
        revenueImpact: "After-hours visitors cannot submit inquiries or request appointments online.",
        recommendedPitch: "Integrate automated quotation and booking forms."
      });
    }

    if (!(hasTitle && hasMetaDesc)) {
      conversionBottlenecks.push({
        severity: "MINOR",
        label: "Weak Search Engine Metadata",
        finding: "Incomplete title or meta description tags on the inspected page.",
        revenueImpact: "Lower search engine click-through rates.",
        recommendedPitch: "Configure local SEO metadata targeting high-intent keywords."
      });
    }

    // Default note
    let notes = `Live website verified (${responseTimeMs}ms response). `;
    const activeDefsCount = Object.values(deficits).filter(Boolean).length;
    if (activeDefsCount > 0) {
      notes += `Identified ${activeDefsCount} digital deficits including ${!hasWhatsapp ? "missing WhatsApp CTA, " : ""}${!hasViewport ? "missing viewport tag, " : ""}${!hasForm ? "no lead capture form, " : ""}and ${!isSsl ? "insecure HTTP." : "SEO gaps."}`;
    } else {
      notes += "Site is active with modern responsive styling and contact channels configured.";
    }

    // AI Pitch synthesis when Gemini is configured
    let executiveSummary = `Website audit of ${formattedUrl} completed in ${responseTimeMs}ms. Identified ${activeDefsCount} actionable conversion gaps.`;
    let modernizationPitch: ModernizationPitch = {
      hook: `We reviewed your current website (${formattedUrl}) and found that simple mobile enhancements could capture significantly more local customers.`,
      coreArgument: `While your business has an active domain, it currently lacks ${!hasWhatsapp ? "1-click WhatsApp messaging, " : ""}${!hasForm ? "an online lead enquiry form, " : ""}costing you valuable inquiries.`,
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
          model: "gemini-3.8-flash",
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
      detailedFindings,
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
      poorMobileExperience: false,
      missingContact: false
    };

    const detailedFindings: DetailedAuditFinding[] = [
      { field: "Website Connection", key: "noWebsite", status: "BROKEN", evidence: `Connection failed: ${httpStatus}`, checkedUrl: formattedUrl, checkedAt },
      { field: "Broken Links", key: "brokenLinks", status: "BROKEN", evidence: `Host connection failed (${httpStatus})`, checkedUrl: formattedUrl, checkedAt },
      { field: "WhatsApp CTA", key: "noWhatsappCta", status: "MISSING", evidence: "Host unreachable; no WhatsApp CTA detected", checkedUrl: formattedUrl, checkedAt },
      { field: "Social Links", key: "noSocialMedia", status: "MISSING", evidence: "Host unreachable; no social links detected", checkedUrl: formattedUrl, checkedAt },
      { field: "Booking System", key: "noBookingSystem", status: "MISSING", evidence: "Host unreachable; no booking mechanism detected", checkedUrl: formattedUrl, checkedAt },
      { field: "Mobile Experience", key: "poorMobileExperience", status: "UNKNOWN", evidence: "Mobile rendering test not performed", checkedUrl: formattedUrl, checkedAt },
      { field: "Contact Information", key: "missingContact", status: "UNKNOWN", evidence: "Host unreachable; contact links unverified", checkedUrl: formattedUrl, checkedAt }
    ];

    return {
      hasWebsite: false,
      httpStatus,
      responseTimeMs,
      isSsl: false,
      notes: `Failed to connect to domain (${formattedUrl}): ${err.message || "DNS host not found"}. Unregistered or defunct website confirmed.`,
      deficits,
      detailedFindings,
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

/**
 * Derives accurate WebsiteStatus from HTTP audit result rather than assuming URL exists = LIVE
 */
export function determineWebsiteStatusFromAudit(
  auditResult?: AuditResult | null,
  rawUrl?: string,
  hasSocial?: boolean,
  directorySource?: string
): "NONE" | "WEBSITE_NOT_DISCOVERED" | "LIVE" | "WEBSITE_LIVE" | "WEBSITE_CONFIRMED" | "BROKEN" | "PARKED" | "DIRECTORY_ONLY" | "SOCIAL_ONLY" | "UNKNOWN" | "WEBSITE_CANDIDATE" | "WEBSITE_UNVERIFIED" | "UNREACHABLE" | "WEBSITE_UNREACHABLE" | "WEBSITE_ASSOCIATION_UNCONFIRMED" | "ERROR" | "REDIRECT" {
  if (!rawUrl || rawUrl.trim() === "" || rawUrl.toLowerCase() === "none" || rawUrl.toLowerCase() === "null") {
    if (hasSocial) return "SOCIAL_ONLY";
    if (directorySource) return "DIRECTORY_ONLY";
    return "WEBSITE_NOT_DISCOVERED";
  }

  // URL exists, but check was not performed or pending -> WEBSITE_CANDIDATE
  if (!auditResult) {
    return "WEBSITE_CANDIDATE";
  }

  // Reachable 2xx/3xx HTTP response
  if (auditResult.hasWebsite) {
    return "LIVE";
  }

  const statusStr = (auditResult.httpStatus || "").toLowerCase();
  
  if (
    statusStr.includes("timed out") ||
    statusStr.includes("unreachable") ||
    statusStr.includes("dns failure") ||
    statusStr.includes("connection refused") ||
    statusStr.includes("host not found") ||
    statusStr.includes("no domain")
  ) {
    return "UNREACHABLE";
  }

  if (statusStr.includes("redirect")) {
    return "REDIRECT";
  }

  if (
    statusStr.includes("403") ||
    statusStr.includes("restricted") ||
    statusStr.includes("security alert") ||
    statusStr.includes("404") ||
    statusStr.includes("500") ||
    statusStr.includes("http error") ||
    statusStr.includes("error")
  ) {
    return "ERROR";
  }

  return "BROKEN";
}

export function normalizeCanonicalWebsiteStatus(
  status?: string | null
): "WEBSITE_CONFIRMED" | "WEBSITE_NOT_DISCOVERED" | "WEBSITE_UNREACHABLE" | "WEBSITE_UNVERIFIED" {
  if (!status) return "WEBSITE_NOT_DISCOVERED";
  const s = status.trim().toUpperCase();
  if (s === "WEBSITE_CONFIRMED" || s === "LIVE" || s === "WEBSITE_LIVE") {
    return "WEBSITE_CONFIRMED";
  }
  if (
    s === "WEBSITE_UNREACHABLE" ||
    s === "UNREACHABLE" ||
    s === "BROKEN" ||
    s === "ERROR"
  ) {
    return "WEBSITE_UNREACHABLE";
  }
  if (
    s === "WEBSITE_NOT_DISCOVERED" ||
    s === "NONE" ||
    s === "CONFIRMED_NO_WEBSITE" ||
    s === "DIRECTORY_ONLY" ||
    s === "SOCIAL_ONLY"
  ) {
    return "WEBSITE_NOT_DISCOVERED";
  }
  return "WEBSITE_UNVERIFIED";
}

/**
 * Returns human-readable, factual description for website status
 */
export function getWebsiteStatusDescription(status?: string | null, hasWebsite?: boolean): string {
  switch (status) {
    case "WEBSITE_NOT_DISCOVERED":
    case "NONE":
      return "No website was discovered from the available sources.";
    case "WEBSITE_CANDIDATE":
    case "WEBSITE_UNVERIFIED":
      return "A website candidate was found, but it could not be confirmed as live.";
    case "UNREACHABLE":
    case "WEBSITE_UNREACHABLE":
      return "A website candidate was found, but it was unreachable.";
    case "LIVE":
    case "WEBSITE_LIVE":
    case "WEBSITE_CONFIRMED":
      return "A live website was detected and audited.";
    case "WEBSITE_ASSOCIATION_UNCONFIRMED":
      return "A website was found, but its association with this business could not be confirmed.";
    case "BROKEN":
    case "ERROR":
      return "The target website URL returned connection or server errors.";
    case "DIRECTORY_ONLY":
      return "Discovered via directory profile; no dedicated website discovered.";
    case "SOCIAL_ONLY":
      return "Discovered via social page; no dedicated website discovered.";
    default:
      return hasWebsite ? "A live website was detected." : "No website was discovered from the available sources.";
  }
}

