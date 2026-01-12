"use client"

import { useRouter } from "next/navigation"

interface ClickableBadgeProps {
  label: string
  filterType: "genres" | "platforms" | "gameModes"
  variant?: "genre" | "platform" | "gameMode"
  className?: string
}

const variantStyles = {
  genre: "bg-primary/10 text-primary hover:bg-primary/20",
  platform: "bg-muted text-muted-foreground hover:bg-muted/80",
  gameMode: "bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30",
  gameModeCoop: "bg-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/30",
  gameModeMultiplayer: "bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-500/30",
}

export function ClickableBadge({ label, filterType, variant = "genre", className = "" }: ClickableBadgeProps) {
  const router = useRouter()

  // Determine the style based on label content for game modes
  let style = variantStyles[variant]
  if (variant === "gameMode") {
    if (label.toLowerCase().includes("co-op") || label.toLowerCase().includes("coop")) {
      style = variantStyles.gameModeCoop
    } else if (label.toLowerCase().includes("multiplayer")) {
      style = variantStyles.gameModeMultiplayer
    }
  }

  const handleClick = () => {
    // Navigate to search page with the filter applied
    const params = new URLSearchParams()
    params.set(filterType, label)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <button
      onClick={handleClick}
      className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors ${style} ${className}`}
      title={`Search for games with ${label}`}
    >
      {label}
    </button>
  )
}
