const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');

if (process.env.SKIP_PRISMA_GENERATE === '1') {
  console.log('Skipping Prisma generate (SKIP_PRISMA_GENERATE=1).');
  process.exit(0);
}

if (!existsSync('prisma/schema.prisma')) {
  console.log('No Prisma schema found. Skipping Prisma generate.');
  process.exit(0);
}

if (!existsSync('node_modules/prisma')) {
  console.log('Prisma CLI not installed in this environment. Skipping Prisma generate.');
  process.exit(0);
}

const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(command, ['prisma', 'generate'], {
  stdio: 'inherit',
  env: process.env
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);