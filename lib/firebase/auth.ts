import {
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    GoogleAuthProvider,
    User,
} from 'firebase/auth';
import { auth } from './config';

// Set persistence to local (survives browser restart)
setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error('Failed to set auth persistence:', err);
});

const googleProvider = new GoogleAuthProvider();

// Domain restriction
const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN || 'somatone.com';

/**
 * Sign in with Google using popup
 */
export const signInWithGoogle = async () => {
    try {
        console.log('Starting Google Sign-In with popup...');
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        console.log('Google Sign-In successful. User:', user.email);

        // Check if email domain is allowed
        const emailDomain = user.email?.split('@')[1];
        if (emailDomain !== ALLOWED_DOMAIN) {
            console.error('Domain mismatch. Allowed:', ALLOWED_DOMAIN, 'Got:', emailDomain);
            await firebaseSignOut(auth);
            throw new Error(`Only @${ALLOWED_DOMAIN} emails are allowed to sign in.`);
        }

        // Admin detection
        const INITIAL_ADMINS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'dale.crowley@somatone.com').split(',').map(e => e.trim().toLowerCase());
        const isInitialAdmin = user.email ? INITIAL_ADMINS.includes(user.email.toLowerCase()) : false;

        // Create or update user document in Firestore (via Server Sync)
        await createOrUpdateUser(user, isInitialAdmin ? 'admin' : undefined);
        return user;
    } catch (error: any) {
        console.error('Error signing in with Google popup:', error);

        if (error.code === 'auth/popup-blocked') {
            throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site.');
        }
        if (error.code === 'auth/popup-closed-by-user') {
            throw new Error('Sign-in cancelled. Please try again.');
        }

        throw error;
    }
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
    try {
        await firebaseSignOut(auth);
    } catch (error) {
        console.error('Error signing out:', error);
        throw error;
    }
};

/**
 * Create or update user document in Firestore (via Server Sync)
 */
const createOrUpdateUser = async (user: User, fixedRole?: 'admin' | 'member') => {
    try {
        console.log('🛰️ Syncing user account with server...');
        const token = await user.getIdToken();
        
        const res = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const error = await res.json();
            console.error('❌ Server sync failed:', error);
        } else {
            console.log('✅ Server sync successful');
            
            // If we have a fixed role (initial admin), enforce it via PATCH
            if (fixedRole === 'admin') {
                await fetch('/api/users', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ uid: user.uid, role: 'admin' })
                });
            }
        }
    } catch (error) {
        console.error('❌ Error during user sync:', error);
    }
};

/**
 * Get current user's ID token
 */
export const getIdToken = async () => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken(true);
};

/**
 * Subscribe to auth state changes
 */
export const onAuthChange = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};
