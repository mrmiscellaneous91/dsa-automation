const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env manually
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envFile = fs.readFileSync(envPath, 'utf8');
            envFile.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    // Remove quotes if present
                    let value = match[2].trim();
                    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    process.env[match[1].trim()] = value;
                }
            });
        }
    } catch (e) {
        console.error('Error loading .env:', e);
    }
}
loadEnv();

const API_KEY = process.env.POSTMAN_API_KEY;
const WORKPACE_ID = process.env.POSTMAN_WORKSPACE_ID;

if (!API_KEY) {
    console.error('Error: POSTMAN_API_KEY not found in .env');
    process.exit(1);
}
if (!WORKPACE_ID) {
    console.error('Error: POSTMAN_WORKSPACE_ID not found in .env. Please run list_workspaces.js and set this variable.');
    process.exit(1);
}

function request(apiPath) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.getpostman.com',
            path: apiPath,
            method: 'GET',
            headers: { 'X-Api-Key': API_KEY }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                }
                else reject(new Error(`Status ${res.statusCode}: ${data}`));
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function printItems(items, depth = 0) {
    if (!items) return;
    const indent = '  '.repeat(depth);
    items.forEach(item => {
        if (item.item) {
            // Folder
            console.log(`${indent}- 📂 ${item.name}`);
            printItems(item.item, depth + 1);
        } else if (item.request) {
            // Request
            let method = item.request.method || 'GET';
            let url = '';
            if (typeof item.request.url === 'string') {
                url = item.request.url;
            } else if (item.request.url && item.request.url.raw) {
                url = item.request.url.raw;
            }
            console.log(`${indent}- [${method}] ${item.name} (ID: ${item.uid}) (${url})`);
        }
    });
}

async function main() {
    try {
        console.log(`Fetching workspace details for ID: ${WORKPACE_ID}...`);
        const wsData = await request(`/workspaces/${WORKPACE_ID}`);

        if (!wsData.workspace || !wsData.workspace.collections) {
            console.log('No collections found in this workspace.');
            return;
        }

        const collections = wsData.workspace.collections;
        console.log(`Found ${collections.length} collections. Fetching details...\n`);

        for (const col of collections) {
            console.log(`### Collection: ${col.name} (ID: ${col.uid})`);
            try {
                const colData = await request(`/collections/${col.uid}`);
                if (colData.collection) {
                    printItems(colData.collection.item);
                }
            } catch (e) {
                console.error(`Failed to fetch collection ${col.name}: ${e.message}`);
            }
            console.log(''); // New value
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
