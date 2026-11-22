import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { SynthesisResult } from '../types';
import { InferenceBadge } from './InferenceBadge';

interface SynthesisDialogProps {
  result: SynthesisResult | null;
  onClose: () => void;
}

export function SynthesisDialog({ result, onClose }: SynthesisDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (result && !dialog.open) {
      dialog.showModal();
    } else if (!result && dialog.open) {
      dialog.close();
    }
  }, [result]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    // Fallback for browsers without native closedby="any" (e.g. Safari)
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
      aria-labelledby="synthesis-dialog-title"
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      {result && (
        <div className="dialog-inner">
          <div className="dialog-head">
            <div>
              <InferenceBadge meta={result.inferenceMeta} />
              <h2
                id="synthesis-dialog-title"
                className="dialog-title"
                style={{ marginTop: 10 }}
              >
                {result.title}
              </h2>
            </div>
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: 8, borderRadius: 999 }}
              onClick={() => dialogRef.current?.close()}
              aria-label="Close synthesis plan"
            >
              <X size={18} />
            </button>
          </div>

          <p className="triage-summary">{result.overview}</p>

          <ol className="steps-list">
            {result.steps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>

          <div className="dialog-actions">
            <form method="dialog">
              <button type="submit" className="btn btn-primary" autoFocus>
                Done
              </button>
            </form>
          </div>
        </div>
      )}
    </dialog>
  );
}
