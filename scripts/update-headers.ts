// Script to update pages to use shared Header component
// Run with: npx tsx scripts/update-headers.ts

import * as fs from "fs"

const files = [
  "G:/Projects/NextUp/src/app/groups/page.tsx",
  "G:/Projects/NextUp/src/app/groups/[id]/page.tsx",
  "G:/Projects/NextUp/src/app/groups/[id]/settings/page.tsx",
  "G:/Projects/NextUp/src/app/settings/page.tsx",
  "G:/Projects/NextUp/src/app/groups/[id]/not-found.tsx"
]

files.forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, "utf8")

    // Check if already has Header import
    if (content.includes('import { Header }')) {
      console.log(`Skipping ${filePath} - already has Header import`)
      return
    }

    // Add Header import after useRouter import if it exists
    if (content.includes('import { useRouter }')) {
      content = content.replace(
        /import { useRouter } from "next\/navigation"/,
        'import { useRouter } from "next/navigation"\nimport { Header } from "@/components/layout/header"'
      )
    } else if (content.includes('import Link from')) {
      content = content.replace(
        /import Link from "next\/link"/,
        'import Link from "next/link"\nimport { Header } from "@/components/layout/header"'
      )
    }

    // Replace inline header with Header component
    content = content.replace(
      /<header className="border-b">[\s\S]*?<\/header>/,
      '<Header />'
    )

    fs.writeFileSync(filePath, content)
    console.log(`Updated ${filePath}`)
  } catch (err: any) {
    console.error(`Error processing ${filePath}:`, err.message)
  }
})

console.log("Done!")
