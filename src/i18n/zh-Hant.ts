import type { MessageKey } from './en.ts'

// Traditional Chinese. Placeholders until community translators supply text;
// any missing key falls back to English.
export const zhHant: Partial<Record<MessageKey, string>> = {
  'app.title': '南非華僑體育協會復活節運動會',
  'nav.home': '首頁',
  // Placeholders: to be checked by translators.
  'nav.visit': '旅遊資訊',
  'visit.title': '{city}旅遊資訊',
  'home.dates': '復活節週末 · 2027年3月26日至29日',
  'lang.toggle': 'English',
  // Taken from the SACSA logo itself.
  'logo.sacsa': '南非華僑體育協會',
}
