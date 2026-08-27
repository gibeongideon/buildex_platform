/*
  How long a mock repository call pretends to take.

  Every method awaits one of these before returning. That is deliberate: it
  forces every screen to have a real loading state, so the eventual swap to a
  networked backend does not surface a class of missing UI.

  The three values were declared separately in five mock modules, which meant
  five places to change when tuning how the prototype feels — and five chances
  for one to drift and make a screen inexplicably slower than its neighbour.
  They belong together for the same reason they will be deleted together: at
  the backend cutover, real latency replaces all of this at once.

  FAST is a lookup by id, NORMAL a list or a write, SLOW an aggregate that a
  real backend would compute across several tables.
*/

export const FAST = 140;
export const NORMAL = 260;
export const SLOW = 420;
