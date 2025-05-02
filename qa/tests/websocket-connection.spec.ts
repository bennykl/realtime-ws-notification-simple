import { test, expect, WebSocketRoute } from "@playwright/test";
import { CONNECTION_STATES } from "../../frontend/src/core/constants/websocket";

// Declare getConnectionState type in window
declare global {
  interface Window {
    getConnectionState: () => string;
  }
}

// Configure tests to run in a single browser instance
test.use({
  headless: false, // Show browser window
  launchOptions: {
    slowMo: 50, // Slow down operations for better visibility
  },
});

// Use describe.serial to run tests sequentially
test.describe.serial("WebSocket Connection Tests", () => {
  let accessToken: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to the application before each test
    await page.goto("http://localhost:3000");
  });

  const loginAndGetToken = async (
    page: any,
    username: string,
    password: string
  ) => {
    // Click login button
    await page.locator('[data-testid="login-button"]').click();

    // Fill in credentials
    await page.locator('[data-testid="username-input"]').fill(username);
    await page.locator('[data-testid="password-input"]').fill(password);

    // Intercept the login response to get the token
    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/api/auth/login") && response.status() === 200
    );

    // Click login button
    await page.locator('[data-testid="login-button"]').click();

    // Wait for the login response
    const loginResponse = await loginResponsePromise;
    const responseBody = await loginResponse.json();
    accessToken = responseBody.access_token;

    return `ws://localhost:8000/api/ws/notification?token=${accessToken}`;
  };

  test("should not establish WebSocket connection before login", async ({
    page,
  }) => {
    // Verify we're on home page
    await expect(
      page.getByText("Welcome to Real-time Notification System")
    ).toBeVisible();

    // Click login button
    await page.locator('[data-testid="login-button"]').click();

    // Verify we're on login page
    await expect(page.locator('[data-testid="login-page"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-title"]')).toHaveText(
      "Login"
    );

    // Check that no WebSocket connection is established
    const wsPromise = page
      .waitForEvent("websocket", { timeout: 5000 })
      .catch(() => null);

    // Wait a bit to ensure no connection is established
    await page.waitForTimeout(2000);
    await page.reload();

    const ws = await wsPromise;
    expect(ws).toBeNull();
  });

  test("should handle unexpected disconnection and auto-reconnect with state preservation", async ({
    page,
  }) => {
    const wsUrl = await loginAndGetToken(page, "user1", "wkwkwk");
    let connectionState: keyof typeof CONNECTION_STATES = "INITIAL";
    let lastMessage = null;
    let reconnectionAttempts = 0;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    // Set up WebSocket route
    await page.routeWebSocket(wsUrl, async (ws) => {
      // Connect to the actual server
      const server = ws.connectToServer();

      // Handle incoming messages
      ws.onMessage(async (message) => {
        const data = JSON.parse(message);
        lastMessage = data;

        if (data.type === "auth") {
          // Server validates token and responds with auth_success
          ws.send(
            JSON.stringify({
              type: "auth_success",
              payload: { user_id: "user1" },
            })
          );
        } else if (data.type === "auth_success") {
          connectionState = "CONNECTED";
          // Start keepalive mechanism
          heartbeatInterval = setInterval(() => {
            ws.send(JSON.stringify({ type: "heartbeat" }));
          }, 30000);
        } else if (data.type === "heartbeat") {
          // Server responds to heartbeat
          ws.send(JSON.stringify({ type: "heartbeat_response" }));
        }
      });

      // Simulate different disconnection scenarios
      const scenarios = [
        {
          delay: 1000,
          code: 1006,
          reason: "Network offline",
          type: "network",
        },
        {
          delay: 2000,
          code: 1013,
          reason: "Server is down for maintenance",
          type: "server",
        },
        {
          delay: 3000,
          code: 1000,
          reason: "Connection timeout",
          type: "timeout",
        },
      ];

      scenarios.forEach((scenario) => {
        setTimeout(() => {
          connectionState = "DISCONNECTED";
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
          }
          ws.close(scenario);
        }, scenario.delay);
      });

      // Handle reconnection
      ws.onClose(async () => {
        reconnectionAttempts++;
        connectionState = "RECONNECTING";

        // Simulate reconnection after delay with exponential backoff
        const backoffDelay = Math.min(
          1000 * Math.pow(2, reconnectionAttempts),
          30000
        );
        setTimeout(async () => {
          const newWs = await page.routeWebSocket(wsUrl, (ws) => {
            const server = ws.connectToServer();
            connectionState = "CONNECTING";

            ws.onMessage(async (message) => {
              const data = JSON.parse(message);
              if (data.type === "auth") {
                // Server validates token and responds with auth_success
                ws.send(
                  JSON.stringify({
                    type: "auth_success",
                    payload: { user_id: "user1" },
                    last_message: lastMessage,
                  })
                );
              } else if (data.type === "auth_success") {
                connectionState = "CONNECTED";
                // Restart keepalive mechanism
                heartbeatInterval = setInterval(() => {
                  ws.send(JSON.stringify({ type: "heartbeat" }));
                }, 30000);
              }
            });
          });
        }, backoffDelay);
      });
    });

    // Test initial connection and authentication
    await page.waitForTimeout(1000);
    expect(connectionState).toBe("CONNECTED");

    // Test disconnection scenarios
    await page.waitForTimeout(4000);
    expect(connectionState).toBe("DISCONNECTED");
    expect(reconnectionAttempts).toBeGreaterThan(0);

    // Test reconnection
    await page.waitForTimeout(3000);
    expect(connectionState).toBe("CONNECTED");
    expect(lastMessage).not.toBeNull();
  });

  test("should handle unstable connection with smart retry mechanism", async ({
    page,
  }) => {
    const wsUrl = await loginAndGetToken(page, "user2", "password2");
    let connectionAttempts = 0;
    let lastHeartbeatTime = 0;
    let connectionQuality = "good";

    // Set up WebSocket route with unstable connection simulation
    await page.routeWebSocket(wsUrl, async (ws) => {
      connectionAttempts++;
      console.log(`Connection attempt ${connectionAttempts}`);

      // Simulate poor connection quality
      ws.onMessage(async (message) => {
        const data = JSON.parse(message);
        if (data.type === "heartbeat") {
          // Randomly drop some heartbeats
          if (Math.random() > 0.3) {
            connectionQuality = "poor";
            ws.send(
              JSON.stringify({
                type: "heartbeat_response",
                quality: "poor",
                latency: Math.random() * 1000,
                timestamp: Date.now(),
              })
            );
            lastHeartbeatTime = Date.now();
          } else {
            connectionQuality = "dropped";
          }
        }
      });

      // Simulate connection drops with increasing intervals
      setTimeout(() => {
        console.log(`Connection ${connectionAttempts} dropped`);
        ws.close({
          code: 1006,
          reason: "Connection unstable",
        });
      }, 1000 * connectionAttempts);
    });

    // Wait for multiple connection attempts
    await page.waitForTimeout(5000);
    expect(connectionAttempts).toBeGreaterThan(1);
    expect(lastHeartbeatTime).toBeGreaterThan(0);
    expect(connectionQuality).toBe("poor");
  });

  test("should handle server down scenario with graceful degradation", async ({
    page,
  }) => {
    const wsUrl = await loginAndGetToken(page, "admin", "wkwkwk");
    let serverDown = false;
    let serverBackOnline = false;
    let serverStatus = "up";

    // Set up WebSocket route with server down simulation
    await page.routeWebSocket(wsUrl, async (ws) => {
      console.log("Server status:", serverStatus);

      // Simulate server down immediately
      serverStatus = "down";
      ws.close({
        code: 1013,
        reason: "Server is down for maintenance",
      });
      serverDown = true;

      // Simulate server coming back online after 5 seconds
      setTimeout(async () => {
        console.log("Server coming back online");
        serverStatus = "recovering";
        const newWs = await page.routeWebSocket(wsUrl, (ws) => {
          ws.onMessage(async (message) => {
            const data = JSON.parse(message);
            if (data.type === "reconnect") {
              serverStatus = "up";
              ws.send(
                JSON.stringify({
                  type: "server_online",
                  status: "ok",
                  message: "Server is back online",
                  timestamp: Date.now(),
                })
              );
              serverBackOnline = true;
            }
          });
        });
      }, 5000);
    });

    // Wait for server down
    await page.waitForTimeout(1000);
    expect(serverDown).toBe(true);
    expect(serverStatus).toBe("down");

    // Wait for server to come back online
    await page.waitForTimeout(6000);
    expect(serverBackOnline).toBe(true);
    expect(serverStatus).toBe("up");
  });

  test("should handle connection timeout with keep-alive mechanism", async ({
    page,
  }) => {
    const wsUrl = await loginAndGetToken(page, "user1", "wkwkwk");
    let timeoutDetected = false;
    let reconnected = false;
    let lastActivity = 0;

    // Set up WebSocket route with timeout simulation
    await page.routeWebSocket(wsUrl, async (ws) => {
      lastActivity = Date.now();

      // Handle keep-alive messages
      ws.onMessage(async (message) => {
        const data = JSON.parse(message);
        if (data.type === "heartbeat") {
          lastActivity = Date.now();
          ws.send(
            JSON.stringify({
              type: "heartbeat_response",
              timestamp: Date.now(),
              status: "ok",
            })
          );
        }
      });

      // Simulate timeout after 30 seconds of inactivity
      const checkTimeout = setInterval(() => {
        if (Date.now() - lastActivity > 30000) {
          console.log("Connection timeout detected");
          timeoutDetected = true;
          ws.close({
            code: 1000,
            reason: "Connection timeout",
          });
          clearInterval(checkTimeout);
        }
      }, 1000);
    });

    // Wait for timeout
    await page.waitForTimeout(35000);
    expect(timeoutDetected).toBe(true);
    expect(Date.now() - lastActivity).toBeGreaterThan(30000);

    // Wait for reconnection
    const newWs = await page.waitForEvent("websocket", { timeout: 10000 });
    await page.waitForTimeout(2000);
    expect(newWs.url()).toBe(wsUrl);
  });
});
