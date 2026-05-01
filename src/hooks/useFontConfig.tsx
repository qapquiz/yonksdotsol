import { createContext, useContext, type ReactNode } from 'react'
import { getPixelFontFamily } from '../config/fonts'
import { useSettingsStore } from '../stores/settingsStore'

const PixelFontContext = createContext('GeistPixel-Square')

export function PixelFontProvider({ children }: { children: ReactNode }) {
  const pixelFontId = useSettingsStore((s) => s.pixelFont)
  const fontFamily = getPixelFontFamily(pixelFontId)

  return <PixelFontContext.Provider value={fontFamily}>{children}</PixelFontContext.Provider>
}

/** Returns the current pixel font family. Use as `style={{ fontFamily: usePixelFont() }}`. */
export function usePixelFont(): string {
  return useContext(PixelFontContext)
}
