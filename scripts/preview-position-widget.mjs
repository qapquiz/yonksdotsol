// Render the production widget JSX to an HTML layout for visual checks and picker art.
// Run: bun scripts/preview-position-widget.mjs
// This is a layout preview; native RemoteViews still require device testing.
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { mock } from 'bun:test'

const root = resolve(import.meta.dir, '..')
mock.module('react-native-android-widget', () => ({
  FlexWidget: 'FlexWidget',
  TextWidget: 'TextWidget',
  SvgWidget: 'SvgWidget',
}))
mock.module(resolve(root, 'src/config/env.ts'), () => ({ env: { devMock: true } }))
const { default: PositionLiquidityWidget } = await import('../src/widgets/PositionLiquidityWidget.tsx')
const { toPositionWidgetData } = await import('../src/widgets/positionWidgetData.ts')
const { createMockPortfolioResult } = await import('../src/services/mockPortfolio.ts')
const { themeTokens } = await import('../src/config/theme.ts')
const positions = toPositionWidgetData(createMockPortfolioResult())
const position = positions.find((item) => item.tokenXSymbol === 'SOL') ?? positions[0]

const escape = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const unitless = new Set(['flex', 'fontWeight', 'opacity', 'lineHeight'])
function css(style) {
  const result = { ...style }
  for (const field of ['padding', 'margin']) {
    if (result[`${field}Horizontal`] != null) {
      result[`${field}Left`] = result[`${field}Right`] = result[`${field}Horizontal`]
      delete result[`${field}Horizontal`]
    }
    if (result[`${field}Vertical`] != null) {
      result[`${field}Top`] = result[`${field}Bottom`] = result[`${field}Vertical`]
      delete result[`${field}Vertical`]
    }
  }
  return Object.entries(result)
    .filter(([key]) => key !== 'adjustsFontSizeToFit')
    .map(([key, value]) => {
      const name = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
      const rendered =
        value === 'match_parent'
          ? '100%'
          : value === 'wrap_content'
            ? 'auto'
            : typeof value === 'number' && !unitless.has(key)
              ? `${value}px`
              : value
      return `${name}:${rendered}`
    })
    .join(';')
}
function html(node) {
  if (node == null || typeof node === 'boolean') return ''
  if (Array.isArray(node)) return node.map(html).join('')
  if (typeof node !== 'object') return escape(node)
  if (typeof node.type === 'function') return html(node.type(node.props))
  const { style = {}, children, text, svg, clickAction, maxLines } = node.props
  const styleString = css(style)
  if (node.type === 'SvgWidget') return `<div class="svg" style="${styleString}">${svg}</div>`
  if (node.type === 'TextWidget')
    return `<div class="text" style="${styleString};${maxLines === 1 ? 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis' : ''}">${escape(text)}</div>`
  return `<div class="flex" ${clickAction ? `data-action="${escape(clickAction)}"` : ''} style="${styleString}">${html(children)}</div>`
}
function widget(width, height, overrides = {}) {
  return html(
    PositionLiquidityWidget({
      position,
      width,
      height,
      count: positions.length,
      index: 0,
      updatedAt: new Date('2026-09-08T10:24:00Z').getTime(),
      ...overrides,
    }),
  )
}
const styles = `*{box-sizing:border-box}body{margin:0;background:transparent;font-family:Arial,sans-serif}.flex{display:flex;flex-direction:column;flex-shrink:0;min-width:0}.text{font-size:12px;line-height:1.2;flex-shrink:0}.svg{flex-shrink:0}.svg svg{display:block}.flex[style*="flex:1"]{flex:1 1 0%;min-height:0}`
const cases = [
  ['Minimum size', 320, 320, {}],
  ['Larger size', 380, 420, {}],
  [
    'Out of range',
    320,
    340,
    {
      position: {
        ...position,
        inRange: false,
        liquidityShape: { ...position.liquidityShape, currentActiveId: position.liquidityShape.binRange.maxBinId + 8 },
      },
    },
  ],
  ['Refresh failed', 320, 340, { message: 'Could not update. Tap Refresh to retry.' }],
  [
    'Disconnected',
    320,
    320,
    { position: null, count: 0, updatedAt: null, message: 'Connect wallet in Yonks to see your positions' },
  ],
]
await mkdir(resolve(root, '.expo'), { recursive: true })
await writeFile(
  resolve(root, '.expo/position-widget-preview.html'),
  `<!doctype html><html><head><meta charset="utf-8"><style>${styles}body{background:${themeTokens.dark.bg}}</style></head><body><main id="widget" style="width:320px;height:340px">${widget(320, 340)}</main></body></html>`,
)
await writeFile(
  resolve(root, '.expo/position-widget-audit.html'),
  `<!doctype html><html><head><meta charset="utf-8"><style>${styles}body{background:${themeTokens.dark.surfaceHighlight};padding:24px;display:flex;flex-wrap:wrap;gap:24px;color:${themeTokens.dark.text}}h2{font-size:14px;font-weight:400;margin:0 0 10px}</style></head><body>${cases.map(([title, width, height, overrides]) => `<section><h2>${title}</h2><div class="sample" style="width:${width}px;height:${height}px">${widget(width, height, overrides)}</div></section>`).join('')}</body></html>`,
)
console.log('Wrote .expo/position-widget-preview.html and .expo/position-widget-audit.html')
