
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const serviceAccountPath = path.resolve('firebase-admin-key.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ firebase-admin-key.json not found');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function listAll() {
    console.log('--- Firestore Data Check ---');

    console.log('\n📁 Clients:');
    const clientsSnapshot = await db.collection('clients').get();
    clientsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- [${doc.id}] "${data.name}"`);
    });

    console.log('\n📁 Projects:');
    const projectsSnapshot = await db.collection('projects').get();
    projectsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`- [${doc.id}] "${data.name}" (Client: ${data.clientId})`);
    });
}

listAll().catch(console.error);
