"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface GroupMember {
  id: string
  role: string
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface Group {
  id: string
  name: string
  inviteCode: string
  ownerId: string
  createdAt: string
  owner: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  members: GroupMember[]
  userRole: string
  isOwner: boolean
}

interface GameEntry {
  id: string
  status: string
  game: {
    id: string
    name: string
    coverUrl: string | null
    firstReleaseDate: string | null
  }
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
  createdAt: string
  updatedAt: string
}

interface WishlistItem {
  game: {
    id: string
    name: string
    coverUrl: string | null
  }
  users: Array<{
    id: string
    name: string | null
    email: string
    image: string | null
  }>
  count: number
}

interface DashboardData {
  nowPlaying: GameEntry[]
  mostWanted: WishlistItem[]
  recentlyAdded: GameEntry[]
}

export default function GroupDetailPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [group, setGroup] = useState<Group | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "loading") return

    async function fetchData() {
      try {
        // Fetch group details and dashboard data in parallel
        const [groupRes, dashboardRes] = await Promise.all([
          fetch(`/api/groups/${groupId}`),
          fetch(`/api/groups/${groupId}/dashboard`)
        ])

        const groupData = await groupRes.json()
        const dashboardData = await dashboardRes.json()

        if (!groupRes.ok) {
          setError(groupData.error || "Failed to load group")
          return
        }

        setGroup(groupData.group)

        if (dashboardRes.ok) {
          setDashboard(dashboardData)
        }
      } catch (err) {
        setError("Failed to load group")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [groupId, status])

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/dashboard" className="text-xl font-bold">
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                NextUp
              </span>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-muted rounded mb-4"></div>
            <div className="h-4 w-64 bg-muted rounded mb-8"></div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/dashboard" className="text-xl font-bold">
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                NextUp
              </span>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Link href="/groups">
                <Button>Back to Groups</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!group) {
    return null
  }

  const isAdmin = group.userRole === "ADMIN"

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
            <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
            <p className="text-muted-foreground">
              {group.members.length} member{group.members.length !== 1 ? "s" : ""} •{" "}
              You are {group.userRole === "ADMIN" ? "an admin" : "a member"}
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Link href={`/groups/${group.id}/settings`}>
                <Button variant="outline">Group Settings</Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Now Playing Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Now Playing</CardTitle>
              <CardDescription>Games members are currently playing</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.nowPlaying && dashboard.nowPlaying.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {dashboard.nowPlaying.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      {entry.game.coverUrl ? (
                        <img
                          src={entry.game.coverUrl}
                          alt={entry.game.name}
                          className="w-12 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          No img
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{entry.game.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {entry.user.name?.charAt(0) || entry.user.email.charAt(0)}
                          </div>
                          <span className="text-sm text-muted-foreground truncate">
                            {entry.user.name || entry.user.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No one is playing anything yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Members Section */}
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>{group.members.length} members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {group.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {member.user.name?.charAt(0) || member.user.email.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {member.user.name || member.user.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.role === "ADMIN" ? "Admin" : "Member"}
                        {group.ownerId === member.user.id && " • Owner"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Most Wanted Section */}
          <Card>
            <CardHeader>
              <CardTitle>Most Wanted</CardTitle>
              <CardDescription>Games on members' wishlists</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.mostWanted && dashboard.mostWanted.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.mostWanted.map((item) => (
                    <div key={item.game.id} className="flex items-center gap-3">
                      {item.game.coverUrl ? (
                        <img
                          src={item.game.coverUrl}
                          alt={item.game.name}
                          className="w-10 h-14 object-cover rounded"
                        />
                      ) : (
                        <div className="w-10 h-14 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          No img
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.game.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.count} {item.count === 1 ? "person wants" : "people want"} this
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No games on wishlists yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Recently Added Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recently Added</CardTitle>
              <CardDescription>Latest additions to members' lists</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.recentlyAdded && dashboard.recentlyAdded.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {dashboard.recentlyAdded.slice(0, 6).map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      {entry.game.coverUrl ? (
                        <img
                          src={entry.game.coverUrl}
                          alt={entry.game.name}
                          className="w-12 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          No img
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{entry.game.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {entry.status.toLowerCase().replace("_", " ")}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium">
                            {entry.user.name?.charAt(0) || entry.user.email.charAt(0)}
                          </div>
                          <span className="text-xs text-muted-foreground truncate">
                            {entry.user.name || entry.user.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No games have been added yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
