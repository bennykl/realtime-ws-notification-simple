# Real-time WebSocket Notification System

A full-stack real-time notification system built with React (Frontend) and FastAPI (Backend), featuring WebSocket communication, JWT authentication, and priority-based notifications. This system allows for real-time communication between server and clients, with support for company and role-based targeting.

## System Overview

### Frontend (React + TypeScript)

- **Core Features**:

  - Real-time notifications via WebSocket
  - JWT-based authentication
  - Responsive dashboard
  - Priority-based notification system
  - Company and role-based notification filtering

- **Technical Stack**:

  - React 18 with TypeScript
  - Vite for build tooling
  - TailwindCSS for styling
  - Shadcn UI components
  - Axios for API communication
  - WebSocket for real-time updates

- **Project Structure**:
  ```
  frontend/
  ├── src/
  │   ├── core/           # Core infrastructure
  │   │   ├── api/        # API client and endpoints
  │   │   ├── config/     # Configuration settings
  │   │   ├── contexts/   # React contexts
  │   │   ├── hooks/      # Custom React hooks
  │   │   ├── providers/  # Context providers
  │   │   ├── types/      # TypeScript types
  │   │   ├── utils/      # Utility functions
  │   │   └── websocket/  # WebSocket implementation
  │   ├── features/       # Feature-specific code
  │   ├── components/     # Shared components
  │   ├── pages/         # Page components
  │   ├── routes/        # Route definitions
  │   ├── store/         # State management
  │   ├── lib/           # Third-party integrations
  │   └── assets/        # Static assets
  ```

### Backend (FastAPI + Python)

- **Core Features**:

  - WebSocket server for real-time communication
  - JWT authentication
  - Company and role-based notification system
  - RESTful API endpoints
  - Broadcast functionality

- **Technical Stack**:

  - FastAPI framework
  - WebSocket support
  - JWT authentication
  - SQLAlchemy for database operations
  - Pydantic for data validation

- **Project Structure**:
  ```
  backend/
  ├── src/
  │   ├── api/           # API routes and endpoints
  │   │   ├── auth.py    # Authentication endpoints
  │   │   ├── notifications.py # Notification endpoints
  │   │   ├── websocket.py # WebSocket endpoints
  │   │   ├── broadcast.py # Broadcast endpoints
  │   │   ├── endpoints/  # Additional API endpoints
  │   │   └── websocket/  # WebSocket-related handlers
  │   ├── core/          # Core application logic
  │   ├── services/      # Business logic services
  │   ├── config/        # Configuration settings
  │   ├── utils/         # Utility functions
  │   └── tests/         # Test files
  ```

## Features

### Real-time Notifications

- Instant delivery of notifications via WebSocket
- Company and role-based targeting
- Create and send notifications
- Target specific companies and roles
- Broadcast to all users

### Authentication & Authorization

- JWT-based authentication
- Role-based access control
- Company-based access control
- Secure password handling
- Session management

### User Interface

- Modern and responsive design
- Real-time updates

## Getting Started

### Prerequisites

- Node.js (>=22.x)
- Python (>=3.12)
- Docker and Docker Compose
- Git

Note: If you're not using Docker, you'll also need:

- npm
- pip

### Frontend Setup

1. Navigate to frontend directory:

   ```bash
   cd frontend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create `.env` file:

   ```
   VITE_WS_URL=ws://localhost:8000/api/ws
   VITE_API_URL=http://localhost:8000
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

### Backend Setup

1. Navigate to backend directory:

   ```bash
   cd backend
   ```

2. Create virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Start the server:
   ```bash
   uvicorn src.main:app --reload
   ```

## API Documentation

Once the backend server is running, you can access:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Development

### Frontend Development

- Uses Vite for fast development
- Hot module replacement
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting

### Backend Development

- FastAPI for high performance
- Automatic API documentation
- WebSocket support
- Structured logging
- Pydantic for data validation

## Testing

- Frontend: Jest + React Testing Library
- Backend: pytest
- End-to-end testing support

### Test Users

The following test users are available for development and testing purposes:

| Username | Password  | Company   | Role  |
| -------- | --------- | --------- | ----- |
| admin    | wkwkwk    | company_a | admin |
| user1    | wkwkwk    | company_a | user  |
| user2    | password2 | company_b | user  |

### Testing Scenarios

Here are some common testing scenarios you can try:

1. **Basic Authentication Test**

   - Open browser and navigate to `http://localhost:8000/docs`
   - Try logging in with each test user using the `/api/auth/login` endpoint
   - Verify that you receive a valid JWT token for each successful login

2. **Multi-User Notification Testing**

   - Open two different browsers (e.g., Chrome and Firefox) or use incognito mode
   - Log in as `admin` in the first browser
   - Log in as `user1` in the second browser
   - Send a notification to company_a using the broadcast API
   - Verify that both users receive the notification since they're both in company_a

   ```bash
   # Send notification to company_a
   curl -X POST "http://localhost:8000/api/broadcast/company/company_a" \
        -H "Content-Type: application/json" \
        -d '{
            "id": "notif_1",
            "type": "notification",
            "payload": {
                "id": "notif_1",
                "title": "Company A Announcement",
                "message": "This is a test notification for Company A",
                "type": "info",
                "created_at": "2024-03-14T12:00:00.000Z",
                "read": false,
                "data": {
                    "topic": "test"
                }
            }
        }'
   ```

3. **Role-Based Access Testing**

   - Log in as `admin` in one browser
   - Log in as `user1` in another browser
   - Send a notification specifically to admin role
   - Verify that only the admin user receives the notification

   ```bash
   # Send notification to admin role
   curl -X POST "http://localhost:8000/api/broadcast/role/admin" \
        -H "Content-Type: application/json" \
        -d '{
            "id": "notif_2",
            "type": "notification",
            "payload": {
                "id": "notif_2",
                "title": "Admin Only",
                "message": "This notification is only for admins",
                "type": "warning",
                "created_at": "2024-03-14T12:00:00.000Z",
                "read": false,
                "data": {
                    "topic": "admin_only"
                }
            }
        }'
   ```

4. **Company Isolation Test**

   - Log in as `user1` (company_a) in one browser
   - Log in as `user2` (company_b) in another browser
   - Send a notification to company_a
   - Verify that only user1 receives the notification, while user2 doesn't

   ```bash
   # Send notification to company_a
   curl -X POST "http://localhost:8000/api/broadcast/company/company_a" \
        -H "Content-Type: application/json" \
        -d '{
            "id": "notif_3",
            "type": "notification",
            "payload": {
                "id": "notif_3",
                "title": "Company A Only",
                "message": "This notification is only for Company A",
                "type": "info",
                "created_at": "2024-03-14T12:00:00.000Z",
                "read": false,
                "data": {
                    "topic": "company_a_only"
                }
            }
        }'
   ```

5. **Cross-Company Admin Test**

   - Log in as `admin` (company_a)
   - Send a notification to company_b
   - Verify that user2 receives the notification while user1 doesn't

   ```bash
   # Send notification to company_b
   curl -X POST "http://localhost:8000/api/broadcast/company/company_b" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
        -d '{
            "id": "notif_5",
            "type": "notification",
            "payload": {
                "id": "notif_5",
                "title": "Company B Message",
                "message": "This notification is for Company B",
                "type": "info",
                "created_at": "2024-03-14T12:00:00.000Z",
                "read": false,
                "data": {
                    "topic": "company_b_message"
                }
            }
        }'
   ```

## Deployment

### Using Docker

1. Build the Docker images:

   ```bash
   # Build frontend image
   docker build -t realtime-ws-notification-frontend ./frontend

   # Build backend image
   docker build -t realtime-ws-notification-backend ./backend
   ```

2. Run the containers:

   ```bash
   # Run backend container
   docker run -d -p 8000:8000 --name backend realtime-ws-notification-backend

   # Run frontend container
   docker run -d -p 80:80 --name frontend realtime-ws-notification-frontend
   ```

3. Access the application:
   - Frontend: `http://localhost:80`
   - Backend API: `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`

### Using Docker Compose (Recommended)

1. Start all services:

   ```bash
   docker compose up -d
   ```

2. Access the application:

   - Frontend: `http://localhost:80`
   - Backend API: `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`

3. Stop all services:

   ```bash
   docker compose down
   ```

4. View logs:
   ```bash
   docker compose logs -f
   ```

### Environment Variables

Make sure to set the following environment variables in your `.env` file:

```env
# Frontend
VITE_WS_URL=ws://localhost:8000/api/ws
VITE_API_URL=http://localhost:8000

# Backend
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License.
