---
id: auth-service
name: Auth Service
status: active
created: 2026-01-15
tags: [backend, security, api]
---

## Description
Centralized authentication and authorization microservice. Handles JWT tokens, OAuth2 flows, RBAC, and session management.

## Architecture
- **Token Service**: Issues and validates JWT access/refresh tokens
- **OAuth Provider**: Google, GitHub, and SAML SSO
- **RBAC Engine**: Role-based access control with hierarchical permissions

## Key Decisions
- Using RS256 for JWT signing (asymmetric keys)
- Refresh tokens stored in Redis with 7-day TTL
- Rate limiting on login endpoints (5 req/min per IP)
