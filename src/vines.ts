import { pointsOnBezierCurves, Point } from "points-on-curve";
import filter from "./antifilter";
import * as easingFunctions from "./easings";
import { until } from "./until";
import { Meta } from "./meta";

export type VinePointInputButton = "left" | "middle" | "right";
export type VinePointButton = VinePointInputButton | "none";

const indicators: Record<VinePointInputButton, string> = {
    "left": "L",
    "middle": "M",
    "right": "R"
}

export type VinePoint = {
    t: number,
    button: VinePointButton,
    x: number,
    y: number,
    a: number
};

export type CameraEasing = "sine-in-out" | "sine-in" | "sine-out" | "linear";
export const easings: Record<CameraEasing, (x: number) => number> = {
    "linear": easingFunctions.linear,
    "sine-in": easingFunctions.easeInSine,
    "sine-out": easingFunctions.easeOutSine,
    "sine-in-out": easingFunctions.easeInOutSine
};

export type CameraPoint = {
    t: number,
    x: number,
    y: number,
    easing?: CameraEasing
}

type PreloadedSegment = {
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    t: number
};

export const lineWidth = 12;
const colors = {
    background: "#40593d",
    vineBack: "#76ad6f",
    vineFront: "#82c27a",
    keyBack: "#7f7f7f",
    keyBackHit: "#467d55",
    keyFront: "#ffffff",
    hud: "#ffffff"
};

const timings = {
    "waow": 50,
    "good": 100,
    "ok": 150,
    "bad": 300
};
export type Timing = keyof typeof timings;

const flowerFrames = 4;
const flowerFrameInterval = 50;
const flowerColors: Record<string, string> = {
    "red": "/flower/red%n.png",
    "white": "/flower/white%n.png"
};
export type FlowerColor = keyof typeof flowerColors;

type Hit = {
    timing: Timing,
    t: number,
    color: FlowerColor,
    rot: number
};

const btnIndicatorBefore = 1500;
const btnIndicatorAfter = 300;
const btnIndicatorFade = 300;

const ACCURACY: Record<Timing, number> = {
    "waow": 1,
    "good": 0.8,
    "ok": 0.6,
    "bad": 0.3
};

const RATINGS_IMAGES: Record<Timing, string> = {
    "waow": "/ratings/waow.png",
    "good": "/ratings/good.png",
    "ok": "/ratings/ok.png",
    "bad": "/ratings/bad.png"
};

type LineState = "none" | "line";

export class Vines {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    segs: VinePoint[][];
    camera: CameraPoint[];
    audio: HTMLAudioElement | null = null;
    audioURI: string | Blob;
    offset: number;
    startPos: number;
    private preloaded: PreloadedSegment[][] = [];
    private hit: Hit[][] = [];
    private debug: boolean;

    private ox = 0;
    private oy = 0;

    private maxTime: number = -1;

    private ratingImages: Record<Timing, HTMLImageElement | null>;
    private flowerImages: Record<FlowerColor, HTMLImageElement[]> = {};

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, segs: VinePoint[][] = [], camera: CameraPoint[] = [], audioURI: string | Blob, meta: Meta, debug: boolean = false) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.segs = segs;
        this.camera = camera;
        this.audioURI = audioURI;

        this.ctx.filter = filter;
        this.debug = debug;

        this.offset = meta.offset;
        this.startPos = meta.startPos ?? 0;
        this.ratingImages = Object.fromEntries(Object.keys(RATINGS_IMAGES).map(x => [x, null])) as Record<Timing, HTMLImageElement | null>;
    }

    private iterPoints(cb: (point: VinePoint, segI: number, pointI: number) => void) {
        this.segs.forEach((seg, segI) => {
            seg.forEach((point, pointI) => cb(point, segI, pointI));
        });
    }

    async preload(tolerance = .5) {
        if(this.segs.length < 1) return;

        this.audio = new Audio();
        let loaded = false;
        this.audio.oncanplaythrough = () => loaded = true;
        this.audio.src = this.audioURI instanceof Blob ? URL.createObjectURL(this.audioURI) : this.audioURI;

        const loadedImgs = Object.fromEntries(Object.keys(RATINGS_IMAGES).map(x => [x, false])) as Record<Timing, boolean>;
        for(const [i, x] of Object.entries(RATINGS_IMAGES)) {
            this.ratingImages[i] = new Image();
            this.ratingImages[i].addEventListener("load", () => loadedImgs[i] = true);
            this.ratingImages[i].src = x;
        }

        const loadedFlowers: boolean[] = [];
        let n = 0;
        for(const flowerColor of Object.keys(flowerColors)) {
            this.flowerImages[flowerColor] = [...new Array(flowerFrames).keys()].map((_x, i) => {
                const img = new Image();
                loadedFlowers.push(false);
                const thisN = n++;
                img.addEventListener("load", () => { loadedFlowers[thisN] = true; });
                img.src = flowerColors[flowerColor].replace("%n", (i + 1).toString());
                return img;
            });
        }

        for(const segI in this.segs) {
            const seg = this.segs[segI];
            if(seg.length < 2) continue;
            this.preloaded[segI] = [];
            for(let i = 1; i < seg.length; i++) {
                const cur = seg[i], last = seg[i - 1];
                this.maxTime = Math.max(this.maxTime, cur.t, last.t);
                const pointDist = Math.hypot(cur.x - last.x, cur.y - last.y) / 2;
                const pcur = { x: cur.x + Math.cos(cur.a + Math.PI) * pointDist, y: cur.y + Math.sin(cur.a + Math.PI) * pointDist },
                    plast = { x: last.x + Math.cos(last.a) * pointDist, y: last.y + Math.sin(last.a) * pointDist };
                const curve: Point[] = [[last.x, last.y], [plast.x, plast.y], [pcur.x, pcur.y], [cur.x, cur.y]];
                const points = pointsOnBezierCurves(curve, tolerance);
                for(let j = 1; j < points.length; j++)
                    this.preloaded[segI].push({
                        t: last.t + (cur.t - last.t) * (j / points.length),
                        x1: points[j - 1][0],
                        y1: points[j - 1][1],
                        x2: points[j][0],
                        y2: points[j][1]
                    });
                if(points.length >= 2) {
                    const p1 = points.at(-1);
                    const p2 = points.at(-2);
                    if(!p1 || !p2) continue;
                }
            }
        }

        if(this.audioURI) await until(() => loaded);
        else this.audio = null;

        await until(() => !Object.values(loadedImgs).some(Boolean));
        await until(() => !Object.values(loadedFlowers).some(Boolean));
    }

    private outOfBounds(x, y) {
        return x < -this.ox - lineWidth
        || x > -this.ox + this.canvas.width + lineWidth
        || y < -this.oy - lineWidth
        || y > -this.oy + this.canvas.height + lineWidth;
    }

    private renderSegment(segment: PreloadedSegment, xo = 0, yo = 0) {
        this.ctx.lineTo(this.ox + segment.x2 + xo, this.oy + segment.y2 + yo);
    }

    private renderPreloaded(t: number, xo = 0, yo = 0) {
        for(const segment of this.preloaded) {
            if(segment.length === 0) continue;

            const first = segment[0];
            this.ctx.beginPath();
            this.ctx.moveTo(this.ox + first.x1 + xo, this.oy + first.y1 + yo);

            let last: PreloadedSegment | null = null;
            for(const line of segment) {
                if(last === null && line.t > t) break;
                if(last !== null && (line.t + last.t) / 2 > t) break;
                
                this.renderSegment(line, xo, yo);
                last = line;
            }

            this.ctx.stroke();
        }
    }

    autoplay() {
        for(const seg of this.segs)
            for(const p of seg)
                    setTimeout(() => {
                        if(p.button !== "none")
                            this.input(p.button, p.t);
                    }, p.t + this.offset);
    }

    audioPlay(t: number) {
        if(this.audio === null) return;
        this.audio.currentTime = (t + this.offset) / 1000;
        this.audio.play();
    }

    audioPause() {
        if(this.audio === null) return;
        this.audio.pause();
    }

    audioVolume(vol: number) {
        if(this.audio === null) return;
        this.audio.volume = vol;
    }

    render(t: number): boolean {
        if(t > this.maxTime + 1000) return true;

        let camPointBefore: CameraPoint | null = null, camPointAfter: CameraPoint | null = null;
        for(const cameraPoint of this.camera) {
            if(cameraPoint.t <= t && (camPointBefore === null || cameraPoint.t > camPointBefore.t))
                camPointBefore = cameraPoint;
            else if(cameraPoint.t > t && (camPointAfter === null || cameraPoint.t < camPointAfter.t))
                camPointAfter = cameraPoint;
        }
        if(this.debug) console.log(t, camPointBefore, camPointAfter);
        if(camPointBefore !== null && camPointAfter !== null && camPointAfter.t !== camPointBefore.t) {
            const progress = (t - camPointBefore.t) / (camPointAfter.t - camPointBefore.t);
            const easeProgress = easings[camPointAfter.easing ?? "linear"](progress);
            this.ox = this.canvas.width / 2 - camPointAfter.x * easeProgress - camPointBefore.x * (1 - easeProgress);
            this.oy = this.canvas.height / 2 - camPointAfter.y * easeProgress - camPointBefore.y * (1 - easeProgress);
            if(this.debug) console.log(this.ox, this.oy);
        } else if(camPointAfter !== null) {
            this.ox = this.canvas.width / 2 - camPointAfter.x;
            this.oy = this.canvas.height / 2 - camPointAfter.y;
        }

        this.ctx.fillStyle = colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // TODO: separate variables
        this.ctx.lineWidth = lineWidth;

        for(const segment of this.segs) {
            for(const point of segment) {
                if(point.button === "none") continue;
                this.ctx.fillStyle = "black";
                this.ctx.fillRect(this.ox + point.x - 1, this.oy + point.y - 1, 2, 2);
            }
        }

        this.ctx.lineCap = "round";

        this.ctx.strokeStyle = colors.vineBack;
        this.ctx.fillStyle = colors.vineBack;
        this.renderPreloaded(t, -lineWidth / 4, lineWidth / 4);
        
        this.ctx.strokeStyle = colors.vineFront;
        this.ctx.fillStyle = colors.vineFront;
        this.renderPreloaded(t);

        this.ctx.lineCap = "butt";

        if(this.debug) {
            this.ctx.strokeStyle = "red";
            this.ctx.lineWidth = 2;
            this.iterPoints(point => {
                this.ctx.beginPath();
                this.ctx.arc(this.ox + point.x, this.oy + point.y, lineWidth, 0, Math.PI * 2);
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.moveTo(this.ox + point.x, this.oy + point.y);
                this.ctx.lineTo(this.ox + point.x + Math.cos(point.a) * lineWidth, this.oy + point.y + Math.sin(point.a) * lineWidth);
                this.ctx.stroke();
            });
        }

        for(const segmentI in this.hit) {
            const segment = this.hit[segmentI];
            for(const pointI in segment) {
                const point = segment[pointI];
                const pos = this.segs[segmentI][pointI];

                const frame = Math.min(Math.floor((t - point.t) / flowerFrameInterval), flowerFrames - 1);
                const flowerX = Math.round(this.ox + pos.x), flowerY = Math.round(this.oy + pos.y);
                this.ctx.save();
                this.ctx.translate(flowerX, flowerY);
                this.ctx.rotate(point.rot);
                // assuming 32x32
                this.ctx.drawImage(this.flowerImages[point.color][frame], -16, -16);
                this.ctx.restore();

                if(point.t + 500 < t) continue;
                const img = this.ratingImages[point.timing];
                if(img === null) continue;
                // assuming 32x8
                this.ctx.drawImage(img, Math.round(this.ox + pos.x - 16), Math.round(this.oy + pos.y + 4));
            }
        }

        this.ctx.font = "bold 12pt monospace";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.iterPoints((point, segI, pointI) => {
            if(point.button === "none")
                return;
            const hit = segI in this.hit && pointI in this.hit[segI];
            if((!hit && (point.t - t > btnIndicatorBefore || t - point.t > btnIndicatorAfter))
                || (hit && t - this.hit[segI][pointI].t > btnIndicatorFade))
                return;
            this.ctx.globalAlpha = hit ? Math.max(0, 1 - (t - this.hit[segI][pointI].t) / btnIndicatorFade) : 1;
            this.ctx.fillStyle = hit ? colors.keyBackHit : colors.keyBack;

            this.ctx.beginPath();
            this.ctx.moveTo(this.ox + point.x - 10, this.oy + point.y - 30);
            this.ctx.lineTo(this.ox + point.x + 10, this.oy + point.y - 30);
            this.ctx.lineTo(this.ox + point.x + 10, this.oy + point.y - 10);
            this.ctx.lineTo(this.ox + point.x + 5, this.oy + point.y - 10);
            this.ctx.lineTo(this.ox + point.x, this.oy + point.y - 5);
            this.ctx.lineTo(this.ox + point.x - 5, this.oy + point.y - 10);
            this.ctx.lineTo(this.ox + point.x - 10, this.oy + point.y - 10);
            this.ctx.fill();

            this.ctx.fillStyle = colors.keyFront;

            this.ctx.beginPath();
            this.ctx.fillText(indicators[point.button], this.ox + point.x, this.oy + point.y - 20);
        });
        this.ctx.globalAlpha = 1;

        this.ctx.font = "bold 9pt monospace";
        this.ctx.textBaseline = "top";
        this.ctx.fillStyle = "black";
        for(let x = -1; x <= 1; x ++)
            for(let y = -1; y <= 1; y++) {
                this.ctx.fillText(`accuracy: ${this.accuracy(t).toFixed(2)}%`, this.canvas.width / 2 + x, 5 + y);
            }
        this.ctx.fillStyle = colors.hud;
        this.ctx.fillText(`accuracy: ${this.accuracy(t).toFixed(2)}%`, this.canvas.width / 2, 5);

        return false;
    }

    private hitPoint(segI: number, pointI: number, timing: Timing, t: number) {
        if(!(segI in this.hit))
            this.hit[segI] = [];
        if(!(pointI in this.hit[segI]))
            this.hit[segI][pointI] = {
                timing, t, rot: Math.random() * Math.PI * 2,
                color: Object.keys(flowerColors)[Math.floor(Math.random() * Object.keys(flowerColors).length)] as FlowerColor
            };

        if(this.debug)
            console.log("hit!", segI, pointI, timing);
    }

    input(button: VinePointInputButton, t: number) {
        let hitAlready = false;;
        this.iterPoints((point, segI, pointI) => {
            if(hitAlready) return;
            const diff = Math.abs(point.t - t);
            if(point.button !== button || diff > timings.bad || (segI in this.hit && pointI in this.hit[segI]))
                return;
            hitAlready = true;

            if(diff <= timings.waow)
                this.hitPoint(segI, pointI, "waow", t);
            else if(diff <= timings.good)
                this.hitPoint(segI, pointI, "good", t);
            else if(diff <= timings.ok)
                this.hitPoint(segI, pointI, "ok", t);
            else if(diff <= timings.bad)
                this.hitPoint(segI, pointI, "bad", t);
        });
    }

    accuracy(t: number) {
        let n = 0, score = 0;
        this.iterPoints((point, segI, pointI) => {
            if(point.button === "none") return;
            const wasHit = segI in this.hit && pointI in this.hit[segI];
            if(wasHit) {
                n++;
                score += ACCURACY[this.hit[segI][pointI].timing];
            } else if(point.t > this.startPos && t > point.t + timings.bad)
                n++;
        });
        const accuracy = (score / n) * 100;
        return Number.isNaN(accuracy) ? 0 : accuracy;
    }

    restart() {
        this.hit = [];
    }

    reset() {
        this.restart();
        this.preloaded = [];
        if(this.audio instanceof HTMLAudioElement) {
            this.audio.pause();
            this.audio.remove();
            this.audio = null;
        }
    }
}