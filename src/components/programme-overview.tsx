import { useState } from 'preact/hooks'
import { content } from '../data/content.ts'
import { dayKey, formatDay, formatTime } from '../data/format.ts'
import { currentTime } from '../data/live.ts'
import type { ProgrammeItem } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'
import { SportIcon } from './sport-icon.tsx'

const timeZone = content.tournament.timezone
const venueName = new Map(content.venues.map((v) => [v.id, v.name]))
const days = [...new Set(content.programme.map((p) => dayKey(p.start, timeZone)))].sort()

function timeRange(item: ProgrammeItem): string {
  const start = formatTime(item.start, timeZone)
  return item.end ? `${start}–${formatTime(item.end, timeZone)}` : start
}

/**
 * Home page block: the weekend at a glance, one line per programme item (game sessions, ceremonies,
 * socials), a day at a time. The Schedule page has the same items interleaved with every game.
 */
export function ProgrammeOverview() {
  const { t, l, locale } = useI18n()
  const time = currentTime()
  const today = dayKey(new Date(time).toISOString(), timeZone)
  const [day, setDay] = useState(days.includes(today) ? today : days[0])
  if (days.length === 0) return null

  const items = content.programme
    .filter((p) => dayKey(p.start, timeZone) === day)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start))
  const isNow = (p: ProgrammeItem) => p.end !== undefined && Date.parse(p.start) <= time && time < Date.parse(p.end)

  return (
    <section class="programme">
      <div class="section-heading">
        <h2>{t('programme.title')}</h2>
        <a href="/schedule">{t('myTeams.fullSchedule')}</a>
      </div>
      <div class="tabs" role="tablist">
        {days.map((d) => (
          <button key={d} type="button" role="tab" class="tab" aria-selected={d === day} onClick={() => setDay(d)}>
            {formatDay(d, locale, 'short')}
          </button>
        ))}
      </div>
      <ul class="programme-list">
        {items.map((item) => (
          <li key={item.id} class={isNow(item) ? 'is-now' : undefined}>
            <time dateTime={item.start}>{timeRange(item)}</time>
            <span>
              <strong>
                {item.sports?.map((sport) => (
                  <SportIcon key={sport} sport={sport} class={`sport-${sport}`} />
                ))}
                {l(item.title)}
                {isNow(item) && <span class="badge badge-live">{t('programme.now')}</span>}
              </strong>
              {item.venue && <span class="muted">{l(venueName.get(item.venue) ?? { en: item.venue })}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
