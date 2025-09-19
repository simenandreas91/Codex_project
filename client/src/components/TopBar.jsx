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

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon" />
        <div className="brand-text">
          <span className="title">SN | Snippet Hub</span>
          <span className="subtitle">Built for ServiceNow devs</span>
        </div>
      </div>
      <form className="topbar-search" onSubmit={handleSubmit}>
        <input
          type="search"
          placeholder="Search snippets by name, description, or script..."
          autoComplete="off"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <button type="submit" aria-label="Search snippets">
          Search
        </button>
      </form>
      <div className="user-controls">
        {user ? (
          <>
            <span className="chip active">{user.email}</span>
            <button type="button" className="ghost" onClick={onLogout}>
              Sign out
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => onOpenAuth('login')}>
              Sign in
            </button>
            <button type="button" onClick={() => onOpenRegister('register')}>
              Register
            </button>
          </>
        )}
      </div>
    </header>
  );
}
