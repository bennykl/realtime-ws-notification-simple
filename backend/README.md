# Realtime WebSocket Notification Backend

A FastAPI-based backend service that provides real-time notifications through WebSocket connections.

## Project Structure

```
backend/
├── app/
│   ├── core/
│   │   ├── auth.py           # Authentication and authorization
│   │   ├── logging_config.py # Logging configuration
│   │   └── websocket/
│   │       └── manager.py    # WebSocket connection management
│   └── main.py              # Main application entry point
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## Features

- WebSocket-based real-time notifications
- Authentication and authorization
- Structured logging
- FastAPI framework for high performance

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
uvicorn app.main:app --reload
```

The server will start at `http://localhost:8000`

## API Documentation

Once the server is running, you can access:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## WebSocket Endpoints

- `/ws/notifications` - WebSocket endpoint for real-time notifications
  - Requires authentication
  - Supports bi-directional communication

## Development

The project uses:

- FastAPI for the web framework
- WebSockets for real-time communication
- Python's built-in logging module for structured logging
