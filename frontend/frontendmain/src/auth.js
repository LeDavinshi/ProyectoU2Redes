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

// Roles y permisos básicos. Ajustar según necesidades futuras.
const PERMISSIONS = {
  Administrador: new Set([
    'usuarios:list',
    'usuarios:create',
    'usuarios:update',
    'usuarios:delete',
    'cargos:list',
  ]),
  Funcionario: new Set([]),
};

export function getRole() {
  const u = getUser();
  return u?.perfil || null;
}

export function can(action) {
  const role = getRole();
  if (!role) return false;
  const set = PERMISSIONS[role];
  return !!set && set.has(action);
}

// Helper for calling core service with x-user-id header
export async function coreFetch(path, options = {}) {
  const u = getUser();
  const headers = new Headers(options.headers || {});
  if (u?.id) headers.set('x-user-id', String(u.id));
  return fetch(`http://localhost:4200${path}`, { ...options, headers });
}
