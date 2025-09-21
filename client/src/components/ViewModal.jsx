import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { CodeBlock } from './CodeBlock';
import { formatFieldValue, formatScript } from '../utils/format';

const SKIPPED_FIELDS = new Set(['active', 'html_template', 'css', 'client_script', 'server_script']);

export function ViewModal({
  open,
  snippet,
  typeDef,
  onClose,
  onCopyScript,
  onFullScreen,
  onEdit,
  onDelete,
  canManage
}) {
  const formattedScript = useMemo(() => formatScript(snippet?.script ?? ''), [snippet]);
  const [copyLabel, setCopyLabel] = useState('Copy');

  useEffect(() => {
    if (open) {
      setCopyLabel('Copy');
    }
  }, [open, snippet]);

  const handleCopy = async () => {
    await onCopyScript(formattedScript);
    setCopyLabel('Copied!');
    setTimeout(() => setCopyLabel('Copy'), 2000);
  };

  if (!open || !snippet) {
    return null;
  }

  return (
    <Modal open={open} onClose={onClose} labelledBy="viewModalTitle">
      <div className="modal-header">
        <div>
          <h2 id="viewModalTitle">{snippet.name}</h2>
          <p className="modal-subtitle">Inspect metadata, grab the code, and drop it into your instance.</p>
        </div>
        <div className="modal-header-actions">
          {canManage ? (
            <div className="modal-actions-group">
              <button type="button" className="btn btn-ghost" onClick={() => onEdit?.(snippet)}>
                Edit
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onDelete?.(snippet)}
              >
                Delete
              </button>
            </div>
          ) : null}
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close snippet details">
            &times;
          </button>
        </div>
      </div>
      <div className="modal-body view-modal">
        <div className="form-grid">
          <label className="field">
            <span>Snippet type</span>
            <div className="readonly-input">{typeDef?.label ?? snippet.type}</div>
          </label>

          {snippet.description ? (
            <label className="field field--span">
              <span>Description</span>
              <div className="readonly-textarea">{snippet.description}</div>
            </label>
          ) : null}
        </div>

        <div className="type-specific">
          {typeDef?.fields?.map((field) => {
            if (SKIPPED_FIELDS.has(field.id)) return null;
            const value = snippet.metadata?.[field.id];
            if (value === undefined || value === null || value === '') return null;

            if (field.id === 'filterCondition' && snippet.type === 'business_rule') {
              return (
                <label key={field.id} className="field field--span">
                  <span>{field.label}</span>
                  <div className="filter-conditions-readonly">
                    {value.length === 0 ? (
                      <p>No conditions added.</p>
                    ) : (
                      value.map((cond, index) => (
                        <div key={index} className="condition-row-readonly">
                          <span className="condition-field">{cond.field}</span>
                          <span className="condition-operator">{cond.operator}</span>
                          <span className="condition-value">"{cond.value}"</span>
                          {index > 0 && <span className="condition-connector">({cond.connector})</span>}
                        </div>
                      ))
                    )}
                  </div>
                </label>
              );
            }

            const formattedValue = formatFieldValue(field, value);
            let valueElement;
            const isSpan = field.type === 'textarea';
            if (field.type === 'textarea') {
              valueElement = <div className="readonly-textarea">{formattedValue}</div>;
            } else {
              valueElement = <div className="readonly-input">{formattedValue}</div>;
            }

            return (
              <label key={field.id} className={`field ${isSpan ? 'field--span' : ''}`}>
                <span>{field.label}</span>
                {valueElement}
              </label>
            );
          })}
          {typeDef?.fields?.length === 0 && (
            <p className="empty-hint">No metadata fields for this snippet type.</p>
          )}
        </div>

        {snippet.type === 'service_portal_widget' ? (
          <div className="widget-sections">
            {[
              { key: 'html_template', label: 'HTML Template', language: 'xml' },
              { key: 'css', label: 'CSS/SCSS', language: 'css' },
              { key: 'client_script', label: 'Client Script', language: 'javascript' },
              { key: 'server_script', label: 'Server Script', language: 'javascript' }
            ].map(({ key, label, language }) => {
              const content = snippet.metadata?.[key];
              if (!content) return null;
              const formatted = formatScript(content);
              return (
                <section key={key} className="modal-section script-section">
                  <div className="modal-section-header">
                    <h3>{label}</h3>
                    <div className="script-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={async () => {
                          await onCopyScript(formatted);
                          setCopyLabel('Copied!');
                          setTimeout(() => setCopyLabel('Copy'), 2000);
                        }}
                      >
                        {copyLabel}
                      </button>
                      <button
                        type="button"
                        className="btn btn-elevated"
                        onClick={() => onFullScreen(snippet, formatted)}
                      >
                        Full screen
                      </button>
                    </div>
                  </div>
                  <CodeBlock value={formatted} language={language} />
                </section>
              );
            })}
          </div>
        ) : (
          <section className="modal-section script-section">
            <div className="modal-section-header">
              <h3>Script</h3>
              <div className="script-actions">
                <button type="button" className="btn btn-ghost" onClick={handleCopy}>
                  {copyLabel}
                </button>
                <button type="button" className="btn btn-elevated" onClick={() => onFullScreen(snippet, formattedScript)}>
                  Full screen
                </button>
              </div>
            </div>
            <CodeBlock value={formattedScript} />
          </section>
        )}
      </div>
    </Modal>
  );
}
