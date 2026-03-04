---
name: UX/UI Gov — Compras Públicas
description: >
  Padrões de interface, formatação e componentes para MVPs voltados a servidores públicos e
  fornecedores no contexto de compras governamentais brasileiras. Use esta skill SEMPRE que
  construir qualquer tela que exiba dados de ARPs, empenhos, licitações, fornecedores, CNPJ,
  valores monetários em R$, datas BR ou tabelas de itens do governo. Inclui: formatação PT-BR,
  componentes de tabela com paginação server-side, badges de status, filtros de busca, skeleton
  loaders, empty states e exportação CSV — todos em HTML/CSS/JS Vanilla sem dependências.
---

# Skill: UX/UI Gov — Compras Públicas

## Formatação PT-BR (utils/format.js)

```javascript
// utils/format.js — copiar integralmente em todo MVP gov

export const fmt = {
  /** R$ 1.234,56 */
  money: (v) => v == null ? '—' : Number(v).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  }),

  /** 01/01/2026 */
  date: (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  },

  /** 01/01/2026 às 14:30 */
  datetime: (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  },

  /** 12.345.678/0001-99 */
  cnpj: (v) => {
    if (!v) return '—';
    const d = String(v).replace(/\D/g, '').padStart(14, '0');
    return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  },

  /** 000.000.000-00 */
  cpf: (v) => {
    if (!v) return '—';
    const d = String(v).replace(/\D/g, '').padStart(11, '0');
    return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  },

  /** ni() → detecta CPF (11 dígitos) ou CNPJ (14) e formata */
  ni: (v) => {
    const d = String(v || '').replace(/\D/g, '');
    return d.length <= 11 ? fmt.cpf(d) : fmt.cnpj(d);
  },

  /** "00008/2026" → "00008%2F2026" para URLs */
  encodeAta: (ata) => encodeURIComponent(ata),

  /** Número da ata: 00008/2026 */
  ata: (n, ano) => n && ano ? `${String(n).padStart(5,'0')}/${ano}` : (n || '—'),

  /** 1.234 unid. */
  qty: (v, unidade = '') => v == null ? '—'
    : `${Number(v).toLocaleString('pt-BR')}${unidade ? ' ' + unidade : ''}`,
};
```

---

## Badges de Status de Ata

```javascript
// utils/badge.js
export function statusBadge(situacao) {
  const map = {
    'Vigente':    { cls: 'badge-success', label: 'Vigente' },
    'Encerrada':  { cls: 'badge-danger',  label: 'Encerrada' },
    'Suspensa':   { cls: 'badge-warning', label: 'Suspensa' },
    'Cancelada':  { cls: 'badge-neutral', label: 'Cancelada' },
  };
  const s = map[situacao] || { cls: 'badge-neutral', label: situacao || '—' };
  return `<span class="badge ${s.cls}">${s.label}</span>`;
}

export function aceitaAdesaoBadge(aceita) {
  return aceita
    ? `<span class="badge badge-success">✓ Aceita Carona</span>`
    : `<span class="badge badge-neutral">✗ Sem Carona</span>`;
}
```

---

## Componente de Tabela com Paginação Server-Side

```javascript
// components/DataTable.js
export class DataTable {
  /**
   * @param {object} opts
   * @param {string}   opts.containerId  — ID do elemento pai
   * @param {Array}    opts.columns      — [{key, label, render?}]
   * @param {Function} opts.fetchFn      — async (pagina, tamanhoPagina) => { resultado, totalPaginas }
   * @param {number}   [opts.pageSize=20]
   */
  constructor({ containerId, columns, fetchFn, pageSize = 20 }) {
    this.el = document.getElementById(containerId);
    this.columns = columns;
    this.fetchFn = fetchFn;
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.totalPages = 1;
    this._render();
  }

  _render() {
    this.el.innerHTML = `
      <div class="dt-toolbar">
        <span class="dt-info" id="dt-info-${this.el.id}"></span>
        <div class="dt-pagination" id="dt-pag-${this.el.id}"></div>
      </div>
      <div class="dt-table-wrap">
        <table class="dt-table">
          <thead><tr>${this.columns.map(c =>
            `<th>${c.label}</th>`).join('')}</tr></thead>
          <tbody id="dt-body-${this.el.id}"><tr><td colspan="${this.columns.length}"
            class="dt-empty">Carregando...</td></tr></tbody>
        </table>
      </div>
    `;
    this.tbody = document.getElementById(`dt-body-${this.el.id}`);
    this.info  = document.getElementById(`dt-info-${this.el.id}`);
    this.pag   = document.getElementById(`dt-pag-${this.el.id}`);
    this.load(1);
  }

  async load(pagina) {
    this.currentPage = pagina;
    this.tbody.innerHTML = `<tr><td colspan="${this.columns.length}"
      class="dt-skeleton">${'<div class="skel"></div>'.repeat(3)}</td></tr>`;
    try {
      const { resultado = [], totalPaginas = 1, totalRegistros = 0 } =
        await this.fetchFn(pagina, this.pageSize);
      this.totalPages = totalPaginas;
      this._renderRows(resultado);
      this._renderInfo(totalRegistros);
      this._renderPagination();
    } catch (e) {
      this.tbody.innerHTML = `<tr><td colspan="${this.columns.length}"
        class="dt-empty dt-error">⚠️ Erro ao carregar: ${e.message}</td></tr>`;
    }
  }

  _renderRows(rows) {
    if (!rows.length) {
      this.tbody.innerHTML = `<tr><td colspan="${this.columns.length}"
        class="dt-empty">Nenhum registro encontrado.</td></tr>`;
      return;
    }
    this.tbody.innerHTML = rows.map(row => `
      <tr>${this.columns.map(c => {
        const val = row[c.key];
        const cell = c.render ? c.render(val, row) : (val ?? '—');
        return `<td>${cell}</td>`;
      }).join('')}</tr>
    `).join('');
  }

  _renderInfo(total) {
    const from = (this.currentPage - 1) * this.pageSize + 1;
    const to   = Math.min(this.currentPage * this.pageSize, total);
    this.info.textContent = total
      ? `Exibindo ${from.toLocaleString('pt-BR')}–${to.toLocaleString('pt-BR')} de ${total.toLocaleString('pt-BR')} registros`
      : 'Nenhum registro';
  }

  _renderPagination() {
    const p = this.currentPage, t = this.totalPages;
    const pages = this._pageRange(p, t);
    this.pag.innerHTML = `
      <button class="pag-btn" ${p <= 1 ? 'disabled' : ''} data-p="${p-1}">‹</button>
      ${pages.map(n => n === '...'
        ? `<span class="pag-ellipsis">…</span>`
        : `<button class="pag-btn ${n === p ? 'active' : ''}" data-p="${n}">${n}</button>`
      ).join('')}
      <button class="pag-btn" ${p >= t ? 'disabled' : ''} data-p="${p+1}">›</button>
    `;
    this.pag.querySelectorAll('[data-p]').forEach(btn => {
      btn.addEventListener('click', () => this.load(+btn.dataset.p));
    });
  }

  _pageRange(current, total) {
    if (total <= 7) return Array.from({length: total}, (_, i) => i + 1);
    if (current <= 4) return [1,2,3,4,5,'...',total];
    if (current >= total - 3) return [1,'...',total-4,total-3,total-2,total-1,total];
    return [1,'...',current-1,current,current+1,'...',total];
  }
}
```

---

/* O arquivo contém também estilos CSS, FilterBar e export CSV — ver SKILL.md original para exemplos completos */
