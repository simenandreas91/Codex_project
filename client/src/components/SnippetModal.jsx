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
    if (field.id === 'filterCondition') {
      normalized[field.id] = rawValue;
      return;
    }
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

  const commonOperators = ['=', '!=', 'IN', 'NOT IN', 'LIKE', 'STARTSWITH', 'ENDSWITH', 'ISNULL', 'ISNOTNULL'];

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
    let initial = buildMetadata(typeDef, snippet?.metadata, {
      preserve: Boolean(snippet && snippet.type === typeId)
    });
    if (typeId === 'business_rule' && !initial.filterCondition) {
      initial.filterCondition = [];
    }
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

  const updateCondition = (index, key, value) => {
    setMetadata((prev) => {
      const newConditions = [...(prev.filterCondition || [])];
      newConditions[index] = { ...newConditions[index], [key]: value };
      return { ...prev, filterCondition: newConditions };
    });
  };

  const addCondition = () => {
    setMetadata((prev) => ({
      ...prev,
      filterCondition: [...(prev.filterCondition || []), { field: '', operator: '', value: '', connector: 'AND' }]
    }));
  };

  const removeCondition = (index) => {
    setMetadata((prev) => {
      const newConditions = (prev.filterCondition || []).filter((_, i) => i !== index);
      return { ...prev, filterCondition: newConditions };
    });
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

  const parseXMLToSnippet = (xmlDoc) => {
    const sysScript = xmlDoc.querySelector('sys_script');
    if (!sysScript) {
      alert('Invalid XML: No <sys_script> found. This feature supports Business Rule XML exports.');
      return null;
    }

    const typeId = 'business_rule';
    const name = sysScript.querySelector('name')?.textContent?.trim() || '';
    const description = sysScript.querySelector('description')?.textContent?.trim() || `Business Rule: ${name}`;
    let script = '';
    const scriptNode = sysScript.querySelector('script');
    if (scriptNode) {
      script = scriptNode.textContent?.trim() || '';
    }
    const filterConditionNode = sysScript.querySelector('filter_condition');
    const items = filterConditionNode?.querySelectorAll('item') || [];
    const filterConditions = Array.from(items)
      .filter(item => item.getAttribute('field') !== '')
      .map(item => ({
        field: item.getAttribute('field') || '',
        operator: item.getAttribute('operator') || '=',
        value: item.getAttribute('value') || '',
        connector: item.getAttribute('or') === 'true' ? 'OR' : 'AND'
      }));

    const metadata = {
      application: sysScript.querySelector('sys_domain')?.textContent?.trim() || 'Global',
      table: sysScript.querySelector('collection')?.textContent?.trim() || filterConditionNode?.getAttribute('table') || '',
      when: sysScript.querySelector('when')?.textContent?.trim() || '',
      order: parseInt(sysScript.querySelector('order')?.textContent || '100', 10),
      active: sysScript.querySelector('active')?.textContent === 'true',
      condition: sysScript.querySelector('condition')?.textContent?.trim() || '',
      filterCondition: filterConditions,
    };

    return { typeId, name, description, script, metadata };
  };

  const handleXmlUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(e.target.result, 'text/xml');
        if (xmlDoc.querySelector('parsererror')) {
          throw new Error('Invalid XML format');
        }

        const parsed = parseXMLToSnippet(xmlDoc);
        if (parsed) {
          setTypeId(parsed.typeId);
          setName(parsed.name);
          setDescription(parsed.description);
          setScript(parsed.script);
          // Delay metadata set to allow type change to take effect
          setTimeout(() => {
            setMetadata((prev) => ({ ...prev, ...parsed.metadata }));
          }, 0);
          event.target.value = ''; // Clear file input
          alert('XML parsed successfully! Form fields have been populated.');
        }
      } catch (err) {
        console.error('XML parsing error:', err);
        alert('Error parsing XML: ' + err.message + '. Please check the file and try again.');
      }
    };
    reader.readAsText(file);
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

      {!snippet && (
        <div className="upload-section">
          <label className="field field--span">
            <span>Or upload ServiceNow XML to auto-fill (Business Rules supported)</span>
            <input
              type="file"
              accept=".xml"
              onChange={handleXmlUpload}
              style={{ marginTop: '0.5rem' }}
            />
          </label>
        </div>
      )}
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

              if (field.id === 'filterCondition' && typeId === 'business_rule') {
                return (
                  <label key={field.id} className="field field--span">
                    <span>{field.label}</span>
                    <div className="filter-conditions">
                      {(metadata.filterCondition || []).length === 0 ? (
                        <p>No conditions added.</p>
                      ) : (
                        metadata.filterCondition.map((cond, index) => (
                          <div key={index} className="condition-row" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                            <input
                              type="text"
                              value={cond.field || ''}
                              placeholder="Field"
                              onChange={(e) => updateCondition(index, 'field', e.target.value)}
                              style={{ flex: 1 }}
                            />
                            <select
                              value={cond.operator || ''}
                              onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                              style={{ minWidth: '80px' }}
                            >
                              <option value="">Op</option>
                              {commonOperators.map((op) => (
                                <option key={op} value={op}>{op}</option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={cond.value || ''}
                              placeholder="Value"
                              onChange={(e) => updateCondition(index, 'value', e.target.value)}
                              style={{ flex: 2 }}
                            />
                            {index > 0 && (
                              <select
                                value={cond.connector || 'AND'}
                                onChange={(e) => updateCondition(index, 'connector', e.target.value)}
                                style={{ minWidth: '60px' }}
                              >
                                <option value="AND">AND</option>
                                <option value="OR">OR</option>
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => removeCondition(index)}
                              style={{ background: 'red', color: 'white', border: 'none', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                            >
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                      <button
                        type="button"
                        onClick={addCondition}
                        style={{ marginTop: '0.5rem', background: 'blue', color: 'white', border: 'none', padding: '0.25rem 0.5rem', cursor: 'pointer' }}
                      >
                        Add Condition
                      </button>
                    </div>
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
