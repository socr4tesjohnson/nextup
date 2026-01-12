"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface Game {
  id: string
  igdbId: number
  name: string
  coverUrl: string | null
  firstReleaseDate: string | null
  genres: string[]
  platforms: string[]
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

export default function SearchPage() {
  const { data: session } = useSession()
  const [query, setQuery] = useState("")
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    setError("")
    try {
      const response = await fetch(`/api/games/search?q=${encodeURIComponent(query)}`)
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
          <h1 className="text-3xl font-bold mb-2">Search Games</h1>
          <p className="text-muted-foreground mb-6">
            Find games to add to your lists and share with your groups.
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
            <Button type="submit" disabled={searching || !query.trim()}>
              {searching ? "Searching..." : "Search"}
            </Button>
          </form>
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
                    {game.platforms && game.platforms.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {game.platforms.slice(0, 3).map((platform) => (
                          <span
                            key={platform}
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                          >
                            {platform}
                          </span>
                        ))}
                        {game.platforms.length > 3 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                            +{game.platforms.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </CardHeader>
                </Link>
                <CardContent>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => openAddModal(game)}
                  >
                    Add to List
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : query && !searching ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No games found for "{query}"</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Start typing to search for games in our database.
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
