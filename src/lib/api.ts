const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

export const API_BASE_URL = rawApiBaseUrl?.trim().replace(/\/$/, '') || '';

export const buildApiUrl = (pathname: string) => {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const apiFetch = (pathname: string, init?: RequestInit) => {
  return fetch(buildApiUrl(pathname), init);
};
