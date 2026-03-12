import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import type { UserProfile } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';
import { verifySession } from '@/lib/api/auth';

/**
 * GET /api/users - List all users (any authenticated member)
 */
export async function GET(request: Request) {
    const { user, errorResponse } = await verifySession(request);
    if (errorResponse) return errorResponse;

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
 * POST /api/users - Invite/create a user entry (Admin only)
 */
export async function POST(request: Request) {
    const { user, errorResponse } = await verifySession(request, true); // true = require admin
    if (errorResponse) return errorResponse;

        try {
            const { email, displayName, role = 'member', spreadsheetId } = (await request.json()) as {
                email: string;
                displayName?: string;
                role?: 'admin' | 'member';
                spreadsheetId?: string;
            };
            if (!email) {
                return NextResponse.json({ error: 'Email is required' }, { status: 400 });
            }

            const normalizedEmail = email.toLowerCase().trim();

            // Check if user already exists
            const existingQuery = await adminDb.collection('users').where('email', '==', normalizedEmail).get();
            
            if (!existingQuery.empty) {
                console.log(`👤 API: User with email ${normalizedEmail} already exists. Updating details instead.`);
                const existingDoc = existingQuery.docs[0];
                const updateData: any = {
                    role,
                    updatedBy: user!.email,
                    updatedAt: FieldValue.serverTimestamp()
                };
                if (spreadsheetId !== undefined) updateData.spreadsheetId = spreadsheetId;

                await existingDoc.ref.update(updateData);
                return NextResponse.json({ uid: existingDoc.id, updated: true }, { status: 200 });
            }

            const uid = crypto.randomUUID();

            await adminDb.collection('users').doc(uid).set({
                email: normalizedEmail,
                displayName: displayName ?? null,
                photoURL: null,
                role,
                spreadsheetId: spreadsheetId || null,
                createdAt: FieldValue.serverTimestamp(),
                lastLogin: null,
                invitedBy: user!.email
            });
            return NextResponse.json({ uid, invited: true }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'Failed to create user', details: error.message }, { status: 500 });
    }
}

/**
 * DELETE /api/users?uid=USER_ID - Remove a user entry (Admin only)
 */
export async function DELETE(request: Request) {
    const { user, errorResponse } = await verifySession(request, true); // true = require admin
    if (errorResponse) return errorResponse;

    try {
        const { searchParams } = new URL(request.url);
        const uid = searchParams.get('uid');
        if (!uid) {
            return NextResponse.json({ error: 'uid query param required' }, { status: 400 });
        }

        console.log(`🗑️ API: User ${user!.email} deleting user ${uid}`);
        await adminDb.collection('users').doc(uid).delete();

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user', details: error.message }, { status: 500 });
    }
}
/**
 * PATCH /api/users - Update a user's role/details (Admin only)
 */
export async function PATCH(request: Request) {
    const { user, errorResponse } = await verifySession(request, true); // true = require admin
    if (errorResponse) return errorResponse;

    try {
        const { uid, role, spreadsheetId } = (await request.json()) as {
            uid: string;
            role?: 'admin' | 'member';
            spreadsheetId?: string;
        };

        if (!uid) {
            return NextResponse.json({ error: 'uid is required' }, { status: 400 });
        }

        console.log(`👤 API: User ${user!.email} updating details for ${uid}`);
        
        const updateData: any = {
            updatedBy: user!.email,
            updatedAt: FieldValue.serverTimestamp()
        };
        
        if (role) updateData.role = role;
        if (spreadsheetId !== undefined) updateData.spreadsheetId = spreadsheetId;

        await adminDb.collection('users').doc(uid).update(updateData);

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error: any) {
        console.error('Error updating user role:', error);
        return NextResponse.json({ error: 'Failed to update user role', details: error.message }, { status: 500 });
    }
}
