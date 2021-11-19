// const API_BASE_URL = "https://ppt-online.herokuapp.com";
const API_BASE_URL = "http://localhost:3000";
import { dataBaseRT } from "./db";
import { map } from "lodash";

const state = {
  data: {
    userName: "",
    userId: "",
    rtdbRoomId: "",
    fsRoomId: "",
    playerStatus: {
      owner: { userName: "", status: "" },
      guess: { userName: "", status: "" },
    },
    currentGame: {
      owner: { userName: "", move: "" },
      guess: { userName: "", move: "" },
    },
    history: [],
    score: {
      owner: 0,
      guess: 0,
    },
  },
  listeners: [],
  getState() {
    return this.data;
  },

  setState(newState) {
    this.data = newState;
    for (const cb of this.listeners) {
      cb();
    }
    console.log("State", this.data);
  },

  setUserName(name: string) {
    const cs = this.getState();
    cs.userName = name;
    this.setState(cs);
  },

  setFsRoomId(fsRoomId: string) {
    const cs = this.getState();
    cs.fsRoomId = fsRoomId;
    this.setState(cs);
  },

  setUserId(callback) {
    const cs = this.getState();
    const userName = cs.userName;
    if (userName == "") {
      window.alert(
        "Excuse Me, could you introcude your surname please? Thanks!"
      );
    } else {
      fetch(API_BASE_URL + "/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userName }),
      })
        .then((res) => res.json())
        .then((res) => {
          cs.userId = res.userId;
          state.setState(cs);
          callback();
        })
        .catch((err) => {
          console.error("Hubo un problema con la petición FETCH", err);
          callback(true);
        });
    }
  },

  createRoom(callback) {
    const cs = this.getState();
    const { userId, userName } = cs;

    const playerStatus = {
      owner: { userName: userName, status: "" },
      guess: { userName: "", status: "" },
    };

    const currentGame = {
      owner: { userName: userName, move: "" },
      guess: { userName: "", move: "" },
    };

    fetch(API_BASE_URL + "/createRoom", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        userName,
        playerStatus,
        currentGame,
      }),
    })
      .then((res) => res.json())
      .then((response) => {
        cs.fsRoomId = response.fsRoomId;
        this.setState(cs);
        callback();
      })
      .catch((err) => {
        console.error("Hubo un problema con la petición FETCH", err);
        callback(true);
      });
  },

  accessRoomId(callback) {
    const cs = this.getState();
    const { fsRoomId } = cs;
    const { userId } = cs;
    fetch(API_BASE_URL + "/rooms/" + fsRoomId + "?userId=" + userId)
      .then((res) => res.json())
      .then((data) => {
        cs.rtdbRoomId = data.rtdbId;
        this.setState(cs);
        callback();
      })
      .catch((err) => {
        console.error("Hubo un problema con la petición FETCH", err);
        callback(true);
      });
  },

  guessRoomId(callback) {
    const cs = this.getState();
    const { fsRoomId } = cs;
    fetch(API_BASE_URL + "/guess/" + fsRoomId)
      .then((res) => res.json())
      .then((data) => {
        cs.rtdbRoomId = data.rtdbId;
        this.setState(cs);
        callback();
      })
      .catch((err) => {
        console.error("Hubo un problema con la petición FETCH", err);
        callback(true);
      });
  },

  occupancyRoom(callback) {
    const cs = this.getState();
    const { rtdbRoomId } = cs;
    console.log("occupancy", rtdbRoomId);

    fetch(API_BASE_URL + "/status/" + rtdbRoomId)
      .then((res) => res.json())
      .then((data) => {
        cs.playerStatus.guess.status = data.status;
        cs.playerStatus.guess.userName = data.userName;
        this.setState(cs);
        callback();
      })
      .catch((err) => {
        console.error("Hubo un problema con la petición FETCH", err);
        callback(true);
      });
  },

  //Se conecta a la rtdb y se queda escuchando posibles cambios.
  connectToRoom() {
    const cs = this.getState();
    const { rtdbRoomId } = cs;
    const rtdbRef = dataBaseRT.ref("/rooms/" + rtdbRoomId);
    rtdbRef.on("value", (snapshot) => {
      const data = snapshot.val();
      const cs = this.getState();

      cs.playerStatus.owner.userName = data.playerStatus.owner.userName;
      cs.playerStatus.owner.status = data.playerStatus.owner.status;

      cs.playerStatus.guess.userName = data.playerStatus.guess.userName;
      cs.playerStatus.guess.status = data.playerStatus.guess.status;

      cs.currentGame.owner.userName = data.currentGame.owner.userName;
      cs.currentGame.owner.move = data.currentGame.owner.move;

      cs.currentGame.guess.userName = data.currentGame.guess.userName;
      cs.currentGame.guess.move = data.currentGame.guess.move;

      this.setState(cs);
    });
  },

  ownerStatus(userStatus) {
    const cs = this.getState();
    const { rtdbRoomId } = cs;
    fetch(API_BASE_URL + "/status/owner-connect", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rtdbRoomId,
        userStatus,
      }),
    });
  },

  guessStatus(userStatus) {
    const cs = this.getState();
    const { rtdbRoomId } = cs;
    const { userName } = cs;
    fetch(API_BASE_URL + "/status/guess-connect", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rtdbRoomId,
        userName,
        userStatus,
      }),
    });
  },

  ownerMove() {
    const cs = this.getState();
    const { rtdbRoomId } = cs;
    const { userName } = cs;
    const move = cs.currentGame.owner.move;
    fetch(API_BASE_URL + "/move/owner", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rtdbRoomId,
        userName,
        move,
      }),
    });
  },

  guessMove() {
    const cs = this.getState();
    const { rtdbRoomId } = cs;
    const { userName } = cs;
    const move = cs.currentGame.guess.move;
    fetch(API_BASE_URL + "/move/guess", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rtdbRoomId,
        userName,
        move,
      }),
    });
  },

  pushToHistory(owner, guess) {
    const cs = this.getState();
    cs.history.push({
      owner,
      guess,
    });
  },

  whoWins(ownerMove: string, guessMove: string) {
    const iWontPaper = ownerMove == "paper" && guessMove == "stone";
    const iWontStone = ownerMove == "stone" && guessMove == "scissors";
    const iWontScissors = ownerMove == "scissors" && guessMove == "paper";
    const iWont = [iWontPaper, iWontStone, iWontScissors].includes(true);

    const iLostPaper = ownerMove == "stone" && guessMove == "paper";
    const iLostStone = ownerMove == "scissors" && guessMove == "stone";
    const iLostScissors = ownerMove == "paper" && guessMove == "scissors";
    const iLost = [iLostPaper, iLostStone, iLostScissors].includes(true);

    if (iWont == true) {
      return "Ganaste";
    } else if (iLost == true) {
      return "Perdiste";
    } else {
      return "Empate";
    }
  },

  calcScore() {
    const cs = state.getState();
    const { history } = cs;
    let scoreOwner = 0;
    let scoreGuess = 0;
    history.forEach((e) => {
      const result = state.whoWins(e.owner, e.guess);
      if (result == "Ganaste") {
        scoreOwner += 1;
        console.log("SCORE OWNER", scoreOwner);

        cs.score.owner = scoreOwner;
        console.log("STATE SCORE OWNER", cs.score.owner);
      }
      if (result == "Perdiste") {
        scoreGuess += 1;
        console.log("SCORE guess", scoreGuess);
        cs.score.guess = scoreGuess;

        console.log("STATE SCORE guess", cs.score.guess);
      }
    });
  },

  subscribe(callback) {
    this.listeners.push(callback);
  },
};

export { state };
