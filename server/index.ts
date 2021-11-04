import { firestore, rtdb } from "./db";
import * as express from "express";
import { nanoid } from "nanoid";
import * as cors from "cors";
import * as randomstring from "randomstring";
import * as path from "path";

const app = express();
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());

const fsUsersCol = firestore.collection("users");
const fsRoomsCol = firestore.collection("rooms");

app.post("/signup", (req, res) => {
  //extraemos la prop userName
  const { userName } = req.body;
  //Buscamos en la collection de user si el usuario existe.
  fsUsersCol
    .where("userName", "==", userName)
    .get()
    .then((userRef) => {
      //Si el usuario existe, respondemos con un mensaje y el id de ese usuario.
      if (!userRef.empty) {
        res.status(400).json({
          message: "Username already exist",
          userId: userRef.docs[0].id,
        });
      } else {
        // add crea un documento en la collection y establece su info
        fsUsersCol
          .add({
            userName,
          })
          .then((newDocRef) => {
            res.status(201).json({
              //Del parámetro de la función que resuelve la promesa puedo extraer el id del doc
              //que se creo.
              userId: newDocRef.id,
              newUser: true,
            });
          });
      }
    });
});

app.post("/createRoom", (req, res) => {
  const { userId } = req.body;
  const { userName } = req.body;
  const { playerStatus } = req.body;
  const { currentGame } = req.body;

  console.log("Soy", userName);
  // console.log(currentGame);

  //Busca en la collection de users el userId recibido
  fsUsersCol
    .doc(userId)
    .get()
    .then((userRef) => {
      //Si existe en la collection un referecia con mi userId
      if (!userRef.exists) {
        res.status(401).json({
          message: "Unauthorized user",
        });
      } else {
        //Creo una nueva referencia en la rtdb asignandole un id aleatorio generado por nanoid
        const rtdbRef = rtdb.ref("/rooms/" + nanoid());
        //Establezco sus propiedades y valores
        rtdbRef
          .set({
            ownerId: userId,
            ownerName: userName,
            playerStatus,
            currentGame,
          })
          .then(() => {
            //Una vez creada la room en la rtdb y resuelta la promesa. Voy a crear el id corto en firestore
            // y dentro de ese doc voy a guardar el id largo de la rtdb
            const fsId = randomstring.generate(6).toUpperCase();
            const fsRef = fsRoomsCol.doc(fsId);
            fsRef
              .set({
                rtdbRef: rtdbRef.key,
              })
              .then(() => {
                res.json({
                  fsRoomId: fsId,
                });
              });
          });
      }
    });
});

app.get("/rooms/:fsRoomId", (req, res) => {
  const { fsRoomId } = req.params;
  console.log(fsRoomId);
  const { userId } = req.query;
  console.log(userId);

  fsUsersCol
    .doc(userId.toString())
    .get()
    .then((userRef) => {
      if (userRef.exists) {
        fsRoomsCol
          .doc(fsRoomId)
          .get()
          .then((roomRef) => {
            const data = roomRef.data();
            console.log("soy data", data);
            res.json({ rtdbId: data });
          });
      } else {
        res.status(401).json({ message: "Your ID was not found" });
      }
    });
});

// app.post("/room-score", (req, res) => {
//   const { userId } = req.body;
//   const { fsRoomId } = req.body;
// });

app.use(express.static("dist"));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(port, () => {
  console.log("this app currently running on the port", port);
});
