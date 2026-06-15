import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyTheme,
  readStoredThemeMode,
  resolveTheme,
  THEME_MODE_EMOJI,
  writeStoredThemeMode,
} from './theme'

function createStorageMock() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
}

function createDocumentMock() {
  const classes = new Set<string>()
  const style = { colorScheme: '' }

  return {
    documentElement: {
      classList: {
        toggle: (className: string, force?: boolean) => {
          if (force === undefined) {
            if (classes.has(className)) classes.delete(className)
            else classes.add(className)
            return
          }
          if (force) classes.add(className)
          else classes.delete(className)
        },
        contains: (className: string) => classes.has(className),
        add: (className: string) => {
          classes.add(className)
        },
        remove: (className: string) => {
          classes.delete(className)
        },
      },
      style,
    },
  }
}

function mockMatchMedia(isDark: boolean) {
  vi.stubGlobal('window', {
    matchMedia: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? isDark : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  })
}

describe('theme storage', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
    vi.stubGlobal('window', {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to system when nothing stored', () => {
    expect(readStoredThemeMode()).toBe('system')
  })

  it('persists selected mode', () => {
    writeStoredThemeMode('dark')
    expect(readStoredThemeMode()).toBe('dark')
  })
})

describe('resolveTheme', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('resolves system from prefers-color-scheme', () => {
    mockMatchMedia(true)
    expect(resolveTheme('system')).toBe('dark')

    mockMatchMedia(false)
    expect(resolveTheme('system')).toBe('light')
  })

  it('keeps explicit light and dark modes', () => {
    mockMatchMedia(true)
    expect(resolveTheme('light')).toBe('light')
    expect(resolveTheme('dark')).toBe('dark')
  })
})

describe('applyTheme', () => {
  beforeEach(() => {
    vi.stubGlobal('document', createDocumentMock())
    mockMatchMedia(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('adds dark class on html element', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('removes dark class for light mode', () => {
    document.documentElement.classList.add('dark')
    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(document.documentElement.style.colorScheme).toBe('light')
  })
})

describe('THEME_MODE_EMOJI', () => {
  it('maps each mode to an emoji', () => {
    expect(THEME_MODE_EMOJI.light).toBe('☀️')
    expect(THEME_MODE_EMOJI.dark).toBe('🌙')
    expect(THEME_MODE_EMOJI.system).toBe('💻')
  })
})
