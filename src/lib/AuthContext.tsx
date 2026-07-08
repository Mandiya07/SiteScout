import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { auth, onAuthStateChanged, db, getDoc, doc } from './firebase';
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
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          let role: 'Admin' | 'User' = 'User';
          
          if (userDoc.exists()) {
            const dataRole = userDoc.data().role;
            role = dataRole === 'admin' ? 'Admin' : 'User';
          }
          
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role,
            subscription: 'Pro Plan', // Placeholder for now
            isVerified: firebaseUser.emailVerified
          });
        } catch (error) {
          console.error("Error fetching user role:", error);
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
