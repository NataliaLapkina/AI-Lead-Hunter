import type { Lead } from '@/domain/lead'
import {
  buildEmailUrl,
  buildWhatsAppUrl,
  getLeadEmail,
  getLeadTelegramUrl,
  getLeadVkUrl,
  getLeadWhatsApp,
  openExternalUrl,
} from '@/lib/outreachChannels'
import { ru } from '@/i18n/ru'
import { Button } from '@/components/ui/button'
import { Mail, MessageCircle } from 'lucide-react'

interface LeadOutreachActionsProps {
  lead: Lead
  message: string
}

function ContactButton({
  label,
  icon: Icon,
  enabled,
  onClick,
}: {
  label: string
  icon: typeof Mail
  enabled: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!enabled}
      onClick={onClick}
      title={!enabled ? ru.leads.contactNotSpecified : undefined}
      className="gap-2"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  )
}

export function LeadOutreachActions({ lead, message }: LeadOutreachActionsProps) {
  const whatsapp = getLeadWhatsApp(lead)
  const telegramUrl = getLeadTelegramUrl(lead)
  const vkUrl = getLeadVkUrl(lead)
  const email = getLeadEmail(lead)

  const handleWhatsApp = () => {
    if (!whatsapp) return
    openExternalUrl(buildWhatsAppUrl(whatsapp, message))
  }

  const handleTelegram = () => {
    if (!telegramUrl) return
    openExternalUrl(telegramUrl)
  }

  const handleVk = () => {
    if (!vkUrl) return
    openExternalUrl(vkUrl)
  }

  const handleEmail = () => {
    if (!email) return
    openExternalUrl(buildEmailUrl(email, `Сотрудничество — ${lead.name}`, message))
  }

  return (
    <div className="flex flex-wrap gap-2">
      <ContactButton
        label={ru.leads.openWhatsApp}
        icon={MessageCircle}
        enabled={Boolean(whatsapp)}
        onClick={handleWhatsApp}
      />
      <ContactButton
        label={ru.leads.openTelegram}
        icon={MessageCircle}
        enabled={Boolean(telegramUrl)}
        onClick={handleTelegram}
      />
      <ContactButton
        label={ru.leads.openVk}
        icon={MessageCircle}
        enabled={Boolean(vkUrl)}
        onClick={handleVk}
      />
      <ContactButton
        label={ru.leads.openEmail}
        icon={Mail}
        enabled={Boolean(email)}
        onClick={handleEmail}
      />
    </div>
  )
}
