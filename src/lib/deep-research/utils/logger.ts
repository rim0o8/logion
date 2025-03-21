// Debug logging utility
export function logDebug(context: string, message: string, data?: unknown): void {
  console.log(`[Deep Research][${context}] ${message}`);
  if (data !== undefined) {
    if (typeof data === 'string') {
      console.log(`[Deep Research][${context}] Data: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
    } else {
      console.log(`[Deep Research][${context}] Data:`, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
    }
  }
} 