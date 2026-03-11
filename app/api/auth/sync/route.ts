import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { verifySession } from '@/lib/api/auth';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/auth/sync
 * Securely migrates a user from an "Invited" placeholder to their official Google Account UID.
 * This runs on the server to bypass client-side permission restrictions during the first login.
 */
export async function POST(request: Request) {
    const { user, errorResponse } = await verifySession(request);
    // Note: We do NOT require admin here because the user is syncing their OWN account.
    if (errorResponse) return errorResponse;

    try {
        const callerUid = user!.uid;
        const callerEmail = user!.email.toLowerCase().trim();

        // 1. Check if the user document already exists by UID
        const userRef = adminDb.collection('users').doc(callerUid);
        const userSnap = await userRef.get();

        // 2. Search for invited placeholders by email
        const invitedQuery = await adminDb.collection('users')
            .where('email', '==', callerEmail)
            .get();

        const invitedDocs = invitedQuery.docs.filter(doc => doc.id !== callerUid);

        if (invitedDocs.length > 0) {
            console.log(`🛰️ Sync API: Found invited account for ${callerEmail}. Migrating to UID ${callerUid}`);
            
            // Use the first invited doc as the source of truth (role, etc.)
            const sourceDoc = invitedDocs[0];
            const sourceData = sourceDoc.data();

            const finalData = {
                ...sourceData,
                uid: callerUid,
                lastLogin: FieldValue.serverTimestamp(),
                // Keep the email normalized
                email: callerEmail,
                // Ensure we don't overwrite if they already have a display name from Google
                updatedAt: FieldValue.serverTimestamp()
            };

            // If UID doc exists, merge. Else create.
            await userRef.set(finalData, { merge: true });

            // 3. Clean up ALL placeholder docs for this email
            for (const doc of invitedDocs) {
                console.log(`🗑️ Sync API: Deleting placeholder doc: ${doc.id}`);
                await doc.ref.delete();
            }

            return NextResponse.json({ success: true, migrated: true }, { status: 200 });
        } else {
            // No invited doc found. Just ensure the UID doc exists and has the email.
            if (!userSnap.exists) {
                console.log(`🛰️ Sync API: No invitation found for ${callerEmail}. Creating fresh member record.`);
                await userRef.set({
                    email: callerEmail,
                    uid: callerUid,
                    role: 'member',
                    createdAt: FieldValue.serverTimestamp(),
                    lastLogin: FieldValue.serverTimestamp()
                });
            } else {
                // Just update last login
                await userRef.update({ lastLogin: FieldValue.serverTimestamp() });
            }
            return NextResponse.json({ success: true, migrated: false }, { status: 200 });
        }
    } catch (error: any) {
        console.error('❌ Sync API Error:', error);
        return NextResponse.json({ error: 'Failed to sync user account', details: error.message }, { status: 500 });
    }
}
