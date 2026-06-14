import type { ReactNode } from 'react'

interface AppShellProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
}

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-16 items-center justify-between px-4 md:px-8">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      </header>
      <main className="flex-1 overflow-auto px-4 py-6 pb-24 md:px-8 md:pb-8">
        {children}
      </main>
    </div>
  )
}
