import http from "k6/http";
import { check, fail } from "k6";

import { BASE_URL } from "../config/env.js";

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ["rate==1.0"],
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<2000"],
  },
};

export default function () {
  const url = `${BASE_URL}/api/products`;
  const res = http.get(url, { timeout: "15s" });

  const ok = check(res, {
    "preflight GET /api/products is 200": (r) => r.status === 200,
  });

  if (!ok) {
    const bodySample = (res.body || "").slice(0, 200);
    fail(
      `Preflight falhou para ${url}. status=${res.status} error=${res.error || "n/a"} body=${bodySample}`
    );
  }
}
