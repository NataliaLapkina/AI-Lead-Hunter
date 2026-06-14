import type { AppSettings, Lead } from '@/domain/lead'
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
    contacts: {
      emails: lead.contacts?.emails ?? [],
      phones: lead.contacts?.phones ?? [],
      telegram: lead.contacts?.telegram,
    },
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

  if (current < SCHEMA_VERSION) {
    setSchemaVersion(SCHEMA_VERSION)
  }
}

/** Для первого запуска без сохранённых настроек */
export function getInitialNichePresets() {
  return buildInitialNichePresets()
}
