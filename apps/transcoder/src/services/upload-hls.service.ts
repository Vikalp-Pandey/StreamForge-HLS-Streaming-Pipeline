import { env } from '@repo/env/server';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@repo/clients/s3';


const contentType = (name: string) =>
  name.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/mp2t';

async function listHlsFiles(
  directory: string,
  relativeDirectory = '',
): Promise<string[]> {
  const entries = await readdir(path.join(directory, relativeDirectory), {
    withFileTypes: true,
  });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relativePath = path.join(relativeDirectory, entry.name);
      return entry.isDirectory()
        ? listHlsFiles(directory, relativePath)
        : [relativePath];
    }),
  );

  return files.flat();
}

export async function uploadHlsDirectory(
  videoId: string,
  outputDirectory: string,
) {
  const relativePaths = await listHlsFiles(outputDirectory);
  const orderedPaths = relativePaths.sort((left, right) => {
    const leftPlaylist = left.endsWith('.m3u8');
    const rightPlaylist = right.endsWith('.m3u8');
    return Number(leftPlaylist) - Number(rightPlaylist);
  });

  for (const relativePath of orderedPaths) {
    const objectPath = relativePath.split(path.sep).join('/');
    await s3Client.send(
      new PutObjectCommand({
        Bucket: env.AWS_MEDIA_BUCKET,
        Key: `transcoded/${videoId}/${objectPath}`,
        Body: await readFile(path.join(outputDirectory, relativePath)),
        ContentType: contentType(relativePath),
        CacheControl: relativePath.endsWith('.m3u8')
          ? 'no-cache'
          : 'public, max-age=31536000, immutable',
      }),
    );
  }
}
