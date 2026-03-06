import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN || 'somatone.com';

export interface AuthenticatedUser {
    uid: string;
    email: string;
    role: 'admin' | 'member';
}

/**
 * Verifies the Firebase ID token from the Authorization header
 * and ensures the user is from the allowed domain.
 */
export async function verifySession(request: Request, requireAdmin = false): Promise<{ user: AuthenticatedUser | null; errorResponse: NextResponse | null }> {
    const authHeader = request.headers.get('Authorization');
    let token = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split('Bearer ')[1];
    } else {
        // Fallback to query parameter (useful for images/videos in <img>/<video> tags)
        const { searchParams } = new URL(request.url);
        token = searchParams.get('token') || '';
    }

    if (!token) {
        return {
            user: null,
            errorResponse: NextResponse.json({ error: 'Unauthorized: Missing or invalid authentication' }, { status: 401 })
        };
    }

    try {
        // 1. Verify the ID token
        const decodedToken = await adminAuth.verifyIdToken(token);

        // 2. Check domain restriction
        const email = decodedToken.email;
        const emailDomain = email?.split('@')[1];

        if (emailDomain !== ALLOWED_DOMAIN) {
            console.error(`🛡️ API Blocked: Domain mismatch. Expected: ${ALLOWED_DOMAIN}, Got: ${emailDomain}`);
            return {
                user: null,
                errorResponse: NextResponse.json({ error: `Forbidden: Only @${ALLOWED_DOMAIN} users are allowed` }, { status: 403 })
            };
        }

        // 3. Get user data from Firestore to check role
        const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
        const userData = userDoc.data();
        const role = userData?.role || 'member';

        // 4. Role check if required
        if (requireAdmin && role !== 'admin') {
            console.error(`🛡️ API Blocked: Admin role required for ${email}`);
            return {
                user: null,
                errorResponse: NextResponse.json({ error: 'Forbidden: Admin access only' }, { status: 403 })
            };
        }

        return {
            user: {
                uid: decodedToken.uid,
                email: email!,
                role
            },
            errorResponse: null
        };
    } catch (error: any) {
        console.error('🛡️ API Blocked: Session verification failed:', error.message);
        return {
            user: null,
            errorResponse: NextResponse.json({ error: 'Unauthorized: Session expired or invalid' }, { status: 401 })
        };
    }
}
