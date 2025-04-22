import { setFrameHandler } from "./frames";
import { loadLevel } from "./level";
import { fetchLevelIndex, LevelIndexLevel } from "./levelindex";
import { VinePointInputButton, Vines } from "./vines";

export class Game {
    debug: boolean;
    vines: Vines | null = null;
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    t: number = -1;
    private paused: boolean = true;

    private index: LevelIndexLevel[];
    private fileSelect: HTMLInputElement;

    private doneCb: () => void = () => {};

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, debug = false) {
        this.ctx = ctx;
        this.canvas = canvas;
        this.debug = debug;

        this.fileSelect = document.createElement("input");
        this.fileSelect.type = "file";
        this.fileSelect.addEventListener("change", async () => {
            if(!this.fileSelect.files || this.fileSelect.files.length === 0)
                return;
            await this.loadLevel(this.fileSelect.files[0]);
        });
    }

    openFile() {
        this.fileSelect.click();
    }

    async initIndex() {
        this.index = await fetchLevelIndex();
    }
    getIndex() {
        return this.index;
    }

    deinitLevel() {
        if(!this.vines) return;
        this.vines.audioPause();
        this.vines.reset();
    }

    async loadLevel(blob: Blob) {
        this.deinitLevel();
        this.vines = await loadLevel(blob, this.canvas, this.ctx, this.debug);
        await this.vines.preload();
        this.paused = true;
    }

    async loadIndexLevel(i: number) {
        if(!this.index) return;
        const level = this.index[i];
        
        const f = await fetch(level.url);
        const blob = await f.blob();
        await this.loadLevel(blob);
    }

    isPaused() {
        return this.paused;
    }

    audioPlay() {
        if(!this.vines) return;
        this.vines.audioPlay(this.t);
    }
    audioPause() {
        if(!this.vines) return;
        this.vines.audioPause();
    }

    startLevel(doneCb: () => void) {
        this.paused = false;
        this.t = 0;
        this.audioPlay();
        this.doneCb = doneCb;

        setFrameHandler(deltaMs => {
            if(!this.vines) return false;
            if(this.paused) return true;
            const done = this.vines.render(this.t += deltaMs);
            if(done) {
                this.doneCb();
                return false;
            }
            return true;
        });
    }

    pauseLevel() {
        this.paused = true;
        this.audioPause();
    }
    resumeLevel() {
        this.paused = false;
        this.audioPlay();
    }

    stopLevel() { // alias
        this.deinitLevel();
    }

    input(key: VinePointInputButton) {
        if(!this.vines) return;
        if(this.paused) return;
        if(this.debug) console.log(key);
        this.vines.input(key, this.t);
    }
};