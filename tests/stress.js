import { setupProduct, runApiJourney } from "../scenarios/journey.js";

export const options = {
  stages: [
    { duration: "20s", target: 20 },
    { duration: "30s", target: 60 },
    { duration: "40s", target: 120 },
    { duration: "30s", target: 180 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    checks: ["rate>0.90"],
    http_req_failed: ["rate<0.10"],
    http_req_duration: ["p(95)<3000"],
  },
};

export function setup() {
  return setupProduct();
}

export default function (data) {
  runApiJourney(data);
}
