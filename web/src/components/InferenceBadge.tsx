import { Cloud, Cpu, Sparkles } from 'lucide-react';
import type { InferenceMeta } from '../types';

interface InferenceBadgeProps {
  meta: InferenceMeta;
}

export function InferenceBadge({ meta }: InferenceBadgeProps) {
  const Icon =
    meta.source === 'on-device'
      ? Cpu
      : meta.source === 'cloud'
        ? Cloud
        : Sparkles;

  const label =
    meta.source === 'on-device'
      ? 'On-Device'
      : meta.source === 'cloud'
        ? 'Cloud Fallback'
        : 'Local Preview';

  return (
    <span
      className={`inference-badge ${meta.source}`}
      title={`${meta.model}${meta.note ? ` (${meta.note})` : ''}`}
    >
      <Icon size={13} aria-hidden="true" />
      <span>{label}</span>
      <span>·</span>
      <span>{meta.latencyMs}ms</span>
    </span>
  );
}
