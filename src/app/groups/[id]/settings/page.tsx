"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface GroupSettings {
  id: string
  name: string
  inviteCode: string
  defaultPlatforms: string[]
  defaultRegion: string | null
  owner: {
    id: string
    name: string | null
    email: string
  }
  isOwner: boolean
}

export default function GroupSettingsPage() {
  const { data: session, status } = useSession()
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [settings, setSettings] = useState<GroupSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [name, setName] = useState("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  useEffect(() => {
    if (status === "loading") return

    async function fetchSettings() {
      try {
        const response = await fetch(`/api/groups/${groupId}/settings`)
        const data = await response.json()

        if (!response.ok) {
          if (response.status === 403) {
            // Not an admin - redirect to group page
            router.replace(`/groups/${groupId}`)
            return
          }
          setError(data.error || "Failed to load settings")
          return
        }

        setSettings(data.settings)
        setName(data.settings.name)
      } catch (err) {
        setError("Failed to load settings")
      } finally {
        setLoading(false)
      }
    }

    fetchSettings()
  }, [groupId, status, router])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to save settings")
        return
      }

      setSettings(prev => prev ? { ...prev, name } : null)
      setSuccess("Settings saved successfully")
    } catch (err) {
      setError("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerateInvite = async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/invite`, {
        method: "POST"
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to regenerate invite code")
        return
      }

      setSettings(prev => prev ? { ...prev, inviteCode: data.inviteCode } : null)
      setSuccess("Invite code regenerated")
    } catch (err) {
      setError("Failed to regenerate invite code")
    }
  }

  const handleDeleteGroup = async () => {
    if (!deletePassword) {
      setDeleteError("Password is required")
      return
    }

    setDeleting(true)
    setDeleteError("")

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword })
      })

      const data = await response.json()

      if (!response.ok) {
        setDeleteError(data.error || "Failed to delete group")
        setDeleting(false)
        return
      }

      // Redirect to groups list after successful deletion
      router.push("/groups")
    } catch (err) {
      setDeleteError("Failed to delete group")
      setDeleting(false)
    }
  }

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false)
    setDeletePassword("")
    setDeleteError("")
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Link href="/dashboard" className="text-xl font-bold">
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                NextUp
              </span>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-muted rounded mb-4"></div>
            <div className="h-4 w-64 bg-muted rounded mb-8"></div>
          </div>
        </main>
      </div>
    )
  }

  if (error && !settings) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Link href="/dashboard" className="text-xl font-bold">
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                NextUp
              </span>
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Link href="/groups">
                <Button>Back to Groups</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!settings) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold">
            <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              NextUp
            </span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary">
              Dashboard
            </Link>
            <Link href="/groups" className="text-sm font-medium hover:text-primary">
              Groups
            </Link>
            <Link href="/me" className="text-sm font-medium hover:text-primary">
              My Lists
            </Link>
            <Link href="/settings" className="text-sm font-medium hover:text-primary">
              Settings
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <Link href={`/groups/${groupId}`} className="text-sm text-muted-foreground hover:text-primary mb-2 block">
            ← Back to {settings.name}
          </Link>
          <h1 className="text-3xl font-bold mb-2">Group Settings</h1>
          <p className="text-muted-foreground">
            Manage your group's settings and invite members.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-md bg-green-500/10 text-green-600 text-sm">
            {success}
          </div>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Basic group information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    disabled={saving}
                  />
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invite Link</CardTitle>
              <CardDescription>Share this code with friends to invite them</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <code className="flex-1 p-3 bg-muted rounded-md font-mono text-sm">
                  {settings.inviteCode}
                </code>
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(settings.inviteCode)
                    setSuccess("Invite code copied!")
                    setTimeout(() => setSuccess(""), 2000)
                  }}
                >
                  Copy
                </Button>
              </div>
              <Button variant="outline" onClick={handleRegenerateInvite}>
                Regenerate Code
              </Button>
              <p className="text-xs text-muted-foreground">
                Regenerating will invalidate the old code.
              </p>
            </CardContent>
          </Card>

          {settings.isOwner && (
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Irreversible actions</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                  Delete Group
                </Button>
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Group</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the group
                        <strong> "{settings.name}"</strong> and remove all members.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                      <Label htmlFor="delete-password">Enter your password to confirm</Label>
                      <Input
                        id="delete-password"
                        type="password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        placeholder="Your password"
                        className="mt-2"
                        disabled={deleting}
                      />
                      {deleteError && (
                        <p className="text-sm text-destructive mt-2">{deleteError}</p>
                      )}
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel onClick={handleDeleteDialogClose} disabled={deleting}>
                        Cancel
                      </AlertDialogCancel>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteGroup}
                        disabled={deleting || !deletePassword}
                      >
                        {deleting ? "Deleting..." : "Delete Group"}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-2">
                  This action cannot be undone. All group data will be permanently deleted.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
