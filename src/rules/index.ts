import { basketball, miniBasketball } from './basketball.ts'
import { golf } from './golf.ts'
import type { RuleSet } from './types.ts'
import { volleyball } from './volleyball.ts'

export type { Rule, RuleSection, RuleSet, RuleText } from './types.ts'

/** Every set of rules, in display order. Badminton and padel have none yet. */
export const ruleSets: RuleSet[] = [basketball, miniBasketball, volleyball, golf]
