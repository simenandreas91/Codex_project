export function Sidebar({
  snippetTypes,
  activeType,
  onSelectType,
  mySnippets,
  onSelectMySnippet,
  isAuthenticated
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        <h2>Snippet Types</h2>
        <div className="chip-group">
          <button
            type="button"
            className={`chip ${activeType ? '' : 'active'}`.trim()}
            onClick={() => onSelectType(null)}
          >
            All types
          </button>
          {snippetTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`chip ${activeType === type.id ? 'active' : ''}`.trim()}
              onClick={() => onSelectType(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {isAuthenticated ? (
        <div className="sidebar-section">
          <h2>My code snippets</h2>
          <div className="my-snippets-list">
            {!mySnippets.length ? (
              <p className="my-snippets-empty">
                No personal snippets yet. Create one to see it here.
              </p>
            ) : (
              mySnippets.map((snippet) => (
                <button
                  key={snippet.id}
                  type="button"
                  className="my-snippet-item"
                  onClick={() => onSelectMySnippet(snippet)}
                >
                  <span>{snippet.name}</span>
                  <small>{snippet.typeLabel ?? snippet.type}</small>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}

      <div className="sidebar-section muted">
        <h3>Quick Tips</h3>
        <ul>
          <li>Filter by type to narrow results.</li>
          <li>Click a card to inspect metadata &amp; script.</li>
          <li>Authenticated users can create, edit, and delete their snippets.</li>
        </ul>
      </div>
    </aside>
  );
}
