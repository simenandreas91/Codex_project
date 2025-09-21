export function TopBar({
  searchValue,
  onSearchChange,
  onSearchSubmit,
  onOpenAuth,
  onOpenRegister,
  onLogout,
  user
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSearchSubmit();
  };

  const userInitial = user?.email?.charAt(0)?.toUpperCase() ?? '';

  return (
    <header className="topbar">
      <div className="topbar__inner">
        <div className="topbar__brand" role="presentation">
          <img className="topbar__logo" src="/codesnipnow-mark.svg" alt="CodeSnipNow logo" width="48" height="48" />
          <div className="topbar__meta">
            <span className="topbar__title">CodeSnipNow</span>
            <span className="topbar__subtitle">Instant ServiceNow snippet library</span>
          </div>
        </div>

        <form className="topbar__search" onSubmit={handleSubmit}>
          <span className="topbar__search-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="20" y1="20" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className="topbar__search-input"
            type="search"
            placeholder="Search snippets by keywords, metadata, or scripts"
            autoComplete="off"
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
          <button type="submit" className="btn btn-primary" aria-label="Search snippets">
            Search
          </button>
        </form>

        <div className="topbar__actions">
          {user ? (
            <div className="topbar__user">
              <div className="avatar" aria-hidden="true">
                {userInitial}
              </div>
              <div className="topbar__user-meta">
                <span className="topbar__user-email">{user.email}</span>
                <button type="button" className="btn btn-ghost" onClick={onLogout}>
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="topbar__auth">
              <button type="button" className="btn btn-ghost" onClick={() => onOpenAuth('login')}>
                Sign in
              </button>
              <button type="button" className="btn btn-elevated" onClick={() => onOpenRegister('register')}>
                Create account
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
