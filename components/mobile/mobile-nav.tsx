// components/mobile/mobile-nav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ShoppingCart, Package, Fuel, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    label: 'Home',
    href: '/mobile',
    icon: Home
  },
  {
    label: 'POS',
    href: '/mobile/pos',
    icon: ShoppingCart
  },
  {
    label: 'Inventory',
    href: '/mobile/inventory',
    icon: Package
  },
  {
    label: 'Fuel',
    href: '/mobile/fuel',
    icon: Fuel
  },
  {
    label: 'Profile',
    href: '/mobile/profile',
    icon: User
  }
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-40">
      <div className="grid grid-cols-5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
                          (item.href !== '/mobile' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-1 min-h-[60px] transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <Icon className={cn(
                "w-6 h-6 mb-1",
                isActive && "scale-110 transition-transform"
              )} />
              <span className={cn(
                "text-xs font-medium",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// Mobile header with sync status
export function MobileHeader({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 safe-area-top">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {/* Add sync status or other header actions */}
      </div>
    </header>
  )
}
