import { buildApiUrl } from '../config/environment';

// Small helper to timeout fetches to avoid infinite pending state
export const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit & { timeoutMs?: number } = {}) => {
  const { timeoutMs = 60000, ...rest } = init as any;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(input, { ...rest, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
};

// Upload via XHR to get upload progress events
export const xhrUpload = (options: {
  url: string;
  method?: 'POST' | 'PUT';
  formData?: FormData;
  file?: File;
  headers?: Record<string, string>;
  timeoutMs?: number;
  onProgress?: (loaded: number, total: number) => void;
  maxRetries?: number;
}): Promise<{ status: number; responseText: string }> => {
  const { url, method = 'POST', formData, file, headers = {}, timeoutMs = 10 * 60 * 1000, onProgress, maxRetries = 2 } = options;
  
  const attemptUpload = async (attempt: number): Promise<{ status: number; responseText: string }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.timeout = timeoutMs;
      
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          onProgress(evt.loaded, evt.total);
        }
      };
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ status: xhr.status, responseText: xhr.responseText });
          } else if (xhr.status === 403 && attempt < maxRetries) {
            // 403 Forbidden often indicates expired presigned URL
            console.warn(`Upload attempt ${attempt} failed with 403 (possibly expired URL), will retry...`);
            reject(new Error('PRESIGNED_URL_EXPIRED'));
          } else {
            reject(new Error(xhr.responseText || `Upload failed with status ${xhr.status}`));
          }
        }
      };
      
      xhr.ontimeout = () => {
        if (attempt < maxRetries) {
          console.warn(`Upload attempt ${attempt} timed out, will retry...`);
          reject(new Error('UPLOAD_TIMEOUT'));
        } else {
          reject(new Error('Upload timed out'));
        }
      };
      
      xhr.onerror = () => {
        if (attempt < maxRetries) {
          console.warn(`Upload attempt ${attempt} failed with network error, will retry...`);
          reject(new Error('NETWORK_ERROR'));
        } else {
          reject(new Error('Network error during upload'));
        }
      };
      
      // Send FormData for POST requests, raw file for PUT requests (S3)
      if (method === 'PUT' && file) {
        xhr.send(file);
      } else if (formData) {
        xhr.send(formData);
      } else {
        reject(new Error('No data to send: provide either formData or file'));
      }
    });
  };
  
  // Implement retry logic with exponential backoff
  const retryWithBackoff = async (attempt: number): Promise<{ status: number; responseText: string }> => {
    try {
      return await attemptUpload(attempt);
    } catch (error: any) {
      if (attempt >= maxRetries) {
        throw error;
      }
      
      // Check if this is a retryable error
      const retryableErrors = ['PRESIGNED_URL_EXPIRED', 'UPLOAD_TIMEOUT', 'NETWORK_ERROR'];
      if (!retryableErrors.includes(error.message)) {
        throw error;
      }
      
      // Exponential backoff: wait 1s, 2s, 4s, etc.
      const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`Retrying upload in ${backoffDelay}ms (attempt ${attempt + 1}/${maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return retryWithBackoff(attempt + 1);
    }
  };
  
  return retryWithBackoff(1);
};

// Function to get a fresh presigned URL for video upload
export const refreshPresignedUrl = async (courseId: string, fileName: string, fileSize: number, mimeType: string, version: number = 1, adminToken: string): Promise<{ uploadUrl: string; s3Key: string }> => {
  const response = await fetchWithTimeout(buildApiUrl('/api/videos/presigned-url'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      courseId,
      fileName,
      fileSize,
      mimeType,
      version
    }),
    timeoutMs: 30000 // 30 seconds for URL refresh
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Failed to refresh upload URL');
  }

  const data = await response.json();
  const { uploadUrl, s3Key } = data.data || data;

  if (!uploadUrl) {
    throw new Error('Upload URL is missing from server response');
  }

  return { uploadUrl, s3Key };
};
