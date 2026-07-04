require('dotenv').config();
const axios = require('axios');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

const API_KEY = process.env.HUNTER_API_KEY;
if (!API_KEY) {
  console.error('Error: HUNTER_API_KEY is not set in .env');
  process.exit(1);
}

const prospects = [

  // FRENCH ALPS — CHALET RENTAL (pipeline)
  { company: "Bramble Ski",              domain: "brambleski.com",              sector: "French Alps Rental",    status: "In pipeline" },
  { company: "Firefly Collection",       domain: "firefly-collection.com",      sector: "French Alps Rental",    status: "In pipeline" },
  { company: "Oxford Ski Company",       domain: "oxfordski.com",               sector: "French Alps Rental",    status: "In pipeline" },
  { company: "Kaluma Ski",               domain: "kalumaski.com",               sector: "French Alps Rental",    status: "In pipeline" },
  { company: "Le Collectionist",         domain: "lecollectionist.com",         sector: "French Alps Rental",    status: "In pipeline" },
  { company: "Scott Dunn",               domain: "scottdunn.com",               sector: "French Alps Rental",    status: "In pipeline" },

  // FRENCH ALPS — CHALET RENTAL (new targets)
  { company: "Purple Ski",               domain: "purpleski.com",               sector: "French Alps Rental",    status: "New target" },
  { company: "Consensio Chalets",        domain: "consensiochalets.co.uk",      sector: "French Alps Rental",    status: "New target" },
  { company: "Haute Montagne",           domain: "hautemontagne.com",           sector: "French Alps Rental",    status: "New target" },
  { company: "The Boutique Chalet Co",   domain: "theboutiquechalet.com",       sector: "French Alps Rental",    status: "New target" },
  { company: "Hip Hideouts",             domain: "hiphideouts.com",             sector: "French Alps Rental",    status: "New target" },
  { company: "In-Luxe Chalets France",   domain: "in-luxe-chalets-france.com",  sector: "French Alps Rental",    status: "New target" },
  { company: "Excellence Courchevel",    domain: "excellencecourchevel.com",    sector: "French Alps Rental",    status: "New target" },
  { company: "The Luxury Chalet Co",     domain: "luxurychaletco.com",          sector: "French Alps Rental",    status: "New target" },
  { company: "Ultimate Luxury Chalets",  domain: "ultimateluxurychalets.com",   sector: "French Alps Rental",    status: "New target" },

  // FRENCH ALPS — PROPERTY SALES (pipeline)
  { company: "Cimalpes",                 domain: "cimalpes.com",                sector: "French Alps Sales",     status: "In pipeline" },
  { company: "Free Spirit Alpine",       domain: "freespiritalpine.com",        sector: "French Alps Sales",     status: "In pipeline" },
  { company: "Michaël Zingraf",          domain: "michaelzingraf.com",          sector: "French Alps Sales",     status: "In pipeline" },

  // FRENCH ALPS — PROPERTY SALES (new targets)
  { company: "Barnes 3 Vallées",         domain: "barnes-3vallees.com",         sector: "French Alps Sales",     status: "New target" },
  { company: "Méribel Sotheby's Realty", domain: "meribel-sothebysrealty.com",  sector: "French Alps Sales",     status: "New target" },

  // EUROPE — VILLA RENTAL (pipeline)
  { company: "Villa Plus",               domain: "villaplus.com",               sector: "Europe Villa Rental",   status: "In pipeline" },
  { company: "The Safari Edit",          domain: "thesafariedit.com",           sector: "Europe Villa Rental",   status: "In pipeline" },

  // EUROPE — VILLA RENTAL (new targets)
  { company: "Villanovo",                domain: "villanovo.com",               sector: "Europe Villa Rental",   status: "New target" },
  { company: "A.M.A Selections",         domain: "amaselections.com",           sector: "Europe Villa Rental",   status: "New target" },
  { company: "Icon Private Collection",  domain: "iconprivatecollection.com",   sector: "Europe Villa Rental",   status: "New target" },
  { company: "Exceptional Villas",       domain: "exceptionalvillas.com",       sector: "Europe Villa Rental",   status: "New target" },
  { company: "Oliver's Travels",         domain: "oliverstravels.com",          sector: "Europe Villa Rental",   status: "New target" },
  { company: "Unique Home Stays",        domain: "uniquehomestays.com",         sector: "Europe Villa Rental",   status: "New target" },
  { company: "Hosted Villas",            domain: "hostedvillas.com",            sector: "Europe Villa Rental",   status: "New target" },

  // NORFOLK — LUXURY RENTAL
  { company: "Barefoot Retreats",        domain: "barefootretreats.co.uk",      sector: "Norfolk Rental",        status: "New target" },
  { company: "Norfolk Hideaways",        domain: "norfolkhideaways.co.uk",      sector: "Norfolk Rental",        status: "New target" },
  { company: "Norfolk Coastal Cottages", domain: "norfolkcoastalcottages.com",  sector: "Norfolk Rental",        status: "New target" },
  { company: "Fabulous Norfolk",         domain: "fabulousnorfolk.co.uk",       sector: "Norfolk Rental",        status: "New target" },
  { company: "Norfolk Cottage Agency",   domain: "norfolkcottageagency.co.uk",  sector: "Norfolk Rental",        status: "New target" },
  { company: "Sowerbys Holiday Cottages",domain: "sowerbysholidaycottages.co.uk",sector: "Norfolk Rental",       status: "New target" },

  // UK — COTSWOLDS
  { company: "Luxury Cotswold Rentals",  domain: "luxurycotswoldrentals.co.uk", sector: "UK Premium Rental",     status: "New target" },
  { company: "Boutique Retreats",        domain: "boutique-retreats.co.uk",     sector: "UK Premium Rental",     status: "New target" },

  // UK — SOUTH WEST
  { company: "Perfect Stays",            domain: "perfectstays.co.uk",          sector: "UK Premium Rental",     status: "New target" },
  { company: "Finest Stays",             domain: "fineststays.co.uk",           sector: "UK Premium Rental",     status: "New target" },

  // UK — SCOTLAND & NORTH
  { company: "George Goldsmith",         domain: "georgegoldsmith.com",         sector: "UK Premium Rental",     status: "New target" },
  { company: "Crabtree & Crabtree",      domain: "crabtreeandcrabtree.com",     sector: "UK Premium Rental",     status: "New target" },
  { company: "Seasgair Lodges",          domain: "seasgairlodges.com",          sector: "UK Premium Rental",     status: "New target" },

  // UK — UHNW PROPERTY SALES
  { company: "Beauchamp Estates",        domain: "beauchamp.com",               sector: "UK Property Sales",     status: "New target" },
  { company: "Strutt & Parker",          domain: "struttandparker.com",         sector: "UK Property Sales",     status: "New target" },

];

const SENIORITY_KEYWORDS = ['founder','owner','director','managing','head','ceo','md','president','partner','manager'];
const GENERIC_POSITIONS = ['accounts','finance','hr','careers'];
const GENERIC_EMAIL_PREFIXES = ['info@','hello@','enquiries@'];

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function getSeniorityRank(position) {
  if (!position) return 99;
  const lower = position.toLowerCase();
  for (let i = 0; i < SENIORITY_KEYWORDS.length; i++) {
    if (lower.includes(SENIORITY_KEYWORDS[i])) return i;
  }
  return 99;
}

function isGeneric(email) {
  const addr = (email.value || '').toLowerCase();
  const pos = (email.position || '').toLowerCase();
  if (GENERIC_EMAIL_PREFIXES.some(p => addr.startsWith(p))) return true;
  if (GENERIC_POSITIONS.some(p => pos.includes(p))) return true;
  return false;
}

function scoreContacts(emails) {
  if (!emails || emails.length === 0) return [];

  const sorted = [...emails].sort((a, b) => {
    const rankDiff = getSeniorityRank(a.position) - getSeniorityRank(b.position);
    if (rankDiff !== 0) return rankDiff;
    return (b.confidence || 0) - (a.confidence || 0);
  });

  const filtered = sorted.filter(e => !isGeneric(e));
  const pool = filtered.length > 0 ? filtered : sorted;

  return pool.slice(0, 3);
}

async function processProspect(prospect, index, total) {
  console.log(`[${index}/${total}] Querying ${prospect.domain}...`);

  let emails = [];
  let totalFound = 0;
  let notes = '';

  try {
    const response = await axios.get('https://api.hunter.io/v2/domain-search', {
      params: { domain: prospect.domain, api_key: API_KEY },
      timeout: 15000,
    });

    emails = response.data.data.emails || [];
    totalFound = emails.length;
  } catch (err) {
    const status = err.response ? err.response.status : 'network error';
    notes = `API error: ${status}`;
    console.log(`  -> Error: ${notes}`);
  }

  const top = scoreContacts(emails);

  if (!notes) {
    if (totalFound === 0) {
      notes = 'No contacts found';
    } else if (top.length < 3) {
      notes = `Only ${top.length} contact(s) found`;
    }
  }

  const row = {
    Company: prospect.company,
    Domain: prospect.domain,
    Sector: prospect.sector,
    Status: prospect.status,
    Contact_1_Name:       top[0] ? `${top[0].first_name || ''} ${top[0].last_name || ''}`.trim() : '',
    Contact_1_Title:      top[0] ? (top[0].position || '') : '',
    Contact_1_Email:      top[0] ? (top[0].value || '') : '',
    Contact_1_Confidence: top[0] ? (top[0].confidence || '') : '',
    Contact_2_Name:       top[1] ? `${top[1].first_name || ''} ${top[1].last_name || ''}`.trim() : '',
    Contact_2_Title:      top[1] ? (top[1].position || '') : '',
    Contact_2_Email:      top[1] ? (top[1].value || '') : '',
    Contact_2_Confidence: top[1] ? (top[1].confidence || '') : '',
    Contact_3_Name:       top[2] ? `${top[2].first_name || ''} ${top[2].last_name || ''}`.trim() : '',
    Contact_3_Title:      top[2] ? (top[2].position || '') : '',
    Contact_3_Email:      top[2] ? (top[2].value || '') : '',
    Contact_3_Confidence: top[2] ? (top[2].confidence || '') : '',
    Total_Emails_Found: totalFound,
    Notes: notes,
  };

  if (top.length > 0) {
    console.log(`  -> Found ${totalFound} email(s), selected ${top.length} contact(s)`);
  }

  return row;
}

async function main() {
  const total = prospects.length;
  console.log(`Hunter.io extraction — ${total} prospects\n`);

  const rows = [];

  for (let i = 0; i < prospects.length; i++) {
    const row = await processProspect(prospects[i], i + 1, total);
    rows.push(row);
    if (i < prospects.length - 1) {
      await delay(1000);
    }
  }

  const outputPath = path.join(__dirname, 'prospects-contacts.csv');
  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'Company',            title: 'Company' },
      { id: 'Domain',             title: 'Domain' },
      { id: 'Sector',             title: 'Sector' },
      { id: 'Status',             title: 'Status' },
      { id: 'Contact_1_Name',     title: 'Contact_1_Name' },
      { id: 'Contact_1_Title',    title: 'Contact_1_Title' },
      { id: 'Contact_1_Email',    title: 'Contact_1_Email' },
      { id: 'Contact_1_Confidence', title: 'Contact_1_Confidence' },
      { id: 'Contact_2_Name',     title: 'Contact_2_Name' },
      { id: 'Contact_2_Title',    title: 'Contact_2_Title' },
      { id: 'Contact_2_Email',    title: 'Contact_2_Email' },
      { id: 'Contact_2_Confidence', title: 'Contact_2_Confidence' },
      { id: 'Contact_3_Name',     title: 'Contact_3_Name' },
      { id: 'Contact_3_Title',    title: 'Contact_3_Title' },
      { id: 'Contact_3_Email',    title: 'Contact_3_Email' },
      { id: 'Contact_3_Confidence', title: 'Contact_3_Confidence' },
      { id: 'Total_Emails_Found', title: 'Total_Emails_Found' },
      { id: 'Notes',              title: 'Notes' },
    ],
  });

  await csvWriter.writeRecords(rows);
  console.log(`\nDone. CSV written to: ${outputPath}`);
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
