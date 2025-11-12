import { VinePointInputButton } from "./vines";
import { Game } from "./game";
import { getSetting, setSetting } from "./settings";

const canvas = document.querySelector("canvas");
if(!canvas) throw new Error("canvas not found!!");
const ctx = canvas?.getContext("2d");
if(!ctx) throw new Error("context not found!!");

const game = new Game(canvas, ctx, false);

const win = {
    levelSelect: document.querySelector("#winLevelSelect") as HTMLDivElement,
    results: document.querySelector("#winResults") as HTMLDivElement,
    settings: document.querySelector("#winSettings") as HTMLDivElement,
};

win.results.style.display = "none";
win.settings.style.display = "none";

const volume = document.querySelector("#volume") as HTMLInputElement;
const updateVolume = () => {
    game.audioVolume(parseFloat(volume.value));
    setSetting("volume", parseFloat(volume.value));
}
volume.addEventListener("change", updateVolume);
volume.value = getSetting("volume").toString();
updateVolume();

const hitSounds = document.querySelector("#hitsounds") as HTMLInputElement;
const updateHitSounds = () => setSetting("hitSounds", hitSounds.checked);
hitSounds.addEventListener("change", updateHitSounds);
hitSounds.checked = getSetting("hitSounds") === true;

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
    game.vines?.toggleHitSounds((document.querySelector("#hitsounds") as HTMLInputElement).checked);

    game.startLevel(() => {
        win.results.style.display = "unset";
        if(!game.vines) return;

        (document.querySelector("#score") as HTMLSpanElement).innerText = game.vines.score.toString();
        (document.querySelector("#combo") as HTMLSpanElement).innerText = game.vines.combo.toString();
        (document.querySelector("#accuracy") as HTMLSpanElement).innerText = game.vines.accuracy().toFixed(2);

        (document.querySelector("#ratingsWaow") as HTMLSpanElement).innerText = game.vines.ratings("waow").toString();
        (document.querySelector("#ratingsGood") as HTMLSpanElement).innerText = game.vines.ratings("good").toString();
        (document.querySelector("#ratingsOk") as HTMLSpanElement).innerText = game.vines.ratings("ok").toString();
        (document.querySelector("#ratingsBad") as HTMLSpanElement).innerText = game.vines.ratings("bad").toString();
        (document.querySelector("#ratingsMiss") as HTMLSpanElement).innerText = game.vines.misses().toString();

        (document.querySelector("#rankImg") as HTMLImageElement).src = game.vines.rank.image;
    });

    win.levelSelect.style.display = "none";
});

let active: HTMLButtonElement | null = null;

document.querySelector("#open")?.addEventListener("click", () => {
    game.openFile();
    if(active !== null) active.classList.remove("active");
    active = null;
});

document.querySelector("#closeResults")?.addEventListener("click", () => {
    win.results.style.display = "none";
    win.levelSelect.style.display = "unset";
});
document.querySelector("#openSettings")?.addEventListener("click", () => win.settings.style.display = "unset");
document.querySelector("#closeSettings")?.addEventListener("click", () => win.settings.style.display = "none");

const indexEl = document.querySelector("#index") as HTMLDivElement;
game.initIndex().then(() => {
    game.getIndex().forEach((level, i) => {
        indexEl.appendChild(document.createElement("br"));

        const levelButton = document.createElement("button");
        levelButton.classList.add("indexlvl");

        const levelName = document.createElement("h2");
        levelName.innerText = level.songName;
        levelButton.appendChild(levelName);

        const levelAuthor = document.createElement("p");
        levelAuthor.innerText = `${level.songAuthor} | level by ${level.levelAuthor}`;
        levelButton.appendChild(levelAuthor);

        levelButton.addEventListener("click", async () => {
            if(active !== null) active.classList.remove("active");
            active = levelButton;
            levelButton.classList.add("active");

            play.disabled = true;
            await game.loadIndexLevel(i)
            play.disabled = false;
        });
        indexEl.appendChild(levelButton);
    });
});