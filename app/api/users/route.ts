import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import type { UserProfile } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * GET /api/users - List all users (admin only)
 */
export async function GET() {
    try {
        const snapshot = await adminDb.collection('users').get();
        const users: UserProfile[] = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() } as UserProfile));
        return NextResponse.json({ users }, { status: 200 });
    } catch (error: any) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'Failed to fetch users', details: error.message }, { status: 500 });
    }
}

/**
 * POST /api/users - Invite/create a user entry
 * Body: { email: string; displayName?: string; role?: 'admin' | 'member' }
 */
export async function POST(request: Request) {
    try {
        const { email, displayName, role = 'member' } = (await request.json()) as {
            email: string;
            displayName?: string;
            role?: 'admin' | 'member';
        };
        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Use Node.js built-in crypto for UUID generation
        const uid = crypto.randomUUID();

        await adminDb.collection('users').doc(uid).set({
            email,
            displayName: displayName ?? null,
            photoURL: null,
            role,
            createdAt: FieldValue.serverTimestamp(),
            lastLogin: null,
        });
        return NextResponse.json({ uid }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create user', details: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/users?uid=USER_ID - Remove a user entry
 */
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get('uid');
        if (!uid) {
            return NextResponse.json({ error: 'uid query param required' }, { status: 400 });
        }

        console.log(`🗑️ API: Deleting user ${uid}`);
        await adminDb.collection('users').doc(uid).delete();

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user', details: error.message }, { status: 500 });
    }
}
