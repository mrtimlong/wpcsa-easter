import { content } from '../data/content.ts'
import type { Sport } from '../data/schema.ts'
import { useI18n } from '../i18n/index.tsx'

export type SportChoice = Sport | 'all'

/** Sports that actually have competitions this year, in a stable order. */
export const sports: Sport[] = (['basketball', 'volleyball', 'badminton', 'padel'] as const).filter((s) =>
  content.competitions.some((c) => c.sport === s),
)

export function SportFilter({
  value,
  onChange,
  includeAll = true,
}: {
  value: SportChoice
  onChange: (value: SportChoice) => void
  includeAll?: boolean
}) {
  const { t } = useI18n()
  const options: SportChoice[] = includeAll ? ['all', ...sports] : sports
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
          {option === 'all' ? t('filter.all') : t(`sport.${option}`)}
        </button>
      ))}
    </div>
  )
}

export function DemoNotice() {
  const { t } = useI18n()
  return <p class="notice">{t('demo.notice')}</p>
}
