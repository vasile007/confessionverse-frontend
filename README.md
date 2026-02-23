
ConfessionVerse Frontend
Overview

ConfessionVerse Frontend is a React application built with Vite and deployed in production using Docker on AWS EC2.

The application communicates with the Spring Boot backend via reverse proxy and supports:

Authentication (JWT-based)

Confession posting & browsing

Real-time chat (WebSocket)

Stripe billing integration

Role-based access (Admin)

Tech Stack

React

Vite

JavaScript (ES6+)

WebSocket (STOMP)

Stripe (frontend integration)

Docker

Nginx

AWS EC2

Environments
Development

Runs locally using Vite dev server:

http://localhost:5173

Start locally:

npm install
npm run dev

Backend must run on:

http://localhost:8082
Production

Deployed on:

http://35.153.61.187/

Infrastructure:

Hosted on AWS EC2 (Ubuntu)

Fully containerized using Docker

Nginx reverse proxy container exposed on port 80

Internal Docker network for service isolation

Backend and MySQL are not publicly exposed

Production architecture:

Internet
   ↓
Nginx (Docker, port 80)
   ↓
Frontend container
   ↓
Backend container
   ↓
MySQL container (persistent volume)
Docker
Build image
docker build -t confessionverse-frontend .
Run container (internal network)
docker run -d \
  --name confessionverse-frontend \
  --network confessionverse-network \
  confessionverse-frontend

Frontend is accessed through the Nginx reverse proxy container.

API & WebSocket

Frontend uses relative paths:

/api/
/ws/

These are resolved via Nginx reverse proxy in production.

Security Model

Only port 80 is publicly exposed

Backend (8082) is internal only

MySQL (3306) is internal only

Docker network isolates services

JWT-based authentication

Deployment Model

Current deployment is manual Docker orchestration.

Future improvements (handled in infrastructure repository):

Docker Compose

CI/CD pipeline

SSL (Let's Encrypt)

Domain configuration

AWS RDS migration
