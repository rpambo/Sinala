import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ANGOLA_PROVINCES, Incident, IncidentCategory, INCIDENT_CATEGORIES } from '../../core/models/incident';
import { IncidentService } from '../../core/services/incident.service';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

type FilterKey = 'query' | 'category' | 'province' | 'period';

@Component({
  selector: 'app-incidents',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, SinalaIconComponent],
  template: `
    <section class="page-wrap">
      <header class="page-head">
        <div class="page-head-copy">
          <span class="overline"><i aria-hidden="true"></i>DADOS DA COMUNIDADE</span>
          <h1>Explorar ocorrências</h1>
          <p>Consulte os relatos recentes e filtre por zona, categoria ou período.</p>
        </div>
        <a class="button button-primary" routerLink="/reportar">
          <lucide-icon name="plus"></lucide-icon> Reportar problema
        </a>
      </header>

      <div class="summary-grid" aria-live="polite">
        <article class="stat-card">
          <span class="stat-icon"><lucide-icon name="scan-search"></lucide-icon></span>
          <div class="summary-item"><strong>{{ filtered().length }}</strong><span>resultados encontrados</span></div>
        </article>
        <article class="stat-card">
          <span class="stat-icon"><lucide-icon name="map-pin"></lucide-icon></span>
          <div class="summary-item"><strong>{{ total() }}</strong><span>relatos registados</span></div>
        </article>
        <article class="notice-card notice">
          <lucide-icon name="shield-check"></lucide-icon>
          <span>Relatos comunitários; não representam falhas confirmadas.</span>
        </article>
      </div>

      @if (loading()) {
        <section class="state-panel" role="status" aria-live="polite">
          <span class="state-icon"><lucide-icon name="radio"></lucide-icon></span>
          <strong>A carregar relatos…</strong>
          <p>A sincronizar com o mapa comunitário da SINALA.</p>
        </section>
      } @else if (apiError()) {
        <section class="state-panel state-panel--error" role="alert">
          <span class="state-icon"><lucide-icon name="circle-alert"></lucide-icon></span>
          <strong>Não foi possível carregar os relatos.</strong>
          <p>Confirme a ligação à API e tente novamente.</p>
          <button type="button" class="button button-primary" (click)="reload()">Tentar novamente</button>
        </section>
      } @else {
        <form class="filter-panel" (submit)="$event.preventDefault()" aria-label="Filtros de ocorrências">
          <div class="filter-head">
            <div class="filter-heading"><lucide-icon name="list-filter"></lucide-icon><h2>Refinar resultados</h2></div>
            <span class="filter-count">{{ activeFilters().length }} {{ activeFilters().length === 1 ? 'filtro ativo' : 'filtros ativos' }}</span>
          </div>
          <div class="filter-grid">
          <div class="field field--search">
            <label for="filter-search">Pesquisar</label>
            <div class="search-wrap">
              <lucide-icon name="search"></lucide-icon>
              <input id="filter-search" class="form-control" placeholder="Referência, operador ou zona" [ngModel]="query()" (ngModelChange)="setQuery($event)" />
            </div>
          </div>
          <div class="field">
            <label for="filter-category">Categoria</label>
            <select id="filter-category" class="form-select" [ngModel]="category()" (ngModelChange)="setCategory($event)">
              <option value="">Todas as categorias</option>
              @for (item of categories; track item) { <option [value]="item">{{ item }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="filter-province">Província</label>
            <select id="filter-province" class="form-select" [ngModel]="province()" (ngModelChange)="setProvince($event)">
              <option value="">Todas as províncias</option>
              @for (item of provinces; track item) { <option [value]="item">{{ item }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="filter-period">Período</label>
            <select id="filter-period" class="form-select" [ngModel]="period()" (ngModelChange)="setPeriod($event)">
              <option value="all">Qualquer data</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
            </select>
          </div>
          <button type="button" class="clear-button" (click)="clear()" [disabled]="!hasFilters()">Limpar filtros</button>
          </div>
          @if (activeFilters().length) {
            <ul class="filter-chips" aria-label="Filtros aplicados">
              @for (chip of activeFilters(); track chip.key) {
                <li><button type="button" (click)="removeFilter(chip.key)" [attr.aria-label]="'Remover filtro ' + chip.label">{{ chip.label }} <lucide-icon name="x"></lucide-icon></button></li>
              }
            </ul>
          }
        </form>

        @if (filtered().length) {
          <section class="table-card">
            <div class="table-top">
              <span class="table-summary"><strong>{{ pageItems().length }}</strong> ocorrências apresentadas@if (lastUpdated()) { <span class="updated">· Atualizado {{ lastUpdated() | date:'d MMM y, HH:mm':'':'pt-PT' }}</span> }</span>
              <div class="field field--sort">
                <label for="sort-order">Ordenar</label>
                <select id="sort-order" class="form-select sort-select" [ngModel]="sort()" (ngModelChange)="setSort($event)">
                  <option value="newest">Mais recentes</option>
                  <option value="oldest">Mais antigas</option>
                </select>
              </div>
            </div>

            <div class="table-scroll">
              <table class="data-table">
                <caption class="sr-only">Relatos comunitários filtrados</caption>
                <thead>
                  <tr>
                    <th scope="col">Referência</th>
                    <th scope="col">Tipo de problema</th>
                    <th scope="col">Localização</th>
                    <th scope="col">Operadora</th>
                    <th scope="col">Data</th>
                    <th scope="col">Estado</th>
                    <th scope="col"><span class="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (incident of pageItems(); track incident.id) {
                    <tr>
                      <td>
                        <button type="button" class="reference-button" (click)="openDetails(incident, $event)" [attr.aria-label]="'Ver detalhes do relato ' + incident.reference">{{ incident.reference }}</button>
                      </td>
                      <td><span class="category-cell"><span class="category-dot" [class]="categoryClass(incident.category)" aria-hidden="true"></span>{{ incident.category }}</span></td>
                      <td>{{ incident.municipality }}, {{ incident.province }}</td>
                      <td>{{ incident.provider || '—' }}</td>
                      <td>{{ incident.createdAt | date:'d MMM y':'':'pt-PT' }}</td>
                      <td><span class="status-chip" [class]="statusClass(incident.status)">{{ incident.status }}</span></td>
                      <td><a class="view-link" [routerLink]="['/acompanhar']" [queryParams]="{ reference: incident.reference }" [attr.aria-label]="'Acompanhar ' + incident.reference"><lucide-icon name="arrow-up-right"></lucide-icon></a></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <ul class="incident-list" aria-label="Relatos comunitários filtrados">
              @for (incident of pageItems(); track incident.id) {
                <li class="incident-card">
                  <div class="incident-card-top">
                    <button type="button" class="reference-button" (click)="openDetails(incident, $event)" [attr.aria-label]="'Ver detalhes do relato ' + incident.reference">{{ incident.reference }}</button>
                    <span class="status-chip" [class]="statusClass(incident.status)">{{ incident.status }}</span>
                  </div>
                  <strong class="incident-category"><span class="category-dot" [class]="categoryClass(incident.category)" aria-hidden="true"></span>{{ incident.category }}</strong>
                  <p class="incident-place">{{ incident.municipality }}, {{ incident.province }}</p>
                  <div class="incident-meta"><span>{{ incident.provider || 'Operadora não indicada' }}</span><span>{{ incident.createdAt | date:'d MMM y':'':'pt-PT' }}</span></div>
                  <a class="view-link view-link--labeled" [routerLink]="['/acompanhar']" [queryParams]="{ reference: incident.reference }">Acompanhar <lucide-icon name="arrow-up-right"></lucide-icon></a>
                </li>
              }
            </ul>

            <nav class="pagination" aria-label="Paginação dos relatos">
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
            @if (hasFilters()) {
              <strong>Nenhum relato corresponde aos filtros.</strong>
              <p>Altere os critérios ou limpe a pesquisa para ver todos os relatos.</p>
              <button type="button" class="button button-primary" (click)="clear()">Limpar filtros</button>
            } @else {
              <strong>Ainda não há relatos registados.</strong>
              <p>Seja a primeira pessoa a partilhar uma experiência de conectividade na sua zona.</p>
              <a class="button button-primary" routerLink="/reportar">Fazer um relato <lucide-icon name="arrow-right"></lucide-icon></a>
            }
          </section>
        }
      }

      @if (selected(); as incident) {
        <div class="modal-backdrop" (click)="closeDetails()">
          <section class="detail-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-description" (click)="$event.stopPropagation()">
            <button type="button" class="modal-close" aria-label="Fechar detalhes" (click)="closeDetails()"><lucide-icon name="x"></lucide-icon></button>
            <div class="modal-header">
              <span class="overline">DETALHE DO REPORTE</span>
              <h2 id="modal-title">{{ incident.reference }}</h2>
              <p id="modal-description" class="modal-lead">{{ incident.category }} · {{ incident.municipality }}, {{ incident.province }}</p>
            </div>
            <dl class="detail-grid">
              <div><dt>Estado</dt><dd><span class="status-chip" [class]="statusClass(incident.status)">{{ incident.status }}</span></dd></div>
              <div><dt>Operadora</dt><dd>{{ incident.provider || 'Não indicada' }}</dd></div>
              <div><dt>Bairro</dt><dd>{{ incident.neighborhood || 'Não indicado' }}</dd></div>
              <div><dt>Registado em</dt><dd>{{ incident.createdAt | date:'d MMM y, HH:mm':'':'pt-PT' }}</dd></div>
            </dl>
            <p class="privacy-note"><lucide-icon name="shield-check"></lucide-icon> A descrição detalhada é reservada à equipa responsável para proteger a privacidade de quem reportou.</p>
            <a class="button button-primary" [routerLink]="['/acompanhar']" [queryParams]="{ reference: incident.reference }" (click)="closeDetails()">
              Acompanhar estado <lucide-icon name="arrow-right"></lucide-icon>
            </a>
          </section>
        </div>
      }
    </section>
  `,
})
export class IncidentsComponent implements OnDestroy {
  private readonly incidentService = inject(IncidentService);
  private trigger: HTMLElement | null = null;
  private previousOverflow = '';

  readonly categories = INCIDENT_CATEGORIES;
  readonly provinces = ANGOLA_PROVINCES;
  readonly query = signal('');
  readonly category = signal<IncidentCategory | ''>('');
  readonly province = signal('');
  readonly period = signal('all');
  readonly sort = signal('newest');
  readonly page = signal(1);
  readonly pageSize = 6;
  readonly selected = signal<Incident | null>(null);
  readonly loading = this.incidentService.loading;
  readonly apiError = this.incidentService.error;

  readonly filtered = computed(() => {
    const found = this.incidentService.filter({
      query: this.query(),
      category: this.category(),
      province: this.province(),
    });
    const byPeriod = this.period() === 'all'
      ? found
      : found.filter((incident) => Date.now() - new Date(incident.createdAt).getTime() <= Number(this.period()) * 24 * 60 * 60 * 1000);
    return [...byPeriod].sort((a, b) => this.sort() === 'newest'
      ? b.createdAt.localeCompare(a.createdAt)
      : a.createdAt.localeCompare(b.createdAt));
  });
  readonly total = this.incidentService.total;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));
  readonly pageItems = computed(() => this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize));
  readonly firstItem = computed(() => this.filtered().length ? (this.page() - 1) * this.pageSize + 1 : 0);
  readonly lastItem = computed(() => Math.min(this.page() * this.pageSize, this.filtered().length));
  readonly hasFilters = computed(() => !!this.query() || !!this.category() || !!this.province() || this.period() !== 'all');
  readonly activeFilters = computed<Array<{ key: FilterKey; label: string }>>(() => {
    const chips: Array<{ key: FilterKey; label: string }> = [];
    if (this.query().trim()) chips.push({ key: 'query', label: `Pesquisa: ${this.query().trim()}` });
    if (this.category()) chips.push({ key: 'category', label: this.category() });
    if (this.province()) chips.push({ key: 'province', label: this.province() });
    if (this.period() !== 'all') chips.push({ key: 'period', label: this.period() === '7' ? 'Últimos 7 dias' : 'Últimos 30 dias' });
    return chips;
  });
  readonly lastUpdated = computed(() => {
    const items = this.incidentService.incidents();
    return items.length ? [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].createdAt : '';
  });

  setQuery(value: string): void { this.query.set(value); this.page.set(1); }
  setCategory(value: IncidentCategory | ''): void { this.category.set(value); this.page.set(1); }
  setProvince(value: string): void { this.province.set(value); this.page.set(1); }
  setPeriod(value: string): void { this.period.set(value); this.page.set(1); }
  setSort(value: string): void { this.sort.set(value); this.page.set(1); }

  removeFilter(key: FilterKey): void {
    if (key === 'query') this.query.set('');
    if (key === 'category') this.category.set('');
    if (key === 'province') this.province.set('');
    if (key === 'period') this.period.set('all');
    this.page.set(1);
  }

  clear(): void {
    this.query.set('');
    this.category.set('');
    this.province.set('');
    this.period.set('all');
    this.page.set(1);
  }

  reload(): void {
    void this.incidentService.loadPublic().catch(() => undefined);
  }

  previousPage(): void {
    this.page.update((value) => Math.max(1, value - 1));
  }

  nextPage(): void {
    this.page.update((value) => Math.min(this.totalPages(), value + 1));
  }

  openDetails(incident: Incident, event: Event): void {
    this.trigger = event.currentTarget as HTMLElement;
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.selected.set(incident);
    window.setTimeout(() => document.querySelector<HTMLElement>('app-incidents .modal-close')?.focus(), 50);
  }

  closeDetails(): void {
    if (!this.selected()) return;
    this.selected.set(null);
    document.body.style.overflow = this.previousOverflow;
    this.trigger?.focus();
    this.trigger = null;
  }

  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.selected()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeDetails();
      return;
    }
    if (event.key !== 'Tab') return;
    const modal = document.querySelector<HTMLElement>('app-incidents .detail-modal');
    const focusable = modal
      ? [...modal.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])')]
      : [];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  ngOnDestroy(): void {
    if (this.selected()) document.body.style.overflow = this.previousOverflow;
  }

  categoryClass(category: string): string {
    if (category === 'Internet lenta') return 'slow';
    if (category === 'Sem ligação') return 'no';
    if (category === 'Interrupções frequentes') return 'frequent';
    if (category === 'Cobertura insuficiente') return 'cover';
    if (category === 'Instabilidade') return 'unstable';
    return '';
  }

  statusClass(status: string): string {
    if (status === 'Encerrado') return 'done';
    if (status === 'Em análise' || status === 'Classificado') return 'review';
    return 'pending';
  }
}
