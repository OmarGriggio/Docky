// Relative, not a full URL: in prod the frontend and API are served from the
// same origin, through the same nginx gateway (see nginx/nginx.conf at the
// repo root) - it proxies /api/* to the backend container, stripping the
// prefix, and serves the frontend's static files for everything else.
export const environment = {
  apiUrl: '/api'
};
