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

  const formatDate = (dateString) => {
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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
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
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            isOwner
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                              : member.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                          }`}>
                            {isOwner ? 'Owner' : member.role === 'ADMIN' ? 'Admin' : 'Member'}
                          </span>
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
