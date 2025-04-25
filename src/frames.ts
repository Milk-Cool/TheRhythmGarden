export function setFrameHandler(cb: (deltaMs: number) => boolean) {
    let last = window.performance.now();
    const cbInternal = () => {
        const time = window.performance.now();
        if(!cb(time - last)) return;
        last = time;
        window.requestAnimationFrame(cbInternal);
    }
    window.requestAnimationFrame(cbInternal);
}