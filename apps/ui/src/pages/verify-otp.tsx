import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, Smartphone, Timer } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brand } from '@/components/brand';

export default function VerifyOTPPage() {
  const { verifyOtp } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Timer Logic State
  const [timeLeft, setTimeLeft] = useState(300); // 300 seconds = 5 minutes
  const email = location.state?.email || 'your email';

  // Countdown Effect
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  //  Helper to format time (e.g., 04:59)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { otp: '' },
  });

  const onSubmit = (data: { otp: string }) => {
    if (email === 'your email') return;
    verifyOtp.mutate({ ...data, email });
  };

  return (
    <div className="grid min-h-screen bg-[#050505] font-sans text-slate-200 selection:bg-sky-500/30 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/3 bg-[#080808] p-24 lg:flex">
        <div className="absolute top-[-20%] left-[-10%] h-[70%] w-[70%] rounded-full bg-sky-900/10 blur-[120px]" />

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
              Finalize your <br />
              <span className="font-medium text-slate-500">
                security handshake.
              </span>
            </h1>
          </motion.div>
          <div className="h-px w-12 bg-sky-500" />
          <p className="max-w-xs text-sm leading-relaxed font-light tracking-wide text-slate-500">
            We've dispatched a unique verification sequence to your terminal.
            Verify your identity to authorize node access.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-[10px] font-bold tracking-[0.2em] text-slate-600 uppercase">
          <span className="flex items-center gap-2">
            <Smartphone size={12} /> Secure 2FA
          </span>
          <span className="h-1 w-1 rounded-full bg-slate-800" />
          <span>Identity Verified</span>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="space-y-10">
            <div className="space-y-2">
              <button
                onClick={() => navigate(-1)}
                className="mb-6 flex items-center gap-2 text-[10px] font-bold tracking-widest text-slate-500 uppercase transition-colors hover:text-sky-500"
              >
                <ArrowLeft size={14} /> Back to Signup
              </button>
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Handshake Required
              </h2>
              <p className="text-sm text-slate-500">
                Enter the 6-digit code sent to <br />
                <span className="font-mono text-xs text-sky-500">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <Label className="ml-1 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                  Verification Code
                </Label>
                <Input
                  {...register('otp', {
                    required: 'OTP is required',
                    minLength: {
                      value: 6,
                      message: 'Handshake requires 6 digits',
                    },
                  })}
                  placeholder="000 000"
                  className="h-16 rounded-lg border-white/5 bg-white/2 text-center font-mono text-3xl tracking-[0.5em] text-white transition-all placeholder:text-slate-800 focus:border-sky-500/50 focus:ring-0"
                />
                {errors.otp && (
                  <p className="ml-1 text-[10px] font-medium tracking-wide text-rose-500 uppercase">
                    {errors.otp.message}
                  </p>
                )}
              </div>

              <Button
                disabled={verifyOtp.isPending}
                className="h-12 w-full rounded-lg bg-sky-600 text-sm font-bold text-white shadow-lg shadow-sky-900/20 transition-all hover:bg-sky-500"
              >
                {verifyOtp.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  'Authorize Node'
                )}
              </Button>
            </form>

            <div className="space-y-4 text-center">
              <p className="flex items-center justify-center gap-2 text-[11px] font-bold tracking-widest text-slate-600 uppercase">
                <Timer size={14} className="text-slate-700" />
                {timeLeft > 0 ? (
                  <>
                    Resend available in{' '}
                    <span className="font-mono text-slate-400">
                      {formatTime(timeLeft)}
                    </span>
                  </>
                ) : (
                  <span className="animate-pulse text-emerald-500">
                    Ready for new handshake
                  </span>
                )}
              </p>

              <button
                disabled={timeLeft > 0}
                onClick={() => setTimeLeft(300)} // Logic to resend code would go here
                className={`text-xs font-bold tracking-tighter uppercase transition-colors ${
                  timeLeft > 0
                    ? 'cursor-not-allowed text-slate-800'
                    : 'text-sky-500 hover:text-sky-400'
                }`}
              >
                Request New Code
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
