ConfessionVerse Frontend

Production-ready React frontend deployed in Docker on AWS EC2 behind an Nginx reverse proxy.

The application communicates with a Spring Boot backend and supports authentication, real-time communication, and billing integration.

Overview

ConfessionVerse Frontend is a modern single-page application built with React and Vite. It delivers the user interface for anonymous confessions, AI-powered interactions, real-time chat, and subscription-based features.

The application is containerized and deployed in production using Docker, with Nginx acting as a reverse proxy for secure service routing.

Tech Stack

React

Vite

JavaScript (ES6+)

WebSocket (STOMP)

Stripe (frontend integration)

Docker

Nginx

AWS EC2

Core Features

JWT-based authentication

Anonymous confession posting and browsing

Real-time chat via WebSockets

Stripe billing integration

Role-based access (Admin dashboard)

Responsive and scalable UI architecture

Development Environment

Runs locally using the Vite development server:

http://localhost:5173
Start locally
npm install
npm run dev

Backend must be running on:

http://localhost:8082

The frontend communicates with the backend using relative API paths to simplify environment configuration.

Production Deployment

Hosted on AWS EC2 (Ubuntu Linux).

Infrastructure setup:

Fully containerized using Docker

Nginx reverse proxy container exposed on port 80

Internal Docker network for service isolation

Backend and MySQL are not publicly exposed

Production Architecture

Internet
↓
Nginx (Docker – port 80 exposed)
↓
Frontend Container
↓
Backend Container
↓
MySQL Container (persistent volume)

All services operate within a private Docker network to ensure isolation and security.

Docker Setup
Build Image
docker build -t confessionverse-frontend .
Run Container (Internal Network)
docker run -d \
  --name confessionverse-frontend \
  --network confessionverse-network \
  confessionverse-frontend

Frontend traffic is routed exclusively through the Nginx reverse proxy.

API & WebSocket Routing

Frontend uses relative paths:

/api/
/ws/

In production, Nginx resolves these routes to:

Spring Boot REST API

Spring Boot WebSocket endpoint

This eliminates the need for hardcoded backend URLs and enables clean environment separation.

Security Model

Only port 80 is publicly exposed

Backend (8082) accessible only within Docker network

MySQL (3306) accessible only within Docker network

JWT-based authentication

No secrets stored in repository

Service isolation via Docker networking

Deployment Model

Current deployment uses manual Docker orchestration on a single EC2 instance.

Planned infrastructure improvements:

Docker Compose

CI/CD pipeline

HTTPS via Let's Encrypt

Custom domain configuration

AWS RDS migration

Infrastructure as Code (Terraform)

Status

Production-ready for single-instance deployment.
Designed for scalable cloud migration and future infrastructure automation.
