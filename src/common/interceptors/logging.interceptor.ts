import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.originalUrl || req.url;
    const now = Date.now();

    this.logger.info(`Incoming Request: [${method}] ${url}`, LoggingInterceptor.name);

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const statusCode = res.statusCode;
          const responseTime = Date.now() - now;

          this.logger.info(
            `Outgoing Response: [${method}] ${url} ${statusCode} - ${responseTime}ms`,
            LoggingInterceptor.name,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;

          this.logger.error(
            `Request Failed: [${method}] ${url} - ${responseTime}ms`,
            error?.stack,
            LoggingInterceptor.name,
          );
        },
      }),
    );
  }
}
