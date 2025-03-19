import { VinePoint, Vines } from "./vines";

const segs: VinePoint[][] = [
    [
        { button: "none", type: "normal", t: 0, x: -20 + 160, y: -40 + 90, a: 0 },
        { button: "none", type: "normal", t: 1000, x: 30 + 160, y: -20 + 90, a: Math.PI / 2 },
        { button: "none", type: "normal", t: 2000, x: 50 + 160, y: 30 + 90, a: Math.PI / 2 },
        { button: "none", type: "normal", t: 3000, x: 130 + 160, y: 50 + 90, a: -Math.PI / 2 },
        { button: "none", type: "normal", t: 4000, x: -120 + 160, y: -40 + 90, a: -Math.PI / 2 },
        { button: "none", type: "normal", t: 5000, x: -20 + 160, y: -40 + 90, a: 0 },
    ]
];

const canvas = document.querySelector("canvas");
if(!canvas) throw new Error("canvas not found!!");
const ctx = canvas?.getContext("2d");
if(!ctx) throw new Error("context not found!!");

const vines = new Vines(canvas, ctx, segs);
vines.preload();
let n = 0;
setInterval(() => vines.render(n += 10), 10);