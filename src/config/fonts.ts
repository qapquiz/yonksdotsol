/**
 * Font configuration for the "pixel" role (numbers, values, SOL amounts).
 *
 * All other font roles (sans, sansBold, mono) stay fixed as Tailwind classes.
 * Only the pixel font is user-configurable at runtime.
 */

export interface PixelFontOption {
  id: string
  label: string
  fontFamily: string
}

export const PIXEL_FONT_OPTIONS: PixelFontOption[] = [
  {
    id: 'geist-pixel',
    label: 'Geist Pixel',
    fontFamily: 'GeistPixel-Square',
  },
  {
    id: 'departure-mono',
    label: 'Departure Mono',
    fontFamily: 'DepartureMono-Regular',
  },
]

export const DEFAULT_PIXEL_FONT = 'geist-pixel'

export function getPixelFontFamily(id: string): string {
  return PIXEL_FONT_OPTIONS.find((o) => o.id === id)?.fontFamily ?? PIXEL_FONT_OPTIONS[0].fontFamily
}
