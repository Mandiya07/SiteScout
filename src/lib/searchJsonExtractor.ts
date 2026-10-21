/**
 * Search JSON Extraction Utility
 * 
 * Safely extracts business listings from live web search and LLM grounding responses,
 * handling full markdown fences, unclosed fences, truncated arrays,
 * single object streams, trailing commas, and partial responses without throwing SyntaxError.
 */

export function isValidBusinessObject(item: any): boolean {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    !item.name.toLowerCase().includes("exact real business name") &&
    !item.name.toLowerCase().includes("sample business")
  );
}

/**
 * Robust JSON extractor for LLM search grounding output.
 * Handles full markdown fences, unclosed fences, truncated arrays,
 * single object streams, and trailing commas.
 */
export function extractBusinessesFromJson(text: string): any[] {
  if (!text || typeof text !== "string") return [];

  // 1. Direct standard parse attempt
  try {
    const direct = JSON.parse(text.trim());
    if (Array.isArray(direct) && direct.length > 0) {
      const valid = direct.filter(isValidBusinessObject);
      if (valid.length > 0) return valid;
    }
  } catch {
    // Continue to advanced extractors
  }

  // 2. Strip markdown code fences (both closed ```json...``` and unclosed ```json...)
  let candidate = text.trim();
  const fenceStartMatch = candidate.match(/```(?:json)?\s*/i);
  if (fenceStartMatch && fenceStartMatch.index !== undefined) {
    const afterFence = candidate.slice(fenceStartMatch.index + fenceStartMatch[0].length);
    const fenceEndIdx = afterFence.indexOf("```");
    if (fenceEndIdx !== -1) {
      candidate = afterFence.slice(0, fenceEndIdx).trim();
    } else {
      candidate = afterFence.trim();
    }
  }

  // 3. Try parsing from first '[' to last ']'
  const firstBracket = candidate.indexOf("[");
  const lastBracket = candidate.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidateArray = candidate.slice(firstBracket, lastBracket + 1);
    try {
      const sanitized = candidateArray.replace(/,\s*([}\]])/g, "$1");
      const parsed = JSON.parse(sanitized);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter(isValidBusinessObject);
        if (valid.length > 0) return valid;
      }
    } catch {
      // Continue to auto-repair
    }
  }

  // 4. Auto-repair truncated JSON array (e.g. Unexpected end of JSON input)
  if (firstBracket !== -1) {
    const afterBracket = candidate.slice(firstBracket);
    const lastBrace = afterBracket.lastIndexOf("}");
    if (lastBrace !== -1) {
      const repaired = afterBracket.slice(0, lastBrace + 1) + "\n]";
      try {
        const sanitized = repaired.replace(/,\s*([}\]])/g, "$1");
        const parsed = JSON.parse(sanitized);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.filter(isValidBusinessObject);
          if (valid.length > 0) {
            return valid;
          }
        }
      } catch {
        // Fall through to object scanner
      }
    }
  }

  // 5. Stream scanner for balanced single JSON objects: { "name": ... }
  const objects: any[] = [];
  let depth = 0;
  let inString = false;
  let isEscaped = false;
  let startIdx = -1;

  for (let i = 0; i < candidate.length; i++) {
    const char = candidate[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (char === "\\") {
        isEscaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      if (depth === 0) {
        startIdx = i;
      }
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        const block = candidate.slice(startIdx, i + 1);
        try {
          const sanitized = block.replace(/,\s*([}\]])/g, "$1");
          const obj = JSON.parse(sanitized);
          if (isValidBusinessObject(obj)) {
            objects.push(obj);
          }
        } catch {
          // Ignore individual malformed block
        }
        startIdx = -1;
      }
    }
  }

  if (objects.length > 0) {
    return objects;
  }

  return [];
}
