import { sports } from '../components/sport-filter.tsx'
import { SportIcon } from '../components/sport-icon.tsx'
import type { Sport } from '../data/schema.ts'
import { useScrollToHash } from '../hooks/scroll-to-hash.ts'
import { useI18n } from '../i18n/index.tsx'
import { type Rule, type RuleSection, type RuleSet, type RuleText, ruleSets } from '../rules/index.ts'

/** Rule sets for the sports being played this year, grouped by sport. */
function rulesBySport(): { sport: Sport; sets: RuleSet[] }[] {
  return sports
    .map((sport) => ({ sport, sets: ruleSets.filter((set) => set.sport === sport) }))
    .filter((group) => group.sets.length > 0)
}

function useText() {
  const { l } = useI18n()
  return (text: RuleText) => (typeof text === 'string' ? text : l(text))
}

/** Rules of play for each sport (site content from src/rules/, not tournament data). */
export function Rules() {
  useScrollToHash()
  const { t } = useI18n()
  const groups = rulesBySport()
  const sets = groups.flatMap((group) => group.sets)
  const text = useText()

  return (
    <article class="rules">
      <h1>{t('rules.title')}</h1>
      {sets.length > 1 && (
        <nav aria-label={t('info.contents')}>
          <ul class="chips chips-wrap info-contents">
            {sets.map((set) => (
              <li key={set.id}>
                <a class="chip" href={`#${set.id}`}>
                  {text(set.title)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {groups.length === 0 && <p class="muted">{t('rules.none')}</p>}
      {groups.map(({ sport, sets }) =>
        sets.map((set) => (
          <section key={set.id} id={set.id} class={`rule-set sport-${sport}`}>
            <h2>
              <SportIcon sport={sport} /> {text(set.title)}
            </h2>
            {set.intro && <p>{text(set.intro)}</p>}
            {set.sections.map((section, i) => (
              <Section key={i} section={section} />
            ))}
          </section>
        )),
      )}
    </article>
  )
}

function Section({ section }: { section: RuleSection }) {
  const text = useText()
  const List = section.numbered ? 'ol' : 'ul'
  return (
    <>
      {section.heading && <h3>{text(section.heading)}</h3>}
      <List>
        {section.rules.map((rule, i) => (
          <RuleItem key={i} rule={rule} />
        ))}
      </List>
    </>
  )
}

function RuleItem({ rule }: { rule: Rule }) {
  const text = useText()
  if (typeof rule === 'string' || !('items' in rule)) return <li>{text(rule)}</li>
  return (
    <li>
      {text(rule.text)}
      <ul>
        {rule.items.map((item, i) => (
          <li key={i}>{text(item)}</li>
        ))}
      </ul>
    </li>
  )
}
