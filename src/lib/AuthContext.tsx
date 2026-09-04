import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, onAuthStateChanged, db, getDoc, doc, setDoc, serverTimestamp, handleFirestoreError, OperationType } from './firebase';
import { UserSession } from '../types';

interface AuthContextType {
  user: UserSession | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: User | null) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          let role: 'Admin' | 'User' = 'User';
          
          if (userDoc.exists()) {
            const dataRole = userDoc.data().role;
            role = (dataRole === 'admin' || dataRole === 'Admin') ? 'Admin' : 'User';
          } else {
            // Ensure default user document exists
            try {
              await setDoc(userDocRef, {
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'User',
                role: 'User',
                createdAt: serverTimestamp()
              }, { merge: true });
            } catch (createErr) {
              handleFirestoreError(createErr, OperationType.CREATE, `users/${firebaseUser.uid}`);
            }
          }
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role,
            subscription: 'Pro Plan',
            isVerified: firebaseUser.emailVerified
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role: 'User',
            subscription: 'Pro Plan',
            isVerified: firebaseUser.emailVerified
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

