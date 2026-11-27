#!/usr/bin/env node
// Tripo multiview-to-model batch runner (P Series).
//
// Usage:  TRIPO_API_KEY=tsk_... node tripo.js [asset ...]
//   With no arguments it processes every folder in assets/.
//   Each folder must contain front.png, left.png and back.png.
//
// API reference (https://developers.tripo3d.com/en/docs):
//   POST /v3/files                         multipart field "file" -> data.file_token
//   POST /v3/generation/multiview-to-model inputs + model + options -> data.task_id
//   GET  /v3/tasks/{task_id}               status, output.model_url, credits_consumed
// Model URLs expire about 5 minutes after the task finishes, so the model is downloaded right away.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = (process.env.TRIPO_BASE_URL || 'https://openapi.tripo3d.com/v3').replace(/\/+$/, '');
const POLL_MS = Number(process.env.TRIPO_POLL_MS || 5000);       // poll every 5 s
const MAX_WAIT_MS = Number(process.env.TRIPO_MAX_WAIT_MS || 30 * 60 * 1000); // per attempt
const MAX_RETRIES = 2;                                            // retries after the first attempt
const VIEWS = ['front', 'left', 'back'];
const SETTINGS = {
  model: 'P2-20260801',
  face_limit: 20000,
  texture: true,
  pbr: true,
};
const BASE_SEED = 42;
const FAIL_STATUSES = new Set(['failed', 'cancelled', 'banned', 'expired']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ts = () => new Date().toISOString();
const log = (...a) => console.log(`[${ts()}]`, ...a);

// ---------------------------------------------------------------- HTTP

class ApiError extends Error {
  constructor(message, { httpStatus, code, body } = {}) {
    super(message);
    this.httpStatus = httpStatus;
    this.code = code;
    this.body = body;
  }
}

/**
 * Calls the Tripo API and returns `data` from the {code, data} envelope.
 * Retries 429 (rate/concurrency limit) with backoff. 5xx is retried only when
 * `retry5xx` is set: a lost response to a create call may still have created a task.
 */
async function api(method, urlPath, { apiKey, json, form, retry5xx = true } = {}) {
  const maxTries = 6;
  for (let attempt = 1; ; attempt++) {
    const headers = { Authorization: `Bearer ${apiKey}` };
    let body;
    if (json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(json);
    } else if (form) {
      body = form(); // build a fresh FormData each try
    }

    let res, text, parsed;
    try {
      res = await fetch(BASE_URL + urlPath, { method, headers, body });
      text = await res.text();
    } catch (err) {
      if (retry5xx && attempt < maxTries) {
        const wait = 1000 * 2 ** (attempt - 1);
        log(`  network error on ${method} ${urlPath}: ${err.message}; retry in ${wait} ms`);
        await sleep(wait);
        continue;
      }
      throw new ApiError(`${method} ${urlPath} network error: ${err.message}`);
    }
    try { parsed = text ? JSON.parse(text) : {}; } catch { parsed = { raw: text }; }

    const ok = res.ok && parsed.code === 0;
    if (ok) return parsed.data;

    const retryable = res.status === 429 || (retry5xx && res.status >= 500);
    if (retryable && attempt < maxTries) {
      const ra = Number(res.headers.get('retry-after'));
      const wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : 1000 * 2 ** (attempt - 1);
      log(`  HTTP ${res.status} code=${parsed.code} on ${method} ${urlPath}; retry in ${wait} ms`);
      await sleep(wait);
      continue;
    }
    const msg = [parsed.message, parsed.suggestion].filter(Boolean).join(' — ') || text;
    throw new ApiError(`${method} ${urlPath} -> HTTP ${res.status} code=${parsed.code}: ${msg}`, {
      httpStatus: res.status, code: parsed.code, body: parsed,
    });
  }
}

async function uploadFile(apiKey, filePath) {
  const buf = fs.readFileSync(filePath);
  const name = path.basename(filePath);
  const type = /\.jpe?g$/i.test(name) ? 'image/jpeg' : 'image/png';
  const data = await api('POST', '/files', {
    apiKey,
    form: () => {
      const fd = new FormData();
      fd.append('file', new Blob([buf], { type }), name);
      return fd;
    },
  });
  if (!data || !data.file_token) throw new Error(`upload of ${filePath} returned no file_token`);
  return data.file_token;
}

async function createTask(apiKey, body) {
  // Only 429 is retried here; 5xx may mean the task was created anyway.
  const data = await api('POST', '/generation/multiview-to-model', { apiKey, json: body, retry5xx: false });
  if (!data || !data.task_id) throw new Error('create task returned no task_id');
  return data.task_id;
}

/** Polls until a terminal status. Returns { result, status, waitedSec }. */
async function pollTask(apiKey, taskId) {
  const t0 = Date.now();
  let lastLine = '';
  for (;;) {
    const data = await api('GET', `/tasks/${encodeURIComponent(taskId)}`, { apiKey });
    const status = data.status;
    const line = `  task ${taskId}: ${status} ${data.progress ?? ''}%`;
    if (line !== lastLine) { log(line); lastLine = line; }
    if (status === 'success' || FAIL_STATUSES.has(status)) {
      return { result: { code: 0, data }, status, waitedSec: (Date.now() - t0) / 1000 };
    }
    if (Date.now() - t0 > MAX_WAIT_MS) {
      return { result: { code: 0, data }, status: 'timeout', waitedSec: (Date.now() - t0) / 1000 };
    }
    await sleep(POLL_MS);
  }
}

async function download(url, outFile) {
  let lastErr;
  for (let i = 1; i <= 3; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      const tmp = outFile + '.part';
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, outFile);
      return buf.length;
    } catch (err) {
      lastErr = err;
      log(`  download try ${i} failed: ${err.message}`);
      if (i < 3) await sleep(2000 * i);
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------- tasks.json

function readTasks(file) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, 'utf8').trim();
  if (!text) return [];
  const parsed = JSON.parse(text); // throw instead of overwriting a corrupt log
  if (!Array.isArray(parsed)) throw new Error(`${file} is not a JSON array`);
  return parsed;
}

function appendTask(file, record) {
  const all = readTasks(file);
  all.push(record);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(all, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

// ---------------------------------------------------------------- per asset

async function runAsset(apiKey, asset, { assetsDir, outDir, tasksFile }) {
  const dir = path.join(assetsDir, asset);
  const outFile = path.join(outDir, `${asset}.glb`);
  const outRel = path.relative(process.cwd(), outFile) || outFile;
  const summary = { asset, attempts: 0, waitedSec: 0, credits: 0, output: '-', status: 'failed' };

  for (const v of VIEWS) {
    if (!fs.existsSync(path.join(dir, `${v}.png`))) throw new Error(`${asset}: missing ${v}.png`);
  }

  log(`${asset}: uploading ${VIEWS.join(', ')}`);
  const tokens = {};
  for (const v of VIEWS) {
    tokens[v] = await uploadFile(apiKey, path.join(dir, `${v}.png`));
    log(`  ${v}.png -> ${tokens[v]}`);
  }

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    const seed = BASE_SEED + (attempt - 1);
    const body = {
      inputs: VIEWS.map((v) => ({ [v]: tokens[v] })),
      ...SETTINGS,
      model_seed: seed,
    };
    summary.attempts = attempt;

    log(`${asset}: attempt ${attempt}/${MAX_RETRIES + 1} (model_seed ${seed})`);
    console.log('Request body: POST ' + BASE_URL + '/generation/multiview-to-model');
    console.log(JSON.stringify(body, null, 2));

    const startedAt = ts();
    const taskId = await createTask(apiKey, body);
    log(`  created task ${taskId}`);
    const { result, status, waitedSec } = await pollTask(apiKey, taskId);
    const data = result.data || {};
    summary.waitedSec += waitedSec;
    summary.credits += Number(data.credits_consumed) || 0;

    const record = {
      asset,
      attempt,
      model_seed: seed,
      task_id: taskId,
      status,
      request: body,
      started_at: startedAt,
      ended_at: null,
      seconds_waited: Math.round(waitedSec * 10) / 10,
      output_file: null,
      result,
    };

    if (status === 'success') {
      const url = data.output && data.output.model_url;
      try {
        if (!url) throw new Error('task output has no model_url');
        const bytes = await download(url, outFile);
        record.output_file = path.relative(path.dirname(tasksFile), outFile).replace(/\\/g, '/');
        summary.output = outRel;
        log(`  saved ${outRel} (${bytes} bytes)`);
      } catch (err) {
        record.download_error = err.message;
        log(`  ERROR: task succeeded but download failed: ${err.message}`);
        summary.output = 'download failed';
      }
      record.ended_at = ts();
      appendTask(tasksFile, record);
      summary.status = 'success';
      return summary;
    }

    record.ended_at = ts();
    appendTask(tasksFile, record);
    log(`  attempt ${attempt} ended with status "${status}"` +
      (data.error_code != null ? ` error_code=${data.error_code}` : '') +
      (data.error_message ? `: ${data.error_message}` : ''));

    if (status === 'timeout') {
      // The task may still be running and billing; do not start another one.
      log(`  ${asset}: no terminal status after ${MAX_WAIT_MS / 1000}s; not retrying`);
      summary.status = 'timeout';
      return summary;
    }
    if (attempt <= MAX_RETRIES) log(`  retrying with model_seed ${seed + 1}`);
  }
  log(`${asset}: giving up after ${summary.attempts} attempts`);
  return summary;
}

// ---------------------------------------------------------------- main

function printTable(rows) {
  const head = ['asset', 'attempts', 'seconds waited', 'credits_consumed', 'output file'];
  const cells = rows.map((r) => [
    r.asset,
    String(r.attempts),
    r.waitedSec.toFixed(1),
    String(Math.round(r.credits * 100) / 100),
    r.output,
  ]);
  const widths = head.map((h, i) => Math.max(h.length, ...cells.map((c) => c[i].length)));
  const fmt = (c) => c.map((s, i) => s.padEnd(widths[i])).join(' | ');
  console.log('\n' + fmt(head));
  console.log(widths.map((w) => '-'.repeat(w)).join('-|-'));
  for (const c of cells) console.log(fmt(c));
}

async function main(opts = {}) {
  const root = opts.root || __dirname;
  const assetsDir = path.join(root, 'assets');
  const outDir = path.join(root, 'route-b');
  const tasksFile = path.join(outDir, 'tasks.json');

  const apiKey = process.env.TRIPO_API_KEY;
  if (!apiKey) {
    console.error('TRIPO_API_KEY is not set');
    process.exitCode = 1;
    return;
  }

  let assets = opts.assets && opts.assets.length ? opts.assets
    : fs.readdirSync(assetsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory()).map((d) => d.name).sort();

  const prior = readTasks(tasksFile); // validate before spending credits
  const rows = [];
  for (const asset of assets) {
    const done = prior.filter((r) => r.asset === asset && r.status === 'success');
    if (done.length) {
      const last = done[done.length - 1];
      const file = last.output_file ? path.join(outDir, last.output_file) : null;
      const exists = file && fs.existsSync(file);
      log(`${asset}: skipped, successful task ${last.task_id} already in tasks.json` +
        (exists ? '' : ' (WARNING: output file missing)'));
      rows.push({
        asset, attempts: 0, waitedSec: 0, credits: 0,
        output: exists ? path.relative(process.cwd(), file) + ' (skipped)' : 'skipped, file missing',
      });
      continue;
    }
    try {
      rows.push(await runAsset(apiKey, asset, { assetsDir, outDir, tasksFile }));
    } catch (err) {
      log(`${asset}: ERROR ${err.message}`);
      rows.push({ asset, attempts: 0, waitedSec: 0, credits: 0, output: `error: ${err.message}`.slice(0, 60) });
      if (err instanceof ApiError && [401, 403].includes(err.httpStatus)) {
        log('Authentication or credit error; stopping the batch.');
        break;
      }
    }
  }

  printTable(rows);
  if (rows.some((r) => !/\.glb/.test(r.output))) process.exitCode = 1;
  return rows;
}

export { main };

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main({ assets: process.argv.slice(2) }).catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
