// Upload utility with progress tracking

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
}): Promise<{ status: number; responseText: string }> => {
  const { url, method = 'POST', formData, file, headers = {}, timeoutMs = 10 * 60 * 1000, onProgress } = options;
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
        } else {
          reject(new Error(xhr.responseText || `Upload failed with status ${xhr.status}`));
        }
      }
    };
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.onerror = () => reject(new Error('Network error during upload'));
    
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
