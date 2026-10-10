// Punarnav local demo authorization policies.
// Entity shapes and action signatures are declared in punarnav.schema.json.

@id("active_users_only")
forbid(principal is Punarnav::User, action, resource)
when { principal.status != "ACTIVE" };

@id("collector_rates_active_flat_in_society")
permit(principal is Punarnav::User, action == Punarnav::Action::"rate_flat", resource is Punarnav::Flat)
when {
  principal.role == "COLLECTOR" &&
  principal.status == "ACTIVE" &&
  principal.societyId == resource.societyId &&
  resource.status == "ACTIVE"
};

@id("resident_views_own_pickups")
permit(principal is Punarnav::User, action == Punarnav::Action::"view_pickup", resource is Punarnav::Pickup)
when {
  principal.role == "RESIDENT" && principal.status == "ACTIVE" &&
  principal.societyId == resource.societyId && principal.flatId == resource.flatId
};

@id("resident_views_own_points")
permit(principal is Punarnav::User, action == Punarnav::Action::"view_points", resource is Punarnav::Flat)
when {
  principal.role == "RESIDENT" && principal.status == "ACTIVE" &&
  principal.societyId == resource.societyId && principal.flatId == resource.id
};

@id("active_resident_requests_signup")
permit(principal is Punarnav::User, action == Punarnav::Action::"request_signup", resource is Punarnav::UserProfile)
when {
  principal.role == "RESIDENT" && principal.status == "ACTIVE" &&
  principal.societyId == resource.societyId && resource.role == "RESIDENT" && resource.status == "PENDING"
};

@id("active_users_sign_in")
permit(principal is Punarnav::User, action == Punarnav::Action::"sign_in", resource is Punarnav::UserProfile)
when {
  principal.status == "ACTIVE" && principal.societyId == resource.societyId &&
  principal.role == resource.role && resource.status == "ACTIVE"
};

@id("resident_disputes_own_flat_pickup")
permit(principal is Punarnav::User, action == Punarnav::Action::"raise_dispute", resource is Punarnav::Pickup)
when {
  principal.role == "RESIDENT" && principal.status == "ACTIVE" &&
  principal.societyId == resource.societyId && principal.flatId == resource.flatId
};

@id("admin_approves_residents_in_society")
permit(principal is Punarnav::User, action == Punarnav::Action::"approve_resident", resource is Punarnav::UserProfile)
when {
  principal.role == "ADMIN" && principal.status == "ACTIVE" &&
  principal.societyId == resource.societyId && resource.role == "RESIDENT" && resource.status == "PENDING"
};

@id("admin_rejects_residents_in_society")
permit(principal is Punarnav::User, action == Punarnav::Action::"reject_resident", resource is Punarnav::UserProfile)
when {
  principal.role == "ADMIN" && principal.status == "ACTIVE" &&
  principal.societyId == resource.societyId && resource.role == "RESIDENT" && resource.status == "PENDING"
};

@id("admin_resolves_disputes_in_society")
permit(principal is Punarnav::User, action == Punarnav::Action::"resolve_dispute", resource is Punarnav::Dispute)
when { principal.role == "ADMIN" && principal.status == "ACTIVE" && principal.societyId == resource.societyId };

@id("admin_overrides_ratings_in_society")
permit(principal is Punarnav::User, action == Punarnav::Action::"override_rating", resource is Punarnav::Pickup)
when { principal.role == "ADMIN" && principal.status == "ACTIVE" && principal.societyId == resource.societyId };

@id("admin_manages_flats_in_society")
permit(principal is Punarnav::User, action == Punarnav::Action::"manage_flat", resource is Punarnav::Flat)
when { principal.role == "ADMIN" && principal.status == "ACTIVE" && principal.societyId == resource.societyId };

@id("admin_manages_qr_in_society")
permit(principal is Punarnav::User, action == Punarnav::Action::"manage_qr", resource is Punarnav::Flat)
when { principal.role == "ADMIN" && principal.status == "ACTIVE" && principal.societyId == resource.societyId };

@id("admin_logs_packaging_in_society")
permit(principal is Punarnav::User, action == Punarnav::Action::"log_packaging", resource is Punarnav::Flat)
when { principal.role == "ADMIN" && principal.status == "ACTIVE" && principal.societyId == resource.societyId };

@id("admin_manages_rewards_in_society")
permit(principal is Punarnav::User, action == Punarnav::Action::"manage_reward", resource is Punarnav::Reward)
when { principal.role == "ADMIN" && principal.status == "ACTIVE" && principal.societyId == resource.societyId };

@id("resident_redeems_for_own_flat")
permit(principal is Punarnav::User, action == Punarnav::Action::"redeem_reward", resource is Punarnav::Reward)
when {
  principal.role == "RESIDENT" && principal.status == "ACTIVE" &&
  principal.societyId == resource.societyId && principal.flatId == resource.flatId
};
