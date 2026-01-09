"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

interface GameEntry {
  id: string
  status: string
  platform: string | null
  rating: number | null
  notes: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  updatedAt: string
  game: {
    id: string
    name: string
    coverUrl: string | null
    firstReleaseDate: string | null
  }
}

const STATUS_LABELS: Record<string, string> = {
  NOW_PLAYING: "Now Playing",
  BACKLOG: "Backlog",
  WISHLIST: "Wishlist",
  FINISHED: "Finished",
  DROPPED: "Dropped",
  FAVORITE: "Favorite",
}

const STATUS_OPTIONS = [
  { value: "NOW_PLAYING", label: "Now Playing" },
  { value: "BACKLOG", label: "Backlog" },
  { value: "WISHLIST", label: "Wishlist" },
  { value: "FINISHED", label: "Finished" },
  { value: "DROPPED", label: "Dropped" },
  { value: "FAVORITE", label: "Favorite" },
]

const FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "NOW_PLAYING", label: "Now Playing" },
  { value: "BACKLOG", label: "Backlog" },
  { value: "WISHLIST", label: "Wishlist" },
  { value: "FINISHED", label: "Finished" },
  { value: "FAVORITE", label: "Favorites" },
]

export default function MyListsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const [entries, setEntries] = useState<GameEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")
  const [error, setError] = useState("")

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingEntry, setEditingEntry] = useState<GameEntry | null>(null)
  const [editStatus, setEditStatus] = useState("")
  const [editRating, setEditRating] = useState<string>("")
  const [editNotes, setEditNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState("")

  useEffect(() => {
    if (sessionStatus === "loading") return

    async function fetchEntries() {
      try {
        const url = filter
          ? `/api/lists?status=${encodeURIComponent(filter)}`
          : "/api/lists"
        const response = await fetch(url)
        const data = await response.json()

        if (response.ok) {
          setEntries(data.entries || [])
        } else {
          setError(data.error || "Failed to load entries")
        }
      } catch (err) {
        console.error("Error fetching entries:", err)
        setError("Failed to load your game list")
      } finally {
        setLoading(false)
      }
    }

    fetchEntries()
  }, [sessionStatus, filter])

  const handleDelete = async (entryId: string) => {
    if (!confirm("Are you sure you want to remove this game from your list?")) {
      return
    }

    try {
      const response = await fetch(`/api/lists/${entryId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setEntries(entries.filter((e) => e.id !== entryId))
      } else {
        const data = await response.json()
        setError(data.error || "Failed to remove game")
      }
    } catch (err) {
      console.error("Error deleting entry:", err)
      setError("Failed to remove game")
    }
  }

  const openEditModal = (entry: GameEntry) => {
    setEditingEntry(entry)
    setEditStatus(entry.status)
    setEditRating(entry.rating?.toString() || "")
    setEditNotes(entry.notes || "")
    setEditError("")
    setShowEditModal(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingEntry) return

    setSaving(true)
    setEditError("")

    try {
      const response = await fetch(`/api/lists/${editingEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: editStatus,
          rating: editRating ? parseInt(editRating, 10) : null,
          notes: editNotes || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setEditError(data.error || "Failed to update entry")
        return
      }

      // Update the entry in the local state
      setEntries(entries.map((e) =>
        e.id === editingEntry.id
          ? { ...e, status: editStatus, rating: editRating ? parseInt(editRating, 10) : null, notes: editNotes || null }
          : e
      ))

      setShowEditModal(false)
      setEditingEntry(null)
    } catch (err) {
      console.error("Error updating entry:", err)
      setEditError("Failed to update entry. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Game Lists</h1>
            <p className="text-muted-foreground">
              Manage your gaming backlog, wishlist, and more.
            </p>
          </div>
          <Link href="/search">
            <Button>Add Game</Button>
          </Link>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={filter === option.value ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setFilter(option.value)
                setLoading(true)
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Games Yet</CardTitle>
              <CardDescription>
                {filter
                  ? `No games in your ${STATUS_LABELS[filter] || filter} list.`
                  : "Start building your game library by adding games."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Search for games and add them to your lists to track your progress and share with friends.
              </p>
              <Link href="/search">
                <Button>Search Games</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entries.map((entry) => (
              <Card key={entry.id} className="overflow-hidden">
                <div className="aspect-[3/4] relative bg-muted">
                  {entry.game.coverUrl ? (
                    <img
                      src={entry.game.coverUrl}
                      alt={entry.game.name}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                      No Image
                    </div>
                  )}
                  <div className="absolute top-2 right-2 px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium">
                    {STATUS_LABELS[entry.status] || entry.status}
                  </div>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg line-clamp-1">
                    {entry.game.name}
                  </CardTitle>
                  {entry.game.firstReleaseDate && (
                    <CardDescription>
                      {new Date(entry.game.firstReleaseDate).getFullYear()}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.notes}
                    </p>
                  )}
                  {entry.rating && (
                    <p className="text-sm">
                      Rating: {entry.rating}/10
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditModal(entry)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingEntry && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Edit Entry</CardTitle>
                <CardDescription>
                  {editingEntry.game.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {editError && (
                  <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {editError}
                  </div>
                )}
                <form onSubmit={handleSaveEdit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status</Label>
                    <select
                      id="edit-status"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                      disabled={saving}
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-rating">Rating (1-10)</Label>
                    <input
                      type="number"
                      id="edit-rating"
                      min="1"
                      max="10"
                      value={editRating}
                      onChange={(e) => setEditRating(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                      placeholder="Rate this game (optional)"
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes">Notes (optional)</Label>
                    <textarea
                      id="edit-notes"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background min-h-[100px]"
                      placeholder="Add any notes about this game..."
                      disabled={saving}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowEditModal(false)
                        setEditingEntry(null)
                        setEditError("")
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
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
