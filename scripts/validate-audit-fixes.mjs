import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const failures = [];
const ok = [];

function assert(name, condition, detail = '') {
  if (condition) ok.push(name);
  else failures.push(detail ? `${name}: ${detail}` : name);
}

const planningService = read('apps/api/src/planning/planning.service.ts');
assert('Planning filtra por Planning.type', /where\.type\s*=\s*query\.type/.test(planningService));
assert('Planning não filtra por template.type', !/where\.template\s*=\s*\{\s*type\s*:\s*query\.type/.test(planningService));

const appModule = read('apps/api/src/app.module.ts');
assert('ScheduleModule importado', /from ['"]@nestjs\/schedule['"]/.test(appModule));
assert('ScheduleModule.forRoot registrado', /ScheduleModule\.forRoot\(\)/.test(appModule));

const coord = read('apps/web/src/pages/DashboardCoordenacaoPedagogicaPage.tsx');
assert('Devolução de planejamento usa função existente', /devolverPlanejamento\(itemParaRejeitar\.id,\s*motivoRejeicao\)/.test(coord));

for (const rel of [
  'apps/web/src/pages/FaltasSecretariaPage.tsx',
  'apps/web/src/pages/MatriculaPage.tsx',
  'apps/web/src/pages/MatriculasListPage.tsx',
  'apps/web/src/pages/MovimentacoesPage.tsx',
]) {
  const text = read(rel);
  assert(`${rel}: ChildAvatar usa child`, /<ChildAvatar[\s\S]{0,300}\bchild=\{\{/.test(text));
}

for (const rel of [
  'apps/web/src/pages/AtestadosDocumentosPage.tsx',
  'apps/web/src/pages/TransporteRetiradaPage.tsx',
]) {
  const text = read(rel);
  assert(`${rel}: PageShell usa title/subtitle`, /<PageShell\s+title=/.test(text) && /\bsubtitle=/.test(text));
  assert(`${rel}: PageShell sem titulo/subtitulo legados`, !/<PageShell[\s\S]{0,250}\b(?:titulo|subtitulo)=/.test(text));
}

const authApi = read('apps/web/src/api/auth.ts');
assert('Contrato de autenticação tipa unit', /unit\?\s*:\s*\{[\s\S]{0,220}\bname\?\s*:\s*string/.test(authApi));

const apiSchema = read('apps/api/prisma/schema.prisma');
const mirrorSchema = read('packages/database/prisma/schema.prisma');
assert('Schemas Prisma espelhados são idênticos', apiSchema === mirrorSchema);
assert('Schema Planning contém QUINZENAL', /enum\s+PlanningType\s*\{[\s\S]*?\bQUINZENAL\b/.test(apiSchema));
assert('Schema Planning contém observacoes_template', /\bobservacoes_template\b/.test(apiSchema));

const rootPkg = JSON.parse(read('package.json'));
for (const script of ['db:generate', 'db:migrate:dev', 'db:migrate:deploy', 'db:studio', 'db:seed']) {
  assert(`${script} aponta para @conexa/api`, String(rootPkg.scripts?.[script] ?? '').includes('@conexa/api'));
}

const dbPkg = JSON.parse(read('packages/database/package.json'));
for (const script of ['generate', 'migrate:dev', 'migrate:deploy', 'studio', 'validate']) {
  assert(`packages/database ${script} usa schema canônico`, String(dbPkg.scripts?.[script] ?? '').includes('../../apps/api/prisma/schema.prisma'));
}

const webDocker = read('apps/web/Dockerfile');
assert('Web usa frozen lockfile', /pnpm install --frozen-lockfile/.test(webDocker));
assert('Web não possui fallback no-frozen', !/pnpm install --no-frozen-lockfile/.test(webDocker));
assert('Web executa build oficial com tsc', /pnpm run build/.test(webDocker));

const apiPkg = JSON.parse(read('apps/api/package.json'));
assert('API declara @nestjs/schedule', Boolean(apiPkg.dependencies?.['@nestjs/schedule']));
assert('API build gera Prisma antes do Nest', /^prisma generate[^&]*&&\s*nest build/.test(apiPkg.scripts?.build ?? ''));

const pnpmLock = read('pnpm-lock.yaml');
assert('pnpm-lock possui specifier de @nestjs/schedule', /apps\/api:[\s\S]*?'@nestjs\/schedule':\s*\n\s*specifier:\s*\^4\.1\.2/.test(pnpmLock));
assert('pnpm-lock possui pacote @nestjs/schedule 4.1.2', /\/@nestjs\/schedule@4\.1\.2/.test(pnpmLock));

const entrypoint = read('apps/api/entrypoint.sh');
assert('Entrypoint exige DIRECT_URL', /DATABASE_URL DIRECT_URL JWT_SECRET/.test(entrypoint));
assert('Entrypoint valida Planning', /Validando schema runtime de Planning/.test(entrypoint));
const executableResolveApplied = entrypoint
  .split('\n')
  .filter((line) => !line.trim().startsWith('#'))
  .some((line) => /prisma\s+migrate\s+resolve\s+--applied/.test(line));
assert('Entrypoint não executa resolve --applied automático', !executableResolveApplied);

const health = read('apps/api/src/health/health.service.ts');
assert('Readiness valida Planning', /FROM "Planning" LIMIT 0/.test(health));
assert('Readiness valida QUINZENAL', /QUINZENAL/.test(health));

const quickConfig = read('CONFIGURACAO_COOLIFY_RAPIDA.md');
const unsafeQuickDb = quickConfig
  .split('\n')
  .filter((line) => /^\s*(DATABASE_URL|DIRECT_URL)=/.test(line))
  .some((line) => !line.includes('[USUARIO]') || !line.includes('[SENHA]'));
assert('Guia rápido não contém credencial PostgreSQL literal', !unsafeQuickDb);

const digest = crypto.createHash('sha256').update(apiSchema).digest('hex').slice(0, 12);
console.log(`Validação Conexa auditoria — schema ${digest}`);
for (const name of ok) console.log(`✅ ${name}`);
if (failures.length) {
  for (const item of failures) console.error(`❌ ${item}`);
  process.exit(1);
}
console.log(`✅ ${ok.length} verificações concluídas sem falhas.`);
