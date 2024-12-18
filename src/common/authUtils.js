// authUtils.js
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { auth } from './firebaseConfig'; // Import the 'auth' object from the firebaseConfig.js file
import { message } from 'antd';

// 1. Sign Up a new user with email and password
export const signUpUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('User signed up:', userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing up:', error.message);
    throw new Error(error.message);
  }
};

// 2. Sign In a user with email and password
export const signInUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('User signed in:', userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in:', error.message);
    throw new Error(error.message);
  }
};

// 3. Sign Out the current user
export const signOutUser = async () => {
  try {
    await signOut(auth);
    message.success('Signed out successfully!');
  } catch (error) {
    message.error('Error signing out:', error.message);
    throw new Error(error.message);
  }
};

// 4. Monitor Authentication State
export const onAuthStateChangedListener = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log('User is signed in:', user);
    } else {
      console.log('User is signed out');
    }
    callback(user); // Pass the user to the callback function
  });
};

// 5. Send Password Reset Email
export const sendPasswordReset = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log('Password reset email sent');
  } catch (error) {
    console.error('Error sending password reset email:', error.message);
    throw new Error(error.message);
  }
};

// 6. Update User Profile (e.g., name, photo URL)
export const updateUserProfile = async (displayName, photoURL) => {
  const user = auth.currentUser;
  if (user) {
    try {
      await updateProfile(user, {
        displayName,
        photoURL
      });
      console.log('User profile updated');
    } catch (error) {
      console.error('Error updating user profile:', error.message);
      throw new Error(error.message);
    }
  } else {
    console.error('No user is currently signed in.');
  }
};

// 7. Get Current User (returns user object if signed in)
export const getCurrentUser = () => {
  const user = auth.currentUser;
  if (user) {
    return user;
  } else {
    console.log('No user is signed in');
    return null;
  }
};
