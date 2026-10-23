import { Business } from "../types";

export const STANDARDIZED_INDUSTRIES = [
  "Hospitality & Dining",
  "Automotive & Transport",
  "Construction & Engineering",
  "Legal & Professional Services",
  "Medical & Healthcare",
  "Retail & Shopping",
  "Education & Training",
  "Agriculture & Farming",
  "Security & Protection",
  "Cleaning & Maintenance",
  "IT & Digital Services",
  "General Commercial Services"
] as const;

export type StandardizedIndustry = typeof STANDARDIZED_INDUSTRIES[number];

/**
 * Automatically assigns an 'Industry' tag to a business based on its category, name, and description.
 * Acts as a background classification processor for all discovered or imported leads.
 */
export function assignIndustryTag(business: { name?: string; category?: string; description?: string }): StandardizedIndustry {
  const text = `${business.category || ""} ${business.name || ""} ${business.description || ""}`.toLowerCase();

  if (
    text.includes("restaurant") || text.includes("cafe") || text.includes("hotel") || 
    text.includes("dining") || text.includes("food") || text.includes("catering") || 
    text.includes("bar") || text.includes("bistro") || text.includes("coffee")
  ) {
    return "Hospitality & Dining";
  }

  if (
    text.includes("auto") || text.includes("car") || text.includes("mechanic") || 
    text.includes("repair") || text.includes("transport") || text.includes("logistics") || 
    text.includes("vehicle") || text.includes("dealership") || text.includes("towing")
  ) {
    return "Automotive & Transport";
  }

  if (
    text.includes("construction") || text.includes("builder") || text.includes("civil") || 
    text.includes("engineering") || text.includes("architect") || text.includes("steel") || 
    text.includes("hardware") || text.includes("renovation") || text.includes("contractor")
  ) {
    return "Construction & Engineering";
  }

  if (
    text.includes("law") || text.includes("attorney") || text.includes("legal") || 
    text.includes("accountant") || text.includes("audit") || text.includes("consulting") || 
    text.includes("tax") || text.includes("real estate") || text.includes("property") || text.includes("agency")
  ) {
    return "Legal & Professional Services";
  }

  if (
    text.includes("med") || text.includes("doctor") || text.includes("clinic") || 
    text.includes("health") || text.includes("pharmacy") || text.includes("dental") || 
    text.includes("hospital") || text.includes("care") || text.includes("wellness")
  ) {
    return "Medical & Healthcare";
  }

  if (
    text.includes("shop") || text.includes("store") || text.includes("retail") || 
    text.includes("boutique") || text.includes("market") || text.includes("clothing") || 
    text.includes("fashion") || text.includes("supplies")
  ) {
    return "Retail & Shopping";
  }

  if (
    text.includes("school") || text.includes("academy") || text.includes("training") || 
    text.includes("education") || text.includes("college") || text.includes("tutor") || 
    text.includes("learning") || text.includes("institute")
  ) {
    return "Education & Training";
  }

  if (
    text.includes("farm") || text.includes("agriculture") || text.includes("crop") || 
    text.includes("livestock") || text.includes("produce") || text.includes("agro") || text.includes("seed")
  ) {
    return "Agriculture & Farming";
  }

  if (
    text.includes("security") || text.includes("guard") || text.includes("alarm") || 
    text.includes("surveillance") || text.includes("protection") || text.includes("cctv")
  ) {
    return "Security & Protection";
  }

  if (
    text.includes("clean") || text.includes("janitorial") || text.includes("maintenance") || 
    text.includes("pest") || text.includes("laundry") || text.includes("sanitation")
  ) {
    return "Cleaning & Maintenance";
  }

  if (
    text.includes("it") || text.includes("software") || text.includes("computer") || 
    text.includes("digital") || text.includes("tech") || text.includes("network") || text.includes("web")
  ) {
    return "IT & Digital Services";
  }

  return "General Commercial Services";
}

/**
 * Background processor that tags an array of businesses with their inferred standardized industry tag.
 */
export function processBatchIndustryTagging<T extends Business>(businesses: T[]): T[] {
  return businesses.map(biz => ({
    ...biz,
    industryTag: biz.industryTag || assignIndustryTag(biz)
  }));
}
