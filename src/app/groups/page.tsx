"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function GroupsPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold">
            <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              NextUp
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
              Dashboard
            </Link>
            <Link href="/groups" className="text-sm font-medium hover:text-primary">
              Groups
            </Link>
            <Link href="/me" className="text-sm font-medium hover:text-primary">
              My Lists
            </Link>
            <Link href="/settings" className="text-sm font-medium hover:text-primary">
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Groups</h1>
            <p className="text-muted-foreground">
              Join or create groups to share games with friends.
            </p>
          </div>
          <Button>Create Group</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No Groups Yet</CardTitle>
            <CardDescription>
              Create a group and invite your friends to start tracking games together.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Groups allow you to see what games your friends are playing, share wishlists, and discover new games together.
            </p>
            <div className="flex gap-4">
              <Button>Create Your First Group</Button>
              <Button variant="outline">Join with Invite Code</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
