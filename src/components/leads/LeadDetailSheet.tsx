import { useState } from 'react'
import type { Lead, LeadStatus, UpdateLeadInput } from '@/domain/lead'
import { ru } from '@/i18n/ru'
import { LeadDetailView } from '@/components/leads/LeadDetailView'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface LeadDetailSheetProps {
  lead: Lead | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onStatusChange: (id: string, status: LeadStatus) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onUpdateLead: (id: string, data: UpdateLeadInput) => Promise<Lead>
  onAddComment: (id: string, text: string) => Promise<void>
}

export function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
  onStatusChange,
  onEdit,
  onDelete,
  onUpdateLead,
  onAddComment,
}: LeadDetailSheetProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)

  if (!lead) return null

  const handleDelete = () => {
    onDelete(lead.id)
    setDeleteOpen(false)
    onOpenChange(false)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
          <SheetHeader className="sr-only">
            <SheetTitle>{lead.name}</SheetTitle>
          </SheetHeader>
          <LeadDetailView
            lead={lead}
            onStatusChange={async (id, status) => onStatusChange(id, status)}
            onEdit={onEdit}
            onDelete={() => setDeleteOpen(true)}
            onUpdateLead={onUpdateLead}
            onAddComment={onAddComment}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ru.leads.deleteLead}</AlertDialogTitle>
            <AlertDialogDescription>{ru.leads.deleteConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ru.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{ru.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
