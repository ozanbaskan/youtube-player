import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
    input: 'src/index.ts',
    output: [
        { file: 'dist/index.cjs.js', format: 'cjs' },
        { file: 'dist/index.esm.js', format: 'esm' },
        { file: 'dist/index.min.js', format: 'umd', name: 'YoutubePlayer', plugins: [terser()] }
    ],
    plugins: [resolve(), commonjs(), typescript()]
};
