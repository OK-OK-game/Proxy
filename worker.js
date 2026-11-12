// Cloudflare Workers entry point — uses the fetch API (native to Workers)
// instead of Node's http/https modules. This is what the Workers build compiles.

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function badRequest(message) {
    return new Response(message, {
        status: 400,
        headers: { 'Content-Type': 'text/plain', ...CORS_HEADERS },
    });
}

export default {
    async fetch(request) {
        const url = new URL(request.url);
        const targetUrl = url.searchParams.get('url');

        if (!targetUrl) {
            return new Response(
                '<h1>Proxy System Operational</h1><p>Append "?url=https://example.com" to use.</p>',
                { status: 200, headers: { 'Content-Type': 'text/html', ...CORS_HEADERS } }
            );
        }

        let parsed;
        try {
            parsed = new URL(targetUrl);
        } catch {
            return badRequest('Bad Request: Invalid or unsupported URL. Only http and https URLs are allowed.');
        }

        if (!parsed.hostname || !/^https?:$/.test(parsed.protocol)) {
            return badRequest('Bad Request: Invalid or unsupported URL. Only http and https URLs are allowed.');
        }

        try {
            const proxyReq = new Request(parsed.href, {
                method: request.method,
                headers: request.headers,
                body: request.body,
                redirect: 'follow',
            });
            proxyReq.headers.set('Host', parsed.hostname);

            const response = await fetch(proxyReq);

            const newHeaders = new Headers(response.headers);
            Object.entries(CORS_HEADERS).forEach(([k, v]) => newHeaders.set(k, v));

            return new Response(response.body, {
                status: response.status,
                headers: newHeaders,
            });
        } catch (err) {
            return badRequest('Bad Request: Failed to connect to the target URL — ' + err.message);
        }
    },
};
