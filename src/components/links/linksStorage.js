import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { db } from '../../common/firebaseConfig';
import { normalizeLink } from './linkModel';

const linksCollection = (uid) => collection(db, 'users', uid, 'links');

export const loadLinks = async (uid) => {
  try {
    const snapshot = await getDocs(linksCollection(uid));
    return {
      success: true,
      links: snapshot.docs.map(linkDoc => normalizeLink({ ...linkDoc.data(), id: linkDoc.id })),
    };
  } catch (error) {
    console.error('Could not load saved links', error);
    return { success: false, links: [], error };
  }
};

export const saveLink = async (uid, link) => {
  try {
    const linkRef = doc(linksCollection(uid), link.id);
    await setDoc(linkRef, normalizeLink(link));
    return { success: true };
  } catch (error) {
    console.error('Could not save link', error);
    return { success: false, error };
  }
};

export const deleteLink = async (uid, linkId) => {
  try {
    await deleteDoc(doc(linksCollection(uid), linkId));
    return { success: true };
  } catch (error) {
    console.error('Could not delete link', error);
    return { success: false, error };
  }
};
