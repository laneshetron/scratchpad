import { EnhancedGenerateContentResponse } from '@google/generative-ai';
import { SSE } from 'sse.js';
import { v4 as uuidv4 } from 'uuid';

// Generate a random UUID at application launch
const userId = uuidv4();

const API_DOMAIN = 'scratchpad-api-dev-32738705.us-west-2.elb.amazonaws.com';

export const generateResponseStream = async (
  endpoint: string,
  prompt: string,
  systemPrompt?: string
) => {
  return (async function* () {
    try {
      const payload = JSON.stringify({
        userId,
        prompt,
        ...(systemPrompt && { systemPrompt }),
      });

      const eventSource = new SSE(`http://${API_DOMAIN}/completion/${endpoint}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        payload,
      });

      eventSource.stream();

      while (true) {
        const chunk = await new Promise((resolve, reject) => {
          eventSource.onmessage = (event) => {
            resolve({
              text: () => event.data,
              response: () => ({ text: () => event.data }),
              functionCall: () => undefined,
              functionCalls: () => [],
            } as EnhancedGenerateContentResponse);
          };

          eventSource.onerror = (error) => {
            console.error('Error:', error);
            eventSource.close();
            reject(error);
          };

          eventSource.addEventListener('done', () => {
            eventSource.close();
            resolve(null);
          });
        });

        if (chunk === null) break;
        yield chunk;
      }
    } catch (error) {
      console.error('Error in SSE stream:', error);
      yield {
        text: () => '',
        response: () => ({ text: () => '' }),
        functionCall: () => undefined,
        functionCalls: () => [],
      } as EnhancedGenerateContentResponse;
    }
  })() as AsyncGenerator<EnhancedGenerateContentResponse, any, unknown>;
};

export const generateResponse = async (endpoint: string, prompt: string, systemPrompt?: string) => {
  try {
    const payload = JSON.stringify({
      userId,
      prompt,
      ...(systemPrompt && { systemPrompt }),
    });

    const response = await fetch(`http://${API_DOMAIN}/completion/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    return data.completion;
  } catch (error) {
    console.error('Error in autocomplete request:', error);
    throw error;
  }
};
