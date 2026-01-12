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
import { Breadcrumb } from "@/components/ui/breadcrumb"

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
  defaultPlatforms: string[]
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
    platforms?: string[]
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

interface Recommendation {
  id: string
  score: number
  reason: string
  recommendationType: string
  game: {
    id: string
    name: string
    coverUrl: string | null
    firstReleaseDate: string | null
    platforms: string[]
    genres: string[]
  }
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
  const [platformFilter, setPlatformFilter] = useState<string>("all")
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [dismissingRec, setDismissingRec] = useState<string | null>(null)
  const [recSortBy, setRecSortBy] = useState<"score" | "release_date">("score")
  const [refreshing, setRefreshing] = useState(false)

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedGame) {
        setSelectedGame(null)
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [selectedGame])

  // Available platforms for filtering
  const platforms = ["all", "PC", "PlayStation 5", "PlayStation 4", "Xbox Series X|S", "Xbox One", "Nintendo Switch", "Steam Deck", "Mobile"]

  // Filter entries by platform
  const filterByPlatform = (entries: GameEntry[]) => {
    if (platformFilter === "all") return entries
    return entries.filter(entry => {
      // Check if the game has the platform in its platforms array
      const gamePlatforms = entry.game.platforms || []
      return gamePlatforms.some((p: string) =>
        p.toLowerCase().includes(platformFilter.toLowerCase()) ||
        platformFilter.toLowerCase().includes(p.toLowerCase())
      )
    })
  }

  // Filter recommendations by platform
  const filterRecommendationsByPlatform = (recs: Recommendation[]) => {
    if (platformFilter === "all") return recs
    return recs.filter(rec => {
      const gamePlatforms = rec.game.platforms || []
      return gamePlatforms.some((p: string) =>
        p.toLowerCase().includes(platformFilter.toLowerCase()) ||
        platformFilter.toLowerCase().includes(p.toLowerCase())
      )
    })
  }

  // Sort recommendations
  const sortRecommendations = (recs: Recommendation[]) => {
    return [...recs].sort((a, b) => {
      if (recSortBy === "score") {
        return b.score - a.score // Highest score first
      } else if (recSortBy === "release_date") {
        // Sort by release date (soonest first)
        const dateA = a.game.firstReleaseDate ? new Date(a.game.firstReleaseDate).getTime() : Infinity
        const dateB = b.game.firstReleaseDate ? new Date(b.game.firstReleaseDate).getTime() : Infinity
        return dateA - dateB
      }
      return 0
    })
  }

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

  // Fetch dashboard data function (extracted for reuse)
  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    }
    try {
      // Fetch group details, dashboard data, and recommendations in parallel
      const [groupRes, dashboardRes, recsRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/groups/${groupId}/dashboard`),
        fetch(`/api/groups/${groupId}/recommendations`)
      ])

      const groupData = await groupRes.json()
      const dashboardData = await dashboardRes.json()
      const recsData = await recsRes.json()

      if (!groupRes.ok) {
        setError(groupData.error || "Failed to load group")
        return
      }

      setGroup(groupData.group)

      // Set initial platform filter from group's default platforms (only on initial load)
      if (!isRefresh && groupData.group.defaultPlatforms && groupData.group.defaultPlatforms.length > 0) {
        // Use the first default platform as the filter
        setPlatformFilter(groupData.group.defaultPlatforms[0])
      }

      if (dashboardRes.ok) {
        setDashboard(dashboardData)
      }

      if (recsRes.ok && recsData.recommendations) {
        setRecommendations(recsData.recommendations)
      }
    } catch (err) {
      setError("Failed to load group")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (status === "loading") return
    fetchDashboardData()
  }, [groupId, status])

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

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

  const handleDismissRecommendation = async (recId: string) => {
    setDismissingRec(recId)
    try {
      const res = await fetch(`/api/groups/${groupId}/recommendations/${recId}`, {
        method: "POST",
      })

      if (res.ok) {
        // Remove from local state
        setRecommendations(prev => prev.filter(rec => rec.id !== recId))
      } else {
        const data = await res.json()
        setError(data.error || "Failed to dismiss recommendation")
      }
    } catch (err) {
      setError("Failed to dismiss recommendation")
    } finally {
      setDismissingRec(null)
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
  const filteredRecommendations = sortRecommendations(filterRecommendationsByPlatform(recommendations))

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

      <main id="main-content" className="container mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: "Groups", href: "/groups" },
            { label: group.name }
          ]}
          className="mb-4"
        />
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
            <p className="text-muted-foreground">
              {group.members.length} member{group.members.length !== 1 ? "s" : ""} •{" "}
              You are {group.userRole === "ADMIN" ? "an admin" : "a member"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
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

        {/* Platform Filter */}
        <div className="flex items-center gap-4 mb-6">
          <label htmlFor="platform-filter" className="text-sm font-medium">
            Filter by Platform:
          </label>
          <select
            id="platform-filter"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="p-2 border rounded-md bg-background text-sm"
          >
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform === "all" ? "All Platforms" : platform}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Now Playing Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Now Playing</CardTitle>
              <CardDescription>Games members are currently playing</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard?.nowPlaying && filterByPlatform(dashboard.nowPlaying).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filterByPlatform(dashboard.nowPlaying).map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/games/${entry.game.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
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
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {platformFilter === "all"
                    ? "No one is playing anything yet."
                    : `No games for ${platformFilter} platform.`}
                </p>
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
            <div
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setSelectedGame(null)}
            >
              <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
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
                  <div className="mt-4 flex justify-between">
                    <Link href={`/games/${selectedGame.id}?from=group&groupId=${groupId}&groupName=${encodeURIComponent(group.name)}`}>
                      <Button>View Game Details</Button>
                    </Link>
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
                    <Link key={item.game.id} href={`/games/${item.game.id}`} className="flex items-center gap-3 hover:bg-muted/50 p-2 -mx-2 rounded-lg transition-colors">
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
                    </Link>
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
                    <Link key={entry.id} href={`/games/${entry.game.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
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
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No games have been added yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Radar Section */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Upcoming Radar</CardTitle>
                  <CardDescription>Game recommendations based on your group's interests</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="rec-sort" className="text-sm font-medium whitespace-nowrap">
                    Sort by:
                  </label>
                  <select
                    id="rec-sort"
                    value={recSortBy}
                    onChange={(e) => setRecSortBy(e.target.value as "score" | "release_date")}
                    className="p-2 border rounded-md bg-background text-sm"
                  >
                    <option value="score">Match Score</option>
                    <option value="release_date">Release Date</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRecommendations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredRecommendations.map((rec) => (
                    <div key={rec.id} className="relative flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDismissRecommendation(rec.id); }}
                        disabled={dismissingRec === rec.id}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center text-muted-foreground transition-colors z-10"
                        title="Dismiss recommendation"
                      >
                        {dismissingRec === rec.id ? (
                          <span className="animate-spin">⋯</span>
                        ) : (
                          "×"
                        )}
                      </button>
                      <Link href={`/games/${rec.game.id}`} className="flex items-start gap-3 flex-1">
                        {rec.game.coverUrl ? (
                          <img
                            src={rec.game.coverUrl}
                            alt={rec.game.name}
                            className="w-12 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                            No img
                          </div>
                        )}
                        <div className="flex-1 min-w-0 pr-6">
                          <p className="font-medium truncate">{rec.game.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                              {Math.round(rec.score * 100)}% match
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {rec.recommendationType.toLowerCase().replace("_", " ")}
                            </span>
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {platformFilter === "all"
                    ? "No recommendations yet. Add more games to your lists to get personalized recommendations!"
                    : `No recommendations for ${platformFilter} platform.`}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
