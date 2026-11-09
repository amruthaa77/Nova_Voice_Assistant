import {
  HealthResponse,
  TranscriptSummary,
  TranscriptDetail,
  VoicesResponse,
  SignedUrlResponse,
  SaveTranscriptRequest,
  SaveTranscriptResponse,
} from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
          const errorJson = await response.json();
          if (errorJson && errorJson.detail) {
            errorMessage = errorJson.detail;
          }
        } catch {
          // Response body is not JSON
        }
        throw new Error(errorMessage);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown network error occurred');
    }
  }

  /**
   * Health status of the FastAPI backend.
   */
  async getHealth(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  }

  /**
   * List all stored conversation transcripts, sorted newest first.
   */
  async getTranscripts(): Promise<TranscriptSummary[]> {
    return this.request<TranscriptSummary[]>('/api/transcripts');
  }

  /**
   * Retrieve full conversation details for a specific transcript filename.
   */
  async getTranscript(filename: string): Promise<TranscriptDetail> {
    // Sanitize filename before requesting
    const cleanFilename = encodeURIComponent(filename.replace(/\.json$/, ''));
    return this.request<TranscriptDetail>(`/api/transcripts/${cleanFilename}`);
  }

  /**
   * Fetch available voices from ElevenLabs.
   */
  async getVoices(): Promise<VoicesResponse> {
    return this.request<VoicesResponse>('/api/voices');
  }

  /**
   * Generate temporary signed WebSocket URL for browser Conversational AI session.
   */
  async getAgentSignedUrl(): Promise<SignedUrlResponse> {
    return this.request<SignedUrlResponse>('/api/agent/signed-url', {
      method: 'POST',
    });
  }

  /**
   * Save completed conversation transcript to backend archives.
   */
  async saveTranscript(payload: SaveTranscriptRequest): Promise<SaveTranscriptResponse> {
    return this.request<SaveTranscriptResponse>('/api/transcripts', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

export const api = new ApiClient();
