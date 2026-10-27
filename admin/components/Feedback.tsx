'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type Tone = 'success' | 'error' | 'warning' | 'info';

type ToastInput = { title: string; message?: string; tone?: Tone; duration?: number };
type ConfirmInput = { title: string; message?: string; confirmText?: string; cancelText?: string; danger?: boolean };

type Feedback = {
  toast: (t: ToastInput) => void;
  /** Resolves true when the confirm button is clicked. Replaces window.confirm. */
  confirm: (c: ConfirmInput) => Promise<boolean>;
};

const FeedbackContext = createContext<Feedback | null>(null);

const ICONS: Record<Tone | 'danger', ReactNode> = {
  success: <path d="M5 12.5l4.2 4.2L19 7" />,
  error: <><path d="M12 7.5v6" /><path d="M12 17h.01" /></>,
  warning: <><path d="M12 8v5" /><path d="M12 16.5h.01" /></>,
  info: <><path d="M12 11v6" /><path d="M12 7.5h.01" /></>,
  danger: <><path d="M5 7h14" /><path d="M10 11v6M14 11v6" /><path d="M6.5 7l1 12h9l1-12M9.5 7V4.5h5V7" /></>,
};

export function ToneIcon({ tone }: { tone: Tone | 'danger' }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[tone]}
    </svg>
  );
}

type ToastItem = ToastInput & { id: number; leaving?: boolean };
type Pending = ConfirmInput & { resolve: (ok: boolean) => void; leaving?: boolean };

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const nextId = useRef(0);
  const confirmBtn = useRef<HTMLButtonElement>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 220);
  }, []);

  const toast = useCallback((t: ToastInput) => {
    const id = nextId.current++;
    setToasts((list) => [...list.slice(-3), { ...t, id }]);
    setTimeout(() => dismiss(id), t.duration ?? 4000);
  }, [dismiss]);

  const confirm = useCallback((c: ConfirmInput) => new Promise<boolean>((resolve) => setPending({ ...c, resolve })), []);

  const pendingRef = useRef<Pending | null>(null);
  pendingRef.current = pending;

  const answer = useCallback((ok: boolean) => {
    const p = pendingRef.current;
    if (!p || p.leaving) return;
    p.resolve(ok);
    setPending({ ...p, leaving: true });
    setTimeout(() => setPending(null), 180);
  }, []);

  useEffect(() => {
    if (!pending) return;
    confirmBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && answer(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, answer]);

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => {
          const tone = t.tone ?? 'info';
          return (
            <div key={t.id} className={`toast ${tone}${t.leaving ? ' leaving' : ''}`} onClick={() => dismiss(t.id)}>
              <span className="toast-icon"><ToneIcon tone={tone} /></span>
              <div className="toast-body">
                <strong>{t.title}</strong>
                {t.message && <span>{t.message}</span>}
              </div>
              <button className="toast-close" aria-label="Dismiss">×</button>
              <span className="toast-timer" style={{ animationDuration: `${t.duration ?? 4000}ms` }} />
            </div>
          );
        })}
      </div>

      {pending && (
        <div className={`dialog-backdrop${pending.leaving ? ' leaving' : ''}`} onMouseDown={() => answer(false)}>
          <div className="dialog" role="alertdialog" aria-modal aria-labelledby="dialog-title" onMouseDown={(e) => e.stopPropagation()}>
            <div className={`dialog-icon ${pending.danger ? 'danger' : 'info'}`}>
              <ToneIcon tone={pending.danger ? 'danger' : 'info'} />
            </div>
            <h3 id="dialog-title">{pending.title}</h3>
            {pending.message && <p>{pending.message}</p>}
            <div className="dialog-actions">
              <button className="btn" onClick={() => answer(false)}>{pending.cancelText ?? 'Cancel'}</button>
              <button ref={confirmBtn} className={`btn ${pending.danger ? 'solid-danger' : 'primary'}`} onClick={() => answer(true)}>
                {pending.confirmText ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
}

/** Inline notice for forms and pages; a styled replacement for bare error/success text. */
export function Notice({ tone, children, onClose }: { tone: Tone; children: ReactNode; onClose?: () => void }) {
  return (
    <div className={`notice ${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span className="notice-icon"><ToneIcon tone={tone} /></span>
      <div className="notice-body">{children}</div>
      {onClose && <button className="notice-close" onClick={onClose} aria-label="Dismiss">×</button>}
    </div>
  );
}
