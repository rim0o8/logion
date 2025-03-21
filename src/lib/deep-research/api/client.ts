import type { ClientResearchParams, ResearchErrorResponse, ResearchResponse } from '../types';

// Deep research API endpoint
const API_URL = '/api/deep-research';

/**
 * Request deep research from the server (traditional method)
 * @param params Research parameters
 * @returns Research response
 */
export async function requestDeepResearch(params: ClientResearchParams): Promise<ResearchResponse> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json() as ResearchErrorResponse;
      throw new Error(errorData.message || 'Failed to request research');
    }

    const data = await response.json() as ResearchResponse;
    return data;
  } catch (error) {
    console.error('Deep research API error:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unexpected error occurred');
  }
}

/**
 * Execute deep research with real-time updates using Server-Sent Events
 * @param params Research parameters
 * @param onProgress Callback to receive progress updates
 * @returns Promise that resolves to the report
 */
export function executeDeepResearchWithSSE(
  params: ClientResearchParams,
  onProgress: (message: string, progress: number) => void
): Promise<string> {
  // Track last progress value to prevent going backwards
  let lastProgress = 0;
  
  return new Promise((resolve, reject) => {
    try {
      // Start POST request
      fetch(`${API_URL}?sse=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(params),
      }).then(response => {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        if (!response.body) {
          throw new Error('Response body is missing');
        }

        // Get reader for the ReadableStream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Initial progress indication
        onProgress('リサーチを開始しています...', 0);

        // Function to read data from the stream
        function readStream() {
          reader.read().then(({ done, value }) => {
            if (done) {
              console.log('Stream ended');
              return;
            }

            // Add data to buffer and process
            buffer += decoder.decode(value, { stream: true });
            
            // Process events
            const eventDelimiter = '\n\n';
            const events = buffer.split(eventDelimiter);
            
            // Keep the last incomplete event in buffer
            buffer = events.pop() || '';
            
            // Process each event
            for (const eventData of events) {
              if (!eventData.trim()) continue;
              
              const eventLines = eventData.split('\n');
              let eventType = 'message';
              let data = '';
              
              for (const line of eventLines) {
                if (line.startsWith('event:')) {
                  eventType = line.slice(6).trim();
                } else if (line.startsWith('data:')) {
                  data = line.slice(5).trim();
                }
              }
              
              // Handle event based on type
              try {
                const parsedData = JSON.parse(data);
                
                if (eventType === 'progress') {
                  // Ensure progress never decreases
                  const newProgress = Math.max(parsedData.progress, lastProgress);
                  
                  // If progress value is too low compared to the last value and not 0 (which could be a valid reset),
                  // ignore it unless it's the initial progress
                  if (parsedData.progress > 0 && parsedData.progress < lastProgress * 0.5) {
                    console.warn('Ignoring suspicious progress decrease:', parsedData.progress, 'last was:', lastProgress);
                  } else {
                    lastProgress = newProgress;
                    onProgress(parsedData.message, newProgress);
                  }
                } else if (eventType === 'result') {
                  // Ensure we show 100% before resolving
                  if (lastProgress < 100) {
                    onProgress('リサーチが完了しました', 100);
                  }
                  resolve(parsedData.report);
                  reader.cancel();
                  return;
                } else if (eventType === 'error') {
                  reject(new Error(parsedData.message || 'An error occurred during the research process'));
                  reader.cancel();
                  return;
                }
              } catch (error) {
                console.error('Error parsing event data:', error);
              }
            }
            
            // Read next data
            readStream();
          }).catch(error => {
            console.error('Stream reading error:', error);
            // Don't reset progress on error
            reject(error);
          });
        }
        
        // Start reading the stream
        readStream();
      }).catch(error => {
        console.error('Deep research request error:', error);
        reject(error);
      });
    } catch (error) {
      console.error('SSE setup error:', error);
      reject(error);
    }
  });
}

/**
 * Utility for hook to execute deep research
 * @param params Research parameters
 * @param onProgress Callback to receive progress updates
 * @returns Research report
 */
export async function executeDeepResearch(
  params: ClientResearchParams,
  onProgress?: (message: string, progress: number) => void
): Promise<string> {
  try {
    // Use SSE if progress callback is provided
    if (onProgress) {
      return await executeDeepResearchWithSSE(params, onProgress);
    }
    
    // Use traditional method if no progress callback
    const result = await requestDeepResearch(params);
    return result.report;
  } catch (error) {
    console.error('Deep research execution error:', error);
    throw error;
  }
} 