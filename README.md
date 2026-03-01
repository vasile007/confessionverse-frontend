ConfessionVerse – Frontend Application


<img width="750" height="752" alt="Screenshot 2026-03-01 200052" src="https://github.com/user-attachments/assets/d304a376-c1c7-45f4-8358-a72d1d07568b" />


Frontend client for the ConfessionVerse platform, responsible for delivering the user interface and interacting with the backend API.

The application handles authentication flows, billing interactions, AI-driven features, and real-time messaging through secure API communication.

🚀 Tech Stack

React

JavaScript

HTML5 / CSS3

Axios (API communication)

WebSockets (real-time features)

Docker

Nginx (production serving)

🏗 Application Architecture

The frontend communicates with the backend via REST APIs and WebSocket connections.

Runtime Flow

User
↓
React Frontend
↓
Spring Boot Backend API
↓
Database (MySQL)

The production build is served via an Nginx container inside a Dockerized environment.

🔌 API Integration

The frontend integrates with:

Authentication endpoints

Stripe billing workflows

AI processing endpoints

Real-time messaging services

Backend base URL is configured via environment variables.

🐳 Containerization

Frontend is containerized using Docker for consistent deployment.

Production build generated using npm run build

Static assets served via Nginx

Environment-based configuration

No sensitive credentials stored in client code

🔄 Deployment

Deployment is automated via CI/CD pipeline:

Docker image build

Push to Amazon ECR

Remote deployment to EC2

Container restart

Infrastructure provisioning is handled separately in the infrastructure repository.

🛠 Local Development

Install dependencies:

npm install

Run development server:

npm run dev

Build production version:

npm run build
🔐 Security Considerations

No secret keys stored in frontend

Sensitive logic handled server-side

Environment variables used for configuration

CORS handled at backend level

📌 Characteristics

✔ API-driven architecture
✔ Dockerized deployment
✔ Environment-based configuration
✔ Automated CI/CD integration
✔ Decoupled infrastructure provisioning
