// Build assets only. No model weights or user data are included in the image.
import { mkdir, copyFile } from 'node:fs/promises';
import { build } from 'esbuild';
await mkdir('public/local-runtime', { recursive: true });
await build({ entryPoints: ['node_modules/@huggingface/transformers/dist/transformers.web.js'], outfile: 'public/local-runtime/transformers.web.js', bundle: true, format: 'esm', platform: 'browser', minify: true });
for (const file of ['ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
  await copyFile(`node_modules/onnxruntime-web/dist/${file}`, `public/local-runtime/${file}`);
}
