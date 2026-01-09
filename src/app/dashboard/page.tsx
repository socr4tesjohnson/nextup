"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}!
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening in your gaming world.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>My Groups</CardTitle>
              <CardDescription>Groups you're a member of</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">You haven't joined any groups yet.</p>
              <Link href="/groups">
                <Button>Browse Groups</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Now Playing</CardTitle>
              <CardDescription>Games you're currently playing</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">No games in your "Now Playing" list.</p>
              <Link href="/me">
                <Button variant="outline">Add Games</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wishlist</CardTitle>
              <CardDescription>Games you want to play</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">Your wishlist is empty.</p>
              <Link href="/me">
                <Button variant="outline">Add Games</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
