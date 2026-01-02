
type LogLevel = 'info' | 'warn' | 'error';

export const logger = {
  log: (level: LogLevel, message: string, data?: any) => {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
    
    // In production, this would dispatch to services like Sentry or LogRocket
    if (data) {
        // If data is an object with an error property, prioritize showing the error trace
        if (data.error && data.error instanceof Error) {
            console[level](prefix, data.error);
            if (data.errorInfo) {
                console[level]('Component Stack:', data.errorInfo.componentStack);
            }
        } else {
            console[level](prefix, data);
        }
    } else {
        console[level](prefix);
    }
  },
  info: (message: string, data?: any) => logger.log('info', message, data),
  warn: (message: string, data?: any) => logger.log('warn', message, data),
  error: (message: string, error?: any) => logger.log('error', message, error),
};
