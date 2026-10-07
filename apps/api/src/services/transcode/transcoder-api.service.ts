import { sendTranscoderRequest } from '@repo/clients/transcoder';

export async function getTranscodeJobFromTranscoder(jobId: string) {
  const response = await sendTranscoderRequest(`/internal/jobs/${jobId}`);
  return response.data;
}

export async function processTranscodeJobOnTranscoder(jobId: string) {
  const response = await sendTranscoderRequest(
    `/internal/jobs/${jobId}/process`,
    { method: 'POST' },
  );
  return response.data;
}
