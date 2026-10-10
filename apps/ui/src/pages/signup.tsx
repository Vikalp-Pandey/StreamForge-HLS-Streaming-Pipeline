import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod'; // Ensure z is imported
import { env } from '@repo/env/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Loader2, User, Mail, Lock } from 'lucide-react';
import { Brand } from '@/components/brand';
import { FaGithub, FaGoogle } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { signup } = useAuth();

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onSubmit', // Validates when a user leaves an input
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = (values: SignupFormValues) => {
    signup.mutate(values, {
      onSuccess: () => {},
    });
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    window.location.href = `${env.VITE_API_URL}/auth/${provider}`;
  };

  return (
    <div className="grid min-h-screen bg-[#050505] font-sans text-slate-200 selection:bg-sky-500/30 lg:grid-cols-2">
      {/* LEFT SIDE: Minimalist Brand Identity */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/3 bg-[#080808] p-24 lg:flex">
        <div className="absolute right-[-10%] bottom-[-20%] h-[70%] w-[70%] rounded-full bg-sky-900/10 blur-[120px]" />

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
              Protect your identity <br />
              <span className="font-medium text-slate-500">
                with secure custody.
              </span>
            </h1>
          </motion.div>
          <div className="h-px w-12 bg-sky-500" />
          <p className="max-w-xs text-sm leading-relaxed font-light tracking-wide text-slate-500">
            Create a verified account protected by password hashing and email
            verification.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-[10px] font-bold tracking-[0.2em] text-slate-600 uppercase">
          <span>Enterprise Ready</span>
          <span className="h-1 w-1 rounded-full bg-slate-800" />
          <span>v3.0 Secure</span>
        </div>
      </div>

      {/* RIGHT SIDE: Interactive Form */}
      <div className="flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="space-y-10">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Create Console Account
              </h2>
              <p className="text-sm text-slate-500">
                Initialize your identity to begin deployment.
              </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <Label className="ml-1 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute top-3.5 left-4 h-4 w-4 text-slate-700" />
                  <Input
                    {...form.register('name')}
                    placeholder="Enter full name"
                    className={`h-12 rounded-lg border-white/5 bg-white/2 pl-11 text-white transition-all placeholder:text-slate-700 focus:border-sky-500/50 focus:ring-0 ${form.formState.errors.name ? 'border-rose-500/40' : ''}`}
                  />
                </div>
                {form.formState.errors.name && (
                  <p className="mt-1 ml-1 text-[10px] font-medium tracking-wide text-rose-500 uppercase">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label className="ml-1 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                  Work Email
                </Label>
                <div className="relative">
                  <Mail className="absolute top-3.5 left-4 h-4 w-4 text-slate-700" />
                  <Input
                    {...form.register('email')}
                    placeholder="name@company.com"
                    className={`h-12 rounded-lg border-white/5 bg-white/2 pl-11 text-white transition-all placeholder:text-slate-700 focus:border-sky-500/50 focus:ring-0 ${form.formState.errors.email ? 'border-rose-500/40' : ''}`}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="mt-1 ml-1 text-[10px] font-medium tracking-wide text-rose-500 uppercase">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label className="ml-1 text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                  Access Key
                </Label>
                <div className="relative">
                  <Lock className="absolute top-3.5 left-4 h-4 w-4 text-slate-700" />
                  <Input
                    {...form.register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`h-12 rounded-lg border-white/5 bg-white/2 pl-11 text-white transition-all placeholder:text-slate-700 focus:border-sky-500/50 focus:ring-0 ${form.formState.errors.password ? 'border-rose-500/40' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-3.5 right-4 text-slate-600 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="mt-1 ml-1 text-[10px] font-medium tracking-wide text-rose-500 uppercase">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              <p className="text-center text-[13px] text-slate-600">
                Already registered?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-slate-300 transition-colors hover:text-sky-500"
                >
                  Log in to Console
                </Link>
              </p>

              <Button
                disabled={signup.isPending}
                className="h-12 w-full rounded-lg bg-sky-600 text-sm font-bold text-white shadow-lg shadow-sky-900/20 transition-all hover:bg-sky-500 active:scale-[0.99]"
              >
                {signup.isPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  'Request Access'
                )}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/5"></span>
              </div>
              <div className="relative flex justify-center text-[10px] tracking-widest uppercase">
                <span className="bg-[#050505] px-4 text-slate-600">
                  Quick Authenticate
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleOAuth('google')}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/1 text-xs font-medium text-slate-400 transition-all hover:bg-white/4 hover:text-white"
              >
                <FaGoogle size={14} /> Google
              </button>
              <button
                onClick={() => handleOAuth('github')}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-white/5 bg-white/1 text-xs font-medium text-slate-400 transition-all hover:bg-white/4 hover:text-white"
              >
                <FaGithub size={14} /> GitHub
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
