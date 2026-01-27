const https = require('https');
const fs = require('fs');
const path = require('path');

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        if (fs.existsSync(envPath)) {
            const envFile = fs.readFileSync(envPath, 'utf8');
            envFile.split('\n').forEach(line => {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
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
const COL_ID = process.argv[2];
const REQ_ID = process.argv[3];

if (!API_KEY || !COL_ID || !REQ_ID) {
    console.error('Usage: node scripts/postman/inspect_request.js <COLLECTION_ID> <REQUEST_ID>');
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
                } else reject(new Error(`Status ${res.statusCode}: ${data}`));
            });
        });
        req.on('error', reject);
        req.end();
    });
}

function findRequest(items, id) {
    if (!items) return null;
    for (const item of items) {
        if (item.id === id || item.uid?.endsWith(id)) {
            return item;
        }
        if (item.item) {
            const found = findRequest(item.item, id);
            if (found) return found;
        }
    }
    return null;
}

async function main() {
    try {
        const data = await request(`/collections/${COL_ID}`);
        if (!data.collection) throw new Error("Collection not found");

        const reqItem = findRequest(data.collection.item, REQ_ID);
        if (reqItem) {
            console.log(JSON.stringify(reqItem, null, 2));
        } else {
            console.error("Request not found in collection.");
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
