export const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const TEST_USER = {
  name: __ENV.TEST_USER_NAME || "K6 Runner",
  email: __ENV.TEST_USER_EMAIL || "k6.runner@example.com",
  password: __ENV.TEST_USER_PASSWORD || "123456",
};

export const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

export function authHeaders(token) {
  return {
    ...DEFAULT_HEADERS,
    Authorization: `Bearer ${token}`,
  };
}
