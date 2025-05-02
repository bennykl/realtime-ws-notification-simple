# WebSocket Authentication Process Q&A

## Q: How does the WebSocket authentication flow work?

A: The WebSocket authentication flow consists of several stages:

1. **Login and Token**

   - User performs login through API
   - Receives access token as response
   - Token is stored in localStorage

2. **WebSocket Initialization**

   - Frontend initializes WebSocket connection
   - Token is added as query parameter in WebSocket URL
   - URL format: `ws://localhost:8000/api/ws/notification?token=<access_token>`

3. **WebSocket Connection**

   - Frontend attempts to connect to WebSocket
   - Connection state changes: `initial` → `connecting` → `connected`
   - After connection, frontend sends authentication message

4. **Authentication Message**

   - Frontend sends message with format:

   ```json
   {
     "type": "auth",
     "payload": {
       "token": "<access_token>"
     }
   }
   ```

   - Server validates token
   - Server sends `auth_success` response if valid

5. **Keepalive**
   - After successful authentication, keepalive mechanism starts
   - Frontend sends PING
   - Server responds with PONG
   - This maintains the connection active

## Q: Why is it necessary to send an authentication message after WebSocket connection is established?

A: There are several important reasons:

1. **Double Security**

   - Token in URL validates WebSocket connection
   - Authentication message validates that client has a valid token
   - Prevents unauthorized token usage

2. **State Management**

   - Server can ensure client is in correct state
   - Client receives authentication confirmation
   - Helps synchronize state between client and server

3. **Best Practice**
   - This is a common pattern in secure WebSocket implementations
   - Provides flexibility for additional authentication logic
   - Facilitates debugging and monitoring

## Q: How to handle errors in the authentication process?

A: Error handling is implemented at multiple levels:

1. **Connection Level**

   - If connection fails, WebSocket will attempt to reconnect
   - Number of reconnect attempts can be configured
   - After max attempts, emits `reconnect_failed` event

2. **Authentication Level**

   - If token is invalid, server sends `auth_error`
   - Frontend handles `auth_error` and can:
     - Clear token
     - Redirect to login page
     - Display error message to user

3. **Keepalive Level**
   - If PING doesn't receive PONG, connection is considered dead
   - WebSocket will attempt to reconnect
   - User can be notified about connection status

## Q: How to implement WebSocket in frontend?

A: Implementation using `WebSocketManager`:

1. **Initialization**

   ```typescript
   const wsManager = WebSocketManager.getInstance({
     url: ENV.WS_URL,
     authToken: token,
     autoConnect: true,
     autoReconnect: true,
   });
   ```

2. **Event Handling**

   ```typescript
   wsManager.on("connected", () => {
     console.log("WebSocket connected");
   });

   wsManager.on("auth_success", (payload) => {
     console.log("Authentication successful", payload);
   });

   wsManager.on("error", (error) => {
     console.error("WebSocket error", error);
   });
   ```

3. **Cleanup**
   ```typescript
   wsManager.destroy();
   ```

## Q: What are the possible states in WebSocket connection?

A: WebSocket connection states:

1. **INITIAL**

   - Initial state before connection starts
   - WebSocket not yet initialized

2. **CONNECTING**

   - Attempting to connect to server
   - Waiting for connection to open

3. **CONNECTED**

   - Connection successfully opened
   - Authentication successful
   - Ready to send and receive messages

4. **DISCONNECTING**

   - Currently disconnecting
   - Cleaning up resources

5. **DISCONNECTED**
   - Connection terminated
   - Could be due to error or intentional disconnect
   - Ready for reconnect if desired

## Q: How to handle different types of connection issues in WebSocket?

A: WebSocket handles various connection issues differently:

1. **Network Issues (WiFi/Internet Down)**

   ```typescript
   // Using browser's native network detection
   const handleOffline = () => {
     if (socket) {
       setConnectionState(CONNECTION_STATES.DISCONNECTED);
       disconnect(1000, "Network offline");
     }
   };

   const handleOnline = () => {
     if (connectionState === CONNECTION_STATES.DISCONNECTED) {
       connect();
     }
   };
   ```

   - Detected via `navigator.onLine`
   - Triggers `online`/`offline` events
   - Works with both real network changes and DevTools Network offline mode

2. **Backend Server Down**

   ```typescript
   // WebSocket close event with specific error codes
   const handleClose = (event: CloseEvent) => {
     if (event.code === 1006) {
       // Abnormal closure
       setConnectionState(CONNECTION_STATES.DISCONNECTED);
       scheduleReconnect();
     }
   };
   ```

   - Detected via WebSocket close events
   - Different error codes indicate different issues
   - Auto-reconnect with exponential backoff

3. **Authentication Issues**

   ```typescript
   // Handling auth errors from server
   wsManager.on("auth_error", (error) => {
     setConnectionState(CONNECTION_STATES.DISCONNECTED);
     // Clear invalid token
     localStorage.removeItem("token");
     // Redirect to login
     navigate("/login");
   });
   ```

   - Server sends `auth_error` message
   - Client handles by clearing token and redirecting
   - Prevents infinite reconnect attempts

4. **Connection States and Recovery**

   | Issue Type         | Detection Method      | Recovery Strategy               |
   | ------------------ | --------------------- | ------------------------------- |
   | Network Down       | `navigator.onLine`    | Auto-reconnect when back online |
   | Server Down        | WebSocket close event | Exponential backoff retry       |
   | Auth Failed        | Server message        | Clear token, redirect to login  |
   | Connection Timeout | No heartbeat response | Reconnect with backoff          |
