export function Sidebar({
  snippetTypes,
  activeType,
  onSelectType,
  mySnippets,
  isAuthenticated
}) {
  const handleMySnippetsFilter = () => {
    if (activeType === '__my_snippets') {
      onSelectType(null);
    } else {
      onSelectType('__my_snippets');
    }
  };

  return (
    <aside className="sidebar">
      <section className="sidebar__section">
        <div className="sidebar__section-heading">
          <div>
            <h2 className="sidebar__title">Snippet Types</h2>
            <p className="sidebar__subtitle">Focus the gallery by capability</p>
          </div>
        </div>
        <div className="sidebar__filters">
          <button
            type="button"
            className={`filter-chip ${activeType ? '' : 'is-active'}`.trim()}
            onClick={() => onSelectType(null)}
          >
            All snippets
          </button>
          {snippetTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`filter-chip ${activeType === type.id ? 'is-active' : ''}`.trim()}
              onClick={() => onSelectType(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </section>

      {isAuthenticated ? (
        <section className="sidebar__section">
          <div className="sidebar__section-heading">
            <div>
              <h2 className="sidebar__title">My Snippets</h2>
              <p className="sidebar__subtitle">Toggle the gallery to only your contributions</p>
            </div>
          </div>
          <button
            type="button"
            className={`filter-chip ${activeType === '__my_snippets' ? 'is-active' : ''}`.trim()}
            onClick={handleMySnippetsFilter}
            disabled={!mySnippets.length}
          >
            My snippets ({mySnippets.length.toString().padStart(2, '0')})
          </button>
        </section>
      ) : null}

      <section className="sidebar__section sidebar__section--tips">
        <h3 className="sidebar__title">Quick tips</h3>
        <ul className="sidebar__tips">
          <li>Mix search and type filters to hone in on the right script.</li>
          <li>Open a card to inspect metadata, copy the code, or expand full screen.</li>
          <li>Sign in to curate your personal library of reusable automations.</li>
        </ul>
      </section>
    </aside>
  );
}
