import { ArrowRight, CloudUpload, Cpu, RadioTower } from 'lucide-react';

const stages = [
  {
    icon: CloudUpload,
    number: '01',
    title: 'Multipart upload',
    detail: 'Browser parts are signed, uploaded to S3, and safely resumable.',
    color: 'text-sky-400',
    background: 'bg-sky-500/10',
  },
  {
    icon: Cpu,
    number: '02',
    title: 'Transcoding',
    detail: 'SQS hands the source to FFmpeg, which creates the HLS media.',
    color: 'text-violet-400',
    background: 'bg-violet-500/10',
  },
  {
    icon: RadioTower,
    number: '03',
    title: 'Secure playback',
    detail: 'A signed playlist and its segments are delivered to hls.js.',
    color: 'text-emerald-400',
    background: 'bg-emerald-500/10',
  },
];

export function PipelineOverview() {
  return (
    <section className="rounded-2xl border border-white/7 bg-[#0d1117] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.14)] lg:p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-sky-400">
            Processing path
          </p>
          <h2 className="mt-1.5 text-lg font-semibold text-white">
            How a video becomes a stream
          </h2>
        </div>
        <span className="hidden text-xs text-slate-600 sm:block">
          One bucket · three stages
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <div className="contents" key={stage.title}>
              <article className="h-full rounded-xl border border-white/6 bg-[#090c11] p-4">
                <div className="flex items-center justify-between">
                  <span
                    className={`grid size-9 place-items-center rounded-lg ${stage.background} ${stage.color}`}
                  >
                    <Icon size={17} />
                  </span>
                  <span className="font-mono text-[10px] text-slate-700">
                    {stage.number}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-200">
                  {stage.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {stage.detail}
                </p>
              </article>
              {index < stages.length - 1 && (
                <ArrowRight
                  size={15}
                  className="mx-auto hidden text-slate-700 md:block"
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
