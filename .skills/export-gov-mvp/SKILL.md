---
name: Export Gov MVP
description: >
  Exportação de dados para CSV, XLSX, DOCX e PDF direto no browser (client-side, zero servidor)
  para MVPs de compras públicas. Use esta skill SEMPRE que o MVP precisar de botão "Exportar",
  "Baixar relatório", "Gerar planilha", "Gerar documento", "Salvar para SEI", ou qualquer
  variante de exportação de dados de tabelas, ARPs, empenhos, itens ou relatórios institucionais.
  Inclui: CSV com BOM UTF-8 para Excel BR, XLSX com formatação e múltiplas abas via SheetJS,
  DOCX com cabeçalho institucional via docx.js, PDF via window.print() sem servidor,
  e botões de exportação com UX gov (página atual vs. todos os registros).
---

# Skill: Export Gov MVP

## Decisão Rápida por Formato

| Situação | Formato | Lib necessária |
|---|---|---|
| Planilha de trabalho no Excel | **XLSX** | SheetJS (CDN) |
| Apenas dados simples / legado | **CSV** | Nenhuma (nativo) |
| Relatório para SEI / chefia | **DOCX** | docx.js (CDN) |
| Evidência de pesquisa de preços (IN 65/2021) | **PDF** | Nenhuma (print CSS) |
| Tudo via CDN, sem npm | XLSX + PDF | SheetJS + print CSS |

---

## Carregamento das Bibliotecas (CDN)

```html
<!-- Adicionar no <head> apenas se o formato for necessário -->

<!-- SheetJS — XLSX e CSV avançado -->
<script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"></script>

<!-- docx.js — DOCX no browser -->
<script src="https://unpkg.com/docx@8.5.0/build/index.js"></script>

<!-- FileSaver — download cross-browser seguro -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js"></script>
```

> **Ambientes gov com CDN bloqueado**: baixar os bundles e servir localmente junto com o HTML.
> ```bash
> # Gerar bundle offline
> curl -o js/vendor/xlsx.full.min.js https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js
> curl -o js/vendor/FileSaver.min.js https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
> ```

---

## 1. CSV — Nativo, zero dependências

```javascript
// js/utils/export-csv.js
import { fmt } from './format.js'; // da skill UX/UI Gov

/**
 * Exporta array de objetos para CSV compatível com Excel BR
 * @param {object[]} rows       — Dados a exportar
 * @param {object[]} columns    — [{key, label, formatter?}]
 * @param {string}   filename   — Nome do arquivo sem extensão
 * @param {object}   [meta]     — Metadados opcionais {orgao, filtros, geradoEm}
 */
export function exportCSV(rows, columns, filename = 'exportacao', meta = {}) {
  const lines = [];

  // Bloco de metadados no topo (rastreabilidade para SEI)
  if (meta.orgao) {
    lines.push(`"Órgão:";"${meta.orgao}"`);
    lines.push(`"Gerado em:";"${fmt.datetime(new Date().toISOString())}"`);
    if (meta.filtros) lines.push(`"Filtros:";"${meta.filtros}"`);
    lines.push(''); // linha em branco separando metadados dos dados
  }

  // Cabeçalho
  lines.push(columns.map(c => `"${c.label}"`).join(';'));

  // Linhas de dados
  rows.forEach(row => {
    const cells = columns.map(c => {
      const raw = row[c.key] ?? '';
      const val = c.formatter ? c.formatter(raw, row) : raw;
      // Remove HTML, normaliza números para vírgula BR
      const clean = String(val)
        .replace(/<[^>]+>/g, '')           // strip HTML
        .replace(/^R\$\s*/, '')            // strip prefixo R$
        .replace(/\./g, '')                // remove separador de milhar
        .replace(',', '.');                // normaliza decimal
      return `"${clean.replace(/"/g, '""')}"`;
    });
    lines.push(cells.join(';'));
  });

  const bom = '\uFEFF'; // BOM obrigatório para Excel BR reconhecer UTF-8
  const blob = new Blob([bom + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `${filename}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## 2. XLSX — SheetJS com formatação, múltiplas abas e cabeçalho institucional

```javascript
// js/utils/export-xlsx.js
// Requer SheetJS carregado via CDN (window.XLSX)

import { fmt } from './format.js';

/**
 * Configuração de estilos reutilizáveis
 * Nota: SheetJS free não suporta estilos — usar SheetJS Pro ou xlsx-js-style (CDN)
 * Para estilos, carregar: https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js
 */

/**
 * Exporta para XLSX com cabeçalho institucional e formatação gov
 * @param {object[]}  rows      — Dados principais
 * @param {object[]}  columns   — [{key, label, width?, type?:'currency'|'date'|'text'|'number'}]
 * @param {string}    filename  — Nome sem extensão
 * @param {object}    opts
 * @param {string}    opts.sheetName   — Nome da aba principal (default: 'Dados')
 * @param {object}    opts.meta        — {orgao, unidadeGerenciadora, filtros}
 * @param {object[][]} opts.extraSheets — [{name, rows, columns}] — abas adicionais
 */
export function exportXLSX(rows, columns, filename = 'exportacao', opts = {}) {
  const XLSX = window.XLSX || window.XLSXStyle;
  if (!XLSX) throw new Error('SheetJS não carregado. Adicionar CDN no HTML.');

  const wb = XLSX.utils.book_new();

  // --- Aba principal ---
  const wsData = _buildSheet(rows, columns, opts.meta);
  XLSX.utils.book_append_sheet(wb, wsData, opts.sheetName || 'Dados');

  // --- Abas adicionais (ex: uma aba por ARP) ---
  (opts.extraSheets || []).forEach(({ name, rows: r, columns: c }) => {
    const ws = _buildSheet(r, c);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31)); // Excel: max 31 chars no nome da aba
  });

  // Download
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function _buildSheet(rows, columns, meta = {}) {
  const XLSX = window.XLSX || window.XLSXStyle;
  const aoa = []; // Array of Arrays

  // Metadados no topo
  if (meta.orgao) {
    aoa.push([`Órgão: ${meta.orgao}`]);
    aoa.push([`Gerado em: ${fmt.datetime(new Date().toISOString())}`]);
    if (meta.unidadeGerenciadora) aoa.push([`UG: ${meta.unidadeGerenciadora}`]);
    if (meta.filtros) aoa.push([`Filtros: ${meta.filtros}`]);
    aoa.push([]); // linha em branco
  }

  // Cabeçalho das colunas
  aoa.push(columns.map(c => c.label));

  // Linhas de dados
  rows.forEach(row => {
    aoa.push(columns.map(c => {
      const raw = row[c.key];
      if (raw === null || raw === undefined) return '';

      // Tipos nativos do Excel — manter como number para fórmulas funcionarem
      switch (c.type) {
        case 'currency': return typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.')) || 0;
        case 'number':   return typeof raw === 'number' ? raw : Number(raw) || 0;
        case 'date':     return fmt.date(raw); // string DD/MM/YYYY — Excel precisa de ajuste se quiser ordenar
        default:         return c.formatter ? c.formatter(raw, row) : String(raw);
      }
    }));
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Larguras de colunas
  ws['!cols'] = columns.map(c => ({ wch: c.width || 20 }));

  // Linha de totais (soma colunas currency)
  const currencyCols = columns
    .map((c, i) => ({ ...c, i }))
    .filter(c => c.type === 'currency');

  if (currencyCols.length && rows.length) {
    const metaRows = meta.orgao ? 5 : 0; // linhas de metadados
    const headerRow = metaRows + 1;       // 1-indexed
    const firstDataRow = headerRow + 1;
    const lastDataRow = headerRow + rows.length;
    const totalRow = [];
    columns.forEach((c, i) => {
      if (c.type === 'currency') {
        const col = XLSX.utils.encode_col(i);
        totalRow.push(`=SUM(${col}${firstDataRow}:${col}${lastDataRow})`);
      } else if (i === 0) {
        totalRow.push('TOTAL');
      } else {
        totalRow.push('');
      }
    });
    aoa.push(totalRow);
    // Re-gerar sheet com a linha de total incluída
    const wsNew = XLSX.utils.aoa_to_sheet(aoa);
    wsNew['!cols'] = ws['!cols'];
    return wsNew;
  }

  return ws;
}

/**
 * Exporta múltiplas ARPs em abas separadas — caso de uso: dashboard fornecedor
 * @param {object[]} arps — [{numeroAta, nomeUG, itens:[]}]
 * @param {object[]} columns
 */
export function exportXLSXMultiARP(arps, columns, filename = 'dashboard-arp') {
  const XLSX = window.XLSX || window.XLSXStyle;
  if (!XLSX) throw new Error('SheetJS não carregado.');

  const wb = XLSX.utils.book_new();

  // Aba de resumo
  const resumo = arps.map(a => ({
    numeroAta: a.numeroAta,
    nomeUG: a.nomeUG,
    totalItens: a.itens.length,
    valorTotal: a.itens.reduce((s, i) => s + (i.valorUnitario || 0) * (i.quantidadeRegistrada || 0), 0),
    vigenciaFinal: a.dataVigenciaFinal,
  }));

  const wsResumo = _buildSheet(resumo, [
    { key: 'numeroAta',   label: 'Nº Ata',         width: 12 },
    { key: 'nomeUG',      label: 'Unidade Gerenc.', width: 40 },
    { key: 'totalItens',  label: 'Qtd. Itens',      width: 12, type: 'number' },
    { key: 'valorTotal',  label: 'Valor Total (R$)', width: 18, type: 'currency' },
    { key: 'vigenciaFinal',label: 'Vigência Até',   width: 14, type: 'date' },
  ]);
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  // Uma aba por ARP (max 10 para não pesar)
  arps.slice(0, 10).forEach(arp => {
    const ws = _buildSheet(arp.itens, columns);
    const sheetName = `ARP ${arp.numeroAta}`.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, `${filename}.xlsx`);
}
