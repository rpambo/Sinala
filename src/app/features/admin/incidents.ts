import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Incident, IncidentCategory, IncidentStatus, INCIDENT_CATEGORIES, ANGOLA_PROVINCES } from '../../core/models/incident';
import { IncidentService } from '../../core/services/incident.service';
import { environment } from '../../../environments/environment';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

@Component({
  selector: 'app-admin-incidents',
  standalone: true,
  imports: [DatePipe, FormsModule, SinalaIconComponent],
  template: `
    <section class="admin-incidents">
      <header class="page-head">
        <div>
          <span class="overline">GESTÃO DE DADOS</span>
          <h1>Ocorrências</h1>
          <p>Reveja, classifique e acompanhe os reportes submetidos pela comunidade.</p>
        </div>
        <button type="button" class="button button-primary" (click)="exportCsv()" [disabled]="!filtered().length">
          <lucide-icon name="download"></lucide-icon> Exportar CSV
        </button>
      </header>

      <div class="kpis" aria-label="Resumo das ocorrências">
        <article class="kpi"><span class="kpi-icon"><lucide-icon name="radio"></lucide-icon></span><div><span>Total de reportes</span><strong>{{ incidents().length }}</strong></div></article>
        <article class="kpi"><span class="kpi-icon"><lucide-icon name="clock-3"></lucide-icon></span><div><span>Em análise</span><strong>{{ reviewing() }}</strong></div></article>
        <article class="kpi"><span class="kpi-icon"><lucide-icon name="sparkles"></lucide-icon></span><div><span>Por classificar</span><strong>{{ unclassified() }}</strong></div></article>
        <article class="kpi"><span class="kpi-icon"><lucide-icon name="circle-check-big"></lucide-icon></span><div><span>Encerrados</span><strong>{{ closed() }}</strong></div></article>
      </div>

      @if (apiError()) {
        <section class="state-panel state-panel--error" role="alert">
          <span class="state-icon"><lucide-icon name="circle-alert"></lucide-icon></span>
          <strong>Não foi possível carregar as ocorrências.</strong>
          <p>Confirme a ligação à API e tente novamente.</p>
          <button type="button" class="button button-primary" (click)="reload()">Tentar novamente</button>
        </section>
      } @else if (loading()) {
        <section class="state-panel" role="status" aria-live="polite">
          <span class="state-icon"><lucide-icon name="radio"></lucide-icon></span>
          <strong>A carregar ocorrências…</strong>
          <p>A sincronizar com a base de dados da SINALA.</p>
        </section>
      } @else {
        <form class="filter-card sinala-card" (submit)="$event.preventDefault()" aria-label="Filtros de ocorrências">
          <div class="field field--search">
            <label for="admin-search">Pesquisar</label>
            <div class="search-wrap">
              <lucide-icon name="search"></lucide-icon>
              <input id="admin-search" class="form-control" placeholder="Referência, operador ou zona" [ngModel]="query()" (ngModelChange)="setQuery($event)" />
            </div>
          </div>
          <div class="field">
            <label for="admin-category">Categoria</label>
            <select id="admin-category" class="form-select" [ngModel]="category()" (ngModelChange)="setCategory($event)">
              <option value="">Todas as categorias</option>
              @for (item of categories; track item) { <option [value]="item">{{ item }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="admin-province">Província</label>
            <select id="admin-province" class="form-select" [ngModel]="province()" (ngModelChange)="setProvince($event)">
              <option value="">Todas as províncias</option>
              @for (item of provinces; track item) { <option [value]="item">{{ item }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="admin-status">Estado</label>
            <select id="admin-status" class="form-select" [ngModel]="status()" (ngModelChange)="setStatus($event)">
              <option value="">Todos os estados</option>
              @for (item of statuses; track item) { <option [value]="item">{{ item }}</option> }
            </select>
          </div>
          <button type="button" class="reset" (click)="clear()" [disabled]="!hasFilters()">Limpar filtros</button>
        </form>

        @if (filtered().length) {
          <section class="table-card sinala-card">
            <div class="table-top">
              <span aria-live="polite"><strong>{{ filtered().length }}</strong> ocorrências encontradas</span>
              <span class="table-hint"><lucide-icon name="info"></lucide-icon> As alterações de estado são guardadas na base de dados.</span>
            </div>

            <div class="table-scroll">
              <table class="data-table">
                <caption class="sr-only">Ocorrências submetidas pela comunidade</caption>
                <thead>
                  <tr>
                    <th scope="col">Referência</th>
                    <th scope="col">Categoria</th>
                    <th scope="col">Província / município</th>
                    <th scope="col">Operador</th>
                    <th scope="col">Data</th>
                    <th scope="col">Classificação assistida</th>
                    <th scope="col">Anexo</th>
                    <th scope="col">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  @for (incident of pageItems(); track incident.id) {
                    <tr>
                      <td><strong class="ref">{{ incident.reference }}</strong></td>
                      <td><span class="category">{{ incident.category }}</span></td>
                      <td>{{ incident.province }}<small>{{ incident.municipality }}</small></td>
                      <td>{{ incident.provider || '—' }}</td>
                      <td>{{ incident.createdAt | date:'d MMM y':'':'pt-PT' }}</td>
                      <td><span class="ai-label"><lucide-icon name="sparkles"></lucide-icon>{{ incident.aiClassification || 'Pendente' }}</span></td>
                      <td>
                        @if (incident.hasAttachment) {
                          <a class="attachment-link" [href]="attachmentUrl(incident.reference)"><lucide-icon name="paperclip"></lucide-icon> Transferir</a>
                        } @else { <span class="muted">—</span> }
                      </td>
                      <td>
                        <span class="status-chip" [class]="statusClass(incident.status)">{{ incident.status }}</span>
                        <select class="form-select status-select" [ngModel]="incident.status" (ngModelChange)="changeStatus(incident.reference, $event)" [disabled]="saving() === incident.reference" [attr.aria-label]="'Alterar estado de ' + incident.reference">
                          @for (item of statuses; track item) { <option [value]="item">{{ item }}</option> }
                        </select>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <ul class="incident-list" aria-label="Ocorrências submetidas pela comunidade">
              @for (incident of pageItems(); track incident.id) {
                <li class="incident-card">
                  <div class="incident-card-top"><strong class="ref">{{ incident.reference }}</strong><span class="status-chip" [class]="statusClass(incident.status)">{{ incident.status }}</span></div>
                  <p class="incident-category">{{ incident.category }}</p>
                  <p class="incident-place">{{ incident.province }} · {{ incident.municipality }}</p>
                  <div class="incident-meta"><span>{{ incident.provider || 'Operadora não indicada' }}</span><span>{{ incident.createdAt | date:'d MMM y':'':'pt-PT' }}</span></div>
                  <div class="incident-actions">
                    <select class="form-select status-select" [ngModel]="incident.status" (ngModelChange)="changeStatus(incident.reference, $event)" [disabled]="saving() === incident.reference" [attr.aria-label]="'Alterar estado de ' + incident.reference">
                      @for (item of statuses; track item) { <option [value]="item">{{ item }}</option> }
                    </select>
                    @if (incident.hasAttachment) { <a class="attachment-link" [href]="attachmentUrl(incident.reference)"><lucide-icon name="paperclip"></lucide-icon> Anexo</a> }
                  </div>
                </li>
              }
            </ul>

            <nav class="pagination" aria-label="Paginação das ocorrências">
              <span aria-live="polite">A mostrar {{ firstItem() }}–{{ lastItem() }} de {{ filtered().length }}</span>
              <div class="pagination-controls">
                <button type="button" (click)="previousPage()" [disabled]="page() === 1" aria-label="Página anterior"><lucide-icon name="chevron-left"></lucide-icon></button>
                <span class="page-status">Página {{ page() }} de {{ totalPages() }}</span>
                <button type="button" (click)="nextPage()" [disabled]="page() >= totalPages()" aria-label="Página seguinte"><lucide-icon name="chevron-right"></lucide-icon></button>
              </div>
            </nav>
          </section>
        } @else {
          <section class="empty-panel">
            <span class="state-icon"><lucide-icon name="search-x"></lucide-icon></span>
            <strong>Nenhuma ocorrência corresponde aos filtros.</strong>
            <p>Altere os critérios ou limpe a pesquisa para ver todos os reportes.</p>
            <button type="button" class="button button-primary" (click)="clear()">Limpar filtros</button>
          </section>
        }
      }

      @if (message()) {
        <div class="inline-message" role="status" aria-live="polite"><lucide-icon name="circle-check-big"></lucide-icon>{{ message() }}</div>
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .admin-incidents { --navy: #00163f; --blue: #0060c0; --bright: #00a8f0; --ink: #24405f; --muted: #71809b; --line: #dfe7ef; color: #dce7ff; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }

    .page-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
    .overline { color: var(--bright); font-size: 11px; font-weight: 800; letter-spacing: 1.3px; }
    h1 { margin: 8px 0 6px; color: #fff; font-size: 26px; letter-spacing: -.8px; }
    .page-head p { margin: 0; color: #94a4bf; font-size: 12px; line-height: 1.5; }
    .button { display: inline-flex; align-items: center; gap: 8px; min-height: 38px; padding: 0 14px; border: 1px solid var(--bright); border-radius: 8px; background: var(--bright); color: var(--navy); font-size: 12px; font-weight: 800; cursor: pointer; }
    .button:hover:not(:disabled) { border-color: #5cc8ff; background: #5cc8ff; }
    .button:disabled { opacity: .5; cursor: default; }
    .button lucide-icon { width: 15px; height: 15px; }

    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 13px; }
    .kpi { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1px solid var(--line); border-radius: 10px; background: #fff; }
    .kpi-icon { display: grid; width: 38px; height: 38px; flex: 0 0 38px; place-items: center; border-radius: 9px; background: #e9f3ff; color: var(--blue); }
    .kpi-icon lucide-icon { width: 18px; height: 18px; }
    .kpi span { display: block; color: var(--muted); font-size: 11px; }
    .kpi strong { display: block; margin-top: 4px; color: var(--navy); font-size: 20px; line-height: 1; }

    .state-panel, .empty-panel { display: flex; flex-direction: column; align-items: center; padding: 42px 24px; border: 1px solid var(--line); border-radius: 12px; background: #fff; text-align: center; }
    .state-icon { display: grid; width: 44px; height: 44px; place-items: center; margin-bottom: 14px; border-radius: 50%; background: #e9f3ff; color: var(--blue); }
    .state-icon lucide-icon { width: 20px; height: 20px; }
    .state-panel--error .state-icon { background: #fff1f3; color: #b3263a; }
    .state-panel strong, .empty-panel strong { color: var(--navy); font-size: 16px; }
    .state-panel p, .empty-panel p { max-width: 420px; margin: 8px 0 18px; color: var(--muted); font-size: 12px; line-height: 1.6; }

    .filter-card { display: grid; grid-template-columns: minmax(200px, 1.6fr) repeat(3, minmax(130px, .8fr)) auto; gap: 12px; align-items: end; padding: 16px; border: 1px solid var(--line); border-radius: 10px; background: #fff; }
    .field label { display: block; margin-bottom: 6px; color: var(--navy); font-size: 11px; font-weight: 800; }
    .search-wrap { position: relative; }
    .search-wrap lucide-icon { position: absolute; top: 50%; left: 12px; width: 15px; height: 15px; color: #8798a7; transform: translateY(-50%); }
    .search-wrap .form-control { padding-left: 36px; }
    .form-control, .form-select { width: 100%; height: 38px; border: 1px solid #d6e0e8; border-radius: 7px; background: #f8fafb; color: var(--ink); font-size: 12px; }
    .reset { min-height: 38px; padding: 0 10px; border: 1px solid #d6e0e8; border-radius: 7px; background: #fff; color: var(--blue); font-size: 11px; font-weight: 800; cursor: pointer; }
    .reset:hover:not(:disabled) { border-color: var(--blue); background: #eaf3ff; }
    .reset:disabled { opacity: .45; cursor: default; }

    .table-card { margin-top: 13px; overflow: hidden; border: 1px solid var(--line); border-radius: 10px; background: #fff; }
    .table-top { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 14px 16px; border-bottom: 1px solid #edf1f4; color: var(--muted); font-size: 12px; }
    .table-top strong { color: var(--navy); font-size: 13px; }
    .table-hint { display: inline-flex; align-items: center; gap: 6px; }
    .table-hint lucide-icon { width: 14px; height: 14px; color: var(--blue); }
    .table-scroll { overflow-x: auto; }
    .data-table { width: 100%; min-width: 1000px; margin: 0; }
    .data-table th { padding: 12px; border-bottom: 1px solid #edf1f4; background: #f7f9fb; color: var(--muted); font-size: 10px; font-weight: 800; letter-spacing: .6px; text-align: left; text-transform: uppercase; white-space: nowrap; }
    .data-table td { padding: 12px; border-bottom: 1px solid #edf1f4; color: var(--ink); font-size: 12px; vertical-align: middle; white-space: nowrap; }
    .data-table tbody tr:last-child td { border-bottom: 0; }
    .data-table tbody tr:hover { background: #f8fbff; }
    .data-table td small { display: block; margin-top: 3px; color: var(--muted); font-size: 11px; }
    .ref { color: var(--blue); font-size: 12px; }
    .category { color: var(--navy); font-weight: 700; }
    .muted { color: var(--muted); }
    .ai-label { display: inline-flex; align-items: center; gap: 5px; color: var(--blue); font-size: 11px; }
    .ai-label lucide-icon { width: 13px; height: 13px; }
    .attachment-link { display: inline-flex; align-items: center; gap: 5px; color: var(--blue); font-size: 11px; font-weight: 700; text-decoration: none; }
    .attachment-link:hover { text-decoration: underline; }
    .attachment-link lucide-icon { width: 13px; height: 13px; }
    .status-chip { display: inline-flex; margin-bottom: 6px; padding: 4px 9px; border-radius: 99px; font-size: 10px; font-weight: 800; }
    .status-chip.pending { background: #e9f2ff; color: #003090; }
    .status-chip.review { background: #e6f0ff; color: var(--blue); }
    .status-chip.done { background: #e8f7ef; color: #247a55; }
    .status-select { width: 120px; height: 38px; min-height: 38px; font-size: 12px; }
    .status-select:disabled { opacity: .55; }

    .incident-list { display: none; }
    .pagination { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 13px 16px; border-top: 1px solid #edf1f4; color: var(--muted); font-size: 11px; }
    .pagination-controls { display: flex; align-items: center; gap: 9px; }
    .pagination button { display: grid; width: 30px; height: 30px; place-items: center; border: 1px solid #d6e0e8; border-radius: 7px; background: #fff; color: var(--navy); cursor: pointer; }
    .pagination button:hover:not(:disabled) { border-color: var(--blue); background: #eaf3ff; }
    .pagination button:disabled { opacity: .4; cursor: default; }
    .pagination lucide-icon { width: 14px; height: 14px; }
    .page-status { color: var(--navy); font-weight: 800; }

    .inline-message { display: flex; align-items: center; gap: 8px; margin-top: 13px; color: #247a55; font-size: 12px; font-weight: 700; }
    .inline-message lucide-icon { width: 15px; height: 15px; }

    @media (max-width: 1100px) {
      .filter-card { grid-template-columns: 1fr 1fr; }
      .field--search { grid-column: 1 / -1; }
      .reset { justify-self: start; }
      .kpis { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 760px) {
      .page-head { align-items: flex-start; flex-direction: column; }
      .table-scroll { display: none; }
      .incident-list { display: grid; gap: 10px; margin: 0; padding: 14px; list-style: none; }
      .incident-card { padding: 14px; border: 1px solid var(--line); border-radius: 9px; background: #fbfcfd; }
      .incident-card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
      .incident-card-top .status-chip { margin: 0; }
      .incident-category { margin: 10px 0 4px; color: var(--navy); font-size: 12px; font-weight: 800; }
      .incident-place { margin: 0; color: var(--muted); font-size: 11px; }
      .incident-meta { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; margin-top: 10px; color: var(--muted); font-size: 11px; }
      .incident-actions { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
      .table-top { align-items: flex-start; flex-direction: column; }
      .pagination { align-items: flex-start; flex-direction: column; }
    }
    @media (max-width: 520px) {
      .kpis { gap: 7px; }
      .kpi { padding: 11px; }
      .kpi strong { font-size: 17px; }
      .filter-card { grid-template-columns: 1fr; }
      .field--search { grid-column: auto; }
    }
  `],
})
export class AdminIncidentsComponent {
  private readonly incidentService = inject(IncidentService);
  private messageTimer?: number;

  readonly incidents = this.incidentService.incidents;
  readonly loading = this.incidentService.loading;
  readonly apiError = this.incidentService.error;
  readonly categories = INCIDENT_CATEGORIES;
  readonly provinces = ANGOLA_PROVINCES;
  readonly statuses: IncidentStatus[] = ['Recebido', 'Em análise', 'Classificado', 'Encerrado'];
  readonly query = signal('');
  readonly category = signal<IncidentCategory | ''>('');
  readonly province = signal('');
  readonly status = signal<IncidentStatus | ''>('');
  readonly message = signal('');
  readonly saving = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = 8;

  readonly filtered = computed(() => this.incidents().filter((incident) => {
    const text = this.query().trim().toLocaleLowerCase('pt-PT');
    const matchesText = !text || `${incident.reference} ${incident.provider} ${incident.province} ${incident.municipality} ${incident.category}`.toLocaleLowerCase('pt-PT').includes(text);
    return matchesText
      && (!this.category() || incident.category === this.category())
      && (!this.province() || incident.province === this.province())
      && (!this.status() || incident.status === this.status());
  }));
  readonly reviewing = computed(() => this.incidents().filter((item) => item.status === 'Em análise').length);
  readonly unclassified = computed(() => this.incidents().filter((item) => item.status === 'Recebido').length);
  readonly closed = computed(() => this.incidents().filter((item) => item.status === 'Encerrado').length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly pageItems = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly firstItem = computed(() => this.filtered().length ? (this.page() - 1) * this.pageSize + 1 : 0);
  readonly lastItem = computed(() => Math.min(this.page() * this.pageSize, this.filtered().length));
  readonly hasFilters = computed(() => !!this.query() || !!this.category() || !!this.province() || !!this.status());

  setQuery(value: string): void { this.query.set(value); this.page.set(1); }
  setCategory(value: IncidentCategory | ''): void { this.category.set(value); this.page.set(1); }
  setProvince(value: string): void { this.province.set(value); this.page.set(1); }
  setStatus(value: IncidentStatus | ''): void { this.status.set(value); this.page.set(1); }

  previousPage(): void { this.page.update((value) => Math.max(1, value - 1)); }
  nextPage(): void { this.page.update((value) => Math.min(this.totalPages(), value + 1)); }

  attachmentUrl(reference: string): string {
    return `${environment.apiBaseUrl}/admin/incidents/${encodeURIComponent(reference)}/attachment`;
  }

  async changeStatus(reference: string, status: IncidentStatus): Promise<void> {
    if (!this.statuses.includes(status)) {
      this.showMessage('Estado inválido; a ocorrência não foi alterada.');
      return;
    }
    this.saving.set(reference);
    try {
      await this.incidentService.updateStatus(reference, status);
      this.showMessage(`Estado de ${reference} actualizado.`);
    } catch (error: unknown) {
      console.error('Não foi possível actualizar o estado do reporte.', error);
      this.showMessage('Não foi possível actualizar o estado. Verifique a ligação à API.');
    } finally {
      this.saving.set(null);
    }
  }

  reload(): void {
    void this.incidentService.loadAdmin().catch(() => undefined);
  }

  clear(): void {
    this.query.set('');
    this.category.set('');
    this.province.set('');
    this.status.set('');
    this.page.set(1);
  }

  exportCsv(): void {
    const headers = ['Referência', 'Categoria', 'Província', 'Município', 'Operador', 'Data', 'Classificação', 'Estado'];
    const rows = this.filtered().map((item: Incident) => [
      item.reference, item.category, item.province, item.municipality,
      item.provider, item.createdAt, item.aiClassification, item.status,
    ]);
    const csv = [headers, ...rows].map((row: string[]) => row.map((field) => `"${field.replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sinala-ocorrencias.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  statusClass(status: IncidentStatus): string {
    if (status === 'Encerrado') return 'done';
    if (status === 'Em análise' || status === 'Classificado') return 'review';
    return 'pending';
  }

  private showMessage(text: string): void {
    window.clearTimeout(this.messageTimer);
    this.message.set(text);
    this.messageTimer = window.setTimeout(() => this.message.set(''), 3500);
  }
}
