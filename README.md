



# ConfessionVerse – Frontend


<img width="800" height="800" alt="Screenshot 2026-03-01 200052" src="https://github.com/user-attachments/assets/d304a376-c1c7-45f4-8358-a72d1d07568b" />


Frontend application built with **React**, responsible for delivering the user interface and interacting with the backend API.

The application communicates with a Spring Boot backend and provides the user-facing functionality of the ConfessionVerse platform.

---

# Application Overview

The frontend provides:

* User authentication flows
* AI-driven interactions
* Stripe-based billing interface
* Real-time messaging via WebSockets

All sensitive operations and business logic are handled on the backend.

---

# Tech Stack

* React
* JavaScript
* HTML / CSS
* Axios
* WebSockets
* Docker
* Nginx

---

# Architecture

```text
User
  │
  ▼
React Frontend
  │
  ▼
Spring Boot Backend API
  │
  ▼
Amazon RDS (MySQL)
```

The production build is served via **Nginx inside a Docker container**.

---

# Deployment

Frontend deployment is fully automated using CI/CD.

Deployment pipeline:

```text
Developer Push
      │
      ▼
GitHub Actions
      │
      ▼
Docker Image Build
      │
      ▼
Push to Amazon ECR
      │
      ▼
Remote Deployment to EC2
      │
      ▼
Container Restart
```

Infrastructure provisioning is handled separately in the **infrastructure repository**.

---

# Local Development

Install dependencies:

```id="npm1"
npm install
```

Run development server:

```id="npm2"
npm run dev
```

Build production version:

```id="npm3"
npm run build
```

---

# Security

Security considerations implemented:

* No secret keys stored in client code
* API base URL configured via environment variables
* Sensitive logic handled on the backend
* CORS protection implemented server-side

---

# Key Characteristics

* API-driven architecture
* Containerized deployment
* Environment-based configuration
* Automated CI/CD pipeline
* Decoupled infrastructure provisioning


