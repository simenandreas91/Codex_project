const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function handleResponse(response) {
  if (!response.ok) {
    let errorMessage = 'Request failed';
    try {
      const data = await response.json();
      if (data?.error) errorMessage = data.error;
    } catch {
      // Ignore JSON parse failures
    }
    const error = new Error(errorMessage);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function fetchSnippetTypes() {
  const response = await fetch('/.netlify/functions/snippet-types', { credentials: 'include' });
  return handleResponse(response);
}

export async function fetchSession() {
  const response = await fetch('/.netlify/functions/session', { credentials: 'include' });
  return handleResponse(response);
}

export async function fetchSnippets({ q, type, owned, page, limit } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (owned) {
    params.set('owned', 'true');
  } else if (type) {
    params.set('type', type);
  }
  if (page) params.set('page', String(page));
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  const url = query ? `/.netlify/functions/snippets?${query}` : '/.netlify/functions/snippets';
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse(response);
}

export async function fetchMySnippets(limit = 100) {
  const data = await fetchSnippets({ owned: true, limit, page: 1 });
  if (data && Array.isArray(data.items)) {
    return data.items;
  }
  return Array.isArray(data) ? data : [];
}

export async function register(payload) {
  const response = await fetch('/.netlify/functions/register', {
    method: 'POST',
    headers: JSON_HEADERS,
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}

export async function login(payload) {
  const response = await fetch('/.netlify/functions/login', {
    method: 'POST',
    headers: JSON_HEADERS,
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}

export async function logout() {
  const response = await fetch('/.netlify/functions/logout', {
    method: 'POST',
    credentials: 'include'
  });
  return handleResponse(response);
}

export async function createSnippet(payload) {
  const response = await fetch('/.netlify/functions/snippets', {
    method: 'POST',
    headers: JSON_HEADERS,
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}

export async function updateSnippet(id, payload) {
  const response = await fetch(`/.netlify/functions/snippets/${id}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}

export async function deleteSnippet(id) {
  const response = await fetch(`/.netlify/functions/snippets/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  return handleResponse(response);
}

export async function fetchSnippet(id) {
  if (!id) {
    throw new Error('Snippet id is required');
  }

  const response = await fetch(`/.netlify/functions/snippets/${id}`, { credentials: 'include' });
  return handleResponse(response);
}
