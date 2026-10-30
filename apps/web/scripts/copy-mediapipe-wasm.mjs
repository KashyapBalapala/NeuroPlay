// Copies MediaPipe's WASM runtime from the installed @mediapipe/tasks-vision
// package into public/ so it is served from our own origin, never a CDN.
// Runs before dev, build and test (see package.json); the output is Git-ignored
// so it always matches the installed package version.
import { cp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const source = join(dirname(require.resolve("@mediapipe/tasks-vision")), "wasm");
const target = fileURLToPath(new URL("../public/mediapipe/wasm/", import.meta.url));

await rm(target, { recursive: true, force: true });
await cp(source, target, { recursive: true });
console.log(`Copied MediaPipe WASM files to ${target}`);
