"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Group {
  id: string
  name: string
  memberCount: number
  userRole: string
  owner: {
    id: string
    name: string | null
    image: string | null
  }
}

export default function GroupsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (status === "loading") return

    async function fetchGroups() {
      try {
        const response = await fetch("/api/groups")
        const data = await response.json()

        if (response.ok) {
          setGroups(data.groups)
        }
      } catch (err) {
        console.error("Error fetching groups:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchGroups()
  }, [status])

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError("")

    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to create group")
        return
      }

      router.push(`/groups/${data.group.id}`)
    } catch (err) {
      setError("Failed to create group")
    } finally {
      setCreating(false)
    }
  }

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setJoining(true)
    setError("")

    try {
      const response = await fetch(`/api/groups/join/${inviteCode}`, {
        method: "POST"
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to join group")
        return
      }

      router.push(`/groups/${data.groupId}`)
    } catch (err) {
      setError("Failed to join group")
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Groups</h1>
            <p className="text-muted-foreground">
              Join or create groups to share games with friends.
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>Create Group</Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-32 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Groups Yet</CardTitle>
              <CardDescription>
                Create a group and invite your friends to start tracking games together.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Groups allow you to see what games your friends are playing, share wishlists, and discover new games together.
              </p>
              <div className="flex gap-4">
                <Button onClick={() => setShowCreateModal(true)}>Create Your First Group</Button>
                <Button variant="outline" onClick={() => setShowJoinModal(true)}>
                  Join with Invite Code
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groups.map((group) => (
                <Link key={group.id} href={`/groups/${group.id}`}>
                  <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                    <CardHeader>
                      <CardTitle>{group.name}</CardTitle>
                      <CardDescription>
                        {group.memberCount} member{group.memberCount !== 1 ? "s" : ""} •{" "}
                        {group.userRole === "ADMIN" ? "Admin" : "Member"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Click to view group dashboard
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
            <div className="mt-6">
              <Button variant="outline" onClick={() => setShowJoinModal(true)}>
                Join with Invite Code
              </Button>
            </div>
          </>
        )}

        {/* Create Group Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Create a New Group</CardTitle>
                <CardDescription>
                  Give your group a name to get started.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="groupName">Group Name</Label>
                    <Input
                      id="groupName"
                      placeholder="My Gaming Squad"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      required
                      disabled={creating}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateModal(false)
                        setNewGroupName("")
                        setError("")
                      }}
                      disabled={creating}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creating}>
                      {creating ? "Creating..." : "Create Group"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Join Group Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Join a Group</CardTitle>
                <CardDescription>
                  Enter the invite code shared with you.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                <form onSubmit={handleJoinGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Invite Code</Label>
                    <Input
                      id="inviteCode"
                      placeholder="ABCD1234"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      required
                      disabled={joining}
                      className="font-mono uppercase"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowJoinModal(false)
                        setInviteCode("")
                        setError("")
                      }}
                      disabled={joining}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={joining}>
                      {joining ? "Joining..." : "Join Group"}
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
