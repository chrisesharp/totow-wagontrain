import fs from 'fs-extra';
import gulp from 'gulp';
import gulpSass from 'gulp-sass';
import * as dartSass from 'sass';
const sass = gulpSass(dartSass);
import autoprefixer from 'gulp-autoprefixer';
import path from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { rollup } from 'rollup';
import rollupConfig from './rollup.config.js';

/********************/
/*  CONFIGURATION   */
/********************/

// Must match the `id` in src/module.json.
const name = 'totow-wagontrain';
const sourceDirectory = './src';
const distDirectory = './dist';
const stylesDirectory = './scss';
const stylesEntry = 'wagontrain';
const sourceFileExtension = 'mjs';
const scriptsDirectory = './scripts';
// Copied as-is from `src/` into `dist/`.
const staticFiles = ['lang', 'templates', 'module.json'];
// Copied as-is from the repository root into `dist/`.
const rootFiles = ['LICENSE.txt', 'README.md'];

/********************/
/*      BUILD       */
/********************/

let cache;
/**
 * Bundle the module scripts into `dist/scripts`.
 */
async function buildCode() {
  const bundle = await rollup({ ...rollupConfig, cache });
  cache = bundle.cache;
  await bundle.write(rollupConfig.output);
  await bundle.close();
}

/**
 * Compile the stylesheet into `dist/styles`.
 */
function buildStyles() {
  return gulp
    .src(`${stylesDirectory}/${stylesEntry}.scss`)
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer())
    .pipe(gulp.dest(`${distDirectory}/styles`));
}

/**
 * Copy static files.
 */
async function copyFiles() {
  for (const file of staticFiles) {
    if (fs.existsSync(`${sourceDirectory}/${file}`)) {
      await fs.copy(`${sourceDirectory}/${file}`, `${distDirectory}/${file}`);
    }
  }
  for (const file of rootFiles) {
    if (fs.existsSync(file)) {
      await fs.copy(file, `${distDirectory}/${file}`);
    }
  }
}

/**
 * Rebuild on change.
 */
function watch() {
  gulp.watch(`${scriptsDirectory}/**/*.${sourceFileExtension}`, { ignoreInitial: false }, buildCode);
  gulp.watch(`${stylesDirectory}/**/*.scss`, { ignoreInitial: false }, buildStyles);
  gulp.watch(
    [...staticFiles.map((file) => `${sourceDirectory}/${file}`), ...rootFiles],
    { ignoreInitial: false },
    copyFiles,
  );
}

const build = gulp.series(clean, gulp.parallel(buildCode, buildStyles, copyFiles));

/********************/
/*      CLEAN       */
/********************/

/**
 * Remove built files from the `dist` folder.
 */
async function clean() {
  const files = [...staticFiles, ...rootFiles, 'scripts', 'styles'];

  console.log(' ', 'Files to clean:');
  console.log('   ', files.join('\n    '));

  for (const filePath of files) {
    await fs.remove(`${distDirectory}/${filePath}`);
  }
}

/********************/
/*       LINK       */
/********************/

/**
 * Get the data path of Foundry VTT based on what is configured in `foundryconfig.json`.
 */
function getDataPath() {
  if (!fs.existsSync('foundryconfig.json')) {
    throw new Error('foundryconfig.json not found. Copy foundryconfig.example.json and set dataPath.');
  }
  const config = fs.readJSONSync('foundryconfig.json');

  if (config?.dataPath) {
    if (!fs.existsSync(path.resolve(config.dataPath))) {
      throw new Error('User Data path invalid, no Data directory found');
    }

    return path.resolve(config.dataPath);
  } else {
    throw new Error('No User Data path defined in foundryconfig.json');
  }
}

/**
 * Link the build to the User Data folder (or remove the link with `--clean`).
 */
async function link() {
  const linkDirectory = path.resolve(getDataPath(), 'Data', 'modules', name);

  const argv = yargs(hideBin(process.argv)).option('clean', {
    alias: 'c',
    type: 'boolean',
    default: false,
  }).argv;

  if (argv.c) {
    console.log(`Removing build in ${linkDirectory}.`);

    await fs.remove(linkDirectory);
  } else if (!fs.existsSync(linkDirectory)) {
    console.log(`Linking dist to ${linkDirectory}.`);
    await fs.ensureDir(path.resolve(linkDirectory, '..'));
    await fs.symlink(path.resolve(distDirectory), linkDirectory);
  }
}

export { watch, build, clean, link };
