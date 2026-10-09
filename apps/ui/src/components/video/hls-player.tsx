import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';

import 'video.js/dist/video-js.css';
import 'videojs-contrib-quality-menu';
import 'videojs-contrib-quality-menu/dist/videojs-contrib-quality-menu.css';

import { env } from '@repo/env/client';

import { getVideoPlayback } from '@/api/playback.api';

import type { VideoPlayback } from '@/api/playback.api';

interface HlsPlayerProps {
  videoId: string;
}

interface VhsRequestOptions {
  uri: string;
  withCredentials?: boolean;
  [key: string]: unknown;
}

interface VhsXhr {
  onRequest(callback: (options: VhsRequestOptions) => VhsRequestOptions): void;
}

interface VhsTech {
  vhs?: {
    xhr: VhsXhr;
  };
}

interface QualityMenuPlayer extends Player {
  qualityMenu(options?: {
    defaultResolution?: string;
    useResolutionLabels?: boolean;
  }): void;
}

function VideoJsPlayer({ manifestUrl }: { manifestUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const videoElement = document.createElement('video-js');
    videoElement.classList.add('vjs-big-play-centered');
    container.appendChild(videoElement);

    const player = videojs(videoElement, {
      controls: true,
      responsive: true,
      fluid: true,
      preload: 'metadata',
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      html5: {
        vhs: {
          overrideNative: true,
        },
      },
    }) as QualityMenuPlayer;

    const apiOrigin = new URL(env.VITE_API_URL, window.location.href).origin;
    const requestHook = (options: VhsRequestOptions) => ({
      ...options,
      withCredentials:
        apiOrigin === new URL(options.uri, window.location.href).origin,
    });

    player.on('xhr-hooks-ready', () => {
      const tech = player.tech() as unknown as VhsTech;
      tech.vhs?.xhr.onRequest(requestHook);
    });

    player.ready(() => {
      player.qualityMenu({
        defaultResolution: 'none',
        useResolutionLabels: true,
      });
      player.src({
        src: manifestUrl,
        type: 'application/x-mpegURL',
      });
    });

    return () => {
      player.dispose();
    };
  }, [manifestUrl]);

  return (
    <div data-vjs-player className="overflow-hidden rounded-lg bg-black">
      <div ref={containerRef} />
    </div>
  );
}

export function HlsPlayer({ videoId }: HlsPlayerProps) {
  const playbackQuery = useQuery<VideoPlayback>({
    queryKey: ['video-playback', videoId],
    queryFn: () => getVideoPlayback(videoId),
    refetchInterval: (query) => {
      const playback = query.state.data;
      const status = playback?.transcodeStatus;
      return status === 'PENDING' || status === 'PROCESSING' ? 3_000 : false;
    },
  });

  const playback = playbackQuery.data;
  const manifestUrl = playback
    ? (playback.manifestUrl ??
      (playback.manifestPath
        ? `${env.VITE_API_URL.replace(/\/$/, '')}${playback.manifestPath}`
        : null))
    : null;

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

  return <VideoJsPlayer manifestUrl={manifestUrl} />;
}
