📘 ConfessionVerse Frontend
🌐 Overview

ConfessionVerse Frontend is a modern React application built with Vite, designed to interact with the ConfessionVerse backend API.
It is fully containerized using Docker and served via Nginx in production.

This frontend handles:

User authentication (register/login)

Posting and viewing confessions

Real-time chat (WebSocket)

Premium features (Stripe integration)

Admin panel (role-based access)

🛠 Tech Stack

React

Vite

JavaScript / JSX

WebSocket (STOMP)

Stripe (frontend integration)

Docker

Nginx

📁 Project Structure
confessionverse-frontend/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── context/
│   └── main.jsx
│
├── public/
├── index.html
├── vite.config.js
├── package.json
├── Dockerfile
└── README.md
🚀 Development Setup
1️⃣ Install dependencies
npm install
2️⃣ Start development server
npm run dev

App will run on:

http://localhost:5173

Make sure backend is running on:

http://localhost:8082
🏗 Production Build
Build locally
npm run build

Output will be generated inside:

/dist
🐳 Docker Setup

Frontend is containerized and served using Nginx.

🔹 Build Docker image
docker build -t confessionverse-frontend .
🔹 Run container
docker run -d \
  --name confessionverse-frontend \
  --network confessionverse-network \
  confessionverse-frontend
🔄 Reverse Proxy (Nginx)

In production, traffic is routed through an Nginx reverse proxy container.

/ → frontend

/api/ → backend

/ws/ → backend WebSocket

All services run inside the same Docker network.

🌍 Production Deployment

Current production architecture:

Frontend → Docker container (Nginx)

Backend → Docker container (Spring Boot)

Database → Docker container (MySQL)

Reverse Proxy → Docker Nginx (public port 80)

Internal Docker network for service isolation

Only port 80 is exposed publicly.

🔐 Environment Configuration

Frontend communicates with backend via relative API paths:

/api/

WebSocket endpoint:

/ws/

These are resolved through reverse proxy in production.

📦 Scripts
Command	Description
npm run dev	Start development server
npm run build	Build production version
npm run preview	Preview production build
🧪 Test Mode

The application currently runs in test mode (HTTP only).
SSL will be configured after domain setup.
