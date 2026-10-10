import { defineFunction } from '@aws-amplify/backend';
export const core = defineFunction({ name: 'punarnav-core', entry: './handler.ts', timeoutSeconds: 30 });
