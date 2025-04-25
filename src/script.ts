import { VinePointInputButton } from "./vines";
import { Game } from "./game";

const canvas = document.querySelector("canvas");
if(!canvas) throw new Error("canvas not found!!");
const ctx = canvas?.getContext("2d");
if(!ctx) throw new Error("context not found!!");

const game = new Game(canvas, ctx, false);

document.querySelector("#file")?.addEventListener("change", async e => {
    const input = e.target as HTMLInputElement;
    if(!input.files || !input.files.length) return;
    await game.loadLevel(input.files[0]);
});

document.addEventListener("keydown", e => {
    const btn: VinePointInputButton =
        e.key === "x"
        ? "middle"
        : e.key === "z"
        ? "left"
        : "right";
    // Maybe there's a better way to do this? idk too lazy to think about it
    if(btn === "right" && e.key !== "c")
        return;
    game.input(btn);
});
const play = document.querySelector("#play") as HTMLButtonElement;
play.addEventListener("click", async () => {
    game.startLevel(() => play.disabled = false);

    play.disabled = true;
});

document.querySelector("#open")?.addEventListener("click", () => game.openFile());

const indexEl = document.querySelector("#index") as HTMLDivElement;
game.initIndex().then(() => {
    game.getIndex().forEach((level, i) => {
        indexEl.appendChild(document.createElement("br"));

        const levelButton = document.createElement("button");
        levelButton.innerText = level.songName;
        levelButton.addEventListener("click", async () => await game.loadIndexLevel(i));
        indexEl.appendChild(levelButton);
    });
});