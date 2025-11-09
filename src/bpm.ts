export type BPMPoint = { b: number, bpm: number };
export type BPMPoints = BPMPoint[];

export class BPM {
    points: BPMPoints;

    constructor(points: BPMPoints) {
        if(points.length === 0) throw new Error("Not enough BPM points (must be >=1)!");
        this.points = [...points];
        this.points.sort((a, b) => a.b - b.b);
    }

    beatToMs(beat: number): number {
        let ms = 0;
        this.points.forEach((cur, i) => {
            if(cur.b >= beat) return;
            if(i === this.points.length - 1) {
                ms += (beat - cur.b) / cur.bpm * 60000;
                return;
            }
            const next = this.points[i + 1];
            ms += (Math.min(beat, next.b) - cur.b) / cur.bpm * 60000;
        });
        return ms;
    }

    msToBeat(ms: number): number {
        let beat = 0;
        this.points.forEach((cur, i) => {
            if(ms === 0) return;
            if(i === this.points.length - 1) {
                beat += cur.bpm * (ms / 60000);
                // don't have to set ms to 0 since there aren't any further points
                return;
            }
            const next = this.points[i + 1];
            const min = Math.min(ms, (next.b - cur.b) / cur.bpm * 60000);
            beat += cur.bpm * (min / 60000);
            ms -= min;
        });
        return beat;
    }
}