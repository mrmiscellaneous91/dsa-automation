"use client"

import { useSession } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function IssueLicensePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    userName: "",
    email: "",
    licenseYears: "1",
    poNumber: "",
    provider: "Remtek", // Default to one of the known providers
    poFile: null as File | null
  })

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/")
    }
  }, [status, router])

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Ensure session is available for image
  const userImage = session?.user?.image || ""


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess(false)

    try {
      // If we were handling files properly, we'd use FormData or upload to S3 here.
      // For now, we'll keep the JSON flow and just pass the metadata.
      const res = await fetch("/api/admin/automate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userData: {
            ...formData,
            licenseYears: parseInt(formData.licenseYears),
            poFileName: formData.poFile?.name || ""
          }
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to issue license")

      setSuccess(true)
      setFormData({
        userName: "",
        email: "",
        licenseYears: "1",
        poNumber: "",
        provider: "Remtek",
        poFile: null
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <img
              src={userImage}
              alt="User"
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/50 border border-blue-50 overflow-hidden">
          <div className="bg-blue-600 p-8 text-white">
            <h1 className="text-2xl font-bold">Manual License Issuance</h1>
            <p className="text-blue-100 mt-1">Create a new student account and provision their license immediately.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="userName" className="text-sm font-semibold text-gray-700">Student Name</label>
                <input
                  id="userName"
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-gray-700">Student Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="e.g. john@university.edu"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="provider" className="text-sm font-semibold text-gray-700">Supplier</label>
                <select
                  id="provider"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                >
                  <option value="Remtek">Remtek</option>
                  <option value="Invate">Invate</option>
                  <option value="Barry Bennett">Barry Bennett</option>
                  <option value="Assistive">Assistive</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="licenseYears" className="text-sm font-semibold text-gray-700">License Duration</label>
                <select
                  id="licenseYears"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white"
                  value={formData.licenseYears}
                  onChange={(e) => setFormData({ ...formData, licenseYears: e.target.value })}
                >
                  <option value="1">1 Year</option>
                  <option value="3">3 Years</option>
                  <option value="4">4 Years</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="poNumber" className="text-sm font-semibold text-gray-700">PO Number</label>
              <input
                id="poNumber"
                type="text"
                placeholder="e.g. PO-98765"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={formData.poNumber}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="poFile" className="text-sm font-semibold text-gray-700">Upload PO (Optional)</label>
              <div className="flex items-center justify-center w-full">
                <label
                  htmlFor="poFile"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-2xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <span className="text-2xl mb-2">📄</span>
                    <p className="mb-2 text-sm text-gray-500 font-medium">
                      {formData.poFile ? formData.poFile.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-gray-400">PDF, PNG or JPG (MAX. 5MB)</p>
                  </div>
                  <input
                    id="poFile"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setFormData({ ...formData, poFile: file })
                    }}
                  />
                </label>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm animate-shake">
                <strong>Error:</strong> {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-100 text-sm">
                <strong>Success!</strong> Student license has been issued and account created.
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-100 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Issuing License...
                </>
              ) : (
                "Issue License Now"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
