import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Type definitions
interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
  body?: string | FormData;
  fetchOptions?: RequestInit;
  showErrorAlert?: boolean; // Whether to show error alert dialog
}

interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  config: RequestConfig;
}

interface HttpClientConfig {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  showErrorAlert?: boolean; // Global setting for showing error alert dialogs
}

type RequestInterceptor = (config: RequestConfig) => Promise<RequestConfig> | RequestConfig;
type ResponseInterceptor = {
  onSuccess?: (response: HttpResponse) => Promise<HttpResponse> | HttpResponse;
  onError?: (error: Error) => Promise<any> | any;
};

// Error alert management class
class ErrorAlertManager {
  private static instance: ErrorAlertManager;
  private shownErrors = new Set<string>(); // Store shown errors
  private errorTimeouts = new Map<string, ReturnType<typeof setTimeout>>(); // Error cleanup timers
  
  static getInstance(): ErrorAlertManager {
    if (!ErrorAlertManager.instance) {
      ErrorAlertManager.instance = new ErrorAlertManager();
    }
    return ErrorAlertManager.instance;
  }

  /**
   * Show error alert (with deduplication)
   */
  showError(errorKey: string, title: string, message: string): void {
    // If this error has already been shown, don't show it again
    if (this.shownErrors.has(errorKey)) {
      return;
    }

    // Mark this error as shown
    this.shownErrors.add(errorKey);
    
    // Show alert
    Alert.alert(title, message);

    // Clear previous timeout
    const existingTimeout = this.errorTimeouts.get(errorKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set timer to clear this error mark after 3 seconds, allowing it to be shown again
    const timeout = setTimeout(() => {
      this.shownErrors.delete(errorKey);
      this.errorTimeouts.delete(errorKey);
    }, 3000);
    
    this.errorTimeouts.set(errorKey, timeout);
  }

  /**
   * Immediately clear specific error mark
   */
  clearError(errorKey: string): void {
    this.shownErrors.delete(errorKey);
    const timeout = this.errorTimeouts.get(errorKey);
    if (timeout) {
      clearTimeout(timeout);
      this.errorTimeouts.delete(errorKey);
    }
  }

  /**
   * Clear all error marks
   */
  clearAllErrors(): void {
    this.shownErrors.clear();
    this.errorTimeouts.forEach(timeout => clearTimeout(timeout));
    this.errorTimeouts.clear();
  }
}

// Configuration constants
const DEFAULT_TIMEOUT = 10000; // 10 seconds timeout
const TOKEN_KEY = '@auth_token';

/**
 * HTTP Client class
 */
class HttpClient {
  private baseURL: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];
  private errorAlertManager: ErrorAlertManager;
  private showErrorAlert: boolean;

  constructor(config: HttpClientConfig = {}) {
    this.baseURL = config.baseURL || '';
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
    this.showErrorAlert = config.showErrorAlert !== false; // Show error alerts by default
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers
    };
    
    this.errorAlertManager = ErrorAlertManager.getInstance();
    
    // Add default interceptors
    this.setupDefaultInterceptors();
  }

  /**
   * Setup default interceptors
   */
  private setupDefaultInterceptors(): void {
    // Request interceptor: add token
    this.addRequestInterceptor(async (config: RequestConfig) => {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (token) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${token}`
          };
        }
      } catch (error) {
        console.warn('Failed to get token:', error);
      }
      return config;
    });

    // Response interceptor: handle common errors
    this.addResponseInterceptor({
      onSuccess: (response: HttpResponse) => response,
      onError: (error: Error) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    });
  }

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Execute request interceptors
   */
  private async executeRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let modifiedConfig = config;
    for (const interceptor of this.requestInterceptors) {
      modifiedConfig = await interceptor(modifiedConfig);
    }
    return modifiedConfig;
  }

  /**
   * Execute response interceptors
   */
  private async executeResponseInterceptors(
    response?: HttpResponse, 
    error?: Error
  ): Promise<HttpResponse> {
    let result: { response?: HttpResponse; error?: Error } = error ? { error } : { response };
    
    for (const interceptor of this.responseInterceptors) {
      try {
        if (result.error && interceptor.onError) {
          result = { response: await interceptor.onError(result.error) };
        } else if (result.response && interceptor.onSuccess) {
          result = { response: await interceptor.onSuccess(result.response) };
        }
      } catch (interceptorError) {
        result = { error: interceptorError as Error };
      }
    }
    
    if (result.error) {
      return Promise.reject(result.error);
    }
    
    return result.response!;
  }

  /**
   * Create complete URL
   */
  private createURL(url: string): string {
    if (url.startsWith('http')) {
      return url;
    }
    return `${this.baseURL}${url}`;
  }

  /**
   * Create request configuration
   */
  private createRequestConfig(url: string, options: Partial<RequestConfig> = {}): RequestConfig {
    const config: RequestConfig = {
      url: this.createURL(url),
      method: options.method || 'GET',
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      },
      timeout: options.timeout || this.timeout,
      showErrorAlert: options.showErrorAlert !== false && this.showErrorAlert,
      ...options
    };

    // Handle request body
    if (config.data) {
      if (config.data instanceof FormData) {
        config.body = config.data;
        // FormData doesn't need Content-Type, browser will set it automatically
        const headers = { ...config.headers };
        if (headers && 'Content-Type' in headers) {
          delete headers['Content-Type'];
        }
        config.headers = headers;
      } else if (typeof config.data === 'object') {
        config.body = JSON.stringify(config.data);
      } else {
        config.body = config.data;
      }
    }

    return config;
  }

  /**
   * Execute request
   */
  async request<T = any>(url: string, options: Partial<RequestConfig> = {}): Promise<HttpResponse<T>> {
    try {
      // Create request configuration
      let config = this.createRequestConfig(url, options);
      
      // Execute request interceptors
      config = await this.executeRequestInterceptors(config);

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), config.timeout);
      });

      // Execute request
      const fetchPromise = fetch(config.url, {
        method: config.method,
        headers: config.headers,
        body: config.body,
        ...config.fetchOptions
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Check response status
      if (!response.ok) {
        const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        const error = new Error(errorMessage) as Error & { status: number; response: Response };
        error.status = response.status;
        error.response = response;
        throw error;
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      let data: T;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }

      const result: HttpResponse<T> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        config
      };

      // Execute response interceptors
      return await this.executeResponseInterceptors(result);

    } catch (error) {
      // Execute error interceptors
      return await this.executeResponseInterceptors(undefined, error as Error);
    }
  }

  /**
   * GET request
   */
  get<T = any>(url: string, config: Partial<RequestConfig> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  /**
   * POST request
   */
  post<T = any>(url: string, data?: any, config: Partial<RequestConfig> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...config, method: 'POST', data });
  }

  /**
   * PUT request
   */
  put<T = any>(url: string, data?: any, config: Partial<RequestConfig> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PUT', data });
  }

  /**
   * DELETE request
   */
  delete<T = any>(url: string, config: Partial<RequestConfig> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  patch<T = any>(url: string, data?: any, config: Partial<RequestConfig> = {}): Promise<HttpResponse<T>> {
    return this.request<T>(url, { ...config, method: 'PATCH', data });
  }

  /**
   * Upload file
   */
  upload<T = any>(
    url: string, 
    file: Blob | File, 
    config: Partial<RequestConfig> & { data?: Record<string, any> } = {}
  ): Promise<HttpResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add other fields
    if (config.data) {
      Object.keys(config.data).forEach(key => {
        formData.append(key, config.data![key]);
      });
    }

    return this.request<T>(url, {
      ...config,
      method: 'POST',
      data: formData
    });
  }

  /**
   * Error handling
   */
  private handleError(error: Error & { status?: number }): void {
    console.error('Request error:', error);
    
    // Generate unique error identifier
    let errorKey: string;
    let title = 'Alert';
    let message: string;

    // Generate different keys and messages based on error type
    if (error.message === 'Request timeout') {
      errorKey = 'timeout';
      message = 'Network request timeout, please check your network connection';
    } else if (error.status === 401) {
      errorKey = 'unauthorized';
      message = 'Login has expired, please log in again';
      // Handle login expiration logic
      this.handleTokenExpired();
    } else if (error.status === 403) {
      errorKey = 'forbidden';
      message = 'No permission to access this resource';
    } else if (error.status === 404) {
      errorKey = 'not_found';
      message = 'The requested resource does not exist';
    } else if (error.status === 500) {
      errorKey = 'server_error';
      message = 'Internal server error';
    } else if (error.status && error.status >= 500) {
      errorKey = 'server_error';
      message = 'Server exception, please try again later';
    } else {
      errorKey = 'network_error';
      message = 'Network request failed, please try again later';
    }

    // Use error manager to show error (automatic deduplication)
    this.errorAlertManager.showError(errorKey, title, message);
  }

  /**
   * Handle token expiration
   */
  private async handleTokenExpired(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      // You can add navigation to login page logic here
      // e.g.: NavigationService.navigate('Login');
    } catch (error) {
      console.error('Failed to clear token:', error);
    }
  }

  /**
   * Set token
   */
  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to save token:', error);
    }
  }

  /**
   * Get token
   */
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }

  /**
   * Clear token
   */
  async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear token:', error);
    }
  }

  /**
   * Clear error alert cache
   */
  clearErrorAlerts(): void {
    this.errorAlertManager.clearAllErrors();
  }

  /**
   * Set whether to show error alerts
   */
  setShowErrorAlert(show: boolean): void {
    this.showErrorAlert = show;
  }
}

// Create default instance
const httpClient = new HttpClient({
  baseURL: 'https://api.example.com', // Replace with your API base URL
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Exports
export default httpClient;
export { ErrorAlertManager, HttpClient };
export type { HttpClientConfig, HttpResponse, RequestConfig };

// Convenience methods
export const request = <T = any>(url: string, options?: Partial<RequestConfig>) => 
  httpClient.request<T>(url, options);
export const get = <T = any>(url: string, config?: Partial<RequestConfig>) => 
  httpClient.get<T>(url, config);
export const post = <T = any>(url: string, data?: any, config?: Partial<RequestConfig>) => 
  httpClient.post<T>(url, data, config);
export const put = <T = any>(url: string, data?: any, config?: Partial<RequestConfig>) => 
  httpClient.put<T>(url, data, config);
export const del = <T = any>(url: string, config?: Partial<RequestConfig>) => 
  httpClient.delete<T>(url, config);
export const patch = <T = any>(url: string, data?: any, config?: Partial<RequestConfig>) => 
  httpClient.patch<T>(url, data, config);
export const upload = <T = any>(url: string, file: Blob | File, config?: Partial<RequestConfig> & { data?: Record<string, any> }) => 
  httpClient.upload<T>(url, file, config);

// Token management
export const setToken = (token: string) => httpClient.setToken(token);
export const getToken = () => httpClient.getToken();
export const clearToken = () => httpClient.clearToken();

// Error management
export const clearErrorAlerts = () => httpClient.clearErrorAlerts();