import type { Sport } from '../data/schema.ts'

/** English text, or English plus a Chinese translation once one is supplied. */
export type RuleText = string | { en: string; zh?: string }

/** A rule, optionally with sub-points (e.g. the tie-break criteria under classification). */
export type Rule = RuleText | { text: RuleText; items: RuleText[] }

export type RuleSection = {
  heading?: RuleText
  /** Shown as a numbered list, for rules people refer to by number. */
  numbered?: boolean
  rules: Rule[]
}

/**
 * Rules of play for one sport or division. These change rarely, so they live in the site rather than
 * the data. Tournament formats (pools, rounds, best-of) change every year and belong in the data.
 */
export type RuleSet = {
  id: string
  /** Shown only when this year's data has a competition in this sport. */
  sport: Sport | 'golf'
  title: RuleText
  intro?: RuleText
  sections: RuleSection[]
}
