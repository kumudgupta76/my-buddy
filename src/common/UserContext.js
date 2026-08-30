import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChangedListener } from './authUtils';

// Create the context
export const UserContext = createContext();

// Provider to share authentication state across the app
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // Firebase restores the session asynchronously; until it does we can't tell a
  // signed-out visitor from a signed-in one reloading the page.
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, authLoading }}>
      {children}
    </UserContext.Provider>
  );
};
