import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

// Bundle the injector as an IIFE for browser injection
async function bundle() {
  try {
    await esbuild.build({
      entryPoints: ['./dist/index.js'],
      bundle: true,
      minify: true,
      format: 'iife',
      globalName: 'WebReaper',
      outfile: './dist/injector.iife.js',
      platform: 'browser',
      target: ['es2020'],
    });

    // Also create a non-minified version for debugging
    await esbuild.build({
      entryPoints: ['./dist/index.js'],
      bundle: true,
      minify: false,
      format: 'iife',
      globalName: 'WebReaper',
      outfile: './dist/injector.iife.debug.js',
      platform: 'browser',
      target: ['es2020'],
    });

    console.log('✅ Browser injector bundled successfully');
  } catch (error) {
    console.error('❌ Bundle failed:', error);
    process.exit(1);
  }
}

bundle();
