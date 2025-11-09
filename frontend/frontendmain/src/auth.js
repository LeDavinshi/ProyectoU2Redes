export function setUser(user) {
  try {
    localStorage.setItem('user', JSON.stringify(user));
  } catch (_) {}
}

export function getUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function clearUser() {
  try {
    localStorage.removeItem('user');
  } catch (_) {}
}

export function isAdmin() {
  const u = getUser();
  return !!u && u.perfil === 'Administrador';
}

// Helper for calling core service with x-user-id header
export async function coreFetch(path, options = {}) {
  const u = getUser();
  const headers = new Headers(options.headers || {});
  if (u?.id) headers.set('x-user-id', String(u.id));
  return fetch(`http://localhost:4200${path}`, { ...options, headers });
}
