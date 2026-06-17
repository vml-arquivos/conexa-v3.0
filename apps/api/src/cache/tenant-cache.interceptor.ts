import {
  Injectable,
  ExecutionContext,
} from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Injectable()
export class TenantCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const http = context.switchToHttp();
    const req = http.getRequest();

    if (req?.__cacheKey) return req.__cacheKey;


    // CacheInterceptor base gera key pela URL (path + query)
    const baseKey = super.trackBy(context);
    if (!baseKey) return baseKey;

    const user = req?.user;
    const mantenedoraId = user?.mantenedoraId ?? 'no-mant';
    const unitId = user?.unitId ?? 'no-unit';

    const rolesRaw = Array.isArray(user?.roles) ? user.roles : [];
    const roleKey = rolesRaw
      .map((r: any) => r?.level ?? 'unknown')
      .sort()
      .join(',');

    // CORREÇÃO CRÍTICA — vazamento de dados entre TODOS os usuários do
    // sistema, não só entre professores: a linha original tinha barras
    // invertidas antes de cada `${}` (`\${mantenedoraId}` etc.), o que em
    // JavaScript escapa o `$` e impede a interpolação — o template literal
    // virava a STRING LITERAL "t:${mantenedoraId}:u:${unitId}:...", igual
    // para qualquer usuário, de qualquer escola, qualquer unidade, qualquer
    // role. Ou seja: o cache nunca isolou ninguém: a primeira pessoa a
    // acessar uma rota cacheada (ex: /lookup/classrooms/accessible) gravava
    // a resposta, e todo mundo que acessasse a mesma rota nos 5 minutos
    // seguintes recebia exatamente os dados da primeira pessoa — de
    // qualquer unidade ou mantenedora, não só da mesma escola.
    const userId = user?.sub ?? user?.id ?? 'no-user';

    // Evita vazamento entre tenants/escopos/usuários
    return `t:${mantenedoraId}:u:${unitId}:usr:${userId}:r:${roleKey}:${baseKey}`;
  }
}
