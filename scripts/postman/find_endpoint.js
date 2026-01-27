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
const SEARCH_TERM = process.argv[2];

if (!API_KEY) {
    console.error('Error: POSTMAN_API_KEY not found in .env');
    process.exit(1);
}
if (!SEARCH_TERM) {
    console.error('Usage: node scripts/postman/find_endpoint.js <SEARCH_TERM>');
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
                } else {
                    // resolve null to just skip failures gracefully during search
                    resolve(null);
                }
            });
        });
        req.on('error', (e) => resolve(null));
        req.end();
    });
}

function searchItems(items, term, collectionName, pathSoFar = '') {
    if (!items) return;
    items.forEach(item => {
        const currentPath = pathSoFar ? `${pathSoFar} > ${item.name}` : item.name;

        if (item.request) {
            // Check Name, URL
            let url = '';
            if (typeof item.request.url === 'string') {
                url = item.request.url;
            } else if (item.request.url && item.request.url.raw) {
                url = item.request.url.raw;
            }

            if (item.name.toLowerCase().includes(term.toLowerCase()) || url.toLowerCase().includes(term.toLowerCase())) {
                console.log(`[FOUND] Workspace: ??? | Collection: ${collectionName}`);
                console.log(`  Path: ${currentPath}`);
                console.log(`  Method: ${item.request.method}`);
                console.log(`  URL: ${url}`);
                console.log(`  ID: ${item.uid}`);
                console.log('---');
            }
        }

        if (item.item) {
            searchItems(item.item, term, collectionName, currentPath);
        }
    });
}

async function main() {
    console.log(`Searching for "${SEARCH_TERM}" across all workspaces...`);

    // 1. Get Workspaces
    const wsResp = await request('/workspaces');
    if (!wsResp || !wsResp.workspaces) {
        console.error("Failed to fetch workspaces.");
        return;
    }

    // 2. Iterate Workspaces
    for (const ws of wsResp.workspaces) {
        // console.log(`Checking Workspace: ${ws.name}...`);
        const wsDetails = await request(`/workspaces/${ws.id}`);
        if (!wsDetails || !wsDetails.workspace || !wsDetails.workspace.collections) continue;

        // 3. Iterate Collections
        for (const col of wsDetails.workspace.collections) {
            const colDetails = await request(`/collections/${col.uid}`);
            if (colDetails && colDetails.collection) {
                // We pass ws.name implicitly or just print it if found?
                // searchItems doesn't know ws name currently. 
                // Let's modify searchItems to print it or just capture it.
                // Actually easier to just do it here:
                if (colDetails.collection.item) {
                    // Helper wrapper to inject WS name
                    const finder = (items, p) => {
                        if (!items) return;
                        items.forEach(i => {
                            const cp = p ? `${p} > ${i.name}` : i.name;
                            if (i.request) {
                                let u = '';
                                if (typeof i.request.url === 'string') u = i.request.url;
                                else if (i.request.url && i.request.url.raw) u = i.request.url.raw;

                                if (i.name.toLowerCase().includes(SEARCH_TERM.toLowerCase()) || u.toLowerCase().includes(SEARCH_TERM.toLowerCase())) {
                                    console.log(`[FOUND] Workspace: ${ws.name} | Collection: ${col.name}`);
                                    console.log(`  Path: ${cp}`);
                                    console.log(`  Method: ${i.request.method}`);
                                    console.log(`  URL: ${u}`);
                                    console.log(`  ID: ${i.uid}`);
                                    console.log('---');
                                }
                            }
                            if (i.item) finder(i.item, cp);
                        });
                    };
                    finder(colDetails.collection.item, '');
                }
            }
        }
    }
    console.log("Search complete.");
}

main();
