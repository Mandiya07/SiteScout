import { ImageMetadata, ImageRequirement } from "./types.js";
import { matchIndustryTaxonomy } from "./taxonomy.js";
import { visualAnalyzer } from "./visualAnalyzer.js";

export interface ScoreContext {
  industry: string;
  subcategory?: string;
  serviceName?: string;
  requirement: ImageRequirement;
  usedImageIds: Set<string>;
  businessName?: string;
  brandPersonality?: string;
  customerType?: string[];
  localContext?: string;
}

/**
 * 6-Stage Visual Intelligence Ranking Algorithm:
 * 1. Search Candidates
 * 2. Metadata Relevance (Keywords, Taxonomies, Aliases) [Max 25]
 * 3. Visual Relevance Analysis (Trade Authenticity vs Generic Stock Impostor) [Max 35]
 * 4. Composition Analysis (Visual Balance, Rule of Thirds, Clutter vs Focus) [Max 20]
 * 5. Text-Overlay Suitability (Copy Headroom, Luminance Contrast, Readability) [Max 20]
 * 6. Final Composite Score & Deduplication
 */
export function rankAndScoreImage(
  image: ImageMetadata,
  context: ScoreContext
): { 
  score: number; 
  breakdown: ImageMetadata["relevanceBreakdown"]; 
  visualAnalysis: ImageMetadata["visualAnalysis"];
  explanation: string;
} {
  // Execute the multi-stage visual intelligence analysis
  const result = visualAnalyzer.analyzeImage(
    image,
    context.industry,
    context.requirement,
    context.serviceName,
    {
      businessName: context.businessName,
      brandPersonality: context.brandPersonality,
      customerType: context.customerType,
      localContext: context.localContext
    }
  );

  // 6. Deduplication Penalty across site sections
  let deduplicationPenalty = 0;
  if (
    context.usedImageIds.has(image.id) || 
    context.usedImageIds.has(image.fullUrl) || 
    context.usedImageIds.has(image.sourceUrl)
  ) {
    deduplicationPenalty = 50; // Heavy penalty to prevent identical image reuse across sections
  }

  const finalScore = Math.max(0, Math.min(100, result.totalScore - deduplicationPenalty));

  const breakdown: ImageMetadata["relevanceBreakdown"] = {
    // New 4-Stage Breakdown
    metadataRelevance: result.metadataScore,
    visualRelevance: result.visualRelevanceScore,
    composition: result.compositionScore,
    textOverlaySuitability: result.textOverlayScore,
    // Legacy support
    industryMatch: result.metadataScore,
    serviceMatch: Math.round((result.visualRelevanceScore / 35) * 25),
    sectionMatch: Math.round((result.textOverlayScore / 20) * 15),
    visualQuality: Math.round((result.visualRelevanceScore / 35) * 10),
    orientation: Math.round((result.compositionScore / 20) * 5),
    resolution: 5
  };

  return {
    score: finalScore,
    breakdown,
    visualAnalysis: result.report,
    explanation: result.explanation
  };
}

export function sortAndRankCandidates(
  candidates: ImageMetadata[],
  context: ScoreContext
): ImageMetadata[] {
  const scored = candidates.map(img => {
    const { score, breakdown, visualAnalysis, explanation } = rankAndScoreImage(img, context);
    return {
      ...img,
      relevanceScore: score,
      relevanceBreakdown: breakdown,
      visualAnalysis,
      explanation: img.explanation || explanation
    };
  });

  return scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

