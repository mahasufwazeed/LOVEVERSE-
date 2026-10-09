const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const password = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;
  const connString = process.env.DATABASE_URL || (password 
    ? `postgresql://postgres:${encodeURIComponent(password)}@db.urfbeblgqptwflmjcrtz.supabase.co:5432/postgres`
    : null);

  if (!connString) {
    console.error('Error: Please provide your Supabase database password.');
    console.error('Usage: node scripts/migrate.js <your-password>');
    console.error('Or set SUPABASE_DB_PASSWORD / DATABASE_URL environment variable.');
    process.exit(1);
  }

  console.log('Connecting to Supabase PostgreSQL at db.urfbeblgqptwflmjcrtz.supabase.co...');

  const client = new Client({
    connectionString: connString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
    console.log(`Reading schema from ${schemaPath}...`);
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log('Applying LoveVerse database schema & RLS policies...');
    await client.query(sql);

    console.log('====================================================');
    console.log('🎉 LOVEVERSE DATABASE MIGRATION APPLIED SUCCESSFULLY!');
    console.log('====================================================');
    console.log('- Profiles, Spaces, Members tables created');
    console.log('- Messages, Stickers, Games tables created');
    console.log('- Watch Sessions & Memories tables created');
    console.log('- Row Level Security (RLS) & RPC functions deployed');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
