export const environment = {
  production: false,
  // Served through the dev-server proxy (proxy.conf.json) so the browser only
  // ever talks to the app origin; requests to /api are forwarded to Express.
  apiUrl: '/api',
};
