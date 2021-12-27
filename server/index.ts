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
                history: [],
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

//Endpoint para invitados
app.get("/guess/:fsRoomId", (req, res) => {
  const { fsRoomId } = req.params;
  fsRoomsCol
    .doc(fsRoomId)
    .get()
    .then((roomRef) => {
      const data = roomRef.data();
      res.json({ rtdbId: data.rtdbRef, history: data.history });
    });
});

// Endpoint para usuarios validos que crearon una room
app.get("/rooms/:fsRoomId", (req, res) => {
  const { fsRoomId } = req.params;
  const { userId } = req.query;
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
            res.json({
              rtdbId: data.rtdbRef,
              history: data.history,
            });
          });
      } else {
        res.status(401).json({ message: "Your ID was not found" });
      }
    });
});

//Devuelvo el estado de la sala entero
app.get("/status/:rtdbRoomId", (req, res) => {
  const { rtdbRoomId } = req.params;
  const rtdbRef = rtdb.ref("/rooms/" + rtdbRoomId).child("/playerStatus");
  rtdbRef.get().then((snapshot) => {
    res.send(snapshot.val());
  });
});

app.patch("/status/guess-connect", (req, res) => {
  const { rtdbRoomId } = req.body;
  const { userName } = req.body;
  const { userStatus } = req.body;
  const rtdbRef = rtdb
    .ref("/rooms/" + rtdbRoomId)
    .child("/playerStatus")
    .child("/guess");
  rtdbRef.update({ status: userStatus, userName: userName }, (error) => {
    if (error) {
      res.json({ message: "Write Data failed" });
    } else {
      res.json({ message: "Data saved successfully!" });
    }
  });
});

app.patch("/status/owner-connect", (req, res) => {
  const { rtdbRoomId } = req.body;
  const { userStatus } = req.body;
  const rtdbRef = rtdb
    .ref("/rooms/" + rtdbRoomId)
    .child("/playerStatus")
    .child("/owner");
  rtdbRef.update({ status: userStatus }, (error) => {
    if (error) {
      res.json({ message: "Write Data failed" });
    } else {
      res.json({ message: "Data saved successfully!" });
    }
  });
});

app.patch("/move/owner", (req, res) => {
  const { rtdbRoomId } = req.body;
  const { userName } = req.body;
  const { move } = req.body;
  const rtdbRef = rtdb
    .ref("/rooms/" + rtdbRoomId)
    .child("/currentGame")
    .child("/owner");
  rtdbRef.update({ userName, move }, (error) => {
    if (error) {
      res.json({ message: "Write Data failed" });
    } else {
      res.json({ message: "Data saved successfully!" });
    }
  });
});

app.patch("/move/guess", (req, res) => {
  const { rtdbRoomId } = req.body;
  const { userName } = req.body;
  const { move } = req.body;
  const rtdbRef = rtdb
    .ref("/rooms/" + rtdbRoomId)
    .child("/currentGame")
    .child("/guess");
  rtdbRef.update({ userName, move }, (error) => {
    if (error) {
      res.json({ message: "Write Data failed" });
    } else {
      res.json({ message: "Data saved successfully!" });
    }
  });
});

app.patch("/push-history", (req, res) => {
  const { fsRoomId } = req.body;
  const { history } = req.body;
  const refRoom = fsRoomsCol.doc(fsRoomId);
  refRoom.get().then((docRef) => {
    if (!docRef.exists) {
      res.status(404).json({ message: "Document not found" });
    } else {
      refRoom
        .update({
          history,
        })
        .then(() => {
          res.json({ message: "Your data was saved successfully" });
        });
    }
  });
});

app.use(express.static("dist"));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(port, () => {
  console.log("this app currently running on the port", port);
});
