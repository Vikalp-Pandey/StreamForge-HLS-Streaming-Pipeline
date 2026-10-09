import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [command, stage] = process.argv.slice(2);
const builder = 'streamforge-sst-v2';

if (!['deploy', 'remove'].includes(command) || !stage) {
  console.error('Usage: node scripts/sst.mjs <deploy|remove> <stage>');
  process.exit(1);
}

const environment = {
  ...process.env,
  BUILDX_BUILDER: builder,
  DOCKER_CONTEXT: 'desktop-linux',
};

function run(program, args, options = {}) {
  const result = spawnSync(program, args, {
    env: environment,
    stdio: 'inherit',
    ...options,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result;
}

if (command === 'deploy') {
  run('docker', [
    '--context=desktop-linux',
    'buildx',
    'stop',
    builder,
  ]);
  run(
    'docker',
    ['--context=desktop-linux', 'buildx', 'inspect', builder, '--bootstrap'],
  );

  const region = environment.AWS_REGION ?? 'eu-north-1';
  const account = run(
    'aws',
    ['sts', 'get-caller-identity', '--query', 'Account', '--output', 'text'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  ).stdout.trim();
  const registry = `${account}.dkr.ecr.${region}.amazonaws.com`;
  const repository = `${registry}/sst-asset`;

  const password = run(
    'aws',
    ['ecr', 'get-login-password', '--region', region],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  ).stdout;
  run(
    'docker',
    ['--context=desktop-linux', 'login', '--username', 'AWS', '--password-stdin', registry],
    { input: password, stdio: ['pipe', 'inherit', 'inherit'] },
  );

  const tag = `${repository}:Transcoder-${stage}-${Date.now()}`;
  const cache = `${repository}:Transcoder-cache`;
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'streamforge-image-'));
  const metadataFile = join(temporaryDirectory, 'metadata.json');

  try {
    run('docker', [
      '--context=desktop-linux',
      'buildx',
      'build',
      '--builder',
      builder,
      '--platform',
      'linux/amd64',
      '--file',
      'apps/transcoder/Dockerfile',
      '--tag',
      tag,
      '--cache-from',
      `type=registry,ref=${cache}`,
      '--cache-to',
      `type=registry,ref=${cache},mode=max,image-manifest=true,oci-mediatypes=true`,
      '--metadata-file',
      metadataFile,
      '--push',
      '.',
    ]);

    const metadata = JSON.parse(readFileSync(metadataFile, 'utf8'));
    const digest = metadata['containerimage.digest'];
    if (!digest) throw new Error('Docker build did not return an image digest.');
    environment.TRANSCODER_IMAGE = `${repository}@${digest}`;
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
}

const sst = spawnSync(
  process.execPath,
  ['./node_modules/sst/bin/sst.mjs', command, '--stage', stage],
  { env: environment, stdio: 'inherit' },
);

if (sst.error) throw sst.error;
process.exit(sst.status ?? 1);
