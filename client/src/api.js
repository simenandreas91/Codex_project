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
  const response = await fetch('/api/snippet-types', { credentials: 'include' });
  return handleResponse(response);
}

export async function fetchSession() {
  const response = await fetch('/api/session', { credentials: 'include' });
  return handleResponse(response);
}

export async function fetchSnippets({ q, type, owned } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (owned) { params.set('owned', 'true'); } else if (type) { params.set('type', type); }
  const query = params.toString();
  const url = query ? `/api/snippets?${query}` : '/api/snippets';
  const response = await fetch(url, { credentials: 'include' });
  return handleResponse(response);
}

export async function fetchMySnippets() {
  const response = await fetch('/api/snippets?owned=true', { credentials: 'include' });
  return handleResponse(response);
}

export async function register(payload) {
  const response = await fetch('/api/register', {
    method: 'POST',
    headers: JSON_HEADERS,
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}

export async function login(payload) {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: JSON_HEADERS,
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}

export async function logout() {
  const response = await fetch('/api/logout', {
    method: 'POST',
    credentials: 'include'
  });
  return handleResponse(response);
}

export async function createSnippet(payload) {
  const response = await fetch('/api/snippets', {
    method: 'POST',
    headers: JSON_HEADERS,
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}

export async function updateSnippet(id, payload) {
  const response = await fetch(`/api/snippets/${id}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  return handleResponse(response);
}

export async function deleteSnippet(id) {
  const response = await fetch(`/api/snippets/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  return handleResponse(response);
}
