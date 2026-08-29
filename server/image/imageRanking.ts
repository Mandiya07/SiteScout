import { ImageMetadata, ImageRequirement } from "./types.js";
import { matchIndustryTaxonomy } from "./taxonomy.js";

export interface ScoreContext {
  industry: string;
  subcategory?: string;
  serviceName?: string;
  requirement: ImageRequirement;
  usedImageIds: Set<string>;
}

export function rankAndScoreImage(
  image: ImageMetadata,
  context: ScoreContext
): { score: number; breakdown: ImageMetadata["relevanceBreakdown"]; explanation: string } {
  let industryScore = 20;
  let serviceScore = 15;
  let sectionScore = 10;
  let qualityScore = 9;
  let compositionScore = 8;
  let orientationScore = 4;
  let resolutionScore = 4;

  const taxonomy = matchIndustryTaxonomy(context.industry);
  const textCorpus = `${image.alt} ${image.query || ""} ${image.photographer || ""} ${image.subcategory || ""}`.toLowerCase();

  // 1. Industry Match (Max 30)
  if (taxonomy.aliases.some(alias => textCorpus.includes(alias.toLowerCase()))) {
    industryScore = 30;
  } else if (taxonomy.preferredSubjects.some(sub => textCorpus.includes(sub.toLowerCase()))) {
    industryScore = 28;
  } else if (textCorpus.includes(context.industry.toLowerCase())) {
    industryScore = 26;
  } else {
    industryScore = 15;
  }

  // Check negative / avoid subjects
  if (taxonomy.avoidSubjects.some(avoid => textCorpus.includes(avoid.toLowerCase()))) {
    industryScore = Math.max(0, industryScore - 20);
  }

  // 2. Service Match (Max 25)
  if (context.serviceName) {
    const srvWords = context.serviceName.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matches = srvWords.filter(w => textCorpus.includes(w)).length;
    if (matches >= 2) {
      serviceScore = 25;
    } else if (matches === 1) {
      serviceScore = 20;
    } else {
      serviceScore = 12;
    }
  } else if (context.requirement.subject) {
    const reqWords = context.requirement.subject.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const matches = reqWords.filter(w => textCorpus.includes(w)).length;
    if (matches >= 2) serviceScore = 24;
    else if (matches === 1) serviceScore = 19;
    else serviceScore = 14;
  }

  // 3. Section Match (Max 15)
  if (image.section === context.requirement.section) {
    sectionScore = 15;
  } else if (context.requirement.section === "gallery") {
    sectionScore = 13; // Gallery is flexible
  } else {
    sectionScore = 8;
  }

  // 4. Orientation & Aspect Match (Max 5)
  const isLandscape = image.width >= image.height * 1.2;
  const isSquare = Math.abs(image.width - image.height) < (image.width * 0.2);

  if (context.requirement.orientation === "landscape" && isLandscape) {
    orientationScore = 5;
  } else if (context.requirement.orientation === "square" && isSquare) {
    orientationScore = 5;
  } else if (context.requirement.orientation === "portrait" && !isLandscape) {
    orientationScore = 5;
  } else {
    orientationScore = 2;
  }

  // 5. Resolution Match (Max 5)
  if (image.width >= 1200 && image.height >= 700) {
    resolutionScore = 5;
  } else if (image.width >= 800) {
    resolutionScore = 4;
  } else {
    resolutionScore = 2;
  }

  // 6. Deduplication Penalty
  let deduplicationPenalty = 0;
  if (context.usedImageIds.has(image.id) || context.usedImageIds.has(image.fullUrl) || context.usedImageIds.has(image.sourceUrl)) {
    deduplicationPenalty = 50; // Heavy penalty so identical image isn't repeated across hero, about, services, gallery
  }

  const rawTotal = industryScore + serviceScore + sectionScore + qualityScore + compositionScore + orientationScore + resolutionScore;
  const finalScore = Math.max(0, Math.min(100, rawTotal - deduplicationPenalty));

  const breakdown = {
    industryMatch: industryScore,
    serviceMatch: serviceScore,
    sectionMatch: sectionScore,
    visualQuality: qualityScore,
    composition: compositionScore,
    orientation: orientationScore,
    resolution: resolutionScore
  };

  const explanation = `Selected because it matches ${taxonomy.industry} (${industryScore}/30) and ${context.serviceName || context.requirement.subject || "core offering"} (${serviceScore}/25) with ${context.requirement.orientation} framing (${orientationScore}/5).`;

  return {
    score: finalScore,
    breakdown,
    explanation
  };
}

export function sortAndRankCandidates(
  candidates: ImageMetadata[],
  context: ScoreContext
): ImageMetadata[] {
  const scored = candidates.map(img => {
    const { score, breakdown, explanation } = rankAndScoreImage(img, context);
    return {
      ...img,
      relevanceScore: score,
      relevanceBreakdown: breakdown,
      explanation: img.explanation || explanation
    };
  });

  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
}
