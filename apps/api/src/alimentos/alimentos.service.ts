import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, CategoriaAlimento } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAlimentoDto } from './dto/query-alimento.dto';
import { CalcularNutricaoDto } from './dto/calcular-nutricao.dto';

// ─── Tipos auxiliares ─────────────────────────────────────────────────────────

export interface NutricaoPorcao {
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  fibras: number;
  sodio: number;
}

export interface ResultadoCalculo {
  alimentoId: string;
  nome: string;
  quantidade: number;
  unidade: string;
  nutricao: NutricaoPorcao;
}

export interface TotalNutricional {
  itens: ResultadoCalculo[];
  total: NutricaoPorcao;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class AlimentosService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Listar com busca e filtros ───────────────────────────────────────────────
  async findAll(query: QueryAlimentoDto) {
    const take = Math.min(Number(query.limit ?? 50), 500);
    const skip = Number(query.skip ?? 0);

    const where: Prisma.AlimentoWhereInput = {};

    if (query.busca) {
      where.nome = { contains: query.busca, mode: 'insensitive' };
    }

    if (query.categoria) {
      where.categoria = query.categoria;
    }

    if (query.apenasAtivos !== false) {
      where.ativo = true;
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.alimento.count({ where }),
      this.prisma.alimento.findMany({
        where,
        orderBy: [{ categoria: Prisma.SortOrder.asc }, { nome: Prisma.SortOrder.asc }],
        take,
        skip,
      }),
    ]);

    return {
      total,
      data: items.map((a) => this.formatAlimento(a)),
    };
  }

  // ── Listar categorias disponíveis ────────────────────────────────────────────
  async getCategorias() {
    const result = await this.prisma.alimento.groupBy({
      by: ['categoria'],
      where: { ativo: true },
      _count: { id: true },
      orderBy: { categoria: Prisma.SortOrder.asc },
    });

    return result.map((r) => ({
      categoria: r.categoria,
      label: this.labelCategoria(r.categoria),
      total: r._count.id,
    }));
  }

  // ── Buscar por ID ────────────────────────────────────────────────────────────
  async findOne(id: string) {
    const alimento = await this.prisma.alimento.findUnique({ where: { id } });
    if (!alimento) throw new NotFoundException('Alimento não encontrado');
    return this.formatAlimento(alimento);
  }

  // ── Calcular nutrição para uma lista de alimentos + quantidades ──────────────
  async calcularNutricao(dto: CalcularNutricaoDto): Promise<TotalNutricional> {
    const ids = dto.itens.map((i) => i.alimentoId);
    const alimentos = await this.prisma.alimento.findMany({
      where: { id: { in: ids } },
    });

    const alimentoMap = new Map(alimentos.map((a) => [a.id, a]));

    const itens: ResultadoCalculo[] = [];
    const total: NutricaoPorcao = {
      calorias: 0, proteinas: 0, carboidratos: 0,
      gorduras: 0, fibras: 0, sodio: 0,
    };

    for (const item of dto.itens) {
      const alimento = alimentoMap.get(item.alimentoId);
      if (!alimento) {
        throw new NotFoundException(`Alimento ID "${item.alimentoId}" não encontrado`);
      }

      // Cálculo proporcional: (valor_por_100g / 100) * quantidade_em_g
      const fator = item.quantidade / 100;
      const nutricao: NutricaoPorcao = {
        calorias:     this.round(Number(alimento.calorias100g)     * fator),
        proteinas:    this.round(Number(alimento.proteinas100g)    * fator),
        carboidratos: this.round(Number(alimento.carboidratos100g) * fator),
        gorduras:     this.round(Number(alimento.gorduras100g)     * fator),
        fibras:       this.round(Number(alimento.fibras100g)       * fator),
        sodio:        this.round(Number(alimento.sodio100g)        * fator),
      };

      itens.push({
        alimentoId: alimento.id,
        nome:       alimento.nome,
        quantidade: item.quantidade,
        unidade:    item.unidade ?? alimento.unidadePadrao,
        nutricao,
      });

      total.calorias     += nutricao.calorias;
      total.proteinas    += nutricao.proteinas;
      total.carboidratos += nutricao.carboidratos;
      total.gorduras     += nutricao.gorduras;
      total.fibras       += nutricao.fibras;
      total.sodio        += nutricao.sodio;
    }

    // Arredondar totais
    Object.keys(total).forEach((k) => {
      (total as any)[k] = this.round((total as any)[k]);
    });

    return { itens, total };
  }

  // ── Helpers privados ─────────────────────────────────────────────────────────

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }

  private formatAlimento(a: any) {
    return {
      id:            a.id,
      nome:          a.nome,
      categoria:     a.categoria,
      categoriaLabel: this.labelCategoria(a.categoria),
      unidadePadrao: a.unidadePadrao,
      porcaoPadrao:  Number(a.porcaoPadrao),
      descricao:     a.descricao,
      ativo:         a.ativo,
      nutricaoPor100g: {
        calorias:     Number(a.calorias100g),
        proteinas:    Number(a.proteinas100g),
        carboidratos: Number(a.carboidratos100g),
        gorduras:     Number(a.gorduras100g),
        fibras:       Number(a.fibras100g),
        sodio:        Number(a.sodio100g),
      },
      // Nutrição para a porção padrão
      nutricaoPorcaoPadrao: {
        porcao: Number(a.porcaoPadrao),
        unidade: a.unidadePadrao,
        calorias:     this.round(Number(a.calorias100g)     * Number(a.porcaoPadrao) / 100),
        proteinas:    this.round(Number(a.proteinas100g)    * Number(a.porcaoPadrao) / 100),
        carboidratos: this.round(Number(a.carboidratos100g) * Number(a.porcaoPadrao) / 100),
        gorduras:     this.round(Number(a.gorduras100g)     * Number(a.porcaoPadrao) / 100),
        fibras:       this.round(Number(a.fibras100g)       * Number(a.porcaoPadrao) / 100),
        sodio:        this.round(Number(a.sodio100g)        * Number(a.porcaoPadrao) / 100),
      },
    };
  }

  private labelCategoria(cat: CategoriaAlimento): string {
    const labels: Record<CategoriaAlimento, string> = {
      CEREAIS_GRAOS:        'Cereais e Grãos',
      LEGUMINOSAS:          'Leguminosas',
      PROTEINAS:            'Proteínas',
      LATICINIOS:           'Laticínios',
      FRUTAS:               'Frutas',
      VERDURAS_LEGUMES:     'Verduras e Legumes',
      GORDURAS_OLEOS:       'Gorduras e Óleos',
      ACUCARES_DOCES:       'Açúcares e Doces',
      BEBIDAS:              'Bebidas',
      PREPARACOES:          'Preparações',
      OLEAGINOSAS:          'Oleaginosas e Sementes',
      EMBUTIDOS:            'Embutidos',
      FARINHAS_AMIDOS:      'Farinhas e Amidos',
      TEMPEROS_CONDIMENTOS: 'Temperos e Condimentos',
      SOPAS_CALDOS:         'Sopas e Caldos',
      OUTROS:               'Outros',
    };
    return labels[cat] ?? cat;
  }
}
