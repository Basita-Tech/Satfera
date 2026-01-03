import http from "k6/http";
import { check, sleep, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("errors");
const authLatency = new Trend("auth_latency");

export const options = {
    stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 100 },
        { duration: "30s", target: 0 },
    ],
    thresholds: {
        http_req_duration: ["p(95)<500"],
        errors: ["rate<0.1"],
        auth_latency: ["p(95)<1000"],
    },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";

export function setup() {
    const res = http.get(`${BASE_URL}/health`);
    if (res.status !== 200) {
        throw new Error(`Server health check failed: ${res.status}`);
    }
    console.log("Server is healthy, starting load test...");
    return { baseUrl: BASE_URL };
}

export default function (data) {
    group("Health Check", function () {
        const healthRes = http.get(`${data.baseUrl}/health`);

        check(healthRes, {
            "health status is 200": (r) => r.status === 200,
            "health response is valid": (r) => {
                try {
                    const body = r.json();
                    return body.status === "OK";
                } catch {
                    return false;
                }
            },
        }) || errorRate.add(1);
    });

    sleep(0.5);

    group("Authentication Endpoints", function () {

        const startTime = Date.now();

        const loginRes = http.post(
            `${data.baseUrl}/api/v1/auth/login`,
            JSON.stringify({
                email: `loadtest_${Date.now()}@example.com`,
                password: "testpassword123",
            }),
            {
                headers: { "Content-Type": "application/json" },
            }
        );

        authLatency.add(Date.now() - startTime);


        check(loginRes, {
            "is rate limited or successful": (r) => [200, 401, 429].includes(r.status),
        });
        check(loginRes, {
            "login response received": (r) => r.status !== 0,
            "login returns expected status": (r) => [400, 401, 404, 429].includes(r.status),
        }) || errorRate.add(1);


        check(loginRes, {
            "has rate limit header": (r) => r.headers["X-Ratelimit-Limit"] !== undefined,
        });
    });

    sleep(Math.random() * 2 + 1);

    group("Public Endpoints", function () {

        const rootRes = http.get(`${data.baseUrl}/`);

        check(rootRes, {
            "root status is 200": (r) => r.status === 200,
            "root has success flag": (r) => {
                try {
                    return r.json().success === true;
                } catch {
                    return false;
                }
            },
        }) || errorRate.add(1);
    });

    sleep(Math.random() + 0.5);
}

export function teardown(data) {
    console.log("Load test completed");
}
