import React, { createContext, useState, useEffect } from 'react';
import { onAuthStateChangedListener } from './authUtils';

// Create the context
export const UserContext = createContext();

// Provider to share authentication state across the app
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener(setUser);
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
};
