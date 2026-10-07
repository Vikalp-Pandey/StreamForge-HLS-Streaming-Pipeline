import { env } from '@repo/env/server';

import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

interface Rendition {
  name: string;
  width: number;
  height: number;
}

const RENDITIONS: Rendition[] = [
  { name: '360p', width: 640, height: 360 },
  { name: '480p', width: 854, height: 480 },
  { name: '720p', width: 1280, height: 720 },
  { name: '1080p', width: 1920, height: 1080 },
];

interface SourceMedia {
  height: number;
  hasAudio: boolean;
}

function ffprobePath() {
  const executable = path.parse(env.FFMPEG_PATH);
  if (executable.name.toLowerCase() !== 'ffmpeg') return 'ffprobe';
  if (executable.dir === '') return `ffprobe${executable.ext}`;
  return path.join(executable.dir, `ffprobe${executable.ext}`);
}

function runProcess(
  command: string,
  argumentsList: string[],
  label: string,
  workingDirectory?: string,
) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, argumentsList, {
      cwd: workingDirectory,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let standardOutput = '';
    let errorOutput = '';
    child.stdout.on('data', (chunk: Buffer) => {
      standardOutput += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      errorOutput += chunk.toString();
      if (errorOutput.length > 20_000) {
        errorOutput = errorOutput.slice(-20_000);
      }
    });

    child.once('error', reject);
    child.once('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(standardOutput);
        return;
      }
      reject(
        new Error(`${label} exited with code ${exitCode}: ${errorOutput}`),
      );
    });
  });
}

async function inspectSource(sourcePath: string): Promise<SourceMedia> {
  const output = await runProcess(
    ffprobePath(),
    [
      '-v',
      'error',
      '-show_entries',
      'stream=codec_type,height',
      '-of',
      'json',
      sourcePath,
    ],
    'FFprobe',
  );
  const result = JSON.parse(output) as {
    streams?: Array<{ codec_type?: string; height?: number }>;
  };
  const streams = result.streams ?? [];
  const videoStream = streams.find((stream) => stream.codec_type === 'video');
  if (!videoStream?.height) {
    throw new Error('FFprobe could not determine the source video height.');
  }

  return {
    height: videoStream.height,
    hasAudio: streams.some((stream) => stream.codec_type === 'audio'),
  };
}

function selectRenditions(sourceHeight: number) {
  const eligible = RENDITIONS.filter(
    (rendition) => rendition.height <= sourceHeight,
  );
  return eligible.length > 0 ? eligible : [RENDITIONS[0]!];
}

function createFilter(renditions: Rendition[]) {
  const splitOutputs = renditions
    .map((_, index) => `[source${index}]`)
    .join('');
  const scales = renditions.map(
    (rendition, index) =>
      `[source${index}]scale=${rendition.width}:${rendition.height}:force_original_aspect_ratio=decrease,` +
      `pad=${rendition.width}:${rendition.height}:(ow-iw)/2:(oh-ih)/2,setsar=1[video${index}]`,
  );

  return [`[0:v:0]split=${renditions.length}${splitOutputs}`, ...scales].join(
    ';',
  );
}

export async function createHlsOutput(
  sourcePath: string,
  outputDirectory: string,
) {
  const source = await inspectSource(sourcePath);
  const renditions = selectRenditions(source.height);

  await Promise.all(
    renditions.map((rendition) =>
      mkdir(path.join(outputDirectory, rendition.name), { recursive: true }),
    ),
  );

  const streamArguments = renditions.flatMap((rendition, index) => [
    '-map',
    `[video${index}]`,
    ...(source.hasAudio ? ['-map', '0:a:0?'] : []),
    `-c:v:${index}`,
    'libx264',
    `-preset:v:${index}`,
    'veryfast',
    `-crf:v:${index}`,
    '23',
    ...(source.hasAudio
      ? [`-c:a:${index}`, 'aac', `-b:a:${index}`, '128k', `-ac:a:${index}`, '2']
      : []),
  ]);
  const variantMap = renditions
    .map((rendition, index) =>
      source.hasAudio
        ? `v:${index},a:${index},name:${rendition.name}`
        : `v:${index},name:${rendition.name}`,
    )
    .join(' ');

  await runProcess(
    env.FFMPEG_PATH,
    [
      '-y',
      '-i',
      sourcePath,
      '-filter_complex',
      createFilter(renditions),
      ...streamArguments,
      '-force_key_frames',
      'expr:gte(t,n_forced*6)',
      '-sc_threshold',
      '0',
      '-f',
      'hls',
      '-hls_time',
      '6',
      '-hls_playlist_type',
      'vod',
      '-hls_flags',
      'independent_segments',
      '-hls_segment_filename',
      path.join('%v', 'segment-%05d.ts'),
      '-master_pl_name',
      'index.m3u8',
      '-var_stream_map',
      variantMap,
      path.join('%v', 'index.m3u8'),
    ],
    'FFmpeg',
    outputDirectory,
  );

  const masterPlaylistPath = path.join(outputDirectory, 'index.m3u8');
  const masterPlaylist = await readFile(masterPlaylistPath, 'utf8');
  await writeFile(
    masterPlaylistPath,
    masterPlaylist.replaceAll('\\', '/'),
    'utf8',
  );
}
