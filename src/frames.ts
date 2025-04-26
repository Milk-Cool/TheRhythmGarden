export function setFrameHandler(cb: (deltaMs: number, fps?: number) => boolean) {
    let last = window.performance.now();
    let frames = 0;
    const cbInternal = () => {
        const time = window.performance.now();
        if(!cb(time - last, frames)) return;
        last = time;
        
        frames++;
        setTimeout(() => frames--, 1000);

        window.requestAnimationFrame(cbInternal);
    }
    window.requestAnimationFrame(cbInternal);
}