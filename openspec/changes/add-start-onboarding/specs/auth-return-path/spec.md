# Spec Delta

## Purpose

Lets an owner who signs up from a flow such as `/start` return to that flow after verifying their email, without opening a redirect to arbitrary destinations.

## ADDED Requirements

### Requirement: Return path on sign-up and resend
When sign-up or resend verification starts from `/start`, the system SHALL send `next: "/start"`, so the verification link carries it. Sign-up from `/signup` SHALL NOT send a return path.

#### Scenario: Sign-up from /start
- **WHEN** an owner creates an account from the `/start` Account step
- **THEN** the verification email links to `/verify-email?next=%2Fstart&token=…`

#### Scenario: Resend from /start
- **WHEN** the owner resends the verification email from "Check your email" in `/start`
- **THEN** the new link carries the same return path

### Requirement: Verify email follows an allow-listed return path
After a successful verification, `/verify-email` SHALL follow `next` only when it is one of the allow-listed frontend paths (`/start`). If the browser still holds the session, it SHALL go there directly. Otherwise it SHALL send the owner to sign in and then on to that path. Any other `next` value SHALL be ignored, and the page SHALL keep its current behaviour.

#### Scenario: Verified with session
- **WHEN** an owner with a session opens a valid link with `next=/start`
- **THEN** after verification the browser goes to `/start`, which continues at Basics

#### Scenario: Verified without session
- **WHEN** the link is opened in a browser without the session
- **THEN** after verification the owner signs in and lands on `/start`

#### Scenario: Foreign return path
- **WHEN** `next` is `https://evil.example` or `//evil.example`
- **THEN** it is ignored and the page shows its usual result

### Requirement: Sign in honours the return path
Sign-in SHALL accept the same allow-listed return path. After a successful sign-in with a verified account it SHALL go there instead of the mesh list.

#### Scenario: Sign in on the way back
- **WHEN** an owner signs in at `/login?next=/start` with a verified account
- **THEN** the browser goes to `/start`
