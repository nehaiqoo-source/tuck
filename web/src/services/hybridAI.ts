import {
  getGenerativeModel,
  InferenceMode,
  InferenceSource,
} from 'firebase/ai';
import { ai } from './firebase';
import type {
  HybridMode,
  InferenceMeta,
  SynthesisResult,
  TuckItem,
  TuckSource,
} from '../types';

const CLOUD_MODEL = 'gemini-3.8-flash';

function toSdkMode(mode: HybridMode): InferenceMode {
  switch (mode) {
    case 'only_on_device':
      return InferenceMode.ONLY_ON_DEVICE;
    case 'only_in_cloud':
      return InferenceMode.ONLY_IN_CLOUD;
    default:
      return InferenceMode.PREFER_ON_DEVICE;
  }
}

export interface SummarizeInput {
  rawContent: string;
  url?: string;
  source: TuckSource;
  isPrivate: boolean;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface SummarizedOutput {
  title: string;
  summary: string;
  nextAction: string;
  tags: string[];
  isPrivate: boolean;
  inferenceMeta: InferenceMeta;
}

function safeParseJson<T>(raw: string): T | null {
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function buildLocalPreviewSummary(
  input: SummarizeInput,
  mode: HybridMode,
  latencyMs: number,
  reason: string
): SummarizedOutput {
  const cleanText = input.rawContent.trim();
  const firstLine = cleanText.split('\n')[0] || 'Saved item';
  const urlHost = input.url
    ? (() => {
        try {
          return new URL(input.url).hostname.replace(/^www\./, '');
        } catch {
          return '';
        }
      })()
    : '';

  const title =
    firstLine.length > 62
      ? `${firstLine.slice(0, 59).trim()}...`
      : firstLine || (urlHost ? `Saved from ${urlHost}` : 'Quick tuck');

  const lower = cleanText.toLowerCase();
  const tags: string[] = [];
  if (/(receipt|invoice|bill|bank|otp|doctor|dentist|medical|salary)/.test(lower)) {
    tags.push('private');
  }
  if (/(flight|hotel|kyoto|trip|travel|itinerary|map|train)/.test(lower)) {
    tags.push('travel');
  }
  if (/(recipe|cook|flour|bake|dinner|coffee|ramen)/.test(lower)) {
    tags.push('food');
  }
  if (/(read|article|docs|github|tutorial|css|react|firebase)/.test(lower)) {
    tags.push('reading');
  }
  if (tags.length === 0) {
    tags.push(input.source === 'screenshot' ? 'screenshot' : 'later');
  }

  const detectedPrivate = input.isPrivate || tags.includes('private');

  return {
    title,
    summary:
      cleanText.length > 140
        ? `${cleanText.slice(0, 137).trim()}...`
        : cleanText || 'Saved screenshot ready for daily triage.',
    nextAction: input.url
      ? `Open ${urlHost || 'link'} and decide whether to finish or close it.`
      : 'Review this item in your daily 3-card deck and take the next step.',
    tags: tags.slice(0, 3),
    isPrivate: detectedPrivate,
    inferenceMeta: {
      source: 'local-preview',
      model: 'Local preview (connect Firebase .env.local for live Hybrid AI)',
      latencyMs,
      modeUsed: mode,
      note: reason,
    },
  };
}

export async function summarizeTuckItem(
  input: SummarizeInput,
  requestedMode: HybridMode = 'prefer_on_device'
): Promise<SummarizedOutput> {
  const startedAt = performance.now();
  const effectiveMode: HybridMode = input.isPrivate
    ? requestedMode === 'only_in_cloud'
      ? 'prefer_on_device'
      : requestedMode
    : requestedMode;

  if (!ai) {
    return buildLocalPreviewSummary(
      input,
      effectiveMode,
      Math.max(12, Math.round(performance.now() - startedAt)),
      'Firebase config not set yet; running offline local preview.'
    );
  }

  const prompt = `You are Tuck, a quiet personal triage assistant.
Analyze the saved item below and return ONLY valid JSON with these keys:
{
  "title": "short human title (max 60 chars)",
  "summary": "1-2 plain sentences explaining why the user saved this",
  "nextAction": "one concrete next step (max 90 chars)",
  "tags": ["1 to 3 lowercase single-word tags"],
  "isPrivate": true or false (true if it has receipts, medical, financial, or personal chat details)
}

Source: ${input.source}
URL: ${input.url || 'none'}
Content:
${input.rawContent || '(image screenshot attached)'}`;

  try {
    const model = getGenerativeModel(ai, {
      mode: toSdkMode(effectiveMode),
      inCloudParams: {
        model: CLOUD_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
        },
      },
    });

    const parts: Array<
      string | { inlineData: { data: string; mimeType: string } }
    > = [prompt];

    if (input.imageBase64 && input.imageMimeType) {
      parts.push({
        inlineData: {
          data: input.imageBase64,
          mimeType: input.imageMimeType,
        },
      });
    }

    const result = await model.generateContent(parts);
    const latencyMs = Math.round(performance.now() - startedAt);
    const text = result.response.text();
    const parsed = safeParseJson<{
      title?: string;
      summary?: string;
      nextAction?: string;
      tags?: string[];
      isPrivate?: boolean;
    }>(text);

    const ranOnDevice =
      result.response.inferenceSource === InferenceSource.ON_DEVICE;

    const inferenceMeta: InferenceMeta = {
      source: ranOnDevice ? 'on-device' : 'cloud',
      model: ranOnDevice
        ? 'Gemini Nano (Chrome On-Device)'
        : `${CLOUD_MODEL} (Cloud Fallback)`,
      latencyMs,
      modeUsed: effectiveMode,
    };

    if (!parsed) {
      return {
        title: input.rawContent.slice(0, 56) || 'Tucked item',
        summary: text.slice(0, 180),
        nextAction: 'Review this saved item in your daily deck.',
        tags: [input.source === 'screenshot' ? 'screenshot' : 'saved'],
        isPrivate: input.isPrivate,
        inferenceMeta,
      };
    }

    return {
      title: parsed.title?.trim() || 'Tucked item',
      summary: parsed.summary?.trim() || input.rawContent.slice(0, 140),
      nextAction:
        parsed.nextAction?.trim() || 'Decide whether to act on or archive this.',
      tags:
        Array.isArray(parsed.tags) && parsed.tags.length > 0
          ? parsed.tags.slice(0, 3).map((t) => t.toLowerCase().trim())
          : ['saved'],
      isPrivate: Boolean(input.isPrivate || parsed.isPrivate),
      inferenceMeta,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);
    const message =
      error instanceof Error ? error.message : 'Hybrid inference unavailable';
    return buildLocalPreviewSummary(input, effectiveMode, latencyMs, message);
  }
}

export async function synthesizeItemsInCloud(
  items: TuckItem[]
): Promise<SynthesisResult> {
  const startedAt = performance.now();

  if (!ai) {
    const tags = Array.from(new Set(items.flatMap((i) => i.tags))).slice(0, 3);
    return {
      id: `syn-${Date.now()}`,
      title: `Combined plan (${items.length} tucked items)`,
      overview: `Connected ${items.length} saved items${tags.length ? ` around ${tags.join(', ')}` : ''}. Connect Firebase .env.local to run full Cloud Gemini multi-item synthesis.`,
      steps: items.map((item) => `${item.title}: ${item.nextAction}`),
      itemIds: items.map((i) => i.id),
      inferenceMeta: {
        source: 'local-preview',
        model: 'Local preview (Cloud Gemini ready once Firebase is linked)',
        latencyMs: Math.max(18, Math.round(performance.now() - startedAt)),
        modeUsed: 'only_in_cloud',
      },
      createdAt: Date.now(),
    };
  }

  const prompt = `You are Tuck's cloud synthesis engine.
The user selected ${items.length} separate saved tabs, screenshots, and notes. Combine them into one clear, actionable plan.
Return ONLY valid JSON:
{
  "title": "short clear plan title",
  "overview": "2-3 plain sentences connecting the items",
  "steps": ["3 to 6 concrete ordered steps"]
}

Items:
${items
  .map(
    (item, idx) =>
      `${idx + 1}. [${item.source}] ${item.title}\nSummary: ${item.summary}\nNext action: ${item.nextAction}\nURL: ${item.url || 'none'}`
  )
  .join('\n\n')}`;

  try {
    const model = getGenerativeModel(ai, {
      mode: InferenceMode.ONLY_IN_CLOUD,
      inCloudParams: {
        model: CLOUD_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
        },
      },
    });

    const result = await model.generateContent(prompt);
    const latencyMs = Math.round(performance.now() - startedAt);
    const text = result.response.text();
    const parsed = safeParseJson<{
      title?: string;
      overview?: string;
      steps?: string[];
    }>(text);

    return {
      id: `syn-${Date.now()}`,
      title: parsed?.title?.trim() || `Plan from ${items.length} tucked items`,
      overview: parsed?.overview?.trim() || text.slice(0, 260),
      steps:
        Array.isArray(parsed?.steps) && parsed.steps.length > 0
          ? parsed.steps
          : items.map((i) => i.nextAction),
      itemIds: items.map((i) => i.id),
      inferenceMeta: {
        source: 'cloud',
        model: `${CLOUD_MODEL} (Cloud Synthesis)`,
        latencyMs,
        modeUsed: 'only_in_cloud',
      },
      createdAt: Date.now(),
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - startedAt);
    const message =
      error instanceof Error ? error.message : 'Cloud synthesis failed';
    return {
      id: `syn-${Date.now()}`,
      title: `Combined plan (${items.length} tucked items)`,
      overview: `Combined ${items.length} selected items locally because Cloud Gemini returned an error: ${message}`,
      steps: items.map((item) => `${item.title}: ${item.nextAction}`),
      itemIds: items.map((i) => i.id),
      inferenceMeta: {
        source: 'local-preview',
        model: `${CLOUD_MODEL} fallback`,
        latencyMs,
        modeUsed: 'only_in_cloud',
        note: message,
      },
      createdAt: Date.now(),
    };
  }
}
