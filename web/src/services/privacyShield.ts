export interface RedactionEntry {
  token: string;
  original: string;
  category: 'email' | 'phone' | 'amount' | 'id' | 'person';
}

export interface PrivacyShieldReport {
  sanitizedText: string;
  redactedCount: number;
  categories: string[];
  replacements: RedactionEntry[];
}

const RULES: Array<{
  category: RedactionEntry['category'];
  label: string;
  regex: RegExp;
}> = [
  {
    category: 'email',
    label: 'EMAIL',
    regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  {
    category: 'phone',
    label: 'PHONE',
    regex: /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4}\b/g,
  },
  {
    category: 'amount',
    label: 'AMOUNT',
    regex: /(?:₹|\$|€|£|INR|USD)\s?\d[\d,]*(?:\.\d{1,2})?/gi,
  },
  {
    category: 'id',
    label: 'ID',
    regex: /\b(?:policy|acct|account|order|ref|claim)\s*#?\s*[A-Z0-9-]{4,}\b/gi,
  },
  {
    category: 'person',
    label: 'CLINIC_OR_PERSON',
    regex: /\b(?:Dr\.|Mr\.|Ms\.|Mrs\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
  },
];

/**
 * Runs 100% locally on-device before any Cloud Gemini call.
 * Masks sensitive personal details so raw PII never leaves the browser.
 */
export function redactForCloud(text: string): PrivacyShieldReport {
  let sanitized = text;
  const replacements: RedactionEntry[] = [];
  const categories = new Set<string>();
  const counters: Record<string, number> = {};

  for (const rule of RULES) {
    sanitized = sanitized.replace(rule.regex, (match) => {
      // Avoid redacting short years like 2026 or times
      if (rule.category === 'phone' && match.replace(/\D/g, '').length < 8) {
        return match;
      }
      const existing = replacements.find((r) => r.original === match);
      if (existing) return existing.token;

      counters[rule.label] = (counters[rule.label] || 0) + 1;
      const token = `[${rule.label}_${counters[rule.label]}]`;
      replacements.push({
        token,
        original: match,
        category: rule.category,
      });
      categories.add(rule.category);
      return token;
    });
  }

  return {
    sanitizedText: sanitized,
    redactedCount: replacements.length,
    categories: Array.from(categories),
    replacements,
  };
}

/**
 * Restores masked placeholders locally on the user's screen after Cloud Gemini responds.
 */
export function restoreRedactions(
  text: string,
  replacements: RedactionEntry[]
): string {
  let restored = text;
  for (const entry of replacements) {
    restored = restored.split(entry.token).join(entry.original);
  }
  return restored;
}
