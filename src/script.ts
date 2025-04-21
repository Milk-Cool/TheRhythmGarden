import { setFrameHandler } from "./frames";
import { CameraPoint, VinePoint, VinePointInputButton, Vines } from "./vines";

const segs: VinePoint[][] = [
    [
        { button: "none", t: 0, x: -20 + 160, y: -40 + 90, a: 0 },
        { button: "right", t: 1000, x: 30 + 160, y: -20 + 90, a: Math.PI / 2 },
        { button: "middle", t: 2000, x: 50 + 160, y: 30 + 90, a: Math.PI / 2 },
        { button: "left", t: 3000, x: 130 + 160, y: 50 + 90, a: -Math.PI / 2 },
        { button: "left", t: 4000, x: -10 + 160, y: -70 + 90, a: Math.PI },
        { button: "none", t: 5000, x: -20 + 160, y: -40 + 90, a: 0 },
    ]
];

const camera: CameraPoint[] = [
    { t: 0, x: 20, y: 40 },
    { t: 1000, x: -30, y: 20 },
    { t: 2000, x: -50, y: -30 },
    { t: 3000, x: -130, y: -50 },
    { t: 4000, x: 10, y: 70 },
    { t: 5000, x: 20, y: 40 },
];

const canvas = document.querySelector("canvas");
if(!canvas) throw new Error("canvas not found!!");
const ctx = canvas?.getContext("2d");
if(!ctx) throw new Error("context not found!!");

let vines: Vines;
let t = -1;

document.addEventListener("keydown", e => {
    if(t === -1) return;
    const btn: VinePointInputButton =
        e.key === "x"
        ? "middle"
        : e.key === "z"
        ? "left"
        : "right";
    // Maybe there's a better way to do this? idk too lazy to think about it
    if(btn === "right" && e.key !== "c")
        return;
    console.log(btn);
    vines.input(btn, t);
});
const play = document.querySelector("#play") as HTMLButtonElement;
play.addEventListener("click", () => {
    t = 0;
    vines = new Vines(canvas, ctx, segs, camera, true);
    vines.preload();
    
    setFrameHandler(deltaMs => {
        const done = vines.render(t += deltaMs);
        if(done) {
            play.disabled = false;
            return false;
        }
        return true;
    });
    play.disabled = true;
});