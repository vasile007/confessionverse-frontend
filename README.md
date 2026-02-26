ConfessionVerse – AWS Cloud Infrastructure

Production-grade AWS infrastructure designed and implemented using Terraform to support a fully containerized full-stack application with automated CI/CD deployment.

This repository defines a secure, modular, and reproducible cloud environment following Infrastructure-as-Code and DevOps best practices.

🚀 Architecture Overview

Current implementation represents a production-aligned, cost-optimized single-instance architecture with automated deployment.

System Flow

Internet
↓
EC2 (Ubuntu 22.04)
↓
Docker Containers

Nginx (public reverse proxy – port 80)

Spring Boot Backend (internal – 8082)
↓
Amazon RDS (MySQL 8 – private subnets)

☁ Infrastructure Components
Networking

Custom VPC

2 Public Subnets

2 Private Subnets

Internet Gateway

Route Tables (segmented public/private)

CIDR-based network isolation

Compute

EC2 (Ubuntu 22.04)

IAM Instance Role attached

Docker runtime

Access via AWS Systems Manager (no SSH exposed)

Database

Amazon RDS (MySQL 8)

Deployed in private subnets

Not publicly accessible

Encrypted at rest (AWS KMS)

Automated backups enabled

Access restricted via Security Groups

🔐 Security Model

No SSH (port 22 closed)

Access via AWS Systems Manager (Session Manager)

IAM role-based authentication (no static credentials on EC2)

Principle of least privilege

Security Groups enforce strict inbound rules

Database isolated from public internet

📦 Infrastructure as Code

Provisioned entirely using Terraform.

Structure:

confessionverse-infrastructure/
│
├── main.tf
├── providers.tf
├── variables.tf
├── outputs.tf
├── terraform.tfvars (excluded from Git)
│
└── modules/
    ├── vpc/
    ├── security/
    ├── ec2/
    └── rds/

Features:

Modular architecture

Reusable components

Version-controlled definitions

Declarative resource management

Idempotent provisioning

☁ Remote Terraform State

Backend configuration:

S3 bucket (versioning enabled)

DynamoDB table for state locking

Encryption enabled

Public access blocked

Benefits:

Prevents state corruption

Enables team collaboration

Enterprise-grade state management

🔄 CI/CD Deployment Architecture

Application deployment is fully automated.

Deployment Flow

Developer pushes to main branch
↓
GitHub Actions
↓
Build Docker image
↓
Push image to Amazon ECR
↓
AWS Systems Manager executes remote deploy
↓
Docker container restart on EC2

No SSH required.
No manual docker commands.
No static AWS keys stored on instance.

🐳 Container Registry

Amazon ECR used for backend and frontend images

EC2 authenticates via IAM role

No access keys configured on server

🛡 Access Model

EC2 access handled via:

AWS Systems Manager (SSM)

IAM Role: AmazonSSMManagedInstanceCore

No exposed management ports

No SSH key management

This eliminates public administrative attack surface.

🎯 Design Principles

Infrastructure as Code

Immutable container deployment

Network isolation

Least privilege access

No static credentials

Separation of application and infrastructure layers

Cost-aware cloud design

Production-aligned patterns

📌 Project Scope Demonstrates

Cloud infrastructure engineering

Secure AWS architecture design

Terraform modular design

Private database networking

IAM role-based container deployment

Remote state management

CI/CD automation with ECR + SSM

🔮 Production Evolution Path

Designed for clean evolution toward:

Application Load Balancer (ALB)

Auto Scaling Groups

HTTPS via ACM

Multi-AZ RDS deployment

CloudWatch centralized logging

Prometheus + Grafana monitoring

ECS or EKS migration

📊 Current Status

Production-ready single-instance cloud deployment with:

Automated CI/CD

Docker-based application layer

Managed database layer

Secure networking segmentation

Infrastructure reproducibility

🏁 Summary

This project demonstrates the ability to:

Design and implement secure AWS infrastructure

Automate container deployment workflows

Apply Infrastructure-as-Code principles

Integrate CI/CD with cloud-native services

Follow modern DevOps and Cloud Engineering practices
