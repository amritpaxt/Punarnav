import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('public', { recursive: true });
await copyFile('amplify_outputs.json', 'public/amplify_outputs.json');
console.log('Copied amplify_outputs.json to public/amplify_outputs.json');
