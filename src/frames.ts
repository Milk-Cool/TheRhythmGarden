export function setFrameHandler(cb: (deltaMs: number) => void) {
    let last = Date.now();
    const cbInternal = () => {
        const time = Date.now();
        cb(time - last);
        last = time;
        window.requestAnimationFrame(cbInternal);
    }
    window.requestAnimationFrame(cbInternal);
}