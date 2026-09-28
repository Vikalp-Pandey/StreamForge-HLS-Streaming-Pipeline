import axios from 'axios';

import { api } from '@/lib/axios';

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  detail?: string;
  data: T;
}

export type VideoStatus = 'UPLOADING' | 'UPLOADED' | 'FAILED';

export type TranscodeJobStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export interface ActiveUploadSession {
  videoId: string;
  uploadId: string;
  partSize: number;
  fingerprint: string;
  parts: UploadedPart[];
  resumed: boolean;
  alreadyUploaded: false;
}

export interface AlreadyUploadedVideo {
  videoId: string;
  fingerprint: string;
  fingerprintMatched: true;
  alreadyUploaded: true;
  videoStatus: Exclude<VideoStatus, 'UPLOADING'>;
  transcodeJobId: string | null;
  transcodeStatus: TranscodeJobStatus | null;
}

export type UploadSession = ActiveUploadSession | AlreadyUploadedVideo;

export interface UploadedPart {
  partNumber: number;
  etag: string;
  size: number;
  fingerprint: string;
  uploadedAt?: string;
}

async function sha256(data: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

export async function fingerprintFile(file: File): Promise<string> {
  const fingerprintChunkSize = 4 * 1024 * 1024;
  const chunkFingerprints: string[] = [];
  for (let offset = 0; offset < file.size; offset += fingerprintChunkSize) {
    chunkFingerprints.push(
      await sha256(
        await file.slice(offset, offset + fingerprintChunkSize).arrayBuffer(),
      ),
    );
  }
  const metadata = new TextEncoder().encode(
    `${file.name}\0${file.type || 'video/mp4'}\0${file.size}\0${chunkFingerprints.join(':')}`,
  );
  return sha256(metadata.buffer);
}

export async function fingerprintPart(part: Blob): Promise<string> {
  return sha256(await part.arrayBuffer());
}

export async function startVideoUpload(
  file: File,
  fingerprint: string,
): Promise<UploadSession> {
  const response = await api.post<ApiResponse<UploadSession>>('/videos/uploads', {
    originalName: file.name,
    contentType: file.type || 'video/mp4',
    size: file.size,
    fingerprint,
  });
  return response.data.data;
}

export function assignVideoPart(
  videoId: string,
  part: number,
): Promise<
  | { status: 'signed'; url: string }
  | { status: 'uploaded'; part: UploadedPart }
>;
export function assignVideoPart(
  videoId: string,
  part: UploadedPart,
): Promise<{ verified: true; part: UploadedPart }>;
export async function assignVideoPart(
  videoId: string,
  part: number | UploadedPart,
): Promise<
  | { status: 'signed'; url: string }
  | { status: 'uploaded'; part: UploadedPart }
  | { verified: true; part: UploadedPart }
> {
  const response = await api.post<
    ApiResponse<
      | { status: 'signed'; url: string }
      | { status: 'uploaded'; part: UploadedPart }
    >
  >(
    `/videos/${videoId}/uploads/part`,
    typeof part === 'number' ? { partNumber: part } : part,
  );
  return response.data.data;
}

export async function uploadPart(
  url: string,
  body: Blob,
  partNumber: number,
  fingerprint: string,
): Promise<UploadedPart> {
  const response = await axios.put(url, body, {
    withCredentials: false,
  });
  const etag = response.headers.etag as string | undefined;
  if (!etag) throw new Error('S3 did not expose the ETag header.');

  return { partNumber, etag, size: body.size, fingerprint };
}

export async function completeVideoUpload(
  videoId: string,
) {
  const response = await api.post<
    ApiResponse<{
      completed: true;
      videoId: string;
      transcodeJobId: string;
      status: Extract<TranscodeJobStatus, 'PENDING'>;
    }>
  >(`/videos/${videoId}/uploads/complete`);
  return response.data.data;
}
