import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as cedar from '@cedar-policy/cedar-wasm/nodejs';
import type { CedarValueJson } from '@cedar-policy/cedar-wasm/nodejs';

const root = resolve(process.cwd(), 'src/policies');
const policies = { staticPolicies: readFileSync(resolve(root, 'punarnav.cedar'), 'utf8') };
const schema = JSON.parse(readFileSync(resolve(root, 'punarnav.schema.json'), 'utf8')) as cedar.Schema;

type Role = 'RESIDENT' | 'COLLECTOR' | 'ADMIN';
type Status = 'ACTIVE' | 'PENDING' | 'DEACTIVATED';

function evaluate(input: {
  role: Role; status: Status; societyId?: string; flatId?: string;
  action: string; resourceType: string; resourceId?: string;
  resourceSocietyId?: string; resourceFlatId?: string; resourceStatus?: string;
  resourceRole?: string;
}) {
  const principal = { type: 'Punarnav::User', id: 'test-user' };
  const resource = { type: `Punarnav::${input.resourceType}`, id: input.resourceId ?? 'target' };
  const principalAttrs = { role: input.role, status: input.status, societyId: input.societyId ?? 'society-a', flatId: input.flatId ?? '' };
  const attrs: Record<string, CedarValueJson> = input.resourceType === 'Flat'
    ? { id: resource.id, societyId: input.resourceSocietyId ?? 'society-a', status: input.resourceStatus ?? 'ACTIVE' }
    : input.resourceType === 'Pickup' || input.resourceType === 'Dispute'
      ? { id: resource.id, societyId: input.resourceSocietyId ?? 'society-a', flatId: input.resourceFlatId ?? 'flat-1' }
      : input.resourceType === 'UserProfile'
        ? { id: resource.id, societyId: input.resourceSocietyId ?? 'society-a', role: input.resourceRole ?? 'RESIDENT', status: input.resourceStatus ?? 'PENDING' }
        : { id: resource.id, societyId: input.resourceSocietyId ?? 'society-a', flatId: input.resourceFlatId ?? 'flat-1' };
  const result = cedar.isAuthorized({
    principal, action: { type: 'Punarnav::Action', id: input.action }, resource, context: {}, schema,
    validateRequest: true, policies,
    entities: [
      { uid: principal, attrs: principalAttrs, parents: [] },
      { uid: resource, attrs, parents: [] },
    ],
  });
  if (result.type === 'failure') throw new Error(result.errors.map(e => e.message).join('; '));
  return result.response.decision;
}

describe('Punarnav Cedar policies', () => {
  it('allows a collector to rate an active flat in their society', () => {
    expect(evaluate({ role: 'COLLECTOR', status: 'ACTIVE', action: 'rate_flat', resourceType: 'Flat' })).toBe('allow');
  });

  it('denies rating a vacant flat or a flat in another society', () => {
    expect(evaluate({ role: 'COLLECTOR', status: 'ACTIVE', action: 'rate_flat', resourceType: 'Flat', resourceStatus: 'VACANT' })).toBe('deny');
    expect(evaluate({ role: 'COLLECTOR', status: 'ACTIVE', action: 'rate_flat', resourceType: 'Flat', resourceSocietyId: 'society-b' })).toBe('deny');
  });

  it('denies a resident rating a flat', () => {
    expect(evaluate({ role: 'RESIDENT', status: 'ACTIVE', action: 'rate_flat', resourceType: 'Flat' })).toBe('deny');
  });

  it('denies pending users every declared action', () => {
    const cases: Array<[string, string]> = [
      ['rate_flat', 'Flat'], ['view_pickup', 'Pickup'], ['view_points', 'Flat'], ['request_signup', 'UserProfile'], ['sign_in', 'UserProfile'],
      ['raise_dispute', 'Pickup'], ['approve_resident', 'UserProfile'], ['reject_resident', 'UserProfile'],
      ['resolve_dispute', 'Dispute'], ['override_rating', 'Pickup'], ['manage_flat', 'Flat'], ['manage_qr', 'Flat'],
      ['log_packaging', 'Flat'], ['manage_reward', 'Reward'], ['redeem_reward', 'Reward'],
    ];
    for (const status of ['PENDING', 'DEACTIVATED'] as const) for (const [action, resourceType] of cases) {
      expect(evaluate({ role: 'ADMIN', status, action, resourceType }), `${status} ${action}`).toBe('deny');
    }
  });

  it('denies a resident a dispute on another flat pickup', () => {
    expect(evaluate({ role: 'RESIDENT', status: 'ACTIVE', flatId: 'flat-1', action: 'raise_dispute', resourceType: 'Pickup', resourceFlatId: 'flat-2' })).toBe('deny');
  });

  it('allows only an admin to approve pending residents', () => {
    expect(evaluate({ role: 'ADMIN', status: 'ACTIVE', action: 'approve_resident', resourceType: 'UserProfile' })).toBe('allow');
    expect(evaluate({ role: 'COLLECTOR', status: 'ACTIVE', action: 'approve_resident', resourceType: 'UserProfile' })).toBe('deny');
    expect(evaluate({ role: 'RESIDENT', status: 'ACTIVE', action: 'approve_resident', resourceType: 'UserProfile' })).toBe('deny');
  });
});
