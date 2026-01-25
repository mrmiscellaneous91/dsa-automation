import puppeteer from "puppeteer"
import puppeteerCore from "puppeteer-core"

export interface AutomationResult {
    success: boolean
    error?: string
}

export async function automateUserCreation(userData: {
    email: string
    userName: string
    licenseYears: number
}): Promise<AutomationResult> {
    const browserlessToken = process.env.BROWSERLESS_TOKEN
    const adminEmail = process.env.ADMIN_EMAIL
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminEmail || !adminPassword) {
        return { success: false, error: "Missing admin credentials in environment" }
    }

    let browser
    try {
        if (browserlessToken) {
            // Use Browserless for web deployment
            browser = await puppeteerCore.connect({
                browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`,
            })
        } else {
            // Use local Puppeteer for development
            browser = await puppeteer.launch({ headless: true })
        }

        const page = await browser.newPage()

        // 1. Login
        await page.goto("https://www.audemic.app/admin/login", { waitUntil: "networkidle2" })
        await page.type('input[name="email"]', adminEmail)
        await page.type('input[name="password"]', adminPassword)
        await page.click('button[type="submit"]')
        await page.waitForNavigation()

        // 2. Navigate to User Creation
        // Note: Based on screenshots, we need to click "Add a new User"
        await page.goto("https://www.audemic.app/admin/users/add", { waitUntil: "networkidle2" })

        await page.type('input[name="email"]', userData.email)
        await page.type('input[name="password"]', "Audemic@123")

        const names = userData.userName.split(" ")
        await page.type('input[name="first_name"]', names[0])
        await page.type('input[name="last_name"]', names.slice(1).join(" "))

        // Set active and confirmed (based on switches in screenshot)
        // We'll use click for the switches if they are checkboxes or buttons
        // This part might need adjustment based on exact HTML selectors

        await page.click('button[type="submit"]')
        await page.waitForNavigation()

        // 3. Add Subscription
        // Navigate to where subscriptions are added for this user
        // Based on screenshots, it's often a separate form or related list

        // This is a placeholder for the exact navigation to the subscription form
        // await page.goto(`https://www.audemic.app/admin/subscriptions/add?user_email=${userData.email}`)

        // Select Plan type: "Yearly"
        // Set Start date: Now
        // Set End date: Now + years

        // await page.select('select[name="plan_type"]', "Yearly")
        // await page.click('button[type="submit"]')

        await browser.close()
        return { success: true }
    } catch (error: any) {
        if (browser) await browser.close()
        console.error("Automation error:", error)
        return { success: false, error: error.message }
    }
}
