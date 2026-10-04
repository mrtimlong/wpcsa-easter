import { content } from '../data/content.ts'
import { formatDateTime } from '../data/format.ts'
import { now } from '../data/live.ts'
import type { Sport } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'

export type SportChoice = Sport | 'all' | 'mine'

/** Sports that actually have competitions this year, in a stable order. */
export const sports: Sport[] = (['basketball', 'volleyball', 'badminton', 'padel', 'golf'] as const).filter((s) =>
  content.competitions.some((c) => c.sport === s),
)

/** Sports with head-to-head games (golf has none), for results and standings. */
export const fixtureSports: Sport[] = sports.filter((s) =>
  content.fixtures.some((f) => content.competitions.find((c) => c.id === f.competition)?.sport === s),
)

export function SportFilter({
  value,
  onChange,
  includeAll = true,
  includeMine = false,
  options: choices = sports,
}: {
  value: SportChoice
  onChange: (value: SportChoice) => void
  includeAll?: boolean
  /** Adds a "★ My teams" chip. */
  includeMine?: boolean
  /** The sports to offer; defaults to every sport played this year. */
  options?: Sport[]
}) {
  const { t } = useI18n()
  const options: SportChoice[] = [
    ...(includeAll ? (['all'] as const) : []),
    ...(includeMine ? (['mine'] as const) : []),
    ...choices,
  ]
  return (
    <fieldset class="chips" aria-label={t('filter.sport')}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          class="chip"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          {option === 'all' ? t('filter.all') : option === 'mine' ? t('myTeams.filter') : t(`sport.${option}`)}
        </button>
      ))}
    </fieldset>
  )
}

/** Shown when filtering by "My teams" but none are followed yet. */
export function NoTeamsYet() {
  const { t } = useI18n()
  return (
    <p class="notice notice-info">
      {t('myTeams.none')} <a href="/my-teams">{t('myTeams.choose')}</a>
    </p>
  )
}

export function DemoNotice() {
  const { t, locale } = useI18n()
  const time = formatDateTime(new Date(now).toISOString(), content.tournament.timezone, locale)
  return <p class="notice">{t('demo.notice', { time })}</p>
}
