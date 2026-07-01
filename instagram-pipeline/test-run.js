// CHECKPOINT 1 — 5-hotel test run
// Run with: npm run test5

import { run } from './scrape.js';

const TEST_HANDLES = [
  'thesavoylondon',
  'ritzparis',
  'bevhillshotel',
  'aman_tokyo',
  'jumeirahburjalarab',
];

const summary = await run(TEST_HANDLES, { resultsLimit: 30 });

console.log('\n═══════════════════════════════════════');
console.log('CHECKPOINT 1 SUMMARY');
console.log('═══════════════════════════════════════');
console.log(`Profiles loaded:  ${summary.profilesLoaded} / ${TEST_HANDLES.length}`);
console.log(`Posts written:    ${summary.postsLoaded}`);
if (summary.skipped.length) {
  console.log(`Skipped handles: ${summary.skipped.join(', ')}`);
}

console.log('\n--- Sample profile rows ---');
for (const p of summary.sampleProfiles) {
  console.log(`  @${p.instagram_handle}: ${p.followers_count?.toLocaleString()} followers, verified=${p.is_verified}`);
}

console.log('\n--- Sample post rows ---');
for (const p of summary.samplePosts) {
  const caption = (p.caption || '').slice(0, 60).replace(/\n/g, ' ');
  console.log(`  @${p.instagram_handle} | ${p.type} | likes=${p.likes_count} | "${caption}..."`);
}
