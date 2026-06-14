import { z } from 'zod'
import { LEAD_SOURCES, LEAD_STATUSES, IMPROVEMENT_OPPORTUNITIES } from '@/lib/constants'

export const leadContactsSchema = z.object({
  emails: z.array(z.string().email('Некорректный email')).default([]),
  phones: z.array(z.string().min(1)).default([]),
  telegram: z.string().optional(),
})

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Укажите название компании или имя'),
  niche: z.string().min(1, 'Укажите нишу'),
  city: z.string().default(''),
  source: z.enum(LEAD_SOURCES),
  website: z.string().url('Некорректный URL сайта').optional().or(z.literal('')),
  contacts: leadContactsSchema,
  notes: z.string().default(''),
  tags: z.array(z.string()).default([]),
  opportunities: z.array(z.enum(IMPROVEMENT_OPPORTUNITIES)).default([]),
  status: z.enum(LEAD_STATUSES).optional(),
})

export const updateLeadSchema = createLeadSchema.partial().extend({
  status: z.enum(LEAD_STATUSES).optional(),
})

export type CreateLeadFormData = z.infer<typeof createLeadSchema>
export type UpdateLeadFormData = z.infer<typeof updateLeadSchema>

export const profileSchema = z.object({
  name: z.string().min(1, 'Укажите имя'),
  businessType: z.string().default(''),
})

export const searchFormSchema = z.object({
  niche: z.string().min(1, 'Укажите нишу'),
  city: z.string().default(''),
  source: z.enum(LEAD_SOURCES).optional(),
})

export type SearchFormData = z.infer<typeof searchFormSchema>
