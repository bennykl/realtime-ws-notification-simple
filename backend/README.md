# Realtime WebSocket Notification Backend

A FastAPI-based backend service that provides real-time notifications through WebSocket connections.

## Project Structure

```
backend/
├── src/
│   ├── api/            # API routes and endpoints
│   │   ├── auth.py     # Authentication endpoints
│   │   ├── notifications.py # Notification endpoints
│   │   ├── websocket.py # WebSocket endpoints
│   │   ├── endpoints/   # Additional API endpoints
│   │   └── websocket/   # WebSocket-related handlers
│   ├── core/           # Core application logic
│   │   ├── auth/       # Authentication core logic
│   │   ├── config/     # Configuration management
│   │   ├── websocket.py # WebSocket connection management
│   │   ├── config.py   # Application configuration
│   │   └── logging.py  # Logging configuration
│   ├── services/       # Business logic services
│   │   └── notification.py # Notification service
│   ├── utils/          # Utility functions
│   └── tests/          # Test files
├── app/                # Application files
├── scripts/            # Utility scripts
├── requirements.txt    # Python dependencies
└── main.py            # Application entry point
```

## Features

- WebSocket-based real-time notifications
- Authentication and authorization
- Structured logging
- FastAPI framework for high performance
- Broadcast notifications to all connected clients
- Support for different notification priorities (info, error)
- Topic-based notification categorization

## Prerequisites

- Python 3.8+
- pip (Python package manager)

## Installation

1. Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:

```bash
pip install -r requirements.txt
```

## Running the Application

Start the server:

```bash
uvicorn src.main:app --reload
```

The server will start at `http://localhost:8000`

## API Endpoints

### Authentication

- `POST /api/auth/login` - User login
  - Request body: `{ "username": string, "password": string }`
  - Returns: `{ "access_token": string }`

### Notifications

- `POST /api/notifications/send` - Send a notification to all connected clients

  - Request body: `{ "title": string, "message": string, "priority": string, "topic": string }`
  - Returns: `{ "message": "Notification sent successfully" }`

- `GET /api/notifications/{user_id}` - Get notifications for a specific user
- `PUT /api/notifications/{notification_id}/read` - Mark a notification as read
- `DELETE /api/notifications/{notification_id}` - Delete a notification

### Broadcast API

The following endpoints allow you to broadcast notifications to specific groups of users:

1. Broadcast to a specific company and role:

```bash
curl -X POST "http://localhost:8000/api/broadcast/company/company_a/role/user" \
     -H "Content-Type: application/json" \
     -d '{
         "id": "notif_1746245726.463395",
         "type": "notification",
         "payload": {
             "id": "notif_1746245726.463395",
             "title": "User Update",
             "message": "New features are available for Company A users",
             "type": "info",
             "created_at": "2025-05-03T11:15:26.463425",
             "read": false,
             "data": {
                 "topic": "new_features"
             }
         }
     }'
```

2. Broadcast to a specific role:

```bash
curl -X POST "http://localhost:8000/api/broadcast/role/admin" \
     -H "Content-Type: application/json" \
     -d '{
         "id": "notif_1746245726.463395",
         "type": "notification",
         "payload": {
             "id": "notif_1746245726.463395",
             "title": "Admin Alert",
             "message": "System maintenance will be performed tonight",
             "type": "warning",
             "created_at": "2025-05-03T11:15:26.463425",
             "read": false,
             "data": {
                 "topic": "system_maintenance"
             }
         }
     }'
```

3. Broadcast to a specific company:

```bash
curl -X POST "http://localhost:8000/api/broadcast/company/company_a" \
     -H "Content-Type: application/json" \
     -d '{
         "id": "notif_1746245726.463395",
         "type": "notification",
         "payload": {
             "id": "notif_1746245726.463395",
             "title": "Announcement for Company A",
             "message": "This is a special announcement for all Company A employees",
             "type": "info",
             "created_at": "2025-05-03T11:15:26.463425",
             "read": false,
             "data": {
                 "topic": "company_announcement"
             }
         }
     }'
```

All broadcast endpoints return a success response in the format:

```json
{
  "status": "success",
  "message": "Message broadcasted to [target]"
}
```

## WebSocket Endpoints

- `/ws/notifications` - WebSocket endpoint for real-time notifications
  - Requires authentication
  - Supports bi-directional communication
  - Broadcasts notifications to all connected clients

## API Documentation

Once the server is running, you can access:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Development

The project uses:

- FastAPI for the web framework
- WebSockets for real-time communication
- Python's built-in logging module for structured logging
- Pydantic for data validation
