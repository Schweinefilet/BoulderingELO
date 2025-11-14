import { spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptDir);
const distIndex = join(projectRoot, 'dist', 'index.html');

const require = createRequire(import.meta.url);

let viteBin;
try {
  const vitePkgPath = require.resolve('vite/package.json');
  const viteDir = dirname(vitePkgPath);
  const candidate = join(viteDir, 'bin', 'vite.js');
  if (existsSync(candidate)) {
    viteBin = candidate;
  } else {
    const fallbackCandidate = join(viteDir, 'dist', 'node', 'cli.js');
    if (existsSync(fallbackCandidate)) {
      viteBin = fallbackCandidate;
    }
  }
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') {
    console.error('Unable to resolve Vite.', error);
    process.exit(1);
  }
}

if (viteBin) {
  const result = spawnSync(process.execPath, [viteBin, 'build'], {
    cwd: projectRoot,
    stdio: 'inherit'
  });
  if (result.status === 0) {
    process.exit(0);
  }
  if (result.error) {
    console.error('Failed to run Vite:', result.error);
    process.exit(1);
  }
  const status = typeof result.status === 'number' ? result.status : 1;
  process.exit(status);
}

try {
  accessSync(distIndex, constants.R_OK);
  console.warn(
    'Vite is not installed. Falling back to the prebuilt assets already committed to the repository.'
  );
  console.warn('To produce a fresh build, install dependencies and rerun the build command.');
  process.exit(0);
} catch (error) {
  console.error('Vite is not available and no prebuilt assets were found at', distIndex);
  console.error('Install dependencies with "npm install" to generate the dist/ directory.');
  process.exit(1);
}
