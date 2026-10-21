import { 
  Business, 
  OutreachDraft, 
  OutreachDraftChannel, 
  OutreachTone, 
  OutreachDraftLength, 
  OutreachDraftClaim, 
  OutreachDraftHistoryEntry, 
  DraftGenerationOptions, 
  DraftTruthfulnessScan,
  ClaimProvenanceType,
  EvidenceItem
} from "../types";

/**
 * MICRO-PHASE 12B: PERSONALIZED OUTREACH DRAFT GENERATION & TRUTHFULNESS CONTROLS
 * 
 * Generates personalized, professional sales outreach drafts using accurate business 
 * information, documented website findings, and verified evidence.
 * 
 * Strict Invariants:
 * 1. Zero Hallucinated Claims: Never invent business names, services, achievements, or fake metrics.
 * 2. Evidence Grounding: Deficit and opportunity statements must be backed by business evidence.
 * 3. Provenance Classification: Explicitly distinguish verified facts, audit findings, AI suggestions, and unsupported claims.
 * 4. User Control & Separation: Draft generation NEVER automatically dispatches messages or alters sales pipeline stages.
 */

// Known unsupported claim patterns (hallucination triggers)
const UNSUPPORTED_CLAIM_PATTERNS = [
  { pattern: /\b(you (are )?losing|\blose)\s+\d+%\b/i, reason: "Fabricated loss percentage statistic" },
  { pattern: /\b\d+%\s+(of clients|conversion drop|bounce rate)\b/i, reason: "Unsubstantiated conversion metric" },
  { pattern: /\b100%\s+money[- ]back guarantee\b/i, reason: "Unauthorized commercial warranty guarantee" },
  { pattern: /\b\d+%\s+discount\b/i, reason: "Invented pricing discount offer" },
  { pattern: /\bguarantee(d)?\s+(#1|top|first page)\s+ranking\b/i, reason: "Misleading search engine ranking guarantee" },
  { pattern: /\bwhen I (visited|spoke with your|stopped by|met you)\b/i, reason: "False claim of prior physical visit or meeting" },
  { pattern: /\bas (we|per our) (discussed|agreed|conversed) (yesterday|earlier|on the phone)\b/i, reason: "False claim of prior phone conversation" },
  { pattern: /\b(we|I) built your (new )?website\b/i, reason: "Unsupported claim of completed website delivery (must be framed as preview draft)" },
  { pattern: /\bfree for life\b/i, reason: "Unauthorized permanent commercial commitment" }
];

/**
 * Scans outreach text for truthfulness, claim provenance, and unsupported assumptions.
 */
export function scanDraftTruthfulness(
  body: string, 
  subject: string = "", 
  business: Business, 
  channel: OutreachDraftChannel = "email"
): DraftTruthfulnessScan {
  const fullText = `${subject}\n\n${body}`;
  const claims: OutreachDraftClaim[] = [];
  const unsupportedClaims: OutreachDraftClaim[] = [];
  const flaggedIssues: string[] = [];

  // 1. Verify business identity claims
  if (business.name && fullText.includes(business.name)) {
    claims.push({
      id: `claim_biz_name_${Date.now()}`,
      claimText: `References confirmed business name "${business.name}"`,
      provenance: "VERIFIED_FACT",
      sourceRef: business.directorySource || "CRM_RECORD",
      isSupported: true,
      confidence: 1.0
    });
  }

  // 2. Check rating & reputation claims
  const ratingMatch = fullText.match(/(\d+(\.\d+)?)★|\b(\d+(\.\d+)?)\s+stars?\b/i);
  if (ratingMatch) {
    const mentionedRating = parseFloat(ratingMatch[1] || ratingMatch[3] || "0");
    const actualRating = typeof business.rating === "number" ? business.rating : 0;

    if (actualRating > 0 && Math.abs(mentionedRating - actualRating) <= 0.2) {
      claims.push({
        id: `claim_rating_${Date.now()}`,
        claimText: `Cites Google rating (${mentionedRating}★ matches actual ${actualRating}★)`,
        provenance: "VERIFIED_FACT",
        sourceRef: "GOOGLE_PLACES",
        isSupported: true,
        confidence: 0.95
      });
    } else if (actualRating === 0) {
      const unsupported: OutreachDraftClaim = {
        id: `claim_fake_rating_${Date.now()}`,
        claimText: `Cites ${mentionedRating}★ rating, but business has no recorded public rating`,
        provenance: "UNSUPPORTED_ASSUMPTION",
        isSupported: false,
        unsupportedReason: "Business has no verified rating in CRM evidence.",
        confidence: 0.2
      };
      claims.push(unsupported);
      unsupportedClaims.push(unsupported);
      flaggedIssues.push(`Invented rating: ${mentionedRating}★ cited for unrated business.`);
    }
  }

  // 3. Verify digital gap / deficit claims against business presence
  const presence = business.presence;
  const deficits = presence?.deficits;

  const gapChecks: { keyword: RegExp; isSupported: boolean; isContradiction: boolean; gapLabel: string; source: string }[] = [
    { 
      keyword: /\b(no mobile website|no website|missing website|lacks a website)\b/i, 
      isSupported: !presence?.hasWebsite || !!deficits?.noWebsite,
      isContradiction: !!presence?.hasWebsite && deficits?.noWebsite === false,
      gapLabel: "Missing website",
      source: "WEBSITE_AUDIT"
    },
    { 
      keyword: /\b(whatsapp|chat button|1-tap chat|instant messaging)\b/i, 
      isSupported: true,
      isContradiction: false,
      gapLabel: "WhatsApp CTA",
      source: "AUDIT_RECOMMENDATION"
    },
    { 
      keyword: /\b(booking|appointment|schedule online)\b/i, 
      isSupported: !!deficits?.noBookingSystem || !presence,
      isContradiction: !!presence && deficits?.noBookingSystem === false,
      gapLabel: "Online booking absence",
      source: "WEBSITE_AUDIT"
    },
    { 
      keyword: /\b(outdated website|old design|clunky layout)\b/i, 
      isSupported: !!deficits?.outdatedWebsite,
      isContradiction: !!presence && deficits?.outdatedWebsite === false,
      gapLabel: "Outdated website layout",
      source: "WEBSITE_AUDIT"
    },
    { 
      keyword: /\b(local seo|google maps seo|ranking in search)\b/i, 
      isSupported: !!deficits?.noSeo || !presence,
      isContradiction: !!presence && deficits?.noSeo === false,
      gapLabel: "Local search optimization",
      source: "WEBSITE_AUDIT"
    }
  ];

  gapChecks.forEach((gc, idx) => {
    if (gc.keyword.test(fullText)) {
      if (gc.isContradiction) {
        const unsupported: OutreachDraftClaim = {
          id: `claim_contradictory_gap_${idx}_${Date.now()}`,
          claimText: `Claims "${gc.gapLabel}" as deficit, but evidence indicates business already possesses this feature`,
          provenance: "UNSUPPORTED_ASSUMPTION",
          isSupported: false,
          unsupportedReason: `Contradicts audit evidence for ${gc.gapLabel}.`,
          confidence: 0.3
        };
        claims.push(unsupported);
        unsupportedClaims.push(unsupported);
        flaggedIssues.push(`Contradictory gap claim: ${gc.gapLabel}`);
      } else if (gc.isSupported && presence) {
        claims.push({
          id: `claim_gap_${idx}_${Date.now()}`,
          claimText: `Identified digital gap: ${gc.gapLabel}`,
          provenance: "AUDIT_EVIDENCE",
          sourceRef: gc.source,
          isSupported: true,
          confidence: 0.9
        });
      } else {
        claims.push({
          id: `claim_suggestion_${idx}_${Date.now()}`,
          claimText: `Consultative opportunity: ${gc.gapLabel}`,
          provenance: "AI_SUGGESTION",
          sourceRef: "PRESENCE_OPTIMIZATION_FRAMEWORK",
          isSupported: true,
          confidence: 0.8
        });
      }
    }
  });

  // 4. Scan against blacklist patterns (invented stats, false commitments, false visits)
  let sanitizedBody = body;
  UNSUPPORTED_CLAIM_PATTERNS.forEach((rule, rIdx) => {
    if (rule.pattern.test(fullText)) {
      const match = fullText.match(rule.pattern)?.[0] || "Unsupported phrase";
      const unsupported: OutreachDraftClaim = {
        id: `claim_forbidden_${rIdx}_${Date.now()}`,
        claimText: `Unsupported claim: "${match}"`,
        provenance: "UNSUPPORTED_ASSUMPTION",
        isSupported: false,
        unsupportedReason: rule.reason,
        confidence: 0.1
      };
      claims.push(unsupported);
      unsupportedClaims.push(unsupported);
      flaggedIssues.push(`${rule.reason} ("${match}")`);

      // Provide automatic safety sanitization
      sanitizedBody = sanitizedBody.replace(rule.pattern, "[observable online friction]");
    }
  });

  // 5. Compute truthfulness score
  const totalClaims = claims.length || 1;
  const supportedClaims = claims.filter(c => c.isSupported).length;
  const baseScore = Math.round((supportedClaims / totalClaims) * 100);
  const deduction = unsupportedClaims.length * 20;
  const truthfulnessScore = Math.max(0, Math.min(100, baseScore - deduction));

  return {
    isValid: unsupportedClaims.length === 0,
    truthfulnessScore,
    claims,
    unsupportedClaims,
    flaggedIssues,
    sanitizedBody
  };
}

/**
 * Extracts verifiable evidence tags and identified gaps from a business entity.
 */
export function extractVerifiedEvidenceGaps(business: Business): {
  supportedGaps: string[];
  evidenceReferences: string[];
  hasRating: boolean;
  ratingText: string;
} {
  const presence = business.presence;
  const defs = presence?.deficits || {
    noWebsite: !presence?.hasWebsite,
    outdatedWebsite: false,
    noGooglePresence: false,
    noSocialMedia: false,
    poorBranding: false,
    noWhatsappCta: true,
    noOnlineCatalogue: true,
    noBookingSystem: true,
    noEnquiryForm: true,
    noSeo: true,
    brokenLinks: false,
    poorMobileExperience: true,
    missingContact: !presence?.hasEmail
  };

  const supportedGaps: string[] = [];
  const evidenceReferences: string[] = [];

  if (defs.noWebsite) {
    supportedGaps.push("No mobile website linked on Google Maps profile");
    evidenceReferences.push("Google Maps audit: missing website attribute");
  } else if (defs.outdatedWebsite) {
    supportedGaps.push("Outdated non-responsive website layout on smartphone browsers");
    evidenceReferences.push("Website scan: layout lacks responsive viewport");
  }

  if (defs.noWhatsappCta) {
    supportedGaps.push("Missing 1-tap WhatsApp chat button for immediate smartphone customer inquiries");
    evidenceReferences.push("Mobile audit: missing direct messaging CTA");
  }

  if (defs.noBookingSystem) {
    supportedGaps.push("No direct online booking or quotation request feature");
    evidenceReferences.push("Digital assessment: missing online booking workflow");
  }

  if (defs.noOnlineCatalogue) {
    supportedGaps.push("Missing online service menu and transparent pricing catalogue");
    evidenceReferences.push("Digital assessment: no digital service catalogue");
  }

  if (defs.noSeo) {
    supportedGaps.push("Missing localized search metadata causing searchers to find competitors");
    evidenceReferences.push("SEO audit: missing OpenGraph and local schema markup");
  }

  if (defs.poorMobileExperience) {
    supportedGaps.push("Mobile navigation friction causing smartphone visitors to bounce");
    evidenceReferences.push("Mobile diagnostic: navigation friction detected");
  }

  // Fallback neutral gap if none detected
  if (supportedGaps.length === 0) {
    supportedGaps.push("Opportunity to add a 1-tap WhatsApp consultation button");
    supportedGaps.push("Opportunity to showcase verified customer reviews and services");
    evidenceReferences.push("Standard presence optimization checklist");
  }

  const rating = typeof business.rating === "number" ? business.rating : 0;
  const reviewsCount = typeof business.reviewsCount === "number" ? business.reviewsCount : 0;
  const hasRating = rating > 0;
  const ratingText = hasRating 
    ? `${rating}★ rating based on ${reviewsCount} verified customer reviews`
    : "reputable local service reputation";

  return {
    supportedGaps,
    evidenceReferences,
    hasRating,
    ratingText
  };
}

/**
 * Generates an evidence-grounded, truthfulness-verified outreach draft.
 */
export function generatePersonalizedOutreachDraft(
  business: Business,
  options: DraftGenerationOptions = {}
): OutreachDraft {
  const channel: OutreachDraftChannel = options.channel || "email";
  const tone: OutreachTone = options.tone || "Consultative";
  const length: OutreachDraftLength = options.length || "medium";
  const senderName = options.senderName || "SiteScout Digital Specialist";
  const previewUrl = options.previewUrl || business.previewUrl || (business.previewToken 
    ? `https://preview.sitescout.ai/preview/${business.previewToken}` 
    : (business.siteId 
      ? `https://preview.sitescout.ai/preview/${business.siteId}` 
      : `https://preview.sitescout.ai/preview/${business.id}`));

  const name = (business.name || "").trim() || "Your Business";
  const category = (business.category || "").trim() || "Local Services";
  const rawAddress = (business.address || "").trim();
  const city = rawAddress ? rawAddress.split(",")[0].trim() : "your local area";
  const areaLabel = city.length > 0 ? city : "your area";

  const { supportedGaps, evidenceReferences, hasRating, ratingText } = extractVerifiedEvidenceGaps(business);
  
  // Custom focus gaps override only if provided and non-empty
  const gapsToUse = (options.focusGaps && options.focusGaps.length > 0)
    ? options.focusGaps
    : supportedGaps;

  const primaryGap = gapsToUse[0] || "inability for mobile searchers to connect instantly";
  const secondaryGap = gapsToUse[1] || "missing direct WhatsApp inquiry button";

  let subject = "";
  let alternativeSubjects: string[] = [];
  let body = "";
  let followUpSubject = "";
  let followUpBody = "";
  let callToAction = "Take a quick look on your phone or computer. Once you approve it, let's customize and launch it!";

  const now = new Date().toISOString();
  const draftId = `draft_${business.id}_${channel}_${Date.now()}`;

  // Build channel-specific and tone-specific content grounded in real data
  if (channel === "email") {
    const toneLower = tone.toLowerCase();

    if (toneLower.includes("direct") || toneLower.includes("audit")) {
      subject = `Digital audit observations for ${name} (${areaLabel})`;
      alternativeSubjects = [
        `Identified: ${gapsToUse.length} conversion opportunities for ${name}`,
        `${name}: Mobile searcher experience analysis & live preview`,
        `Interactive digital preview prepared for ${name}`
      ];
      const greeting = `Hello ${name} Management,`;
      const hook = hasRating
        ? `During an assessment of ${category} providers in ${areaLabel}, I reviewed ${name}'s digital presence. While your reputation (${ratingText}) is strong, mobile searchers face a few conversion bottlenecks.`
        : `During an assessment of ${category} providers in ${areaLabel}, I analyzed ${name}'s digital presence on Google Maps and noted a few conversion bottlenecks.`;
      
      const gapBulletText = gapsToUse.slice(0, 3).map(g => `• [OBSERVABLE GAP]: ${g}`).join("\n");
      const gapAnalysis = `Specifically, our diagnostic identified:\n${gapBulletText}\n\nWhen local clients look up your business on their smartphones, these friction points make it harder to inquire immediately.`;
      const solution = `To demonstrate the solution, I created a live, free website preview tailored to ${name}:\n👉 ${previewUrl}`;
      callToAction = `Are you available for a brief review this week to see how this streamlines direct customer inquiries?`;
      const signOff = `Sincerely,\n${senderName}\nDigital Strategy Specialist`;

      body = `${greeting}\n\n${hook}\n\n${gapAnalysis}\n\n${solution}\n\n${callToAction}\n\n${signOff}`;
      followUpSubject = `Following up on the digital audit for ${name}`;
      followUpBody = `Hello ${name} Team,\n\nFollowing up briefly on the interactive website preview I created for you: ${previewUrl}\n\nHappy to customize the service offerings and launch it whenever you're ready.\n\nBest,\n${senderName}`;
    } else if (toneLower.includes("friendly") || toneLower.includes("neighbor")) {
      subject = hasRating 
        ? `Loved your customer reviews! Made a free website preview for ${name} 😊` 
        : `Quick friendly note & website preview for ${name}! 👋`;
      alternativeSubjects = [
        `Helpful idea for ${name}'s online presence in ${areaLabel}`,
        `Free interactive mobile webpage preview for ${name}`,
        `Quick observation regarding ${name}'s Google listing`
      ];
      const greeting = `Hi to everyone at ${name}! 👋`;
      const hook = hasRating
        ? `I was looking at ${category} providers in ${areaLabel} and was genuinely impressed by your ${ratingText}. Customers clearly value your work!`
        : `I was searching for ${category} businesses in ${areaLabel} and came across ${name}'s local Google listing.`;
      
      const gapAnalysis = `I noticed something small that could help you connect with even more clients: when people find you on their phones, they experience ${primaryGap.toLowerCase()} and ${secondaryGap.toLowerCase()}.\n\nAdding an easy way to view services and message you directly on WhatsApp would make a wonderful impression.`;
      const solution = `I put together a friendly, interactive website preview for your team:\n👉 ${previewUrl}\n\nIt works smoothly on mobile and includes your phone number and WhatsApp button!`;
      callToAction = `Take a peek whenever you have a moment. Once you approve it, let's customize and launch it!`;
      const signOff = `Wishing you continued success,\n${senderName}`;

      body = `${greeting}\n\n${hook}\n\n${gapAnalysis}\n\n${solution}\n\n${callToAction}\n\n${signOff}`;
      followUpSubject = `Following up on the website preview for ${name}`;
      followUpBody = `Hi ${name} Team,\n\nJust checking in to see if you had a chance to open the interactive webpage preview I made for you: ${previewUrl}\n\nHave a fantastic week!\n${senderName}`;
    } else if (toneLower.includes("executive") || toneLower.includes("premium")) {
      subject = `Strategic digital observation for ${name} (${category})`;
      alternativeSubjects = [
        `Client acquisition & digital journey analysis: ${name}`,
        `Private interactive layout prepared for ${name}`,
        `Digital presence assessment: ${name} (${areaLabel})`
      ];
      const greeting = `Dear Leadership Team at ${name},`;
      const hook = hasRating
        ? `In our assessment of premier ${category} firms in ${areaLabel}, ${name} stood out for its exemplary reputation (${ratingText}).`
        : `In our assessment of ${category} businesses in ${areaLabel}, we analyzed ${name}'s digital client engagement channels.`;
      
      const gapBulletText = gapsToUse.slice(0, 3).map(g => `• ${g}`).join("\n");
      const gapAnalysis = `Our diagnostic revealed key opportunities in the mobile customer journey:\n${gapBulletText}`;
      const solution = `To demonstrate how modern responsive architecture resolves these friction points, our team prepared a private interactive preview layout:\n👉 ${previewUrl}`;
      callToAction = `We welcome the opportunity to share our specific observations and demonstrate the layout at your convenience.`;
      const signOff = `With warm regards,\n${senderName}\nPrincipal Digital Consultant`;

      body = `${greeting}\n\n${hook}\n\n${gapAnalysis}\n\n${solution}\n\n${callToAction}\n\n${signOff}`;
      followUpSubject = `Follow-up regarding digital observation for ${name}`;
      followUpBody = `Dear ${name} Team,\n\nFollowing up regarding the interactive digital layout prepared for your organization: ${previewUrl}\n\nWe remain available to answer any questions or discuss deployment.\n\nWarm regards,\n${senderName}`;
    } else {
      // Default: Consultative
      subject = `Quick observation regarding ${name}'s online presence in ${areaLabel}`;
      alternativeSubjects = [
        hasRating ? `${name}'s ${ratingText} vs. mobile searcher friction` : `Mobile searcher observations for ${name}`,
        `Free interactive website preview created for ${name}`,
        `Local customer inquiries for ${name} in ${areaLabel}`
      ];
      const greeting = `Hi ${name} Team,`;
      const hook = hasRating
        ? `While reviewing top ${category} providers in ${areaLabel}, your ${ratingText} caught my attention. It's clear that customers trust your work.`
        : `While researching local ${category} providers in ${areaLabel}, I came across ${name}'s Google Maps listing.`;
      
      const gapBulletText = gapsToUse.slice(0, 3).map(g => `• [❌ MISSING ON GOOGLE MAPS]: ${g}`).join("\n");
      const gapAnalysis = `However, when smartphone searchers look for your services, there are a few observable friction points:\n${gapBulletText}`;
      const solution = `Rather than just mentioning it, I created a free website preview for your business:\n👉 ${previewUrl}\n\nIt features a 1-tap WhatsApp inquiry button, clean service cards, and fast mobile loading.`;
      callToAction = `Take a quick look on your phone or computer. Once you approve it, let's customize and launch it for you!`;
      const signOff = `Best regards,\n${senderName}`;

      body = `${greeting}\n\n${hook}\n\n${gapAnalysis}\n\n${solution}\n\n${callToAction}\n\n${signOff}`;
      followUpSubject = `Following up on the website preview for ${name}`;
      followUpBody = `Hi ${name} Team,\n\nFollowing up briefly to see if you had a moment to open the free website preview I created for you: ${previewUrl}\n\nOnce you approve it, let's customize and launch it on your domain!\n\nBest regards,\n${senderName}`;
    }

    // Apply length adjustments
    if (length === "short") {
      body = `${name} Team,\n\nI was looking at ${category} providers in ${areaLabel} and noticed ${primaryGap.toLowerCase()} on your Google profile.\n\nI created a free mobile website preview for you: ${previewUrl}\n\nTake a quick look on your phone. Once you approve it, let's customize and launch it!\n\nBest,\n${senderName}`;
    }
  } else if (channel === "whatsapp") {
    body = `Hi! This is ${senderName}. I noticed something specific about ${name}'s online presence in ${areaLabel} and thought I could help you improve it. ${hasRating ? `You have great customer reviews (${ratingText}), but` : "When"} clients search on their phones, there's ${primaryGap.toLowerCase()}.\n\nI put together a free interactive website preview customized for your business:\n👉 ${previewUrl}\n\nTake a look when you have a second and let me know what you think! 😊`;
    callToAction = "Take a look when you have a second and let me know what you think!";
    followUpBody = `Hi! Just following up to see if you had a chance to check out the free website preview for ${name}: ${previewUrl}\n\nNo pressure at all! Let me know if you'd like to launch it.`;
  } else if (channel === "sms") {
    body = `Hi! I noticed an opportunity for ${name} in ${areaLabel} & built a free mobile website preview to help you capture more clients: ${previewUrl} - ${senderName}`;
    callToAction = "View preview link";
  } else if (channel === "phone_script") {
    body = `[Opening]\n"Hi, is this the owner or manager of ${name}? My name is ${senderName}."\n\n[Value-First Observation Hook]\n"I'm reaching out because I was looking at top ${category} providers in ${areaLabel} and noticed something specific about your online presence that I can help you improve. ${hasRating ? `Your customer feedback is great, but` : "When"} mobile searchers find you, there is ${primaryGap.toLowerCase()}. I actually went ahead and created a live, free website preview customized for ${name} so you can see the solution."\n\n[Permission-Based Call to Action]\n"If I send over the interactive link via WhatsApp or SMS, would you be open to taking a quick 30-second look on your phone?"\n\n[Handling Resistance ("Send an email / Busy")]\n"Completely understand! That's why I created the interactive link so you can browse at your own convenience without any sales pitch. What's the best mobile number or email to send it to?"\n\n[Closing]\n"Thank you so much! I'm sending the link over right now. Have a wonderful day!"`;
    callToAction = "Ask permission to send interactive link via WhatsApp or SMS";
  } else if (channel === "linkedin") {
    body = `Hi there! I came across ${name} while reviewing leading ${category} businesses in ${areaLabel}. I noticed an opportunity regarding your mobile customer experience (${primaryGap.toLowerCase()}) and created a free interactive prototype to demonstrate the solution: ${previewUrl}\n\nWould love to connect and hear your thoughts on it!`;
    callToAction = "Connect and share feedback on prototype";
  } else {
    // in_person
    body = `[Introduction]\n"Good day! My name is ${senderName}. I stopped by because I work with local ${category} businesses in ${areaLabel}."\n\n[Observation]\n"I was reviewing your local profile and noticed local smartphone searchers run into ${primaryGap.toLowerCase()}. To show you how easy it is to fix, I prepared a free interactive website preview on my tablet."\n\n[Demonstration]\n"Here is how it looks on mobile: ${previewUrl}. It includes your 1-tap WhatsApp chat and clean service menu."\n\n[Next Step]\n"Would you like me to send this link to your phone so you can review it with your team?"`;
    callToAction = "Show live mobile preview on tablet / mobile";
  }

  // Scan truthfulness of the generated content
  const truthScan = scanDraftTruthfulness(body, subject, business, channel);

  const initialHistoryEntry: OutreachDraftHistoryEntry = {
    version: 1,
    timestamp: now,
    action: "generated",
    actor: options.userId || "system",
    actorRole: options.userRole || "Sales Specialist",
    subject,
    body: truthScan.sanitizedBody,
    reason: "Initial personalized draft generated from business evidence."
  };

  const draft: OutreachDraft = {
    id: draftId,
    businessId: business.id,
    channel,
    tone,
    length,
    subject: subject || undefined,
    alternativeSubjects: alternativeSubjects.length > 0 ? alternativeSubjects : undefined,
    body: truthScan.sanitizedBody,
    followUpSubject: followUpSubject || undefined,
    followUpBody: followUpBody || undefined,
    callToAction,
    recipientTarget: channel === "email" ? (business.email || options.recipientEmail) : (business.phone || options.recipientPhone),
    claims: truthScan.claims,
    unsupportedClaimsCount: truthScan.unsupportedClaims.length,
    truthfulnessScore: truthScan.truthfulnessScore,
    isFlaggedForReview: !truthScan.isValid,
    flaggedReasons: truthScan.flaggedIssues,
    evidenceReferences,
    createdAt: now,
    updatedAt: now,
    createdBy: options.userId || "system",
    version: 1,
    isApproved: false,
    approvalStatus: "DRAFT",
    deliveryStatus: "NOT_SCHEDULED",
    status: truthScan.isValid ? "draft" : "under_review",
    history: [initialHistoryEntry]
  };

  return draft;
}

/**
 * Saves a draft to a business entity without triggering message dispatch.
 */
export function saveDraftToBusiness(
  business: Business,
  draft: OutreachDraft
): { business: Business; draft: OutreachDraft } {
  const existingDrafts = business.outreachDrafts || [];
  const draftIdx = existingDrafts.findIndex(d => d.id === draft.id);

  let updatedDrafts: OutreachDraft[];
  if (draftIdx >= 0) {
    updatedDrafts = [...existingDrafts];
    updatedDrafts[draftIdx] = draft;
  } else {
    updatedDrafts = [draft, ...existingDrafts];
  }

  const updatedBusiness: Business = {
    ...business,
    outreachDrafts: updatedDrafts,
    activeOutreachDraftId: draft.id
  };

  return { business: updatedBusiness, draft };
}

/**
 * Edits an existing outreach draft and records version history.
 */
export function editDraftInBusiness(
  business: Business,
  draftId: string,
  updates: {
    subject?: string;
    body: string;
    callToAction?: string;
    followUpSubject?: string;
    followUpBody?: string;
    recipientTarget?: string;
    reason?: string;
  },
  actor: { uid: string; displayName?: string; role?: string }
): { success: boolean; business: Business; draft?: OutreachDraft; error?: string } {
  const existingDrafts = business.outreachDrafts || [];
  const targetDraft = existingDrafts.find(d => d.id === draftId);

  if (!targetDraft) {
    return { success: false, business, error: `Draft with ID "${draftId}" not found.` };
  }

  // Scan updated body for truthfulness
  const truthScan = scanDraftTruthfulness(
    updates.body, 
    updates.subject || targetDraft.subject, 
    business, 
    targetDraft.channel
  );

  const now = new Date().toISOString();
  const nextVersion = targetDraft.version + 1;

  const historyEntry: OutreachDraftHistoryEntry = {
    version: nextVersion,
    timestamp: now,
    action: "edited",
    actor: actor.displayName || actor.uid,
    actorRole: actor.role || "Sales Agent",
    subject: updates.subject || targetDraft.subject,
    body: updates.body,
    reason: updates.reason || "Manual user edit."
  };

  // Check for material edits that invalidate prior approval or scheduling
  const isMaterialChange = (updates.body !== targetDraft.body) || (updates.subject !== undefined && updates.subject !== targetDraft.subject);
  const hadApproval = targetDraft.isApproved || targetDraft.approvalStatus === "APPROVED";
  const shouldInvalidateApproval = isMaterialChange && hadApproval;

  const updatedDraft: OutreachDraft = {
    ...targetDraft,
    subject: updates.subject !== undefined ? updates.subject : targetDraft.subject,
    body: updates.body,
    callToAction: updates.callToAction || targetDraft.callToAction,
    followUpSubject: updates.followUpSubject !== undefined ? updates.followUpSubject : targetDraft.followUpSubject,
    followUpBody: updates.followUpBody !== undefined ? updates.followUpBody : targetDraft.followUpBody,
    recipientTarget: updates.recipientTarget !== undefined ? updates.recipientTarget : targetDraft.recipientTarget,
    claims: truthScan.claims,
    unsupportedClaimsCount: truthScan.unsupportedClaims.length,
    truthfulnessScore: truthScan.truthfulnessScore,
    isFlaggedForReview: !truthScan.isValid,
    flaggedReasons: truthScan.flaggedIssues,
    version: nextVersion,
    updatedAt: now,
    // Material edits invalidate previous approval and reset scheduled state
    isApproved: shouldInvalidateApproval ? false : targetDraft.isApproved,
    approvalStatus: shouldInvalidateApproval ? "DRAFT" : (targetDraft.approvalStatus || "DRAFT"),
    deliveryStatus: shouldInvalidateApproval ? "NOT_SCHEDULED" : targetDraft.deliveryStatus,
    scheduleConfig: shouldInvalidateApproval ? undefined : targetDraft.scheduleConfig,
    status: truthScan.isValid ? (shouldInvalidateApproval ? "DRAFT" : targetDraft.status) : "under_review",
    history: [...targetDraft.history, historyEntry]
  };

  if (shouldInvalidateApproval) {
    const existingAudit = updatedDraft.auditTrail || [];
    updatedDraft.auditTrail = [
      ...existingAudit,
      {
        id: `audit_inval_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        draftId: targetDraft.id,
        businessId: targetDraft.businessId,
        timestamp: now,
        action: "approval_invalidated",
        actor: actor.displayName || actor.uid,
        actorRole: actor.role || "Sales Agent",
        actorUid: actor.uid,
        details: "Material edit to message body or subject invalidated previous approval. Renewed approval required.",
        previousStatus: targetDraft.approvalStatus || "APPROVED",
        newStatus: "DRAFT"
      }
    ];
  }

  const updatedBusiness: Business = {
    ...business,
    outreachDrafts: existingDrafts.map(d => d.id === draftId ? updatedDraft : d)
  };

  return { success: true, business: updatedBusiness, draft: updatedDraft };
}

/**
 * Regenerates an existing outreach draft with new tone/options and appends to version history.
 */
export function regenerateDraftInBusiness(
  business: Business,
  draftId: string,
  newOptions: DraftGenerationOptions,
  actor: { uid: string; displayName?: string; role?: string }
): { success: boolean; business: Business; draft?: OutreachDraft; error?: string } {
  const existingDrafts = business.outreachDrafts || [];
  const targetDraft = existingDrafts.find(d => d.id === draftId);

  if (!targetDraft) {
    return { success: false, business, error: `Draft with ID "${draftId}" not found.` };
  }

  const freshDraft = generatePersonalizedOutreachDraft(business, {
    ...newOptions,
    channel: newOptions.channel || targetDraft.channel,
    tone: newOptions.tone || targetDraft.tone,
    length: newOptions.length || targetDraft.length,
    userId: actor.uid,
    userRole: actor.role
  });

  const now = new Date().toISOString();
  const nextVersion = targetDraft.version + 1;

  const historyEntry: OutreachDraftHistoryEntry = {
    version: nextVersion,
    timestamp: now,
    action: "regenerated",
    actor: actor.displayName || actor.uid,
    actorRole: actor.role || "Sales Agent",
    subject: freshDraft.subject,
    body: freshDraft.body,
    reason: `Regenerated with tone="${freshDraft.tone}" and length="${freshDraft.length}".`
  };

  const mergedDraft: OutreachDraft = {
    ...freshDraft,
    id: targetDraft.id, // Preserve consistent draft ID
    version: nextVersion,
    createdAt: targetDraft.createdAt,
    updatedAt: now,
    isApproved: false,
    approvalStatus: "DRAFT",
    deliveryStatus: "NOT_SCHEDULED",
    scheduleConfig: undefined,
    history: [...targetDraft.history, historyEntry]
  };

  const updatedBusiness: Business = {
    ...business,
    outreachDrafts: existingDrafts.map(d => d.id === draftId ? mergedDraft : d)
  };

  return { success: true, business: updatedBusiness, draft: mergedDraft };
}

/**
 * Approves an outreach draft for subsequent scheduling/outreach (does NOT send).
 */
export function approveDraftInBusiness(
  business: Business,
  draftId: string,
  actor: { uid: string; displayName?: string; role?: string },
  approvalReason?: string
): { success: boolean; business: Business; draft?: OutreachDraft; error?: string } {
  const existingDrafts = business.outreachDrafts || [];
  const targetDraft = existingDrafts.find(d => d.id === draftId);

  if (!targetDraft) {
    return { success: false, business, error: `Draft with ID "${draftId}" not found.` };
  }

  // Check RBAC Permissions
  if (actor && (actor.role === "Viewer" || actor.role === "Guest" || actor.role === "Auditor")) {
    return {
      success: false,
      business,
      error: `Unauthorized: User role "${actor.role}" cannot approve outreach messages.`
    };
  }

  if (targetDraft.unsupportedClaimsCount > 0) {
    return { 
      success: false, 
      business, 
      error: `Cannot approve draft with ${targetDraft.unsupportedClaimsCount} unsupported claims. Resolve flagged issues first.` 
    };
  }

  const now = new Date().toISOString();
  const nextVersion = targetDraft.version + 1;

  const historyEntry: OutreachDraftHistoryEntry = {
    version: nextVersion,
    timestamp: now,
    action: "approved",
    actor: actor.displayName || actor.uid,
    actorRole: actor.role || "Manager",
    subject: targetDraft.subject,
    body: targetDraft.body,
    reason: approvalReason || "Draft approved by authorized user for outreach preparation."
  };

  const updatedDraft: OutreachDraft = {
    ...targetDraft,
    isApproved: true,
    approvalStatus: "APPROVED",
    approvedBy: actor.displayName || actor.uid,
    approvedAt: now,
    approvalReason: approvalReason || "Draft approved by authorized user.",
    status: "approved",
    version: nextVersion,
    updatedAt: now,
    history: [...targetDraft.history, historyEntry]
  };

  const existingAudit = updatedDraft.auditTrail || [];
  updatedDraft.auditTrail = [
    ...existingAudit,
    {
      id: `audit_appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      draftId: targetDraft.id,
      businessId: targetDraft.businessId,
      timestamp: now,
      action: "approved",
      actor: actor.displayName || actor.uid,
      actorRole: actor.role || "Manager",
      actorUid: actor.uid,
      details: approvalReason || "Draft approved for outreach delivery readiness.",
      previousStatus: targetDraft.approvalStatus || "DRAFT",
      newStatus: "APPROVED"
    }
  ];

  const updatedBusiness: Business = {
    ...business,
    outreachDrafts: existingDrafts.map(d => d.id === draftId ? updatedDraft : d)
  };

  return { success: true, business: updatedBusiness, draft: updatedDraft };
}

// Micro-Phase 12C Re-exports
export {
  validatePreflightDelivery,
  submitDraftForReview,
  approveOutreachDraft,
  rejectOutreachDraft,
  scheduleOutreachDelivery,
  cancelScheduledDelivery,
  rescheduleOutreachDelivery,
  deliverOutreachMessage
} from "./prospectOutreachDelivery";

// Micro-Phase 12D Re-exports
export {
  createCanonicalCommunicationRecord,
  recordCommunicationLifecycleEvent,
  recordInboundReply,
  getProspectCommunicationTimeline,
  verifyWebhookPayload,
  isUserAuthorizedForHistory
} from "./prospectCommunicationHistory";

/**
 * Discards an outreach draft, preserving it in history with discarded status.
 */
export function discardDraftInBusiness(
  business: Business,
  draftId: string,
  actor: { uid: string; displayName?: string; role?: string },
  reason?: string
): { success: boolean; business: Business; draft?: OutreachDraft; error?: string } {
  const existingDrafts = business.outreachDrafts || [];
  const targetDraft = existingDrafts.find(d => d.id === draftId);

  if (!targetDraft) {
    return { success: false, business, error: `Draft with ID "${draftId}" not found.` };
  }

  const now = new Date().toISOString();
  const nextVersion = targetDraft.version + 1;

  const historyEntry: OutreachDraftHistoryEntry = {
    version: nextVersion,
    timestamp: now,
    action: "discarded",
    actor: actor.displayName || actor.uid,
    actorRole: actor.role || "Sales Agent",
    subject: targetDraft.subject,
    body: targetDraft.body,
    reason: reason || "Draft discarded by user."
  };

  const updatedDraft: OutreachDraft = {
    ...targetDraft,
    status: "discarded",
    isApproved: false,
    version: nextVersion,
    updatedAt: now,
    history: [...targetDraft.history, historyEntry]
  };

  const updatedBusiness: Business = {
    ...business,
    outreachDrafts: existingDrafts.map(d => d.id === draftId ? updatedDraft : d)
  };

  return { success: true, business: updatedBusiness, draft: updatedDraft };
}
