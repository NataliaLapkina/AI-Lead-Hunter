import type { AppProfile, AppSettings, Lead } from '@/domain/lead'
import { SCHEMA_VERSION, STORAGE_KEYS } from './constants'
import { resolveLeadSource } from './leadSources'
import { normalizeNicheName } from './nicheDisplay'
import { createDefaultAppProfile, normalizeAppProfile } from './senderProfile'
import {
  buildInitialNichePresets,
  createDefaultNichePresets,
  createUserNichePresets,
  normalizeNichePresets,
} from './nichePresets'
import { migrateLegacyContacts } from './leadContacts'
import { fixLegacyLeadName, isSourcePlatformUrl, splitWebsiteAndSourceUrl } from './leadLinks'
import { scrubTechnicalLeadNamesFromMessage } from '@/features/leads/outreachMessage'
import { getStorageItem, setStorageItem, getSchemaVersion, setSchemaVersion } from './storage'

function migrateSettingsPresetsV2(): void {
  const settings = getStorageItem<AppSettings | null>(STORAGE_KEYS.SETTINGS, null)
  if (!settings) return

  const onlyDefaults = settings.nichePresets.every((p) => p.isDefault)
  if (!onlyDefaults) return

  setStorageItem(STORAGE_KEYS.SETTINGS, {
    ...settings,
    nichePresets: createDefaultNichePresets(),
  })
}

function migrateSettingsPresetsV3(): void {
  const settings = getStorageItem<AppSettings | null>(STORAGE_KEYS.SETTINGS, null)
  if (!settings) return

  const defaults = createDefaultNichePresets()
  const seedUser = createUserNichePresets()

  const customUser = settings.nichePresets.filter(
    (p) =>
      !p.isDefault &&
      !seedUser.some((s) => s.id === p.id) &&
      !defaults.some((d) => d.id === p.id),
  )

  const existingUser = settings.nichePresets.filter((p) => !p.isDefault)
  const mergedUser = [...seedUser]
  for (const preset of existingUser) {
    if (!mergedUser.some((m) => m.id === preset.id)) {
      mergedUser.push(preset)
    }
  }
  for (const preset of customUser) {
    if (!mergedUser.some((m) => m.id === preset.id)) {
      mergedUser.push(preset)
    }
  }

  setStorageItem(STORAGE_KEYS.SETTINGS, {
    ...settings,
    nichePresets: [...defaults, ...mergedUser],
  })
}

function migrateLeadsV4(): void {
  const leads = getStorageItem<Lead[]>(STORAGE_KEYS.LEADS, [])
  if (leads.length === 0) return

  const migrated = leads.map((lead) => ({
    ...lead,
    opportunities: lead.opportunities ?? [],
  }))

  setStorageItem(STORAGE_KEYS.LEADS, migrated)
}

function migrateLeadsV5(): void {
  const leads = getStorageItem<Lead[]>(STORAGE_KEYS.LEADS, [])
  if (leads.length === 0) return

  const migrated = leads.map((lead) => ({
    ...lead,
    opportunities: lead.opportunities ?? [],
    comments: lead.comments ?? [],
  }))

  setStorageItem(STORAGE_KEYS.LEADS, migrated)
}

function migrateLeadsV6(): void {
  const leads = getStorageItem<Lead[]>(STORAGE_KEYS.LEADS, [])
  if (leads.length === 0) return

  const migrated = leads.map((lead) => ({
    ...lead,
    source: resolveLeadSource(lead.source),
    contacts: migrateLegacyContacts(lead.contacts),
  }))

  setStorageItem(STORAGE_KEYS.LEADS, migrated)
}

function migrateLeadsV7(): void {
  const leads = getStorageItem<Lead[]>(STORAGE_KEYS.LEADS, [])
  if (leads.length === 0) return

  const migrated = leads.map((lead) => ({
    ...lead,
    niche: normalizeNicheName(lead.niche),
  }))

  setStorageItem(STORAGE_KEYS.LEADS, migrated)
}

function migrateSettingsNichesV7(): void {
  const settings = getStorageItem<AppSettings | null>(STORAGE_KEYS.SETTINGS, null)
  if (!settings) return

  setStorageItem(STORAGE_KEYS.SETTINGS, {
    ...settings,
    nichePresets: normalizeNichePresets(settings.nichePresets),
  })
}

function migrateSettingsProfileV9(): void {
  const settings = getStorageItem<AppSettings | null>(STORAGE_KEYS.SETTINGS, null)
  if (!settings) return

  setStorageItem(STORAGE_KEYS.SETTINGS, {
    ...settings,
    profile: normalizeAppProfile(settings.profile, createDefaultAppProfile()),
  })
}

function migrateLeadsContactsV10(): void {
  const leads = getStorageItem<Lead[]>(STORAGE_KEYS.LEADS, [])
  if (leads.length === 0) return

  const migrated = leads.map((lead) => ({
    ...lead,
    contacts: migrateLegacyContacts(lead.contacts),
  }))

  setStorageItem(STORAGE_KEYS.LEADS, migrated)
}

function migrateLeadsLinksV11(): void {
  const leads = getStorageItem<Lead[]>(STORAGE_KEYS.LEADS, [])
  if (leads.length === 0) return

  const migrated = leads.map((lead) => {
    const legacyWebsite = lead.website
    const existingSourceUrl = (lead as Lead & { sourceUrl?: string }).sourceUrl

    let sourceUrl = existingSourceUrl
    let website = legacyWebsite

    if (!sourceUrl && legacyWebsite && isSourcePlatformUrl(legacyWebsite)) {
      sourceUrl = legacyWebsite
      website = undefined
    }

    const split = splitWebsiteAndSourceUrl(website, sourceUrl)

    return {
      ...lead,
      website: split.website,
      sourceUrl: split.sourceUrl,
      contacts: migrateLegacyContacts(lead.contacts),
    }
  })

  setStorageItem(STORAGE_KEYS.LEADS, migrated)
}

function migrateLeadsNamesV12(): void {
  const leads = getStorageItem<Lead[]>(STORAGE_KEYS.LEADS, [])
  if (leads.length === 0) return

  const migrated = leads.map((lead) => {
    const contacts = migrateLegacyContacts(lead.contacts)
    const fixed = fixLegacyLeadName({ ...lead, contacts })

    return {
      ...lead,
      ...fixed,
      niche: normalizeNicheName(lead.niche),
      source: resolveLeadSource(fixed.source),
      contacts: migrateLegacyContacts(fixed.contacts),
    }
  })

  setStorageItem(STORAGE_KEYS.LEADS, migrated)
}

function migrateSettingsProfileV13(): void {
  const settings = getStorageItem<AppSettings | null>(STORAGE_KEYS.SETTINGS, null)
  if (!settings) return

  const raw = settings.profile as Partial<AppProfile>
  let name = raw.name?.trim() ?? ''
  let lastName = raw.lastName?.trim() ?? ''

  if (!lastName && name.includes(' ')) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      name = parts[0]
      lastName = parts.slice(1).join(' ')
    }
  }

  setStorageItem(STORAGE_KEYS.SETTINGS, {
    ...settings,
    profile: normalizeAppProfile(
      {
        ...raw,
        name,
        lastName,
        portfolio: raw.portfolio ?? '',
      },
      createDefaultAppProfile(),
    ),
  })
}

function migrateLeadsLegacyNamesV14(): void {
  const leads = getStorageItem<Lead[]>(STORAGE_KEYS.LEADS, [])
  if (leads.length === 0) return

  const migrated = leads.map((lead) => {
    const contacts = migrateLegacyContacts(lead.contacts)
    const fixed = fixLegacyLeadName({ ...lead, contacts })
    const merged = {
      ...lead,
      ...fixed,
      niche: normalizeNicheName(lead.niche),
      source: resolveLeadSource(fixed.source),
      contacts: migrateLegacyContacts(fixed.contacts),
    }

    return {
      ...merged,
      generatedMessage: merged.generatedMessage
        ? scrubTechnicalLeadNamesFromMessage(merged.generatedMessage, merged)
        : merged.generatedMessage,
    }
  })

  setStorageItem(STORAGE_KEYS.LEADS, migrated)
}

function migrateSettingsContactsV14(): void {
  const settings = getStorageItem<AppSettings | null>(STORAGE_KEYS.SETTINGS, null)
  if (!settings) return

  setStorageItem(STORAGE_KEYS.SETTINGS, {
    ...settings,
    profile: normalizeAppProfile(settings.profile, createDefaultAppProfile()),
  })
}

export function runMigrations(): void {
  const current = getSchemaVersion()

  if (current < 2) {
    migrateSettingsPresetsV2()
  }

  if (current < 3) {
    migrateSettingsPresetsV3()
  }

  if (current < 4) {
    migrateLeadsV4()
  }

  if (current < 5) {
    migrateLeadsV5()
  }

  if (current < 6) {
    migrateLeadsV6()
  }

  if (current < 7) {
    migrateLeadsV7()
    migrateSettingsNichesV7()
  }

  if (current < 9) {
    migrateSettingsProfileV9()
  }

  if (current < 10) {
    migrateLeadsContactsV10()
  }

  if (current < 11) {
    migrateLeadsLinksV11()
  }

  if (current < 12) {
    migrateLeadsNamesV12()
  }

  if (current < 13) {
    migrateSettingsProfileV13()
  }

  if (current < 14) {
    migrateLeadsLegacyNamesV14()
    migrateSettingsContactsV14()
  }

  if (current < SCHEMA_VERSION) {
    setSchemaVersion(SCHEMA_VERSION)
  }
}

/** Для первого запуска без сохранённых настроек */
export function getInitialNichePresets() {
  return buildInitialNichePresets()
}
