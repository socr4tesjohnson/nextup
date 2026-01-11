"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface Game {
  id: string
  name: string
  slug: string
  description: string | null
  coverUrl: string | null
  bannerUrl: string | null
  firstReleaseDate: string | null
  genres: string[]
  platforms: string[]
  themes: string[]
  rating: number | null
}

interface Deal {
  id: string
  store: string
  price: number
  msrp: number
  discountPercent: number
  url: string
  isHistoricalLow: boolean
  region: string
}

const STATUS_OPTIONS = [
  { value: "NOW_PLAYING", label: "Now Playing" },
  { value: "BACKLOG", label: "Backlog" },
  { value: "WISHLIST", label: "Wishlist" },
  { value: "FINISHED", label: "Finished" },
  { value: "DROPPED", label: "Dropped" },
  { value: "FAVORITE", label: "Favorite" },
]

export default function GameDetailPage() {
  const { data: session } = useSession()
  const params = useParams()
  const gameId = params.id as string

  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [deals, setDeals] = useState<Deal[]>([])
  const [dealsLoading, setDealsLoading] = useState(true)

  // Add to list modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingToList, setAddingToList] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState("NOW_PLAYING")
  const [notes, setNotes] = useState("")
  const [rating, setRating] = useState("")
  const [platform, setPlatform] = useState("")
  const [addError, setAddError] = useState("")
  const [addSuccess, setAddSuccess] = useState("")

  useEffect(() => {
    async function fetchGame() {
      try {
        const response = await fetch(`/api/games/${gameId}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || "Failed to load game")
          return
        }

        setGame(data.game)
      } catch (err) {
        setError("Failed to load game")
      } finally {
        setLoading(false)
      }
    }

    async function fetchDeals() {
      try {
        const response = await fetch(`/api/games/${gameId}/deals`)
        const data = await response.json()

        if (response.ok && data.deals) {
          setDeals(data.deals)
        }
      } catch (err) {
        console.error("Failed to load deals:", err)
      } finally {
        setDealsLoading(false)
      }
    }

    fetchGame()
    fetchDeals()
  }, [gameId])

  const handleAddToList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!game) return

    setAddingToList(true)
    setAddError("")

    try {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: game.id,
          status: selectedStatus,
          notes: notes || null,
          rating: rating ? parseInt(rating, 10) : null,
          platform: platform || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setAddError(data.error || "Failed to add game to list")
        return
      }

      setAddSuccess(`${game.name} added to your list!`)
      setShowAddModal(false)
      setTimeout(() => setAddSuccess(""), 3000)
    } catch (err) {
      setAddError("Failed to add game. Please try again.")
    } finally {
      setAddingToList(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 w-64 bg-muted rounded mb-4"></div>
            <div className="h-4 w-96 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error || "Game not found"}</p>
              <Link href="/search">
                <Button>Back to Search</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const releaseYear = game.firstReleaseDate
    ? new Date(game.firstReleaseDate).getFullYear()
    : null

  const formattedReleaseDate = game.firstReleaseDate
    ? new Date(game.firstReleaseDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Link
          href="/search"
          className="text-sm text-muted-foreground hover:text-primary mb-4 block"
        >
          ← Back to Search
        </Link>

        {addSuccess && (
          <div className="mb-4 p-3 rounded-md bg-green-500/10 text-green-600 text-sm">
            {addSuccess}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Cover Image */}
          <div className="md:col-span-1">
            <div className="aspect-[3/4] relative bg-muted rounded-lg overflow-hidden">
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

            <Button
              className="w-full mt-4"
              onClick={() => {
                setSelectedStatus("NOW_PLAYING")
                setNotes("")
                setRating("")
                setPlatform("")
                setAddError("")
                setShowAddModal(true)
              }}
            >
              Add to My List
            </Button>
          </div>

          {/* Game Details */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{game.name}</h1>
              {releaseYear && (
                <p className="text-xl text-muted-foreground">{releaseYear}</p>
              )}
            </div>

            {game.description && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-muted-foreground leading-relaxed">
                  {game.description}
                </p>
              </div>
            )}

            {game.genres && game.genres.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Genres</h2>
                <div className="flex flex-wrap gap-2">
                  {game.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {game.themes && game.themes.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Themes</h2>
                <div className="flex flex-wrap gap-2">
                  {game.themes.map((theme) => (
                    <span
                      key={theme}
                      className="px-3 py-1 bg-secondary/50 text-secondary-foreground rounded-full text-sm"
                    >
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {game.platforms && game.platforms.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Platforms</h2>
                <div className="flex flex-wrap gap-2">
                  {game.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {formattedReleaseDate && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Release Date</h2>
                <p className="text-muted-foreground">{formattedReleaseDate}</p>
              </div>
            )}

            {game.rating && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Rating</h2>
                <p className="text-muted-foreground">
                  {Math.round(game.rating)}/100
                </p>
              </div>
            )}

            {/* Where to Buy Section */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Where to Buy</h2>
              {dealsLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-12 bg-muted rounded"></div>
                  <div className="h-12 bg-muted rounded"></div>
                  <div className="h-12 bg-muted rounded"></div>
                </div>
              ) : deals.length > 0 ? (
                <div className="space-y-2">
                  {deals.map((deal) => (
                    <a
                      key={deal.id}
                      href={deal.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{deal.store}</span>
                        {deal.isHistoricalLow && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-600">
                            Historical Low!
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {deal.discountPercent > 0 && (
                          <span className="text-sm px-2 py-0.5 rounded bg-red-500/20 text-red-500 font-medium">
                            -{deal.discountPercent}%
                          </span>
                        )}
                        <div className="text-right">
                          <span className="font-bold text-primary">${deal.price.toFixed(2)}</span>
                          {deal.discountPercent > 0 && (
                            <span className="ml-2 text-sm text-muted-foreground line-through">
                              ${deal.msrp.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <span className="text-muted-foreground">→</span>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No deals available for this game.</p>
              )}
            </div>
          </div>
        </div>

        {/* Add to List Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Add to List</CardTitle>
                <CardDescription>{game.name}</CardDescription>
              </CardHeader>
              <CardContent>
                {addError && (
                  <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {addError}
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
                        setAddError("")
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
