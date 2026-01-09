import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              NextUp
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8">
            Track what games your friends are playing, share wishlists, and discover your next favorite game together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 rounded-lg bg-card border shadow-sm">
            <div className="text-3xl mb-4">🎮</div>
            <h3 className="text-lg font-semibold mb-2">Track Your Games</h3>
            <p className="text-muted-foreground">
              Keep track of what you're playing, finished, and want to play next.
            </p>
          </div>
          <div className="p-6 rounded-lg bg-card border shadow-sm">
            <div className="text-3xl mb-4">👥</div>
            <h3 className="text-lg font-semibold mb-2">Play with Friends</h3>
            <p className="text-muted-foreground">
              See what your friends are playing and find games to enjoy together.
            </p>
          </div>
          <div className="p-6 rounded-lg bg-card border shadow-sm">
            <div className="text-3xl mb-4">🔮</div>
            <h3 className="text-lg font-semibold mb-2">Discover New Games</h3>
            <p className="text-muted-foreground">
              Get personalized recommendations based on your group's interests.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-4">
        <div className="max-w-5xl mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} NextUp. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
