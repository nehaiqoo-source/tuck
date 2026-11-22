export type TuckSource =
  | 'chrome-tab'
  | 'screenshot'
  | 'link'
  | 'note'
  | 'android'
  | 'ios';

export type TuckStatus = 'tucked' | 'kept' | 'done' | 'let-go';

export type HybridMode = 'prefer_on_device' | 'only_on_device' | 'only_in_cloud';

export type InferenceSourceLabel = 'on-device' | 'cloud' | 'local-preview';

export interface InferenceMeta {
  source: InferenceSourceLabel;
  model: string;
  latencyMs: number;
  modeUsed: HybridMode;
  note?: string;
}

export interface TuckItem {
  id: string;
  title: string;
  rawContent: string;
  url?: string;
  imageDataUrl?: string;
  source: TuckSource;
  summary: string;
  nextAction: string;
  tags: string[];
  isPrivate: boolean;
  status: TuckStatus;
  inferenceMeta: InferenceMeta;
  createdAt: number;
  updatedAt: number;
}

export interface SynthesisResult {
  id: string;
  title: string;
  overview: string;
  steps: string[];
  itemIds: string[];
  inferenceMeta: InferenceMeta;
  createdAt: number;
}
