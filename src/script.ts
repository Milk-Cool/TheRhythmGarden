import { VinePointInputButton } from "./vines";
import { Game } from "./game";

const canvas = document.querySelector("canvas");
if(!canvas) throw new Error("canvas not found!!");
const ctx = canvas?.getContext("2d");
if(!ctx) throw new Error("context not found!!");

const game = new Game(canvas, ctx, false);

const win = {
    levelSelect: document.querySelector("#winLevelSelect") as HTMLDivElement
};

const volume = document.querySelector("#volume") as HTMLInputElement;
const updateVolume = () => game.audioVolume(parseFloat(volume.value));
volume.addEventListener("change", updateVolume);
updateVolume();

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
    game.startLevel(() => win.levelSelect.style.display = "unset");

    win.levelSelect.style.display = "none";
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