/**
 * Seed script to create initial users in Firestore
 * 
 * Usage:
 * 1. Set up your Firebase credentials in .env.local
 * 2. Run: npm run seed-users
 * 
 * This will create user documents for the initial team members.
 * Users will still need to sign in with Google for the first time.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (getApps().length === 0) {
    // For local development, you can use a service account key
    // Download it from Firebase Console > Project Settings > Service Accounts
    // and save it as firebase-admin-key.json in the project root
    try {
        const serviceAccount = require('../firebase-admin-key.json');
        initializeApp({
            credential: cert(serviceAccount),
        });
    } catch (error) {
        console.error('Error: firebase-admin-key.json not found.');
        console.error('Please download your service account key from Firebase Console.');
        process.exit(1);
    }
}

const db = getFirestore();

// Initial team members with placeholder avatars
const seedUsers = [
    { email: 'dale@somatone.com', displayName: 'Dale Crowley', role: 'admin', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dale' },
    { email: 'john@somatone.com', displayName: 'John Smith', role: 'member', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John' },
    { email: 'marika@somatone.com', displayName: 'Marika Johnson', role: 'member', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marika' },
    { email: 'saul@somatone.com', displayName: 'Saul Williams', role: 'member', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Saul' },
    { email: 'raul@somatone.com', displayName: 'Raul Martinez', role: 'member', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Raul' },
    { email: 'michael@somatone.com', displayName: 'Michael Scott', role: 'member', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Michael' },
    { email: 'sarah@somatone.com', displayName: 'Sarah Chen', role: 'member', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
    { email: 'alex@somatone.com', displayName: 'Alex Rodriguez', role: 'member', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
    { email: 'emma@somatone.com', displayName: 'Emma Davis', role: 'member', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma' },
    { email: 'james@somatone.com', displayName: 'James Wilson', role: 'member', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James' },
];

async function seedDatabase() {
    console.log('🌱 Starting user seeding...\n');

    for (const user of seedUsers) {
        try {
            // Note: We can't create auth users without their actual Google account
            // This script just creates placeholder Firestore documents
            // Users will need to sign in with Google for the first time to complete setup

            // Create a deterministic user ID based on email
            const userId = user.email.replace('@somatone.com', '').replace(/\./g, '_');

            await db.collection('users').doc(userId).set({
                uid: userId,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL || null,
                role: user.role,
                createdAt: new Date(),
                lastLogin: null,
            });

            console.log(`✅ Created user document for ${user.displayName} (${user.email})`);
        } catch (error) {
            console.error(`❌ Error creating user ${user.email}:`, error);
        }
    }

    console.log('\n✨ User seeding completed!');
    console.log('\nNote: Users must sign in with Google for the first time to activate their accounts.');
    console.log('Their Firestore documents will be updated with their actual Firebase Auth UID upon first login.\n');
}

seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
