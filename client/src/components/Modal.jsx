import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const modalRoot = typeof document !== 'undefined' ? document.body : null;

export function Modal({ open, onClose, children, className = '', labelledBy }) {
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

  if (!open || !modalRoot) {
    return null;
  }

  return createPortal(
    <>
      <div className="modal-overlay" onClick={() => onClose?.()} />
      <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </>,
    modalRoot
  );
}
