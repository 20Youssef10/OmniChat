import { logger } from "../utils/logger";

type Interceptor = (config: RequestInit) => Promise<RequestInit> | RequestInit;
type ResponseInterceptor = (response: Response) => Promise<Response> | Response;

class HttpClient {
  private requestInterceptors: Interceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor() {
    // Default interceptor for headers
    this.addRequestInterceptor((config) => {
        config.headers = {
            'Content-Type': 'application/json',
            ...config.headers,
        };
        return config;
    });
  }

  addRequestInterceptor(interceptor: Interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  async fetch(url: string, config: RequestInit = {}): Promise<Response> {
    // Run request interceptors
    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config);
    }

    try {
      let response = await fetch(url, config);

      // Run response interceptors
      for (const interceptor of this.responseInterceptors) {
        response = await interceptor(response);
      }

      if (!response.ok) {
         // Standard error handling
         const errorBody = await response.text();
         logger.error(`HTTP Error ${response.status}: ${url}`, { body: errorBody });
         throw new Error(`Request failed with status ${response.status}`);
      }

      return response;
    } catch (error) {
      logger.error('Network Error', error);
      throw error;
    }
  }

  // Convenience methods
  async get(url: string, headers = {}) {
    return this.fetch(url, { method: 'GET', headers });
  }

  async post(url: string, body: any, headers = {}) {
    return this.fetch(url, { method: 'POST', body: JSON.stringify(body), headers });
  }
}

export const httpClient = new HttpClient();