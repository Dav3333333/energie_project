import { useEffect, useMemo, useState } from 'react';
import { AuthContext } from '@/features/auth/hooks/useAuth';
import { subscribeAuthState, signOut as authSignOut } from '@/features/auth/services/authService';
import { subscribeUserProfile } from '@/features/auth/services/userService';

export default function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Écoute de l'état Firebase Auth.
  useEffect(() => {
    const unsub = subscribeAuthState((user) => {
      setFirebaseUser(user);
      if (!user) {
        setProfile(null);
        setProfileLoading(false);
        setInitializing(false);
      } else {
        setProfileLoading(true);
      }
    });
    return unsub;
  }, []);

  // Écoute du profil Firestore dès qu'un utilisateur est connecté.
  useEffect(() => {
    if (!firebaseUser) return undefined;
    const unsub = subscribeUserProfile(
      firebaseUser.uid,
      (data) => {
        setProfile(data);
        setProfileLoading(false);
        setInitializing(false);
      },
      (err) => {
        console.error('[AuthProvider] Profil Firestore erreur :', err);
        setProfile(null);
        setProfileLoading(false);
        setInitializing(false);
      },
    );
    return unsub;
  }, [firebaseUser]);

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      initializing,
      profileLoading,
      isAuthenticated: !!firebaseUser,
      isActive: profile?.status === 'ACTIVE',
      role: profile?.role ?? null,
      galleryIds: profile?.galleryIds ?? [],
      shopIds: profile?.shopIds ?? [],
      signOut: authSignOut,
    }),
    [firebaseUser, profile, initializing, profileLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}