const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2];
let n = 0; const tasks = {}; const log = [];
// seeds that fail per asset (by order of create calls we infer asset from token prefix)
const failPlan = { '02-lantern': [42], '03-sword': [42, 43, 44] };
const srv = http.createServer((req, res) => {
  let chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => {
    const body = Buffer.concat(chunks);
    const send = (code, obj) => { res.writeHead(code, {'content-type':'application/json'}); res.end(JSON.stringify(obj)); };
    if (req.url.startsWith('/dl/')) { res.writeHead(200); return res.end('glTF-mock'); }
    if (req.headers.authorization !== 'Bearer test-key') return send(401, {code: 1002, message: 'auth'});
    log.push(`${req.method} ${req.url}`);
    if (req.method === 'POST' && req.url === '/v3/files') {
      const s = body.toString('latin1');
      const fname = /filename="([^"]+)"/.exec(s)[1];
      if (!/name="file"/.test(s)) return send(400, {code: 1004});
      return send(200, {code: 0, data: {file_token: `tok${++n}_${fname}`}});
    }
    if (req.method === 'POST' && req.url === '/v3/generation/multiview-to-model') {
      const j = JSON.parse(body);
      if (req.headers['content-type'] !== 'application/json') return send(400, {code:1003});
      const id = `task-${++n}`;
      const asset = currentAsset;
      const fail = (failPlan[asset] || []).includes(j.model_seed);
      tasks[id] = { polls: 0, fail, asset, j };
      return send(200, {code: 0, data: {task_id: id}});
    }
    let m;
    if (req.method === 'GET' && (m = /^\/v3\/tasks\/(.+)$/.exec(req.url))) {
      const t = tasks[m[1]]; if (!t) return send(404, {code: 2001});
      t.polls++;
      const base = {task_id: m[1], type: 'multiview_to_model', created_at: new Date().toISOString()};
      if (t.polls < 3) return send(200, {code:0, data:{...base, status: t.polls === 1 ? 'queued':'running', progress: t.polls*30}});
      if (t.fail) return send(200, {code:0, data:{...base, status:'failed', progress: 100, error_code: 1000, error_message:'mock fail', credits_consumed: 0}});
      return send(200, {code:0, data:{...base, status:'success', progress:100, credits_consumed: 40.5,
        output:{model_url:`http://127.0.0.1:${srv.address().port}/dl/${m[1]}.glb`}, completed_at: new Date().toISOString()}});
    }
    if (req.method === 'GET' && req.url.startsWith('/dl/')) { res.writeHead(200); return res.end('glTF-mock'); }
    send(404, {code: 4001});
  });
});
let currentAsset = '';
srv.listen(0, async () => {
  process.env.TRIPO_BASE_URL = `http://127.0.0.1:${srv.address().port}/v3`;
  process.env.TRIPO_POLL_MS = '20';
  process.env.TRIPO_API_KEY = 'test-key';
  // track current asset via log lines
  const origLog = console.log;
  console.log = (...a) => { const s = a.join(' '); const mm = /\] (\d\d-\w+): attempt/.exec(s); if (mm) currentAsset = mm[1]; origLog(...a); };
  const { main } = await import('file:///D:/elvar/cog-runs/00-tripo-script/tripo.js');
  origLog('===== RUN 1 ====='); await main({ root });
  origLog('exitCode', process.exitCode); process.exitCode = 0;
  origLog('===== RUN 2 ====='); log.length = 0; await main({ root });
  origLog('API calls in run 2:', log);
  const t = JSON.parse(fs.readFileSync(path.join(root, 'route-b/tasks.json')));
  origLog('records:', t.map(r => `${r.asset} a${r.attempt} seed${r.model_seed} ${r.status} ${r.output_file} ${r.started_at < r.ended_at}`));
  origLog('sample record keys:', Object.keys(t[0]), 'result keys:', Object.keys(t[0].result.data));
  origLog('glbs:', fs.readdirSync(path.join(root, 'route-b')));
  srv.close();
});
