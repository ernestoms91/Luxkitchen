export class SuccessResponseDto<T = any> {
  ok: boolean;
  message: string;
  data?: T;

  constructor(ok: boolean, message: string, data?: T) {
    this.ok = ok;
    this.message = message;
    this.data = data;
  }
}
