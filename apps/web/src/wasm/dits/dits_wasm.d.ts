/* tslint:disable */
/* eslint-disable */

/**
 * One content-defined chunk: where it sits in the input and its BLAKE3 address.
 */
export class Chunk {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Full BLAKE3 content address as a hex string.
     */
    hash: string;
    /**
     * Length of this chunk in bytes.
     */
    length: number;
    /**
     * Byte offset of this chunk within the input.
     */
    offset: number;
}

/**
 * Chunk-size profile, mirroring `dits_core::ChunkerConfig` presets.
 */
export enum Profile {
    /**
     * 1K / 4K / 16K — small chunks so the demo is legible on modest inputs.
     */
    Demo = 0,
    /**
     * 4K / 16K / 64K — project files, text, configs.
     */
    Project = 1,
    /**
     * 16K / 64K / 256K — general-purpose default (the CLI default).
     */
    Default = 2,
    /**
     * 64K / 256K / 1M — video, 3D, large binaries.
     */
    Media = 3,
}

/**
 * Chunk a buffer with the real engine and return one [`Chunk`] per piece.
 *
 * This is exactly what the CLI computes in `chunk_data_with_refs` — same
 * boundaries, same BLAKE3 hashes. Runs entirely in the browser; the bytes
 * never leave the page.
 */
export function chunk(data: Uint8Array, profile: Profile): Chunk[];

/**
 * BLAKE3 content address of a whole buffer, as hex. Handy for a quick
 * "this is the same content" check in the UI.
 */
export function hash_hex(data: Uint8Array): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_chunk_free: (a: number, b: number) => void;
    readonly __wbg_get_chunk_hash: (a: number) => [number, number];
    readonly __wbg_get_chunk_length: (a: number) => number;
    readonly __wbg_get_chunk_offset: (a: number) => number;
    readonly __wbg_set_chunk_hash: (a: number, b: number, c: number) => void;
    readonly __wbg_set_chunk_length: (a: number, b: number) => void;
    readonly __wbg_set_chunk_offset: (a: number, b: number) => void;
    readonly chunk: (a: number, b: number, c: number) => [number, number];
    readonly hash_hex: (a: number, b: number) => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __externref_drop_slice: (a: number, b: number) => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
