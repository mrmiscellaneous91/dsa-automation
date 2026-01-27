/**
 * Audemic API Client
 * Creates users, updates profiles, and creates subscriptions.
 */

const BASE_URL = process.env.AUDEMIC_API_URL || "https://www.audemic.app"

export interface CreateUserResult {
    success: boolean
    userId?: number | string
    error?: string
}

export interface CreateUserOptions {
    email: string
    firstName: string
    lastName: string
    dsaEligible?: boolean
    dsaDurationYears?: number
    dsaProvider?: string
    poNumber?: string
}

/**
 * Creates a new user in Audemic via API
 */
export async function createAudemicUser(userData: CreateUserOptions): Promise<{ success: boolean; error?: string; userId?: number; subscriptionId?: string }> {
    try {
        // Authenticate to get token (needed for some ops, but usually signup creates its own)
        // For the new flow, we just hit /users directly with the payload.

        const password = process.env.DEFAULT_USER_PASSWORD || "Audemic@123"

        // Step 1: Create user with DSA params
        console.log(`[Audemic API] Creating user: ${userData.email}`)

        let createResponse = await fetch(`${BASE_URL}/users`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "x-client": "audemic-scholar-mobile"
            },
            body: JSON.stringify({
                user: {
                    email: userData.email,
                    password: password,
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    action: "signup",
                    // DSA Extensions (Waiting for backend implementation)
                    dsa_eligible: userData.dsaEligible,
                    dsa_duration_years: userData.dsaDurationYears,
                    dsa_provider: userData.dsaProvider,
                    po_number: userData.poNumber
                }
            })
        })

        if (!createResponse.ok) {
            const errorText = await createResponse.text()
            console.error(`[Audemic API] Signup failed: ${createResponse.status} ${errorText}`)
            return { success: false, error: `Signup failed: ${createResponse.status}` }
        }

        const data = await createResponse.json()
        const userId = data.data?.user?.id
        const subscriptionId = data.data?.subscription?.stripe_id

        if (!userId) {
            return { success: false, error: "User created but no ID returned" }
        }

        console.log(`[Audemic API] User created successfully! ID: ${userId}, SubID: ${subscriptionId || 'None'}`)

        // With the new DSA flow, signup handles everything.
        // We return the Stripe ID for logging if available.

        return {
            success: true,
            userId: parseInt(userId),
            subscriptionId: subscriptionId
        }

    } catch (error: any) {
        console.error("[Audemic API] Error:", error)
        return { success: false, error: error.message }
    }
}
