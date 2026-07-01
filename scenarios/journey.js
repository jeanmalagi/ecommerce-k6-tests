import http from "k6/http";
import { check, fail, group, sleep } from "k6";

import {
  BASE_URL,
  DEFAULT_HEADERS,
  authHeaders,
} from "../config/env.js";

function parseJson(response) {
  try {
    return response.json();
  } catch (_error) {
    return null;
  }
}

// Token cached per VU — each VU authenticates once and reuses the token
// across all its iterations (module-level scope is per-VU in k6)
let vuToken = null;

function getVuToken() {
  if (vuToken) return vuToken;

  const email = `k6.vu${__VU}@loadtest.local`;
  const password = "K6Load@123";

  http.post(
    `${BASE_URL}/api/users/register`,
    JSON.stringify({ name: `K6 VU ${__VU}`, email, password }),
    {
      headers: DEFAULT_HEADERS,
      responseCallback: http.expectedStatuses(200, 201, 400),
    }
  );

  const loginRes = http.post(
    `${BASE_URL}/api/users/login`,
    JSON.stringify({ email, password }),
    { headers: DEFAULT_HEADERS }
  );

  const ok = check(loginRes, {
    "VU login is 200": (r) => r.status === 200,
    "VU login returned token": (r) => !!parseJson(r)?.token,
  });

  if (!ok) {
    fail(`VU ${__VU} login failed — status: ${loginRes.status}`);
  }

  vuToken = parseJson(loginRes).token;
  return vuToken;
}

// setup() only needs a product with stock — no auth required for GET /products
export function setupProduct() {
  const productsRes = http.get(`${BASE_URL}/api/products`);

  if (productsRes.status !== 200) {
    fail(`Could not list products. Status: ${productsRes.status}`);
  }

  const products = parseJson(productsRes) || [];
  const inStock = products.filter((p) => p.stock > 0);

  if (inStock.length === 0) {
    fail("No products with stock > 0 found. Replenish stock before running tests.");
  }

  return { productId: inStock[0].id };
}

export function runApiJourney(data) {
  const { productId } = data;
  const token = getVuToken();
  const userHeaders = authHeaders(token);

  group("public products", () => {
    const listRes = http.get(`${BASE_URL}/api/products`);
    check(listRes, {
      "GET /products is 200": (r) => r.status === 200,
    });

    const detailsRes = http.get(`${BASE_URL}/api/products/${productId}`);
    check(detailsRes, {
      "GET /products/:id is 200": (r) => r.status === 200,
    });
  });

  group("authenticated cart", () => {
    const getCartRes = http.get(`${BASE_URL}/api/cart`, { headers: userHeaders });
    check(getCartRes, {
      "GET /cart is 200": (r) => r.status === 200,
    });

    // Remove existing item for this product before adding — prevents quantity
    // accumulation across iterations that would exhaust stock
    const cartItems = parseJson(getCartRes)?.cart || [];
    const existing = cartItems.find((i) => i.product_id === productId);
    if (existing) {
      http.del(`${BASE_URL}/api/cart/${existing.id}`, null, {
        headers: userHeaders,
        responseCallback: http.expectedStatuses(200, 404),
      });
    }

    const addRes = http.post(
      `${BASE_URL}/api/cart`,
      JSON.stringify({ product_id: productId, quantity: 1 }),
      { headers: userHeaders }
    );
    check(addRes, {
      "POST /cart is 200 or 201": (r) => r.status === 200 || r.status === 201,
    });

    const cartAfterRes = http.get(`${BASE_URL}/api/cart`, { headers: userHeaders });
    check(cartAfterRes, {
      "GET /cart after insert is 200": (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 2 + 0.5);
}
