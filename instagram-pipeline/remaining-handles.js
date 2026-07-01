// Hotels not yet scraped due to Apify monthly limit being hit on batch 8.
// Run with: node remaining-handles.js

import { run } from './scrape.js';

const REMAINING = [
  'solaireresort','soneva','steinlodge','sterrekopjefarm','stregisabudhabi',
  'stregisatl','stregisbalharbour','stregisdubaithepalm','stregishk',
  'stregismacao','stregismaldives','stregisnewyork','stregissaadiyatisland',
  'stregissf','stregistoronto','sussurro.co','tajfalaknuma','tajmahalmumbai',
  'takanawa_hanakohro','the_berkeley','the_londoner_macao','the_pointresort',
  'theadaremanor','thebalmoral','thebocaraton','thebrandoresort','thebroadmoor',
  'thecalilehotel','thecapitolhoteltokyu','thechanler','thechediandermatt',
  'thecolonypalmbeach','theconnaught','thedoldergrand','thedorchester',
  'theemorylondon','thefifearms','thegleneagleshotel','thegoring',
  'thekarllagerfeld','thelanadubai','theleelapalace_jaipur','thelittlenell',
  'thelowellhotel','themarkhotelny','themaybournebh','themaybourneriviera',
  'themuliabali','thenautilusisland','thenewtinsomerset','theoberoimauritius',
  'theoberoimumbai','theokuratokyo','thepeninsulabangkok','thepeninsulabeijing',
  'thepeninsulachi','thepeninsulamanila','thepeninsulanyc','thepeninsulashanghai',
  'thepeninsulatokyo','theprinceakatokilondon','theranchatrockcreek',
  'theritzcarltonchengdu','theritzcarltonruh','thesavoylondon','thesaxonhotel',
  'thesetaimiamibeach','theshillaseoul','thesujanlife','theumstead',
  'tierrahotels','toranomonedition','trisararesort','trumpchicago','trumpnyc',
  'trumpturnberryscotland','turtleinn','twinfarms','upperhouse_hkg','uxua',
  'velaaprivateisland','venicevenicehotel','verinasifnos','waldorfamsterdam',
  'waldorfastoriakuwait','waldorfastoriamaldives','waldorfastoriaplatteisland',
  'waldorfbevhills','waldorfdifc','wapedregal','wearewilderness','weekapauginn',
  'weissenhaus','welcomhotel.pinenpeak_pahalgam','wequassett','wickinnbc',
  'woodstock.inn','wymaravillas','wynn.macau','wynn.palace','wynnlasvegas',
  'zadunreserve','zannierbaisanho','zerogeorgest',
];

console.log(`Re-running ${REMAINING.length} hotels that were skipped due to Apify limit.`);

const BATCH_SIZE = 50;
let totalProfiles = 0;
let totalPosts = 0;
const stillSkipped = [];

for (let i = 0; i < REMAINING.length; i += BATCH_SIZE) {
  const batch = REMAINING.slice(i, i + BATCH_SIZE);
  console.log(`\nBatch ${Math.floor(i/BATCH_SIZE)+1}: ${batch.length} hotels`);
  try {
    const summary = await run(batch, { postsNewerThan: '14 days' });
    totalProfiles += summary.profilesLoaded;
    totalPosts += summary.postsLoaded;
    stillSkipped.push(...summary.skipped);
  } catch (err) {
    console.error(`Batch failed: ${err.message}`);
    stillSkipped.push(...batch);
  }
}

console.log(`\nDone. ${totalProfiles} profiles, ${totalPosts} posts.`);
if (stillSkipped.length) {
  console.log(`Still skipped: ${stillSkipped.join(', ')}`);
}
