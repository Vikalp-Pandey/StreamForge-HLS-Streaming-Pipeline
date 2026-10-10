import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { Brand } from '@/components/brand';

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const navigate = useNavigate();

  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (data: ResetFormValues) => {
    if (!token || !email) {
      return;
    }

    resetPassword.mutate({
      token: token,
      email,
      password: data.password,
    });
  };

  return (
    <div className="grid min-h-screen bg-[#050505] font-sans text-slate-200 selection:bg-sky-500/30 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.03] bg-[#080808] p-24 lg:flex">
        <div className="absolute top-[-20%] left-[-10%] h-[70%] w-[70%] rounded-full bg-sky-900/10 blur-[120px]" />

        <div className="relative z-10">
          <div className="inline-flex">
            <Brand />
          </div>
        </div>

        <div className="relative z-10 space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-5xl leading-[1.2] font-light tracking-tight text-white">
              Update your <br />
              <span className="font-medium text-slate-500">access keys.</span>
            </h1>
          </motion.div>

          <div className="h-px w-12 bg-sky-500" />

          <p className="max-w-xs text-sm leading-relaxed font-light tracking-wide text-slate-500">
            You are establishing a new high-entropy password. Ensure your new
            credentials are kept secure.
          </p>
        </div>

        <div className="relative z-10 text-[10px] font-bold tracking-[0.4em] text-slate-600 uppercase">
          Handshake Verified // Token Active
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-10"
        >
          {/* Back Button */}

          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase transition-colors hover:text-sky-500"
          >
            <ArrowLeft size={14} /> Abort Update
          </button>

          <div className="space-y-10">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Reset Password
              </h2>

              <p className="text-sm text-slate-500">
                Please enter and confirm your new password.
              </p>
            </div>

            {/* FORM */}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* PASSWORD */}

              <div className="space-y-2">
                <Label className="ml-1 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                  New Password
                </Label>

                <div className="relative">
                  <Lock className="absolute top-3.5 left-4 h-4 w-4 text-slate-700" />

                  <Input
                    {...register('password')}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="h-12 rounded-lg border-white/[0.05] bg-white/[0.02] pl-11 font-mono text-white transition-all placeholder:text-slate-800 focus:border-sky-500/50 focus:ring-0"
                  />
                </div>

                {errors.password && (
                  <p className="mt-1 ml-1 text-[10px] font-bold text-rose-500 uppercase">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* CONFIRM PASSWORD */}

              <div className="space-y-2">
                <Label className="ml-1 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                  Confirm Password
                </Label>

                <div className="relative">
                  <ShieldCheck className="absolute top-3.5 left-4 h-4 w-4 text-slate-700" />

                  <Input
                    {...register('confirmPassword')}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="h-12 rounded-lg border-white/[0.05] bg-white/[0.02] pl-11 font-mono text-white transition-all placeholder:text-slate-800 focus:border-sky-500/50 focus:ring-0"
                  />
                </div>

                {errors.confirmPassword && (
                  <p className="mt-1 ml-1 text-[10px] font-bold text-rose-500 uppercase">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* SHOW PASSWORD */}

              <div className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  id="show"
                  className="rounded border-white/10 bg-white/5 text-sky-500 focus:ring-0"
                  onChange={() => setShowPass(!showPass)}
                />

                <label
                  htmlFor="show"
                  className="cursor-pointer text-[10px] font-bold tracking-widest text-slate-500 uppercase"
                >
                  Show Passwords
                </label>
              </div>

              {/* SUBMIT BUTTON */}

              <Button
                disabled={resetPassword.isPending}
                className="h-12 w-full rounded-lg bg-sky-600 text-xs font-bold tracking-[0.2em] text-white uppercase shadow-xl shadow-white/5 transition-all hover:bg-sky-500"
              >
                {resetPassword.isPending ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
