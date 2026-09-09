// Relative, not a full URL: ng serve's own proxy (proxy.conf.json) forwards
// /api/* to localhost:3000 server-side, same relative-URL pattern prod uses
// with nginx (see environment.prod.ts) - keeps dev and prod aligned, and
// means the browser only ever talks to one origin (whatever serves this
// page), which is what makes testing through a devtunnel/LAN IP work at all.
export const environment = {
  apiUrl: '/api'
};
