ConfessionVerse Frontend

Production-ready React frontend deployed in Docker on AWS EC2 behind an Nginx reverse proxy.

This service delivers the user interface for the ConfessionVerse platform, enabling anonymous confessions, AI-powered interactions, real-time messaging, and subscription-based features.

🚀 Tech Stack

React

Vite

JavaScript (ES6+)

WebSocket (STOMP)

Stripe (Frontend Integration)

Docker

Nginx

AWS EC2

🧩 Core Features

JWT-based authentication

Anonymous confession posting and browsing

Real-time chat via WebSockets

Stripe billing integration

Role-based access (Admin dashboard)

Responsive and scalable UI architecture

Clean separation of API and WebSocket routing

🏗 Production Architecture

The frontend is deployed as a Docker container behind an Nginx reverse proxy.

Internet
   ↓
Nginx (Docker – port 80 exposed)
   ↓
Frontend (Docker)
   ↓
Backend (Docker – Spring Boot)
   ↓
Amazon RDS (MySQL – Managed)
Infrastructure Characteristics

Hosted on AWS EC2 (Ubuntu)

Fully containerized

Internal Docker network for service isolation

Backend is not publicly exposed

Database runs on Amazon RDS (private, managed)

Only Nginx (port 80) is publicly accessible

🧪 Development Environment

Runs locally using Vite development server:

http://localhost:5173
Start Locally
npm install
npm run dev

Backend must run on:

http://localhost:8082

Frontend communicates with backend using relative paths, simplifying environment configuration.

🐳 Docker Deployment
Build Image
docker build -t confessionverse-frontend .
Run Container (Internal Network)
docker run -d \
  --name confessionverse-frontend \
  --network confessionverse-network \
  confessionverse-frontend

Frontend traffic is routed exclusively through the Nginx reverse proxy container.

🔄 API & WebSocket Routing

Frontend uses relative paths:

/api/
/ws/

In production, Nginx resolves these routes to:

Spring Boot REST API

Spring Boot WebSocket endpoint

This design:

Eliminates hardcoded backend URLs

Enables clean environment separation

Supports easy migration to domain + HTTPS

🔐 Security Model

Only port 80 is publicly exposed

Backend (8082) accessible only inside Docker network

Database (Amazon RDS) not publicly accessible

JWT-based authentication

No secrets stored in repository

Service isolation via Docker networking

Reverse proxy enforces controlled routing

📦 Deployment Model

Current deployment uses manual Docker orchestration on a single EC2 instance.

Designed for clean evolution toward:

Docker Compose orchestration

CI/CD pipeline (GitHub Actions)

HTTPS via Let's Encrypt

Custom domain configuration

Infrastructure as Code (Terraform)

Container registry integration (AWS ECR)

📌 Status

Production-ready single-instance deployment.

Frontend is fully containerized, environment-agnostic, and built for:

Cloud scalability

Reverse proxy integration

Managed database architecture (Amazon RDS)

Future DevOps automation
