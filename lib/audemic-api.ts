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
 * Creates a new user in Audemic via API and provisions a subscription
 */
export async function createAudemicUser(userData: CreateUserOptions): Promise<{ success: boolean; error?: string; userId?: number; subscriptionId?: string }> {
    try {
        const password = process.env.DEFAULT_USER_PASSWORD || "Audemic@123"
        // Verified Provider: "Test dsa" (staging/prod workaround) or real provider if seeded
        // In production context, we should use the actual provider name if available, or fall back to "Test dsa" if testing.
        // For now, I will pass the provider as is, but note the case sensitivity requirement in docs.
        const providerName = userData.dsaProvider || "Test dsa"

        // Step 1: Create user
        console.log(`[Audemic API] Creating user: ${userData.email} with provider: ${providerName}`)

        const userPayload = {
            dsa_provider: providerName,
            user: {
                email: userData.email,
                password: password,
                first_name: userData.firstName,
                last_name: userData.lastName,
                po_number: userData.poNumber
            }
        }

        const createResponse = await fetch(`${BASE_URL}/api/v2/dsa/users/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "x-client": "audemic-scholar-mobile"
            },
            body: JSON.stringify(userPayload)
        })

        if (!createResponse.ok) {
            const errorText = await createResponse.text()
            console.error(`[Audemic API] Signup failed: ${createResponse.status} ${errorText}`)
            return { success: false, error: `Signup failed: ${createResponse.status} ${errorText}` }
        }

        // Expected Response: { "user_id": 123, "email": "..." }
        const keyData = await createResponse.json()
        const userId = keyData.user_id

        if (!userId) {
            return { success: false, error: "User created but no ID returned in response" }
        }

        console.log(`[Audemic API] User created successfully! ID: ${userId}. Proceeding to subscription...`)

        // Step 2: Create Subscription
        // Calculate end date based on duration
        const years = userData.dsaDurationYears || 4
        const endDate = new Date()
        endDate.setFullYear(endDate.getFullYear() + years)
        const formattedEndDate = endDate.toISOString().split('T')[0] // YYYY-MM-DD

        const subPayload = {
            user_id: String(userId),
            end_date: formattedEndDate // "10-12-2026"
        }

        const subResponse = await fetch(`${BASE_URL}/api/v2/dsa/subscriptions/`, {
            method: "PATCH", // Verified as PATCH
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "x-client": "audemic-scholar-mobile" // Required header
            },
            body: JSON.stringify(subPayload)
        })

        if (!subResponse.ok) {
            const subError = await subResponse.text()
            console.error(`[Audemic API] Subscription failed: ${subResponse.status} ${subError}`)
            // We return success: false because the user is useless without a sub?
            // Or true with error? Let's return partial success or fail.
            // Requirement says "User Provisioning", so fail is appropriate if sub fails.
            return { success: false, error: `User created (ID: ${userId}) but subscription failed: ${subResponse.status}`, userId: userId }
        }

        // Expected Response: { "subscription": { "id": 3745, "end_date": "..." } }
        const subData = await subResponse.json()
        const subscriptionId = subData.subscription?.id

        console.log(`[Audemic API] Subscription created! ID: ${subscriptionId}`)

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
