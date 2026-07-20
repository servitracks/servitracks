import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: '136.248.245.211',
  port: 5432,
  user: 'postgres',
  password: 'v3hl8vJuED8a3vY409Tr2aE5onVJGp4E',
  database: 'postgres',
  ssl: false // usually self-hosted doesn't require SSL or might require it, we will try without first
});

async function testConnection() {
  console.log('Attempting to connect to TARGET database at 136.248.245.211:5432...');
  try {
    await client.connect();
    console.log('SUCCESS! Connected to target database.');
    const res = await client.query('SELECT current_database(), version()');
    console.log(res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection failed:', err.message);
  }
}

testConnection();
