import { setupProduct, runApiJourney } from "../scenarios/journey.js";

const vus = Number(__ENV.VUS || 20);
const duration = __ENV.DURATION || "1m";

export const options = {
  stages: [
    { duration: "20s", target: Math.max(1, Math.floor(vus * 0.3)) },
    { duration: "40s", target: vus },
    { duration, target: vus },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    checks: ["rate>0.95"],
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
  },
};

export function setup() {
  return setupProduct();
}

export default function (data) {
  runApiJourney(data);
}
