import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'highlight.js/styles/github-dark-dimmed.css';
import './styles.css';

import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { SnippetGrid } from './components/SnippetGrid';
import { AuthModal } from './components/AuthModal';
import { SnippetModal } from './components/SnippetModal';
import { ViewModal } from './components/ViewModal';
import { ScriptFullscreen } from './components/ScriptFullscreen';

import {
  fetchSnippetTypes,
  fetchSession,
  fetchSnippets,
  fetchMySnippets,
  login,
  register,
  logout,
  createSnippet,
  updateSnippet,
  deleteSnippet
} from './api';
import { copyToClipboard } from './utils/clipboard';

const INITIAL_FILTERS = { q: '', type: null };

function App() {
  const [user, setUser] = useState(null);
  const [snippetTypes, setSnippetTypes] = useState([]);
  const snippetTypeMap = useMemo(
    () => Object.fromEntries(snippetTypes.map((type) => [type.id, type])),
    [snippetTypes]
  );

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const filtersRef = useRef(INITIAL_FILTERS);
  const [searchValue, setSearchValue] = useState('');

  const [snippets, setSnippets] = useState([]);
  const [mySnippets, setMySnippets] = useState([]);

  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [isAuthSubmitting, setAuthSubmitting] = useState(false);

  const [isSnippetModalOpen, setSnippetModalOpen] = useState(false);
  const [snippetDraft, setSnippetDraft] = useState(null);
  const [snippetError, setSnippetError] = useState('');
  const [isSnippetSubmitting, setSnippetSubmitting] = useState(false);

  const [isViewModalOpen, setViewModalOpen] = useState(false);
  const [viewSnippet, setViewSnippet] = useState(null);

  const [fullscreenState, setFullscreenState] = useState({ open: false, title: '', script: '' });

  const [isLoadingSnippets, setLoadingSnippets] = useState(false);
  const [pageError, setPageError] = useState('');

  const statsMessage = useMemo(() => {
    const count = snippets.length;
    const parts = [`Showing ${count} snippet${count === 1 ? '' : 's'}`];
    if (filters.type) {
      parts.push(`Type: ${snippetTypeMap[filters.type]?.label ?? filters.type}`);
    }
    if (filters.q) {
      parts.push(`Search: "${filters.q}"`);
    }
    return parts.join(' • ');
  }, [snippets, filters, snippetTypeMap]);

  const mySnippetsWithLabels = useMemo(
    () =>
      mySnippets.map((snippet) => ({
        ...snippet,
        typeLabel: snippetTypeMap[snippet.type]?.label ?? snippet.type
      })),
    [mySnippets, snippetTypeMap]
  );

  const refreshSnippets = useCallback(async (inputFilters) => {
    const effectiveFilters = inputFilters ?? filtersRef.current;
    setLoadingSnippets(true);
    try {
      const data = await fetchSnippets(effectiveFilters);
      setSnippets(data);
      setPageError('');
    } catch (error) {
      console.error('Failed to load snippets', error);
      setSnippets([]);
      setPageError('Unable to load snippets. Please try again later.');
    } finally {
      setLoadingSnippets(false);
    }
  }, []);

  const reloadMySnippets = useCallback(async () => {
    if (!user) {
      setMySnippets([]);
      return;
    }
    try {
      const data = await fetchMySnippets();
      setMySnippets(data);
    } catch (error) {
      console.error('Failed to load personal snippets', error);
      setMySnippets([]);
    }
  }, [user]);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const [types, session] = await Promise.all([fetchSnippetTypes(), fetchSession()]);
        if (cancelled) return;
        setSnippetTypes(types);
        const nextUser = session.authenticated ? session.user : null;
        setUser(nextUser);
        setSearchValue(INITIAL_FILTERS.q);
        await refreshSnippets(INITIAL_FILTERS);
        if (nextUser) {
          const owned = await fetchMySnippets();
          if (!cancelled) setMySnippets(owned);
        }
      } catch (error) {
        console.error('Failed to initialize application', error);
        if (!cancelled) {
          setPageError('Unable to load the application. Please try refreshing.');
        }
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [refreshSnippets]);

  useEffect(() => {
    setSearchValue(filters.q ?? '');
  }, [filters.q]);

  useEffect(() => {
    if (user) {
      reloadMySnippets();
    } else {
      setMySnippets([]);
    }
  }, [user, reloadMySnippets]);

  const handleSearchSubmit = () => {
    const nextFilters = { ...filters, q: searchValue.trim() };
    setFilters(nextFilters);
    refreshSnippets(nextFilters);
  };

  const handleTypeSelect = (typeId) => {
    const nextFilters = { ...filters, type: typeId };
    setFilters(nextFilters);
    refreshSnippets(nextFilters);
  };

  const handleOpenAuth = (mode = 'login') => {
    setAuthMode(mode);
    setAuthError('');
    setAuthModalOpen(true);
  };

  const handleCloseAuth = () => {
    if (isAuthSubmitting) return;
    setAuthModalOpen(false);
  };

  const handleAuthSubmit = async ({ email, password }) => {
    if (!email || !password) {
      setAuthError('Email and password are required');
      return;
    }
    setAuthSubmitting(true);
    setAuthError('');
    try {
      const action = authMode === 'login' ? login : register;
      const result = await action({ email, password });
      const authenticatedUser = result?.email ? result : { email };
      setUser(authenticatedUser);
      setAuthModalOpen(false);
      await Promise.all([refreshSnippets(), reloadMySnippets()]);
    } catch (error) {
      console.error('Authentication failed', error);
      setAuthError(error.message ?? 'Authentication failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to log out', error);
    }
    setUser(null);
    setSnippetDraft(null);
    setMySnippets([]);
    setAuthModalOpen(false);
    refreshSnippets();
  };

  const handleOpenSnippetModal = (snippet = null) => {
    if (!user) {
      handleOpenAuth('login');
      return;
    }
    setSnippetDraft(snippet);
    setSnippetError('');
    setSnippetModalOpen(true);
  };

  const handleCloseSnippetModal = () => {
    if (isSnippetSubmitting) return;
    setSnippetModalOpen(false);
    setSnippetDraft(null);
  };

  const handleSnippetSubmit = async ({ id, type, name, description, script, metadata }) => {
    setSnippetSubmitting(true);
    setSnippetError('');
    try {
      const payload = { type, name, description, script, metadata };
      if (id) {
        await updateSnippet(id, payload);
      } else {
        await createSnippet(payload);
      }
      setSnippetModalOpen(false);
      setSnippetDraft(null);
      await Promise.all([refreshSnippets(), reloadMySnippets()]);
    } catch (error) {
      console.error('Failed to save snippet', error);
      setSnippetError(error.message ?? 'Failed to save snippet');
    } finally {
      setSnippetSubmitting(false);
    }
  };

  const handleViewSnippet = (snippet) => {
    setViewSnippet(snippet);
    setViewModalOpen(true);
  };

  const handleCloseViewModal = () => {
    setViewModalOpen(false);
    setViewSnippet(null);
  };

  const handleDeleteSnippet = async (snippet) => {
    const confirmed = window.confirm(
      `Delete "${snippet.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deleteSnippet(snippet.id);
      await Promise.all([refreshSnippets(), reloadMySnippets()]);
    } catch (error) {
      console.error('Failed to delete snippet', error);
      window.alert('Could not delete snippet. Please try again.');
    }
  };

  const handleCopyScript = useCallback(async (text) => {
    try {
      await copyToClipboard(text);
    } catch (error) {
      console.error('Copy failed', error);
    }
  }, []);

  const handleOpenFullscreen = (snippet, formattedScript) => {
    setFullscreenState({
      open: true,
      title: snippet?.name ?? 'Snippet script',
      script: formattedScript
    });
  };

  const handleCloseFullscreen = () => {
    setFullscreenState({ open: false, title: '', script: '' });
  };

  return (
    <div className="app-shell">
      <TopBar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchSubmit={handleSearchSubmit}
        onOpenAuth={handleOpenAuth}
        onOpenRegister={handleOpenAuth}
        onLogout={handleLogout}
        user={user}
      />

      <div className="main-pane">
        <Sidebar
          snippetTypes={snippetTypes}
          activeType={filters.type}
          onSelectType={handleTypeSelect}
          mySnippets={mySnippetsWithLabels}
          onSelectMySnippet={handleViewSnippet}
          isAuthenticated={Boolean(user)}
        />

        <section className="content">
          <div className="content-header">
            <div>
              <h1>Reusable ServiceNow logic</h1>
              <p className="muted">
                Browse community-driven Business Rules, Script Includes, Client Scripts, and more.
              </p>
            </div>
            <div className="content-actions">
              {user ? (
                <button type="button" className="primary" onClick={() => handleOpenSnippetModal()}>
                  New Snippet
                </button>
              ) : null}
            </div>
          </div>

          {statsMessage ? (
            <div className="stats-bar">{statsMessage}</div>
          ) : null}

          <SnippetGrid
            snippets={snippets}
            snippetTypeMap={snippetTypeMap}
            currentUser={user}
            onViewSnippet={handleViewSnippet}
            onEditSnippet={handleOpenSnippetModal}
            onDeleteSnippet={handleDeleteSnippet}
            isLoading={isLoadingSnippets}
            error={pageError}
          />
        </section>
      </div>

      <AuthModal
        open={isAuthModalOpen}
        mode={authMode}
        onClose={handleCloseAuth}
        onSubmit={handleAuthSubmit}
        onToggleMode={handleOpenAuth}
        error={authError}
        isSubmitting={isAuthSubmitting}
      />

      <SnippetModal
        open={isSnippetModalOpen}
        snippet={snippetDraft}
        snippetTypes={snippetTypes}
        snippetTypeMap={snippetTypeMap}
        defaultType={filters.type ?? snippetTypes[0]?.id}
        onClose={handleCloseSnippetModal}
        onSubmit={handleSnippetSubmit}
        error={snippetError}
        isSubmitting={isSnippetSubmitting}
      />

      <ViewModal
        open={isViewModalOpen}
        snippet={viewSnippet}
        typeDef={viewSnippet ? snippetTypeMap[viewSnippet.type] : null}
        onClose={handleCloseViewModal}
        onCopyScript={handleCopyScript}
        onFullScreen={handleOpenFullscreen}
      />

      <ScriptFullscreen
        open={fullscreenState.open}
        title={fullscreenState.title}
        script={fullscreenState.script}
        onClose={handleCloseFullscreen}
        onCopy={handleCopyScript}
      />
    </div>
  );
}

export default App;
