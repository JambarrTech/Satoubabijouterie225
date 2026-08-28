const API_BASE = '';

interface FetchOptions extends RequestInit {
  token?: string;
}

function getToken(): string | null {
  return localStorage.getItem('token');
}

export async function apiFetch(url: string, options: FetchOptions = {}) {
  const token = options.token || getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // Only force logout + reload if user was previously authenticated
    // (token expired). Don't reload on login/register failures.
    const isAuthEndpoint = url.includes('/api/auth/login') || url.includes('/api/auth/register');
    if (!isAuthEndpoint && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    throw new Error('Non autorisé');
  }

  return res;
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await apiFetch(url);
  if (!res.ok) throw new Error('Erreur lors du chargement');
  return res.json();
}

export async function apiPost<T>(url: string, data?: any): Promise<T> {
  const res = await apiFetch(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur' }));
    throw new Error(err.error || 'Erreur');
  }
  return res.json();
}

export async function apiPut<T>(url: string, data?: any): Promise<T> {
  const res = await apiFetch(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur' }));
    throw new Error(err.error || 'Erreur');
  }
  return res.json();
}

export async function apiPatch<T>(url: string, data?: any): Promise<T> {
  const res = await apiFetch(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur' }));
    throw new Error(err.error || 'Erreur');
  }
  return res.json();
}

export async function apiDelete<T>(url: string): Promise<T> {
  const res = await apiFetch(url, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erreur' }));
    throw new Error(err.error || 'Erreur');
  }
  return res.json();
}

export async function apiUpload(file: File): Promise<{ url: string; filename: string }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erreur lors de l'upload" }));
    throw new Error(err.error || "Erreur lors de l'upload");
  }
  return res.json();
}

export async function apiUploadMultiple(files: File[]): Promise<{ urls: string[] }> {
  const token = getToken();
  const formData = new FormData();
  files.forEach(f => formData.append('images', f));

  const res = await fetch(`${API_BASE}/api/upload/multiple`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Erreur lors de l'upload" }));
    throw new Error(err.error || "Erreur lors de l'upload");
  }
  return res.json();
}
