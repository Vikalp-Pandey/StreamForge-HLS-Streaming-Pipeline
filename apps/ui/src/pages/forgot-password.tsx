import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, ArrowLeft, LifeBuoy, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brand } from '@/components/brand';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>();

  const onSubmit = (data: { email: string }) => forgotPassword.mutate(data);

  return (
    <div className="grid min-h-screen bg-[#050505] font-sans text-slate-200 selection:bg-sky-500/30 lg:grid-cols-2">
      {/* LEFT SIDE: Minimalist Brand Identity */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/3 bg-[#080808] p-24 lg:flex">
        {/* Subtle Architectural Glow (Focused for Recovery) */}
        <div className="absolute top-[-10%] left-[-10%] h-[70%] w-[70%] rounded-full bg-slate-500/5 blur-[120px]" />

        <div className="relative z-10">
          <Link to="/" className="inline-flex">
            <Brand />
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl leading-[1.2] font-light tracking-tight text-white">
              Vault <br />
              <span className="font-medium text-slate-500">
                re-authentication.
              </span>
            </h1>
          </motion.div>
          <div className="h-px w-12 bg-sky-500" />
          <p className="max-w-xs text-sm leading-relaxed font-light tracking-wide text-slate-500">
            Initiate the recovery flow to regain secure access to your account.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-[10px] font-bold tracking-[0.2em] text-slate-600 uppercase">
          <LifeBuoy size={14} className="text-sky-500/50" />
          <span>Technical Support Active</span>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-10"
        >
          {/* Back Navigation */}
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase transition-colors hover:text-sky-500"
          >
            <ArrowLeft
              size={14}
              className="transition-transform group-hover:-translate-x-1"
            />
            Back to entry
          </Link>

          <div className="space-y-10">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Recovery Protocol
              </h2>
              <p className="text-sm text-slate-500">
                A secure reset link will be dispatched to your ID.
              </p>
            </div>

            {forgotPassword.isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg border border-sky-500/10 bg-sky-500/5 p-6 text-center text-xs leading-relaxed font-medium tracking-wide text-sky-400"
              >
                Protocol engaged. Please inspect your inbox for the
                authorization link.
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-2">
                  <Label className="ml-1 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                    Identity (Work Email)
                  </Label>
                  <div className="relative">
                    <Mail className="absolute top-3.5 left-4 h-4 w-4 text-slate-700" />
                    <Input
                      {...register('email', { required: 'Email is required' })}
                      placeholder="name@company.com"
                      className="h-12 rounded-lg border-white/5 bg-white/2 pl-11 font-light text-white transition-all placeholder:text-slate-800 focus:border-sky-500/50 focus:ring-0"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 ml-1 text-[10px] font-medium tracking-wide text-rose-500 uppercase">
                      {errors.email.message as string}
                    </p>
                  )}
                </div>

                <Button
                  disabled={forgotPassword.isPending}
                  className="h-12 w-full rounded-lg bg-sky-600 text-xs font-bold tracking-[0.2em] text-white uppercase shadow-xl shadow-white/5 transition-all hover:bg-sky-500 active:scale-[0.99]"
                >
                  {forgotPassword.isPending ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    'Request Reset'
                  )}
                </Button>
              </form>
            )}

            <div className="border-t border-white/3 pt-8">
              <div className="flex items-center gap-4 rounded-xl border border-white/3 bg-white/1 p-5">
                <ShieldAlert size={20} className="shrink-0 text-slate-600" />
                <p className="text-[10px] leading-normal tracking-wide text-slate-500">
                  Account recovery requires valid 2FA identification. If you
                  have lost access to your secondary device, please contact
                  system administrators.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
