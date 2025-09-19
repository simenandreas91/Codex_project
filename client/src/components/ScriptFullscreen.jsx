import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CodeBlock } from './CodeBlock';

const portalTarget = typeof document !== 'undefined' ? document.body : null;

export function ScriptFullscreen({ open, title, script, onClose, onCopy }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKey);
    document.body.classList.add('modal-open');
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.classList.remove('modal-open');
    };
  }, [open, onClose]);

  if (!open || !portalTarget) {
    return null;
  }

  return createPortal(
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="script-fullscreen" role="dialog" aria-modal="true">
        <div className="script-fullscreen-header">
          <h2>{title ? `${title} — Script` : 'Script preview'}</h2>
          <div className="script-fullscreen-actions">
            <button type="button" className="ghost small" onClick={() => onCopy(script)}>
              Copy
            </button>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Close script full screen">
              &times;
            </button>
          </div>
        </div>
        <CodeBlock value={script} className="fullscreen" />
      </div>
    </>,
    portalTarget
  );
}
