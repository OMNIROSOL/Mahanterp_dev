export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // If running on dev/preview ports, target port 3002 directly
    if (window.location.port === '4173' || window.location.port === '3003' || window.location.port === '5173') {
      const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
      return `${protocol}//${window.location.hostname}:3002/api`;
    }
    // In production IIS, relative /api is proxied by IIS ARR to http://127.0.0.1:3002/api
    return '/api';
  }
  return 'http://localhost:3002/api';
};
