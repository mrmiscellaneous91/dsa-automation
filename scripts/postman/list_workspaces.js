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

const options = {
    hostname: 'api.getpostman.com',
    path: '/workspaces',
    method: 'GET',
    headers: {
        'X-Api-Key': API_KEY
    }
};

const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
            const response = JSON.parse(data);
            console.log('Available Workspaces:');
            response.workspaces.forEach(ws => {
                console.log(`- [${ws.type}] ${ws.name} (ID: ${ws.id})`);
            });
        } else {
            console.error(`Error: Status Code ${res.statusCode}`);
            console.error(data);
        }
    });
});

req.on('error', (error) => {
    console.error('Error fetching workspaces:', error);
});

req.end();
