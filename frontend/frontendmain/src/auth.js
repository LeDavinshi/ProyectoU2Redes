// Using relative paths that will be proxied by Vite
const API_PREFIX = ''; // Empty because we're using the proxy in Vite config

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

const PERMISSIONS = {
  Administrador: new Set([
    'usuarios:list',
    'usuarios:create',
    'usuarios:update',
    'usuarios:delete',
    'cargos:list',
    'funcionarios:list',
    'funcionarios:create',
    'funcionarios:update',
    'funcionarios:delete',
    'perfil:view',
  ]),
  Funcionario: new Set([
    'perfil:view',
  ]),
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

export async function coreFetch(path, options = {}) {
  const u = getUser();
  const headers = new Headers(options.headers || {});
  if (u?.id) headers.set('x-user-id', String(u.id));
  
  // Add content-type if not set
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Use relative path which will be proxied by Vite
  const apiPath = path.startsWith('/auth/') 
    ? `/api${path}`  // For auth service
    : `/api/core${path}`; // For core service
    
  return fetch(apiPath, { 
    ...options, 
    headers,
    credentials: 'include' // Important for cookies/sessions
  });
}

export async function docsFetch(path, options = {}) {
  const u = getUser();
  const headers = new Headers(options.headers || {});
  if (u?.id) headers.set('x-user-id', String(u.id));
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  return fetch(`/api/docs${path}`, { 
    ...options, 
    headers,
    credentials: 'include'
  });
}
