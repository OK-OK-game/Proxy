const http = require('http');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
    // Intercept and bypass verification constraints
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    
    const queryData = url.parse(req.url, true).query;
    const targetUrl = queryData.url;

    if (!targetUrl) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Proxy System Operational</h1><p>Append "?url=https://example.com" to use.</p>');
        return;
    }

    const parsedTarget = url.parse(targetUrl);
    const options = {
        hostname: parsedTarget.hostname,
        path: parsedTarget.path,
        method: req.method,
        headers: { ...req.headers, host: parsedTarget.hostname }
    };

    const clientReq = (parsedTarget.protocol === 'https:' ? https : http).request(options, (clientRes) => {
        res.writeHead(clientRes.statusCode, clientRes.headers);
        clientRes.pipe(res);
    });

    clientReq.on('error', (err) => {
        res.writeHead(500);
        res.end('Tunnel Error: ' + err.message);
    });

    req.pipe(clientReq);
});

server.listen(PORT, () => console.log(`Proxy active on port ${PORT}`));
