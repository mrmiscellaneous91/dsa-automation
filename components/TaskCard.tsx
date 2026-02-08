"use client"

import { useState } from "react"
import { WELCOME_EMAIL_TEMPLATE, CONFIRMATION_EMAIL_TEMPLATE } from "@/lib/templates"

interface TaskCardProps {
    task: any
    onComplete: () => void
}

export default function TaskCard({ task, onComplete }: TaskCardProps) {
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const parsed = task.parsedData

    const logToSheets = async () => {
        setLoading(true)
        setError("")
        try {
            const res = await fetch("/api/sheets/log", {
                method: "POST",
                body: JSON.stringify({ data: parsed }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Failed to log to sheets")
            }
            setStep(2)
            return true
        } catch (err: any) {
            setError(err.message)
            return false
        } finally {
            setLoading(false)
        }
    }

    const runAutomation = async () => {
        setLoading(true)
        setError("")
        try {
            const res = await fetch("/api/admin/automate", {
                method: "POST",
                body: JSON.stringify({
                    userData: {
                        email: parsed.userEmail,
                        userName: parsed.userName,
                        licenseYears: parsed.licenseYears
                    }
                }),
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || "Automation failed")
            }
            setStep(3)
            return true
        } catch (err: any) {
            setError(err.message)
            return false
        } finally {
            setLoading(false)
        }
    }

    const sendWelcome = async () => {
        setLoading(true)
        setError("")
        try {
            const firstName = parsed.userName.split(" ")[0]
            const body = WELCOME_EMAIL_TEMPLATE(firstName, parsed.userEmail, parsed.licenseYears, 'Audemic@123')
            const res = await fetch("/api/gmail/send", {
                method: "POST",
                body: JSON.stringify({
                    to: parsed.userEmail,
                    subject: `${parsed.userName}: Audemic Scholar - DSA Licence`,
                    body,
                }),
            })
            if (!res.ok) throw new Error("Failed to send welcome email")
            setStep(4)
            return true
        } catch (err: any) {
            setError(err.message)
            return false
        } finally {
            setLoading(false)
        }
    }

    const sendConfirmation = async () => {
        setLoading(true)
        setError("")
        try {
            const body = CONFIRMATION_EMAIL_TEMPLATE(parsed.providerContact)
            const res = await fetch("/api/gmail/send", {
                method: "POST",
                body: JSON.stringify({
                    to: task.from, // Reply to the provider
                    subject: `Re: ${task.subject}`,
                    body,
                    threadId: task.threadId,
                }),
            })
            if (!res.ok) throw new Error("Failed to send confirmation to provider")
            setStep(5)
            return true
        } catch (err: any) {
            setError(err.message)
            return false
        } finally {
            setLoading(false)
        }
    }

    const runAllSteps = async () => {
        setLoading(true)
        setError("")

        try {
            // Step 1: Log to Sheets
            const res1 = await fetch("/api/sheets/log", {
                method: "POST",
                body: JSON.stringify({ data: parsed }),
            })
            if (!res1.ok) {
                const data = await res1.json()
                throw new Error(`Step 1 Failed: ${data.error || "Failed to log to sheets"}`)
            }
            setStep(2)

            // Step 2: Automation
            const res2 = await fetch("/api/admin/automate", {
                method: "POST",
                body: JSON.stringify({
                    userData: {
                        email: parsed.userEmail,
                        userName: parsed.userName,
                        licenseYears: parsed.licenseYears
                    }
                }),
            })
            if (!res2.ok) {
                const data = await res2.json()
                throw new Error(`Step 2 Failed: ${data.error || "Automation failed"}`)
            }
            setStep(3)

            // Step 3: Welcome Email
            const firstName = parsed.userName.split(" ")[0]
            const welcomeBody = WELCOME_EMAIL_TEMPLATE(firstName, parsed.userEmail, parsed.licenseYears, 'Audemic@123')
            const res3 = await fetch("/api/gmail/send", {
                method: "POST",
                body: JSON.stringify({
                    to: parsed.userEmail,
                    subject: `${parsed.userName}: Audemic Scholar - DSA Licence`,
                    body: welcomeBody,
                }),
            })
            if (!res3.ok) throw new Error("Step 3 Failed: Failed to send welcome email")
            setStep(4)

            // Step 4: Provider Confirm
            const confirmBody = CONFIRMATION_EMAIL_TEMPLATE(parsed.providerContact)
            const res4 = await fetch("/api/gmail/send", {
                method: "POST",
                body: JSON.stringify({
                    to: task.from,
                    subject: `Re: ${task.subject}`,
                    body: confirmBody,
                    threadId: task.threadId,
                }),
            })
            if (!res4.ok) throw new Error("Step 4 Failed: Failed to send confirmation to provider")
            setStep(5)

        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-6 transition-all hover:shadow-xl">
            <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full mb-2">
                            {parsed.provider}
                        </span>
                        <h3 className="text-xl font-bold text-gray-900">{parsed.userName}</h3>
                        <p className="text-sm text-gray-500">{parsed.userEmail}</p>
                    </div>
                    <div className="text-right text-sm">
                        <p className="font-mono text-gray-600">PO: {parsed.poNumber}</p>
                        <p className="text-gray-500">{parsed.licenseYears} Year Licence</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                        {error}
                    </div>
                )}

                {step === 1 && (
                    <div className="mb-6">
                        <button
                            onClick={runAllSteps}
                            disabled={loading}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold transition-all hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing Auto-Onboarding...
                                </>
                            ) : (
                                <>
                                    <span>⚡️</span>
                                    Run All Steps (1-4)
                                </>
                            )}
                        </button>
                    </div>
                )}

                <div className="space-y-4">
                    {/* Step 1: Log to Sheets */}
                    <div className={`p-4 rounded-lg flex items-center justify-between transition-colors ${step >= 1 ? 'bg-gray-50' : 'opacity-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step > 1 ? 'bg-green-500 text-white' : 'bg-blue-600 text-white'}`}>
                                {step > 1 ? "✓" : "1"}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">Log to Spreadsheet</p>
                                <p className="text-xs text-gray-500">Record transaction in Google Sheets</p>
                            </div>
                        </div>
                        {step === 1 && (
                            <button
                                onClick={logToSheets}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {loading ? "Logging..." : "Run Step 1"}
                            </button>
                        )}
                    </div>

                    {/* Step 2: Create Sub */}
                    <div className={`p-4 rounded-lg flex items-center justify-between transition-colors ${step >= 2 ? 'bg-gray-50' : 'opacity-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step > 2 ? 'bg-green-500 text-white' : step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {step > 2 ? "✓" : "2"}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">Automated Provisioning</p>
                                <p className="text-xs text-gray-500">Bot logs in & creates subscription automatically</p>
                            </div>
                        </div>
                        {step === 2 && (
                            <button
                                onClick={runAutomation}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {loading ? "Automating..." : "Run Step 2 (Automated)"}
                            </button>
                        )}
                    </div>

                    {/* Step 3: Welcome Email */}
                    <div className={`p-4 rounded-lg flex items-center justify-between transition-colors ${step >= 3 ? 'bg-gray-50' : 'opacity-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step > 3 ? 'bg-green-500 text-white' : step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {step > 3 ? "✓" : "3"}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">Send Welcome Email</p>
                                <p className="text-xs text-gray-500">Send login credentials to student</p>
                            </div>
                        </div>
                        {step === 3 && (
                            <button
                                onClick={sendWelcome}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {loading ? "Sending..." : "Run Step 3"}
                            </button>
                        )}
                    </div>

                    {/* Step 4: Provider Confirm */}
                    <div className={`p-4 rounded-lg flex items-center justify-between transition-colors ${step >= 4 ? 'bg-gray-50' : 'opacity-50'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step > 4 ? 'bg-green-500 text-white' : step === 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                {step > 4 ? "✓" : "4"}
                            </div>
                            <div>
                                <p className="font-semibold text-gray-900">Confirm to Provider</p>
                                <p className="text-xs text-gray-500">Reply to provider: &quot;User issued&quot;</p>
                            </div>
                        </div>
                        {step === 4 && (
                            <button
                                onClick={sendConfirmation}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {loading ? "Sending..." : "Run Step 4"}
                            </button>
                        )}
                    </div>
                </div>

                {step === 5 && (
                    <div className="mt-6">
                        <button
                            onClick={onComplete}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Finish & Clear Task
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
