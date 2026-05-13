const firebase = require("firebase/compat/app");
require("firebase/compat/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyAzb3sNSQTIC3qtp2zZ4798UDkQfiKe3mE",
  authDomain: "info-63d45.firebaseapp.com",
  projectId: "info-63d45",
  storageBucket: "info-63d45.firebasestorage.app",
  messagingSenderId: "501437748070",
  appId: "1:501437748070:web:ed50c12474c6168fb52ea7",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const firestore = firebase.firestore();

async function deleteAllItems() {
  const rawLimit = Number(process.argv[2] || 0);
  const deleteLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : null;
  const snapshot = await firestore.collectionGroup("Item").get();
  const docs = deleteLimit ? snapshot.docs.slice(0, deleteLimit) : snapshot.docs;
  console.log(
    `Encontrados ${snapshot.size} item(ns). Excluindo ${docs.length} item(ns)${
      deleteLimit ? ` (limite ${deleteLimit})` : ""
    }.`
  );

  if (docs.length === 0) {
    return;
  }

  let batch = firestore.batch();
  let count = 0;

  for (const doc of docs) {
    batch.delete(doc.ref);
    count += 1;

    if (count % 450 === 0) {
      await batch.commit();
      console.log(`Excluídos ${count} item(ns)...`);
      batch = firestore.batch();
    }
  }

  const pending = count % 450;
  if (pending !== 0) {
    await batch.commit();
  }

  console.log(`Concluído. Excluídos ${count} item(ns).`);
}

deleteAllItems()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Falha ao excluir itens:", error);
    process.exit(1);
  });
