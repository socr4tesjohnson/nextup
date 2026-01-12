"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface GameEntry {
  id: string
  status: string
  game: {
    id: string
    name: string
    coverUrl: string | null
  }
}

interface DashboardStats {
  nowPlaying: GameEntry[]
  wishlist: GameEntry[]
  groups: { id: string; name: string }[]
}

export default function DashboardPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [stats, setStats] = useState<DashboardStats>({
    nowPlaying: [],
    wishlist: [],
    groups: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (sessionStatus === "loading") return

    async function fetchDashboardData() {
      try {
        // Fetch user's game entries
        const [listsRes, groupsRes] = await Promise.all([
          fetch("/api/lists"),
          fetch("/api/groups")
        ])

        const listsData = await listsRes.json()
        const groupsData = await groupsRes.json()

        if (listsRes.ok && listsData.entries) {
          const entries = listsData.entries as GameEntry[]
          setStats({
            nowPlaying: entries.filter(e => e.status === "NOW_PLAYING"),
            wishlist: entries.filter(e => e.status === "WISHLIST"),
            groups: groupsData.groups || []
          })
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [sessionStatus])

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content" className="container mx-auto px-4 py-8">
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
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-4/5" />
                  <Skeleton className="h-8 w-3/5" />
                </div>
              ) : stats.groups.length > 0 ? (
                <div className="space-y-2">
                  {stats.groups.slice(0, 3).map(group => (
                    <Link key={group.id} href={`/groups/${group.id}`} className="block hover:bg-muted p-2 rounded transition-colors">
                      {group.name}
                    </Link>
                  ))}
                  {stats.groups.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      +{stats.groups.length - 3} more groups
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground mb-4">You haven't joined any groups yet.</p>
                  <Link href="/groups">
                    <Button>Browse Groups</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Now Playing
                {!loading && stats.nowPlaying.length > 0 && (
                  <span className="text-sm font-normal bg-primary text-primary-foreground px-2 py-1 rounded">
                    {stats.nowPlaying.length}
                  </span>
                )}
              </CardTitle>
              <CardDescription>Games you're currently playing</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-10 rounded" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-10 rounded" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                </div>
              ) : stats.nowPlaying.length > 0 ? (
                <div className="space-y-2">
                  {stats.nowPlaying.slice(0, 3).map(entry => (
                    <Link key={entry.id} href={`/games/${entry.game.id}`} className="flex items-center gap-2 hover:bg-muted p-1 -mx-1 rounded transition-colors">
                      {entry.game.coverUrl && (
                        <img src={entry.game.coverUrl} alt="" className="w-8 h-10 object-cover rounded" />
                      )}
                      <span className="text-sm truncate">{entry.game.name}</span>
                    </Link>
                  ))}
                  {stats.nowPlaying.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      +{stats.nowPlaying.length - 3} more games
                    </p>
                  )}
                  <Link href="/me?status=NOW_PLAYING">
                    <Button variant="outline" size="sm" className="mt-2">View All</Button>
                  </Link>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground mb-4">No games in your "Now Playing" list.</p>
                  <Link href="/me">
                    <Button variant="outline">Add Games</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Wishlist
                {!loading && stats.wishlist.length > 0 && (
                  <span className="text-sm font-normal bg-primary text-primary-foreground px-2 py-1 rounded">
                    {stats.wishlist.length}
                  </span>
                )}
              </CardTitle>
              <CardDescription>Games you want to play</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-10 rounded" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-10 rounded" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                </div>
              ) : stats.wishlist.length > 0 ? (
                <div className="space-y-2">
                  {stats.wishlist.slice(0, 3).map(entry => (
                    <Link key={entry.id} href={`/games/${entry.game.id}`} className="flex items-center gap-2 hover:bg-muted p-1 -mx-1 rounded transition-colors">
                      {entry.game.coverUrl && (
                        <img src={entry.game.coverUrl} alt="" className="w-8 h-10 object-cover rounded" />
                      )}
                      <span className="text-sm truncate">{entry.game.name}</span>
                    </Link>
                  ))}
                  {stats.wishlist.length > 3 && (
                    <p className="text-sm text-muted-foreground">
                      +{stats.wishlist.length - 3} more games
                    </p>
                  )}
                  <Link href="/me?status=WISHLIST">
                    <Button variant="outline" size="sm" className="mt-2">View All</Button>
                  </Link>
                </div>
              ) : (
                <>
                  <p className="text-muted-foreground mb-4">Your wishlist is empty.</p>
                  <Link href="/me">
                    <Button variant="outline">Add Games</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
