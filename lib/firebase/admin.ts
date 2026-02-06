import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp;

if (getApps().length === 0) {
    adminApp = initializeApp();
} else {
    adminApp = getApps()[0];
}

export const adminDb = getFirestore(adminApp);
