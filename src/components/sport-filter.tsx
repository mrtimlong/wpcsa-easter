import { content } from '../data/content.ts'
import type { Sport } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'

export type SportChoice = Sport | 'all' | 'mine'

/** Sports that actually have competitions this year, in a stable order. */
export const sports: Sport[] = (['basketball', 'volleyball', 'badminton', 'padel'] as const).filter((s) =>
  content.competitions.some((c) => c.sport === s),
)

export function SportFilter({
  value,
  onChange,
  includeAll = true,
  includeMine = false,
}: {
  value: SportChoice
  onChange: (value: SportChoice) => void
  includeAll?: boolean
  /** Adds a "★ My teams" chip. */
  includeMine?: boolean
}) {
  const { t } = useI18n()
  const options: SportChoice[] = [
    ...(includeAll ? (['all'] as const) : []),
    ...(includeMine ? (['mine'] as const) : []),
    ...sports,
  ]
  return (
    <div class="chips" role="group" aria-label={t('filter.sport')}>
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
    </div>
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
  const { t } = useI18n()
  return <p class="notice">{t('demo.notice')}</p>
}
