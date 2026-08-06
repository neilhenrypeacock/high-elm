import { describe, it, expect } from 'vitest';
import { foundingStateFromCount } from '../lib/founding';
import { FOUNDING_PLACES_TOTAL } from '../lib/pricing';

// The counting QUERY is exercised against the real table by the integration
// path; what is tested here is the arithmetic that turns a count into a public
// claim and a price decision, because those are the two things that are
// expensive to get wrong.
describe('founding places — count to state', () => {
  it('reports every place available when nobody has joined', () => {
    const state = foundingStateFromCount(0);
    expect(state.taken).toBe(0);
    expect(state.left).toBe(FOUNDING_PLACES_TOTAL);
    expect(state.open).toBe(true);
    expect(state.line).toBe(`${FOUNDING_PLACES_TOTAL} of ${FOUNDING_PLACES_TOTAL} places left`);
  });

  it('counts down as places are claimed', () => {
    expect(foundingStateFromCount(1).left).toBe(FOUNDING_PLACES_TOTAL - 1);
    expect(foundingStateFromCount(7).left).toBe(FOUNDING_PLACES_TOTAL - 7);
  });

  it('closes founding exactly when the last place goes', () => {
    expect(foundingStateFromCount(FOUNDING_PLACES_TOTAL - 1).open).toBe(true);
    expect(foundingStateFromCount(FOUNDING_PLACES_TOTAL).open).toBe(false);
  });

  // Once founding closes, later members are on the standard price but still
  // have rows, so the raw count keeps climbing past the total.
  it('never shows a negative number of places left', () => {
    const state = foundingStateFromCount(FOUNDING_PLACES_TOTAL + 5);
    expect(state.left).toBe(0);
    expect(state.taken).toBe(FOUNDING_PLACES_TOTAL);
    expect(state.open).toBe(false);
    expect(state.line).toBe(`0 of ${FOUNDING_PLACES_TOTAL} places left`);
  });

  it('treats a nonsensical negative count as nobody having joined', () => {
    expect(foundingStateFromCount(-3).taken).toBe(0);
    expect(foundingStateFromCount(-3).left).toBe(FOUNDING_PLACES_TOTAL);
  });

  // The whole point of the change: the state is a pure function of the count,
  // so the public line and the checkout price can never disagree with each
  // other the way a hand-edited constant could disagree with reality.
  it('keeps the line, the seat count and the open flag consistent', () => {
    for (let taken = 0; taken <= FOUNDING_PLACES_TOTAL + 2; taken++) {
      const state = foundingStateFromCount(taken);
      expect(state.line).toBe(`${state.left} of ${FOUNDING_PLACES_TOTAL} places left`);
      expect(state.taken + state.left).toBe(FOUNDING_PLACES_TOTAL);
      expect(state.open).toBe(state.left > 0);
    }
  });
});
