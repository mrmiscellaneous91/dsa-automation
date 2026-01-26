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
            browser = await puppeteerCore.connect({
                browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`,
            })
        } else {
            browser = await puppeteer.launch({ headless: true })
        }

        const page = await browser.newPage()
        // Set a reasonable viewport for rails_admin
        await page.setViewport({ width: 1280, height: 800 })

        // 1. Login
        console.log("[Automation] Logging into admin panel...")
        await page.goto("https://www.audemic.app/admin/login", { waitUntil: "networkidle2" })

        // Check if already logged in
        if (page.url().includes("/admin/login")) {
            await page.type('input[name="admin_user[email]"]', adminEmail)
            await page.type('input[name="admin_user[password]"]', adminPassword)
            await page.click('input[type="submit"]')
            await page.waitForNavigation({ waitUntil: "networkidle2" })
        }

        // 2. Create User
        console.log(`[Automation] Creating user: ${userData.email}`)
        await page.goto("https://www.audemic.app/admin/user/new", { waitUntil: "networkidle2" })

        await page.type('input[name="user[email]"]', userData.email)
        await page.type('input[name="user[password]"]', "Audemic@123")

        const names = userData.userName.split(" ")
        const firstName = names[0]
        const lastName = names.slice(1).join(" ") || firstName

        await page.type('input[name="user[first_name]"]', firstName)
        await page.type('input[name="user[last_name]"]', lastName)

        // Submit user creation
        await page.click('button[name="_save"]')
        await page.waitForNavigation({ waitUntil: "networkidle2" })

        // 3. Create Subscription
        console.log(`[Automation] Creating subscription for ${userData.email} (${userData.licenseYears} years)`)
        await page.goto("https://www.audemic.app/admin/subscription/new", { waitUntil: "networkidle2" })

        // Find the User mapping (searchable dropdown)
        await page.click('.ra-filtering-select-input')
        await page.keyboard.type(userData.email)
        await new Promise(resolve => setTimeout(resolve, 1500)) // Wait for search results
        await page.keyboard.press('ArrowDown')
        await page.keyboard.press('Enter')

        // Set Plan Type to Yearly
        await page.select('select#subscription_plan_type', 'yearly')

        // Set Dates
        const startDate = new Date().toISOString().split('T')[0]
        const endDateObj = new Date()
        endDateObj.setFullYear(endDateObj.getFullYear() + userData.licenseYears)
        const endDate = endDateObj.toISOString().split('T')[0]

        await page.type('input#subscription_start_date', startDate)
        await page.type('input#subscription_end_date', endDate)

        // Set Active to True (checkbox or specific toggle)
        try {
            await page.click('input#subscription_active_1')
        } catch (e) {
            console.log("[Automation] Could not find specific active toggle, trying generic checkbox...")
            const activeCheckbox = await page.$('input[name="subscription[active]"]')
            if (activeCheckbox) {
                const isChecked = await (await activeCheckbox.getProperty('checked')).jsonValue()
                if (!isChecked) await activeCheckbox.click()
            }
        }

        // Save Subscription
        await page.click('button[name="_save"]')
        await page.waitForNavigation({ waitUntil: "networkidle2" })

        console.log("[Automation] Success: User and Subscription created.")
        await browser.close()
        return { success: true }
    } catch (error: any) {
        if (browser) await browser.close()
        console.error("Automation error:", error)
        return { success: false, error: error.message }
    }
}
