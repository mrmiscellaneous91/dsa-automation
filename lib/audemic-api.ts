/**
 * Audemic API Client
 * Creates users, updates profiles, and creates subscriptions using DSA endpoints.
 */

const BASE_URL = process.env.AUDEMIC_API_URL || "https://www.audemic.app"
const X_CLIENT = process.env.AUDEMIC_X_CLIENT || "audemic-scholar-mobile"
const DEFAULT_PASSWORD = process.env.DEFAULT_USER_PASSWORD || "Audemic@123"

export interface CreateUserResult {
    success: boolean
    userId?: number
    subscriptionId?: number
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
export async function createAudemicUser(userData: CreateUserOptions): Promise<CreateUserResult> {
    try {
        const password = DEFAULT_PASSWORD
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
                "x-client": X_CLIENT
            },
            body: JSON.stringify(userPayload)
        })

        if (!createResponse.ok) {
            const errorText = await createResponse.text()
            console.error(`[Audemic API] Signup failed: ${createResponse.status} ${errorText}`)
            return { success: false, error: `Signup failed: ${createResponse.status} ${errorText}` }
        }

        const keyData = await createResponse.json()
        const userId = keyData.user_id

        if (!userId) {
            return { success: false, error: "User created but no ID returned in response" }
        }

        console.log(`[Audemic API] User created successfully! ID: ${userId}. Proceeding to subscription...`)

        // Step 2: Create Subscription
        const years = userData.dsaDurationYears || 4
        const endDate = new Date()
        endDate.setFullYear(endDate.getFullYear() + years)
        const formattedEndDate = endDate.toISOString().split('T')[0] // YYYY-MM-DD

        const subPayload = {
            user_id: String(userId),
            end_date: formattedEndDate
        }

        const subResponse = await fetch(`${BASE_URL}/api/v2/dsa/subscriptions/`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "x-client": X_CLIENT
            },
            body: JSON.stringify(subPayload)
        })

        if (!subResponse.ok) {
            const subError = await subResponse.text()
            console.error(`[Audemic API] Subscription failed: ${subResponse.status} ${subError}`)
            return { 
                success: false, 
                error: `User created (ID: ${userId}) but subscription failed: ${subResponse.status}`,
                userId: parseInt(userId)
            }
        }

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
