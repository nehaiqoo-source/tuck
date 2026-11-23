import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { signInWithEmail, signInWithGoogle } from '../services/firebase';

interface AuthDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AuthDialog({ open, onClose }: AuthDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      setError('Enter a valid email and 6+ character password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await signInWithEmail(email.trim(), password);
      dialogRef.current?.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
      dialogRef.current?.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="auth-dialog-title"
      {...({ closedby: 'any' } as Record<string, string>)}
    >
      <div className="dialog-inner">
        <div className="dialog-head">
          <div>
            <h2 id="auth-dialog-title" className="dialog-title">
              Sync across Web &amp; Android
            </h2>
            <p className="section-meta" style={{ margin: '4px 0 0' }}>
              Use the same email and password on Web and Android to sync your
              Read Later queue and Bookmarks in real time.
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost"
            style={{ padding: 8, borderRadius: 999 }}
            onClick={() => dialogRef.current?.close()}
            aria-label="Close sign-in dialog"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={handleEmailSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          <input
            type="email"
            className="search-input"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            autoFocus
            required
          />
          <input
            type="password"
            className="search-input"
            placeholder="Password (6+ characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            minLength={6}
            required
          />
          {error && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--accent)' }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Signing in...' : 'Continue with Email'}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            margin: '14px 0',
            fontSize: '0.8rem',
            color: 'var(--ink-soft)',
          }}
        >
          or
        </div>

        <button
          type="button"
          className="btn"
          style={{ width: '100%' }}
          onClick={handleGoogle}
          disabled={busy}
        >
          Continue with Google
        </button>
      </div>
    </dialog>
  );
}
