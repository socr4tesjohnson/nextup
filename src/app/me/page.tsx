"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function MyListsPage() {
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
            <h1 className="text-3xl font-bold mb-2">My Game Lists</h1>
            <p className="text-muted-foreground">
              Manage your gaming backlog, wishlist, and more.
            </p>
          </div>
          <Button>Add Game</Button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <Button variant="secondary" size="sm">All</Button>
          <Button variant="ghost" size="sm">Now Playing</Button>
          <Button variant="ghost" size="sm">Backlog</Button>
          <Button variant="ghost" size="sm">Wishlist</Button>
          <Button variant="ghost" size="sm">Finished</Button>
          <Button variant="ghost" size="sm">Favorites</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No Games Yet</CardTitle>
            <CardDescription>
              Start building your game library by adding games.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Search for games and add them to your lists to track your progress and share with friends.
            </p>
            <Button>Search Games</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
