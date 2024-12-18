import { db } from './firebaseConfig';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// Save JSON data (Create/Update)
export const saveData = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data);
    return { success: true, message: 'Data saved successfully' };
  } catch (error) {
    console.error('Error saving data: ', error);
    return { success: false, error };
  }
};

// Fetch JSON data
export const fetchData = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    } else {
      return { success: false, error: 'Document does not exist' };
    }
  } catch (error) {
    console.error('Error fetching data: ', error);
    return { success: false, error };
  }
};

// Update JSON data
export const updateData = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, data);
    return { success: true, message: 'Data updated successfully' };
  } catch (error) {
    console.error('Error updating data: ', error);
    return { success: false, error };
  }
};

// Delete JSON data
export const deleteData = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
    return { success: true, message: 'Data deleted successfully' };
  } catch (error) {
    console.error('Error deleting data: ', error);
    return { success: false, error };
  }
};


// Example data
const userData = {
    name: "Alice",
    age: 30,
    email: "alice@example.com"
  };
  
  // Save data to Firestore
 export const saveDataTesting = async () => {
    try {
        console.log('saveDataTesting');
      const docRef = doc(db, 'users', 'alice_user');
      await setDoc(docRef, userData);
      console.log('Document written successfully!');
    } catch (error) {
      console.error("Error writing document: ", error);
    }
  };
  
  