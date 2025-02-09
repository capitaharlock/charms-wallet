declare global {
    interface Window {
        Buffer: typeof Buffer;
        global: typeof globalThis;
        process: any; // Allow any process object
    }

    var process: {
        env: Record<string, string | undefined>;
    };
}

// Augment the globalThis interface
interface GlobalThis {
    Buffer: typeof Buffer;
    process: {
        env: Record<string, string | undefined>;
    };
}

export { };
