function SnippetCard({ snippet, typeDef, onView }) {
  const handleActivate = () => {
    onView(snippet);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onView(snippet);
    }
  };

  return (
    <article
      className="snippet-card snippet-card--compact"
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
      aria-label={'View details for ' + snippet.name}
    >
      <div className="snippet-card__glow" aria-hidden="true" />
      <div className="snippet-card__body">
        <div className="snippet-card__heading">
          <span className="snippet-card__badge">{typeDef?.label ?? snippet.type}</span>
          <h3 className="snippet-card__title">{snippet.name}</h3>
        </div>

        {snippet.description ? (
          <p className="snippet-card__description">{snippet.description}</p>
        ) : null}
      </div>
    </article>
  );
}

export function SnippetGrid({
  snippets,
  snippetTypeMap,
  onViewSnippet,
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
            onView={onViewSnippet}
          />
        ))}
      </div>
    </div>
  );
}
