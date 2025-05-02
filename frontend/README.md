# Realtime WebSocket Notification Frontend

A React-based frontend application that connects to a WebSocket server for real-time notifications.

## Project Structure

```
frontend/
├── src/
│   ├── core/           # Core application logic
│   │   ├── api/        # API client and endpoints
│   │   ├── components/ # Reusable UI components
│   │   ├── constants/  # Application constants
│   │   ├── hooks/      # Custom React hooks
│   │   └── types/      # TypeScript type definitions
│   ├── features/       # Feature-specific components and logic
│   │   └── notifications/ # Notification-related features
│   ├── pages/         # Page components
│   ├── App.tsx        # Main application component
│   ├── main.tsx       # Application entry point
│   └── index.css      # Global styles
├── public/            # Public assets
└── package.json       # Project dependencies
```

## Features

- Real-time WebSocket notifications
- Authentication system
- Modern React with TypeScript
- Tailwind CSS for styling
- Sonner toast notifications
- Protected routes
- Responsive design

## Prerequisites

- Node.js 16+
- npm or yarn

## Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
```

## Running the Application

Start the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

## Building for Production

Create a production build:

```bash
npm run build
# or
yarn build
```

## Development

The project uses:

- React with TypeScript
- Vite as the build tool
- Tailwind CSS for styling
- ESLint for code quality
- WebSocket for real-time communication
- React Router for navigation
- Sonner for toast notifications

## Project Configuration

- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `eslint.config.js` - ESLint configuration
- `components.json` - UI components configuration

# WebSocket Authentication Process Q&A

## Q: Bagaimana alur autentikasi WebSocket bekerja?

A: Alur autentikasi WebSocket terdiri dari beberapa tahap:

1. **Login dan Token**

   - User melakukan login melalui API
   - Mendapatkan access token sebagai response
   - Token disimpan di localStorage

2. **Inisialisasi WebSocket**

   - Frontend menginisialisasi koneksi WebSocket
   - Token ditambahkan sebagai query parameter di URL WebSocket
   - URL format: `ws://localhost:8000/api/ws/notification?token=<access_token>`

3. **Koneksi WebSocket**

   - Frontend mencoba terhubung ke WebSocket
   - State koneksi berubah: `initial` → `connecting` → `connected`
   - Setelah terhubung, frontend mengirim pesan autentikasi

4. **Pesan Autentikasi**

   - Frontend mengirim pesan dengan format:

   ```json
   {
     "type": "auth",
     "payload": {
       "token": "<access_token>"
     }
   }
   ```

   - Server memvalidasi token
   - Server mengirim response `auth_success` jika valid

5. **Keepalive**
   - Setelah autentikasi berhasil, mekanisme keepalive dimulai
   - Frontend mengirim PING
   - Server merespons dengan PONG
   - Ini menjaga koneksi tetap aktif

## Q: Mengapa perlu mengirim pesan autentikasi setelah koneksi WebSocket terbuka?

A: Ada beberapa alasan penting:

1. **Keamanan Ganda**

   - Token di URL memvalidasi koneksi WebSocket
   - Pesan autentikasi memvalidasi bahwa client memiliki token yang valid
   - Mencegah penggunaan token yang tidak sah

2. **State Management**

   - Server bisa memastikan client dalam state yang benar
   - Client mendapatkan konfirmasi autentikasi berhasil
   - Membantu sinkronisasi state antara client dan server

3. **Best Practice**
   - Ini adalah pola umum dalam implementasi WebSocket yang aman
   - Memberikan fleksibilitas untuk logika autentikasi tambahan
   - Memudahkan debugging dan monitoring

## Q: Bagaimana cara menangani error dalam proses autentikasi?

A: Error handling dilakukan di beberapa level:

1. **Level Koneksi**

   - Jika koneksi gagal, WebSocket akan mencoba reconnect
   - Jumlah percobaan reconnect bisa dikonfigurasi
   - Setelah max attempts, akan emit event `reconnect_failed`

2. **Level Autentikasi**

   - Jika token tidak valid, server mengirim `auth_error`
   - Frontend menangani `auth_error` dan bisa:
     - Membersihkan token
     - Redirect ke halaman login
     - Menampilkan pesan error ke user

3. **Level Keepalive**
   - Jika PING tidak mendapat PONG, koneksi dianggap mati
   - WebSocket akan mencoba reconnect
   - User bisa diberi notifikasi tentang status koneksi

## Q: Bagaimana cara mengimplementasikan WebSocket di frontend?

A: Implementasi menggunakan `WebSocketManager`:

1. **Inisialisasi**

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

## Q: What are the possible states in a WebSocket connection?

A: WebSocket connection states:

1. **INITIAL**

   - Initial state before connection is started
   - WebSocket is not yet initialized

2. **CONNECTING**

   - Attempting to connect to the server
   - Waiting for connection to open

3. **CONNECTED**

   - Connection successfully opened
   - Authentication successful
   - Ready to send and receive messages

4. **DISCONNECTING**

   - Currently disconnecting
   - Cleaning up resources

5. **DISCONNECTED**

   - Connection is closed
   - Could be due to error or intentional disconnect
   - Ready for reconnect if desired

6. **RECONNECTING**

   - Attempting to reconnect after a disconnection
   - Using exponential backoff strategy
   - Limited by max reconnect attempts

7. **FAILED**
   - Maximum reconnect attempts reached
   - Connection cannot be established
   - Requires manual intervention to retry
