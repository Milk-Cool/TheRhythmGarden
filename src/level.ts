import * as zip from "@zip.js/zip.js";
import { CameraPoint, VinePoint, Vines } from "./vines";

const SEGMENTS_FILENAME = "segs.json";
const CAMERA_FILENAME = "camera.json";
const AUDIO_FILENAME = "audio.mp3";
const ALLOWED = [SEGMENTS_FILENAME, CAMERA_FILENAME, AUDIO_FILENAME];

export async function loadLevel(blob: Blob, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, debug: boolean = false): Promise<Vines> {
    const reader = new zip.ZipReader(new zip.BlobReader(blob));
    const entries = await reader.getEntries();

    let segments: VinePoint[][] = [],
        camera: CameraPoint[] = [],
        audioDataURI: string = "";
    for(const entry of entries) {
        if(!ALLOWED.includes(entry.filename)) continue;
        if(entry.filename === SEGMENTS_FILENAME) {
            const text = await entry.getData?.(new zip.TextWriter());
            if(text === undefined) continue;
            segments = JSON.parse(text);
        } else if(entry.filename === CAMERA_FILENAME) {
            const text = await entry.getData?.(new zip.TextWriter());
            if(text === undefined) continue;
            camera = JSON.parse(text);
        } else if(entry.filename === AUDIO_FILENAME) {
            const uri = await entry.getData?.(new zip.Data64URIWriter("audio/mpeg"));
            if(uri === undefined) continue;
            audioDataURI = uri;
        }
    }

    return new Vines(canvas, ctx, segments, camera, audioDataURI, debug);
}