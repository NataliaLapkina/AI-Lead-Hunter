import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Lead, LeadStatus, UpdateLeadInput } from '@/domain/lead'
import type { LeadDetailFocus } from '@/lib/leadNextAction'
import { LEAD_STATUSES } from '@/lib/constants'
import { getSourceLabel, getStatusLabel, getNicheLabel, ru } from '@/i18n/ru'
import { formatDateTime, copyToClipboard } from '@/lib/utils'
import { useSettingsStore } from '@/stores'
import {
  buildOutreachMessage,
  buildRecommendations,
  finalizeOutreachMessage,
} from '@/features/leads/improvements'
import {
  buildProposalTemplate,
  buildReviewRequestTemplate,
} from '@/features/leads/workflowTemplates'
import { ImprovementBadges } from '@/components/leads/ImprovementChecklist'
import { LeadStatusBadge } from '@/components/leads/LeadStatusBadge'
import { LeadActivityFeed } from '@/components/leads/LeadActivityFeed'
import { LeadComments } from '@/components/leads/LeadComments'
import { LeadOutreachActions } from '@/components/leads/LeadOutreachActions'
import { LeadMessagePanel } from '@/components/leads/LeadMessagePanel'
import { LeadPotentialPanel } from '@/components/leads/LeadPotentialPanel'
import { LeadNextActionPanel } from '@/components/leads/LeadNextActionPanel'
import { LeadSourceLink } from '@/components/leads/LeadSourceLink'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Copy,
  Pencil,
  Trash2,
  ExternalLink,
  Mail,
  Phone,
  MessageCircle,
  ScanSearch,
  Maximize2,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { generateAIMessage } from '@/services/ai/AIMessageGenerator'
import { hasOpenAIKey } from '@/services/ai/openaiClient'
import {
  buildRegeneratedMessageUpdate,
  buildRestoreMessageUpdate,
} from '@/lib/leadMessageHistory'
import {
  auditWebsite,
  enhanceAuditWithAI,
  findingsToOpportunities,
} from '@/services/audit/siteAnalyzer'

interface LeadDetailViewProps {
  lead: Lead
  onStatusChange: (id: string, status: LeadStatus) => Promise<void>
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onUpdateLead: (id: string, data: UpdateLeadInput) => Promise<Lead>
  onAddComment: (id: string, text: string) => Promise<void>
  showFullPageLink?: boolean
  focus?: LeadDetailFocus | null
  focusSeq?: number
}

export function LeadDetailView({
  lead,
  onStatusChange,
  onEdit,
  onDelete,
  onUpdateLead,
  onAddComment,
  showFullPageLink = true,
  focus = null,
  focusSeq = 0,
}: LeadDetailViewProps) {
  const { settings, fetchSettings } = useSettingsStore()
  const [isGenerating, setIsGenerating] = useState(false)
  const [restoringVariantId, setRestoringVariantId] = useState<string | null>(null)
  const [isAuditing, setIsAuditing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    void fetchSettings()
  }, [fetchSettings])

  const apiKey = settings?.integrations.openaiApiKey

  const fallbackMessage = buildOutreachMessage(
    lead,
    settings?.profile,
    settings?.aiSettings,
    settings?.aiProfile,
  )
  const message = lead.generatedMessage
    ? finalizeOutreachMessage(
        lead.generatedMessage,
        lead,
        settings?.profile,
        settings?.aiSettings,
      )
    : fallbackMessage
  const recommendations = buildRecommendations(lead.opportunities ?? [])
  const proposalTemplate = buildProposalTemplate(lead, settings?.profile)
  const reviewTemplate = buildReviewRequestTemplate(lead, settings?.profile)

  useEffect(() => {
    if (!focus) return

    const tabByFocus: Record<LeadDetailFocus, string> = {
      overview: 'overview',
      message: 'message',
      history: 'history',
      proposal: 'proposal',
      review: 'review',
    }

    setActiveTab(tabByFocus[focus])

    if (focus === 'message') {
      const timer = window.setTimeout(() => {
        document.getElementById('lead-ai-message')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 150)
      return () => window.clearTimeout(timer)
    }
  }, [focus, focusSeq, lead.id])

  const handleCopyText = async (text: string) => {
    await copyToClipboard(text)
    toast.success(ru.toast.copySuccess)
  }

  const handleCopyMessage = async () => {
    await copyToClipboard(message)
    toast.success(ru.toast.copySuccess)
  }

  const generateMessage = async (regenerate: boolean) => {
    if (!hasOpenAIKey(apiKey)) {
      toast.error(ru.settings.openaiRequired)
      return
    }

    setIsGenerating(true)
    try {
      const generated = await generateAIMessage(apiKey!, {
        lead,
        senderProfile: settings?.profile,
        aiSettings: settings?.aiSettings,
        aiProfile: settings?.aiProfile,
      })
      const update = buildRegeneratedMessageUpdate(lead, generated, {
        archiveCurrent: regenerate,
      })
      await onUpdateLead(lead.id, update)
      toast.success(ru.leads.messageGenerated)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ru.toast.error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerateAI = async () => {
    await generateMessage(false)
  }

  const handleRegenerateAI = async () => {
    await generateMessage(true)
  }

  const handleRestoreVariant = async (variantId: string) => {
    const update = buildRestoreMessageUpdate(lead, variantId)
    if (!update) return

    setRestoringVariantId(variantId)
    try {
      await onUpdateLead(lead.id, update)
      toast.success(ru.leads.messageRestored)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ru.toast.error)
    } finally {
      setRestoringVariantId(null)
    }
  }

  const handleAuditSite = async () => {
    if (!lead.website) {
      toast.error(ru.leads.auditNoWebsite)
      return
    }
    setIsAuditing(true)
    try {
      let audit = await auditWebsite(lead.website)
      let aiRecommendations = lead.aiRecommendations

      if (hasOpenAIKey(apiKey)) {
        aiRecommendations = await enhanceAuditWithAI(apiKey!, audit, lead.name)
      }

      const autoOpportunities = findingsToOpportunities(audit.findings)
      const mergedOpportunities = [
        ...new Set([...(lead.opportunities ?? []), ...autoOpportunities]),
      ]

      await onUpdateLead(lead.id, {
        siteAudit: audit,
        opportunities: mergedOpportunities,
        aiRecommendations,
      })
      toast.success(ru.leads.auditComplete)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : ru.toast.error)
    } finally {
      setIsAuditing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">{lead.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <LeadStatusBadge status={lead.status} />
            <span className="text-sm text-muted-foreground">{getNicheLabel(lead.niche)}</span>
          </div>
        </div>
        {showFullPageLink && (
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/leads/${lead.id}`} title={ru.leads.openFull}>
              <Maximize2 className="h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex-wrap h-auto">
          <TabsTrigger value="overview" className="flex-1 min-w-[4.5rem]">
            {ru.leads.tabOverview}
          </TabsTrigger>
          <TabsTrigger value="message" className="flex-1 min-w-[4.5rem]">
            {ru.leads.tabMessage}
          </TabsTrigger>
          <TabsTrigger value="proposal" className="flex-1 min-w-[3rem]">
            {ru.leads.tabProposal}
          </TabsTrigger>
          <TabsTrigger value="review" className="flex-1 min-w-[3rem]">
            {ru.leads.tabReview}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 min-w-[4rem]">
            {ru.leads.tabHistory}
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex-1 min-w-[4rem]">
            {ru.leads.tabComments}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">{ru.common.status}</p>
            <Select
              value={lead.status}
              onValueChange={(status) =>
                onStatusChange(lead.id, status as LeadStatus)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {getStatusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <LeadPotentialPanel lead={lead} />

          <LeadNextActionPanel lead={lead} />

          <div className="grid gap-3 text-sm">
            {lead.city && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{ru.common.city}</span>
                <span>{lead.city}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{ru.common.source}</span>
              <span>{getSourceLabel(lead.source)}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">{ru.leads.formContactsSection}</p>
            <LeadSourceLink lead={lead} />
            <div className="space-y-2 text-sm">
              {lead.website && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">{ru.common.website}</span>
                  <a
                    href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-primary hover:underline"
                  >
                    {lead.website.replace(/^https?:\/\//, '')}
                  </a>
                </div>
              )}
              {lead.contacts.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{lead.contacts.email}</span>
                </div>
              )}
              {lead.contacts.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{lead.contacts.phone}</span>
                </div>
              )}
              {lead.contacts.telegram && (
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a
                    href={lead.contacts.telegram.startsWith('http') ? lead.contacts.telegram : `https://t.me/${lead.contacts.telegram.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-primary hover:underline"
                  >
                    {lead.contacts.telegram}
                  </a>
                </div>
              )}
              {lead.contacts.vk && (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <a
                    href={lead.contacts.vk.startsWith('http') ? lead.contacts.vk : `https://vk.com/${lead.contacts.vk}`}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all text-primary hover:underline"
                  >
                    {lead.contacts.vk}
                  </a>
                </div>
              )}
              {!lead.sourceUrl &&
                !lead.website &&
                !lead.contacts.email &&
                !lead.contacts.phone &&
                !lead.contacts.telegram &&
                !lead.contacts.vk && (
                  <p className="text-muted-foreground">Контакты не указаны</p>
                )}
            </div>
          </div>

          {(lead.opportunities?.length ?? 0) > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-sm font-medium">{ru.leads.improvementsTitle}</p>
                <ImprovementBadges opportunities={lead.opportunities} />
                {recommendations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{ru.leads.recommendationsTitle}</p>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {recommendations.map((rec) => (
                        <li key={rec} className="flex gap-2">
                          <span className="text-primary">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}

          {lead.siteAudit && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{ru.leads.auditTitle}</p>
                  <Badge variant="secondary">Score: {lead.siteAudit.score}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{lead.siteAudit.summary}</p>
                {lead.aiRecommendations && (
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                    {lead.aiRecommendations}
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAuditSite}
              disabled={isAuditing || !lead.website}
              className="gap-2"
            >
              {isAuditing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ScanSearch className="h-4 w-4" />
              )}
              {ru.leads.auditSite}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="message" className="space-y-4">
          <LeadMessagePanel
            lead={lead}
            message={message}
            isGenerating={isGenerating}
            restoringVariantId={restoringVariantId}
            canUseAI={hasOpenAIKey(apiKey)}
            onCopy={() => void handleCopyMessage()}
            onGenerate={() => void handleGenerateAI()}
            onRegenerate={() => void handleRegenerateAI()}
            onRestore={(variantId) => void handleRestoreVariant(variantId)}
          />
        </TabsContent>

        <TabsContent value="proposal" className="space-y-4">
          <p className="text-sm text-muted-foreground">{ru.leads.proposalHint}</p>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {proposalTemplate}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCopyText(proposalTemplate)}
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            {ru.common.copy}
          </Button>
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <p className="text-sm text-muted-foreground">{ru.leads.reviewHint}</p>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {reviewTemplate}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopyText(reviewTemplate)}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              {ru.common.copy}
            </Button>
            <LeadOutreachActions lead={lead} message={reviewTemplate} />
          </div>
        </TabsContent>

        <TabsContent value="history">
          <LeadActivityFeed activities={lead.activityLog} />
        </TabsContent>

        <TabsContent value="comments">
          <LeadComments
            comments={lead.comments ?? []}
            onAddComment={(text) => onAddComment(lead.id, text)}
          />
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="grid gap-2 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>{ru.common.createdAt}</span>
          <span>{formatDateTime(lead.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>{ru.common.updatedAt}</span>
          <span>{formatDateTime(lead.updatedAt)}</span>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1 gap-2" onClick={() => onEdit(lead.id)}>
          <Pencil className="h-4 w-4" />
          {ru.common.edit}
        </Button>
        <Button variant="destructive" className="gap-2" onClick={() => onDelete(lead.id)}>
          <Trash2 className="h-4 w-4" />
          {ru.common.delete}
        </Button>
      </div>
    </div>
  )
}
