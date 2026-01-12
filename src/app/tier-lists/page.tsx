"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface TierList {
  id: string
  name: string
  description: string | null
  userId: string | null
  groupId: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
  gameCount: number
  userName?: string | null
}

interface SimilarUser {
  type: "user" | "group"
  id: string
  name: string
  score: number
  sharedGames: number
}

export default function TierListsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [myTierLists, setMyTierLists] = useState<TierList[]>([])
  const [publicTierLists, setPublicTierLists] = useState<TierList[]>([])
  const [recommendations, setRecommendations] = useState<{
    users: SimilarUser[]
    groups: SimilarUser[]
  }>({ users: [], groups: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"my" | "public" | "similar">("my")

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newListName, setNewListName] = useState("")
  const [newListDescription, setNewListDescription] = useState("")
  const [newListPublic, setNewListPublic] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!session) {
      router.push("/login")
      return
    }

    fetchTierLists()
  }, [sessionStatus, session])

  const fetchTierLists = async () => {
    try {
      setLoading(true)

      // Fetch all types in parallel
      const [myRes, publicRes, similarRes] = await Promise.all([
        fetch("/api/tier-lists?type=my"),
        fetch("/api/tier-lists?type=public"),
        fetch("/api/tier-lists?type=similar"),
      ])

      if (myRes.ok) {
        const data = await myRes.json()
        setMyTierLists(data.tierLists || [])
      }

      if (publicRes.ok) {
        const data = await publicRes.json()
        setPublicTierLists(data.tierLists || [])
      }

      if (similarRes.ok) {
        const data = await similarRes.json()
        setRecommendations(data.recommendations || { users: [], groups: [] })
      }
    } catch (err) {
      console.error("Error fetching tier lists:", err)
      setError("Failed to load tier lists")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTierList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newListName.trim()) return

    setCreating(true)
    try {
      const response = await fetch("/api/tier-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newListName.trim(),
          description: newListDescription.trim() || null,
          isPublic: newListPublic,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMyTierLists([data.tierList, ...myTierLists])
        setShowCreateModal(false)
        setNewListName("")
        setNewListDescription("")
        setNewListPublic(false)
        // Navigate to the new tier list
        router.push(`/tier-lists/${data.tierList.id}`)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to create tier list")
      }
    } catch (err) {
      console.error("Error creating tier list:", err)
      setError("Failed to create tier list")
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteTierList = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tier list?")) return

    try {
      const response = await fetch(`/api/tier-lists/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setMyTierLists(myTierLists.filter((tl) => tl.id !== id))
      } else {
        const data = await response.json()
        setError(data.error || "Failed to delete tier list")
      }
    } catch (err) {
      console.error("Error deleting tier list:", err)
      setError("Failed to delete tier list")
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tier Rankings</h1>
            <p className="text-muted-foreground">
              Create tier lists to rank your games and find others with similar taste.
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            Create Tier List
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-2 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("my")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "my"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            My Tier Lists ({myTierLists.length})
          </button>
          <button
            onClick={() => setActiveTab("public")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "public"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Public Lists ({publicTierLists.length})
          </button>
          <button
            onClick={() => setActiveTab("similar")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "similar"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Similar Tastes
          </button>
        </div>

        {/* My Tier Lists Tab */}
        {activeTab === "my" && (
          <>
            {myTierLists.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Tier Lists Yet</CardTitle>
                  <CardDescription>
                    Create your first tier list to start ranking your games.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setShowCreateModal(true)}>
                    Create Your First Tier List
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myTierLists.map((tierList) => (
                  <Card key={tierList.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <Link href={`/tier-lists/${tierList.id}`} className="flex-1">
                          <CardTitle className="text-lg hover:text-primary transition-colors">
                            {tierList.name}
                          </CardTitle>
                        </Link>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            tierList.isPublic
                              ? "bg-green-500/10 text-green-600"
                              : "bg-gray-500/10 text-gray-600"
                          }`}
                        >
                          {tierList.isPublic ? "Public" : "Private"}
                        </span>
                      </div>
                      {tierList.description && (
                        <CardDescription className="line-clamp-2">
                          {tierList.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{tierList.gameCount} games</span>
                        <span>Updated {formatDate(tierList.updatedAt)}</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Link href={`/tier-lists/${tierList.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full">
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTierList(tierList.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Public Tier Lists Tab */}
        {activeTab === "public" && (
          <>
            {publicTierLists.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Public Tier Lists</CardTitle>
                  <CardDescription>
                    No one has shared their tier lists publicly yet. Be the first!
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicTierLists.map((tierList) => (
                  <Card key={tierList.id} className="hover:shadow-md transition-shadow">
                    <Link href={`/tier-lists/${tierList.id}`}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg hover:text-primary transition-colors">
                          {tierList.name}
                        </CardTitle>
                        {tierList.userName && (
                          <p className="text-sm text-muted-foreground">
                            by {tierList.userName}
                          </p>
                        )}
                        {tierList.description && (
                          <CardDescription className="line-clamp-2">
                            {tierList.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{tierList.gameCount} games</span>
                          <span>Updated {formatDate(tierList.updatedAt)}</span>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Similar Tastes Tab */}
        {activeTab === "similar" && (
          <div className="space-y-8">
            {recommendations.users.length === 0 && recommendations.groups.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>No Recommendations Yet</CardTitle>
                  <CardDescription>
                    Create a tier list with at least some games to find users and groups with similar tastes.
                    You need to share at least 3 games with others to see recommendations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setShowCreateModal(true)}>
                    Create a Tier List
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Similar Users */}
                {recommendations.users.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Users with Similar Taste</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recommendations.users.map((user) => (
                        <Card key={user.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">{user.name}</CardTitle>
                            <CardDescription>
                              {user.sharedGames} shared games • {Math.round((user.score / user.sharedGames / 6) * 100)}% match
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{
                                  width: `${Math.round((user.score / user.sharedGames / 6) * 100)}%`,
                                }}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Similar Groups */}
                {recommendations.groups.length > 0 && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Groups You Might Like</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {recommendations.groups.map((group) => (
                        <Card key={group.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">{group.name}</CardTitle>
                            <CardDescription>
                              {group.sharedGames} shared games • {Math.round((group.score / group.sharedGames / 6) * 100)}% match
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{
                                  width: `${Math.round((group.score / group.sharedGames / 6) * 100)}%`,
                                }}
                              />
                            </div>
                            <Link href={`/groups/${group.id}`}>
                              <Button variant="outline" size="sm" className="w-full mt-4">
                                View Group
                              </Button>
                            </Link>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCreateModal(false)}
          >
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Create Tier List</CardTitle>
                <CardDescription>
                  Create a new tier list to rank your favorite games.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateTierList} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="list-name">Name</Label>
                    <Input
                      id="list-name"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="My Game Rankings"
                      disabled={creating}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="list-description">Description (optional)</Label>
                    <textarea
                      id="list-description"
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      placeholder="A description of your tier list..."
                      className="w-full p-2 border rounded-md bg-background min-h-[80px]"
                      disabled={creating}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="list-public"
                      checked={newListPublic}
                      onChange={(e) => setNewListPublic(e.target.checked)}
                      disabled={creating}
                    />
                    <Label htmlFor="list-public" className="cursor-pointer">
                      Make this tier list public
                    </Label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateModal(false)}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating || !newListName.trim()}>
                      {creating ? "Creating..." : "Create"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
