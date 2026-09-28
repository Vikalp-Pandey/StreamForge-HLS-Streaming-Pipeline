import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth.api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<{ detail?: string }>(error)) {
    return error.response?.data?.detail ?? fallback;
  }
  return fallback;
};

export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: authApi.getUserStatus,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
};

// Hook for logging out
export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
      queryClient.clear();
      navigate('/login');
      toast.error('Logged Out Successfully.');
    },
  });
};

export const useAuth = () => {
  const navigate = useNavigate();

  const signin = useMutation({
    mutationFn: authApi.signin,
    onSuccess: (data) => {
      if (data.twoFactorRequired) {
        toast.info('Two-factor authentication required.');
        navigate('/verify-otp');
      } else {
        const successMessage = data?.detail;
        toast.success(successMessage);
        navigate('/upload');
      }
    },
    onError: (error: unknown) => {
      toast.error(
        getErrorMessage(
          error,
          'Authentication failed. Please check your credentials.',
        ),
      );
    },
  });

  const signup = useMutation({
    mutationFn: authApi.signup,
    onSuccess: (data, variables) => {
      const infoMessage = data?.detail;
      toast.info(infoMessage);
      navigate('/verify-otp', { state: { email: variables.email } });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Registration failed.'));
    },
  });

  const verifyOtp = useMutation({
    mutationFn: authApi.verifyOTP,
    onSuccess: (data) => {
      const successMessage = data?.detail;
      toast.success(successMessage);
      navigate('/upload');
    },
  });

  const forgotPassword = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: (data) => {
      const successMessage = data?.detail;
      toast.success(successMessage);
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Unable to request password reset.'));
    },
  });

  const resetPassword = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: (data) => {
      const successMessage = data?.detail;
      toast.success(successMessage);
      navigate('/login');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'Unable to reset password.'));
    },
  });

  const user = useQuery({
    queryKey: ['user'],
    queryFn: authApi.getUserStatus,
    retry: false,
  });

  return {
    signin,
    signup,
    verifyOtp,
    forgotPassword,
    resetPassword,
    user,
  };
};
