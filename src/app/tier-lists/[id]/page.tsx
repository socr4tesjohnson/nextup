"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface TierGame {
  id: string
  gameId: string
  position: number
  game: {
    id: string
    name: string
    coverUrl: string | null
  }
}

interface TierList {
  id: string
  name: string
  description: string | null
  userId: string | null
  groupId: string | null
  isPublic: boolean
  isOwner: boolean
  categories: string[]
  platforms: string[]
  gameModes: string[]
  createdAt: string
  updatedAt: string
}

interface Tiers {
  S: TierGame[]
  A: TierGame[]
  B: TierGame[]
  C: TierGame[]
  D: TierGame[]
  F: TierGame[]
}

const TIER_COLORS: Record<string, string> = {
  S: "bg-red-500",
  A: "bg-orange-500",
  B: "bg-yellow-500",
  C: "bg-green-500",
  D: "bg-blue-500",
  F: "bg-purple-500",
}

const TIER_LABELS: Record<string, string> = {
  S: "S Tier (Best)",
  A: "A Tier (Great)",
  B: "B Tier (Good)",
  C: "C Tier (Average)",
  D: "D Tier (Below Average)",
  F: "F Tier (Poor)",
}

export default function TierListPage() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const tierListId = params.id as string

  const [tierList, setTierList] = useState<TierList | null>(null)
  const [tiers, setTiers] = useState<Tiers>({
    S: [], A: [], B: [], C: [], D: [], F: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  // Drag state
  const [draggedGame, setDraggedGame] = useState<{ game: TierGame; fromTier: string } | null>(null)

  // Settings modal
  const [showSettings, setShowSettings] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editPublic, setEditPublic] = useState(false)
  const [editCategories, setEditCategories] = useState("")
  const [editPlatforms, setEditPlatforms] = useState("")
  const [editGameModes, setEditGameModes] = useState("")

  // Add game modal
  const [showAddGame, setShowAddGame] = useState(false)
  const [addToTier, setAddToTier] = useState<string>("S")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Array<{
    id: string
    name: string
    coverUrl: string | null
  }>>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (sessionStatus === "loading") return
    if (!session) {
      router.push("/login")
      return
    }

    fetchTierList()
  }, [sessionStatus, session, tierListId])

  const fetchTierList = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tier-lists/${tierListId}`)

      if (!response.ok) {
        if (response.status === 404) {
          router.push("/tier-lists")
          return
        }
        throw new Error("Failed to fetch tier list")
      }

      const data = await response.json()
      setTierList(data.tierList)
      setTiers(data.tiers)
      setEditName(data.tierList.name)
      setEditDescription(data.tierList.description || "")
      setEditPublic(data.tierList.isPublic)
      setEditCategories((data.tierList.categories || []).join(", "))
      setEditPlatforms((data.tierList.platforms || []).join(", "))
      setEditGameModes((data.tierList.gameModes || []).join(", "))
    } catch (err) {
      console.error("Error fetching tier list:", err)
      setError("Failed to load tier list")
    } finally {
      setLoading(false)
    }
  }

  const handleDragStart = (game: TierGame, fromTier: string) => {
    setDraggedGame({ game, fromTier })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (toTier: string) => {
    if (!draggedGame || !tierList?.isOwner) return

    const { game, fromTier } = draggedGame

    if (fromTier === toTier) {
      setDraggedGame(null)
      return
    }

    // Update local state immediately for responsiveness
    const newTiers = { ...tiers }
    newTiers[fromTier as keyof Tiers] = newTiers[fromTier as keyof Tiers].filter(
      (g) => g.gameId !== game.gameId
    )
    newTiers[toTier as keyof Tiers] = [
      ...newTiers[toTier as keyof Tiers],
      { ...game, position: newTiers[toTier as keyof Tiers].length },
    ]
    setTiers(newTiers)
    setDraggedGame(null)

    // Save to server
    try {
      setSaving(true)
      const response = await fetch(`/api/tier-lists/${tierListId}/games`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [{
            gameId: game.gameId,
            tier: toTier,
            position: newTiers[toTier as keyof Tiers].length - 1,
          }],
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update")
      }

      setSuccessMessage("Tier updated!")
      setTimeout(() => setSuccessMessage(""), 2000)
    } catch (err) {
      console.error("Error updating tier:", err)
      // Revert on error
      fetchTierList()
      setError("Failed to update tier")
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveGame = async (gameId: string, fromTier: string) => {
    if (!tierList?.isOwner) return

    // Update local state
    const newTiers = { ...tiers }
    newTiers[fromTier as keyof Tiers] = newTiers[fromTier as keyof Tiers].filter(
      (g) => g.gameId !== gameId
    )
    setTiers(newTiers)

    // Save to server
    try {
      const response = await fetch(
        `/api/tier-lists/${tierListId}/games?gameId=${gameId}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        throw new Error("Failed to remove")
      }

      setSuccessMessage("Game removed!")
      setTimeout(() => setSuccessMessage(""), 2000)
    } catch (err) {
      console.error("Error removing game:", err)
      fetchTierList()
      setError("Failed to remove game")
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tierList?.isOwner) return

    try {
      setSaving(true)
      // Parse comma-separated values into arrays
      const categories = editCategories.split(",").map(s => s.trim()).filter(Boolean)
      const platforms = editPlatforms.split(",").map(s => s.trim()).filter(Boolean)
      const gameModes = editGameModes.split(",").map(s => s.trim()).filter(Boolean)

      const response = await fetch(`/api/tier-lists/${tierListId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          isPublic: editPublic,
          categories,
          platforms,
          gameModes,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setTierList({
          ...tierList,
          name: data.tierList.name,
          description: data.tierList.description,
          isPublic: data.tierList.isPublic,
          categories: data.tierList.categories || [],
          platforms: data.tierList.platforms || [],
          gameModes: data.tierList.gameModes || [],
        })
        setShowSettings(false)
        setSuccessMessage("Settings saved!")
        setTimeout(() => setSuccessMessage(""), 2000)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to save settings")
      }
    } catch (err) {
      console.error("Error saving settings:", err)
      setError("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    try {
      const response = await fetch(
        `/api/games/search?q=${encodeURIComponent(searchQuery.trim())}`
      )

      if (response.ok) {
        const data = await response.json()
        // Filter out games already in the tier list
        const existingGameIds = new Set(
          Object.values(tiers).flat().map((g) => g.gameId)
        )
        setSearchResults(
          (data.games || []).filter(
            (g: { id: string }) => !existingGameIds.has(g.id)
          )
        )
      }
    } catch (err) {
      console.error("Error searching games:", err)
    } finally {
      setSearching(false)
    }
  }

  const handleAddGame = async (game: { id: string; name: string; coverUrl: string | null }) => {
    if (!tierList?.isOwner) return

    try {
      const response = await fetch(`/api/tier-lists/${tierListId}/games`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          tier: addToTier,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newTiers = { ...tiers }
        newTiers[addToTier as keyof Tiers] = [
          ...newTiers[addToTier as keyof Tiers],
          {
            id: data.entry.id,
            gameId: game.id,
            position: data.entry.position,
            game: {
              id: game.id,
              name: game.name,
              coverUrl: game.coverUrl,
            },
          },
        ]
        setTiers(newTiers)
        setSearchResults(searchResults.filter((g) => g.id !== game.id))
        setSuccessMessage(`Added "${game.name}" to ${addToTier} tier!`)
        setTimeout(() => setSuccessMessage(""), 2000)
      } else {
        const data = await response.json()
        setError(data.error || "Failed to add game")
      }
    } catch (err) {
      console.error("Error adding game:", err)
      setError("Failed to add game")
    }
  }

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="space-y-4">
              {["S", "A", "B", "C", "D", "F"].map((tier) => (
                <div key={tier} className="h-24 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!tierList) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Tier List Not Found</CardTitle>
              <CardDescription>
                This tier list doesn&apos;t exist or you don&apos;t have access to it.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/tier-lists">
                <Button>Back to Tier Lists</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/tier-lists" className="text-muted-foreground hover:text-foreground">
                ← Back
              </Link>
            </div>
            <h1 className="text-3xl font-bold">{tierList.name}</h1>
            {tierList.description && (
              <p className="text-muted-foreground mt-1">{tierList.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span
                className={`text-xs px-2 py-1 rounded ${
                  tierList.isPublic
                    ? "bg-green-500/10 text-green-600"
                    : "bg-gray-500/10 text-gray-600"
                }`}
              >
                {tierList.isPublic ? "Public" : "Private"}
              </span>
              {!tierList.isOwner && (
                <span className="text-xs text-muted-foreground">View only</span>
              )}
            </div>
            {/* Display categories */}
            {(tierList.categories?.length > 0 || tierList.platforms?.length > 0 || tierList.gameModes?.length > 0) && (
              <div className="flex flex-wrap gap-1 mt-3">
                {tierList.categories?.map((cat) => (
                  <Link
                    key={cat}
                    href={`/search?genres=${encodeURIComponent(cat)}`}
                    className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
                {tierList.platforms?.map((plat) => (
                  <Link
                    key={plat}
                    href={`/search?platforms=${encodeURIComponent(plat)}`}
                    className="px-2 py-0.5 text-xs rounded-full bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {plat}
                  </Link>
                ))}
                {tierList.gameModes?.map((mode) => (
                  <Link
                    key={mode}
                    href={`/search?gameModes=${encodeURIComponent(mode)}`}
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                      mode.toLowerCase().includes("co-op") || mode.toLowerCase().includes("coop")
                        ? "bg-green-500/20 text-green-600 hover:bg-green-500/30"
                        : mode.toLowerCase().includes("multiplayer")
                        ? "bg-purple-500/20 text-purple-600 hover:bg-purple-500/30"
                        : "bg-blue-500/20 text-blue-600 hover:bg-blue-500/30"
                    }`}
                  >
                    {mode}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {tierList.isOwner && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowAddGame(true)}>
                Add Game
              </Button>
              <Button variant="outline" onClick={() => setShowSettings(true)}>
                Settings
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
            <button onClick={() => setError("")} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 rounded-md bg-green-500/10 text-green-600 text-sm">
            {successMessage}
          </div>
        )}

        {saving && (
          <div className="mb-4 p-3 rounded-md bg-blue-500/10 text-blue-600 text-sm">
            Saving...
          </div>
        )}

        {/* Tier Rows */}
        <div className="space-y-2">
          {(["S", "A", "B", "C", "D", "F"] as const).map((tier) => (
            <div
              key={tier}
              className="flex border rounded-lg overflow-hidden"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(tier)}
            >
              {/* Tier Label */}
              <div
                className={`${TIER_COLORS[tier]} text-white font-bold w-20 flex items-center justify-center text-2xl flex-shrink-0`}
              >
                {tier}
              </div>

              {/* Games */}
              <div className="flex-1 bg-muted/30 min-h-[80px] p-2 flex flex-wrap gap-2">
                {tiers[tier].length === 0 ? (
                  <div className="text-muted-foreground text-sm flex items-center px-2">
                    {tierList.isOwner ? "Drag games here or click Add Game" : "No games in this tier"}
                  </div>
                ) : (
                  tiers[tier].map((game) => (
                    <div
                      key={game.id}
                      draggable={tierList.isOwner}
                      onDragStart={() => handleDragStart(game, tier)}
                      className={`relative group ${
                        tierList.isOwner ? "cursor-grab active:cursor-grabbing" : ""
                      }`}
                    >
                      <Link href={`/games/${game.gameId}`}>
                        {game.game.coverUrl ? (
                          <img
                            src={game.game.coverUrl}
                            alt={game.game.name}
                            title={game.game.name}
                            className="w-16 h-20 object-cover rounded hover:ring-2 hover:ring-primary transition-all"
                            onDragStart={(e) => e.preventDefault()}
                          />
                        ) : (
                          <div
                            className="w-16 h-20 bg-muted rounded flex items-center justify-center text-xs text-center p-1 hover:ring-2 hover:ring-primary transition-all"
                            title={game.game.name}
                          >
                            {game.game.name}
                          </div>
                        )}
                      </Link>
                      {tierList.isOwner && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            handleRemoveGame(game.gameId, tier)
                          }}
                          className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          title="Remove from tier list"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Tier Legend */}
        <div className="mt-8 p-4 bg-muted/30 rounded-lg">
          <h3 className="font-semibold mb-2">Tier Guide</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-sm">
            {(["S", "A", "B", "C", "D", "F"] as const).map((tier) => (
              <div key={tier} className="flex items-center gap-2">
                <span className={`${TIER_COLORS[tier]} text-white px-2 py-0.5 rounded font-bold`}>
                  {tier}
                </span>
                <span className="text-muted-foreground">
                  {TIER_LABELS[tier].split(" ").slice(1).join(" ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowSettings(false)}
          >
            <Card className="w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Tier List Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="settings-name">Name</Label>
                    <Input
                      id="settings-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      disabled={saving}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-description">Description</Label>
                    <textarea
                      id="settings-description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background min-h-[80px]"
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-categories">Categories/Genres (comma-separated)</Label>
                    <Input
                      id="settings-categories"
                      value={editCategories}
                      onChange={(e) => setEditCategories(e.target.value)}
                      placeholder="RPG, Action, Adventure"
                      disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground">e.g., RPG, Action, Horror, Indie</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-platforms">Platforms (comma-separated)</Label>
                    <Input
                      id="settings-platforms"
                      value={editPlatforms}
                      onChange={(e) => setEditPlatforms(e.target.value)}
                      placeholder="PC, PlayStation, Nintendo Switch"
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="settings-gamemodes">Player Modes (comma-separated)</Label>
                    <Input
                      id="settings-gamemodes"
                      value={editGameModes}
                      onChange={(e) => setEditGameModes(e.target.value)}
                      placeholder="Single player, Co-op, Multiplayer"
                      disabled={saving}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="settings-public"
                      checked={editPublic}
                      onChange={(e) => setEditPublic(e.target.checked)}
                      disabled={saving}
                    />
                    <Label htmlFor="settings-public" className="cursor-pointer">
                      Make public (others can view)
                    </Label>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowSettings(false)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Add Game Modal */}
        {showAddGame && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowAddGame(false)}
          >
            <Card className="w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Add Game to Tier List</CardTitle>
                <CardDescription>
                  Search for a game and select a tier
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-auto">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-tier">Add to Tier</Label>
                    <select
                      id="add-tier"
                      value={addToTier}
                      onChange={(e) => setAddToTier(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      {(["S", "A", "B", "C", "D", "F"] as const).map((tier) => (
                        <option key={tier} value={tier}>
                          {tier} - {TIER_LABELS[tier].split("(")[1]?.replace(")", "")}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="search-game">Search Game</Label>
                    <div className="flex gap-2">
                      <Input
                        id="search-game"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for a game..."
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            handleSearch()
                          }
                        }}
                      />
                      <Button onClick={handleSearch} disabled={searching}>
                        {searching ? "..." : "Search"}
                      </Button>
                    </div>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {searchResults.map((game) => (
                        <div
                          key={game.id}
                          className="flex items-center gap-3 p-2 border rounded-md hover:bg-muted/50 cursor-pointer"
                          onClick={() => handleAddGame(game)}
                        >
                          {game.coverUrl ? (
                            <img
                              src={game.coverUrl}
                              alt={game.name}
                              className="w-10 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-10 h-12 bg-muted rounded flex items-center justify-center text-xs">
                              No img
                            </div>
                          )}
                          <span className="flex-1 font-medium">{game.name}</span>
                          <Button size="sm" variant="outline">
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchQuery && searchResults.length === 0 && !searching && (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      No games found. Try a different search term.
                    </p>
                  )}
                </div>
              </CardContent>
              <div className="p-4 border-t">
                <Button variant="outline" onClick={() => setShowAddGame(false)} className="w-full">
                  Close
                </Button>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
