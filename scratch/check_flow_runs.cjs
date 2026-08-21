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
  const { data: runs, error } = await supabase
    .from('flow_runs')
    .select('id, flow_id, status, current_node_key, vars, started_at')
    .order('started_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error(error);
    process.exit(1);
  }
  
  console.log("Recent runs:");
  console.log(runs);

  if (runs.length > 0) {
    const runId = runs[0].id;
    const { data: events } = await supabase
      .from('flow_run_events')
      .select('id, event_type, node_key, payload, created_at')
      .eq('flow_run_id', runId)
      .order('created_at', { ascending: true });
    
    console.log(`\nEvents for run ${runId}:`);
    console.log(events);
  }

  process.exit(0);
}

main();
