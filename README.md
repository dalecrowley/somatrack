# SomaTrack

A Kanban-based project management application optimized for audio/SFX workflows at Somatone.

## Tech Stack

- **Frontend:** Next.js 15 (App Router), React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend:** Firebase (Firestore, Authentication)
- **File Storage:** Box API
- **State Management:** Zustand
- **Drag & Drop:** @hello-pangea/dnd
- **Audio Player:** wavesurfer.js

## Getting Started

### Prerequisites

1. Node.js 18+ installed
2. Firebase project created
3. Box Developer account with API access

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.local` and fill in your Firebase credentials
   - Get your Firebase config from Firebase Console > Project Settings
   - Box API credentials will be added in Phase 4

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Firebase Setup

1. Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Google Authentication:
   - Go to Authentication > Sign-in method
   - Enable Google provider
3. Create Firestore Database:
   - Go to Firestore Database
   - Create database in production mode
4. Get your Firebase config and add to `.env.local`

### Seeding Users (Optional)

To pre-create user documents for the team:

1. Download your Firebase Admin SDK service account key:
   - Firebase Console > Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save as `firebase-admin-key.json` in project root

2. Run the seed script:
   ```bash
   npm run seed-users
   ```

Note: Users still need to sign in with Google for the first time to activate their accounts.

## Project Structure

```
somatrack/
├── app/
│   ├── (auth)/          # Authentication routes (login)
│   ├── (app)/           # Protected app routes
│   │   └── clients/     # Client management (Phase 2)
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page (redirects to /clients)
├── components/
│   ├── auth/            # Auth components (AuthGuard)
│   ├── layout/          # Layout components (Header)
│   └── ui/              # Shadcn/UI components
├── hooks/
│   └── useAuth.ts       # Authentication hook
├── lib/
│   └── firebase/        # Firebase config and helpers
└── scripts/
    └── seed-users.ts    # User seeding script
```

## Development Phases

- ✅ **Phase 1:** Scaffold & Authentication
- 🔄 **Phase 2:** Organization Structure (Clients, Groups, Projects)
- ⏳ **Phase 3:** Kanban Board
- ⏳ **Phase 4:** Box API Integration

## Authentication

- Only `@somatone.com` email addresses are allowed
- Google Sign-In is the only authentication method
- Users are automatically created in Firestore on first login

## License

Private - Somatone Internal Use Only
