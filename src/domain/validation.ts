import { z } from 'zod'
import { AUTO_SEARCH_SOURCES, LEAD_SOURCES, LEAD_STATUSES, IMPROVEMENT_OPPORTUNITIES } from '@/lib/constants'

export const leadContactsSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  telegram: z.string().optional(),
  vk: z.string().optional(),
})

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Укажите название компании или имя'),
  niche: z.string().min(1, 'Укажите нишу'),
  city: z.string().default(''),
  source: z.enum(LEAD_SOURCES),
  website: z.string().optional(),
  sourceUrl: z.string().optional(),
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
  lastName: z.string().default(''),
  businessType: z.string().default(''),
  specialization: z.string().default(''),
  phone: z.string().default(''),
  whatsapp: z.string().default(''),
  telegram: z.string().default(''),
  vk: z.string().default(''),
  email: z.string().default(''),
  website: z.string().default(''),
  portfolio: z.string().default(''),
})

export const searchFormSchema = z.object({
  niche: z.string().min(1, 'Укажите нишу'),
  city: z.string().default(''),
  source: z.enum(LEAD_SOURCES).optional(),
})

export type SearchFormData = z.infer<typeof searchFormSchema>

export const autoSearchFormSchema = z.object({
  niche: z.string().min(1, 'Укажите нишу'),
  city: z.string().default(''),
  source: z.enum(AUTO_SEARCH_SOURCES),
  count: z.coerce.number().int().min(1, 'Минимум 1').max(50, 'Максимум 50'),
  linksText: z.string().default(''),
})

export type AutoSearchFormData = z.infer<typeof autoSearchFormSchema>
