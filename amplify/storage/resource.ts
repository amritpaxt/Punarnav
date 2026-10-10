import { defineStorage } from '@aws-amplify/backend';
export const storage = defineStorage({ name: 'pickupPhotos', access: allow => ({
  'pickups/{entity_id}/*': [allow.authenticated.to(['read','write','delete'])],
}) });
