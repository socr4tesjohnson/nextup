"use client"

import { useState, useEffect } from "react"
import { useSession, signOut } from "next-auth/react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface DealPreferences {
  enabled: boolean
  region: string
  platforms: string[]
  stores: string[]
  priceThreshold: number | null
  notifyOn: Record<string, boolean>
}

interface NotificationPreferences {
  dealAlerts: boolean
  groupInvites: boolean
  friendActivity: boolean
  recommendations: boolean
  emailNotifications: boolean
}

const AVAILABLE_PLATFORMS = ["PC", "PlayStation 5", "PlayStation 4", "Xbox Series X|S", "Xbox One", "Nintendo Switch"]
const AVAILABLE_STORES = ["Steam", "GOG", "Epic Games", "Humble Bundle", "Green Man Gaming", "PlayStation Store", "Xbox Store", "Nintendo eShop"]

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "deals", label: "Deals" },
  { id: "notifications", label: "Notifications" },
]

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()
  const [activeTab, setActiveTab] = useState("profile")

  // Profile state
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  // Deal preferences state
  const [dealPrefs, setDealPrefs] = useState<DealPreferences>({
    enabled: false,
    region: "US",
    platforms: [],
    stores: [],
    priceThreshold: null,
    notifyOn: {}
  })
  const [savingDeals, setSavingDeals] = useState(false)
  const [dealSuccessMessage, setDealSuccessMessage] = useState("")
  const [dealErrorMessage, setDealErrorMessage] = useState("")

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreferences>({
    dealAlerts: true,
    groupInvites: true,
    friendActivity: true,
    recommendations: true,
    emailNotifications: false,
  })
  const [savingNotifs, setSavingNotifs] = useState(false)
  const [notifSuccessMessage, setNotifSuccessMessage] = useState("")
  const [notifErrorMessage, setNotifErrorMessage] = useState("")

  // Simple tab change handler
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
  }

  // Handle Escape key to close delete dialog
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showDeleteDialog) {
        closeDeleteDialog()
      }
    }
    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [showDeleteDialog])

  // Initialize name from session
  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name)
    }
  }, [session?.user?.name])

  // Fetch deal preferences
  useEffect(() => {
    async function fetchDealPrefs() {
      try {
        const response = await fetch("/api/users/me/deals")
        if (response.ok) {
          const data = await response.json()
          setDealPrefs(data.preferences)
        }
      } catch (error) {
        console.error("Failed to fetch deal preferences:", error)
      }
    }
    fetchDealPrefs()
  }, [])

  // Fetch notification preferences
  useEffect(() => {
    async function fetchNotifPrefs() {
      try {
        const response = await fetch("/api/users/me/notifications")
        if (response.ok) {
          const data = await response.json()
          setNotifPrefs(data.preferences)
        }
      } catch (error) {
        console.error("Failed to fetch notification preferences:", error)
      }
    }
    fetchNotifPrefs()
  }, [])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    setSuccessMessage("")
    setErrorMessage("")

    try {
      const response = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update profile")
      }

      await updateSession({ name })
      setSuccessMessage("Profile updated successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update profile")
      setTimeout(() => setErrorMessage(""), 5000)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError("Password is required")
      return
    }

    setDeleting(true)
    setDeleteError("")

    try {
      const response = await fetch("/api/users/me", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: deletePassword }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete account")
      }

      signOut({ callbackUrl: "/" })
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Failed to delete account")
    } finally {
      setDeleting(false)
    }
  }

  const openDeleteDialog = () => {
    setShowDeleteDialog(true)
    setDeletePassword("")
    setDeleteError("")
  }

  const closeDeleteDialog = () => {
    setShowDeleteDialog(false)
    setDeletePassword("")
    setDeleteError("")
  }

  const handleSaveDealPrefs = async () => {
    setSavingDeals(true)
    setDealSuccessMessage("")
    setDealErrorMessage("")

    try {
      const response = await fetch("/api/users/me/deals", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dealPrefs),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save deal preferences")
      }

      setDealSuccessMessage("Deal preferences saved!")
      setTimeout(() => setDealSuccessMessage(""), 3000)
    } catch (error) {
      setDealErrorMessage(error instanceof Error ? error.message : "Failed to save deal preferences")
      setTimeout(() => setDealErrorMessage(""), 5000)
    } finally {
      setSavingDeals(false)
    }
  }

  const handleSaveNotifPrefs = async () => {
    setSavingNotifs(true)
    setNotifSuccessMessage("")
    setNotifErrorMessage("")

    try {
      const response = await fetch("/api/users/me/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notifPrefs),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save notification preferences")
      }

      setNotifSuccessMessage("Notification preferences saved!")
      setTimeout(() => setNotifSuccessMessage(""), 3000)
    } catch (error) {
      setNotifErrorMessage(error instanceof Error ? error.message : "Failed to save notification preferences")
      setTimeout(() => setNotifErrorMessage(""), 5000)
    } finally {
      setSavingNotifs(false)
    }
  }

  const togglePlatform = (platform: string) => {
    setDealPrefs(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }))
  }

  const toggleStore = (store: string) => {
    setDealPrefs(prev => ({
      ...prev,
      stores: prev.stores.includes(store)
        ? prev.stores.filter(s => s !== store)
        : [...prev.stores, store]
    }))
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and preferences.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <nav className="flex gap-4" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`${tab.id}-panel`}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Panels */}
        <div className="space-y-6">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div id="profile-panel" role="tabpanel" aria-labelledby="profile-tab">
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Your public profile information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {successMessage && (
                    <div className="p-3 text-sm text-green-800 bg-green-100 rounded-md">
                      {successMessage}
                    </div>
                  )}
                  {errorMessage && (
                    <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md">
                      {errorMessage}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" defaultValue={session?.user?.email || ""} disabled />
                    <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
                  </div>
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Account Tab */}
          {activeTab === "account" && (
            <div id="account-panel" role="tabpanel" aria-labelledby="account-tab">
              <Card>
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                  <CardDescription>Manage your account settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Session</h3>
                    <Button variant="outline" onClick={handleSignOut}>
                      Sign Out
                    </Button>
                  </div>
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium mb-2 text-destructive">Danger Zone</h3>
                    <Button variant="destructive" onClick={openDeleteDialog}>
                      Delete Account
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      This action cannot be undone. All your data will be permanently deleted.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Deals Tab */}
          {activeTab === "deals" && (
            <div id="deals-panel" role="tabpanel" aria-labelledby="deals-tab">
              <Card>
                <CardHeader>
                  <CardTitle>Deal Alerts</CardTitle>
                  <CardDescription>Get notified when games on your wishlist go on sale.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {dealSuccessMessage && (
                    <div className="p-3 text-sm text-green-800 bg-green-100 rounded-md">
                      {dealSuccessMessage}
                    </div>
                  )}
                  {dealErrorMessage && (
                    <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md">
                      {dealErrorMessage}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="deal-enabled"
                      checked={dealPrefs.enabled}
                      onChange={(e) => setDealPrefs(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <Label htmlFor="deal-enabled" className="cursor-pointer">
                      Enable deal tracking
                    </Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Platforms</Label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_PLATFORMS.map((platform) => (
                        <button
                          key={platform}
                          type="button"
                          onClick={() => togglePlatform(platform)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            dealPrefs.platforms.includes(platform)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-input hover:bg-accent"
                          }`}
                        >
                          {platform}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Stores</Label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_STORES.map((store) => (
                        <button
                          key={store}
                          type="button"
                          onClick={() => toggleStore(store)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                            dealPrefs.stores.includes(store)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-input hover:bg-accent"
                          }`}
                        >
                          {store}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price-threshold">Price Threshold (optional)</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">$</span>
                      <Input
                        id="price-threshold"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g., 20.00"
                        value={dealPrefs.priceThreshold ?? ""}
                        onChange={(e) => setDealPrefs(prev => ({
                          ...prev,
                          priceThreshold: e.target.value ? parseFloat(e.target.value) : null
                        }))}
                        className="w-32"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Only notify for deals below this price. Leave empty for all deals.
                    </p>
                  </div>

                  <Button onClick={handleSaveDealPrefs} disabled={savingDeals}>
                    {savingDeals ? "Saving..." : "Save Deal Preferences"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === "notifications" && (
            <div id="notifications-panel" role="tabpanel" aria-labelledby="notifications-tab">
              <Card>
                <CardHeader>
                  <CardTitle>Notification Preferences</CardTitle>
                  <CardDescription>Choose what notifications you want to receive.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {notifSuccessMessage && (
                    <div className="p-3 text-sm text-green-800 bg-green-100 rounded-md">
                      {notifSuccessMessage}
                    </div>
                  )}
                  {notifErrorMessage && (
                    <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md">
                      {notifErrorMessage}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notif-deals" className="cursor-pointer">Deal Alerts</Label>
                        <p className="text-xs text-muted-foreground">Get notified about game sales</p>
                      </div>
                      <input
                        type="checkbox"
                        id="notif-deals"
                        checked={notifPrefs.dealAlerts}
                        onChange={(e) => setNotifPrefs(prev => ({ ...prev, dealAlerts: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notif-groups" className="cursor-pointer">Group Invites</Label>
                        <p className="text-xs text-muted-foreground">Notifications when you're invited to groups</p>
                      </div>
                      <input
                        type="checkbox"
                        id="notif-groups"
                        checked={notifPrefs.groupInvites}
                        onChange={(e) => setNotifPrefs(prev => ({ ...prev, groupInvites: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notif-friends" className="cursor-pointer">Friend Activity</Label>
                        <p className="text-xs text-muted-foreground">Updates when friends add games</p>
                      </div>
                      <input
                        type="checkbox"
                        id="notif-friends"
                        checked={notifPrefs.friendActivity}
                        onChange={(e) => setNotifPrefs(prev => ({ ...prev, friendActivity: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="notif-recs" className="cursor-pointer">Recommendations</Label>
                        <p className="text-xs text-muted-foreground">Game recommendations based on your lists</p>
                      </div>
                      <input
                        type="checkbox"
                        id="notif-recs"
                        checked={notifPrefs.recommendations}
                        onChange={(e) => setNotifPrefs(prev => ({ ...prev, recommendations: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="notif-email" className="cursor-pointer">Email Notifications</Label>
                          <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                        </div>
                        <input
                          type="checkbox"
                          id="notif-email"
                          checked={notifPrefs.emailNotifications}
                          onChange={(e) => setNotifPrefs(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveNotifPrefs} disabled={savingNotifs}>
                    {savingNotifs ? "Saving..." : "Save Notification Preferences"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Delete Account Confirmation Dialog */}
      {showDeleteDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={closeDeleteDialog}
        >
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-red-600 mb-4">Delete Account</h2>
            <p className="text-muted-foreground mb-4">
              This action is permanent and cannot be undone. All your data, including your
              game lists, group memberships, and settings will be permanently deleted.
            </p>
            <p className="text-sm font-medium mb-2">
              Please enter your password to confirm:
            </p>
            {deleteError && (
              <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md mb-4">
                {deleteError}
              </div>
            )}
            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Enter your password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={closeDeleteDialog} disabled={deleting}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={deleting || !deletePassword}
                >
                  {deleting ? "Deleting..." : "Delete My Account"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
