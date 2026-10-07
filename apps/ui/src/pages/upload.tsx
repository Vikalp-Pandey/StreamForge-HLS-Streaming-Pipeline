import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  FileVideo,
  LayoutGrid,
  Library,
  Loader2,
  Plus,
  UploadCloud,
  UserRound,
} from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';

import {
  assignVideoPart,
  completeVideoUpload,
  fingerprintFile,
  fingerprintPart,
  listVideos,
  startVideoUpload,
  uploadPart,
  type TranscodeJobStatus,
  type UploadedPart,
  type VideoStatus,
} from '@/api/video.api';
import { Brand } from '@/components/brand';
import { PipelineOverview } from '@/components/dashboard/pipeline-overview';
import { VideoCard } from '@/components/dashboard/video-card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useAuth';

interface UploadFormValues {
  video: FileList;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Choose a video to begin.');
  const [videoStatus, setVideoStatus] = useState<VideoStatus | null>(null);
  const [transcodeStatus, setTranscodeStatus] =
    useState<TranscodeJobStatus | null>(null);
  const userQuery = useUser();
  const queryClient = useQueryClient();
  const { control, handleSubmit, register } = useForm<UploadFormValues>();
  const selectedFile = useWatch({ control, name: 'video' })?.[0];
  const videosQuery = useQuery({
    queryKey: ['videos'],
    queryFn: listVideos,
    enabled: Boolean(userQuery.data?.data),
    refetchInterval: (query) => {
      const videos = query.state.data;
      if (
        videos?.some(
          (video) =>
            video.status === 'UPLOADING' ||
            video.transcodeJob?.status === 'PENDING' ||
            video.transcodeJob?.status === 'PROCESSING',
        )
      ) {
        return 3_000;
      }
      return videos?.some((video) => video.transcodeJob?.status === 'FAILED')
        ? 15_000
        : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setMessage(
        'Fingerprinting the video and checking for an interrupted upload...',
      );

      const fileFingerprint = await fingerprintFile(file);
      const session = await startVideoUpload(file, fileFingerprint);
      await queryClient.invalidateQueries({ queryKey: ['videos'] });

      if (session.alreadyUploaded) {
        setVideoStatus(session.videoStatus);
        setTranscodeStatus(session.transcodeStatus);
        setProgress(session.videoStatus === 'UPLOADED' ? 100 : 0);
        setMessage(
          session.videoStatus === 'FAILED'
            ? 'The previous source upload failed.'
            : session.transcodeJobId && session.transcodeStatus
              ? `Already uploaded. Transcode job is ${session.transcodeStatus.toLowerCase()}.`
              : 'This video is already stored in S3.',
        );
        return session;
      }

      setVideoStatus('UPLOADING');
      setTranscodeStatus(null);

      const parts = new Map<number, UploadedPart>(
        session.parts.map((part) => [part.partNumber, part]),
      );
      const partCount = Math.ceil(file.size / session.partSize);

      setProgress(Math.round((parts.size / partCount) * 100));
      setMessage(
        parts.size > 0
          ? `Resuming after ${parts.size} uploaded part(s).`
          : 'Uploading parts directly to S3...',
      );

      for (let index = 0; index < partCount; index += 1) {
        const partNumber = index + 1;
        if (parts.has(partNumber)) continue;

        const start = index * session.partSize;
        const end = Math.min(start + session.partSize, file.size);
        const target = await assignVideoPart(session.videoId, partNumber);
        if (target.status === 'uploaded') {
          parts.set(partNumber, target.part);
          setProgress(Math.round((parts.size / partCount) * 100));
          continue;
        }

        const chunk = file.slice(start, end);
        const partFingerprint = await fingerprintPart(chunk);
        const uploaded = await uploadPart(
          target.url,
          chunk,
          partNumber,
          partFingerprint,
        );
        const recorded = await assignVideoPart(session.videoId, uploaded);
        if (!('verified' in recorded)) {
          throw new Error(`Part ${partNumber} was not recorded.`);
        }

        parts.set(partNumber, recorded.part);
        setProgress(Math.round((parts.size / partCount) * 100));
      }

      const result = await completeVideoUpload(session.videoId);
      setProgress(100);
      setVideoStatus('UPLOADED');
      setTranscodeStatus(result.status);
      setMessage('Upload complete. The SQS transcode job is now pending.');
      return result;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['videos'] }),
    onError: (error: unknown) => {
      setVideoStatus((current) =>
        current === 'UPLOADED' ? current : 'FAILED',
      );
      setMessage(error instanceof Error ? error.message : 'Upload failed.');
      void queryClient.invalidateQueries({ queryKey: ['videos'] });
    },
  });

  const uploading = uploadMutation.isPending;
  const complete = uploadMutation.isSuccess && videoStatus === 'UPLOADED';
  const videos = videosQuery.data ?? [];
  const readyCount = videos.filter((video) => video.playbackReady).length;
  const processingCount = videos.filter(
    (video) =>
      video.status === 'UPLOADING' ||
      video.transcodeJob?.status === 'PENDING' ||
      video.transcodeJob?.status === 'PROCESSING',
  ).length;

  if (userQuery.isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050505] text-slate-400">
        <Loader2 className="size-5 animate-spin text-sky-500" />
        <span className="sr-only">Checking session</span>
      </main>
    );
  }

  if (userQuery.isError || !userQuery.data?.data) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#080a0e] font-sans text-slate-200">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/7 bg-[#0b0e13] px-5 py-6 lg:flex">
          <Brand className="px-2" />

          <nav className="mt-10 space-y-1" aria-label="Dashboard navigation">
            <a
              href="#overview"
              className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-white"
            >
              <Activity size={17} className="text-sky-400" /> Overview
            </a>
            <a
              href="#new-upload"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition hover:bg-white/[0.035] hover:text-slate-200"
            >
              <Plus size={17} /> New upload
            </a>
            <a
              href="#library"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition hover:bg-white/[0.035] hover:text-slate-200"
            >
              <Library size={17} /> Video library
            </a>
          </nav>

          <div className="mt-auto space-y-4">
            <div className="rounded-xl border border-white/7 bg-white/[0.025] p-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span className="size-2 rounded-full bg-emerald-400" />
                Pipeline available
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-600">
                Uploads go directly to S3. Processing continues through SQS and
                FFmpeg.
              </p>
            </div>
            <Link
              to="/account"
              className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:border-white/7 hover:bg-white/[0.025]"
            >
              <span className="grid size-9 place-items-center rounded-full bg-slate-800 text-slate-300">
                <UserRound size={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-medium text-slate-300">
                  {userQuery.data.data.name}
                </span>
                <span className="block text-[10px] text-slate-600">
                  Manage account
                </span>
              </span>
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/7 bg-[#080a0e]/90 px-5 backdrop-blur-xl lg:hidden">
            <Brand />
            <Link
              to="/account"
              className="grid size-9 place-items-center rounded-full border border-white/8 bg-white/[0.035] text-slate-400"
              aria-label="Open account"
            >
              <UserRound size={16} />
            </Link>
          </header>

          <div className="space-y-8 px-5 py-8 sm:px-8 lg:px-10 lg:py-10 xl:px-12">
        <section id="overview" className="flex scroll-mt-8 flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium text-sky-400">
              Video workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white lg:text-[2.5rem]">
              Good to see you, {userQuery.data.data.name.split(' ')[0]}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Upload source video, follow its progress, and watch it when the
              stream is ready.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              ['Videos', videos.length],
              ['Processing', processingCount],
              ['Ready', readyCount],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-w-24 rounded-xl border border-white/7 bg-[#0d1117] px-4 py-3"
              >
                <p className="text-xl font-semibold text-white">{value}</p>
                <p className="mt-0.5 text-[10px] text-slate-600">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div id="new-upload" className="grid scroll-mt-8 gap-5 xl:grid-cols-[380px_1fr]">
          <motion.form
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/7 bg-[#0d1117] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
            onSubmit={handleSubmit(({ video }) =>
              uploadMutation.mutate(video[0]),
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-sky-400 uppercase">
                  New source
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">
                  Upload video
                </h2>
              </div>
              <span className="grid size-9 place-items-center rounded-lg bg-sky-500/10 text-sky-400">
                <UploadCloud size={17} />
              </span>
            </div>

            <label
              htmlFor="video"
              className={`group mt-5 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-5 text-center transition ${
                selectedFile
                  ? 'border-sky-500/30 bg-sky-500/5'
                  : 'border-white/10 bg-black/20 hover:border-sky-500/30'
              } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
            >
              <FileVideo
                size={22}
                className={selectedFile ? 'text-sky-400' : 'text-slate-700'}
              />
              <span className="mt-3 max-w-full truncate text-xs font-medium text-slate-300">
                {selectedFile?.name ?? 'Choose a video file'}
              </span>
              <span className="mt-1 text-[10px] text-slate-600">
                {selectedFile
                  ? `${formatFileSize(selectedFile.size)} · click to replace`
                  : 'Large files automatically use multipart upload'}
              </span>
            </label>
            <input
              id="video"
              type="file"
              accept="video/*"
              disabled={uploading}
              className="sr-only"
              {...register('video', {
                required: true,
                onChange: () => {
                  setProgress(0);
                  setMessage('Ready to upload.');
                  setVideoStatus(null);
                  setTranscodeStatus(null);
                  uploadMutation.reset();
                },
              })}
            />

            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between text-[9px] font-bold tracking-wider uppercase">
                <span className="text-slate-600">Multipart transfer</span>
                <span
                  className={complete ? 'text-emerald-400' : 'text-sky-400'}
                >
                  {progress}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className={`h-full rounded-full ${complete ? 'bg-emerald-500' : 'bg-sky-500'}`}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <p className="flex min-h-9 gap-2 text-[10px] leading-relaxed text-slate-500">
                {complete && (
                  <CheckCircle2
                    className="mt-0.5 shrink-0 text-emerald-500"
                    size={12}
                  />
                )}
                {message}
              </p>
            </div>

            <Button
              type="submit"
              disabled={!selectedFile || uploading}
              className="mt-4 h-11 w-full rounded-lg bg-sky-600 text-xs font-bold text-white hover:bg-sky-500"
            >
              {uploading ? (
                <>
                  <Loader2 className="animate-spin" /> Uploading {progress}%
                </>
              ) : (
                'Start or resume upload'
              )}
            </Button>

            {(videoStatus || transcodeStatus) && (
              <div className="mt-3 flex gap-2 text-[9px] font-bold tracking-wider uppercase">
                <span className="rounded-md bg-white/4 px-2 py-1 text-slate-500">
                  Source: {videoStatus}
                </span>
                <span className="rounded-md bg-white/4 px-2 py-1 text-slate-500">
                  Job: {transcodeStatus ?? 'not created'}
                </span>
              </div>
            )}
          </motion.form>

          <PipelineOverview />
        </div>

        <section id="library" className="scroll-mt-8">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg border border-white/7 bg-white/3 text-slate-500">
                <LayoutGrid size={16} />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Your streams
                </h2>
                <p className="text-xs text-slate-600">
                  Live status from MongoDB and the transcode queue
                </p>
              </div>
            </div>
            {videosQuery.isFetching && (
              <span className="flex items-center gap-2 text-[10px] text-slate-600">
                <Loader2 size={11} className="animate-spin" /> Refreshing
              </span>
            )}
          </div>

          {videosQuery.isError ? (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/10 bg-red-500/5 p-4 text-xs text-red-300">
              <CircleAlert size={16} /> Unable to load the video library.
            </div>
          ) : videosQuery.isLoading ? (
            <div className="grid min-h-52 place-items-center rounded-2xl border border-white/6 bg-white/[0.02] text-slate-600">
              <Loader2 className="animate-spin" />
            </div>
          ) : videos.length === 0 ? (
            <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-white/8 bg-white/[0.015] text-center">
              <div>
                <FileVideo className="mx-auto text-slate-700" size={28} />
                <p className="mt-3 text-sm font-medium text-slate-400">
                  No videos yet
                </p>
                <p className="mt-1 text-xs text-slate-700">
                  Your first upload will appear here immediately.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </section>
          </div>
        </main>
      </div>
    </div>
  );
}
