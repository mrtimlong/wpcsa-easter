// English is the source language: every UI string must have an entry here.
export const en = {
  'app.title': 'SACSA Easter Tournament',
  'app.edition': '{year} · {city}',
  'nav.home': 'Home',
  'nav.visit': 'Visiting',
  'visit.title': 'Visiting {city}',
  'visit.draft': 'Draft: this page has example content and will be updated before the tournament.',
  'visit.map': 'Map',
  'visit.website': 'Website',
  'photo.credit': 'Photo: {credit}, {license}',
  'lang.toggle': '中文',
  'logo.sacsa': 'Southern Africa Chinese Sports Association',
  'logo.wpcsa': 'WP Chinese Sports Association',
  'home.comingSoon': 'Fixtures, results and tournament info will appear here.',
  'notFound.title': 'Page not found',
  'notFound.back': 'Back to home',
}

export type MessageKey = keyof typeof en
