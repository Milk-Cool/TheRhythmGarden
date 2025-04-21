export function until(condition: () => boolean): Promise<void> {
    return new Promise(resolve => {
        const check = () => {
            if(condition()) resolve();
            else setTimeout(check, 1);
        }
        check();
    });
}