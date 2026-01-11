"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console in development
    console.error("Error caught by error boundary:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <CardTitle className="text-2xl font-bold text-destructive">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-lg">
            We encountered an unexpected error
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            Don't worry, your data is safe. Please try again or return to the home page.
          </p>
          {process.env.NODE_ENV === "development" && error.message && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-left overflow-auto max-h-32">
              <code>{error.message}</code>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Button onClick={reset}>
              Try Again
            </Button>
            <Link href="/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Go Home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
