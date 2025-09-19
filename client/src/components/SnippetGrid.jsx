import { CodeBlock } from './CodeBlock';
import { formatFieldValue } from '../utils/format';

function SnippetCard({
  snippet,
  typeDef,
  isOwner,
  onView,
  onEdit,
  onDelete
}) {
  const updatedAt = snippet.updatedAt ? new Date(snippet.updatedAt) : null;
  const owner = snippet.owner?.email ? ` by ${snippet.owner.email}` : '';
  const updatedLabel = updatedAt ? `Updated ${updatedAt.toLocaleString()}${owner}` : owner || '';
  const scriptPreview = (snippet.script ?? '').trim();

  return (
    <article className="snippet-card">
      <header>
        <h3>{snippet.name}</h3>
        <span className="badge">{typeDef?.label ?? snippet.type}</span>
      </header>
      {snippet.description ? (
        <p className="snippet-description">{snippet.description}</p>
      ) : null}

      {typeDef?.fields?.length ? (
        <div className="snippet-meta">
          {typeDef.fields
            .filter((field) => field.id in (snippet.metadata || {}))
            .map((field) => {
              const value = snippet.metadata?.[field.id];
              if (value === '' || value === null || value === undefined) {
                return null;
              }
              return (
                <span key={field.id}>
                  <strong>{field.label}:</strong> {formatFieldValue(field, value)}
                </span>
              );
            })}
        </div>
      ) : null}

      {scriptPreview ? <CodeBlock value={scriptPreview} /> : null}

      <div className="snippet-actions">
        <span className="muted">{updatedLabel}</span>
        <div className="action-group">
          <button type="button" className="ghost" onClick={() => onView(snippet)}>
            View
          </button>
          {isOwner ? (
            <>
              <button type="button" className="ghost" onClick={() => onEdit(snippet)}>
                Edit
              </button>
              <button type="button" className="ghost" onClick={() => onDelete(snippet)}>
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function SnippetGrid({
  snippets,
  snippetTypeMap,
  currentUser,
  onViewSnippet,
  onEditSnippet,
  onDeleteSnippet,
  isLoading,
  error
}) {
  if (error) {
    return (
      <div className="snippets-container">
        <div className="empty-state">
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="snippets-container">
        <div className="empty-state">
          <h2>Loading snippets…</h2>
          <p>Please wait a moment.</p>
        </div>
      </div>
    );
  }

  if (!snippets.length) {
    return (
      <div className="snippets-container">
        <div className="empty-state">
          <h2>No snippets yet</h2>
          <p>Adjust your filters or add the first snippet for your team.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="snippets-container">
      <div className="snippet-grid">
        {snippets.map((snippet) => (
          <SnippetCard
            key={snippet.id}
            snippet={snippet}
            typeDef={snippetTypeMap[snippet.type]}
            isOwner={Boolean(currentUser && snippet.owner?.email === currentUser.email)}
            onView={onViewSnippet}
            onEdit={onEditSnippet}
            onDelete={onDeleteSnippet}
          />
        ))}
      </div>
    </div>
  );
}
