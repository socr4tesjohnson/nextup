import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function GroupNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-xl font-bold">
            <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              NextUp
            </span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold text-primary mb-2">Group Not Found</CardTitle>
            <CardDescription className="text-base">
              This group doesn't exist or you don't have access to it.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              The group may have been deleted, or you might not be a member.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link href="/groups">
                <Button>View My Groups</Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
