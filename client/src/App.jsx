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
  fetchSnippet,
  login,
  register,
  logout,
  createSnippet,
  updateSnippet,
  deleteSnippet
} from './api';
import { copyToClipboard } from './utils/clipboard';

const DEFAULT_PAGE_SIZE = 12;

const INITIAL_FILTERS = { q: '', type: null, page: 1, limit: DEFAULT_PAGE_SIZE };

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
  const [pagination, setPagination] = useState({ page: INITIAL_FILTERS.page, totalPages: 1, total: 0, limit: INITIAL_FILTERS.limit });

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

  const defaultSnippetType = useMemo(() => {
    if (filters.type && filters.type !== '__my_snippets') {
      return filters.type;
    }
    return snippetTypes[0]?.id ?? '';
  }, [filters.type, snippetTypes]);

  const refreshSnippets = useCallback(async (inputFilters) => {
    const effectiveFilters = inputFilters ?? filtersRef.current;
    const page = effectiveFilters.page ?? 1;
    const limit = effectiveFilters.limit ?? DEFAULT_PAGE_SIZE;
    setLoadingSnippets(true);
    try {
      const options = { page, limit };
      if (effectiveFilters.q) {
        options.q = effectiveFilters.q;
      }
      if (effectiveFilters.type === '__my_snippets') {
        options.owned = true;
      } else if (effectiveFilters.type) {
        options.type = effectiveFilters.type;
      }

      const data = await fetchSnippets(options);
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setSnippets(items);
      const meta = data?.pagination ?? {};
      const resolvedPage = meta.page ?? page;
      const resolvedLimit = meta.limit ?? limit;
      setPagination({
        page: resolvedPage,
        totalPages: meta.totalPages ?? 1,
        total: meta.total ?? items.length,
        limit: resolvedLimit
      });
      if ((effectiveFilters.page ?? 1) !== resolvedPage || (effectiveFilters.limit ?? DEFAULT_PAGE_SIZE) !== resolvedLimit) {
        setFilters((prev) => ({
          ...prev,
          page: resolvedPage,
          limit: resolvedLimit
        }));
      }
      setPageError('');
    } catch (error) {
      console.error('Failed to load snippets', error);
      setSnippets([]);
      setPagination((prev) => ({
        page,
        totalPages: 1,
        total: 0,
        limit: prev?.limit ?? limit
      }));
      setFilters((prev) => ({ ...prev, page }));
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
    const nextFilters = { ...filters, q: searchValue.trim(), page: 1 };
    setFilters(nextFilters);
    refreshSnippets(nextFilters);
  };

  const handleTypeSelect = (typeId) => {
    const nextFilters = { ...filters, type: typeId, page: 1 };
    setFilters(nextFilters);
    refreshSnippets(nextFilters);
  };

  const handlePageChange = (nextPage) => {
    const totalPages = pagination.totalPages ?? 1;
    const currentPage = pagination.page ?? 1;
    const targetPage = Math.min(Math.max(1, nextPage), Math.max(1, totalPages));
    if (targetPage === currentPage || isLoadingSnippets) {
      return;
    }
    const nextFilters = { ...filters, page: targetPage };
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
      const authenticatedUser = result?.email ? result : { email, isAdmin: false };
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

  const handleViewSnippet = useCallback((snippet) => {
    if (!snippet) {
      return;
    }

    setViewSnippet(snippet);
    setViewModalOpen(true);

    (async () => {
      try {
        const fresh = await fetchSnippet(snippet.id);
        setViewSnippet((current) => {
          if (!current || current.id !== snippet.id) {
            return current;
          }
          return fresh;
        });
      } catch (error) {
        console.error('Failed to refresh snippet', error);
      }
    })();
  }, [fetchSnippet]);

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
      if (viewSnippet?.id === snippet.id) {
        setViewModalOpen(false);
        setViewSnippet(null);
      }
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

      <div className="layout-grid">
        <Sidebar
          snippetTypes={snippetTypes}
          activeType={filters.type}
          onSelectType={handleTypeSelect}
          mySnippets={mySnippets}
          isAuthenticated={Boolean(user)}
        />

        <section className="workspace">
          <div className="workspace__hero">
            <div className="workspace__headline">
              <h1>CodeSnipNow for ServiceNow builders</h1>
              <p>
                CodeSnipNow curates proven business rules, client scripts, and automation utilities so your team can ship platform changes faster.
              </p>
            </div>
            <div className="workspace__cta">
              {user ? (
                <button type="button" className="btn btn-gradient" onClick={() => handleOpenSnippetModal()}>
                  Create snippet
                </button>
              ) : (
                <div className="workspace__auth-cta">
                  <button type="button" className="btn btn-elevated" onClick={() => handleOpenAuth('register')}>
                    Join &amp; contribute
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => handleOpenAuth('login')}>
                    Sign in
                  </button>
                </div>
              )}
            </div>
          </div>

          <SnippetGrid
            snippets={snippets}
            snippetTypeMap={snippetTypeMap}
            onViewSnippet={handleViewSnippet}
            isLoading={isLoadingSnippets}
            error={pageError}
            pagination={pagination}
            onPageChange={handlePageChange}
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
        defaultType={defaultSnippetType}
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
        onEdit={(snippet) => {
          handleCloseViewModal();
          handleOpenSnippetModal(snippet);
        }}
        onDelete={handleDeleteSnippet}
        canManage={Boolean(viewSnippet && (viewSnippet.canManage || (user && (user.isAdmin || viewSnippet.owner?.email === user.email))))}
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
