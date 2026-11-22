import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { InferenceMeta } from '../types';
import { InferenceBadge } from './InferenceBadge';

export interface InferenceLogEntry {
  id: string;
  task: string;
  meta: InferenceMeta;
  timestamp: number;
}

interface HybridLogDialogProps {
  open: boolean;
  entries: InferenceLogEntry[];
  onClose: () => void;
}

export function HybridLogDialog({
  open,
  entries,
  onClose,
}: HybridLogDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    let cleanupOutside: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      const onDown = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const onUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e)) dialog.close();
      };
      dialog.addEventListener('pointerdown', onDown);
      dialog.addEventListener('pointerup', onUp);
      cleanupOutside = () => {
        dialog.removeEventListener('pointerdown', onDown);
        dialog.removeEventListener('pointerup', onUp);
      };
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      cleanupOutside?.();
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="hybrid-log-title"
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div className="dialog-inner">
        <div className="dialog-head">
          <div>
            <h2 id="hybrid-log-title" className="dialog-title">
              Hybrid AI inference log
            </h2>
            <p className="section-meta" style={{ margin: '4px 0 0' }}>
              Live routing trace from Firebase AI Logic (`PREFER_ON_DEVICE` vs
              `ONLY_IN_CLOUD`).
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: 8, borderRadius: 999 }}
            onClick={() => dialogRef.current?.close()}
            aria-label="Close hybrid AI log"
          >
            <X size={18} />
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="section-meta">
            Tuck an item or synthesize 2+ shelf items to inspect real inference
            routing here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  background: 'var(--bg)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <strong style={{ fontSize: '0.86rem' }}>{entry.task}</strong>
                  <InferenceBadge meta={entry.meta} />
                </div>
                <div className="section-meta" style={{ fontSize: '0.78rem' }}>
                  {entry.meta.model} · mode: {entry.meta.modeUsed}
                  {entry.meta.note ? ` · ${entry.meta.note}` : ''}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="dialog-actions">
          <form method="dialog">
            <button type="submit" className="btn btn-primary" autoFocus>
              Close
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
}
