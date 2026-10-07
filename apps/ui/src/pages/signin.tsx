import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  CloudUpload,
  Cpu,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  RadioTower,
} from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaGithub, FaGoogle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { env } from '@repo/env/client';

import { Brand } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

const signinSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  twoFactorEnabled: z.boolean().optional(),
});

type SigninFormValues = z.infer<typeof signinSchema>;

const pipelineStages = [
  { icon: CloudUpload, label: 'Multipart upload', tone: 'text-sky-300' },
  { icon: Cpu, label: 'Adaptive transcode', tone: 'text-violet-300' },
  { icon: RadioTower, label: 'HLS delivery', tone: 'text-emerald-300' },
];

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { signin } = useAuth();

  const form = useForm<SigninFormValues>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      email: '',
      password: '',
      twoFactorEnabled: false,
    },
  });

  const onSubmit = (values: SigninFormValues) => {
    signin.mutate(values);
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    window.location.href = `${env.VITE_API_URL}/auth/${provider}`;
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06080d] text-slate-100 lg:grid lg:grid-cols-[1.08fr_0.92fr]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(14,165,233,0.12),transparent_28%),radial-gradient(circle_at_82%_85%,rgba(139,92,246,0.09),transparent_30%)]" />

      <section className="relative hidden min-h-screen overflow-hidden border-r border-white/7 px-12 py-10 lg:flex lg:flex-col lg:justify-between xl:px-20 xl:py-14">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:44px_44px]" />
        <Link to="/" className="relative z-10 w-fit">
          <Brand />
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="relative z-10 max-w-2xl"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/15 bg-sky-400/7 px-3 py-1.5 text-[10px] font-bold tracking-[0.18em] text-sky-300 uppercase">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            Streaming workspace online
          </span>
          <h1 className="mt-7 max-w-xl text-5xl font-semibold leading-[1.08] tracking-[-0.045em] text-white xl:text-6xl">
            From source file to{' '}
            <span className="bg-gradient-to-r from-sky-300 via-cyan-200 to-violet-300 bg-clip-text text-transparent">
              adaptive stream.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
            Upload large videos safely, watch every pipeline stage, and deliver
            responsive HLS playback from one focused control room.
          </p>

          <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
            {pipelineStages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <div
                  key={stage.label}
                  className="rounded-2xl border border-white/7 bg-white/[0.035] p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between">
                    <Icon className={stage.tone} size={18} />
                    <span className="font-mono text-[9px] text-slate-700">
                      0{index + 1}
                    </span>
                  </div>
                  <p className="mt-7 text-xs font-medium text-slate-300">
                    {stage.label}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-600">
          <Check size={13} className="text-emerald-400" />
          Resumable uploads · Queue-backed processing · Adaptive playback
        </div>
      </section>

      <section className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <Link to="/" className="mb-12 inline-flex lg:hidden">
            <Brand />
          </Link>

          <div className="mb-9">
            <p className="text-[10px] font-bold tracking-[0.22em] text-sky-400 uppercase">
              Operator access
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Welcome back
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in to manage uploads, transcode jobs, and HLS playback.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="ml-1 text-[10px] font-bold tracking-[0.16em] text-slate-500 uppercase">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-600" size={16} />
                <Input
                  id="email"
                  autoComplete="email"
                  {...form.register('email')}
                  placeholder="you@example.com"
                  className={`h-13 rounded-xl border-white/8 bg-white/[0.035] pl-11 text-sm text-white shadow-none transition placeholder:text-slate-700 focus-visible:border-sky-400/45 focus-visible:ring-3 focus-visible:ring-sky-400/8 ${form.formState.errors.email ? 'border-rose-400/40' : ''}`}
                />
              </div>
              {form.formState.errors.email && (
                <p className="ml-1 text-[11px] text-rose-400">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <Label htmlFor="password" className="text-[10px] font-bold tracking-[0.16em] text-slate-500 uppercase">
                  Password
                </Label>
                <Link to="/forgot-password" className="text-[11px] font-medium text-sky-400/75 transition hover:text-sky-300">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <LockKeyhole className="absolute top-1/2 left-4 -translate-y-1/2 text-slate-600" size={16} />
                <Input
                  id="password"
                  autoComplete="current-password"
                  {...form.register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={`h-13 rounded-xl border-white/8 bg-white/[0.035] pr-11 pl-11 text-sm text-white shadow-none transition placeholder:text-slate-700 focus-visible:border-sky-400/45 focus-visible:ring-3 focus-visible:ring-sky-400/8 ${form.formState.errors.password ? 'border-rose-400/40' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-600 transition hover:text-slate-300"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="ml-1 text-[11px] text-rose-400">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={signin.isPending}
              className="group h-13 w-full rounded-xl bg-sky-500 text-sm font-semibold text-slate-950 shadow-[0_12px_40px_rgba(14,165,233,0.18)] transition hover:bg-sky-400"
            >
              {signin.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>Sign in to workspace <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" /></>
              )}
            </Button>
          </form>

          <div className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-white/7" />
            <span className="text-[10px] font-medium tracking-[0.12em] text-slate-700 uppercase">or continue with</span>
            <span className="h-px flex-1 bg-white/7" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => handleOAuth('google')} className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.025] text-xs font-medium text-slate-400 transition hover:border-white/15 hover:bg-white/[0.055] hover:text-white">
              <FaGoogle size={14} /> Google
            </button>
            <button type="button" onClick={() => handleOAuth('github')} className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.025] text-xs font-medium text-slate-400 transition hover:border-white/15 hover:bg-white/[0.055] hover:text-white">
              <FaGithub size={15} /> GitHub
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-slate-600">
            New to StreamForge?{' '}
            <Link to="/signup" className="font-semibold text-slate-300 transition hover:text-sky-300">
              Create an account
            </Link>
          </p>
        </motion.div>
      </section>
    </main>
  );
}
