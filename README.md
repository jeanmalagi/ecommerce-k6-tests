# ecommerce-k6-tests

k6 project for load and stress tests against the ecommerce backend API.

## Covered flow

- Register/login test user
- List products
- Read product details
- Read cart (authenticated)
- Add product to cart (authenticated)
- Read cart again

## Requirements

- Backend running at `http://localhost:3000` (or set `BASE_URL`)
- At least one product available in database
- k6 installed locally OR Docker installed

## Configure environment

Create `.env` from `.env.example` and adjust values.

Windows PowerShell example:

```powershell
$env:BASE_URL="http://localhost:3000"
$env:TEST_USER_EMAIL="k6.runner@example.com"
$env:TEST_USER_PASSWORD="123456"
```

## Run tests (k6 local)

```bash
npm run smoke
npm run load
npm run stress
```

## Run tests (Docker, PowerShell)

```powershell
docker run --rm -i --network host -v "${PWD}:/work" -w /work grafana/k6 run tests/smoke.js
docker run --rm -i --network host -v "${PWD}:/work" -w /work grafana/k6 run tests/load.js
docker run --rm -i --network host -v "${PWD}:/work" -w /work grafana/k6 run tests/stress.js
```

## Optional tuning

You can override load scenario intensity:

```powershell
$env:VUS="40"
$env:DURATION="2m"
npm run load
```

## Notes

- `smoke` validates if basic API flow is working.
- `load` simulates sustained usage.
- `stress` increases pressure until degradation.
- Threshold failures indicate potential performance bottlenecks.

## Allure report

The Jenkins pipeline converts k6 summary JSON files from `results/` into
`allure-results/` and then generates an HTML report at `allure-report/`.

Local example (after running k6 and generating summaries):

```powershell
node scripts/k6-summary-to-allure.js --inputDir results --outputDir allure-results
npx --yes allure-commandline@2.34.1 generate allure-results --clean -o allure-report --single-file
```

Then open `allure-report/index.html` in a browser.

## Troubleshooting CI failures

If all scenarios fail with threshold errors (`checks`, `http_req_failed`,
`http_req_duration`) at the same time, the target API may be unreachable from
inside Docker.

Tips:

- In Jenkins, set `BASE_URL` to an address reachable from the Docker container.
- For API running on the same host as Jenkins agent, try `http://host.docker.internal:3000`.
- Confirm endpoint health: `GET /api/products` should return HTTP 200 before k6 stages.
