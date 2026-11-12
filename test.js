const http = require('http');
const { spawn } = require('child_process');

const TEST_PORT = 9099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProcess;
let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ ${message}`);
        passed++;
    } else {
        console.error(`  ✗ ${message}`);
        failed++;
    }
}

function fetch(path) {
    return new Promise((resolve, reject) => {
        http.get(`${BASE_URL}${path}`, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
        }).on('error', reject);
    });
}

async function runTests() {
    console.log('\nTest 1: Root path returns operational status');
    {
        const res = await fetch('/');
        assert(res.statusCode === 200, 'status code is 200');
        assert(res.body.includes('Proxy System Operational'), 'body contains "Proxy System Operational"');
        assert(res.body.includes('?url='), 'body explains how to use the proxy');
    }

    console.log('\nTest 2: Proxy forwards to httpbin.org and returns upstream content');
    {
        const res = await fetch('/?url=https://example.com');
        assert(res.statusCode === 200, 'status code is 200 from upstream');
        assert(res.body.includes('Example Domain'), 'body contains upstream content ("Example Domain")');
        assert(res.body.includes('<html'), 'body contains HTML from the target');
    }

    console.log('\nTest 3: Proxy returns 400 for failed connection to invalid host');
    {
        const res = await fetch('/?url=https://nonexistent.invalid.domain.xyz');
        assert(res.statusCode === 400, 'status code is 400 on connection failure');
        assert(res.body.includes('Bad Request'), 'body contains "Bad Request" message');
    }

    console.log('\nTest 4b: Proxy returns 400 for malformed URL (no protocol/hostname)');
    {
        const res = await fetch('/?url=not-a-valid-url');
        assert(res.statusCode === 400, 'status code is 400 for invalid URL');
        assert(res.body.includes('Invalid or unsupported URL'), 'body explains the URL is invalid');
    }

    console.log('\nTest 4c: Proxy returns 400 for non-http protocol (ftp)');
    {
        const res = await fetch('/?url=ftp://example.com');
        assert(res.statusCode === 400, 'status code is 400 for unsupported protocol');
        assert(res.body.includes('http and https URLs are allowed'), 'body explains only http/https allowed');
    }

    console.log('\nTest 4: CORS headers are present');
    {
        const res = await fetch('/');
        assert(res.headers['access-control-allow-origin'] === '*', 'Access-Control-Allow-Origin is *');
        assert(
            (res.headers['access-control-allow-methods'] || '').includes('GET'),
            'Access-Control-Allow-Methods includes GET'
        );
    }

    console.log(`\n----------------------------------------`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log('----------------------------------------\n');

    serverProcess.kill('SIGTERM');
    process.exit(failed > 0 ? 1 : 0);
}

// Start server.js with the test port, then run tests
serverProcess = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: String(TEST_PORT) },
    stdio: 'pipe',
});

serverProcess.on('error', (err) => {
    console.error('Failed to start server.js:', err.message);
    process.exit(1);
});

// Give the server a moment to boot, then run tests
setTimeout(runTests, 1000);
