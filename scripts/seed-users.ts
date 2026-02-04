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

// Initial team members
const seedUsers = [
    { email: 'dale@somatone.com', displayName: 'Dale', role: 'admin' },
    { email: 'john@somatone.com', displayName: 'John', role: 'member' },
    { email: 'marika@somatone.com', displayName: 'Marika', role: 'member' },
    { email: 'saul@somatone.com', displayName: 'Saul', role: 'member' },
    { email: 'raul@somatone.com', displayName: 'Raul', role: 'member' },
    { email: 'michael@somatone.com', displayName: 'Michael', role: 'member' },
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
                email: user.email,
                displayName: user.displayName,
                photoURL: null,
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
