// Since Node.js is single-threaded async by nature, we can simulate a thread pool using async execution.
// We can use simple promises to simulate run_in_thread.

export function submitThread<T>(func: (...args: any[]) => T, ...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
        setImmediate(async () => {
            try {
                resolve(await func(...args));
            } catch (err) {
                reject(err);
            }
        });
    });
}

export function runInThread<T>(func: (...args: any[]) => T) {
    return async (...args: any[]): Promise<T> => {
        return submitThread(func, ...args);
    };
}
