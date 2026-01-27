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

if (!API_KEY) {
    console.error('Error: POSTMAN_API_KEY not found in .env');
    process.exit(1);
}

const TYPE = process.argv[2]; // 'collection' or 'request' (actually 'item' in Postman API but we'll infer)
const ID = process.argv[3];

if (!TYPE || !ID) {
    console.error('Usage: node scripts/postman/inspect_item.js <collection|request> <ID>');
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

function printFull(obj) {
    console.log(JSON.stringify(obj, null, 2));
}

async function main() {
    try {
        if (TYPE === 'collection') {
            console.log(`Fetching collection ${ID}...`);
            const data = await request(`/collections/${ID}`);
            printFull(data);
        } else if (TYPE === 'request') {
            // For requests, we usually need to find them within a collection, 
            // but Postman API doesn't allow fetching a single request by ID directly 
            // unless we know the collection. 
            // Wait, there is no direct /requests/{id} endpoint in standard Postman API v1?
            // Actually there is /collections/{id} which returns the whole thing.
            // Helper: We will assume we are inspecting a specific request assuming the user gives us the COLLECTION ID?
            // No, the ID I have is just a UID. 
            // If I want to inspect a request, I need to fetch the collection it belongs to.
            // BUT I don't know which collection it belongs to easily from the UID alone without searching.
            // SO: For this script, I will just support 'collection' for now to debug the "Onboarding" empty issue.
            // If I want to inspect a request, I'll have to parse the collection output.

            // ALTERNATIVE: Use the /workspaces/{id} to get all hierarchy? No that's what list_endpoints did.

            // Let's just fetch the collection and print it.
            console.error("For 'request' inspection, please provide the Collection ID it belongs to, or just inspect the collection.");
            // Actually, let's just allow fetching arbitrary paths if starting with /
            if (ID.startsWith('/')) {
                const data = await request(ID);
                printFull(data);
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

main();
