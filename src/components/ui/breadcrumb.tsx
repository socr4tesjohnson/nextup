"use client"

import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumb({ items, className = "" }: BreadcrumbProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-sm ${className}`}>
      <ol className="flex items-center gap-1 flex-wrap">
        <li className="flex items-center">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center">
            <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground" />
            {item.href && index < items.length - 1 ? (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
