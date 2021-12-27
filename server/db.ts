import * as admin from "firebase-admin";
require("dotenv").config();

const service = JSON.parse(process.env.FIREBASE_CONFIG);

admin.initializeApp({
  credential: admin.credential.cert(service),
  databaseURL: "https://game-ppt-online-default-rtdb.firebaseio.com",
});

const firestore = admin.firestore();
const rtdb = admin.database();

export { firestore, rtdb };
