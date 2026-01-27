// const { createAudemicUser } = require('../lib/audemic-api');

const BASE_URL = process.env.AUDEMIC_API_URL || "https://www.audemic.app";
const PASSWORD = process.env.DEFAULT_USER_PASSWORD || "Audemic@123";

async function testProvisioning() {
    // Check DOCUMENTATION.md for Current Test User ID before running!
    const TEST_ID = 2;
    const email = `${TEST_ID}@audemic.io`;
    console.log(`Starting test for: ${email} -> ${BASE_URL}`);

    // 1. Create User
    console.log(`[TEST] 1. Creating User via ${BASE_URL}/users...`);
    let createResponse = await fetch(`${BASE_URL}/users`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "x-client": "audemic-scholar-mobile"
        },
        body: JSON.stringify({
            user: {
                email,
                password: PASSWORD,
                password_confirmation: PASSWORD,
                first_name: "Test",
                last_name: "Student",
                action: "signup"
            }
        })
    });

    console.log('[TEST] Response Headers:', [...createResponse.headers.entries()]);

    let createData; // Declare createData here
    if (createResponse.status === 404) {
        console.warn(`[TEST] /users returned 404. This might mean the endpoint doesn't exist OR the base URL is wrong.`);
    } else if (!createResponse.ok) {
        console.warn(`[TEST] /users failed with status ${createResponse.status}`);
        console.warn(await createResponse.text());
    } else {
        createData = await createResponse.json();
        console.log('[TEST] User Creation Response:', JSON.stringify(createData, null, 2));
    }

    // 2. Check Subscription
    console.log(`[TEST] 2. Checking Subscription via ${BASE_URL}/api/v2/subscription...`);
    const authToken = createData?.data?.token || createData?.token;

    if (authToken) {
        const subResponse = await fetch(`${BASE_URL}/api/v2/subscription`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "x-client": "audemic-scholar-mobile",
                "Authorization": `Bearer ${authToken}`
            }
        });

        if (subResponse.ok) {
            const subData = await subResponse.json();
            console.log('[TEST] Subscription Response:', JSON.stringify(subData, null, 2));
        } else {
            console.warn(`[TEST] Subscription check failed: ${subResponse.status}`);
            console.warn(await subResponse.text());
        }
    } else {
        console.warn('[TEST] Skipping subscription check due to missing token.');
    }
}

testProvisioning();
