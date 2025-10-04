import { ContentfulStatusCode } from 'hono/utils/http-status';

export class AppError extends Error {
  constructor(
    public statusCode: ContentfulStatusCode,
    message: string,
    public internalError?: Error,
    public logLevel: 'ERROR' | 'CRITICAL' = 'ERROR',
  ) {
    super(message);
  }
}
