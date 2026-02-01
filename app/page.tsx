"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import TaskCard from "@/components/TaskCard"

export default function Home() {
  const { data: session, status } = useSession()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const fetchTasks = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/gmail/fetch")
      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Server Error (${res.status}): ${text || res.statusText}`)
      }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setTasks(data.tasks)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
            <span className="text-4xl">📬</span>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Audemic DSA</h1>
          <p className="text-gray-500 mb-8">Automate student license provisioning with one click.</p>
          <button
            onClick={() => signIn("google")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-100 flex items-center justify-center gap-3"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500">Welcome back, {session.user?.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => signOut()}
            className="text-gray-500 hover:text-red-600 font-medium transition-colors"
          >
            Logout
          </button>
          <img
            src={session.user?.image || ""}
            alt="User"
            className="w-12 h-12 rounded-full border-2 border-white shadow-md"
          />
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <p className="text-sm font-semibold text-gray-700">
            {tasks.length} Pending Requests
          </p>
          {tasks.length > 0 && (
            <button
              onClick={() => { setTasks([]); localStorage.removeItem('dsa-tasks'); }}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Clear All
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/issue"
            className="bg-white hover:bg-slate-50 text-blue-600 border border-blue-100 px-6 py-2 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
          >
            <span>➕</span> Manual Issue
          </Link>
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Checking Gmail...
              </>
            ) : (
              "Check for New Requests"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 shadow-sm animate-pulse">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Task List */}
      <div className="space-y-6">
        {tasks.length === 0 && !loading ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
            <span className="text-6xl mb-4 block">☕️</span>
            <h2 className="text-xl font-bold text-gray-900">All caught up!</h2>
            <p className="text-gray-500">Click the button above to check for new provider emails.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => setTasks(tasks.filter(t => t.id !== task.id))}
            />
          ))
        )}
      </div>
    </main>
  )
}
