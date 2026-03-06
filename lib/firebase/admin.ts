import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
let adminApp: App;

if (getApps().length === 0) {
    const adminConfig: any = {
        projectId: projectId,
    };

    // Support for environment variable (recommended for Vercel)
    const envServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (envServiceAccount) {
        try {
            const serviceAccount = JSON.parse(envServiceAccount);
            const { cert } = require('firebase-admin/app');
            adminConfig.credential = cert(serviceAccount);
            console.log('📦 Loaded Firebase Admin service account from FIREBASE_SERVICE_ACCOUNT env var');
        } catch (e) {
            console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env var:', e);
        }
    } else {
        // Try to load service account for local development
        try {
            const path = require('path');
            const fs = require('fs');
            const keyPath = path.join(process.cwd(), 'firebase-admin-key.json');

            if (fs.existsSync(keyPath)) {
                const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
                const { cert } = require('firebase-admin/app');
                adminConfig.credential = cert(serviceAccount);
                console.log('📦 Loaded Firebase Admin service account from firebase-admin-key.json');
            }
        } catch (e) {
            // Fallback to default behavior
        }
    }

    adminApp = initializeApp(adminConfig);
} else {
    adminApp = getApps()[0] as App;
}

export const adminDb = getFirestore(adminApp);
