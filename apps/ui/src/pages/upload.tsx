import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle2, FileVideo, Loader2, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';

import {
  assignVideoPart,
  completeVideoUpload,
  fingerprintFile,
  fingerprintPart,
  startVideoUpload,
  uploadPart,
  type TranscodeJobStatus,
  type UploadedPart,
  type VideoStatus,
} from '@/api/video.api';
import { Button } from '@/components/ui/button';
import { Brand } from '@/components/brand';
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
  const { handleSubmit, register, watch } = useForm<UploadFormValues>();
  const selectedFile = watch('video')?.[0];

  const uploadMutation = useMutation({
    mutationFn: async (selectedFile: File) => {
      setMessage(
        'Fingerprinting the video and checking for an interrupted upload...',
      );

      const fileFingerprint = await fingerprintFile(selectedFile);
      const session = await startVideoUpload(selectedFile, fileFingerprint);

      if (session.alreadyUploaded) {
        setVideoStatus(session.videoStatus);
        setTranscodeStatus(session.transcodeStatus);
        setProgress(session.videoStatus === 'UPLOADED' ? 100 : 0);
        setMessage(
          session.videoStatus === 'FAILED'
            ? 'The previous source upload failed.'
            : session.transcodeJobId && session.transcodeStatus
              ? `Already uploaded to S3. Transcode job ${session.transcodeJobId} is ${session.transcodeStatus.toLowerCase()}.`
              : 'Already uploaded to S3.',
        );
        return session;
      }

      setVideoStatus('UPLOADING');
      setTranscodeStatus(null);

      const parts = new Map<number, UploadedPart>(
        session.parts.map((part) => [part.partNumber, part]),
      );
      const partCount = Math.ceil(selectedFile.size / session.partSize);

      setProgress(Math.round((parts.size / partCount) * 100));
      setMessage(
        parts.size > 0
          ? `Resuming after ${parts.size} uploaded part(s).`
          : 'Uploading to S3...',
      );

      for (let index = 0; index < partCount; index += 1) {
        const partNumber = index + 1;
        if (parts.has(partNumber)) continue;

        const start = index * session.partSize;
        const end = Math.min(start + session.partSize, selectedFile.size);
        const target = await assignVideoPart(session.videoId, partNumber);
        if (target.status === 'uploaded') {
          parts.set(partNumber, target.part);
          setProgress(Math.round((parts.size / partCount) * 100));
          continue;
        }

        const chunk = selectedFile.slice(start, end);
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
      setMessage(
        `Upload complete. Transcode job ${result.transcodeJobId} is pending.`,
      );
      return result;
    },
    onError: (error: unknown) => {
      setVideoStatus((current) =>
        current === 'UPLOADED' ? current : 'FAILED',
      );
      setMessage(error instanceof Error ? error.message : 'Upload failed.');
    },
  });

  const uploading = uploadMutation.isPending;
  const complete = uploadMutation.isSuccess && videoStatus === 'UPLOADED';

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
    <main className="grid min-h-screen overflow-hidden bg-[#050505] font-sans text-slate-200 selection:bg-sky-500/30 lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/3 bg-[#080808] p-24 lg:flex">
        <div className="absolute right-[-10%] bottom-[-20%] h-[70%] w-[70%] rounded-full bg-sky-900/10 blur-[120px]" />

        <Link
          to="/account"
          className="relative z-10 inline-flex"
        >
          <Brand />
        </Link>

        <div className="relative z-10 space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl leading-[1.2] font-light tracking-tight text-white">
              Upload once. <br />
              <span className="font-medium text-slate-500">
                Resume whenever.
              </span>
            </h1>
          </motion.div>
          <div className="h-px w-12 bg-sky-500" />
          <p className="max-w-xs text-sm leading-relaxed font-light tracking-wide text-slate-500">
            Large videos are split into secure parts and sent directly to S3.
            Interrupted transfers continue from the last verified part.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.03),transparent_70%)] p-8">
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-8"
          onSubmit={handleSubmit(({ video }) => uploadMutation.mutate(video[0]))}
        >
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Upload video
            </h2>
            <p className="text-sm text-slate-500">
              Select a source file to upload or resume.
            </p>
          </div>

          <div className="space-y-3">
            <p className="ml-1 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
              Source video
            </p>
            <label
              htmlFor="video"
              className={`group flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center transition-all ${
                selectedFile
                  ? 'border-sky-500/30 bg-sky-500/5'
                  : 'border-white/8 bg-white/2 hover:border-sky-500/30 hover:bg-white/4'
              } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
            >
              <span className="mb-4 grid size-11 place-items-center rounded-full border border-white/5 bg-white/3 text-zinc-600 transition-colors group-hover:text-sky-500">
                {selectedFile ? <FileVideo size={19} /> : <UploadCloud size={19} />}
              </span>
              {selectedFile ? (
                <>
                  <span className="max-w-full truncate text-sm font-medium text-slate-200">
                    {selectedFile.name}
                  </span>
                  <span className="mt-1 text-xs text-slate-600">
                    {formatFileSize(selectedFile.size)} · Choose another file
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-slate-300">
                    Choose a video file
                  </span>
                  <span className="mt-1 text-xs text-slate-600">
                    Any browser-supported video format
                  </span>
                </>
              )}
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
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold tracking-wider uppercase">
              <span className="text-slate-600">Transfer status</span>
              <span className={complete ? 'text-emerald-400' : 'text-sky-500'}>
                {progress}%
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-white/5"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <motion.div
                className={`h-full rounded-full ${complete ? 'bg-emerald-500' : 'bg-sky-500'}`}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.25 }}
              />
            </div>
            <p
              aria-live="polite"
              className="flex min-h-10 items-start gap-2 text-xs leading-relaxed text-slate-500"
            >
              {complete && (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              )}
              {message}
            </p>
            {(videoStatus || transcodeStatus) && (
              <div className="grid grid-cols-2 gap-2 text-[10px] font-bold tracking-wider uppercase">
                <div className="rounded-md border border-white/5 bg-white/2 px-3 py-2">
                  <span className="block text-slate-600">Video</span>
                  <span
                    className={
                      videoStatus === 'FAILED'
                        ? 'text-red-400'
                        : videoStatus === 'UPLOADED'
                          ? 'text-emerald-400'
                          : 'text-sky-400'
                    }
                  >
                    {videoStatus}
                  </span>
                </div>
                <div className="rounded-md border border-white/5 bg-white/2 px-3 py-2">
                  <span className="block text-slate-600">Transcode job</span>
                  <span
                    className={
                      transcodeStatus === 'FAILED'
                        ? 'text-red-400'
                        : transcodeStatus === 'COMPLETED'
                          ? 'text-emerald-400'
                          : 'text-amber-400'
                    }
                  >
                    {transcodeStatus ?? 'NOT CREATED'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={!selectedFile || uploading}
            className="h-12 w-full rounded-lg bg-sky-600 text-sm font-bold text-white shadow-lg shadow-sky-900/20 transition-all hover:bg-sky-500 active:scale-[0.99]"
          >
            {uploading ? (
              <>
                <Loader2 className="animate-spin" /> Uploading {progress}%
              </>
            ) : (
              'Upload or resume'
            )}
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-slate-700">
            Closing this page will not invalidate parts already stored in S3.
          </p>
        </motion.form>
      </section>
    </main>
  );
}
