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

interface PrivacyPreferences {
  showActivityToGroup: boolean
  showGameStatus: boolean
  showRatings: boolean
  showNotes: boolean
  showOnlineStatus: boolean
  allowGroupInvites: boolean
}

const AVAILABLE_PLATFORMS = ["PC", "PlayStation 5", "PlayStation 4", "Xbox Series X|S", "Xbox One", "Nintendo Switch"]
const AVAILABLE_STORES = ["Steam", "GOG", "Epic Games", "Humble Bundle", "Green Man Gaming", "PlayStation Store", "Xbox Store", "Nintendo eShop"]

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "account", label: "Account" },
  { id: "deals", label: "Deals" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
]

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()
  const [activeTab, setActiveTab] = useState("profile")

  // Profile state
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  // Avatar state
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [avatarSuccessMessage, setAvatarSuccessMessage] = useState("")
  const [avatarErrorMessage, setAvatarErrorMessage] = useState("")

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState("")
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("")

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

  // Privacy preferences state
  const [privacyPrefs, setPrivacyPrefs] = useState<PrivacyPreferences>({
    showActivityToGroup: true,
    showGameStatus: true,
    showRatings: true,
    showNotes: false,
    showOnlineStatus: true,
    allowGroupInvites: true,
  })
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [privacySuccessMessage, setPrivacySuccessMessage] = useState("")
  const [privacyErrorMessage, setPrivacyErrorMessage] = useState("")

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

  // Initialize name and avatar from session
  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name)
    }
    if (session?.user?.image) {
      setAvatarPreview(session.user.image)
    }
  }, [session?.user?.name, session?.user?.image])

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

  // Fetch privacy preferences
  useEffect(() => {
    async function fetchPrivacyPrefs() {
      try {
        const response = await fetch("/api/users/me/privacy")
        if (response.ok) {
          const data = await response.json()
          setPrivacyPrefs(data.preferences)
        }
      } catch (error) {
        console.error("Failed to fetch privacy preferences:", error)
      }
    }
    fetchPrivacyPrefs()
  }, [])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setAvatarErrorMessage("Please select a JPEG, PNG, GIF, or WebP image.")
      return
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setAvatarErrorMessage("File too large. Maximum size is 2MB.")
      return
    }

    setAvatarFile(file)
    setAvatarErrorMessage("")

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarUpload = async () => {
    if (!avatarFile) {
      setAvatarErrorMessage("Please select an image first")
      return
    }

    setUploadingAvatar(true)
    setUploadProgress(0)
    setAvatarSuccessMessage("")
    setAvatarErrorMessage("")

    try {
      const formData = new FormData()
      formData.append("avatar", avatarFile)

      // Use XMLHttpRequest for upload progress tracking
      const xhr = new XMLHttpRequest()

      const uploadPromise = new Promise<{ success: boolean; image?: string; error?: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(progress)
          }
        })

        xhr.addEventListener("load", () => {
          try {
            const data = JSON.parse(xhr.responseText)
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(data)
            } else {
              reject(new Error(data.error || "Failed to upload avatar"))
            }
          } catch {
            reject(new Error("Failed to parse response"))
          }
        })

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"))
        })

        xhr.open("POST", "/api/users/me/avatar")
        xhr.send(formData)
      })

      const data = await uploadPromise

      // Update session with new avatar
      await updateSession({ image: data.image })
      setAvatarFile(null)
      setUploadProgress(100)
      setAvatarSuccessMessage("Avatar uploaded successfully!")
      setTimeout(() => {
        setAvatarSuccessMessage("")
        setUploadProgress(0)
      }, 3000)
    } catch (error) {
      setAvatarErrorMessage(error instanceof Error ? error.message : "Failed to upload avatar")
      setUploadProgress(0)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setUploadingAvatar(true)
    setAvatarSuccessMessage("")
    setAvatarErrorMessage("")

    try {
      const response = await fetch("/api/users/me/avatar", {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to remove avatar")
      }

      // Clear avatar in UI
      setAvatarPreview(null)
      setAvatarFile(null)
      await updateSession({ image: null })
      setAvatarSuccessMessage("Avatar removed successfully!")
      setTimeout(() => setAvatarSuccessMessage(""), 3000)
    } catch (error) {
      setAvatarErrorMessage(error instanceof Error ? error.message : "Failed to remove avatar")
    } finally {
      setUploadingAvatar(false)
    }
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

  const handleChangePassword = async () => {
    setPasswordSuccessMessage("")
    setPasswordErrorMessage("")

    // Validate fields
    if (!currentPassword) {
      setPasswordErrorMessage("Current password is required")
      return
    }

    if (!newPassword) {
      setPasswordErrorMessage("New password is required")
      return
    }

    if (newPassword.length < 8) {
      setPasswordErrorMessage("New password must be at least 8 characters long")
      return
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)

    if (!hasLetter || !hasNumber) {
      setPasswordErrorMessage("New password must contain at least one letter and one number")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage("New passwords do not match")
      return
    }

    setChangingPassword(true)

    try {
      const response = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password")
      }

      setPasswordSuccessMessage("Password changed successfully!")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordSuccessMessage(""), 5000)
    } catch (error) {
      setPasswordErrorMessage(error instanceof Error ? error.message : "Failed to change password")
    } finally {
      setChangingPassword(false)
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

  const handleSavePrivacyPrefs = async () => {
    setSavingPrivacy(true)
    setPrivacySuccessMessage("")
    setPrivacyErrorMessage("")

    try {
      const response = await fetch("/api/users/me/privacy", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(privacyPrefs),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save privacy preferences")
      }

      setPrivacySuccessMessage("Privacy preferences saved!")
      setTimeout(() => setPrivacySuccessMessage(""), 3000)
    } catch (error) {
      setPrivacyErrorMessage(error instanceof Error ? error.message : "Failed to save privacy preferences")
      setTimeout(() => setPrivacyErrorMessage(""), 5000)
    } finally {
      setSavingPrivacy(false)
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

      <main id="main-content" className="container mx-auto px-4 py-8 max-w-3xl">
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
            <div id="profile-panel" role="tabpanel" aria-labelledby="profile-tab" className="space-y-6">
              {/* Avatar Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Profile Picture</CardTitle>
                  <CardDescription>Upload a profile picture to personalize your account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {avatarSuccessMessage && (
                    <div className="p-3 text-sm text-green-800 bg-green-100 rounded-md">
                      {avatarSuccessMessage}
                    </div>
                  )}
                  {avatarErrorMessage && (
                    <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md">
                      {avatarErrorMessage}
                    </div>
                  )}
                  <div className="flex items-center gap-6">
                    {/* Avatar Preview */}
                    <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-3xl text-muted-foreground">
                          {session?.user?.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label htmlFor="avatar-upload" className="cursor-pointer">
                          <div className="inline-flex items-center justify-center rounded-md text-sm font-medium h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
                            Choose Image
                          </div>
                        </Label>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleAvatarSelect}
                          className="hidden"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          JPEG, PNG, GIF or WebP. Max 2MB.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {avatarFile && (
                          <Button onClick={handleAvatarUpload} disabled={uploadingAvatar}>
                            {uploadingAvatar ? `Uploading... ${uploadProgress}%` : "Save Avatar"}
                          </Button>
                        )}
                        {avatarPreview && !avatarFile && (
                          <Button variant="outline" onClick={handleRemoveAvatar} disabled={uploadingAvatar}>
                            {uploadingAvatar ? "Removing..." : "Remove Avatar"}
                          </Button>
                        )}
                        {/* Upload Progress Bar */}
                        {uploadingAvatar && uploadProgress > 0 && (
                          <div className="w-full">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                              <div
                                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 text-center">
                              {uploadProgress < 100 ? `Uploading: ${uploadProgress}%` : "Upload complete!"}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Profile Info Card */}
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
            <div id="account-panel" role="tabpanel" aria-labelledby="account-tab" className="space-y-6">
              {/* Change Password Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password to keep your account secure.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {passwordSuccessMessage && (
                    <div className="p-3 text-sm text-green-800 bg-green-100 rounded-md">
                      {passwordSuccessMessage}
                    </div>
                  )}
                  {passwordErrorMessage && (
                    <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md">
                      {passwordErrorMessage}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum 8 characters, must include at least one letter and one number.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleChangePassword} disabled={changingPassword}>
                    {changingPassword ? "Changing Password..." : "Change Password"}
                  </Button>
                </CardContent>
              </Card>

              {/* Account Actions Card */}
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

          {/* Privacy Tab */}
          {activeTab === "privacy" && (
            <div id="privacy-panel" role="tabpanel" aria-labelledby="privacy-tab">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy Settings</CardTitle>
                  <CardDescription>Control what others can see about you.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {privacySuccessMessage && (
                    <div className="p-3 text-sm text-green-800 bg-green-100 rounded-md">
                      {privacySuccessMessage}
                    </div>
                  )}
                  {privacyErrorMessage && (
                    <div className="p-3 text-sm text-red-800 bg-red-100 rounded-md">
                      {privacyErrorMessage}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="privacy-activity" className="cursor-pointer">Show Activity to Group</Label>
                        <p className="text-xs text-muted-foreground">Let group members see what games you're playing</p>
                      </div>
                      <input
                        type="checkbox"
                        id="privacy-activity"
                        checked={privacyPrefs.showActivityToGroup}
                        onChange={(e) => setPrivacyPrefs(prev => ({ ...prev, showActivityToGroup: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="privacy-status" className="cursor-pointer">Show Game Status</Label>
                        <p className="text-xs text-muted-foreground">Display your game statuses (Now Playing, Finished, etc.)</p>
                      </div>
                      <input
                        type="checkbox"
                        id="privacy-status"
                        checked={privacyPrefs.showGameStatus}
                        onChange={(e) => setPrivacyPrefs(prev => ({ ...prev, showGameStatus: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="privacy-ratings" className="cursor-pointer">Show Ratings</Label>
                        <p className="text-xs text-muted-foreground">Let others see your game ratings</p>
                      </div>
                      <input
                        type="checkbox"
                        id="privacy-ratings"
                        checked={privacyPrefs.showRatings}
                        onChange={(e) => setPrivacyPrefs(prev => ({ ...prev, showRatings: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="privacy-notes" className="cursor-pointer">Show Notes</Label>
                        <p className="text-xs text-muted-foreground">Share your personal game notes with group members</p>
                      </div>
                      <input
                        type="checkbox"
                        id="privacy-notes"
                        checked={privacyPrefs.showNotes}
                        onChange={(e) => setPrivacyPrefs(prev => ({ ...prev, showNotes: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="privacy-online" className="cursor-pointer">Show Online Status</Label>
                        <p className="text-xs text-muted-foreground">Let others see when you were last active</p>
                      </div>
                      <input
                        type="checkbox"
                        id="privacy-online"
                        checked={privacyPrefs.showOnlineStatus}
                        onChange={(e) => setPrivacyPrefs(prev => ({ ...prev, showOnlineStatus: e.target.checked }))}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="privacy-invites" className="cursor-pointer">Allow Group Invites</Label>
                          <p className="text-xs text-muted-foreground">Let anyone invite you to join groups</p>
                        </div>
                        <input
                          type="checkbox"
                          id="privacy-invites"
                          checked={privacyPrefs.allowGroupInvites}
                          onChange={(e) => setPrivacyPrefs(prev => ({ ...prev, allowGroupInvites: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSavePrivacyPrefs} disabled={savingPrivacy}>
                    {savingPrivacy ? "Saving..." : "Save Privacy Settings"}
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
