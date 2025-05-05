import { VinePoint, CameraPoint, lineWidth, VinePointButton, CameraEasing } from "../vines";
import { BPM, BPMPoints } from "./bpm";
import { loadLevelRaw, saveLevel } from "../level";
import { setFrameHandler } from "../frames";
import { defaultMeta } from "../meta";

window.addEventListener("beforeunload", e => e.preventDefault());

let bpmPoints: BPMPoints = [{ b: 0, bpm: 120 }];
let bpmObj = new BPM(bpmPoints);
let audioFile: Blob | null = null;
let meta = defaultMeta;
let cur = 0;
let playing = false;
const getSnap = () => parseInt((document.querySelector("#snap") as HTMLInputElement).value);
const getLayer = () => parseInt((document.querySelector("#layer") as HTMLInputElement).value);
const setLayer = (layer: number) => (document.querySelector("#layer") as HTMLInputElement).value = layer.toString();

let layers: VinePoint[][] = [[{ a: 0, button: "middle", t: 500, x: 0, y: 0 }, { a: -Math.PI / 2, button: "left", t: 1000, x: 100, y: -40 }, { a: Math.PI / 2, button: "right", t: 1500, x: 200, y: -40 }]];
let cameraPoints: CameraPoint[] = [{ t: 500, x: 0, y: 0 }, { t: 1000, x: 100, y: -40, easing: "sine-in-out" }, { t: 1500, x: 200, y: -40 }];

let selPoint: number | null = null;
let selCamera: number | null = null;

let scale = 2;
let offsetX = 0, offsetY = 0;
const width = 480, height = 270;

const calculatePosition = (x: number, y: number) => ({ x: (x + offsetX + width / 2) * scale, y: (y + offsetY + height / 2) * scale });
const realPosition = (x: number, y: number, ox: number | null = null, oy: number | null = null) =>
    ({ x: x / scale - width / 2 - (ox === null ? offsetX : ox), y: y / scale - height / 2 - (oy === null ? offsetY : oy) });

(document.querySelector("#layer") as HTMLInputElement).addEventListener("change", () => {
    selPoint = null;
});

const timeline = document.querySelector("#timeline") as HTMLDivElement;
const curEl = document.querySelector("#cur") as HTMLDivElement;

let lastClickable = 0;
const resetClickables = () => {
    document.querySelectorAll(".clickable").forEach(el => el.remove());
    lastClickable = 0;
};

(document.querySelector("#audio") as HTMLInputElement).addEventListener("change", e => {
    const target = e.target as HTMLInputElement;
    if(!target.files || !target.files.length) return;
    audioFile = target.files[0];
});

const canvas = document.querySelector("#editor") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

const pointControlEl = document.querySelector("#point") as HTMLDivElement;
const pointCX = document.querySelector("#point-x") as HTMLInputElement;
const pointCY = document.querySelector("#point-y") as HTMLInputElement;
const pointCA = document.querySelector("#point-a") as HTMLInputElement;
const pointCT = document.querySelector("#point-t") as HTMLInputElement;
const pointCButton = document.querySelector("#point-button") as HTMLInputElement;
const updatePointSelection = () => {
    if(selPoint === null) return pointControlEl.classList.remove("v");
    pointControlEl.classList.add("v");

    const point = layers[getLayer()][selPoint];
    pointCX.value = point.x.toString();
    pointCY.value = point.y.toString();
    pointCA.value = (point.a / Math.PI).toString();
    pointCT.value = bpmObj.msToBeat(point.t).toString();
    pointCButton.value = point.button;

    render();
};
(document.querySelector("#point-delete") as HTMLButtonElement).addEventListener("click", () => {
    if(selPoint === null) return;
    layers[getLayer()].splice(selPoint, 1);
    selPoint = null;
    updatePointSelection();
});
const cameraControlEl = document.querySelector("#camera") as HTMLDivElement;
const cameraCX = document.querySelector("#camera-x") as HTMLInputElement;
const cameraCY = document.querySelector("#camera-y") as HTMLInputElement;
const cameraCT = document.querySelector("#camera-t") as HTMLInputElement;
const cameraCEasing = document.querySelector("#camera-easing") as HTMLInputElement;
const updateCameraSelection = () => {
    if(selCamera === null) return cameraControlEl.classList.remove("v");
    cameraControlEl.classList.add("v");

    const cameraPoint = cameraPoints[selCamera];
    cameraCX.value = cameraPoint.x.toString();
    cameraCY.value = cameraPoint.y.toString();
    cameraCT.value = bpmObj.msToBeat(cameraPoint.t).toString();
    cameraCEasing.value = cameraPoint.easing ?? "linear";

    render();
}
(document.querySelector("#camera-delete") as HTMLButtonElement).addEventListener("click", () => {
    if(selCamera === null) return;
    cameraPoints.splice(selCamera, 1);
    selCamera = null;
    updateCameraSelection();
});

let audio = new Audio();
const play = () => {
    if(audioFile === null) return;
    audio = new Audio();
    audio.addEventListener("canplaythrough", () => {
        setFrameHandler(delta => {
            if(playing === false) return false;
            cur = bpmObj.msToBeat(bpmObj.beatToMs(cur) + delta);
            updateCurPos();
            renderCanvas();
            return true;
        });
        console.log(meta);
        audio.currentTime = bpmObj.beatToMs(cur) / 1000 + meta.offset / 1000;
        audio.play();
        playing = true;
    }, { once: true });
    audio.src = URL.createObjectURL(audioFile);
};
const pause = () => {
    audio.pause();
    playing = false;
};
const playOrPause = () => {
    if(playing) pause();
    else play();
}
canvas.addEventListener("keydown", e => {
    if(e.key === " ")
        playOrPause();
    else if(e.key === "ArrowUp") {
        setLayer(getLayer() + 1);
        selPoint = null;
    } else if(e.key === "ArrowDown") {
        if(getLayer() === 0) return;
        setLayer(getLayer() - 1);
        selPoint = null;
    } else if(e.key === "1") {
        setEditMode("points");
        selCamera = null;
        selPoint = null;
        updateSelection();
    } else if(e.key === "2") {
        setEditMode("camera");
        selCamera = null;
        selPoint = null;
        updateSelection();
    }
});
timeline.addEventListener("keydown", e => {
    if(e.key === " ")
        playOrPause();
});

(document.querySelector("#offset") as HTMLInputElement).addEventListener("change", e => {
    meta.offset = parseFloat((e.target as HTMLInputElement).value);
});
const updateOffsetField = () => (document.querySelector("#offset") as HTMLInputElement).value = meta.offset.toString();
updateOffsetField();

(document.querySelector("#startpos") as HTMLInputElement).addEventListener("change", e => {
    meta.startPos = bpmObj.beatToMs(parseFloat((e.target as HTMLInputElement).value));
});
const updateStartPos = () => (document.querySelector("#startpos") as HTMLInputElement).value = bpmObj.msToBeat(meta.startPos ?? 0).toString();
updateStartPos();

(document.querySelector("#bpmadd") as HTMLButtonElement).addEventListener("click", () => {
    bpmPoints.push({ b: cur, bpm: 120 });
    bpmObj = new BPM(bpmPoints);
    renderTimelineBPM();
});

const file = document.querySelector("#file") as HTMLInputElement;
(document.querySelector("#load") as HTMLButtonElement).addEventListener("click", () => {
    file.files = null;
    file.click();
});
file.addEventListener("change", async () => {
    if(!file.files || file.files.length === 0) return;
    const data = await loadLevelRaw(file.files[0]);
    if(!data.editorMeta) return;

    scale = 2;
    offsetX = 0;
    offsetY = 0;
    
    cameraPoints = data.camera;
    layers = data.segments;
    bpmPoints = data.editorMeta.bpm;
    bpmObj = new BPM(bpmPoints);

    selPoint = null;
    selCamera = null;
    updateSelection();

    meta = data.meta;
    meta.startPos = meta.startPos ?? 0;
    updateOffsetField();
    updateStartPos();

    audioFile = data.audioDataURI instanceof Blob ? data.audioDataURI : await (await fetch(data.audioDataURI)).blob();

    cur = 0;
    updateCurPos();
    resetClickables();
    const maxB = Math.max(...layers.map(x => Math.max(...x.map(y => bpmObj.msToBeat(y.t)))));
    while(lastClickable < maxB + 1)
        add64Clickables();

    render();
});

(document.querySelector("#save") as HTMLButtonElement).addEventListener("click", async () => {
    const saved = await saveLevel({
        segments: layers,
        camera: cameraPoints,
        meta,
        editorMeta: { bpm: bpmPoints },
        audioDataURI: audioFile === null ? "" : audioFile
    });
    const url = URL.createObjectURL(saved);
    window.open(url);
});

type EditMode = "points" | "camera";
const getEditMode = () => (document.querySelector("#mode") as HTMLInputElement).value as EditMode;
const setEditMode = (mode: EditMode) => (document.querySelector("#mode") as HTMLInputElement).value = mode;

const registerPointPropertyChange = <K extends keyof VinePoint, V extends VinePoint[K]>
        (prop: K, el: HTMLInputElement, f: (rawValue: string) => V) => {
    const handler = () => {
        if(selPoint === null) return;
        layers[getLayer()][selPoint][prop] = f(el.value);
    }
    el.addEventListener("change", handler);
    el.addEventListener("keyup", handler);
}
registerPointPropertyChange("x", pointCX, parseFloat);
registerPointPropertyChange("y", pointCY, parseFloat);
registerPointPropertyChange("a", pointCA, str => parseFloat(str) * Math.PI);
registerPointPropertyChange("t", pointCT, str => bpmObj.beatToMs(parseFloat(str)));
registerPointPropertyChange("button", pointCButton, str => str as VinePointButton);

const registerCameraPropertyChange = <K extends keyof CameraPoint, V extends CameraPoint[K]>
        (prop: K, el: HTMLInputElement, f: (rawValue: string) => V) => {
    const handler = () => {
        if(selCamera === null) return;
        cameraPoints[selCamera][prop] = f(el.value);
    }
    el.addEventListener("change", handler);
    el.addEventListener("keyup", handler);
}
registerCameraPropertyChange("x", cameraCX, parseFloat);
registerCameraPropertyChange("y", cameraCY, parseFloat);
registerCameraPropertyChange("t", cameraCT, str => bpmObj.beatToMs(parseFloat(str)));
registerCameraPropertyChange("easing", cameraCEasing, str => str as CameraEasing);

let newPointX = 0, newPointY = 0, draggingNewPoint = false, curX = 0, curY = 0;
const renderCanvas = () => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    const t = bpmObj.beatToMs(cur);
    for(const layerI in layers) {
        const layer = layers[layerI];
        for(const pointI in layer) {
            const point = layer[pointI];
            if(point.t > t) continue;
            ctx.strokeStyle = "white";
            ctx.lineWidth = getEditMode() === "points" && parseInt(pointI) === selPoint && parseInt(layerI) === getLayer() ? 4 : 2;
            ctx.globalAlpha = getEditMode() === "points" && parseInt(layerI) === getLayer() ? 1 : .4;
            const pos = calculatePosition(point.x, point.y);

            ctx.beginPath();
            ctx.arc(pos.x, pos.y, lineWidth * scale, 0, Math.PI * 2);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(pos.x + Math.cos(point.a) * lineWidth * scale, pos.y + Math.sin(point.a) * lineWidth * scale);
            ctx.stroke();

            ctx.lineWidth = 2;
            const pointIN = parseInt(pointI);
            if(pointIN === 0) continue;
            const last = layer[pointIN - 1];
            const pointDist = Math.hypot(point.x - last.x, point.y - last.y) / 2;
            const pcur = calculatePosition(point.x + Math.cos(point.a + Math.PI) * pointDist, point.y + Math.sin(point.a + Math.PI) * pointDist), plast = calculatePosition(last.x + Math.cos(last.a) * pointDist, last.y + Math.sin(last.a) * pointDist);
            
            ctx.globalAlpha = .4;
            ctx.beginPath();
            const ccur = calculatePosition(point.x, point.y),
                clast = calculatePosition(last.x, last.y);
            ctx.moveTo(clast.x, clast.y);
            ctx.bezierCurveTo(plast.x, plast.y, pcur.x, pcur.y, ccur.x, ccur.y);
            ctx.stroke();
        }
    }

    for(const cameraPointI in cameraPoints) {
        const cameraPoint = cameraPoints[cameraPointI];
        if(cameraPoint.t > t) continue;

        ctx.strokeStyle = "white";
        ctx.lineWidth = getEditMode() === "camera" && parseInt(cameraPointI) === selCamera ? 4 : 2;
        ctx.globalAlpha = getEditMode() === "camera" ? 1 : .4;
        const pos = calculatePosition(cameraPoint.x - lineWidth, cameraPoint.y - lineWidth);
        ctx.beginPath();
        ctx.rect(pos.x, pos.y, lineWidth * 2 * scale, lineWidth * 2 * scale);
        ctx.stroke();

        if(getEditMode() === "camera") {
            if(parseInt(cameraPointI) === 0) continue;
            const last = cameraPoints[parseInt(cameraPointI) - 1];
            ctx.lineWidth = 2;
            ctx.globalAlpha = .4;
            ctx.beginPath();
            const lastPos = calculatePosition(last.x, last.y);
            const curPos = calculatePosition(cameraPoint.x, cameraPoint.y);
            ctx.moveTo(lastPos.x, lastPos.y);
            ctx.lineTo(curPos.x, curPos.y);
            ctx.stroke();
        }

        if(getEditMode() === "camera" && parseInt(cameraPointI) === selCamera) {
            ctx.lineWidth = 2;
            ctx.globalAlpha = .4;
            const pos = calculatePosition(cameraPoint.x - width / 2, cameraPoint.y - height / 2);
            ctx.beginPath();
            ctx.rect(pos.x, pos.y, width * scale, height * scale);
            ctx.stroke();
        }
    }

    if(draggingNewPoint) {
        ctx.strokeStyle = "red";
        ctx.lineWidth = 5;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        const newPoint = calculatePosition(newPointX, newPointY);
        const cur = calculatePosition(curX, curY);
        ctx.moveTo(newPoint.x, newPoint.y);
        ctx.lineTo(cur.x, cur.y);
        ctx.stroke();
    }
};

const updateSelection = () => {
    updatePointSelection();
    updateCameraSelection();
}

canvas.addEventListener("click", e => {
    const pos = realPosition(e.offsetX, e.offsetY);
    
    if(getEditMode() === "camera") {
        selPoint = null;
        for(const cameraPointI in cameraPoints) {
            const cameraPoint = cameraPoints[cameraPointI];
            if(cameraPoint.x - lineWidth <= pos.x
                    && cameraPoint.x + lineWidth >= pos.x
                    && cameraPoint.y - lineWidth <= pos.y
                    && cameraPoint.y + lineWidth >= pos.y) {
                selCamera = parseInt(cameraPointI);
                updateSelection();
                return;
            }
        }
        selCamera = null;
    } else if(getEditMode() === "points") {
        selCamera = null;
        if(!(getLayer() in layers)) return;
        for(const pointI in layers[getLayer()]) {
            const point = layers[getLayer()][pointI];
            if(Math.hypot(pos.x - point.x, pos.y - point.y) <= lineWidth) {
                selPoint = parseInt(pointI);
                updateSelection();
                return;
            }
        }
        selPoint = null;
    }
    updateSelection();
});
canvas.addEventListener("contextmenu", e => e.preventDefault());

let lastDragX = 0, lastDragY = 0,
    draggingPoint = false, draggingField = false,
    lastStartOX = 0, lastStartOY = 0;
canvas.addEventListener("mousedown", e => {
    const pos = realPosition(e.offsetX, e.offsetY);
    if(e.button === 2) {
        newPointX = pos.x;
        newPointY = pos.y;
        draggingNewPoint = true;
        return;
    }
    lastDragX = pos.x;
    lastDragY = pos.y;
    lastStartOX = offsetX;
    lastStartOY = offsetY;
    if(selPoint === null && selCamera === null) {
        draggingField = true;
        return;
    }
    if(selPoint !== null) {
        const point = layers[getLayer()][selPoint];
        if(Math.hypot(pos.x - point.x, pos.y - point.y) > lineWidth) {
            draggingField = true;
            return;
        }
    } else if(selCamera !== null) {
        const cameraPoint = cameraPoints[selCamera];
        if(cameraPoint.x - lineWidth > pos.x
                || cameraPoint.x + lineWidth < pos.x
                || cameraPoint.y - lineWidth > pos.y
                || cameraPoint.y + lineWidth < pos.y) {
            draggingField = true;
            return;
        }
    }
    draggingPoint = true;
});
canvas.addEventListener("mousemove", e => {
    const posCur = realPosition(e.offsetX, e.offsetY);
    curX = posCur.x;
    curY = posCur.y;
    if(draggingNewPoint) {
        renderCanvas();
    } else if(draggingField) {
        const pos = realPosition(e.offsetX, e.offsetY, lastStartOX, lastStartOY);
        offsetX += pos.x - lastDragX;
        offsetY += pos.y - lastDragY;
        lastDragX = pos.x;
        lastDragY = pos.y;
        renderCanvas();
    } else if(draggingPoint) {
        const pos = realPosition(e.offsetX, e.offsetY);
        if(selPoint !== null) {
            const point = layers[getLayer()][selPoint];
            point.x += pos.x - lastDragX;
            point.y += pos.y - lastDragY;
            lastDragX = pos.x;
            lastDragY = pos.y;
            layers[getLayer()][selPoint] = point;
            renderCanvas();
        } else if(selCamera !== null) {
            const cameraPoint = cameraPoints[selCamera];
            cameraPoint.x += pos.x - lastDragX;
            cameraPoint.y += pos.y - lastDragY;
            lastDragX = pos.x;
            lastDragY = pos.y;
            cameraPoints[selCamera] = cameraPoint;
            renderCanvas();
        }
    }
});
canvas.addEventListener("mouseup", e => {
    if(e.button === 2) {
        e.preventDefault();
        const pos = realPosition(e.offsetX, e.offsetY);
        if(getEditMode() === "points") {
            const curLayer = getLayer();
            if(!(curLayer in layers)) layers[curLayer] = [];
            let inFront = layers[curLayer].findIndex((p) => bpmObj.msToBeat(p.t) > cur);
            if(inFront === -1) inFront = layers[curLayer].length;
            draggingNewPoint = false;
            layers[curLayer].splice(inFront, 0, {
                a: Math.atan2(pos.y - newPointY, pos.x - newPointX),
                x: newPointX, y: newPointY, button: "none",
                t: bpmObj.beatToMs(cur)
            });
            selPoint = inFront;
        } else if(getEditMode() === "camera") {
            let inFront = cameraPoints.findIndex((p) => bpmObj.msToBeat(p.t) > cur);
            if(inFront === -1) inFront = cameraPoints.length;
            draggingNewPoint = false;
            cameraPoints.splice(inFront, 0, {
                x: newPointX, y: newPointY,
                t: bpmObj.beatToMs(cur)
            });
            selCamera = inFront;
        }
        updateSelection();
        render();
        return;
    }
    draggingPoint = false;
    draggingField = false;
});

const scrollPower = 0.98;
canvas.addEventListener("wheel", e => {
    e.preventDefault();
    const pow = e.deltaY / -20;
    const factor = scrollPower ** pow;
    scale /= factor;
    offsetX = (offsetX + width / 2 + curX) * factor - width / 2 - curX;
    offsetY = (offsetY + height / 2 + curY) * factor - height / 2 - curY;
    renderCanvas();
});

const clickablesEl = document.querySelector("#clickables") as HTMLDivElement;
const updateCurPos = () => curEl.style.left = `calc(${cur} * var(--timeline-size))`;

const add64Clickables = () => {
    for(let i = 0; i < 64; i++) {
        const clickable = document.createElement("div");
        clickable.classList.add("clickable");

        const thisClickable = lastClickable;

        const eventHandler = (e: MouseEvent) => {
            if(e.type === "mousemove" && !e.buttons) return;
            const w = clickable.clientWidth;
            const part = Math.floor((e.offsetX / w) * getSnap());
            const firstHalf = Math.floor((e.offsetX / w) * getSnap() * 2) % 2 == 0;
            cur = thisClickable + (1 / getSnap()) * part + (firstHalf ? 0 : 1 / getSnap());
            updateCurPos();
            render();
        };
        clickable.addEventListener("click", eventHandler);
        clickable.addEventListener("mousemove", eventHandler);

        clickable.innerText = " " + thisClickable.toString();

        clickablesEl.appendChild(clickable);
        lastClickable++;
    }
}
add64Clickables();

document.querySelector("#add")?.addEventListener("click", () => add64Clickables());

const renderTimelineBPM = () => {
    document.querySelectorAll(".m-bpm").forEach(el => el.remove());
    for(const pointI in bpmPoints) {
        const point = bpmPoints[pointI];
        const el = document.createElement("span");
        el.classList.add("m-bpm");
        el.innerText = point.bpm.toString();
        el.style.left = `calc(var(--timeline-size) * ${point.b})`;

        el.addEventListener("click", () => {
            const bpm = parseFloat(prompt("Enter BPM:", point.bpm.toString()) ?? "");
            if(Number.isNaN(bpm) || bpm <= 0)
                return;
            const oldBeats = layers.map(layer => layer.map(p => bpmObj.msToBeat(p.t)));
            const oldCameras = cameraPoints.map(point => bpmObj.msToBeat(point.t))
            bpmPoints[pointI].bpm = bpm;
            bpmObj = new BPM(bpmPoints);
            for(let i in layers)
                for(let j in layers[i])
                    layers[i][j].t = bpmObj.beatToMs(oldBeats[i][j]);
            for(let i in cameraPoints)
                cameraPoints[i].t = bpmObj.beatToMs(oldCameras[i]);
            render();
        });
        
        timeline.appendChild(el);
    }
};
const renderTimelineLayers = () => {
    document.querySelectorAll(".m-left").forEach(el => el.remove());
    document.querySelectorAll(".m-middle").forEach(el => el.remove());
    document.querySelectorAll(".m-right").forEach(el => el.remove());
    document.querySelectorAll(".m-none").forEach(el => el.remove());
    for(const layerI in layers) {
        const layerIN = parseInt(layerI);
        const layer = layers[layerIN];
        for(const pointI in layer) {
            const pointIN = parseInt(pointI);
            const point = layer[pointIN];
            const el = document.createElement("div");
            el.classList.add(
                point.button === "left"
                ? "m-left"
                : point.button === "right"
                ? "m-right"
                : point.button === "middle"
                ? "m-middle"
                : "m-none"
            );
            el.style.left = `calc(var(--timeline-size) * ${bpmObj.msToBeat(point.t)})`;
            el.addEventListener("mousedown", () => {
                setEditMode("points");
                selCamera = null;
                selPoint = pointIN;
                setLayer(layerIN);
                cur = bpmObj.msToBeat(point.t);
                updateCurPos();
                updateSelection();
            });
            timeline.appendChild(el);
        }
    }
};
const renderTimelineCameras = () => {
    document.querySelectorAll(".m-camera").forEach(el => el.remove());
    for(const cameraPointI in cameraPoints) {
        const cameraPointIN = parseInt(cameraPointI);
        const cameraPoint = cameraPoints[cameraPointIN];
        const el = document.createElement("div");
        el.classList.add("m-camera");
        el.style.left = `calc(var(--timeline-size) * ${bpmObj.msToBeat(cameraPoint.t)})`;
        el.addEventListener("mousedown", () => {
            setEditMode("camera");
            selPoint = null;
            selCamera = cameraPointIN;
            cur = bpmObj.msToBeat(cameraPoint.t);
            updateCurPos();
            updateSelection();
        });
        timeline.appendChild(el);
    }
}

const render = () => {
    renderCanvas();
    renderTimelineBPM();
    renderTimelineLayers();
    renderTimelineCameras();
}
render();
window.addEventListener("resize", () => render());
setInterval(() => render(), 500);