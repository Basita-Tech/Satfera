import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const matchingLatency = new Trend("matching_latency");
const connectionLatency = new Trend("connection_latency");

export const options = {
  scenarios: {
    matching_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 20 },
        { duration: "2m", target: 20 },
        { duration: "30s", target: 0 }
      ],
      exec: "matchingTest"
    },

    connection_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 10 },
        { duration: "30s", target: 0 }
      ],
      exec: "connectionTest",
      startTime: "30s"
    }
  },
  thresholds: {
    matching_latency: ["p(95)<2000"],
    connection_latency: ["p(95)<1000"],
    errors: ["rate<0.05"],
    http_req_duration: ["p(99)<3000"]
  }
};

const BASE_URL = __ENV.BASE_URL || "http://127.0.0.1:8000";

const AUTH_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NDI0OGM1MGE1YWY3ZGVjZDk0YjdkOSIsImp0aSI6IjE3NjYxNDYwMTEzMTgtZjhjMDM0MTMxY2FlYzg3NWY0M2IxOWQyOGQ5YWE3YmMiLCJpYXQiOjE3NjYxNDYwMTEsImV4cCI6MTc2Njc1MDgxMX0.yzWRw8xPLSBdb7OyrFkY_EsXlorPza5bGcQBhw3_WjQ";

function getHeaders(token) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

export function setup() {
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    throw new Error(`Server health check failed: ${res.status}`);
  }

  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({
      email: "user0@a.com",
      password: "Sanjay@1"
    }),
    { headers: { "Content-Type": "application/json" } }
  );

  let token = "";

  if (loginRes.status === 200) {
    try {
      const body = loginRes.json();

      if (body && body.token) {
        token = body.token;
        console.log("Login successful, token obtained.");
      } else {
        console.error("Login response missing token field");
        console.log("Response body:", loginRes.body);
      }
    } catch (e) {
      console.error("Failed to parse login response JSON", e);
      console.log("Raw response:", loginRes.body);
    }
  } else {
    console.warn(`Login failed with status ${loginRes.status}`);
  }

  if (!token && AUTH_TOKEN) {
    token = AUTH_TOKEN;
    console.warn("Using static AUTH_TOKEN as fallback.");
  }

  return {
    baseUrl: BASE_URL,
    token
  };
}

export function matchingTest(data) {
  const headers = getHeaders(data.token);

  group("Get Matching Users", function () {
    const startTime = Date.now();

    const matchRes = http.get(`${data.baseUrl}/api/v1/matches`, { headers });

    matchingLatency.add(Date.now() - startTime);

    const checkRes = check(matchRes, {
      "matches status is expected": (r) =>
        [200, 401, 403, 429].includes(r.status),
      "matches response is valid JSON": (r) => {
        try {
          r.json();
          return true;
        } catch {
          return false;
        }
      }
    });
    errorRate.add(!checkRes);

    if (matchRes.status === 200) {
      check(matchRes, {
        "matches has success flag": (r) => r.json().success === true,
        "matches has data array": (r) => Array.isArray(r.json().data)
      });
    }
  });

  sleep(Math.random() * 3 + 2);

  group("Get Profile Details", function () {
    const profileRes = http.get(`${data.baseUrl}/api/v1/user/profile`, {
      headers
    });

    const checkRes = check(profileRes, {
      "profile status is expected": (r) =>
        [200, 401, 403, 429].includes(r.status)
    });
    errorRate.add(!checkRes);
  });

  sleep(Math.random() * 2 + 1);
}

export function connectionTest(data) {
  const headers = getHeaders(data.token);

  group("Get Connections", function () {
    const startTime = Date.now();

    const connRes = http.get(`${data.baseUrl}/api/v1/requests/approve`, {
      headers
    });

    connectionLatency.add(Date.now() - startTime);

    const checkRes = check(connRes, {
      "connections status is expected": (r) =>
        [200, 401, 403, 429].includes(r.status),
      "connections response is valid": (r) => {
        try {
          r.json();
          return true;
        } catch {
          return false;
        }
      }
    });
    errorRate.add(!checkRes);
  });

  sleep(Math.random() * 2 + 1);

  group("Get Sent Requests", function () {
    const sentRes = http.get(`${data.baseUrl}/api/v1/requests/all`, {
      headers
    });

    const checkRes = check(sentRes, {
      "sent requests status is expected": (r) =>
        [200, 401, 403, 429].includes(r.status)
    });
    errorRate.add(!checkRes);
  });

  sleep(Math.random() * 2 + 1);

  group("Get Received Requests", function () {
    const receivedRes = http.get(
      `${data.baseUrl}/api/v1/requests/all/received`,
      { headers }
    );

    const checkRes = check(receivedRes, {
      "received requests status is expected": (r) =>
        [200, 401, 403, 429].includes(r.status)
    });
    errorRate.add(!checkRes);
  });

  sleep(Math.random() + 1);
}

export function teardown(data) {
  console.log("Matching service load test completed");
}
