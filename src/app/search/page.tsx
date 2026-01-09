"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SearchPage() {
  const { data: session } = useSession()
  const [query, setQuery] = useState("")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    try {
      const response = await fetch(`/api/games/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()
      if (response.ok) {
        setResults(data.games || [])
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setSearching(false)
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

        {results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((game) => (
              <Card key={game.id} className="overflow-hidden">
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
                  <CardTitle className="text-lg line-clamp-1">{game.name}</CardTitle>
                  {game.firstReleaseDate && (
                    <CardDescription>
                      {new Date(game.firstReleaseDate).getFullYear()}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
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
      </main>
    </div>
  )
}
