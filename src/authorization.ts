import policyText from './policies/punarnav.cedar?raw';
import schema from './policies/punarnav.schema.json';
import type { CedarValueJson } from '@cedar-policy/cedar-wasm';

export type PolicyRole = 'RESIDENT' | 'COLLECTOR' | 'ADMIN';
export type PolicyStatus = 'ACTIVE' | 'PENDING' | 'DEACTIVATED';
export type PolicyAction = 'rate_flat' | 'view_pickup' | 'view_points' | 'request_signup' | 'sign_in' | 'raise_dispute' | 'approve_resident' | 'reject_resident' | 'resolve_dispute' | 'override_rating' | 'manage_flat' | 'manage_qr' | 'log_packaging' | 'manage_reward' | 'redeem_reward';
export type EntityType = 'Flat' | 'Pickup' | 'Dispute' | 'Reward' | 'UserProfile';

export type Principal = {
  id: string;
  role: PolicyRole;
  status: PolicyStatus;
  societyId: string;
  flatId?: string;
};

export type Resource = {
  type: EntityType;
  id: string;
  societyId: string;
  flatId?: string;
  status?: string;
  role?: string;
};

export type AuthorizationDecision = {
  allowed: boolean;
  decision: 'ALLOW' | 'DENY';
  policyId: string;
  message: string;
};

const policies = { staticPolicies: policyText };
let cedarModule: Promise<typeof import('@cedar-policy/cedar-wasm')> | undefined;

function uid(type: string, id: string) {
  return { type: `Punarnav::${type}`, id };
}

/** Run every local permission decision through Cedar's WASM evaluator. */
export async function authorize(principal: Principal, action: PolicyAction, resource: Resource): Promise<AuthorizationDecision> {
  const cedar = await (cedarModule ??= import('@cedar-policy/cedar-wasm'));
  const principalUid = uid('User', principal.id);
  const resourceUid = uid(resource.type, resource.id);
  const resourceAttrs: Record<string, CedarValueJson> = resource.type === 'Flat'
    ? { id: resource.id, societyId: resource.societyId, status: resource.status ?? '' }
    : resource.type === 'Pickup' || resource.type === 'Dispute'
      ? { id: resource.id, societyId: resource.societyId, flatId: resource.flatId ?? '' }
      : resource.type === 'Reward'
        ? { id: resource.id, societyId: resource.societyId, flatId: resource.flatId ?? '' }
        : { id: resource.id, societyId: resource.societyId, role: resource.role ?? '', status: resource.status ?? '' };
  const response = cedar.isAuthorized({
    principal: principalUid,
    action: uid('Action', action),
    resource: resourceUid,
    context: {},
    schema,
    validateRequest: true,
    policies,
    entities: [
      { uid: principalUid, attrs: { role: principal.role, status: principal.status, societyId: principal.societyId, flatId: principal.flatId ?? '' }, parents: [] },
      { uid: resourceUid, attrs: resourceAttrs, parents: [] },
    ],
  });
  if (response.type === 'failure') {
    return { allowed: false, decision: 'DENY', policyId: 'cedar-evaluation-error', message: `Cedar could not evaluate this action: ${response.errors.map(e => e.message).join('; ')}` };
  }
  const allowed = response.response.decision === 'allow';
  const cedarPolicyId = response.response.diagnostics.reason[0];
  const policyIds = [...policyText.matchAll(/@id\("([^"]+)"\)\s*permit\(/g)].map(match => match[1]);
  const ordinal = cedarPolicyId?.match(/^policy(\d+)$/)?.[1];
  const policyId = (principal.status !== 'ACTIVE' && !allowed ? 'active_users_only' : undefined)
    ?? (ordinal ? policyIds[Number(ordinal) - 1] : undefined)
    ?? (allowed ? 'cedar-policy' : 'default-deny');
  return {
    allowed,
    decision: allowed ? 'ALLOW' : 'DENY',
    policyId,
    message: allowed ? 'Cedar allowed this action.' : `Cedar denied this action (${policyId}).`,
  };
}

export const activePolicyText = policyText;
export const policySchema = schema;
