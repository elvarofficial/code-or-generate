I wrote `tripo.js` and tested it against a local mock of the Tripo API. It has not been run against the real API, since there's no key in this session.

**What it does**
- Runs every folder in `assets/` by default. To run just some, name them: `node tripo.js 01-crate`.
- Uploads `front.png`, `left.png` and `back.png` once per asset to `POST /v3/files`, which returns a `file_token` for each.
- Sends this body to `POST /v3/generation/multiview-to-model`, printing it first:
  ```json
  { "inputs": [{"front": "<token>"}, {"left": "<token>"}, {"back": "<token>"}],
    "model": "P2-20260801", "face_limit": 20000, "texture": true, "pbr": true, "model_seed": 42 }
  ```
- Checks `GET /v3/tasks/{id}` every 5 seconds until the task ends. The docs list `cancelled`, `banned` and `expired` as end states too, so those count as failures along with `failed`.
- On success, downloads `output.model_url` straight away to `route-b/<asset>.glb`. The docs say these links expire after about 5 minutes.
- On failure, retries with `model_seed` 43, then 44, and logs every attempt.
- Adds a record for every attempt, failed ones included, to `route-b/tasks.json`. Each record has the full task result, the request body, the seed, `started_at`, `ended_at` and seconds waited. Assets with a `success` record are skipped on later runs.
- Ends by printing the table you asked for. Waiting time and credits are added up across attempts.

**Checks I ran (local mock server, copy of the assets in the scratchpad)**
- `node --check` passes.
- First run: one asset succeeded first time, one succeeded on its second attempt (seed 43), and one failed all three attempts (seeds 42, 43, 44). Each attempt was logged and recorded, and the table was correct.
- Second run: the five successful assets were skipped without any API calls, and only the failed asset ran again.
- A failed download is recorded as `download_error` and shown in the table.
- The real `route-b/` is still empty.

**Things to know**
- **Module format:** `D:\elvar\cog-runs\package.json` sets `"type": "module"`, so the script uses ES module imports.
- **API host:** the docs list only one, `https://openapi.tripo3d.com/v3`. You can point the script elsewhere with `TRIPO_BASE_URL`.
- **Busy or server errors:** if the API says it's busy (HTTP 429), the script waits and tries again. If creating a task gets a server error (5xx), it does not resend, because the docs warn the task may have been created anyway.
- **Stopping early:** a 401 or 403 (bad key or no credits) stops the whole batch. A task still unfinished after 30 minutes is recorded as `timeout` and not retried, because it may still be running and using credits.
- **Retry costs:** retries reuse the uploaded files. A retry with a new seed is a new task and will use credits again.
- **Lost downloads:** if a task succeeds but the download fails, the asset is still marked successful and gets skipped next time. The link will have expired by then, so the table shows "download failed". To redo that asset, delete its record from `tasks.json`.
- **Exit code:** the script exits with code 1 if any asset ends without a `.glb`.

To run it: `TRIPO_API_KEY=... node tripo.js`. The mock test is at `C:\Users\user_\AppData\Local\Temp\claude\d5f8d63649f02ead\2ec7d0e1-8225-452b-a23d-8a031d7abae5\scratchpad\mock-test.cjs` if you want to run it again.