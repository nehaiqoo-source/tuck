import { useRef, useState } from 'react';
import { ImagePlus, Lock, Plus, X } from 'lucide-react';
import type { TuckSource } from '../types';

interface QuickTuckComposerProps {
  busy: boolean;
  onTuck: (payload: {
    rawContent: string;
    url?: string;
    source: TuckSource;
    isPrivate: boolean;
    imageDataUrl?: string;
    imageBase64?: string;
    imageMimeType?: string;
  }) => Promise<void>;
}

const URL_REGEX = /https?:\/\/[^\s]+/i;

export function QuickTuckComposer({ busy, onTuck }: QuickTuckComposerProps) {
  const [text, setText] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [imagePreview, setImagePreview] = useState<{
    dataUrl: string;
    base64: string;
    mimeType: string;
    name: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
      setImagePreview({
        dataUrl,
        base64,
        mimeType: file.type || 'image/png',
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && !imagePreview) return;

    const urlMatch = trimmed.match(URL_REGEX);
    const url = urlMatch ? urlMatch[0] : undefined;
    const source: TuckSource = imagePreview
      ? 'screenshot'
      : url
        ? 'link'
        : 'note';

    await onTuck({
      rawContent: trimmed || `Screenshot: ${imagePreview?.name ?? 'capture'}`,
      url,
      source,
      isPrivate,
      imageDataUrl: imagePreview?.dataUrl,
      imageBase64: imagePreview?.base64,
      imageMimeType: imagePreview?.mimeType,
    });

    setText('');
    setIsPrivate(false);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <form className="composer" onSubmit={handleSubmit}>
      <div className="composer-label">
        <span>Tuck a tab link, quick note, or screenshot</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="filter-pill"
            onClick={() => {
              setText(
                'Lab report receipt from Apollo Diagnostics — ₹2,150 paid Nov 18, claim under medical reimbursement before Dec 10.'
              );
              setIsPrivate(true);
            }}
          >
            Try private receipt
          </button>
          <button
            type="button"
            className="filter-pill"
            onClick={() => {
              setText(
                'https://www.japan-guide.com/e/e3900.html - Nishiki Market opens at 9:30am, try matcha warabimochi and tamagoyaki.'
              );
              setIsPrivate(false);
            }}
          >
            Try Kyoto tab
          </button>
        </div>
      </div>

      <textarea
        className="composer-input"
        placeholder="Paste a URL you swear you'll read later, a messy thought, or attach a screenshot..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={busy}
      />

      {imagePreview && (
        <div className="preview-thumb">
          <img src={imagePreview.dataUrl} alt="Attached screenshot preview" />
          <span>{imagePreview.name}</span>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: '2px 6px', borderRadius: 6 }}
            onClick={() => setImagePreview(null)}
            aria-label="Remove screenshot"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="composer-footer">
        <div className="composer-tools">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            <ImagePlus size={15} />
            Add screenshot
          </button>

          <label className="toggle-pill">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={busy}
            />
            <Lock size={13} />
            Private (keep on-device)
          </label>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || (!text.trim() && !imagePreview)}
        >
          <Plus size={16} />
          {busy ? 'Tucking...' : 'Tuck it'}
        </button>
      </div>
    </form>
  );
}
