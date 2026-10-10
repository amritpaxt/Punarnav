import { describe, expect, it } from 'vitest';
import { bonuses, canRedeem, collectorPoints, flatPoints, streak } from './domain';
describe('Punarnav rules',()=>{
  it('awards exact flat and uniform collector points',()=>{ expect(flatPoints('GREEN')).toBe(10); expect(flatPoints('YELLOW')).toBe(3); expect(flatPoints('RED')).toBe(0); expect(collectorPoints('GREEN')).toBe(collectorPoints('RED')); expect(collectorPoints('NO_BIN')).toBe(2); });
  it('skips no-bin but breaks on red/yellow',()=>{ expect(streak([{date:'2026-01-03',rating:'GREEN'},{date:'2026-01-02',rating:'NO_BIN'},{date:'2026-01-01',rating:'GREEN'}])).toBe(2); expect(streak([{date:'2026-01-03',rating:'GREEN'},{date:'2026-01-02',rating:'RED'}])).toBe(1); });
  it('returns each threshold once to the transaction layer',()=>{ expect(bonuses(6)).toEqual([]); expect(bonuses(7)).toEqual([20]); expect(bonuses(30)).toEqual([20,100]); });
  it('does not redeem below minimum verification or balance',()=>{ expect(canRedeem(100,10,100)).toBe(true); expect(canRedeem(100,9,100)).toBe(false); expect(canRedeem(99,10,100)).toBe(false); });
});
