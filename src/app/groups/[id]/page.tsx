"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
  const [leaving, setLeaving] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null)
  const [removingMember, setRemovingMember] = useState(false)
  const [selectedGame, setSelectedGame] = useState<{ id: string; name: string; coverUrl: string | null } | null>(null)

  // Get all members' entries for a specific game
  const getMemberEntriesForGame = (gameId: string) => {
    if (!dashboard) return []
    const allEntries = [...dashboard.nowPlaying, ...dashboard.recentlyAdded]
    // Deduplicate by entry id and filter by game
    const uniqueEntries = new Map<string, GameEntry>()
    allEntries.forEach(entry => {
      if (entry.game.id === gameId) {
        uniqueEntries.set(entry.id, entry)
      }
    })
    return Array.from(uniqueEntries.values())
  }

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

  const handleLeaveGroup = async () => {
    setLeaving(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: "POST",
      })

      if (res.ok) {
        router.push("/groups")
      } else {
        const data = await res.json()
        setError(data.error || "Failed to leave group")
      }
    } catch (err) {
      setError("Failed to leave group")
    } finally {
      setLeaving(false)
      setShowLeaveDialog(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return
    setRemovingMember(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${memberToRemove.user.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        // Remove member from local state
        setGroup(prev => prev ? {
          ...prev,
          members: prev.members.filter(m => m.id !== memberToRemove.id)
        } : null)
      } else {
        const data = await res.json()
        setError(data.error || "Failed to remove member")
      }
    } catch (err) {
      setError("Failed to remove member")
    } finally {
      setRemovingMember(false)
      setMemberToRemove(null)
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
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
            {!group.isOwner && (
              <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                    Leave Group
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave Group</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to leave "{group.name}"? You will need a new invite link to rejoin.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={leaving}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleLeaveGroup}
                      disabled={leaving}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {leaving ? "Leaving..." : "Leave Group"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => setSelectedGame(entry.game)}
                    >
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
                    {isAdmin && member.user.id !== group.ownerId && member.user.id !== session?.user?.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setMemberToRemove(member)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Remove Member Dialog */}
          <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove {memberToRemove?.user.name || memberToRemove?.user.email} from the group?
                  They will need a new invite link to rejoin.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={removingMember}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemoveMember}
                  disabled={removingMember}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {removingMember ? "Removing..." : "Remove Member"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Game Details Modal */}
          {selectedGame && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    {selectedGame.coverUrl ? (
                      <img
                        src={selectedGame.coverUrl}
                        alt={selectedGame.name}
                        className="w-16 h-20 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-20 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No img
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">{selectedGame.name}</CardTitle>
                      <CardDescription>Members with this game</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getMemberEntriesForGame(selectedGame.id).length > 0 ? (
                      getMemberEntriesForGame(selectedGame.id).map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                              {entry.user.name?.charAt(0) || entry.user.email.charAt(0)}
                            </div>
                            <span className="font-medium">
                              {entry.user.name || entry.user.email}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground px-2 py-1 rounded bg-background capitalize">
                            {entry.status.toLowerCase().replace("_", " ")}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No members have this game</p>
                    )}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button variant="outline" onClick={() => setSelectedGame(null)}>
                      Close
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
