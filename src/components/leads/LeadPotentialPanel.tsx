import type { Lead } from '@/domain/lead'
import { computeLeadScore } from '@/lib/leadScore'
import { getLeadPotentialLabel } from '@/i18n/ru'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LeadPotentialPanelProps {
  lead: Lead
}

export function LeadPotentialPanel({ lead }: LeadPotentialPanelProps) {
  const { score, level, reasons } = computeLeadScore(lead)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Потенциал лида</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium">
          {score}/10 — {getLeadPotentialLabel(level)}
        </p>
        {reasons.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">Почему:</p>
            <ul className="space-y-1 text-sm">
              {reasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <span className="text-muted-foreground">-</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
