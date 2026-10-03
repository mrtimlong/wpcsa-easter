import type { MessageKey } from './en.ts'

// Traditional Chinese. Placeholders until community translators supply text;
// any missing key falls back to English.
export const zhHant: Partial<Record<MessageKey, string>> = {
  'app.title': '南非華僑體育協會復活節運動會',
  'nav.home': '首頁',
  // Placeholders: to be checked by translators.
  'nav.schedule': '賽程',
  'nav.results': '賽果',
  'nav.standings': '積分榜',
  'nav.visit': '旅遊資訊',
  'filter.all': '全部',
  'sport.basketball': '籃球',
  'sport.volleyball': '排球',
  'sport.badminton': '羽毛球',
  'sport.padel': '板式網球',
  'status.live': '進行中',
  'status.final': '完場',
  'fixture.game': '第{n}場',
  'fixture.group': '{group}組',
  'schedule.title': '賽程',
  'results.title': '賽果',
  'standings.title': '積分榜',
  'standings.team': '隊伍',
  'visit.title': '{city}旅遊資訊',
  'home.dates': '復活節週末 · 2027年3月26日至29日',
  'lang.toggle': 'English',
  // Taken from the SACSA logo itself.
  'logo.sacsa': '南非華僑體育協會',
}
