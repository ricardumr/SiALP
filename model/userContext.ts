import { auth, firestore } from "../firebase";

export type CurrentUserContext = {
  uid: string;
  bancoId: string;
  adm: boolean;
};

export async function getCurrentUserContext(): Promise<CurrentUserContext | null> {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;

  const userDoc = await firestore.collection("Usuario").doc(uid).get();
  const data = userDoc.exists ? (userDoc.data() as any) : {};
  const bancoId = data?.bancoId || uid;

  if (userDoc.exists && !data?.bancoId) {
    await userDoc.ref.update({ bancoId });
  }

  return {
    uid,
    bancoId,
    adm: !!data?.adm,
  };
}

export async function getBancoRef() {
  const context = await getCurrentUserContext();
  if (!context) return null;
  return firestore.collection("Usuario").doc(context.bancoId);
}

export async function getBancoCollection(collectionName: string) {
  const bancoRef = await getBancoRef();
  return bancoRef ? bancoRef.collection(collectionName) : null;
}
