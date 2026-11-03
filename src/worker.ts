export default {
  async fetch(request: Request, env: { ASSETS: { fetch: (req: Request) => Promise<Response> } }): Promise<Response> {
    const url = new URL(request.url);

    // Explicitly handle Android Digital Asset Links verification
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

    return env.ASSETS.fetch(request);
  },
};
