const API_BASE = '';

interface FetchOptions extends RequestInit {
  token?: string;
}

function getToken(): string | null {
  return localStorage.getItem('satouba_gerant_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('satouba_gerant_refresh_token');
}

function setTokens(token: string, refreshToken: string): void {
  localStorage.setItem('satouba_gerant_token', token);
  localStorage.setItem('satouba_gerant_refresh_token', refreshToken);
}

function clearTokens(): void {
  localStorage.removeItem('satouba_gerant_token');
  localStorage.removeItem('satouba_gerant_refresh_token');
  localStorage.removeItem('satouba_gerant_user');
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return false;

    const data = await res.json();
    setTokens(data.token, data.refreshToken);
    return true;
  } catch {
    return false;
  }
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
    const isAuthEndpoint = url.includes('/api/auth/login') || url.includes('/api/auth/register') || url.includes('/api/auth/refresh');
    if (!isAuthEndpoint && token) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        const newToken = getToken();
        const retryHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(options.headers as Record<string, string> || {}),
        };
        if (newToken) {
          retryHeaders['Authorization'] = `Bearer ${newToken}`;
        }
        const retryRes = await fetch(`${API_BASE}${url}`, {
          ...options,
          headers: retryHeaders,
        });
        return retryRes;
      }
      clearTokens();
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
  // En production Vercel, upload direct vers Vercel Blob via token (contourne la limite de body serverless)
  const useBlob = import.meta.env.VITE_UPLOAD_BLOB === 'true';
  if (useBlob) {
    try {
      const { upload } = await import('@vercel/blob/client');
      const blob = await upload(`products/${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/upload/handle',
      });
      return { url: blob.url, filename: blob.pathname || file.name };
    } catch (err: any) {
      throw new Error(err.message || "Erreur lors de l'upload vers le stockage");
    }
  }

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
  const useBlob = import.meta.env.VITE_UPLOAD_BLOB === 'true';
  if (useBlob) {
    try {
      const { upload } = await import('@vercel/blob/client');
      const urls: string[] = [];
      for (const file of files) {
        const blob = await upload(`products/${file.name}`, file, {
          access: 'public',
          handleUploadUrl: '/api/upload/handle',
        });
        urls.push(blob.url);
      }
      return { urls };
    } catch (err: any) {
      throw new Error(err.message || "Erreur lors de l'upload vers le stockage");
    }
  }

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
