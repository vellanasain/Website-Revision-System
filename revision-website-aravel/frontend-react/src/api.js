const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

async function parseJsonResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Respons API tidak valid.');
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  const payload = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Permintaan API gagal.');
  }

  return payload;
}

export function buildRevisionQuery({ query, status }) {
  const params = new URLSearchParams();
  if (query) {
    params.set('q', query);
  }
  if (status && status !== 'all') {
    params.set('status', status);
  }

  return params.toString();
}

export async function fetchRevisions(filters) {
  const queryString = buildRevisionQuery(filters);
  return request(`/api/revisions${queryString ? `?${queryString}` : ''}`);
}

export async function createRevision(form) {
  return request('/api/revisions', {
    method: 'POST',
    body: JSON.stringify(form),
  });
}

export async function updateRevision(id, form) {
  return request(`/api/revisions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(form),
  });
}

export async function removeRevision(id) {
  return request(`/api/revisions/${id}`, { method: 'DELETE' });
}

export { API_BASE_URL };
