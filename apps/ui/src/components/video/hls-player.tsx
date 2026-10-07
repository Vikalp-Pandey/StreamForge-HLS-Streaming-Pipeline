import { useQuery } from '@tanstack/react-query';
import type HlsInstance from 'hls.js';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { env } from '@repo/env/client';

import { getVideoPlayback } from '@/api/playback.api';

interface HlsPlayerProps {
  videoId: string;
}

interface QualityOption {
  index: number;
  height: number;
}

export function HlsPlayer({ videoId }: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<HlsInstance | undefined>(undefined);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [selectedQuality, setSelectedQuality] = useState(-1);
  const [activeHeight, setActiveHeight] = useState<number | null>(null);
  const playbackQuery = useQuery({
    queryKey: ['video-playback', videoId],
    queryFn: () => getVideoPlayback(videoId),
    refetchInterval: (query) => {
      const status = query.state.data?.transcodeStatus;
      return status === 'PENDING' || status === 'PROCESSING' ? 3_000 : false;
    },
  });

  const manifestPath = playbackQuery.data?.manifestPath;
  const manifestUrl = manifestPath
    ? `${env.VITE_API_URL.replace(/\/$/, '')}${manifestPath}`
    : null;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !manifestUrl) return;

    let cancelled = false;
    let hls: HlsInstance | undefined;

    setPlayerError(null);
    setQualityOptions([]);
    setSelectedQuality(-1);
    setActiveHeight(null);

    const attachPlayer = async () => {
      const { default: Hls } = await import('hls.js');
      if (cancelled) return;

      if (Hls.isSupported()) {
        const apiOrigin = new URL(env.VITE_API_URL, window.location.href)
          .origin;
        hls = new Hls({
          xhrSetup: (xhr, url) => {
            xhr.withCredentials =
              new URL(url, window.location.href).origin === apiOrigin;
          },
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setQualityOptions(
            hls?.levels.map((level, index) => ({
              index,
              height: level.height,
            })) ?? [],
          );
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
          setActiveHeight(hls?.levels[data.level]?.height ?? null);
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) setPlayerError('The HLS stream could not be loaded.');
        });
        hls.loadSource(manifestUrl);
        hls.attachMedia(video);

        return;
      }

      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.crossOrigin = 'use-credentials';
        video.src = manifestUrl;
        return;
      }

      setPlayerError('This browser does not support HLS playback.');
    };

    void attachPlayer();

    return () => {
      cancelled = true;
      hls?.destroy();
      hlsRef.current = undefined;
      video.removeAttribute('src');
    };
  }, [manifestUrl]);

  const selectQuality = (level: number) => {
    setSelectedQuality(level);
    if (hlsRef.current) hlsRef.current.currentLevel = level;
  };

  if (playbackQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Loader2 className="size-4 animate-spin" /> Checking stream status…
      </div>
    );
  }

  if (playbackQuery.isError) {
    return (
      <p className="text-xs text-red-400">Unable to load playback status.</p>
    );
  }

  if (playbackQuery.data?.transcodeStatus === 'FAILED') {
    return (
      <p className="text-xs text-red-400">
        Transcoding failed: {playbackQuery.data.error ?? 'Unknown error'}
      </p>
    );
  }

  if (!manifestUrl) {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-400">
        <Loader2 className="size-4 animate-spin" />
        Preparing stream ({playbackQuery.data?.transcodeStatus ?? 'PENDING'})…
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <video
          ref={videoRef}
          controls
          playsInline
          className="aspect-video w-full rounded-lg border border-white/10 bg-black"
        />
        {qualityOptions.length > 0 && (
          <label className="absolute top-2 right-2 rounded-md border border-white/10 bg-black/75 px-2 py-1 text-[10px] text-white backdrop-blur">
            <span className="sr-only">Video quality</span>
            <select
              aria-label="Video quality"
              value={selectedQuality}
              onChange={(event) => selectQuality(Number(event.target.value))}
              className="cursor-pointer bg-transparent font-semibold outline-none"
            >
              <option value={-1} className="bg-slate-950">
                Auto{activeHeight ? ` (${activeHeight}p)` : ''}
              </option>
              {qualityOptions.map((quality) => (
                <option
                  key={quality.index}
                  value={quality.index}
                  className="bg-slate-950"
                >
                  {quality.height}p
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {playerError && <p className="text-xs text-red-400">{playerError}</p>}
    </div>
  );
}
