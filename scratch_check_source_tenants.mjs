import pg from 'pg';
import dns from 'dns';
const { Client } = pg;

const host = 'db.vbigrtifoxsehgbapxtc.supabase.co';
const password = 'Yanse1789203@';

dns.lookup(host, { family: 4 }, async (err, address) => {
  if (err) {
    console.error('DNS failed:', err.message);
    return;
  }
  console.log('Resolved IPv4:', address);
  
  const client = new Client({
    host: address,
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to SOURCE database...');

    const tenantsRes = await client.query('SELECT id, name FROM public.tenants');
    console.log(`SOURCE tenants count: ${tenantsRes.rowCount}`);
    console.table(tenantsRes.rows);

    const tenantUsersRes = await client.query('SELECT id, tenant_id, user_id, email, name, role, status FROM public.tenant_users');
    console.log(`SOURCE tenant_users count: ${tenantUsersRes.rowCount}`);
    console.table(tenantUsersRes.rows);

    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
  }
});
