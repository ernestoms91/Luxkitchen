import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (Array.isArray((res as any).message)) {
        message = (res as any).message[0];
      } else if ((res as any).message) {
        message = (res as any).message;
      }

      // ✅ HTTP errors → warn
      this.logger.warn(
        {
          method: request.method,
          url: request.url,
          statusCode: status,
        },
        message,
      );
    } else {
      // ❌ errores reales
      this.logger.error(
        {
          method: request.method,
          url: request.url,
          error: exception,
        },
        'Unhandled exception',
      );
    }

    response.status(status).json({
      ok: false,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
