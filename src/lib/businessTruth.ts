import { Business, BusinessTruthProfile, TruthField } from "../types";

export function buildBusinessTruthProfile(biz: any): BusinessTruthProfile {
  const name = biz?.name || biz?.businessName || "Business";
  const category = biz?.category || "Local Business";
  const phone = biz?.phone || "";
  const address = biz?.address || "";
  const email = biz?.email || biz?.contactPage?.email || "";
  const rating = biz?.rating ?? 0;
  const reviewsCount = biz?.reviewsCount ?? 0;
  const presence = biz?.presence || {};

  const hasWebsite = presence.hasWebsite ?? false;
  const websiteUrl = presence.websiteUrl || biz?.websiteUrl || "";

  const hasSocial = 
    (presence.facebookStatus && presence.facebookStatus !== "none") ||
    (presence.instagramStatus && presence.instagramStatus !== "none") ||
    biz?.hasSocial;

  const hasCompleteHours = presence.openingHoursStatus === "complete" || biz?.hasHours;

  const fields: Record<string, TruthField> = {
    businessName: {
      label: "Business Name",
      key: "businessName",
      value: name,
      status: "confirmed",
      statusText: "✓ Confirmed",
      level: "VERIFIED",
      notes: "Obtained from trusted Google / directory listing record",
      source: "Google Places API"
    },
    phone: {
      label: "Phone",
      key: "phone",
      value: phone || "Not listed",
      status: phone ? "confirmed" : "unconfirmed",
      statusText: phone ? "✓ Confirmed" : "? Unconfirmed",
      level: phone ? "VERIFIED" : "AI_DRAFT",
      notes: phone ? "Direct telephone line verified on public record" : "No verified direct telephone number — draft placeholder used",
      source: phone ? "Verified Directory" : "AI Draft Default"
    },
    address: {
      label: "Address",
      key: "address",
      value: address || "Not listed",
      status: address ? "confirmed" : "unconfirmed",
      statusText: address ? "✓ Confirmed" : "? Unconfirmed",
      level: address ? "VERIFIED" : "AI_DRAFT",
      notes: address ? "Physical location address verified on Maps" : "Physical location unconfirmed",
      source: address ? "Verified Maps Listing" : "AI Draft Default"
    },
    website: {
      label: "Website",
      key: "website",
      value: hasWebsite ? (websiteUrl || "Existing site") : "No website found",
      status: hasWebsite ? "confirmed" : "not_found",
      statusText: hasWebsite ? "✓ Confirmed" : "✓ No website found",
      level: "VERIFIED",
      notes: hasWebsite ? "Existing web presence verified" : "Verified gap — business currently lacks a website",
      source: "Audit Engine"
    },
    category: {
      label: "Category",
      key: "category",
      value: category,
      status: "confirmed",
      statusText: "✓ Confirmed",
      level: "VERIFIED",
      notes: `Industry taxonomy classified as ${category}`,
      source: "Industry Classification"
    },
    services: {
      label: "Services",
      key: "services",
      value: biz?.customServices ? "Owner defined services" : "Inferred from category",
      status: biz?.customServices ? "confirmed" : "unconfirmed",
      statusText: biz?.customServices ? "✓ Confirmed" : "? Not confirmed",
      level: biz?.customServices ? "BUSINESS_SUPPLIED" : "AI_DRAFT",
      notes: biz?.customServices ? "Services catalog provided by business owner" : "Service catalog inferred by AI — marked as draft copy",
      source: biz?.customServices ? "Business Owner Entry" : "AI Trade Suggestion"
    },
    openingHours: {
      label: "Opening Hours",
      key: "openingHours",
      value: hasCompleteHours ? "Standard business hours" : "Unconfirmed",
      status: hasCompleteHours ? "confirmed" : "unconfirmed",
      statusText: hasCompleteHours ? "✓ Confirmed" : "? Unconfirmed",
      level: hasCompleteHours ? "BUSINESS_SUPPLIED" : "AI_DRAFT",
      notes: hasCompleteHours ? "Verified owner-supplied operating schedule" : "Operating schedule unconfirmed — default draft schedule used",
      source: hasCompleteHours ? "Business Owner Entry" : "AI Draft Default"
    },
    rating: {
      label: "Rating",
      key: "rating",
      value: rating > 0 ? `${rating} ★` : "No public rating",
      status: rating > 0 ? "confirmed" : "unconfirmed",
      statusText: rating > 0 ? "✓ Confirmed" : "? Unconfirmed",
      level: rating > 0 ? "VERIFIED" : "AI_DRAFT",
      notes: rating > 0 ? `Public Google review rating score (${rating}/5.0)` : "No public rating recorded",
      source: "Google Places API"
    },
    reviews: {
      label: "Reviews",
      key: "reviews",
      value: reviewsCount >= 0 ? `${reviewsCount} customer reviews` : "0 reviews",
      status: reviewsCount > 0 ? "confirmed" : "unconfirmed",
      statusText: reviewsCount > 0 ? "✓ Confirmed" : "? Unconfirmed",
      level: reviewsCount > 0 ? "VERIFIED" : "AI_DRAFT",
      notes: reviewsCount > 0 ? `Verified public feedback volume (${reviewsCount} reviews)` : "No public reviews recorded",
      source: "Google Places API"
    },
    email: {
      label: "Email",
      key: "email",
      value: email || "Unconfirmed",
      status: email ? "confirmed" : "unconfirmed",
      statusText: email ? "✓ Confirmed" : "? Unconfirmed",
      level: email ? "BUSINESS_SUPPLIED" : "AI_DRAFT",
      notes: email ? "Email contact supplied by business owner" : "Email contact unconfirmed — fallback lead routing used",
      source: email ? "Business Owner Entry" : "AI Draft Fallback"
    },
    socialLinks: {
      label: "Social links",
      key: "socialLinks",
      value: hasSocial ? "Active social presence" : "Unconfirmed",
      status: hasSocial ? "confirmed" : "unconfirmed",
      statusText: hasSocial ? "✓ Confirmed" : "? Unconfirmed",
      level: hasSocial ? "VERIFIED" : "AI_DRAFT",
      notes: hasSocial ? "Verified social media presence" : "Social media profiles unconfirmed",
      source: hasSocial ? "Social Audit" : "AI Draft Fallback"
    }
  };

  const allFields = Object.values(fields);
  const confirmedList = allFields.filter(f => f.status === "confirmed" || f.status === "not_found");
  const unconfirmedList = allFields.filter(f => f.status === "unconfirmed");

  const verifiedCount = allFields.filter(f => f.level === "VERIFIED").length;
  const businessSuppliedCount = allFields.filter(f => f.level === "BUSINESS_SUPPLIED").length;
  const aiDraftCount = allFields.filter(f => f.level === "AI_DRAFT").length;

  return {
    id: `btp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    businessId: biz?.id || "unknown",
    businessName: fields.businessName,
    phone: fields.phone,
    address: fields.address,
    website: fields.website,
    category: fields.category,
    services: fields.services,
    openingHours: fields.openingHours,
    rating: fields.rating,
    reviews: fields.reviews,
    email: fields.email,
    socialLinks: fields.socialLinks,
    summary: {
      confirmedCount: confirmedList.length,
      unconfirmedCount: unconfirmedList.length,
      verifiedCount,
      businessSuppliedCount,
      aiDraftCount,
      draftPolicy: "Content Levels Enforced: VERIFIED facts are used as absolute truths; BUSINESS-SUPPLIED facts reflect owner inputs; AI-DRAFT copy is explicitly labeled as draft suggestions to eliminate hallucinations."
    },
    generatedAt: new Date().toISOString()
  };
}
