import { Router } from "@vaadin/router";
import { state } from "../../state";

class AccessRoomPage extends HTMLElement {
  shadow: ShadowRoot;
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    this.render();
  }

  listeners() {
    const formEl = this.shadow.querySelector(".customForm");
    formEl.addEventListener("submitForm", (e: any) => {
      state.setFsRoomId(e.detail.value);
      this.connectData();
    });
  }

  connectData() {
    state.guessRoomId((err) => {
      if (err) {
        console.error("There was an error in your roomId");
      } else {
        state.connectToRoom();
        Router.go("/signup");
      }
    });
  }

  render() {
    const sectionEl = document.createElement("section");
    sectionEl.className = "access-room";
    sectionEl.innerHTML = `
  <div class="access-room__container">
    <div class="access-room__container-title">
        <custom-text tag="h1" size="80px">Piedra, Papel, ó Tijera</custom-text>
    </div>
        <custom-form class="customForm" label="Ingresa el código" id="name" name="name" placeholder="CÓDIGO" text="Ingresar a la sala" ></custom-form>
    <div class="access-room__container-hands">
        <hands-el tag="scissors" width="65px" height="125px"></hands-el>
        <hands-el tag="stone" width="65px" height="125px"></hands-el>
        <hands-el tag="paper" width="65px" height="125px"></hands-el>
    </div>
  </div>

  `;
    const style = document.createElement("style");
    style.innerHTML = `
    .access-room__container{
        max-width:100%;
        height:100vh;
        padding:0px 26px;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:space-between;
    }

    @media(min-width:376px){
      .access-room__container{
        width:100%;
        height:100vh;
        padding:40px 26px 0px 26px;
    }}

    .access-room__container-title{
      width:284px;
      height:280px;
      padding-top:20px;
      box-sizing: border-box;
    }

      .access-room__container-hands{
        width:273px;
        height:130px;
        display:flex;
        align-items:center;
        justify-content:space-between;
      }
    `;
    this.shadow.appendChild(sectionEl);
    this.shadow.appendChild(style);
    this.listeners();
  }
}
window.customElements.define("x-accessroom-page", AccessRoomPage);
