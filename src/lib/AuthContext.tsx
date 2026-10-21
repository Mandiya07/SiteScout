import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth, onAuthStateChanged, db, getDoc, doc, setDoc, serverTimestamp, handleFirestoreError, OperationType } from './firebase';
import { UserSession } from '../types';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
  setSessionUser: (user: UserSession | null) => void;
  loginAsPreviewAdmin: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setSessionUser: () => {},
  loginAsPreviewAdmin: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('sitescout_preview_user');
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (e) {}
    return null;
  });
  const [loading, setLoading] = useState(true);

  const loginAsPreviewAdmin = () => {
    const adminUser: UserSession = {
      uid: 'preview_super_admin',
      email: 'siphom.yati@gmail.com',
      name: 'Sipho M. (Super Admin)',
      role: 'Admin',
      subscription: 'Agency VIP',
      isVerified: true
    };
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sitescout_preview_user', JSON.stringify(adminUser));
      }
    } catch (e) {}
    setUser(adminUser);
  };

  const logout = async () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sitescout_preview_user');
      }
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          const isAdminEmail = firebaseUser.email === 'siphom.yati@gmail.com';
          let role: 'Admin' | 'User' = isAdminEmail ? 'Admin' : 'User';
          
          if (userDoc.exists()) {
            const dataRole = userDoc.data().role;
            if (dataRole === 'admin' || dataRole === 'Admin' || isAdminEmail) {
              role = 'Admin';
            }
          } else {
            // Ensure default user document exists
            try {
              await setDoc(userDocRef, {
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'User',
                role: isAdminEmail ? 'admin' : 'User',
                createdAt: serverTimestamp()
              }, { merge: true });
            } catch (createErr) {
              handleFirestoreError(createErr, OperationType.CREATE, `users/${firebaseUser.uid}`);
            }
          }
          
          const newSession: UserSession = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role,
            subscription: 'Pro Plan',
            isVerified: firebaseUser.emailVerified
          };
          setUser(newSession);
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('sitescout_preview_user', JSON.stringify(newSession));
            }
          } catch (e) {}
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          const isAdminEmail = firebaseUser.email === 'siphom.yati@gmail.com';
          const fallbackSession: UserSession = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role: isAdminEmail ? 'Admin' : 'User',
            subscription: 'Pro Plan',
            isVerified: firebaseUser.emailVerified
          };
          setUser(fallbackSession);
          try {
            if (typeof window !== 'undefined') {
              localStorage.setItem('sitescout_preview_user', JSON.stringify(fallbackSession));
            }
          } catch (e) {}
        }
      } else {
        // If Firebase user is not signed in, check if a preview user is in localStorage
        try {
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('sitescout_preview_user');
            if (stored) {
              setUser(JSON.parse(stored));
            } else {
              setUser(null);
            }
          } else {
            setUser(null);
          }
        } catch (e) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setSessionUser: setUser, loginAsPreviewAdmin, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

