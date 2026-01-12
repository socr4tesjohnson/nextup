const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'groups', '[id]', 'settings', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add Table import after AlertDialog import
const alertDialogImport = '} from "@/components/ui/alert-dialog"';
const tableImport = `} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"`;

content = content.replace(alertDialogImport, tableImport);

// Add joinedAt to GroupMember interface
content = content.replace(
  /interface GroupMember \{\n  id: string\n  role: string\n  user:/,
  `interface GroupMember {
  id: string
  role: string
  joinedAt?: string
  user:`
);

// Add remove member state after transfer ownership state
const transferState = `const [transferError, setTransferError] = useState("")`;
const removeMemberState = `const [transferError, setTransferError] = useState("")

  // Remove member state
  const [removeMemberDialogOpen, setRemoveMemberDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<GroupMember | null>(null)
  const [removing, setRemoving] = useState(false)
  const [removeError, setRemoveError] = useState("")`;

content = content.replace(transferState, removeMemberState);

// Add handleRemoveMember and formatDate functions
const handleTransferClose = `const handleTransferDialogClose = () => {
    setTransferDialogOpen(false)
    setSelectedNewOwner("")
    setTransferError("")
  }`;

const newFunctions = `const handleTransferDialogClose = () => {
    setTransferDialogOpen(false)
    setSelectedNewOwner("")
    setTransferError("")
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    setRemoving(true)
    setRemoveError("")

    try {
      const response = await fetch(\`/api/groups/\${groupId}/members/\${memberToRemove.user.id}\`, {
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

      setSuccess(\`\${memberToRemove.user.name || memberToRemove.user.email} removed\`)
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
  }`;

content = content.replace(handleTransferClose, newFunctions);

// Update max-w-2xl to max-w-3xl
content = content.replace(/max-w-2xl/g, 'max-w-3xl');

// Add Members Card after Invite Link Card
const inviteCardEnd = `<p className="text-xs text-muted-foreground">
                Regenerating will invalidate the old code.
              </p>
            </CardContent>
          </Card>

          {settings.isOwner && (`;

const membersCard = `<p className="text-xs text-muted-foreground">
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
                          <span className={\`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium \${
                            isOwner
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                              : member.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
                          }\`}>
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

          {settings.isOwner && (`;

content = content.replace(inviteCardEnd, membersCard);

fs.writeFileSync(filePath, content, 'utf8');
console.log('File updated successfully');
