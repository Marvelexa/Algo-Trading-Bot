const fs = require('fs');
const path = require('path');

const envPath = 'C:\\Users\\Prince\\OneDrive\\Desktop\\wacrm\\New folder\\CRM2\\.env.local';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const crm2Path = 'C:\\Users\\Prince\\OneDrive\\Desktop\\wacrm\\New folder\\CRM2';
const supabaseJs = require(path.join(crm2Path, 'node_modules/@supabase/supabase-js'));
const supabase = supabaseJs.createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

async function main() {
  const { data: accounts, error } = await supabase.from('accounts').select('*');
  if (error) {
    console.error('Error fetching accounts:', error.message);
  } else {
    console.log('Accounts count:', accounts.length);
    accounts.forEach((acc, idx) => {
      console.log(`\nAccount ${idx + 1}:`);
      console.log('ID:', acc.id);
      console.log('Name:', acc.name);
      console.log('Keys:', Object.keys(acc));
    });
  }
  process.exit(0);
}

main().catch(console.error);
