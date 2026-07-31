import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map(event => {
      if (event instanceof HttpResponse && event.body) {
        const body = event.body as any;
        if (body && typeof body === 'object') {
          if ('status' in body) {
            body.success = body.status === 'success';
          }
        }
      }
      return event;
    })
  );
};
