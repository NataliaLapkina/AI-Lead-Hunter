import type { Lead } from '@/domain/lead'
import {
  buildEmailUrl,
  buildTelegramChatUrl,
  buildTelegramShareUrl,
  buildVkProfileUrl,
  buildWhatsAppUrl,
  getLeadEmail,
  getLeadTelegramHandle,
  getLeadVkTarget,
  getLeadWhatsAppPhone,
  openExternalUrl,
} from '@/lib/outreachChannels'
import { ru } from '@/i18n/ru'
import { copyToClipboard } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Mail, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

interface LeadOutreachActionsProps {
  lead: Lead
  message: string
}

export function LeadOutreachActions({ lead, message }: LeadOutreachActionsProps) {
  const whatsappPhone = getLeadWhatsAppPhone(lead)
  const telegramHandle = getLeadTelegramHandle(lead)
  const vkTarget = getLeadVkTarget(lead)
  const email = getLeadEmail(lead)

  const handleWhatsApp = () => {
    if (!whatsappPhone) return
    openExternalUrl(buildWhatsAppUrl(whatsappPhone, message))
  }

  const handleTelegram = async () => {
    if (telegramHandle) {
      await copyToClipboard(message)
      openExternalUrl(buildTelegramChatUrl(telegramHandle))
      toast.success(ru.leads.telegramOpened)
      return
    }
    openExternalUrl(buildTelegramShareUrl(message))
  }

  const handleVk = async () => {
    if (vkTarget) {
      await copyToClipboard(message)
      openExternalUrl(buildVkProfileUrl(vkTarget))
      toast.success(ru.leads.vkOpened)
      return
    }
    toast.error(ru.leads.vkNotAvailable)
  }

  const handleEmail = () => {
    if (!email) return
    const subject = `Сотрудничество — ${lead.name}`
    openExternalUrl(buildEmailUrl(email, subject, message))
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!whatsappPhone}
        onClick={handleWhatsApp}
        className="gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        {ru.leads.openWhatsApp}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!telegramHandle && !message.trim()}
        onClick={() => void handleTelegram()}
        className="gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        {ru.leads.openTelegram}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!vkTarget}
        onClick={() => void handleVk()}
        className="gap-2"
      >
        <MessageCircle className="h-4 w-4" />
        {ru.leads.openVk}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!email}
        onClick={handleEmail}
        className="gap-2"
      >
        <Mail className="h-4 w-4" />
        {ru.leads.openEmail}
      </Button>
    </div>
  )
}
