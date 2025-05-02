# Realtime WebSocket Notification Frontend

A React-based frontend application that connects to a WebSocket server for real-time notifications.

## Project Structure

```
frontend/
├── src/
│   ├── core/           # Core application logic
│   ├── features/       # Feature-specific components and logic
│   ├── shared/         # Shared components and utilities
│   ├── assets/         # Static assets
│   ├── App.tsx         # Main application component
│   ├── main.tsx        # Application entry point
│   └── index.css       # Global styles
├── public/             # Public assets
└── package.json        # Project dependencies
```

## Features

- Real-time WebSocket connection
- Modern React with TypeScript
- Tailwind CSS for styling
- ESLint for code quality
- Vite for fast development and building

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

## Project Configuration

- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `eslint.config.js` - ESLint configuration
