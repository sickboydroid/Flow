# Flow: Smart RFID Gate Management System

Flow is an automated, offline-first tracking system designed to replace slow and chaotic paper logbooks at college gates. By using students' existing RFID ID cards, it makes entering and exiting the campus instant, accurate, and secure.

## The Problem It Solves

The traditional manual entry system at campus gates suffers from several critical flaws:

- **Bottlenecks:** Writing down details manually causes massive delays during peak hours.
- **Bad Data:** Rushed handwriting makes the logs completely unreadable.
- **Lack of Trust:** It is incredibly easy to write fake names, incorrect times, or sign in for friends.
- **Zero Traceability:** Searching through physical books to find a specific student's movement history is practically impossible.

## How It Works

- **The Ideal Scenario:** A student taps their ID card at the gate scanner. The system instantly brings up their profile photo and details for the guard to visually verify, logs the exact timestamp, and updates their status (IN or OUT).
- **The Backup Scenario:** If a student forgets their card, they provide their enrollment number. The guard enters it into the system, verifies the photo that pops up, and logs them through.

## Key Features

- **Offline-First Reliability:** The primary design constraint is that gate traffic cannot stop if the campus internet goes down. Flow runs entirely on a local network and database at the gate, ensuring 100% uptime.
- **Live Guard Dashboard:** A clear, high-contrast interface showing real-time scans, large profile pictures, and quick manual overrides if a guard needs to deny an entry/exit.
- **Instant Analytics:** Administrators can instantly see live counts of how many hostellers are currently off-campus and pull detailed histories for any specific enrollment number.

## Technology Stack

- **Frontend Interface:** Vite, Vanilla TypeScript, HTML, and CSS.
- **Backend Engine:** Node.js, Express, and TypeScript.
- **Database:** MongoDB (Local instance).
- **Hardware Integration:** Standard USB RFID Card Readers.

## Project Roadmap

- **Stage 1: The Offline Foundation (Current)** Focuses on setting up the local gate hardware, deploying the local database, and ensuring the guard dashboard works flawlessly without an internet connection.
- **Stage 2: Cloud Sync & Remote Admin (Planned)** Introduces a background sync feature. When the gate device detects an internet connection, it will automatically push new logs to a secure, cloud-based administrative web panel for remote tracking.
