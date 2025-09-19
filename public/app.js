const state = {
  user: null,
  snippetTypes: [],
  snippetTypeMap: {},
  snippets: [],
  filters: { q: '', type: null },
  mySnippets: []
};

const els = {
  userControls: document.getElementById('userControls'),
  searchInput: document.getElementById('searchInput'),
  searchButton: document.getElementById('searchButton'),
  typeFilters: document.getElementById('typeFilters'),
  mySnippetsSection: document.getElementById('mySnippetsSection'),
  mySnippetsList: document.getElementById('mySnippetsList'),
  newSnippetButton: document.getElementById('newSnippetButton'),
  statsBar: document.getElementById('statsBar'),
  snippetList: document.getElementById('snippetList'),
  emptyState: document.getElementById('emptyState'),
  authModal: document.getElementById('authModal'),
  snippetModal: document.getElementById('snippetModal'),
  viewModal: document.getElementById('viewModal'),
  modalOverlay: document.getElementById('modalOverlay'),
  authForm: document.getElementById('authForm'),
  authMode: document.getElementById('authMode'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authSubmitButton: document.getElementById('authSubmitButton'),
  authToggleButton: document.getElementById('toggleAuthMode'),
  authError: document.getElementById('authError'),
  snippetForm: document.getElementById('snippetForm'),
  snippetModalTitle: document.getElementById('snippetModalTitle'),
  snippetSubmitButton: document.getElementById('snippetSubmitButton'),
  snippetError: document.getElementById('snippetError'),
  snippetType: document.getElementById('snippetType'),
  snippetName: document.getElementById('snippetName'),
  snippetDescription: document.getElementById('snippetDescription'),
  snippetScript: document.getElementById('snippetScript'),
  snippetId: document.getElementById('snippetId'),
  typeSpecificFields: document.getElementById('typeSpecificFields'),
  viewModalTitle: document.getElementById('viewModalTitle'),
  viewModalBody: document.getElementById('viewModalBody'),
  scriptFullscreen: document.getElementById('scriptFullscreen'),
  scriptFullscreenTitle: document.getElementById('scriptFullscreenTitle'),
  scriptFullscreenContent: document.getElementById('scriptFullscreenContent'),
  scriptFullscreenCopy: document.getElementById('scriptFullscreenCopy'),
  scriptFullscreenClose: document.getElementById('scriptFullscreenClose')
};

let activeModal = null;

document.addEventListener('DOMContentLoaded', init);

function bindCoreEvents() {
  els.searchButton.addEventListener('click', () => {
    state.filters.q = els.searchInput.value.trim();
    loadSnippets();
  });

  els.searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      state.filters.q = els.searchInput.value.trim();
      loadSnippets();
    }
  });

  els.newSnippetButton.addEventListener('click', () => openSnippetModal());

  els.snippetType.addEventListener('change', () => {
    renderTypeSpecificFields(els.snippetType.value);
  });

  els.authForm.addEventListener('submit', handleAuthSubmit);
  els.authToggleButton.addEventListener('click', toggleAuthMode);

  els.snippetForm.addEventListener('submit', handleSnippetSubmit);

  els.modalOverlay.addEventListener('click', () => {
    if (isScriptFullscreenOpen()) {
      closeScriptFullscreen();
      return;
    }
    closeActiveModal();
  });

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeActiveModal());
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (isScriptFullscreenOpen()) {
        closeScriptFullscreen();
        return;
      }
      closeActiveModal();
    }
  });

  window.addEventListener('resize', () => {
    if (isScriptFullscreenOpen()) {
      applyFullscreenLayout();
    }
  });

  els.viewModalBody.addEventListener('click', handleViewModalBodyClick);
  if (els.scriptFullscreenCopy) {
    els.scriptFullscreenCopy.addEventListener('click', handleScriptFullscreenCopy);
  }
  if (els.scriptFullscreenClose) {
    els.scriptFullscreenClose.addEventListener('click', () => closeScriptFullscreen());
  }
}

async function init() {
  bindCoreEvents();
  try {
    await Promise.all([loadSnippetTypes(), loadSession()]);
    renderTypeFilters();
    populateSnippetTypeSelect();
    els.searchInput.value = state.filters.q;
    await loadSnippets();
  } catch (error) {
    console.error('Failed to initialize app', error);
    renderErrorState('Unable to load the application. Please try refreshing.');
  }
}

async function loadSnippetTypes() {
  const response = await fetch('/api/snippet-types');
  if (!response.ok) {
    throw new Error('Failed to load snippet types');
  }
  const types = await response.json();
  state.snippetTypes = types;
  state.snippetTypeMap = Object.fromEntries(types.map((type) => [type.id, type]));
  renderMySnippets();
}

async function loadSession() {
  const response = await fetch('/api/session', { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Failed to resolve session');
  }
  const session = await response.json();
  state.user = session.authenticated ? session.user : null;
  renderUserControls();
  await loadMySnippets();
}

async function loadSnippets() {
  const params = new URLSearchParams();
  if (state.filters.q) params.set('q', state.filters.q);
  if (state.filters.type) params.set('type', state.filters.type);
  const query = params.toString();
  const endpoint = query ? `/api/snippets?${query}` : '/api/snippets';

  try {
    const response = await fetch(endpoint, { credentials: 'include' });
    if (!response.ok) {
      throw new Error('Failed to load snippets');
    }
    state.snippets = await response.json();
    renderSnippets();
    updateStats();
  } catch (error) {
    console.error(error);
    renderErrorState('Unable to load snippets. Please try again later.');
  }
}

function renderTypeFilters() {
  if (!els.typeFilters) return;
  els.typeFilters.innerHTML = '';
  const allChip = createChip('All types', null, !state.filters.type);
  els.typeFilters.appendChild(allChip);

  state.snippetTypes.forEach((type) => {
    const chip = createChip(type.label, type.id, state.filters.type === type.id);
    els.typeFilters.appendChild(chip);
  });
}

function createChip(label, typeId, isActive) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'chip';
  chip.textContent = label;
  if (isActive) chip.classList.add('active');
  chip.addEventListener('click', () => {
    state.filters.type = typeId;
    renderTypeFilters();
    loadSnippets();
  });
  return chip;
}

function populateSnippetTypeSelect() {
  if (!els.snippetType) return;
  els.snippetType.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select a snippet type';
  placeholder.disabled = true;
  placeholder.selected = true;
  els.snippetType.appendChild(placeholder);

  state.snippetTypes.forEach((type) => {
    const option = document.createElement('option');
    option.value = type.id;
    option.textContent = type.label;
    els.snippetType.appendChild(option);
  });
}

function renderUserControls() {
  if (!els.userControls) return;
  els.userControls.innerHTML = '';
  if (state.user) {
    const emailChip = document.createElement('div');
    emailChip.className = 'chip active';
    emailChip.textContent = state.user.email;

    const logoutButton = document.createElement('button');
    logoutButton.type = 'button';
    logoutButton.className = 'danger';
    logoutButton.textContent = 'Sign out';
    logoutButton.addEventListener('click', handleLogout);

    els.userControls.append(emailChip, logoutButton);
    if (els.newSnippetButton) {
      els.newSnippetButton.hidden = false;
    }
  } else {
    const signIn = document.createElement('button');
    signIn.type = 'button';
    signIn.textContent = 'Sign in';
    signIn.addEventListener('click', () => openAuthModal('login'));

    const signUp = document.createElement('button');
    signUp.type = 'button';
    signUp.textContent = 'Register';
    signUp.addEventListener('click', () => openAuthModal('register'));

    els.userControls.append(signIn, signUp);
    if (els.newSnippetButton) {
      els.newSnippetButton.hidden = true;
    }
  }
  renderMySnippets();
}

function renderSnippets() {
  if (!els.snippetList || !els.emptyState) return;
  els.snippetList.innerHTML = '';
  const hasSnippets = state.snippets.length > 0;
  els.emptyState.hidden = hasSnippets;
  els.emptyState.innerHTML = '<h2>No snippets yet</h2><p>Adjust your filters or add the first snippet for your team.</p>';

  if (!hasSnippets) {
    return;
  }

  state.snippets.forEach((snippet) => {
    els.snippetList.appendChild(createSnippetCard(snippet));
  });
}

function createSnippetCard(snippet) {
  const typeDef = state.snippetTypeMap[snippet.type];
  const card = document.createElement('article');
  card.className = 'snippet-card';

  const header = document.createElement('header');
  const title = document.createElement('h3');
  title.textContent = snippet.name;

  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = typeDef ? typeDef.label : snippet.type;

  header.append(title, badge);
  card.appendChild(header);

  if (snippet.description) {
    const description = document.createElement('p');
    description.className = 'snippet-description';
    description.textContent = snippet.description;
    card.appendChild(description);
  }

  if (typeDef && typeDef.fields?.length) {
    const meta = document.createElement('div');
    meta.className = 'snippet-meta';
    typeDef.fields.forEach((field) => {
      if (field.id in (snippet.metadata || {})) {
        const value = snippet.metadata[field.id];
        if (value !== '' && value !== null && value !== undefined) {
          const line = document.createElement('span');
          line.innerHTML = `<strong>${field.label}:</strong> ${formatFieldValue(field, value)}`;
          meta.appendChild(line);
        }
      }
    });
    if (meta.childElementCount > 0) {
      card.appendChild(meta);
    }
  }

  if (snippet.script) {
    const pre = document.createElement('pre');
    pre.className = 'code-block';
    const code = document.createElement('code');
    code.className = 'language-javascript';
    renderHighlightedCode(code, snippet.script.trim());
    pre.appendChild(code);
    card.appendChild(pre);
  }

  const actions = document.createElement('div');
  actions.className = 'snippet-actions';

  const metaInfo = document.createElement('span');
  metaInfo.className = 'muted';
  const owner = snippet.owner?.email ? ` by ${snippet.owner.email}` : '';
  const updated = snippet.updatedAt ? new Date(snippet.updatedAt).toLocaleString() : '';
  metaInfo.textContent = updated ? `Updated ${updated}${owner}` : owner || '';

  const actionGroup = document.createElement('div');
  actionGroup.className = 'action-group';

  const viewBtn = document.createElement('button');
  viewBtn.type = 'button';
  viewBtn.className = 'ghost';
  viewBtn.textContent = 'View';
  viewBtn.addEventListener('click', () => openViewModal(snippet));
  actionGroup.appendChild(viewBtn);

  if (state.user && snippet.owner?.email === state.user.email) {
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'ghost';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openSnippetModal(snippet));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'ghost';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => confirmDelete(snippet));

    actionGroup.append(editBtn, deleteBtn);
  }

  actions.append(metaInfo, actionGroup);
  card.appendChild(actions);

  return card;
}

function updateStats() {
  if (!els.statsBar) return;
  const hasFilters = Boolean(state.filters.q || state.filters.type);
  const count = state.snippets.length;
  if (!hasFilters && count === 0) {
    els.statsBar.hidden = true;
    return;
  }

  const parts = [`Showing ${count} snippet${count === 1 ? '' : 's'}`];
  if (state.filters.type) {
    const typeLabel = state.snippetTypeMap[state.filters.type]?.label ?? state.filters.type;
    parts.push(`Type: ${typeLabel}`);
  }
  if (state.filters.q) {
    parts.push(`Search: “${state.filters.q}”`);
  }
  els.statsBar.textContent = parts.join(' • ');
  els.statsBar.hidden = false;
}

function openAuthModal(mode = 'login') {
  els.authMode.value = mode;
  updateAuthModalLabels();
  els.authEmail.value = '';
  els.authPassword.value = '';
  els.authError.hidden = true;
  openModal(els.authModal);
  els.authEmail.focus();
}

function toggleAuthMode() {
  els.authMode.value = els.authMode.value === 'login' ? 'register' : 'login';
  updateAuthModalLabels();
}

function updateAuthModalLabels() {
  const mode = els.authMode.value;
  const isLogin = mode === 'login';
  document.getElementById('authModalTitle').textContent = isLogin ? 'Sign in' : 'Create account';
  els.authSubmitButton.textContent = isLogin ? 'Sign in' : 'Register';
  els.authToggleButton.textContent = isLogin ? 'Need an account? Register' : 'Already have an account? Sign in';
  els.authPassword.autocomplete = isLogin ? 'current-password' : 'new-password';
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const mode = els.authMode.value;
  const endpoint = mode === 'login' ? '/api/login' : '/api/register';
  const payload = {
    email: els.authEmail.value.trim(),
    password: els.authPassword.value
  };

  if (!payload.email || !payload.password) {
    showAuthError('Email and password are required');
    return;
  }

  setLoadingState(els.authSubmitButton, true);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Authentication failed' }));
      throw new Error(error.error || 'Authentication failed');
    }
    const user = await response.json();
    state.user = user;
    renderUserControls();
    closeActiveModal();
    await loadSnippets();
    await loadMySnippets();
  } catch (error) {
    showAuthError(error.message);
  } finally {
    setLoadingState(els.authSubmitButton, false);
  }
}

function showAuthError(message) {
  els.authError.textContent = message;
  els.authError.hidden = false;
}

async function handleLogout() {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
  } catch (error) {
    console.error('Failed to log out', error);
  }
  state.user = null;
  renderUserControls();
  await loadSnippets();
  await loadMySnippets();
}

function openSnippetModal(snippet = null) {
  els.snippetForm.reset();
  els.snippetError.hidden = true;
  els.snippetId.value = snippet?.id ?? '';
  els.snippetModalTitle.textContent = snippet ? 'Edit snippet' : 'New snippet';
  els.snippetSubmitButton.textContent = snippet ? 'Update snippet' : 'Save snippet';

  if (snippet) {
    els.snippetType.value = snippet.type;
    els.snippetName.value = snippet.name;
    els.snippetDescription.value = snippet.description ?? '';
    els.snippetScript.value = snippet.script ?? '';
    renderTypeSpecificFields(snippet.type, snippet.metadata);
  } else {
    const defaultType = state.filters.type ?? state.snippetTypes[0]?.id ?? '';
    els.snippetType.value = defaultType;
    renderTypeSpecificFields(defaultType);
  }

  openModal(els.snippetModal);
  els.snippetName.focus();
}

function renderTypeSpecificFields(typeId, metadata = {}) {
  els.typeSpecificFields.innerHTML = '';
  const def = state.snippetTypeMap[typeId];
  if (!def) {
    const placeholder = document.createElement('p');
    placeholder.className = 'muted';
    placeholder.textContent = 'Select a snippet type to configure its key attributes.';
    els.typeSpecificFields.appendChild(placeholder);
    return;
  }

  def.fields.forEach((field) => {
    if (field.type === 'checkbox') {
      const wrapper = document.createElement('label');
      wrapper.className = 'field checkbox-field';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.fieldId = field.id;
      input.dataset.fieldType = field.type;
      input.checked = Boolean(metadata[field.id] ?? field.defaultValue ?? false);

      const text = document.createElement('span');
      text.textContent = field.label;

      wrapper.append(input, text);
      els.typeSpecificFields.appendChild(wrapper);
      return;
    }

    const wrapper = document.createElement('label');
    wrapper.className = 'field';

    const label = document.createElement('span');
    label.textContent = field.label;

    let input;
    if (field.type === 'textarea') {
      input = document.createElement('textarea');
      input.rows = 3;
    } else if (field.type === 'select') {
      input = document.createElement('select');
      field.options?.forEach((optionValue) => {
        const option = document.createElement('option');
        option.value = optionValue;
        option.textContent = optionValue;
        input.appendChild(option);
      });
    } else {
      input = document.createElement('input');
      input.type = field.type === 'number' ? 'number' : 'text';
    }

    input.dataset.fieldId = field.id;
    input.dataset.fieldType = field.type;
    input.required = Boolean(field.required);
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.type !== 'select' && field.type !== 'checkbox') {
      input.value = metadata[field.id] ?? '';
    }
    if (field.type === 'select') {
      const metaValue = metadata[field.id];
      if (metaValue) {
        input.value = metaValue;
      } else if (field.options?.length) {
        input.value = field.options[0];
      }
    }

    wrapper.append(label, input);
    els.typeSpecificFields.appendChild(wrapper);
  });
}

async function handleSnippetSubmit(event) {
  event.preventDefault();
  const snippetId = els.snippetId.value;
  const type = els.snippetType.value;
  const name = els.snippetName.value.trim();
  if (!type || !name) {
    showSnippetError('Type and name are required');
    return;
  }

  const payload = {
    type,
    name,
    description: els.snippetDescription.value.trim(),
    script: els.snippetScript.value,
    metadata: collectMetadata(type)
  };

  const endpoint = snippetId ? `/api/snippets/${snippetId}` : '/api/snippets';
  const method = snippetId ? 'PUT' : 'POST';

  setLoadingState(els.snippetSubmitButton, true, snippetId ? 'Updating...' : 'Saving...');
  try {
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to save snippet' }));
      throw new Error(error.error || 'Failed to save snippet');
    }
    closeActiveModal();
    await loadSnippets();
    await loadMySnippets();
  } catch (error) {
    console.error(error);
    showSnippetError(error.message);
  } finally {
    setLoadingState(els.snippetSubmitButton, false, snippetId ? 'Update snippet' : 'Save snippet');
  }
}

function collectMetadata(typeId) {
  const metadata = {};
  const def = state.snippetTypeMap[typeId];
  if (!def) return metadata;
  def.fields.forEach((field) => {
    const selector = `[data-field-id="${field.id}"]`;
    const element = els.typeSpecificFields.querySelector(selector);
    if (!element) return;
    if (field.type === 'checkbox') {
      metadata[field.id] = element.checked;
      return;
    }
    const raw = element.value?.trim();
    if (raw === '') return;
    metadata[field.id] = field.type === 'number' ? Number(raw) : raw;
  });
  return metadata;
}

function showSnippetError(message) {
  els.snippetError.textContent = message;
  els.snippetError.hidden = false;
}

async function confirmDelete(snippet) {
  if (!window.confirm(`Delete "${snippet.name}"? This action cannot be undone.`)) {
    return;
  }
  try {
    const response = await fetch(`/api/snippets/${snippet.id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Failed to delete snippet');
    }
    await loadSnippets();
    await loadMySnippets();
  } catch (error) {
    console.error(error);
    alert('Could not delete snippet. Please try again.');
  }
}

async function loadMySnippets() {
  if (!state.user) {
    state.mySnippets = [];
    renderMySnippets();
    return;
  }

  try {
    const response = await fetch('/api/snippets?owned=true', {
      credentials: 'include'
    });
    if (!response.ok) {
      if (response.status === 401) {
        state.mySnippets = [];
        renderMySnippets();
        return;
      }
      throw new Error('Failed to load personal snippets');
    }
    state.mySnippets = await response.json();
  } catch (error) {
    console.error(error);
    state.mySnippets = [];
  }
  renderMySnippets();
}

function renderMySnippets() {
  if (!els.mySnippetsSection || !els.mySnippetsList) return;
  const authenticated = Boolean(state.user);
  els.mySnippetsSection.hidden = !authenticated;
  els.mySnippetsList.innerHTML = '';

  if (!authenticated) {
    return;
  }

  if (!state.mySnippets.length) {
    const empty = document.createElement('p');
    empty.className = 'my-snippets-empty';
    empty.textContent = 'No personal snippets yet. Create one to see it here.';
    els.mySnippetsList.appendChild(empty);
    return;
  }

  state.mySnippets.forEach((snippet) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'my-snippet-item';
    button.title = 'View snippet';

    const name = document.createElement('span');
    name.textContent = snippet.name;

    const typeLabel = document.createElement('small');
    typeLabel.textContent = state.snippetTypeMap[snippet.type]?.label ?? snippet.type;

    button.append(name, typeLabel);
    button.addEventListener('click', () => openViewModal(snippet));

    els.mySnippetsList.appendChild(button);
  });
}

function openViewModal(snippet) {
  els.viewModalTitle.textContent = snippet.name;
  const typeDef = state.snippetTypeMap[snippet.type];
  const rawScript = snippet.script ?? '';
  const formattedScript = formatScript(rawScript);

  els.viewModalBody.dataset.scriptRaw = encodeURIComponent(rawScript);
  els.viewModalBody.dataset.scriptFormatted = encodeURIComponent(formattedScript);
  els.viewModalBody.dataset.snippetName = snippet.name ?? 'Snippet script';

  const fragment = document.createDocumentFragment();
  fragment.appendChild(createDetailsSection(snippet, typeDef));
  fragment.appendChild(createScriptSection(formattedScript));

  els.viewModalBody.innerHTML = '';
  els.viewModalBody.appendChild(fragment);

  const codeEl = els.viewModalBody.querySelector('.code-block code');
  highlightCodeElement(codeEl);

  openModal(els.viewModal);
}

function createDetailsSection(snippet, typeDef) {
  const section = document.createElement('div');
  section.className = 'modal-section';

  const heading = document.createElement('h3');
  heading.textContent = 'Details';
  section.appendChild(heading);

  const metaContainer = document.createElement('div');
  metaContainer.className = 'view-meta';
  section.appendChild(metaContainer);

  appendMetaRow(metaContainer, 'Type', typeDef ? typeDef.label : snippet.type);

  const skippedFields = new Set(['active']);
  if (typeDef?.fields?.length) {
    typeDef.fields.forEach((field) => {
      if (skippedFields.has(field.id)) return;
      const value = snippet.metadata?.[field.id];
      if (value !== undefined && value !== '' && value !== null) {
        appendMetaRow(metaContainer, field.label, formatFieldValue(field, value));
      }
    });
  }

  return section;
}

function appendMetaRow(container, label, value) {
  if (value === undefined || value === null || value === '') return;
  const row = document.createElement('div');
  row.className = 'view-meta-row';

  const labelEl = document.createElement('span');
  labelEl.className = 'view-meta-label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'view-meta-value';
  valueEl.textContent = value;

  row.append(labelEl, valueEl);
  container.appendChild(row);
}

function createScriptSection(scriptContent) {
  const section = document.createElement('div');
  section.className = 'modal-section script-section';

  const header = document.createElement('div');
  header.className = 'modal-section-header';

  const title = document.createElement('h3');
  title.textContent = 'Script';
  header.appendChild(title);

  const actions = document.createElement('div');
  actions.className = 'script-actions';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'ghost small';
  copyBtn.dataset.action = 'copy-script';
  copyBtn.textContent = 'Copy script';

  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.type = 'button';
  fullscreenBtn.className = 'ghost small';
  fullscreenBtn.dataset.action = 'full-screen';
  fullscreenBtn.textContent = 'Full screen';

  actions.append(copyBtn, fullscreenBtn);
  header.appendChild(actions);
  section.appendChild(header);

  const pre = document.createElement('pre');
  pre.className = 'code-block';
  const code = document.createElement('code');
  code.className = 'language-javascript';
  renderHighlightedCode(code, scriptContent || '// No script provided');
  pre.appendChild(code);
  section.appendChild(pre);

  return section;
}

function handleViewModalBodyClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  event.preventDefault();
  const action = button.dataset.action;

  if (action === 'copy-script') {
    const formatted = decodeURIComponent(els.viewModalBody.dataset.scriptFormatted || '');
    copyToClipboard(formatted);
    setButtonFeedback(button, 'Copied!', 'Copy script');
    return;
  }

  if (action === 'full-screen') {
    const raw = decodeURIComponent(els.viewModalBody.dataset.scriptRaw || '');
    const title = els.viewModalBody.dataset.snippetName || 'Snippet script';
    openScriptFullscreen(raw, title);
  }
}

function handleScriptFullscreenCopy() {
  const formatted = decodeURIComponent(els.viewModalBody.dataset.scriptFormatted || '');
  copyToClipboard(formatted);
  setButtonFeedback(els.scriptFullscreenCopy, 'Copied!', 'Copy');
}

function openScriptFullscreen(script, title) {
  if (!els.scriptFullscreen) return;
  const formatted = formatScript(script);
  els.scriptFullscreenTitle.textContent = title ? `${title} — Script` : 'Script preview';
  renderHighlightedCode(els.scriptFullscreenContent, formatted);
  if (els.scriptFullscreenCopy) {
    els.scriptFullscreenCopy.textContent = 'Copy';
    els.scriptFullscreenCopy.disabled = false;
  }
  els.scriptFullscreen.classList.remove('hidden');
  applyFullscreenLayout();
  highlightCodeElement(els.scriptFullscreenContent);
}

function closeScriptFullscreen() {
  if (!isScriptFullscreenOpen()) {
    return;
  }
  els.scriptFullscreen.classList.add('hidden');
  const block = els.scriptFullscreen?.querySelector('.script-fullscreen .code-block');
  if (block) {
    block.style.height = '';
  }
}

function isScriptFullscreenOpen() {
  return Boolean(els.scriptFullscreen && !els.scriptFullscreen.classList.contains('hidden'));
}

function applyFullscreenLayout() {
  if (!isScriptFullscreenOpen()) {
    return;
  }
  const container = els.scriptFullscreen;
  const block = container?.querySelector('.script-fullscreen .code-block');
  const header = container?.querySelector('.script-fullscreen-header');
  if (!container || !block || !header) return;
  const viewport = window.innerHeight || document.documentElement.clientHeight;
  const inset = Math.max(0, viewport * 0.1);
  const maxHeight = Math.min(viewport - inset, 960);
  const padding = 32; // header spacing inside container
  const available = Math.max(200, maxHeight - header.offsetHeight - padding);
  block.style.height = `${available}px`;
  container.style.maxHeight = `${maxHeight}px`;
}

function highlightCodeElement(codeEl) {
  if (!codeEl) return;
  if (window.hljs?.highlightElement) {
    window.hljs.highlightElement(codeEl);
  }
}

function formatScript(script) {
  const trimmed = (script ?? '').trim();
  if (!trimmed) {
    return '// No script provided';
  }

  if (window.prettier && window.prettierPlugins?.babel) {
    try {
      return window.prettier.format(trimmed, {
        parser: 'babel',
        plugins: [window.prettierPlugins.babel],
        semi: true,
        singleQuote: true
      }).trim();
    } catch (error) {
      console.warn('Failed to format script', error);
    }
  }

  return trimmed;
}

function formatFieldValue(field, value) {
  if (field.type === 'checkbox') {
    return value ? 'Yes' : 'No';
  }
  return value;
}

function renderErrorState(message) {
  if (!els.snippetList || !els.emptyState) return;
  els.snippetList.innerHTML = '';
  els.emptyState.hidden = false;
  els.emptyState.innerHTML = `<h2>Something went wrong</h2><p>${message}</p>`;
}

function openModal(modal) {
  activeModal = modal;
  els.modalOverlay.classList.remove('hidden');
  modal.classList.remove('hidden');
}

function closeActiveModal() {
  if (!activeModal) return;
  closeScriptFullscreen();
  activeModal.classList.add('hidden');
  els.modalOverlay.classList.add('hidden');
  activeModal = null;
}

function setLoadingState(button, isLoading, loadingLabel) {
  if (!button) return;
  if (isLoading) {
    if (!button.dataset.originalLabel) {
      button.dataset.originalLabel = button.textContent;
    }
    button.textContent = loadingLabel ?? 'Working...';
    button.disabled = true;
  } else {
    button.disabled = false;
    const original = loadingLabel ?? button.dataset.originalLabel;
    if (original) {
      button.textContent = original;
    }
    delete button.dataset.originalLabel;
  }
}

function copyToClipboard(text) {
  const normalized = normalizeEncodedText(text);
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(normalized).catch(() => fallbackCopy(normalized));
  } else {
    fallbackCopy(normalized);
  }
}

function normalizeEncodedText(text) {
  if (typeof text !== 'string') return '';
  try {
    return decodeURIComponent(text);
  } catch (error) {
    return text;
  }
}

function setButtonFeedback(button, message, defaultLabel) {
  if (!button) return;
  const label = defaultLabel ?? button.textContent ?? 'Copy';
  button.textContent = message;
  button.disabled = true;
  setTimeout(() => {
    button.disabled = false;
    button.textContent = label;
  }, 2000);
}

function renderHighlightedCode(target, source) {
  if (!target) return;
  const text = source ?? '';
  if (window.hljs?.highlight) {
    try {
      const { value } = window.hljs.highlight(text, { language: 'javascript' });
      target.innerHTML = value;
      target.classList.add('hljs');
      return;
    } catch (error) {
      console.warn('Highlight failed', error);
    }
  }
  target.textContent = text;
}

function fallbackCopy(text) {
  const temp = document.createElement('textarea');
  temp.value = text;
  document.body.appendChild(temp);
  temp.select();
  document.execCommand('copy');
  document.body.removeChild(temp);
}
