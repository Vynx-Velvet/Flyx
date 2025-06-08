import { NextResponse } from 'next/server';

// VM extractor configuration
const VM_EXTRACTOR_URL = process.env.VM_EXTRACTOR_URL || 'http://35.188.123.210:3001';

// Progress streaming endpoint
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] Starting progress stream for extraction`);

  // Create ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Function to send SSE data
      const sendEvent = (data) => {
        const event = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(event));
      };

      // Start the VM extraction with progress monitoring
      startVMExtractionWithProgress(searchParams, sendEvent, controller, requestId);
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

async function startVMExtractionWithProgress(searchParams, sendEvent, controller, requestId) {
  try {
    // Build VM request parameters
    const vmParams = new URLSearchParams();
    for (const [key, value] of searchParams.entries()) {
      vmParams.append(key, value);
    }

    // Create EventSource connection to VM server's streaming endpoint
    const vmStreamUrl = `${VM_EXTRACTOR_URL}/extract-stream?${vmParams}`;
    console.log(`[${requestId}] Starting VM stream from:`, vmStreamUrl);
    
    // Note: Using fetch with streaming response instead of EventSource to handle server-side streaming
    const vmResponse = await fetch(vmStreamUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Flyx-Serverless-Proxy/1.0'
      },
      signal: AbortSignal.timeout(60000) // 60 second timeout
    });

    if (!vmResponse.ok) {
      throw new Error(`VM stream service returned ${vmResponse.status}: ${vmResponse.statusText}`);
    }

    const reader = vmResponse.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              console.log(`[${requestId}] VM Progress:`, eventData.phase, `(${eventData.progress}%)`);
              
              // Log completion data for debugging
              if (eventData.phase === 'complete') {
                console.log(`[${requestId}] Completion data:`, JSON.stringify(eventData, null, 2));
              }
              
              // Forward the progress event to the client
              sendEvent(eventData);
              
              // Break if we receive completion or error
              if (eventData.phase === 'complete' || eventData.phase === 'error' || eventData.phase === 'autoswitch') {
                console.log(`[${requestId}] VM extraction ${eventData.phase} - ending stream`);
                return;
              }
              
            } catch (parseError) {
              console.warn(`[${requestId}] Error parsing VM progress data:`, parseError.message);
              console.warn(`[${requestId}] Raw line:`, line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    console.log(`[${requestId}] VM stream completed`);
    
  } catch (error) {
    console.error(`[${requestId}] VM progress stream error:`, error);
    
    sendEvent({
      phase: 'error',
      progress: 0,
      message: error.message || 'VM extraction failed',
      timestamp: Date.now(),
      error: true
    });
  } finally {
    // Close the stream
    controller.close();
  }
} 