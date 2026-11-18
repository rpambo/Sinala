import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ANGOLA_PROVINCES, IncidentCategory, INCIDENT_CATEGORIES } from '../../core/models/incident';
import { IncidentService } from '../../core/services/incident.service';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, SinalaIconComponent],
  template: `
    <section class="page-wrap">
      <div class="page-head"><div><span class="overline">DADOS DA COMUNIDADE</span><h1>Explorar ocorrências</h1><p>Consulte os relatos recentes e filtre por zona ou tipo de problema.</p></div><a class="uk-button uk-button-primary" routerLink="/reportar"><lucide-icon name="plus"></lucide-icon>Reportar problema</a></div>
      <div class="summary-row"><div><strong>{{ filtered().length }}</strong><span>resultados nesta página</span></div><div><strong>{{ total() }}</strong><span>relatos registados</span></div><div class="notice"><lucide-icon name="info"></lucide-icon><span>Relatos comunitários; não representam falhas confirmadas.</span></div></div>
      <section class="filter-panel uk-card uk-card-default">
        <div class="search-wrap"><lucide-icon name="search"></lucide-icon><input class="uk-input" placeholder="Pesquisar referência, operador ou zona..." [ngModel]="query()" (ngModelChange)="query.set($event)"></div>
        <select class="uk-select" aria-label="Filtrar por categoria" [ngModel]="category()" (ngModelChange)="category.set($event)"><option value="">Todas as categorias</option>@for (item of categories; track item) { <option [value]="item">{{ item }}</option> }</select>
        <select class="uk-select" aria-label="Filtrar por província" [ngModel]="province()" (ngModelChange)="province.set($event)"><option value="">Todas as províncias</option>@for (item of provinces; track item) { <option [value]="item">{{ item }}</option> }</select>
        <select class="uk-select date-select" aria-label="Filtrar por período" [ngModel]="period()" (ngModelChange)="period.set($event)"><option value="all">Qualquer data</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select>
        <button type="button" class="clear-button" (click)="clear()">Limpar</button>
      </section>
      <section class="table-card uk-card uk-card-default">
        <div class="table-top"><span><strong>{{ pageItems().length }}</strong> ocorrências apresentadas</span><select class="uk-select sort-select" aria-label="Ordenar" [ngModel]="sort()" (ngModelChange)="sort.set($event)"><option value="newest">Mais recentes</option><option value="oldest">Mais antigas</option></select></div>
        <div class="table-scroll"><table class="uk-table uk-table-divider"><thead><tr><th>REFERÊNCIA</th><th>TIPO DE PROBLEMA</th><th>LOCALIZAÇÃO</th><th>OPERADOR</th><th>DATA</th><th>ESTADO</th><th></th></tr></thead><tbody>
          @for (incident of pageItems(); track incident.id) {
            <tr><td><button class="reference-button" type="button" (click)="selected.set(incident)">{{ incident.reference }}</button></td><td><span class="category-cell"><span class="category-dot" [class]="categoryClass(incident.category)"></span>{{ incident.category }}</span></td><td>{{ incident.municipality }}, {{ incident.province }}</td><td>{{ incident.provider || '—' }}</td><td>{{ incident.createdAt | date:'d MMM y':'':'pt-PT' }}</td><td><span class="status-chip" [class]="statusClass(incident.status)">{{ incident.status }}</span></td><td><a class="view-link" [routerLink]="['/acompanhar']" [queryParams]="{ reference: incident.reference }" aria-label="Ver estado"><lucide-icon name="arrow-up-right"></lucide-icon></a></td></tr>
          } @empty { <tr><td colspan="7" class="empty-state"><lucide-icon name="search-x"></lucide-icon><strong>Não encontrámos ocorrências</strong><span>Experimente alterar os filtros ou limpar a pesquisa.</span></td></tr> }
        </tbody></table></div>
        <div class="pagination"><span>Mostrando {{ pageItems().length ? (page() - 1) * pageSize + 1 : 0 }}–{{ (page() - 1) * pageSize + pageItems().length }} de {{ filtered().length }}</span><div><button type="button" (click)="previousPage()" [disabled]="page() === 1" aria-label="Página anterior"><lucide-icon name="chevron-left"></lucide-icon></button><span class="page-number">{{ page() }}</span><button type="button" (click)="nextPage()" [disabled]="page() >= totalPages()" aria-label="Página seguinte"><lucide-icon name="chevron-right"></lucide-icon></button></div></div>
      </section>
      @if (selected(); as incident) {
        <div class="modal-backdrop" (click)="selected.set(null)" (keydown.escape)="selected.set(null)">
          <section class="detail-modal uk-card uk-card-default" role="dialog" aria-modal="true" aria-labelledby="modal-title" (click)="$event.stopPropagation()">
            <button type="button" class="modal-close" aria-label="Fechar" (click)="selected.set(null)"><lucide-icon name="x"></lucide-icon></button>
            <span class="overline">DETALHE DO REPORTE</span><h2 id="modal-title">{{ incident.reference }}</h2><p class="modal-category">{{ incident.category }}</p><p>A descrição detalhada é reservada à equipa responsável para proteger a privacidade dos participantes.</p><div class="modal-location"><lucide-icon name="map-pin"></lucide-icon>{{ incident.municipality }}, {{ incident.province }}</div><a class="uk-button uk-button-primary" [routerLink]="['/acompanhar']" [queryParams]="{ reference: incident.reference }" (click)="selected.set(null)">Acompanhar estado</a>
          </section>
        </div>
      }
    </section>
  `,
  styles: [`
    :host { display:block; min-height:70vh; background:#f7f9fb; }
    .page-wrap { max-width:1250px; margin:auto; padding:43px 24px 65px; }
    .page-head { display:flex; justify-content:space-between; align-items:end; gap:15px; }
    .overline { color:#229ca5; font-size:9px; font-weight:800; letter-spacing:1.1px; }
    h1 { margin:8px 0 7px; color:#101a33; font-size:32px; letter-spacing:-1px; }
    .page-head p { margin:0; color:#7f899a; font-size:11px; }
    .page-head .uk-button { display:flex; align-items:center; gap:7px; min-height:38px; padding:0 13px; border-radius:7px; background:#0a122a; border-color:#0a122a; color:#fff; font-size:10px; font-weight:700; text-transform:none; white-space:nowrap; }
    .page-head lucide-icon { width:13px; height:13px; }
    .summary-row { display:flex; align-items:center; gap:30px; margin:22px 0 16px; }
    .summary-row > div:not(.notice) { display:flex; align-items:baseline; gap:6px; }
    .summary-row strong { color:#1b2741; font-size:15px; }.summary-row span { color:#8b95a6; font-size:9px; }
    .notice { display:flex; align-items:center; gap:7px; margin-left:auto; color:#7c8798; font-size:9px; }
    .notice lucide-icon { width:13px; height:13px; color:#249ba4; }
    .filter-panel { display:grid; grid-template-columns:minmax(220px,1.6fr) repeat(3,minmax(130px,.8fr)) auto; gap:8px; padding:13px; border:1px solid #e8edf1; border-radius:9px; }
    .search-wrap { position:relative; }.search-wrap lucide-icon { position:absolute; top:12px; left:10px; width:14px; height:14px; color:#98a1b0; }.search-wrap .uk-input { padding-left:31px; }
    .uk-input, .uk-select { height:38px; border-color:#e4e9ee; border-radius:6px; color:#5f6b80; font-size:9px; }
    .clear-button { border:0; background:transparent; color:#299ba4; font-size:9px; font-weight:700; cursor:pointer; }
    .table-card { margin-top:14px; overflow:hidden; border:1px solid #e8edf1; border-radius:9px; }
    .table-top { display:flex; justify-content:space-between; align-items:center; padding:15px 16px; color:#8c95a6; font-size:9px; }
    .table-top strong { color:#25314b; }
    .sort-select { width:126px; height:32px; }
    .table-scroll { overflow-x:auto; }
    .uk-table { min-width:850px; margin:0; }
    .uk-table thead th { padding:12px 13px; background:#fbfcfd; color:#8993a3; font-size:8px; font-weight:800; letter-spacing:.45px; white-space:nowrap; }
    .uk-table tbody td { padding:13px; color:#687388; font-size:9px; vertical-align:middle; white-space:nowrap; }
    .reference-button { border:0; padding:0; background:none; color:#278f98; font:inherit; font-weight:700; cursor:pointer; }
    .category-cell { display:inline-flex; align-items:center; gap:7px; color:#38445c; font-weight:600; }
    .category-dot { width:7px; height:7px; border-radius:50%; background:#23b7c1; }.category-dot.slow { background:#6774dc; }.category-dot.no { background:#e16e68; }.category-dot.cover { background:#dca243; }
    .status-chip { padding:5px 7px; border-radius:4px; font-size:8px; font-weight:700; }
    .status-chip.pending { background:#fff5e8; color:#b37a23; }.status-chip.review { background:#edf2ff; color:#596bd2; }.status-chip.done { background:#e8f7ef; color:#318d64; }
    .view-link { color:#7a8798; }.view-link lucide-icon { width:14px; height:14px; }
    .empty-state { height:160px; text-align:center; color:#98a1b0!important; }
    .empty-state lucide-icon, .empty-state strong, .empty-state span { display:block; margin:5px auto; }
    .empty-state lucide-icon { width:20px; height:20px; color:#a8b3c0; }.empty-state strong { color:#49566d; font-size:11px; }.empty-state span { font-size:9px; }
    .pagination { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-top:1px solid #edf0f3; color:#929baa; font-size:9px; }
    .pagination > div { display:flex; align-items:center; gap:6px; }.pagination button { width:27px; height:27px; display:grid; place-items:center; border:1px solid #e5e9ee; border-radius:5px; background:#fff; color:#5b677c; cursor:pointer; }.pagination button:disabled { opacity:.4; cursor:default; }.pagination lucide-icon { width:13px; height:13px; }.page-number { width:25px; height:25px; display:grid; place-items:center; border-radius:5px; background:#0a122a; color:#fff!important; }
    .modal-backdrop { position:fixed; z-index:40; inset:0; display:grid; place-items:center; padding:18px; background:#08112688; }
    .detail-modal { position:relative; width:min(440px,100%); padding:25px; border-radius:12px; }.detail-modal h2 { margin:8px 0; color:#14203a; font-size:20px; }.detail-modal p { color:#788398; font-size:11px; line-height:1.6; }
    .modal-category { margin:0!important; color:#249ba4!important; font-weight:700; }.modal-close { position:absolute; top:15px; right:15px; border:0; background:none; color:#728096; cursor:pointer; }.modal-close lucide-icon { width:17px; height:17px; }
    .modal-location { display:flex; gap:7px; align-items:center; color:#657187; font-size:10px; }.modal-location lucide-icon { width:14px; height:14px; color:#249ba4; }
    .detail-modal .uk-button { display:inline-flex; align-items:center; margin-top:18px; min-height:38px; padding:0 13px; border-radius:6px; background:#0a122a; border-color:#0a122a; color:#fff; font-size:9px; text-transform:none; }
    @media(max-width:900px) { .filter-panel { grid-template-columns:1fr 1fr; }.search-wrap { grid-column:1/-1; }.clear-button { justify-self:start; }.summary-row { flex-wrap:wrap; gap:14px; }.notice { width:100%; margin-left:0; } }
    @media(max-width:560px) { .page-wrap { padding:32px 14px 50px; }.page-head { align-items:start; flex-direction:column; }.filter-panel { grid-template-columns:1fr; }.search-wrap { grid-column:auto; }.summary-row > div:not(.notice) { flex-direction:column; gap:2px; }.table-top { padding:12px; } }
  `],
})
export class IncidentsComponent {
  private readonly incidentService = inject(IncidentService);
  readonly categories = INCIDENT_CATEGORIES;
  readonly provinces = ANGOLA_PROVINCES;
  readonly query = signal('');
  readonly category = signal<IncidentCategory | ''>('');
  readonly province = signal('');
  readonly period = signal('all');
  readonly sort = signal('newest');
  readonly page = signal(1);
  readonly pageSize = 6;
  readonly selected = signal<ReturnType<IncidentService['filter']>[number] | null>(null);

  readonly filtered = computed(() => {
    const found = this.incidentService.filter({
      query: this.query(),
      category: this.category(),
      province: this.province(),
    });
    const filteredByPeriod = this.period() === 'all'
      ? found
      : found.filter((incident) => {
          const age = Date.now() - new Date(incident.createdAt).getTime();
          return age <= Number(this.period()) * 24 * 60 * 60 * 1000;
        });
    return [...filteredByPeriod].sort((a, b) => this.sort() === 'newest'
      ? b.createdAt.localeCompare(a.createdAt)
      : a.createdAt.localeCompare(b.createdAt));
  });
  readonly total = this.incidentService.total;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly pageItems = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));

  clear(): void {
    this.query.set('');
    this.category.set('');
    this.province.set('');
    this.period.set('all');
    this.page.set(1);
  }

  previousPage(): void {
    this.page.update((value) => Math.max(1, value - 1));
  }

  nextPage(): void {
    this.page.update((value) => Math.min(this.totalPages(), value + 1));
  }

  categoryClass(category: string): string {
    if (category === 'Internet lenta') return 'slow';
    if (category === 'Sem ligação') return 'no';
    if (category === 'Cobertura insuficiente') return 'cover';
    return '';
  }

  statusClass(status: string): string {
    if (status === 'Encerrado') return 'done';
    if (status === 'Em análise' || status === 'Classificado') return 'review';
    return 'pending';
  }
}
