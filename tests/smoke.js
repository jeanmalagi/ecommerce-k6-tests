import { setupProduct, runApiJourney } from "../scenarios/journey.js";

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ["rate>0.95"],
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1000"],
  },
};

export function setup() {
  return setupProduct();
}

export default function (data) {
  runApiJourney(data);
}
