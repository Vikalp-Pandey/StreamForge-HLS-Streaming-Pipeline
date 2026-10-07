import {
  Check,
  CircleAlert,
  Clock3,
  CloudUpload,
  Cpu,
  FileVideo2,
  Loader2,
  RadioTower,
} from 'lucide-react';

import type { DashboardVideo } from '@/api/video.api';
import { HlsPlayer } from '@/components/video/hls-player';

interface VideoCardProps {
  video: DashboardVideo;
}

type StageState = 'complete' | 'active' | 'waiting' | 'failed';

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function stageStyles(state: StageState) {
  if (state === 'complete') return 'border-emerald-500/20 text-emerald-400';
  if (state === 'active') return 'border-sky-500/20 text-sky-400';
  if (state === 'failed') return 'border-red-500/20 text-red-400';
  return 'border-white/6 text-slate-600';
}

function Stage({
  icon: Icon,
  label,
  state,
  value,
}: {
  icon: typeof CloudUpload;
  label: string;
  state: StageState;
  value: string;
}) {
  return (
    <div
      className={`rounded-lg border bg-black/20 px-3 py-2.5 ${stageStyles(state)}`}
    >
      <div className="flex items-center gap-1.5">
        {state === 'complete' ? (
          <Check size={12} />
        ) : state === 'active' ? (
          <Loader2 size={12} className="animate-spin" />
        ) : state === 'failed' ? (
          <CircleAlert size={12} />
        ) : (
          <Icon size={12} />
        )}
        <span className="text-[9px] font-bold tracking-wider uppercase">
          {label}
        </span>
      </div>
      <p className="mt-1 truncate text-[10px] text-slate-500">{value}</p>
    </div>
  );
}

export function VideoCard({ video }: VideoCardProps) {
  const transcodeStatus = video.transcodeJob?.status;
  const uploadState: StageState =
    video.status === 'FAILED'
      ? 'failed'
      : video.status === 'UPLOADED'
        ? 'complete'
        : 'active';
  const transcodeState: StageState =
    transcodeStatus === 'FAILED'
      ? 'failed'
      : transcodeStatus === 'COMPLETED'
        ? 'complete'
        : transcodeStatus === 'PENDING' || transcodeStatus === 'PROCESSING'
          ? 'active'
          : 'waiting';
  const playbackState: StageState = video.playbackReady
    ? 'complete'
    : transcodeStatus === 'FAILED'
      ? 'failed'
      : 'waiting';

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/7 bg-[#0d1117] shadow-[0_14px_40px_rgba(0,0,0,0.16)] transition duration-300 hover:-translate-y-0.5 hover:border-white/12">
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

        <div className="grid grid-cols-3 gap-2">
          <Stage
            icon={CloudUpload}
            label="Upload"
            state={uploadState}
            value={
              uploadState === 'complete'
                ? 'Stored in S3'
                : `${video.uploadProgress}% complete`
            }
          />
          <Stage
            icon={Cpu}
            label="Transcode"
            state={transcodeState}
            value={transcodeStatus?.toLowerCase() ?? 'Waiting'}
          />
          <Stage
            icon={RadioTower}
            label="Playback"
            state={playbackState}
            value={video.playbackReady ? 'Stream ready' : 'Not ready'}
          />
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
