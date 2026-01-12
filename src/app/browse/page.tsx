"use client"

import { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface Game {
  id: string
  providerGameId: string
  name: string
  coverUrl: string | null
  firstReleaseDate: string | null
  genres: string[]
  platforms: string[]
  gameModes: string[]
  summary: string | null
}

const STATUS_OPTIONS = [
  { value: "NOW_PLAYING", label: "Now Playing" },
  { value: "BACKLOG", label: "Backlog" },
  { value: "WISHLIST", label: "Wishlist" },
  { value: "FINISHED", label: "Finished" },
  { value: "DROPPED", label: "Dropped" },
  { value: "FAVORITE", label: "Favorite" },
]

function BrowseContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Get filter parameters from URL
  const initialGenres = searchParams.get("genres")?.split(",").filter(Boolean) || []
  const initialPlatforms = searchParams.get("platforms")?.split(",").filter(Boolean) || []
  const initialGameModes = searchParams.get("gameModes")?.split(",").filter(Boolean) || []
  const initialQuery = searchParams.get("q") || ""

  const [query, setQuery] = useState(initialQuery)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<Game[]>([])
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingToList, setAddingToList] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState("NOW_PLAYING")
  const [notes, setNotes] = useState("")
  const [rating, setRating] = useState("")
  const [platform, setPlatform] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Active filters state
  const [activeGenres, setActiveGenres] = useState<string[]>(initialGenres)
  const [activePlatforms, setActivePlatforms] = useState<string[]>(initialPlatforms)
  const [activeGameModes, setActiveGameModes] = useState<string[]>(initialGameModes)

  const hasActiveFilters = activeGenres.length > 0 || activePlatforms.length > 0 || activeGameModes.length > 0

  // Sync state with URL params on mount
  useEffect(() => {
    const genres = searchParams.get("genres")?.split(",").filter(Boolean) || []
    const platforms = searchParams.get("platforms")?.split(",").filter(Boolean) || []
    const gameModes = searchParams.get("gameModes")?.split(",").filter(Boolean) || []
    const q = searchParams.get("q") || ""

    setActiveGenres(genres)
    setActivePlatforms(platforms)
    setActiveGameModes(gameModes)
    setQuery(q)

    // Auto-search if there are filters or query
    if (genres.length > 0 || platforms.length > 0 || gameModes.length > 0 || q) {
      performSearch(q, genres, platforms, gameModes)
    }
  }, [searchParams])

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showAddModal) {
        setShowAddModal(false)
        setSelectedGame(null)
        setError("")
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [showAddModal])

  const performSearch = async (
    searchQuery: string,
    genres: string[],
    platforms: string[],
    gameModes: string[]
  ) => {
    setSearching(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (searchQuery) params.set("q", searchQuery)
      if (genres.length > 0) params.set("genres", genres.join(","))
      if (platforms.length > 0) params.set("platforms", platforms.join(","))
      if (gameModes.length > 0) params.set("gameModes", gameModes.join(","))

      const response = await fetch(`/api/games/filter?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setResults(data.games || [])
      } else {
        setError(data.error || "Search failed")
      }
    } catch (err) {
      console.error("Search error:", err)
      setError("Search failed. Please try again.")
    } finally {
      setSearching(false)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() && !hasActiveFilters) return

    // Update URL with search params
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (activeGenres.length > 0) params.set("genres", activeGenres.join(","))
    if (activePlatforms.length > 0) params.set("platforms", activePlatforms.join(","))
    if (activeGameModes.length > 0) params.set("gameModes", activeGameModes.join(","))

    router.push(`/browse?${params.toString()}`)
    performSearch(query, activeGenres, activePlatforms, activeGameModes)
  }

  const removeFilter = (type: "genres" | "platforms" | "gameModes", value: string) => {
    let newGenres = [...activeGenres]
    let newPlatforms = [...activePlatforms]
    let newGameModes = [...activeGameModes]

    if (type === "genres") {
      newGenres = activeGenres.filter(g => g !== value)
      setActiveGenres(newGenres)
    } else if (type === "platforms") {
      newPlatforms = activePlatforms.filter(p => p !== value)
      setActivePlatforms(newPlatforms)
    } else if (type === "gameModes") {
      newGameModes = activeGameModes.filter(m => m !== value)
      setActiveGameModes(newGameModes)
    }

    // Update URL
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (newGenres.length > 0) params.set("genres", newGenres.join(","))
    if (newPlatforms.length > 0) params.set("platforms", newPlatforms.join(","))
    if (newGameModes.length > 0) params.set("gameModes", newGameModes.join(","))

    router.push(`/browse?${params.toString()}`)
    performSearch(query, newGenres, newPlatforms, newGameModes)
  }

  const clearAllFilters = () => {
    setActiveGenres([])
    setActivePlatforms([])
    setActiveGameModes([])
    setQuery("")
    setResults([])
    router.push("/browse")
  }

  const addFilter = (type: "genres" | "platforms" | "gameModes", value: string) => {
    let newGenres = [...activeGenres]
    let newPlatforms = [...activePlatforms]
    let newGameModes = [...activeGameModes]

    if (type === "genres" && !activeGenres.includes(value)) {
      newGenres = [...activeGenres, value]
      setActiveGenres(newGenres)
    } else if (type === "platforms" && !activePlatforms.includes(value)) {
      newPlatforms = [...activePlatforms, value]
      setActivePlatforms(newPlatforms)
    } else if (type === "gameModes" && !activeGameModes.includes(value)) {
      newGameModes = [...activeGameModes, value]
      setActiveGameModes(newGameModes)
    }

    // Update URL and search
    const params = new URLSearchParams()
    if (query) params.set("q", query)
    if (newGenres.length > 0) params.set("genres", newGenres.join(","))
    if (newPlatforms.length > 0) params.set("platforms", newPlatforms.join(","))
    if (newGameModes.length > 0) params.set("gameModes", newGameModes.join(","))

    router.push(`/browse?${params.toString()}`)
    performSearch(query, newGenres, newPlatforms, newGameModes)
  }

  const openAddModal = (game: Game) => {
    setSelectedGame(game)
    setSelectedStatus("NOW_PLAYING")
    setNotes("")
    setRating("")
    setPlatform("")
    setError("")
    setSuccess("")
    setShowAddModal(true)
  }

  const handleAddToList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGame) return

    setAddingToList(true)
    setError("")

    try {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: selectedGame.id,
          status: selectedStatus,
          notes: notes || null,
          rating: rating ? parseInt(rating, 10) : null,
          platform: platform || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to add game to list")
        return
      }

      setSuccess(`${selectedGame.name} added to your list!`)
      setShowAddModal(false)
      setTimeout(() => setSuccess(""), 3000)
    } catch (err) {
      console.error("Error adding to list:", err)
      setError("Failed to add game. Please try again.")
    } finally {
      setAddingToList(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main id="main-content" className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse Games</h1>
          <p className="text-muted-foreground mb-6">
            Search and filter games by genre, platform, and game mode.
          </p>

          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="search"
              placeholder="Search for games..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
              disabled={searching}
            />
            <Button type="submit" disabled={searching || (!query.trim() && !hasActiveFilters)}>
              {searching ? "Searching..." : "Search"}
            </Button>
          </form>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">Active Filters (AND)</h3>
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Clear All
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeGenres.map(genre => (
                  <button
                    key={`genre-${genre}`}
                    onClick={() => removeFilter("genres", genre)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm hover:bg-primary/20 transition-colors"
                  >
                    <span>Genre: {genre}</span>
                    <span className="font-bold">×</span>
                  </button>
                ))}
                {activePlatforms.map(platform => (
                  <button
                    key={`platform-${platform}`}
                    onClick={() => removeFilter("platforms", platform)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm hover:bg-muted/80 transition-colors"
                  >
                    <span>Platform: {platform}</span>
                    <span className="font-bold">×</span>
                  </button>
                ))}
                {activeGameModes.map(mode => (
                  <button
                    key={`mode-${mode}`}
                    onClick={() => removeFilter("gameModes", mode)}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-full text-sm hover:bg-blue-500/30 transition-colors"
                  >
                    <span>Mode: {mode}</span>
                    <span className="font-bold">×</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && !showAddModal && (
          <div className="max-w-2xl mx-auto mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="max-w-2xl mx-auto mb-4 p-3 rounded-md bg-green-500/10 text-green-600 text-sm">
            {success}
          </div>
        )}

        {searching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[3/4] rounded-none" />
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/4 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((game) => (
              <Card key={game.id} className="overflow-hidden group hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
                <Link href={`/games/${game.id}`} className="block">
                  <div className="aspect-[3/4] relative bg-muted overflow-hidden">
                    {game.coverUrl ? (
                      <img
                        src={game.coverUrl}
                        alt={game.name}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors">{game.name}</CardTitle>
                    {game.firstReleaseDate && (
                      <CardDescription>
                        {new Date(game.firstReleaseDate).getFullYear()}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Link>

                {/* Clickable Badges */}
                <CardContent className="pt-0 space-y-2">
                  {/* Genres */}
                  {game.genres && game.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {game.genres.slice(0, 3).map((genre) => (
                        <button
                          key={genre}
                          onClick={(e) => {
                            e.stopPropagation()
                            addFilter("genres", genre)
                          }}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                          title={`Filter by ${genre}`}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Platforms */}
                  {game.platforms && game.platforms.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {game.platforms.slice(0, 3).map((plat) => (
                        <button
                          key={plat}
                          onClick={(e) => {
                            e.stopPropagation()
                            addFilter("platforms", plat)
                          }}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                          title={`Filter by ${plat}`}
                        >
                          {plat}
                        </button>
                      ))}
                      {game.platforms.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                          +{game.platforms.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Game Modes */}
                  {game.gameModes && game.gameModes.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {game.gameModes.map((mode) => (
                        <button
                          key={mode}
                          onClick={(e) => {
                            e.stopPropagation()
                            addFilter("gameModes", mode)
                          }}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            mode.toLowerCase().includes("single")
                              ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30"
                              : mode.toLowerCase().includes("co-op") || mode.toLowerCase().includes("coop")
                              ? "bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30"
                              : "bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/30"
                          }`}
                          title={`Filter by ${mode}`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  )}

                  <Button
                    className="w-full mt-2"
                    variant="outline"
                    onClick={() => openAddModal(game)}
                  >
                    Add to List
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (query || hasActiveFilters) && !searching ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                No games found matching your criteria.
                {hasActiveFilters && " Try removing some filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Start typing to search for games, or click on badges to filter.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Add to List Modal */}
        {showAddModal && selectedGame && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => {
              setShowAddModal(false)
              setSelectedGame(null)
              setError("")
            }}
          >
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <CardTitle>Add to List</CardTitle>
                <CardDescription>
                  {selectedGame.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                <form onSubmit={handleAddToList} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <select
                      id="status"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                      disabled={addingToList}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rating">Rating (1-10)</Label>
                    <input
                      type="number"
                      id="rating"
                      min="1"
                      max="10"
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                      placeholder="Rate this game (optional)"
                      disabled={addingToList}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <select
                      id="platform"
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                      disabled={addingToList}
                    >
                      <option value="">Select platform (optional)</option>
                      <option value="PC">PC</option>
                      <option value="PlayStation 5">PlayStation 5</option>
                      <option value="PlayStation 4">PlayStation 4</option>
                      <option value="Xbox Series X|S">Xbox Series X|S</option>
                      <option value="Xbox One">Xbox One</option>
                      <option value="Nintendo Switch">Nintendo Switch</option>
                      <option value="Steam Deck">Steam Deck</option>
                      <option value="Mobile">Mobile</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background min-h-[100px]"
                      placeholder="Add any notes about this game..."
                      disabled={addingToList}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddModal(false)
                        setSelectedGame(null)
                        setError("")
                      }}
                      disabled={addingToList}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addingToList}>
                      {addingToList ? "Adding..." : "Add to List"}
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

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-muted rounded mb-4"></div>
            <div className="h-4 w-96 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  )
}
