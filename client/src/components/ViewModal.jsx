import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { CodeBlock } from './CodeBlock';
import { formatFieldValue, formatScript } from '../utils/format';

const SKIPPED_FIELDS = new Set(['active']);

export function ViewModal({
  open,
  snippet,
  typeDef,
  onClose,
  onCopyScript,
  onFullScreen
}) {
  const formattedScript = useMemo(() => formatScript(snippet?.script ?? ''), [snippet]);
  const [copyLabel, setCopyLabel] = useState('Copy script');

  useEffect(() => {
    if (open) {
      setCopyLabel('Copy script');
    }
  }, [open, snippet]);

  const handleCopy = async () => {
    await onCopyScript(formattedScript);
    setCopyLabel('Copied!');
    setTimeout(() => setCopyLabel('Copy script'), 2000);
  };

  if (!open || !snippet) {
    return null;
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="viewModalTitle">
      <div className="modal-header">
        <h2 id="viewModalTitle">{snippet.name}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close snippet details">
          &times;
        </button>
      </div>
      <div className="modal-body view-modal">
        <section className="modal-section">
          <h3>Details</h3>
          <div className="view-meta">
            <div className="view-meta-row">
              <span className="view-meta-label">Type</span>
              <span className="view-meta-value">{typeDef?.label ?? snippet.type}</span>
            </div>
            {snippet.description ? (
              <div className="view-meta-row">
                <span className="view-meta-label">Description</span>
                <span className="view-meta-value">{snippet.description}</span>
              </div>
            ) : null}
            {typeDef?.fields?.map((field) => {
              if (SKIPPED_FIELDS.has(field.id)) return null;
              const value = snippet.metadata?.[field.id];
              if (value === undefined || value === null || value === '') return null;
              return (
                <div key={field.id} className="view-meta-row">
                  <span className="view-meta-label">{field.label}</span>
                  <span className="view-meta-value">{formatFieldValue(field, value)}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="modal-section script-section">
          <div className="modal-section-header">
            <h3>Script</h3>
            <div className="script-actions">
              <button type="button" className="ghost small" onClick={handleCopy}>
                {copyLabel}
              </button>
              <button
                type="button"
                className="ghost small"
                onClick={() => onFullScreen(snippet, formattedScript)}
              >
                Full screen
              </button>
            </div>
          </div>
          <CodeBlock value={formattedScript} />
        </section>
      </div>
    </Modal>
  );
}
