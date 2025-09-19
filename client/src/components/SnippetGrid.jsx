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
  const ownerEmail = snippet.owner?.email ?? '';
  const ownerLabel = ownerEmail ? ` by ${ownerEmail}` : '';
  const updatedLabel = updatedAt
    ? `Updated ${updatedAt.toLocaleString()}${ownerLabel}`
    : ownerLabel || 'Shared library';
  return (
    <article className="snippet-card">
      <div className="snippet-card__glow" aria-hidden="true" />
      <div className="snippet-card__body">
        <header className="snippet-card__header">
          <div className="snippet-card__heading">
            <span className="snippet-card__badge">{typeDef?.label ?? snippet.type}</span>
            <h3 className="snippet-card__title">{snippet.name}</h3>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => onView(snippet)}>
            View details
          </button>
        </header>

        {snippet.description ? (
          <p className="snippet-card__description">{snippet.description}</p>
        ) : null}

        {typeDef?.fields?.length ? (
          <dl className="snippet-card__metadata">
            {typeDef.fields
              .filter((field) => field.id in (snippet.metadata || {}))
              .map((field) => {
                const value = snippet.metadata?.[field.id];
                if (value === '' || value === null || value === undefined) {
                  return null;
                }
                return (
                  <div key={field.id} className="snippet-card__metadata-row">
                    <dt>{field.label}</dt>
                    <dd>{formatFieldValue(field, value)}</dd>
                  </div>
                );
              })}
          </dl>
        ) : null}

        <footer className="snippet-card__footer">
          <div className="snippet-card__meta">
            <span>{updatedLabel}</span>
          </div>
          <div className="snippet-card__actions">
            {isOwner ? (
              <>
                <button type="button" className="btn btn-ghost" onClick={() => onEdit(snippet)}>
                  Edit
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => onDelete(snippet)}>
                  Delete
                </button>
              </>
            ) : null}
            <button type="button" className="btn btn-elevated" onClick={() => onView(snippet)}>
              Open snippet
            </button>
          </div>
        </footer>
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
          <h2>Fetching curated snippets</h2>
          <p>Hold tight while we surface automation gold for you.</p>
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
