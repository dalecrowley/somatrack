import {
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    GoogleAuthProvider,
    User,
} from 'firebase/auth';
import { 
    doc, 
    setDoc, 
    getDoc, 
    serverTimestamp,
    collection,
    query,
    where,
    getDocs,
    deleteDoc
} from 'firebase/firestore';
import { auth, db } from './config';

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

        // Create or update user document in Firestore
        // We only pass a role if it's a forced 'admin' role for an initial admin
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
 * Create or update user document in Firestore
 */
const createOrUpdateUser = async (user: User, fixedRole?: 'admin' | 'member') => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const normalizedEmail = user.email?.toLowerCase().trim();
        console.log('User document not found for UID:', user.uid, 'Checking for invited account by email:', normalizedEmail);
        
        try {
            const usersRef = collection(db, 'users');
            // We use the normalized email for the query
            const q = query(usersRef, where('email', '==', normalizedEmail));
            const querySnap = await getDocs(q);
            
            if (!querySnap.empty) {
                // Found invited account(s). Use the first one and clean up.
                const invitedDoc = querySnap.docs[0];
                const invitedData = invitedDoc.data();
                
                console.log('Found invited account. Migrating data to UID:', user.uid);
                
                await setDoc(userRef, {
                    ...invitedData,
                    uid: user.uid,
                    displayName: user.displayName || invitedData.displayName,
                    photoURL: user.photoURL || invitedData.photoURL,
                    role: fixedRole || invitedData.role || 'member',
                    lastLogin: serverTimestamp(),
                });
                
                // Delete the old placeholder document
                await deleteDoc(invitedDoc.ref);
                
                // Clean up any other duplicates with the same email
                if (querySnap.size > 1) {
                    for (let i = 1; i < querySnap.size; i++) {
                        await deleteDoc(querySnap.docs[i].ref);
                    }
                }
            } else {
                // Truly new user - create document
                console.log('Creating new user document for:', user.uid);
                await setDoc(userRef, {
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    role: fixedRole || 'member',
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    uid: user.uid
                });
            }
        } catch (error) {
            console.error('Error during user document migration/creation:', error);
            // Fallback: build the doc anyway so they can log in
            await setDoc(userRef, {
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                role: fixedRole || 'member',
                lastLogin: serverTimestamp(),
                uid: user.uid
            }, { merge: true });
        }
    } else {
        // Existing user - update last login
        const updateData: any = {
            lastLogin: serverTimestamp(),
        };
        
        if (fixedRole === 'admin') {
            updateData.role = 'admin';
        }
        
        await setDoc(userRef, updateData, { merge: true });
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
