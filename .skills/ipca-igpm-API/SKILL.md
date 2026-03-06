
---
name: IPCA & IGP-M — Motor de Reajuste Contratual
description: >
  Cálculo de reajuste de preços de contratos públicos e privados via APIs do IBGE (SIDRA) e Banco
  Central (SGS). Use esta skill SEMPRE que o projeto precisar de "reajuste contratual", "correção
  monetária", "atualização por IPCA", "reajuste por IGP-M", "índice de preços", "cálculo de
  inflação acumulada", "aniversário de contrato", "repactuação", "revisão de aluguel por IGP-M",
  ou qualquer variante de atualização monetária baseada em índices oficiais brasileiros.
  Inclui: consulta ao Número-Índice IPCA (IBGE/SIDRA), variação mensal IGP-M (BCB/SGS),
  fórmulas com precisão financeira, regras de defasagem, tratamento de deflação, cache de índices,
  validação Zod, service isolado e integração com Prisma Decimal.
---

# Skill: IPCA & IGP-M — Motor de Reajuste Contratual via APIs Públicas

## Decisão Rápida — Qual Índice Usar?

| Tipo de Contrato | Índice | Fundamento Legal | Metodologia |
|---|---|---|---|
| Contrato Administrativo (serviços contínuos) | **IPCA** | Lei 14.133/2021, Art. 92 §3º | Número-Índice (IBGE SIDRA) |
| Contrato Administrativo (TI, engenharia) | **IPCA** | Lei 14.133/2021 + IN SEGES | Número-Índice (IBGE SIDRA) |
| Aluguel comercial / residencial | **IGP-M** | Lei 8.245/1991 (Lei do Inquilinato) | Variação Acumulada (BCB SGS) |
| Contrato privado (cláusula livre) | **IPCA** ou **IGP-M** | Conforme cláusula contratual | Depende do índice escolhido |
| Reequilíbrio econômico-financeiro | **IPCA** | Lei 14.133/2021, Art. 124 | Número-Índice (IBGE SIDRA) |

> **Regra de ouro**: Contratos públicos → IPCA. Aluguéis → IGP-M. Na dúvida, consultar a cláusula de reajuste do contrato.

---

## Regras de Precisão Financeira (CRÍTICO)

Estas regras são **invioláveis** e devem ser seguidas em todo código gerado:

1. **NÃO** arredonde fatores intermediários. A divisão `(I - I0) / I0` gera dízimas (ex: `0.018777272...`). Manter precisão total do JavaScript (`float64`).
2. **NÃO** some percentuais mensais diretamente. Variações se acumulam por **produto** (juros compostos), nunca por soma.
3. Arredondamento para 2 casas decimais **somente no valor monetário final em R$**.
4. Para persistência em banco de dados, usar `Decimal` (Prisma) ou `NUMERIC(18,8)` (SQL) — nunca `Float`.
5. Comparações de igualdade entre floats devem usar tolerância epsilon (`Math.abs(a - b) < 1e-10`).

---

## Calendário de Publicação dos Índices

Entender o calendário evita bugs de "índice não encontrado":

| Índice | Órgão | Publicação | Referência | Exemplo |
|---|---|---|---|---|
| **IPCA** | IBGE | ~Dia 10 do mês seguinte | Mês anterior | IPCA de Jan/2026 → publicado ~10/Fev/2026 |
| **IGP-M** | FGV (via BCB) | ~Dia 28-30 do próprio mês | Mês corrente | IGP-M de Mar/2026 → publicado ~28/Mar/2026 |

### Regra de Defasagem (Lei 14.133/2021)

Em contratos públicos, o mês de referência do índice normalmente possui **defasagem de 1 a 2 meses** em relação à data de aniversário, porque o índice do mês corrente ainda não foi publicado.

```
Exemplo: Contrato com aniversário em Março/2026
├── IPCA de Março/2026 → Só será publicado em ~10/Abril/2026
├── Portanto, usa-se IPCA de Fevereiro/2026 (defasagem = 1 mês)
└── Ou IPCA de Janeiro/2026 (defasagem = 2 meses, conforme cláusula)
```

---

## Endpoints e Schemas das APIs

### 1. IPCA — API IBGE (SIDRA)

Consulta o **Número-Índice** (Variável 2266, Tabela 1737, base: Dez/1993 = 100).

**Endpoint:**
```
GET https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/{periodos}/variaveis/2266?localidades=N1[all]
```

| Parâmetro | Formato | Exemplo | Descrição |
|---|---|---|---|
| `periodos` | `YYYYMM\|YYYYMM` | `202401\|202501` | Meses específicos separados por pipe |
| `periodos` | `-N` | `-12` | Últimos N meses disponíveis |

**Exemplo de URL real:**
```
https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/202401|202501/variaveis/2266?localidades=N1[all]
```

**Schema de Resposta (Zod):**
```typescript
import { z } from 'zod';

const IBGESidraResultadoSchema = z.record(
  z.string(), // chave = periodo "YYYYMM"
  z.string()  // valor = número-índice como string "7205.0300000000000"
);

const IBGESidraVariavelSchema = z.object({
  id: z.string(),       // "2266"
  variavel: z.string(), // "IPCA - Número-índice (base: dezembro de 1993 = 100)"
  unidade: z.string(),  // "Número-índice"
  resultados: z.array(z.object({
    classificacoes: z.array(z.unknown()),
    series: z.array(z.object({
      localidade: z.object({
        id: z.string(),    // "1"
        nivel: z.object({ id: z.string(), nome: z.string() }),
        nome: z.string(),  // "Brasil"
      }),
      serie: IBGESidraResultadoSchema,
    })),
  })),
});

// Resposta = array com 1 elemento
const IBGEResponseSchema = z.array(IBGESidraVariavelSchema);

type IBGEResponse = z.infer<typeof IBGEResponseSchema>;
```

**Extração do Número-Índice:**
```typescript
function extrairIndiceIPCA(data: IBGEResponse, periodo: string): number {
  const serie = data[0]?.resultados?.[0]?.series?.[0]?.serie;
  const raw = serie?.[periodo];

  if (!raw || raw === '...' || raw === '-') {
    throw new Error(
      `Índice IPCA de ${periodo} ainda não publicado pelo IBGE. ` +
      `Verifique em: https://sidra.ibge.gov.br/tabela/1737`
    );
  }

  // O IBGE retorna strings longas: "7205.0300000000000"
  // Arredondar o número-índice isolado para 2 decimais (padrão tabela IBGE)
  return parseFloat(parseFloat(raw).toFixed(2));
}
```

---

### 2. IGP-M — API Banco Central (SGS)

Consulta a **variação percentual mensal** (Série 189).

**Endpoint:**
```
GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json&dataInicial={DD/MM/AAAA}&dataFinal={DD/MM/AAAA}
```

| Parâmetro | Formato | Exemplo | Descrição |
|---|---|---|---|
| `dataInicial` | `DD/MM/AAAA` | `01/03/2025` | Data inicial do período |
| `dataFinal` | `DD/MM/AAAA` | `01/03/2026` | Data final do período |

> **ATENÇÃO**: O formato é `DD/MM/AAAA` — nunca `MM/AAAA` ou `YYYY-MM-DD`.

**Exemplo de URL real:**
```
https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados?formato=json&dataInicial=01/03/2025&dataFinal=01/03/2026
```

**Schema de Resposta (Zod):**
```typescript
const BacenSGSItemSchema = z.object({
  data: z.string(),  // "01/03/2025" (DD/MM/AAAA)
  valor: z.string(), // "-0.34" (percentual mensal como string)
});

const BacenSGSResponseSchema = z.array(BacenSGSItemSchema);

type BacenSGSResponse = z.infer<typeof BacenSGSResponseSchema>;
```

**Séries úteis no SGS (além do IGP-M):**

| Série | Código | Uso |
|---|---|---|
| IGP-M (variação %) | `189` | Reajuste de aluguéis |
| IPCA (variação %) | `433` | Alternativa ao SIDRA (menos precisa para Número-Índice) |
| INPC (variação %) | `188` | Reajuste de salários/benefícios |
| IGP-DI (variação %) | `190` | Contratos mais antigos |

---

## Fórmulas de Cálculo

### Metodologia 1: Número-Índice (IPCA)

Usada quando a API retorna o número-índice acumulado desde a base.

```
Fator = (Índice_Atual - Índice_Base) / Índice_Base
Valor_Reajustado = Valor_Original × (1 + Fator)
```

```typescript
interface CalculoIPCAInput {
  valorOriginal: number;
  indiceBase: number;    // Índice do mês-base do contrato
  indiceAtual: number;   // Índice do mês de aniversário (com defasagem)
}

interface ResultadoReajuste {
  valorOriginal: number;
  valorReajustado: number;
  fatorMultiplicador: number; // (1 + fator) — ex: 1.0456
  percentualReajuste: number; // ex: 4.56 (em %)
  indiceBase: number;
  indiceAtual: number;
  periodoBase: string;
  periodoAtual: string;
}

function calcularReajusteIPCA(
  input: CalculoIPCAInput,
  periodoBase: string,
  periodoAtual: string
): ResultadoReajuste {
  const { valorOriginal, indiceBase, indiceAtual } = input;

  if (indiceBase <= 0) throw new Error('Índice base deve ser maior que zero');
  if (valorOriginal < 0) throw new Error('Valor original não pode ser negativo');

  // Fator com precisão total — NÃO arredondar aqui
  const fator = (indiceAtual - indiceBase) / indiceBase;
  const fatorMultiplicador = 1 + fator;
  const valorReajustado = valorOriginal * fatorMultiplicador;

  return {
    valorOriginal,
    valorReajustado: parseFloat(valorReajustado.toFixed(2)), // Arredonda SÓ aqui
    fatorMultiplicador,
    percentualReajuste: parseFloat((fator * 100).toFixed(4)),
    indiceBase,
    indiceAtual,
    periodoBase,
    periodoAtual,
  };
}
```

**Exemplo concreto com valores reais:**
```
Contrato: R$ 150.000,00/mês — Assinado em Jan/2024
Aniversário: Jan/2025 (defasagem 1 mês → usa IPCA Dez/2024)

Índice Base (Jan/2024):  7132.06
Índice Atual (Dez/2024): 7265.98

Fator = (7265.98 - 7132.06) / 7132.06 = 0.018777272...
Valor = 150000 × 1.018777272... = R$ 152.816,59
```

---

### Metodologia 2: Variação Mensal Acumulada (IGP-M)

Usada quando a API retorna taxas percentuais mensais (juros compostos).

```
Fator = ∏(1 + taxa_i / 100) para i = 1..n
Valor_Reajustado = Valor_Original × Fator
```

```typescript
interface CalculoIGPMInput {
  valorOriginal: number;
  taxasMensais: BacenSGSResponse; // Array de {data, valor}
  aplicarDeflacao?: boolean;       // default: false
}

function calcularReajusteIGPM(input: CalculoIGPMInput): ResultadoReajuste {
  const { valorOriginal, taxasMensais, aplicarDeflacao = false } = input;

  if (valorOriginal < 0) throw new Error('Valor original não pode ser negativo');
  if (taxasMensais.length === 0) throw new Error('Nenhuma taxa mensal fornecida');

  // Acumular por PRODUTO (juros compostos) — NUNCA somar
  const fatorAcumulado = taxasMensais.reduce((acc, item) => {
    const taxa = parseFloat(item.valor);
    if (isNaN(taxa)) {
      throw new Error(`Taxa inválida na data ${item.data}: "${item.valor}"`);
    }
    return acc * (1 + taxa / 100);
  }, 1);

  // Proteção contra deflação (padrão em aluguéis)
  const fatorFinal = (!aplicarDeflacao && fatorAcumulado < 1) ? 1 : fatorAcumulado;
  const valorReajustado = valorOriginal * fatorFinal;

  const periodoBase = taxasMensais[0].data;
  const periodoAtual = taxasMensais[taxasMensais.length - 1].data;

  return {
    valorOriginal,
    valorReajustado: parseFloat(valorReajustado.toFixed(2)),
    fatorMultiplicador: fatorFinal,
    percentualReajuste: parseFloat(((fatorFinal - 1) * 100).toFixed(4)),
    indiceBase: 0,   // N/A para IGP-M acumulado
    indiceAtual: 0,   // N/A para IGP-M acumulado
    periodoBase,
    periodoAtual,
  };
}
```

**Exemplo concreto:**
```
Aluguel: R$ 3.500,00/mês
Período: Mar/2025 a Fev/2026 (12 meses)

Taxas IGP-M: [-0.34, 0.24, 0.87, 0.45, ...]
Fator = (1 + -0.0034) × (1 + 0.0024) × (1 + 0.0087) × ... = 1.0312
Valor = 3500 × 1.0312 = R$ 3.609,20
```

---

## Service Completo (Pronto para Copiar)

### Vanilla JavaScript (fetch nativo)

```javascript
// js/services/reajuste-service.js

/**
 * Busca Número-Índice IPCA no IBGE SIDRA
 * @param {string} periodoBase   — "YYYYMM" (ex: "202401")
 * @param {string} periodoAtual  — "YYYYMM" (ex: "202501")
 * @returns {Promise<{indiceBase: number, indiceAtual: number}>}
 */
export async function buscarIndicesIPCA(periodoBase, periodoAtual) {
  const url = `https://servicodados.ibge.gov.br/api/v3/agregados/1737/periodos/${periodoBase}|${periodoAtual}/variaveis/2266?localidades=N1[all]`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

  if (!res.ok) {
    throw new Error(`IBGE SIDRA retornou HTTP ${res.status}. API pode estar indisponível.`);
  }

  const data = await res.json();
  const serie = data?.[0]?.resultados?.[0]?.series?.[0]?.serie;

  if (!serie) throw new Error('Resposta do IBGE em formato inesperado');

  const extrair = (periodo) => {
    const raw = serie[periodo];
    if (!raw || raw === '...' || raw === '-') {
      throw new Error(
        `Índice IPCA de ${periodo} ainda não foi publicado pelo IBGE. ` +
        `Consulte: https://sidra.ibge.gov.br/tabela/1737`
      );
    }
    return parseFloat(parseFloat(raw).toFixed(2));
  };

  return {
    indiceBase: extrair(periodoBase),
    indiceAtual: extrair(periodoAtual),
  };
}

/**
 * Busca taxas mensais IGP-M no Banco Central SGS
 * @param {string} dataInicial — "DD/MM/AAAA" (ex: "01/03/2025")
 * @param {string} dataFinal   — "DD/MM/AAAA" (ex: "01/03/2026")
 * @returns {Promise<Array<{data: string, valor: string}>>}
 */
export async function buscarTaxasIGPM(dataInicial, dataFinal) {
  const url =
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados` +
    `?formato=json&dataInicial=${dataInicial}&dataFinal=${dataFinal}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });

  if (!res.ok) {
    throw new Error(`Banco Central SGS retornou HTTP ${res.status}. API pode estar indisponível.`);
  }

  const data = await res.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(
      `Nenhuma taxa IGP-M encontrada no período ${dataInicial} a ${dataFinal}. ` +
      `O índice pode ainda não ter sido publicado pela FGV.`
    );
  }

  return data;
}

/**
 * Calcula reajuste por IPCA (Número-Índice)
 * @param {number} valorOriginal
 * @param {number} indiceBase
 * @param {number} indiceAtual
 * @returns {{valorReajustado: number, fator: number, percentual: number}}
 */
export function calcularIPCA(valorOriginal, indiceBase, indiceAtual) {
  if (indiceBase <= 0) throw new Error('Índice base deve ser > 0');

  const fator = (indiceAtual - indiceBase) / indiceBase;
  const valorReajustado = valorOriginal * (1 + fator);

  return {
    valorReajustado: parseFloat(valorReajustado.toFixed(2)),
    fator: 1 + fator,
    percentual: parseFloat((fator * 100).toFixed(4)),
  };
}

/**
 * Calcula reajuste por IGP-M (Variação Acumulada)
 * @param {number}  valorOriginal
 * @param {Array}   taxasMensais  — [{data, valor}] do BCB
 * @param {boolean} aplicarDeflacao — Permitir redução? (default: false)
 * @returns {{valorReajustado: number, fator: number, percentual: number}}
 */
export function calcularIGPM(valorOriginal, taxasMensais, aplicarDeflacao = false) {
  const fatorAcumulado = taxasMensais.reduce((acc, item) => {
    const taxa = parseFloat(item.valor);
    if (isNaN(taxa)) throw new Error(`Taxa inválida: "${item.valor}" em ${item.data}`);
    return acc * (1 + taxa / 100);
  }, 1);

  const fator = (!aplicarDeflacao && fatorAcumulado < 1) ? 1 : fatorAcumulado;
  const valorReajustado = valorOriginal * fator;

  return {
    valorReajustado: parseFloat(valorReajustado.toFixed(2)),
    fator,
    percentual: parseFloat(((fator - 1) * 100).toFixed(4)),
  };
}
```

### Uso completo (exemplo ponta a ponta):

```javascript
import { buscarIndicesIPCA, buscarTaxasIGPM, calcularIPCA, calcularIGPM } from './services/reajuste-service.js';

// ── IPCA: Reajuste de contrato público ──
async function reajustarContrato() {
  try {
    const { indiceBase, indiceAtual } = await buscarIndicesIPCA('202401', '202501');
    const resultado = calcularIPCA(150_000, indiceBase, indiceAtual);
    console.log(`Novo valor: R$ ${resultado.valorReajustado.toLocaleString('pt-BR')}`);
    console.log(`Reajuste: ${resultado.percentual}%`);
  } catch (error) {
    console.error('Erro no reajuste IPCA:', error.message);
  }
}

// ── IGP-M: Reajuste de aluguel ──
async function reajustarAluguel() {
  try {
    const taxas = await buscarTaxasIGPM('01/03/2025', '01/03/2026');
    const resultado = calcularIGPM(3_500, taxas, false);
    console.log(`Novo aluguel: R$ ${resultado.valorReajustado.toLocaleString('pt-BR')}`);
    console.log(`Variação acumulada: ${resultado.percentual}%`);
  } catch (error) {
    console.error('Erro no reajuste IGP-M:', error.message);
  }
}
```

---

### TypeScript + Next.js (Server-Side Service)

```typescript
// src/services/PricingAdjustmentService.ts

import { z } from 'zod';

// ═══════════════════════════════════════════
// SCHEMAS DE VALIDAÇÃO
// ═══════════════════════════════════════════

const PeriodoSchema = z.string().regex(/^\d{6}$/, 'Formato deve ser YYYYMM');

const DataBRSchema = z.string().regex(
  /^\d{2}\/\d{2}\/\d{4}$/,
  'Formato deve ser DD/MM/AAAA'
);

const IBGESidraResponseSchema = z.array(z.object({
  id: z.string(),
  variavel: z.string(),
  resultados: z.array(z.object({
    series: z.array(z.object({
      localidade: z.object({ nome: z.string() }),
      serie: z.record(z.string(), z.string()),
    })),
  })),
}));

const BacenSGSResponseSchema = z.array(z.object({
  data: z.string(),
  valor: z.string(),
}));

// ═══════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════

export interface ReajusteResult {
  valorOriginal: number;
  valorReajustado: number;
  fatorMultiplicador: number;
  percentualReajuste: number;
  periodoBase: string;
  periodoAtual: string;
  indice: 'IPCA' | 'IGPM';
  deflacaoAplicada: boolean;
  calculadoEm: string;
}

// ═══════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════

export class PricingAdjustmentService {

  /**
   * Reajuste completo por IPCA — busca índices e calcula
   */
  static async reajustarPorIPCA(
    valorOriginal: number,
    periodoBase: string,     // "YYYYMM"
    periodoAtual: string,    // "YYYYMM"
  ): Promise<ReajusteResult> {
    PeriodoSchema.parse(periodoBase);
    PeriodoSchema.parse(periodoAtual);

    const url =
      `https://servicodados.ibge.gov.br/api/v3/agregados/1737` +
      `/periodos/${periodoBase}|${periodoAtual}` +
      `/variaveis/2266?localidades=N1[all]`;

    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`IBGE SIDRA HTTP ${res.status}`);

    const raw = await res.json();
    const data = IBGESidraResponseSchema.parse(raw);
    const serie = data[0].resultados[0].series[0].serie;

    const extrair = (p: string): number => {
      const v = serie[p];
      if (!v || v === '...' || v === '-') {
        throw new Error(`IPCA ${p} não publicado. Consulte sidra.ibge.gov.br/tabela/1737`);
      }
      return parseFloat(parseFloat(v).toFixed(2));
    };

    const indiceBase = extrair(periodoBase);
    const indiceAtual = extrair(periodoAtual);
    const fator = (indiceAtual - indiceBase) / indiceBase;

    return {
      valorOriginal,
      valorReajustado: parseFloat((valorOriginal * (1 + fator)).toFixed(2)),
      fatorMultiplicador: 1 + fator,
      percentualReajuste: parseFloat((fator * 100).toFixed(4)),
      periodoBase,
      periodoAtual,
      indice: 'IPCA',
      deflacaoAplicada: false,
      calculadoEm: new Date().toISOString(),
    };
  }

  /**
   * Reajuste completo por IGP-M — busca taxas e calcula
   */
  static async reajustarPorIGPM(
    valorOriginal: number,
    dataInicial: string,  // "DD/MM/AAAA"
    dataFinal: string,    // "DD/MM/AAAA"
    aplicarDeflacao = false,
  ): Promise<ReajusteResult> {
    DataBRSchema.parse(dataInicial);
    DataBRSchema.parse(dataFinal);

    const url =
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.189/dados` +
      `?formato=json&dataInicial=${dataInicial}&dataFinal=${dataFinal}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`Banco Central SGS HTTP ${res.status}`);

    const raw = await res.json();
    const taxas = BacenSGSResponseSchema.parse(raw);

    if (taxas.length === 0) {
      throw new Error(`IGP-M sem dados para ${dataInicial} a ${dataFinal}`);
    }

    const fatorAcumulado = taxas.reduce((acc, item) => {
      const taxa = parseFloat(item.valor);
      if (isNaN(taxa)) throw new Error(`Taxa inválida: "${item.valor}" em ${item.data}`);
      return acc * (1 + taxa / 100);
    }, 1);

    const deflacaoAplicada = !aplicarDeflacao && fatorAcumulado < 1;
    const fator = deflacaoAplicada ? 1 : fatorAcumulado;

    return {
      valorOriginal,
      valorReajustado: parseFloat((valorOriginal * fator).toFixed(2)),
      fatorMultiplicador: fator,
      percentualReajuste: parseFloat(((fator - 1) * 100).toFixed(4)),
      periodoBase: dataInicial,
      periodoAtual: dataFinal,
      indice: 'IGPM',
      deflacaoAplicada,
      calculadoEm: new Date().toISOString(),
    };
  }
}
```

---

## Utilitários de Data para Reajuste

A manipulação de datas é fonte frequente de bugs. Usar estes helpers:

```typescript
/**
 * Converte "YYYYMM" → "DD/MM/AAAA" (primeiro dia do mês)
 * Necessário para montar URLs do Banco Central SGS
 */
function periodoParaDataBR(periodo: string): string {
  const ano = periodo.slice(0, 4);
  const mes = periodo.slice(4, 6);
  return `01/${mes}/${ano}`;
}

/**
 * Calcula o período com defasagem
 * Exemplo: mesAniversario="202603", defasagem=1 → "202602"
 */
function aplicarDefasagem(periodoYYYYMM: string, meses: number): string {
  const ano = parseInt(periodoYYYYMM.slice(0, 4));
  const mes = parseInt(periodoYYYYMM.slice(4, 6));
  const date = new Date(ano, mes - 1 - meses, 1);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}${m}`;
}

/**
 * Valida se um período YYYYMM já foi publicado (estimativa)
 * IPCA: publicado ~dia 10 do mês seguinte
 * IGP-M: publicado ~dia 28 do próprio mês
 */
function indiceProvavelmenteDisponivel(
  periodoYYYYMM: string,
  indice: 'IPCA' | 'IGPM'
): boolean {
  const ano = parseInt(periodoYYYYMM.slice(0, 4));
  const mes = parseInt(periodoYYYYMM.slice(4, 6));
  const hoje = new Date();

  if (indice === 'IPCA') {
    // IPCA de Jan/2026 disponível a partir de ~10/Fev/2026
    const disponivelApos = new Date(ano, mes, 10); // mes já é o mês seguinte (0-indexed+1)
    return hoje >= disponivelApos;
  } else {
    // IGP-M de Mar/2026 disponível a partir de ~28/Mar/2026
    const disponivelApos = new Date(ano, mes - 1, 28);
    return hoje >= disponivelApos;
  }
}
```

---

## Integração com Prisma (Persistência)

```prisma
// schema.prisma — Modelo para armazenar histórico de reajustes

model ReajusteContratual {
  id                 String   @id @default(cuid())
  contratoId         String
  indice             String   // "IPCA" | "IGPM"
  valorOriginal      Decimal  @db.Decimal(18, 2)
  valorReajustado    Decimal  @db.Decimal(18, 2)
  fatorMultiplicador Decimal  @db.Decimal(18, 10)  // Precisão total do fator
  percentualReajuste Decimal  @db.Decimal(8, 4)
  periodoBase        String   // "202401" ou "01/03/2025"
  periodoAtual       String
  deflacaoAplicada   Boolean  @default(false)
  calculadoEm        DateTime @default(now())
  contrato           Contrato @relation(fields: [contratoId], references: [id])

  @@index([contratoId, calculadoEm])
  @@index([indice, periodoAtual])
}
```

> **Importante**: Use `Decimal` para valores financeiros e fatores. O tipo `Float` do JavaScript/Prisma causa erros de arredondamento em cálculos encadeados.

---

## Cache de Índices

Índices econômicos **não mudam** depois de publicados (exceto raras revisões). Cachear agressivamente reduz chamadas às APIs e melhora a experiência em redes gov lentas.

```typescript
// Cache simples em memória (ou use Redis em produção)
const indiceCache = new Map<string, { valor: number; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

async function buscarIPCACacheado(periodo: string): Promise<number> {
  const cached = indiceCache.get(`ipca_${periodo}`);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.valor;
  }

  const { indiceBase } = await buscarIndicesIPCA(periodo, periodo);
  indiceCache.set(`ipca_${periodo}`, { valor: indiceBase, timestamp: Date.now() });
  return indiceBase;
}
```

Para Vanilla JS no browser, usar `localStorage` com TTL:

```javascript
function getCachedIndex(key) {
  try {
    const item = JSON.parse(localStorage.getItem(`idx_${key}`));
    if (item && Date.now() - item.ts < 86400000) return item.v; // 24h
  } catch (_) {}
  return null;
}

function setCachedIndex(key, value) {
  try {
    localStorage.setItem(`idx_${key}`, JSON.stringify({ v: value, ts: Date.now() }));
  } catch (_) {}
}
```

---

## Tratamento de Erros e Resiliência

As APIs do IBGE e Banco Central são instáveis. Implementar retry com backoff:

```typescript
async function fetchComRetry(
  url: string,
  tentativas = 3,
  delayMs = 1000
): Promise<Response> {
  for (let i = 0; i < tentativas; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (res.ok) return res;
      if (res.status === 503 || res.status === 429) {
        // API sobrecarregada — esperar e tentar novamente
        await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i)));
        continue;
      }
      throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      if (i === tentativas - 1) throw error;
      await new Promise(r => setTimeout(r, delayMs * Math.pow(2, i)));
    }
  }
  throw new Error('Todas as tentativas falharam');
}
```

---

## Constraints

### Críticos ⚠️
- **Precisão**: Nunca arredondar fatores intermediários. Apenas o valor final em R$.
- **IPCA**: Sempre usar Número-Índice e fórmula `(I - I0) / I0`. Nunca somar taxas mensais.
- **IGP-M no BCB**: Formato de data é `DD/MM/AAAA`. Nunca `MM/AAAA` ou `YYYY-MM-DD`.
- **Índices inexistentes**: Se o IBGE retorna `"..."` ou `"-"`, o índice não foi publicado. Lançar erro explícito — nunca inventar ou estimar valores.
- **Deflação em aluguéis**: Por padrão, fator < 1 deve retornar valor original (sem redução). Oferecer flag `aplicarDeflacao` para cenários que permitem.

### Resiliência
- **Timeout**: Sempre usar `AbortSignal.timeout()` (15s para APIs gov).
- **Retry**: Implementar backoff exponencial para HTTP 503/429.
- **Cache**: Cachear índices por 24h (não mudam depois de publicados).
- **Fallback**: Se IBGE SIDRA estiver fora, considerar série 433 do BCB como alternativa para variação do IPCA (menos precisa para Número-Índice).

### Anti-Patterns
- ❌ Não calcular IPCA somando taxas mensais — usar SEMPRE Número-Índice.
- ❌ Não usar `Float` do Prisma para valores monetários — usar `Decimal`.
- ❌ Não presumir que o índice do mês corrente existe — verificar calendário de publicação.
- ❌ Não ignorar defasagem — contratos públicos raramente usam o índice do próprio mês de aniversário.
- ❌ Não hardcodar índices — sempre consultar a API para obter valores atualizados.
- ❌ Não usar `toFixed()` em cálculos intermediários — apenas no resultado final em R$.