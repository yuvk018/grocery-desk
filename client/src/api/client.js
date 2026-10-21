// client.js - ONE small helper for every call to our backend.
//
// Why one helper? Every request needs the same things: JSON headers, the login token
// (for shopkeeper requests), and turning error responses into a readable message.
// Doing that once here keeps every page simple:  const products = await api.get('/products');

const TOKEN_KEY = 'shopkeeperToken';

// The token is saved in the browser (localStorage) so a page refresh doesn't log the shopkeeper out.
// try/catch because some browsers (private mode) block localStorage.
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore: the user just stays logged in until the page is closed
  }
}

// An error with the HTTP status and the server's field-by-field details,
// so forms can show "Price cannot be negative" right under the price box.
export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Called when the server says our login is no longer valid (401). The session context sets this.
let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`/api${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    // fetch only throws when the server can't be reached at all
    throw new ApiError(0, 'Cannot reach the server. Is it running?');
  }

  if (response.status === 204) return null; // "No Content" (e.g. after a delete)

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token) onUnauthorized(); // token expired -> log out
    throw new ApiError(response.status, data?.error || `Request failed (${response.status})`, data?.details);
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
