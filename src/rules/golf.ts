import type { RuleSet } from './types.ts'

// The local rules reminders from the golf page of the 2026 tournament brochure. The competition
// format, divisions and prizes are left out: they change from year to year.

export const golf: RuleSet = {
  id: 'golf',
  sport: 'golf',
  title: 'Golf',
  sections: [
    {
      numbered: true,
      rules: [
        'Drop from knee height (not shoulder height).',
        'Measure the relief area with the longest club in your bag (except your putter).',
        'Drop in, and play from, the relief area.',
        'When dropping back on the line, your ball may not be played from nearer the hole than your chosen reference point.',
        'Time to search: 3 minutes (not 5).',
        'If you accidentally move your ball while searching for it, replace it without penalty.',
        'No penalty for a double hit: it counts as one stroke.',
        'No penalty if your ball accidentally hits you or your equipment after a stroke.',
        'No penalty if your ball hits the flagstick when you’ve chosen to leave it in the hole.',
        'Spike marks and other shoe damage on the putting green can be repaired.',
        'Ball accidentally moved on the putting green: no penalty, replace it.',
        'If your ball has been marked, lifted and replaced on the putting green and the wind moves it, replace it on the original spot.',
        'Penalty areas replace water hazards. In a penalty area you may move loose impediments, ground your club and take practice swings without penalty, just as on the fairway or in the rough.',
        'You can’t take relief from a penalty area unless you’re at least 95% certain your ball is in it.',
        'In a bunker you may move loose impediments.',
        'In a bunker you may not touch the sand with your club right in front of or right behind your ball, during your backswing, or when taking practice swings.',
        'Free relief is allowed if your ball is embedded on the fairway or in the rough (“embedded” means part of the ball is below ground level).',
        'Unplayable ball in a bunker: you have the extra option of dropping outside the bunker for 2 penalty strokes.',
        'Your caddie or partner may not stand behind you once you begin taking your stance.',
        'Pace of play: take no more than 40 seconds for a stroke, and usually less. Ready golf in stroke play is encouraged.',
      ],
    },
  ],
}
