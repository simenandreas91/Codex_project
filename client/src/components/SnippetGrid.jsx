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

function PaginationBar({ pagination, onChange }) {
  if (!pagination) {
    return null;
  }

  const totalPages = Math.max(1, pagination.totalPages ?? 1);
  const page = Math.min(Math.max(1, pagination.page ?? 1), totalPages);
  const limit = pagination.limit ?? 0;
  const total = pagination.total ?? 0;
  const safeLimit = limit > 0 ? limit : totalPages > 0 ? Math.ceil(total / totalPages) : 0;

  if (totalPages <= 1 && (!safeLimit || total <= safeLimit)) {
    return null;
  }

  const rangeStart = total === 0 ? 0 : (page - 1) * (safeLimit || 1) + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(total, page * (safeLimit || 1));

  const handlePrev = () => {
    if (page > 1 && onChange) {
      onChange(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages && onChange) {
      onChange(page + 1);
    }
  };

  return (
    <div className="pagination-bar" role="navigation" aria-label="Snippet pagination">
      <div className="pagination-bar__summary">
        {total ? `Showing ${rangeStart}-${rangeEnd} of ${total}` : 'No results'}
      </div>
      <div className="pagination-bar__controls">
        <button
          type="button"
          className="pagination-bar__button"
          onClick={handlePrev}
          disabled={page <= 1}
        >
          Previous
        </button>
        <span className="pagination-bar__page">Page {page} of {totalPages}</span>
        <button
          type="button"
          className="pagination-bar__button"
          onClick={handleNext}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
export function SnippetGrid({
  snippets,
  snippetTypeMap,
  onViewSnippet,
  isLoading,
  error,
  pagination,
  onPageChange
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
      <PaginationBar pagination={pagination} onChange={onPageChange} />
    </div>
  );
}
