---
description: Repository Information Overview
alwaysApply: true
---

# SomaTrack Information

## Summary
SomaTrack is a Kanban-based project management application optimized for audio and sound effects (SFX) workflows at Somatone. It integrates with Firebase for authentication and database services, and Box API for file storage.

## Structure
- **app/**: Next.js App Router containing route segments for authentication `(auth)`, the main application `(app)`, and API routes `api/`.
- **components/**: React components organized by feature (admin, auth, clients, layout, projects) and a collection of shared `ui/` components (Shadcn/UI).
- **hooks/**: Custom React hooks for authentication, data fetching (clients, projects, tickets, users), and state management.
- **lib/**: Core logic and integrations, including Box API service, Firebase configuration, Zustand stores, and general utilities.
- **public/**: Static assets like SVGs and icons.
- **scripts/**: Utility scripts for seeding users and testing external service connections (e.g., Box API).
- **types/**: Global TypeScript type definitions and interfaces.

## Language & Runtime
**Language**: TypeScript  
**Version**: Node.js 18+  
**Build System**: Next.js (SWC/Turbopack)  
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- `next`: 16.1.6 (Framework)
- `react`, `react-dom`: 19.2.3
- `firebase`, `firebase-admin`: Firebase SDKs for client and server
- `box-node-sdk`: Box API integration
- `zustand`: State management
- `@hello-pangea/dnd`: Drag and drop functionality
- `wavesurfer.js`: Audio visualization and playback
- `@tiptap/react`: Rich text editor
- `lucide-react`: Icon library
- `date-fns`: Date manipulation

**Development Dependencies**:
- `typescript`: ^5
- `tailwindcss`: ^4 (Styling)
- `eslint`: ^9 (Linting)
- `tsx`: TypeScript execution engine for scripts

## Build & Installation
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Usage & Operations
**Seeding Users**:
```bash
# Requires firebase-admin-key.json in project root
npm run seed-users
```

**Testing Box Connection**:
```bash
# Test Box API configuration and connectivity
npx tsx scripts/test-box.ts
```

## Testing
**Framework**: No formal testing framework (e.g., Jest/Vitest) is currently configured.
**Test Location**: `scripts/` contains ad-hoc test scripts for specific integrations.
**Naming Convention**: `test-*.ts`
