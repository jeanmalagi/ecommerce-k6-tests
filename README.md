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
