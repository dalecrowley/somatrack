import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

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

            // Fix for private key newline issues in some environment variable setups
            if (serviceAccount.private_key && typeof serviceAccount.private_key === 'string') {
                serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
            }

            adminConfig.credential = cert(serviceAccount);

            // If projectId was missing from env but present in service account, use it
            if (!adminConfig.projectId && serviceAccount.project_id) {
                adminConfig.projectId = serviceAccount.project_id;
            }

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
                adminConfig.credential = cert(serviceAccount);
                console.log('📦 Loaded Firebase Admin service account from firebase-admin-key.json');
            }
        } catch (e) {
            console.error('❌ Error loading local service account:', e);
        }
    }

    adminApp = initializeApp(adminConfig);
} else {
    adminApp = getApps()[0] as App;
}

export const adminDb = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
