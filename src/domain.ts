export type Rating = 'GREEN'|'YELLOW'|'RED'|'NO_BIN';
export type Pickup = { date:string; rating:Rating };
export const flatPoints = (rating: Rating) => rating === 'GREEN' ? 10 : rating === 'YELLOW' ? 3 : 0;
export const collectorPoints = (_rating: Rating) => 2;
export function streak(pickups: Pickup[]) { let total=0; for (const p of [...pickups].sort((a,b)=>b.date.localeCompare(a.date))) { if (p.rating === 'NO_BIN') continue; if (p.rating !== 'GREEN') break; total++; } return total; }
export function bonuses(s: number) { return [s >= 7 ? 20 : 0, s >= 30 ? 100 : 0].filter(Boolean); }
export function canRedeem(balance:number, verifiedPickups:number, cost:number) { return Number.isInteger(cost) && cost > 0 && verifiedPickups >= 10 && balance >= cost; }
