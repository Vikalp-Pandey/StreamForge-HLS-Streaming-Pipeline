import { CircleAlert, Clock3, FileVideo2, Loader2 } from 'lucide-react';

import type { DashboardVideo } from '@/api/video.api';
import { HlsPlayer } from '@/components/video/hls-player';

interface VideoCardProps {
  video: DashboardVideo;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function VideoCard({ video }: VideoCardProps) {
  const transcodeStatus = video.transcodeJob?.status;

  return (
    <article className="group relative rounded-2xl border border-white/7 bg-[#0d1117] shadow-[0_14px_40px_rgba(0,0,0,0.16)] transition duration-300 focus-within:z-50 hover:-translate-y-0.5 hover:border-white/12">
      <div className="border-b border-white/6 bg-[#090c11] p-3">
        {video.playbackReady ? (
          <HlsPlayer videoId={video.id} />
        ) : (
          <div className="grid aspect-video place-items-center rounded-lg border border-white/5 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.08),transparent_65%)]">
            <div className="text-center">
              {transcodeStatus === 'FAILED' ? (
                <CircleAlert className="mx-auto text-red-400" size={27} />
              ) : transcodeStatus === 'PROCESSING' ? (
                <Loader2
                  className="mx-auto animate-spin text-violet-400"
                  size={27}
                />
              ) : (
                <FileVideo2 className="mx-auto text-slate-700" size={27} />
              )}
              <p className="mt-3 text-[10px] font-bold tracking-[0.18em] text-slate-600 uppercase">
                {transcodeStatus === 'FAILED'
                  ? 'Processing failed'
                  : transcodeStatus === 'PROCESSING'
                    ? 'Creating HLS stream'
                    : video.status === 'UPLOADING'
                      ? `Uploading ${video.uploadProgress}%`
                      : 'Waiting for worker'}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-slate-200">
              {video.originalName}
            </h3>
            <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-600">
              <span>{formatFileSize(video.size)}</span>
              <span className="flex items-center gap-1">
                <Clock3 size={10} />
                {new Intl.DateTimeFormat(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(video.createdAt))}
              </span>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold tracking-wider uppercase ${
              video.playbackReady
                ? 'bg-emerald-500/10 text-emerald-400'
                : transcodeStatus === 'FAILED' || video.status === 'FAILED'
                  ? 'bg-red-500/10 text-red-400'
                  : 'bg-sky-500/10 text-sky-400'
            }`}
          >
            {video.playbackReady ? 'Ready' : (transcodeStatus ?? video.status)}
          </span>
        </div>

        {video.transcodeJob?.error && (
          <p className="rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-2 text-[10px] leading-relaxed text-red-300/80">
            {video.transcodeJob.error}
          </p>
        )}
      </div>
    </article>
  );
}
