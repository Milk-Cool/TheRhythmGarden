import { pointsOnBezierCurves, Point } from "points-on-curve";
import filter from "./antifilter";

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

type PreloadedSegment = {
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    t: number
};

const lineWidth = 12;
const colors = {
    background: "#40593d",
    vineBack: "#76ad6f",
    vineFront: "#82c27a",
    keyBack: "#7f7f7f",
    keyBackHit: "#467d55",
    keyFront: "#ffffff"
};

const timings = {
    "waow": 50,
    "good": 100,
    "ok": 150,
    "bad": 300
};
export type Timing = keyof typeof timings;

type Hit = {
    timing: Timing,
    t: number
};

const btnIndicatorBefore = 1500;
const btnIndicatorAfter = 300;
const btnIndicatorFade = 300;

export class Vines {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    segs: VinePoint[][];
    private preloaded: PreloadedSegment[] = [];
    private hit: Hit[][] = [];
    private debug: boolean;

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, segs: VinePoint[][] = [], debug: boolean = false) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.segs = segs;

        this.ctx.filter = filter;
        this.debug = debug;
    }

    private iterPoints(cb: (point: VinePoint, segI: number, pointI: number) => void) {
        this.segs.forEach((seg, segI) => {
            seg.forEach((point, pointI) => cb(point, segI, pointI));
        });
    }

    preload(tolerance = 0.15) {
        if(this.segs.length < 1) return;
        for(const seg of this.segs) {
            if(seg.length < 2) continue;
            for(let i = 1; i < seg.length; i++) {
                const cur = seg[i], last = seg[i - 1];
                const pointDist = Math.hypot(cur.x - last.x, cur.y - last.y) / 2;
                const pcur = { x: cur.x + Math.cos(cur.a + Math.PI) * pointDist, y: cur.y + Math.sin(cur.a + Math.PI) * pointDist },
                    plast = { x: last.x + Math.cos(last.a) * pointDist, y: last.y + Math.sin(last.a) * pointDist };
                const curve: Point[] = [[last.x, last.y], [plast.x, plast.y], [pcur.x, pcur.y], [cur.x, cur.y]];
                const points = pointsOnBezierCurves(curve, tolerance);
                for(let j = 1; j < points.length; j++)
                    this.preloaded.push({
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
    }

    renderSegment(segment: PreloadedSegment, xo = 0, yo = 0) {
        this.ctx.beginPath();
        this.ctx.moveTo(segment.x1 + xo, segment.y1 + yo);
        this.ctx.lineTo(segment.x2 + xo, segment.y2 + yo);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(segment.x2 + xo, segment.y2 + yo, lineWidth / 2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    renderPreloaded(t: number, xo = 0, yo = 0) {
        for(const segment of this.preloaded) {
            if(segment.t > t) continue;
            
            this.renderSegment(segment, xo, yo);
        }
    }

    render(t: number) {
        this.ctx.fillStyle = colors.background;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // TODO: separate variables
        this.ctx.lineWidth = lineWidth;

        this.ctx.strokeStyle = colors.vineBack;
        this.ctx.fillStyle = colors.vineBack;
        this.renderPreloaded(t, -lineWidth / 4, lineWidth / 4);
        
        this.ctx.strokeStyle = colors.vineFront;
        this.ctx.fillStyle = colors.vineFront;
        this.renderPreloaded(t);

        if(this.debug) {
            this.ctx.strokeStyle = "red";
            this.ctx.lineWidth = 2;
            this.iterPoints(point => {
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, lineWidth, 0, Math.PI * 2);
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.moveTo(point.x, point.y);
                this.ctx.lineTo(point.x + Math.cos(point.a) * lineWidth, point.y + Math.sin(point.a) * lineWidth);
                this.ctx.stroke();
            });
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
            this.ctx.moveTo(point.x - 10, point.y - 30);
            this.ctx.lineTo(point.x + 10, point.y - 30);
            this.ctx.lineTo(point.x + 10, point.y - 10);
            this.ctx.lineTo(point.x + 5, point.y - 10);
            this.ctx.lineTo(point.x, point.y - 5);
            this.ctx.lineTo(point.x - 5, point.y - 10);
            this.ctx.lineTo(point.x - 10, point.y - 10);
            this.ctx.fill();

            this.ctx.fillStyle = colors.keyFront;

            this.ctx.beginPath();
            this.ctx.fillText(indicators[point.button], point.x, point.y - 20);
        });
        this.ctx.globalAlpha = 1;
    }

    private hitPoint(segI: number, pointI: number, timing: Timing, t: number) {
        if(!(segI in this.hit))
            this.hit[segI] = [];
        if(!(pointI in this.hit[segI]))
            this.hit[segI][pointI] = { timing, t };

        if(this.debug)
            console.log("hit!", segI, pointI, timing);
    }

    input(button: VinePointInputButton, t: number) {
        this.iterPoints((point, segI, pointI) => {
            const diff = Math.abs(point.t - t);
            if(point.button !== button || diff > timings.bad)
                return;

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
}