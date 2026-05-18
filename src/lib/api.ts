const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;

const normalizeApiBaseUrl = (value: string | undefined) => {
  const trimmed = value?.trim();

  if (!trimmed || trimmed === '/') {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, '');
  }

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return normalizedPath.replace(/\/$/, '');
};

export const API_BASE_URL = normalizeApiBaseUrl(rawApiBaseUrl);

export const buildApiUrl = (pathname: string) => {
  if (/^https?:\/\//i.test(pathname)) {
    return pathname;
  }

  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const apiFetch = (pathname: string, init?: RequestInit) => fetch(buildApiUrl(pathname), init);
