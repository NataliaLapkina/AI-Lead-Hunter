import type { ReactNode } from 'react'
import { Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ru } from '@/i18n/ru'

interface FeatureGateProps {
  enabled: boolean
  children: ReactNode
  label?: string
}

export function FeatureGate({ enabled, children, label }: FeatureGateProps) {
  if (enabled) return <>{children}</>

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Badge variant="secondary" className="gap-1 px-3 py-1">
          <Lock className="h-3 w-3" />
          {label ?? ru.settings.comingSoon}
        </Badge>
      </div>
    </div>
  )
}
