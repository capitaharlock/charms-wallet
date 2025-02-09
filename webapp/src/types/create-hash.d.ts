declare module 'create-hash' {
    function createHash(algorithm: string): {
        update(data: Buffer | string): { digest(): Buffer };
    };
    export default createHash;
}
