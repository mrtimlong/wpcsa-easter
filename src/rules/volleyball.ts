import type { RuleSet } from './types.ts'

// From the volleyball page of the 2026 tournament brochure. Match formats (sets per stage) are left
// to the data, since they change from year to year.

export const volleyball: RuleSet = {
  id: 'volleyball',
  sport: 'volleyball',
  title: 'Volleyball',
  intro:
    'Indoor volleyball is played by two teams of six, separated by a net. Teams score by grounding the ball on the other side of the court, with no more than 3 touches per side. Positions are outside hitter, opposite, setter, middle blocker and libero. FIVB is the international governing body, and Volleyball South Africa (VSA) governs the sport in South Africa. Volleyball has been a SACSA sport since 1990.',
  sections: [
    {
      numbered: true,
      rules: [
        'Games follow the FIVB 2021–2024 rules.',
        'Each team must have 6 players on the court.',
        'Mixed teams must always have at least 2 women on the court.',
        'The net is at co-ed height: 2.33 m.',
      ],
    },
  ],
}
