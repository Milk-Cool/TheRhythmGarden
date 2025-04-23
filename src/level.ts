import * as zip from "@zip.js/zip.js";
import { CameraPoint, VinePoint, Vines } from "./vines";
import { EditorMeta } from "./editor/editor";
import { Meta, defaultMeta } from "./meta";

const SEGMENTS_FILENAME = "segs.json";
const CAMERA_FILENAME = "camera.json";
const EDITOR_META_FILENAME = "editor.json";
const META_FILENAME = "meta.json";
const AUDIO_FILENAME = "audio.mp3";
const ALLOWED = [SEGMENTS_FILENAME, CAMERA_FILENAME, AUDIO_FILENAME, EDITOR_META_FILENAME, META_FILENAME];

export type Loaded = { segments: VinePoint[][], camera: CameraPoint[], editorMeta: EditorMeta | null, audioDataURI: string | Blob, meta: Meta };

export async function loadLevelRaw(blob: Blob): Promise<Loaded> {
    const reader = new zip.ZipReader(new zip.BlobReader(blob));
    const entries = await reader.getEntries();

    let segments: VinePoint[][] = [],
        camera: CameraPoint[] = [],
        meta: Meta = defaultMeta,
        editorMeta: EditorMeta | null = null,
        audioDataURI: string | Blob = "";
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
        } else if(entry.filename === META_FILENAME) {
            const text = await entry.getData?.(new zip.TextWriter());
            if(text === undefined) continue;
            meta = JSON.parse(text);
        } else if(entry.filename === EDITOR_META_FILENAME) {
            const text = await entry.getData?.(new zip.TextWriter());
            if(text === undefined) continue;
            editorMeta = JSON.parse(text);
        } else if(entry.filename === AUDIO_FILENAME) {
            const uri = await entry.getData?.(new zip.BlobWriter("audio/mpeg"));
            if(uri === undefined) continue;
            audioDataURI = uri;
        }
    }

    return { segments, camera, editorMeta, audioDataURI, meta };
}

export async function loadLevel(blob: Blob, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, debug: boolean = false): Promise<Vines> {
    const { segments, camera, audioDataURI, meta } = await loadLevelRaw(blob);

    return new Vines(canvas, ctx, segments, camera, audioDataURI, meta, debug);
}

export async function saveLevel(level: Loaded): Promise<Blob> {
    const blobWriter = new zip.BlobWriter("application/zip");
    const writer = new zip.ZipWriter(blobWriter);

    await writer.add(SEGMENTS_FILENAME, new zip.TextReader(JSON.stringify(level.segments)));
    await writer.add(CAMERA_FILENAME, new zip.TextReader(JSON.stringify(level.camera)));
    await writer.add(META_FILENAME, new zip.TextReader(JSON.stringify(level.meta)));
    if(level.editorMeta) await writer.add(EDITOR_META_FILENAME, new zip.TextReader(JSON.stringify(level.editorMeta)));
    await writer.add(AUDIO_FILENAME, level.audioDataURI instanceof Blob ? new zip.BlobReader(level.audioDataURI) : new zip.Data64URIReader(level.audioDataURI));
    await writer.close();

    return await blobWriter.getData();
}