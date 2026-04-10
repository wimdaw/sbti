export default {
  async fetch(request, env) {
    if (!env.ASSETS || typeof env.ASSETS.fetch !== 'function') {
      return new Response(
        'Missing ASSETS binding. Configure Cloudflare Workers Assets and bind it as ASSETS.',
        {
          status: 500,
          headers: { 'content-type': 'text/plain; charset=UTF-8' }
        }
      );
    }

    const url = new URL(request.url);
    const assetUrl = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '') {
      assetUrl.pathname = '/index.html';
    }

    const assetRequest = new Request(assetUrl.toString(), request);
    const response = await env.ASSETS.fetch(assetRequest);

    if (response.status !== 404) {
      return withDefaultHeaders(response);
    }

    if (!hasExtension(url.pathname)) {
      assetUrl.pathname = '/index.html';
      const fallbackRequest = new Request(assetUrl.toString(), request);
      const fallbackResponse = await env.ASSETS.fetch(fallbackRequest);
      return withDefaultHeaders(fallbackResponse);
    }

    return withDefaultHeaders(response);
  }
};

function hasExtension(pathname) {
  return /\.[a-zA-Z0-9]+$/.test(pathname);
}

function withDefaultHeaders(response) {
  const headers = new Headers(response.headers);

  if (!headers.has('x-content-type-options')) {
    headers.set('x-content-type-options', 'nosniff');
  }

  if (!headers.has('referrer-policy')) {
    headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  }

  if (!headers.has('cache-control') && isStaticAsset(headers.get('content-type'))) {
    headers.set('cache-control', 'public, max-age=86400');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function isStaticAsset(contentType) {
  if (!contentType) return false;

  return (
    contentType.startsWith('image/') ||
    contentType.startsWith('font/') ||
    contentType.includes('javascript') ||
    contentType.includes('css')
  );
}
