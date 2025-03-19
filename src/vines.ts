import { pointsOnBezierCurves, Point } from "points-on-curve";
import filter from "./antifilter";

export type VinePointButton = "left" | "middle" | "right" | "none";

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
    vineFront: "#82c27a"
};

export class Vines {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    segs: VinePoint[][];
    preloaded: PreloadedSegment[] = [];

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, segs: VinePoint[][] = []) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.segs = segs;

        this.ctx.filter = filter;
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

        this.ctx.strokeStyle = "red";
        this.ctx.lineWidth = 2;
        for(const seg of this.segs)
            for(const point of seg) {
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, lineWidth, 0, Math.PI * 2);
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.moveTo(point.x, point.y);
                this.ctx.lineTo(point.x + Math.cos(point.a) * lineWidth, point.y + Math.sin(point.a) * lineWidth);
                this.ctx.stroke();
            }
    }
}