"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

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

      <main className="container mx-auto px-4 py-8">
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

        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((game) => (
              <Card key={game.id} className="overflow-hidden">
                <Link href={`/games/${game.id}`} className="block">
                  <div className="aspect-[3/4] relative bg-muted">
                    {game.coverUrl ? (
                      <img
                        src={game.coverUrl}
                        alt={game.name}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1 hover:text-primary">{game.name}</CardTitle>
                    {game.firstReleaseDate && (
                      <CardDescription>
                        {new Date(game.firstReleaseDate).getFullYear()}
                      </CardDescription>
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
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
