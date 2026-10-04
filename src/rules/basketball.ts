import type { RuleSet } from './types.ts'

// From the SACSA basketball rules in the 2026 tournament brochure.

export const basketball: RuleSet = {
  id: 'basketball',
  sport: 'basketball',
  title: 'Basketball',
  sections: [
    { heading: 'Periods', rules: ['4 periods of 10 minutes.'] },
    {
      heading: 'Clock',
      rules: [
        {
          text: 'Ladies, junior ladies and junior men:',
          items: [
            'Running time, except for the last 2 minutes of the last quarter and any extra periods, which are stop-start.',
            'The clock runs during free-throw shooting and fouls.',
            'The clock stops during time-outs.',
          ],
        },
        {
          text: 'Men:',
          items: [
            'Running time for all 4 quarters.',
            'The clock runs during free-throw shooting and fouls.',
            'The clock stops during time-outs.',
          ],
        },
      ],
    },
    {
      heading: 'Intervals',
      rules: [
        'Two minutes between the 1st and 2nd, and the 3rd and 4th quarters.',
        'Five minutes between halves.',
        'Two minutes before extra periods.',
      ],
    },
    {
      heading: 'Overtime',
      rules: [
        'Round robin: if the scores are tied at full time, one 5-minute overtime period is played, stop-start. The men’s division plays running time throughout.',
        'If the scores are still tied after the first overtime period, sudden death applies in the next period: the first team to score wins.',
        'One time-out per overtime period. Time-outs don’t carry over into overtime.',
        'Playoffs and finals: as many overtime periods as needed to break the tie.',
      ],
    },
    {
      heading: 'Shot clock',
      rules: ['A 24-second shot clock is used for all men’s and ladies’ games, playoffs and finals.'],
    },
    {
      heading: 'Finals',
      rules: [
        'The ladies’ and men’s finals are played with a stop-start clock.',
        'Minis, junior men, junior ladies and other playoffs use the same timing as the round robin.',
        'The ladies’ and men’s finals have 3 referees. All other finals and playoffs have 2.',
      ],
    },
    {
      heading: '8-second rule (backcourt violation)',
      rules: [
        'After a made basket, the inbounding team must advance the ball beyond the half-court line within 8 seconds. Failure results in a turnover to the opposing team.',
      ],
    },
    {
      heading: '3-second rule (lane violation)',
      rules: [
        'An offensive player may not stay in the free-throw lane for more than 3 consecutive seconds while their team controls the ball. A violation results in a turnover.',
      ],
    },
    {
      heading: 'Time-outs',
      rules: [
        '2 time-outs in the first half.',
        '3 time-outs in the second half, with no more than 2 of them in the last 2 minutes.',
        '1 time-out in each extra period.',
        'Unused time-outs can’t be carried over to the next half or extra period.',
        'Only the coach or assistant coach can request a time-out.',
      ],
    },
    {
      heading: 'Uniforms',
      rules: [
        'The team listed first on the schedule wears light kit, and the team listed second wears dark kit.',
        'All players must have their shirts tucked in.',
      ],
    },
    {
      heading: 'Game start times',
      rules: [
        'Teams must be dressed and ready to play 20 minutes before the scheduled start.',
        'Team lists must be with the table official 20 minutes before the start. There are two scorebooks per court, which must be filled in during the warm-up to avoid delays.',
        'All games start on time. A team that hasn’t arrived 10 minutes after the start forfeits. If the team arrives within those 10 minutes, the game is played with the time left on the clock.',
      ],
    },
    {
      heading: 'Points and classification',
      rules: [
        '2 points for a win, 1 for a loss and 0 for a forfeit.',
        'If two or more teams have the same win–loss record in the group, the games between those teams decide their places.',
        {
          text: 'If they also have the same win–loss record in the games between them, these criteria apply in order:',
          items: [
            'Higher points difference in the games between them.',
            'More points scored in the games between them.',
            'Higher points difference in all games in the group.',
            'More points scored in all games in the group.',
          ],
        },
        'If these criteria still can’t separate the teams, places are decided by a draw.',
      ],
    },
  ],
}

export const miniBasketball: RuleSet = {
  id: 'mini-basketball',
  sport: 'basketball',
  title: 'Mini basketball',
  intro: 'These rules apply to the minis division. Anything not covered here follows the main basketball rules.',
  sections: [
    {
      numbered: true,
      rules: [
        'Players must be turning 13 or younger in the calendar year of the tournament to play in the minis division.',
        'Teams may be all boys, all girls or mixed.',
        '4 quarters of 10 minutes running time are played.',
        '2 minutes between quarters, 3 minutes between halves.',
        'Every player plays at least one quarter and no more than three.',
        'A team with 7 players may have 1 player play all four quarters; a team with 6 players may have 2.',
        'The three-point rules don’t apply.',
        'Each player is allowed 5 personal fouls, and each team 4 fouls per quarter before bonus free throws apply (as in the senior rules).',
        'No time-outs in the first three quarters. Each team has one time-out in the 4th quarter.',
        'Substitutions can only be made between quarters and during the time-out in the 4th quarter.',
        'Every substitution counts as a quarter played. Let the table officials know before you substitute.',
        'A player who comes on for an injured player during a quarter is charged with that quarter too.',
        'Overtime is 5 minutes running time, started by the 5 players who ended regular time. No time-outs or substitutions during overtime, except that a player who hasn’t played all four quarters may replace an injured player.',
        'Free throws are taken from the mark inside the key.',
      ],
    },
  ],
}
