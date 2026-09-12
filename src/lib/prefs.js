/* Thème clair/sombre et langue FR/EN — hooks purs (aucun JSX).
   - thème : classe .dark sur <html>, persistée dans localStorage (tg_theme)
   - langue : persistée dans localStorage (tg_lang), textes via i18n.js */

import { useEffect, useState } from 'react'
import { setLang as setI18nLang } from './i18n'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light'
    const saved = localStorage.getItem('tg_theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    localStorage.setItem('tg_theme', theme)
  }, [theme])

  return { theme, toggleTheme: () => setTheme(x => (x === 'dark' ? 'light' : 'dark')) }
}

export function useLang() {
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'fr'
    return localStorage.getItem('tg_lang') === 'en' ? 'en' : 'fr'
  })

  useEffect(() => {
    setI18nLang(lang)
    document.documentElement.lang = lang
    localStorage.setItem('tg_lang', lang)
  }, [lang])

  return { lang, setLang }
}
