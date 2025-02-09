declare module 'crypto-js' {
    interface WordArray {
        words: number[];
        sigBytes: number;
        toString(encoder?: Encoder): string;
    }

    interface Encoder {
        parse(str: string): WordArray;
        stringify(wordArray: WordArray): string;
    }

    interface CipherParams {
        ciphertext: WordArray;
        key: WordArray;
        iv: WordArray;
        salt: WordArray;
        algorithm: any;
        mode: any;
        padding: any;
        blockSize: number;
        formatter: any;
    }

    interface AES {
        encrypt(message: string | WordArray, key: string | WordArray, cfg?: any): CipherParams;
        decrypt(ciphertext: string | CipherParams, key: string | WordArray, cfg?: any): WordArray;
    }

    const AES: AES;
}
