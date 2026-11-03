export default {
  async fetch(request: Request, env: { ASSETS: { fetch: (req: Request) => Promise<Response> } }): Promise<Response> {
    const url = new URL(request.url);

    // 1. Explicitly handle Android Digital Asset Links verification
    if (url.pathname === '/.well-known/assetlinks.json') {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.ok) {
        const body = await assetResponse.text();
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=86400',
          },
        });
      }
    }

    // 2. Explicitly handle Web App Manifest with correct MIME type
    if (url.pathname === '/manifest.webmanifest' || url.pathname === '/manifest.json') {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.ok) {
        const body = await assetResponse.text();
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'application/manifest+json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=0, must-revalidate',
          },
        });
      }
    }

    // 3. Explicitly handle Service Worker with Service-Worker-Allowed and no-cache
    if (url.pathname === '/sw.js' || url.pathname === '/push-handler.js') {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.ok) {
        const body = await assetResponse.text();
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Service-Worker-Allowed': '/',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }
    }

    // 4. Default asset routing with explicit SPA fallback for client routes
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404 && !url.pathname.startsWith('/api') && !url.pathname.includes('.')) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
    }
    return assetResponse;
  },
};
