import { describe, it, expect } from 'vitest'
import { themeTokens } from '../../config/theme'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const cssPath = resolve(__dirname, '../../../src/global.css')
const cssContent = readFileSync(cssPath, 'utf-8')

/** Extract --color-app-XXX: #YYYYYY from a variant block */
function extractCssColors(variant: 'dark' | 'light'): Record<string, string> {
  const colors: Record<string, string> = {}
  const variantRegex = new RegExp(`@variant ${variant}\\s*{([^}]+)}`, 's')
  const match = cssContent.match(variantRegex)
  if (!match) return colors

  const block = match[1]
  const lineRegex = /--color-app-(\w[\w-]*):\s*(#[0-9a-fA-F]{3,8})/g
  let lineMatch
  while ((lineMatch = lineRegex.exec(block)) !== null) {
    const key = lineMatch[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    colors[key] = lineMatch[2]
  }
  return colors
}

describe('theme tokens', () => {
  it('has dark and light modes', () => {
    expect(Object.keys(themeTokens)).toEqual(['dark', 'light'])
  })

  it('both modes define all token keys', () => {
    const darkKeys = Object.keys(themeTokens.dark)
    const lightKeys = Object.keys(themeTokens.light)
    expect(darkKeys).toEqual(lightKeys)
  })

  it('dark theme CSS colors match themeTokens', () => {
    const cssColors = extractCssColors('dark')
    // Check key colors that exist in both CSS and tokens
    expect(cssColors['bg']).toBe(themeTokens.dark.bg)
    expect(cssColors['primary'].toLowerCase()).toBe(themeTokens.dark.primary.toLowerCase())
    expect(cssColors['surface']).toBe(themeTokens.dark.surface)
    expect(cssColors['text']).toBe(themeTokens.dark.text)
    expect(cssColors['border']).toBe(themeTokens.dark.border)
  })

  it('light theme CSS colors match themeTokens', () => {
    const cssColors = extractCssColors('light')
    expect(cssColors['bg']).toBe(themeTokens.light.bg)
    expect(cssColors['primary'].toLowerCase()).toBe(themeTokens.light.primary.toLowerCase())
    expect(cssColors['surface']).toBe(themeTokens.light.surface)
    expect(cssColors['text']).toBe(themeTokens.light.text)
    expect(cssColors['border']).toBe(themeTokens.light.border)
  })
})
