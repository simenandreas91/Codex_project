import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';

function buildMetadata(typeDef, sourceMetadata, options = { preserve: false }) {
  if (!typeDef?.fields?.length) return {};
  const next = {};
  typeDef.fields.forEach((field) => {
    if (field.type === 'checkbox') {
      if (options.preserve && sourceMetadata && field.id in sourceMetadata) {
        next[field.id] = Boolean(sourceMetadata[field.id]);
      } else {
        next[field.id] = Boolean(sourceMetadata?.[field.id] ?? field.defaultValue ?? false);
      }
      return;
    }

    if (field.type === 'select') {
      const sourceValue = options.preserve ? sourceMetadata?.[field.id] : undefined;
      if (sourceValue) {
        next[field.id] = sourceValue;
      } else if (sourceMetadata?.[field.id]) {
        next[field.id] = sourceMetadata[field.id];
      } else {
        next[field.id] = field.options?.[0] ?? '';
      }
      return;
    }

    if (options.preserve && sourceMetadata && field.id in sourceMetadata) {
      next[field.id] = sourceMetadata[field.id];
      return;
    }

    next[field.id] = sourceMetadata?.[field.id] ?? '';
  });

  return next;
}

function normalizeMetadata(typeDef, metadataState) {
  if (!typeDef?.fields?.length) return {};
  const normalized = {};
  typeDef.fields.forEach((field) => {
    if (!(field.id in metadataState)) {
      return;
    }
    const rawValue = metadataState[field.id];
    if (field.type === 'checkbox') {
      normalized[field.id] = Boolean(rawValue);
      return;
    }

    if (field.type === 'number') {
      const parsed = Number(rawValue);
      if (!Number.isNaN(parsed)) {
        normalized[field.id] = parsed;
      }
      return;
    }

    const trimmed = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
    if (trimmed !== '' && trimmed !== null && trimmed !== undefined) {
      normalized[field.id] = trimmed;
    }
  });
  return normalized;
}

export function SnippetModal({
  open,
  snippet,
  snippetTypes,
  snippetTypeMap,
  defaultType,
  onClose,
  onSubmit,
  error,
  isSubmitting
}) {
  const [typeId, setTypeId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [script, setScript] = useState('');
  const [metadata, setMetadata] = useState({});

  useEffect(() => {
    if (!open) return;
    const initialType = snippet?.type ?? defaultType ?? snippetTypes[0]?.id ?? '';
    setTypeId(initialType);
    setName(snippet?.name ?? '');
    setDescription(snippet?.description ?? '');
    setScript(snippet?.script ?? '');
    const typeDef = snippetTypeMap[initialType];
    setMetadata(buildMetadata(typeDef, snippet?.metadata));
  }, [open, snippet, defaultType, snippetTypes, snippetTypeMap]);

  const typeDef = useMemo(() => snippetTypeMap[typeId], [snippetTypeMap, typeId]);

  useEffect(() => {
    if (!open) return;
    const initial = buildMetadata(typeDef, snippet?.metadata, {
      preserve: Boolean(snippet && snippet.type === typeId)
    });
    setMetadata(initial);
  }, [typeDef, typeId, open, snippet]);

  const handleTypeChange = (event) => {
    const newTypeId = event.target.value;
    setTypeId(newTypeId);
    const newTypeDef = snippetTypeMap[newTypeId];
    setMetadata(buildMetadata(newTypeDef, snippet?.metadata));
  };

  const handleMetadataChange = (field, value) => {
    setMetadata((prev) => ({ ...prev, [field.id]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!typeId || !name.trim()) {
      return;
    }
    const cleanMetadata = normalizeMetadata(typeDef, metadata);
    onSubmit({
      id: snippet?.id,
      type: typeId,
      name: name.trim(),
      description: description.trim(),
      script,
      metadata: cleanMetadata
    });
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="snippetModalTitle">
      <div className="modal-header">
        <div>
          <h2 id="snippetModalTitle">{snippet ? 'Edit snippet' : 'New snippet'}</h2>
          <p className="modal-subtitle">
            Capture the essentials, drop in your script, and share a production-ready automation blueprint.
          </p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close snippet modal">
          &times;
        </button>
      </div>
      <form className="modal-body" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field">
            <span>Snippet type</span>
            <select value={typeId} required onChange={handleTypeChange}>
              <option value="" disabled>
                Select a snippet type
              </option>
              {snippetTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Name</span>
            <input
              type="text"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Meaningful snippet name"
            />
          </label>

          <label className="field field--span">
            <span>Description</span>
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What problem does this solve?"
            />
          </label>
        </div>

        <div className="type-specific">
          {typeDef ? (
            typeDef.fields?.map((field) => {
              const value = metadata[field.id];
              if (field.type === 'checkbox') {
                return (
                  <label key={field.id} className="field checkbox-field">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) => handleMetadataChange(field, event.target.checked)}
                    />
                    <span>{field.label}</span>
                  </label>
                );
              }

              if (field.type === 'select') {
                return (
                  <label key={field.id} className="field">
                    <span>{field.label}</span>
                    <select
                      value={value ?? ''}
                      required={Boolean(field.required)}
                      onChange={(event) => handleMetadataChange(field, event.target.value)}
                    >
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              }

              const inputProps = {
                value: value ?? '',
                required: Boolean(field.required),
                placeholder: field.placeholder ?? '',
                onChange: (event) => handleMetadataChange(field, event.target.value)
              };

              if (field.type === 'textarea') {
                return (
                  <label key={field.id} className="field field--span">
                    <span>{field.label}</span>
                    <textarea rows={3} {...inputProps} />
                  </label>
                );
              }

              if (field.type === 'number') {
                return (
                  <label key={field.id} className="field">
                    <span>{field.label}</span>
                    <input type="number" {...inputProps} />
                  </label>
                );
              }

              return (
                <label key={field.id} className="field">
                  <span>{field.label}</span>
                  <input type="text" {...inputProps} />
                </label>
              );
            })
          ) : (
            <p className="empty-hint">Pick a snippet type to surface its signature metadata.</p>
          )}
        </div>

        <label className="field field--span">
          <span>Script</span>
          <textarea
            rows={10}
            value={script}
            onChange={(event) => setScript(event.target.value)}
            placeholder="// Paste your ServiceNow script here"
          />
        </label>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="form-actions">
          <button type="submit" className="btn btn-gradient" disabled={isSubmitting}>
            {isSubmitting ? (snippet ? 'Updating…' : 'Saving…') : snippet ? 'Update snippet' : 'Save snippet'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
