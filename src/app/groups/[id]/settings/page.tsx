"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface GroupMember {
  id: string
  role: string
  joinedAt?: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

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
  members: GroupMember[]
}

interface DiscordSettings {
  webhookConfigured: boolean
  webhookUrl?: string
  channelId: string | null
  serverId: string | null
  enableWebhook: boolean
  notifyNewGames: boolean
  notifyNowPlaying: boolean
}

// Available regions for deal preferences
const AVAILABLE_REGIONS = [
  { code: "US", name: "United States" },
  { code: "EU", name: "Europe" },
  { code: "UK", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "BR", name: "Brazil" },
  { code: "JP", name: "Japan" },
]

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
  const [defaultPlatforms, setDefaultPlatforms] = useState<string[]>([])
  const [defaultRegion, setDefaultRegion] = useState<string>("")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  // Transfer ownership state
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [selectedNewOwner, setSelectedNewOwner] = useState("")
  const [transferring, setTransferring] = useState(false)
  const [transferError, setTransferError] = useState("")

  // Remove member state
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState("")

  // Change role state
  const [changingRole, setChangingRole] = useState<string | null>(null)

  // Discord settings state
  const [discordSettings, setDiscordSettings] = useState<DiscordSettings | null>(null)
  const [discordLoading, setDiscordLoading] = useState(true)
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("")
  const [savingDiscord, setSavingDiscord] = useState(false)
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [discordSuccess, setDiscordSuccess] = useState("")
  const [discordError, setDiscordError] = useState("")

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
        setDefaultPlatforms(data.settings.defaultPlatforms || [])
        setDefaultRegion(data.settings.defaultRegion || "")
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
        body: JSON.stringify({ name, defaultPlatforms, defaultRegion: defaultRegion || null })
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

  const handleTransferOwnership = async () => {
    if (!selectedNewOwner) {
      setTransferError("Please select a new owner")
      return
    }

    setTransferring(true)
    setTransferError("")

    try {
      const response = await fetch(`/api/groups/${groupId}/transfer-ownership`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newOwnerId: selectedNewOwner })
      })

      const data = await response.json()

      if (!response.ok) {
        setTransferError(data.error || "Failed to transfer ownership")
        setTransferring(false)
        return
      }

      // Update local state
      const newOwnerMember = settings?.members.find(m => m.id === selectedNewOwner)
      if (newOwnerMember && settings) {
        setSettings({
          ...settings,
          owner: newOwnerMember.user,
          isOwner: false
        })
      }

      setSuccess("Ownership transferred successfully")
      setTransferDialogOpen(false)
      setSelectedNewOwner("")
    } catch (err) {
      setTransferError("Failed to transfer ownership")
      setTransferring(false)
    }
  }

  const handleTransferDialogClose = () => {
    setTransferDialogOpen(false)
    setSelectedNewOwner("")
    setTransferError("")
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    setRemoving(true)
    setRemoveError("")

    try {
      const response = await fetch(`/api/groups/${groupId}/members/${memberToRemove.user.id}`, {
        method: "DELETE"
      })

      const data = await response.json()

      if (!response.ok) {
        setRemoveError(data.error || "Failed to remove member")
        setRemoving(false)
        return
      }

      if (settings) {
        setSettings({
          ...settings,
          members: settings.members.filter(m => m.id !== memberToRemove.id)
        })
      }

      setSuccess(`${memberToRemove.user.name || memberToRemove.user.email} removed`)
      setRemoveMemberDialogOpen(false)
      setMemberToRemove(null)
    } catch (err) {
      setRemoveError("Failed to remove member")
    } finally {
      setRemoving(false)
    }
  }

  const handleRemoveDialogClose = () => {
    setRemoveMemberDialogOpen(false)
    setMemberToRemove(null)
    setRemoveError("")
  }

  const handleRoleChange = async (memberId: string, userId: string, newRole: string) => {
    setChangingRole(memberId)
    setError("")
    setSuccess("")

    try {
      const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to change role")
        return
      }

      // Update local state
      if (settings) {
        setSettings({
          ...settings,
          members: settings.members.map(m =>
            m.id === memberId ? { ...m, role: newRole } : m
          )
        })
      }

      setSuccess(`Role changed to ${newRole === 'ADMIN' ? 'Admin' : 'Member'} successfully`)
    } catch (err) {
      setError("Failed to change role")
    } finally {
      setChangingRole(null)
    }
  }

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return '—'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return '—'
    }
  }

  // Fetch Discord settings
  useEffect(() => {
    if (!groupId) return

    async function fetchDiscordSettings() {
      try {
        const response = await fetch(`/api/groups/${groupId}/discord`)
        if (response.ok) {
          const data = await response.json()
          setDiscordSettings(data.settings)
          if (data.settings?.webhookUrl) {
            setDiscordWebhookUrl(data.settings.webhookUrl)
          }
        }
      } catch (error) {
        console.error("Failed to fetch Discord settings:", error)
      } finally {
        setDiscordLoading(false)
      }
    }

    fetchDiscordSettings()
  }, [groupId])

  const handleSaveDiscordSettings = async () => {
    setSavingDiscord(true)
    setDiscordSuccess("")
    setDiscordError("")

    try {
      const response = await fetch(`/api/groups/${groupId}/discord`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: discordWebhookUrl || null,
          enableWebhook: discordSettings?.enableWebhook ?? false,
          notifyNewGames: discordSettings?.notifyNewGames ?? true,
          notifyNowPlaying: discordSettings?.notifyNowPlaying ?? true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save Discord settings")
      }

      setDiscordSettings(data.settings)
      setDiscordSuccess("Discord settings saved!")
      setTimeout(() => setDiscordSuccess(""), 3000)
    } catch (error) {
      setDiscordError(error instanceof Error ? error.message : "Failed to save Discord settings")
      setTimeout(() => setDiscordError(""), 5000)
    } finally {
      setSavingDiscord(false)
    }
  }

  const handleTestWebhook = async () => {
    setTestingWebhook(true)
    setDiscordError("")

    try {
      const response = await fetch(`/api/groups/${groupId}/discord`, {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to test webhook")
      }

      setDiscordSuccess("Test message sent to Discord!")
      setTimeout(() => setDiscordSuccess(""), 3000)
    } catch (error) {
      setDiscordError(error instanceof Error ? error.message : "Failed to test webhook")
      setTimeout(() => setDiscordError(""), 5000)
    } finally {
      setTestingWebhook(false)
    }
  }

  // Get members who can become owner (anyone except current owner)
  const eligibleNewOwners = settings?.members.filter(m => m.id !== settings.owner.id) || []

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
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
        <main className="container mx-auto px-4 py-8 max-w-3xl">
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

      <main id="main-content" className="container mx-auto px-4 py-8 max-w-3xl">
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
              <CardTitle>Default Platforms</CardTitle>
              <CardDescription>Set the default platform filter for the group dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select platforms to filter by default when viewing the group dashboard.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {["PC", "PlayStation 5", "PlayStation 4", "Xbox Series X|S", "Xbox One", "Nintendo Switch", "Steam Deck", "Mobile"].map((platform) => (
                  <label key={platform} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={defaultPlatforms.includes(platform)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDefaultPlatforms([...defaultPlatforms, platform])
                        } else {
                          setDefaultPlatforms(defaultPlatforms.filter(p => p !== platform))
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{platform}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave all unchecked to show all platforms by default.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Default Region</CardTitle>
              <CardDescription>Set the default region for game deals in this group</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a region to show deals from by default for group members.
              </p>
              <select
                value={defaultRegion}
                onChange={(e) => setDefaultRegion(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
              >
                <option value="">No default (use member preferences)</option>
                {AVAILABLE_REGIONS.map((region) => (
                  <option key={region.code} value={region.code}>
                    {region.name} ({region.code})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Leave unset to let each member use their own deal preferences.
              </p>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                Discord Integration
              </CardTitle>
              <CardDescription>
                Connect your group to Discord to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {discordSuccess && (
                <div className="p-3 text-sm text-green-800 bg-green-100 rounded-md">
                  {discordSuccess}
                </div>
              )}
              {discordError && (
                <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md">
                  {discordError}
                </div>
              )}

              {discordLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="discord-webhook">Webhook URL</Label>
                    <Input
                      id="discord-webhook"
                      type="url"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={discordWebhookUrl}
                      onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Create a webhook in your Discord server settings and paste the URL here.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="discord-enable" className="cursor-pointer">Enable Notifications</Label>
                        <p className="text-xs text-muted-foreground">Send updates to Discord</p>
                      </div>
                      <input
                        type="checkbox"
                        id="discord-enable"
                        checked={discordSettings?.enableWebhook ?? false}
                        onChange={(e) => setDiscordSettings(prev => prev ? {
                          ...prev,
                          enableWebhook: e.target.checked
                        } : { webhookConfigured: false, channelId: null, serverId: null, enableWebhook: e.target.checked, notifyNewGames: true, notifyNowPlaying: true })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="discord-new-games" className="cursor-pointer">New Games Added</Label>
                        <p className="text-xs text-muted-foreground">Notify when members add games</p>
                      </div>
                      <input
                        type="checkbox"
                        id="discord-new-games"
                        checked={discordSettings?.notifyNewGames ?? true}
                        onChange={(e) => setDiscordSettings(prev => prev ? {
                          ...prev,
                          notifyNewGames: e.target.checked
                        } : { webhookConfigured: false, channelId: null, serverId: null, enableWebhook: false, notifyNewGames: e.target.checked, notifyNowPlaying: true })}
                        className="w-4 h-4 rounded border-gray-300"
                        disabled={!discordSettings?.enableWebhook}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="discord-now-playing" className="cursor-pointer">Now Playing Updates</Label>
                        <p className="text-xs text-muted-foreground">Notify when members start playing</p>
                      </div>
                      <input
                        type="checkbox"
                        id="discord-now-playing"
                        checked={discordSettings?.notifyNowPlaying ?? true}
                        onChange={(e) => setDiscordSettings(prev => prev ? {
                          ...prev,
                          notifyNowPlaying: e.target.checked
                        } : { webhookConfigured: false, channelId: null, serverId: null, enableWebhook: false, notifyNewGames: true, notifyNowPlaying: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300"
                        disabled={!discordSettings?.enableWebhook}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSaveDiscordSettings} disabled={savingDiscord}>
                      {savingDiscord ? "Saving..." : "Save Discord Settings"}
                    </Button>
                    {discordWebhookUrl && (
                      <Button
                        variant="outline"
                        onClick={handleTestWebhook}
                        disabled={testingWebhook || !discordWebhookUrl}
                      >
                        {testingWebhook ? "Sending..." : "Test Webhook"}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>Manage group members ({settings.members.length} total)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settings.members.map((member) => {
                    const isOwner = member.user.id === settings.owner.id
                    const isCurrentUser = member.user.id === session?.user?.id
                    const canRemove = settings.isOwner && !isOwner && !isCurrentUser
                    const canChangeRole = settings.isOwner && !isOwner && !isCurrentUser

                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium flex-shrink-0">
                              {(member.user.name || member.user.email)[0].toUpperCase()}
                            </div>
                            <span className="truncate max-w-[120px]">{member.user.name || "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{member.user.email}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {canChangeRole ? (
                            <select
                              value={member.role}
                              onChange={(e) => handleRoleChange(member.id, member.user.id, e.target.value)}
                              disabled={changingRole === member.id}
                              className={`px-2 py-1 rounded-md text-xs font-medium border bg-background cursor-pointer ${
                                changingRole === member.id ? 'opacity-50' : ''
                              }`}
                            >
                              <option value="MEMBER">Member</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isOwner
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                : member.role === 'ADMIN'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                            }`}>
                              {isOwner ? 'Owner' : member.role === 'ADMIN' ? 'Admin' : 'Member'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(member.joinedAt)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {canRemove && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                setMemberToRemove(member)
                                setRemoveMemberDialogOpen(true)
                              }}
                            >
                              Remove
                            </Button>
                          )}
                          {isOwner && <span className="text-xs text-muted-foreground">—</span>}
                          {isCurrentUser && !isOwner && <span className="text-xs text-muted-foreground">You</span>}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <AlertDialog open={removeMemberDialogOpen} onOpenChange={setRemoveMemberDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to remove <strong>{memberToRemove?.user.name || memberToRemove?.user.email}</strong> from the group?
                </AlertDialogDescription>
              </AlertDialogHeader>
              {removeError && <p className="text-sm text-destructive">{removeError}</p>}
              <AlertDialogFooter>
                <AlertDialogCancel onClick={handleRemoveDialogClose} disabled={removing}>Cancel</AlertDialogCancel>
                <Button variant="destructive" onClick={handleRemoveMember} disabled={removing}>
                  {removing ? "Removing..." : "Remove Member"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {settings.isOwner && (
            <Card>
              <CardHeader>
                <CardTitle>Transfer Ownership</CardTitle>
                <CardDescription>Transfer group ownership to another member</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {eligibleNewOwners.length > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Select a member to become the new owner. You will remain an admin after transfer.
                    </p>
                    <Button variant="outline" onClick={() => setTransferDialogOpen(true)}>
                      Transfer Ownership
                    </Button>
                    <AlertDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
                          <AlertDialogDescription>
                            Select the member you want to transfer ownership to. You will remain an admin after the transfer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <Label htmlFor="new-owner">New Owner</Label>
                          <select
                            id="new-owner"
                            value={selectedNewOwner}
                            onChange={(e) => setSelectedNewOwner(e.target.value)}
                            className="w-full mt-2 p-2 border rounded-md bg-background"
                            disabled={transferring}
                          >
                            <option value="">Select a member...</option>
                            {eligibleNewOwners.map((member) => (
                              <option key={member.id} value={member.id}>
                                {member.user.name || member.user.email} {member.role === "ADMIN" ? "(Admin)" : "(Member)"}
                              </option>
                            ))}
                          </select>
                          {transferError && (
                            <p className="text-sm text-destructive mt-2">{transferError}</p>
                          )}
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={handleTransferDialogClose} disabled={transferring}>
                            Cancel
                          </AlertDialogCancel>
                          <Button
                            onClick={handleTransferOwnership}
                            disabled={transferring || !selectedNewOwner}
                          >
                            {transferring ? "Transferring..." : "Transfer Ownership"}
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No other members to transfer ownership to. Invite members first.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

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
