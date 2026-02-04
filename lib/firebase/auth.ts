import {
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

const googleProvider = new GoogleAuthProvider();

// Domain restriction
const ALLOWED_DOMAIN = process.env.NEXT_PUBLIC_ALLOWED_DOMAIN || 'somatone.com';

/**
 * Sign in with Google using popup
 */
export const signInWithGoogle = async () => {
    try {
        console.log('Starting Google Sign-In...');
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        console.log('Google Sign-In successful. User:', user.email);

        // Check if email domain is allowed
        const emailDomain = user.email?.split('@')[1];
        console.log('Checking domain:', emailDomain);

        if (emailDomain !== ALLOWED_DOMAIN) {
            console.error('Domain mismatch. Allowed:', ALLOWED_DOMAIN, 'Got:', emailDomain);
            await firebaseSignOut(auth);
            throw new Error(`Only @${ALLOWED_DOMAIN} emails are allowed to sign in.`);
        }

        // Create or update user document in Firestore
        console.log('Updating Firestore user document...');
        await createOrUpdateUser(user);
        console.log('Firestore update complete.');

        return user;
    } catch (error: any) {
        console.error('Error signing in with Google:', error);

        // Better error messages
        if (error.code === 'auth/popup-blocked') {
            throw new Error('Popup was blocked by your browser. Please allow popups for this site and try again.');
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
 * Create or update user document in Firestore
 */
const createOrUpdateUser = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // New user - create document
        console.log('Creating new user document for:', user.uid);
        await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            role: 'member', // Default role
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
        });
    } else {
        // Existing user - update last login
        console.log('Updating existing user document for:', user.uid);
        await setDoc(
            userRef,
            {
                lastLogin: serverTimestamp(),
            },
            { merge: true }
        );
    }
};

/**
 * Subscribe to auth state changes
 */
export const onAuthChange = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};
