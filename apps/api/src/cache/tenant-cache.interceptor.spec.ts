import type { ExecutionContext } from '@nestjs/common';
import { TenantCacheInterceptor } from './tenant-cache.interceptor';

describe('TenantCacheInterceptor', () => {
  function contextFor(url: string): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ url }),
      }),
    } as unknown as ExecutionContext;
  }

  it('não armazena em cache respostas dinâmicas de crianças', () => {
    const interceptor = Object.create(TenantCacheInterceptor.prototype) as TenantCacheInterceptor;

    expect(interceptor.trackBy(contextFor('/lookup/classrooms/class-1/children'))).toBeUndefined();
    expect(interceptor.trackBy(contextFor('/lookup/children/accessible?classroomId=class-1'))).toBeUndefined();
  });
});
