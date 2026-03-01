ConfessionVerse – Frontend


<img width="750" height="752" alt="Screenshot 2026-03-01 200052" src="https://github.com/user-attachments/assets/d304a376-c1c7-45f4-8358-a72d1d07568b" />

Frontend application built with React, responsible for delivering the user interface and communicating with the Spring Boot backend API.

Overview

The application provides:

Authentication flows

Stripe-based billing interactions

AI-driven feature interaction

Real-time messaging via WebSockets

All business logic and sensitive operations are handled server-side.

Tech Stack

React

JavaScript

HTML / CSS

Axios

WebSockets

Docker

Nginx

Architecture

User
→ React Frontend
→ Spring Boot Backend API
→ MySQL Database

The production build is served via Nginx inside a Docker container.

Deployment

The frontend is deployed through an automated CI/CD pipeline:

Docker image build

Push to Amazon ECR

Remote deployment to EC2

Container restart

Infrastructure provisioning is managed separately in the infrastructure repository.

Local Development

Install dependencies:

npm install

Run development server:

npm run dev

Build production version:

npm run build
Security

No secret keys stored in client code

API base URL configured via environment variables

Sensitive logic handled on the backend

CORS configured server-side

Key Characteristics

API-driven architecture

Containerized deployment

Environment-based configuration

Automated CI/CD integration

Decoupled infrastructure provisioning

