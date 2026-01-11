"use client"

import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Global error caught:", error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}>
          <div style={{
            maxWidth: "28rem",
            margin: "0 1rem",
            padding: "2rem",
            backgroundColor: "white",
            borderRadius: "0.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div>
            <h1 style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: "#ef4444",
              marginBottom: "0.5rem",
            }}>
              Something went wrong
            </h1>
            <p style={{
              color: "#64748b",
              marginBottom: "1.5rem",
            }}>
              We encountered an unexpected error. Please try again.
            </p>
            <div style={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}>
              <button
                onClick={reset}
                style={{
                  padding: "0.5rem 1rem",
                  background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                Try Again
              </button>
              <a
                href="/"
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "white",
                  color: "#1e293b",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.375rem",
                  textDecoration: "none",
                  fontWeight: "500",
                }}
              >
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
