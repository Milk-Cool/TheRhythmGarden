export function setFrameHandler(cb: (deltaMs: number) => boolean) {
    let last = Date.now();
    const cbInternal = () => {
        const time = Date.now();
        if(!cb(time - last)) return;
        last = time;
        window.requestAnimationFrame(cbInternal);
    }
    window.requestAnimationFrame(cbInternal);
}