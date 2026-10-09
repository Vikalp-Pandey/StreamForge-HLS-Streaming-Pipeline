import { api } from '@/lib/axios';

import type { TranscodeJobStatus, VideoStatus } from './video.api';

interface ApiResponse<T> {
  data: T;
}

export interface VideoPlayback {
  videoId: string;
  videoStatus: VideoStatus;
  transcodeStatus: TranscodeJobStatus | null;
  error?: string;
  manifestUrl: string | null;
  manifestPath: string | null;
}

export async function getVideoPlayback(videoId: string) {
  const response = await api.get<ApiResponse<VideoPlayback>>(
    `/videos/${videoId}/playback`,
  );
  return response.data.data;
}
