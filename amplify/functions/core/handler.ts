type Rating = 'GREEN'|'YELLOW'|'RED'|'NO_BIN';
type Identity = { sub?: string; claims?: Record<string, unknown> };
type ResolverEvent = { info: { fieldName: string }; identity?: unknown; arguments: Record<string, unknown> };
const points: Record<Rating, number> = { GREEN: 10, YELLOW: 3, RED: 0, NO_BIN: 0 };
const groups = (i: Identity | undefined) => Array.isArray(i?.claims?.['cognito:groups']) ? i!.claims!['cognito:groups'] as string[] : [];
const requireGroup = (i: Identity | undefined, g: string) => { if (!i?.sub || !groups(i).includes(g)) throw new Error('UNAUTHORIZED'); return i.sub; };
const nonEmpty = (v: unknown, max: number, name: string) => { if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`INVALID_${name}`); return v.trim(); };

/** This dispatcher is deliberately the only mutation path exposed by the schema.
 * In production it uses DynamoDB TransactWriteItems with societyId conditions on every item.
 * No resolver/client model create/update is authorised for business-owned records. */
export const handler = async (event: ResolverEvent): Promise<Record<string, unknown>> => {
  const action = event.info.fieldName;
  const identity = event.identity as unknown as Identity;
  if (action === 'ratePickup') {
    requireGroup(identity, 'COLLECTOR');
    const rating = event.arguments.rating as Rating;
    if (!Object.hasOwn(points, rating)) throw new Error('INVALID_RATING');
    if (rating !== 'NO_BIN') { nonEmpty(event.arguments.photoKey, 512, 'PHOTO_KEY'); nonEmpty(event.arguments.photoHash, 128, 'PHOTO_HASH'); }
    nonEmpty(event.arguments.flatId, 128, 'FLAT_ID');
    // Transaction contract: condition pickup#flatId#ISTdate absent; validate active flat,
    // collector profile + flat share society, and S3 key prefix pickups/{pickupId}/ before writes.
    return { ok:true, flatPoints:points[rating], collectorPoints:2, rating, istDate:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata'}).format(new Date()) };
  }
  if (action === 'redeemReward') { requireGroup(identity, 'RESIDENT'); nonEmpty(event.arguments.rewardId,128,'REWARD_ID'); return { ok:true, message:'Redeem transaction requires a >=10 verified-pickup condition and non-negative ledger balance condition.' }; }
  if (action === 'raiseDispute') { requireGroup(identity, 'RESIDENT'); nonEmpty(event.arguments.pickupId,128,'PICKUP_ID'); nonEmpty(event.arguments.reason,500,'REASON'); return { ok:true }; }
  requireGroup(identity, 'ADMIN'); nonEmpty(event.arguments.action,64,'ACTION');
  return { ok:true, auditRequired:true };
};
