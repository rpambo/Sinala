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
    <section>
      <div class="page-head"><div><span class="overline">GESTÃO DE DADOS</span><h1>Ocorrências</h1><p>Reveja, classifique e acompanhe os reportes submetidos.</p></div></div>
      <div class="kpis"><div><span>Total de reportes</span><strong>{{ incidents().length }}</strong></div><div><span>Em análise</span><strong>{{ reviewing() }}</strong></div><div><span>Por classificar</span><strong>{{ unclassified() }}</strong></div><div><span>Encerrados</span><strong>{{ closed() }}</strong></div></div>
      <section class="filter-card uk-card uk-card-default"><div class="search"><lucide-icon name="search"></lucide-icon><input class="uk-input" placeholder="Pesquisar referência, operador ou zona..." [ngModel]="query()" (ngModelChange)="query.set($event)"></div><select class="uk-select" aria-label="Filtrar categoria" [ngModel]="category()" (ngModelChange)="category.set($event)"><option value="">Todas as categorias</option>@for (item of categories; track item) {<option [value]="item">{{ item }}</option>}</select><select class="uk-select" aria-label="Filtrar província" [ngModel]="province()" (ngModelChange)="province.set($event)"><option value="">Todas as províncias</option>@for (item of provinces; track item) {<option [value]="item">{{ item }}</option>}</select><select class="uk-select" aria-label="Filtrar estado" [ngModel]="status()" (ngModelChange)="status.set($event)"><option value="">Todos os estados</option>@for (item of statuses; track item) {<option [value]="item">{{ item }}</option>}</select><button type="button" class="reset" (click)="clear()">Limpar</button></section>
      <section class="table-card uk-card uk-card-default"><div class="table-top"><span><strong>{{ filtered().length }}</strong> ocorrências encontradas</span><button type="button" class="export" (click)="exportCsv()"><lucide-icon name="download"></lucide-icon>Exportar CSV</button></div><div class="table-scroll"><table class="uk-table uk-table-divider"><thead><tr><th>REFERÊNCIA</th><th>CATEGORIA</th><th>PROVÍNCIA / MUNICÍPIO</th><th>OPERADOR</th><th>DATA</th><th>CLASSIFICAÇÃO ASSISTIDA</th><th>ANEXO</th><th>ESTADO</th></tr></thead><tbody>
        @for (incident of filtered(); track incident.id) {
          <tr><td><strong class="ref">{{ incident.reference }}</strong></td><td><span class="category">{{ incident.category }}</span></td><td>{{ incident.province }}<small>{{ incident.municipality }}</small></td><td>{{ incident.provider || '—' }}</td><td>{{ incident.createdAt | date:'d MMM y':'':'pt-PT' }}</td><td><span class="ai-label"><lucide-icon name="sparkles"></lucide-icon>{{ incident.aiClassification }}</span></td><td>@if (incident.hasAttachment) { <a [href]="attachmentUrl(incident.reference)">Transferir</a> } @else { — }</td><td><select class="uk-select status-select" [ngModel]="incident.status" (ngModelChange)="changeStatus(incident.reference, $event)" aria-label="Actualizar estado"><option value="Recebido">Recebido</option><option value="Em análise">Em análise</option><option value="Classificado">Classificado</option><option value="Encerrado">Encerrado</option></select></td></tr>
        } @empty { <tr><td colspan="8" class="empty">Sem ocorrências que correspondam aos filtros.</td></tr> }
      </tbody></table></div><div class="table-footer"><span>As alterações são guardadas na base de dados.</span><span>{{ filtered().length }} registos</span></div></section>
      @if (message()) { <div class="inline-message" role="status"><lucide-icon name="circle-check-big"></lucide-icon>{{ message() }}</div> }
    </section>
  `,
  styles: [`
    :host { display:block; }
    .page-head { display:flex; justify-content:space-between; align-items:end; gap:12px; margin-bottom:18px; }.overline { color:#8d97a8; font-size:8px; font-weight:800; letter-spacing:1px; }
    h1 { margin:7px 0 5px; color:#111b34; font-size:26px; letter-spacing:-.8px; }.page-head p { margin:0; color:#8993a3; font-size:10px; }
    .kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:13px; }.kpis > div { padding:13px 15px; border:1px solid #e8edf1; border-radius:8px; background:#fff; }.kpis span, .kpis strong { display:block; }.kpis span { color:#929baa; font-size:8px; }.kpis strong { margin-top:5px; color:#17213a; font-size:19px; }
    .filter-card { display:grid; grid-template-columns:minmax(210px,1.7fr) repeat(3,minmax(130px,.8fr)) auto; align-items:center; gap:8px; padding:12px; border:1px solid #e8edf1; border-radius:9px; }.search { position:relative; }.search lucide-icon { position:absolute; top:11px; left:10px; width:14px; height:14px; color:#97a0ae; }.uk-input,.uk-select { height:36px; border-color:#e4e9ee; border-radius:6px; color:#5f6b80; font-size:9px; }.search .uk-input { padding-left:31px; }.reset { border:0; background:none; color:#239ba5; font-size:9px; font-weight:700; cursor:pointer; }
    .table-card { margin-top:13px; overflow:hidden; border:1px solid #e8edf1; border-radius:9px; }.table-top { display:flex; justify-content:space-between; align-items:center; padding:13px 15px; color:#8993a3; font-size:9px; }.table-top strong { color:#29344c; }.export { display:flex; align-items:center; gap:6px; border:1px solid #e4e9ef; border-radius:6px; padding:7px 9px; background:#fff; color:#59667b; font-size:8px; font-weight:700; cursor:pointer; }.export lucide-icon { width:13px; height:13px; }
    .table-scroll { overflow-x:auto; }.uk-table { min-width:1050px; margin:0; }.uk-table th { padding:11px 12px; background:#fbfcfd; color:#8993a3; font-size:7px; font-weight:800; letter-spacing:.4px; white-space:nowrap; }.uk-table td { padding:12px; color:#697489; font-size:8px; vertical-align:middle; white-space:nowrap; }.uk-table td .ref { color:#168e98; }.uk-table td small { display:block; margin-top:3px; color:#9aa3b0; font-size:8px; }.category { color:#34405a; font-weight:600; }.ai-label { display:inline-flex; align-items:center; gap:5px; color:#7669c8; font-size:8px; }.ai-label lucide-icon { width:12px; height:12px; }
    .status-select { width:110px; height:28px; padding:0 6px; border-color:#e7ebef; font-size:8px; }.empty { height:120px; text-align:center; color:#929baa!important; }.table-footer { display:flex; justify-content:space-between; padding:11px 15px; border-top:1px solid #edf0f3; color:#9aa3b0; font-size:8px; }
    .inline-message { display:flex; align-items:center; gap:7px; margin-top:12px; color:#2b966d; font-size:9px; }.inline-message lucide-icon { width:14px; height:14px; }
    @media(max-width:900px) { .filter-card { grid-template-columns:1fr 1fr; }.search { grid-column:1/-1; }.kpis { grid-template-columns:repeat(2,1fr); } }
    @media(max-width:560px) { .page-head { align-items:flex-start; flex-direction:column; }.filter-card { grid-template-columns:1fr; }.search { grid-column:auto; }.kpis { gap:7px; }.kpis > div { padding:11px; } }
  `],
})
export class AdminIncidentsComponent {
  private readonly incidentService = inject(IncidentService);
  readonly incidents = this.incidentService.incidents;
  readonly categories = INCIDENT_CATEGORIES;
  readonly provinces = ANGOLA_PROVINCES;
  readonly statuses: IncidentStatus[] = ['Recebido', 'Em análise', 'Classificado', 'Encerrado'];
  readonly query = signal('');
  readonly category = signal<IncidentCategory | ''>('');
  readonly province = signal('');
  readonly status = signal<IncidentStatus | ''>('');
  readonly message = signal('');
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

  attachmentUrl(reference: string): string {
    return `${environment.apiBaseUrl}/admin/incidents/${encodeURIComponent(reference)}/attachment`;
  }

  async changeStatus(reference: string, status: IncidentStatus): Promise<void> {
    if (!this.statuses.includes(status)) {
      this.message.set('Estado inválido; a ocorrência não foi alterada.');
      return;
    }
    try {
      await this.incidentService.updateStatus(reference, status);
      this.message.set(`Estado de ${reference} actualizado.`);
      window.setTimeout(() => this.message.set(''), 3500);
    } catch (error: unknown) {
      console.error('Não foi possível actualizar o estado do reporte.', error);
      this.message.set('Não foi possível actualizar o estado. Verifique a ligação à API.');
    }
  }

  clear(): void {
    this.query.set('');
    this.category.set('');
    this.province.set('');
    this.status.set('');
  }

  exportCsv(): void {
    const headers = ['Referência', 'Categoria', 'Província', 'Município', 'Operador', 'Data', 'Classificação', 'Estado'];
    const rows = this.filtered().map((item) => [
      item.reference, item.category, item.province, item.municipality,
      item.provider, item.createdAt, item.aiClassification, item.status,
    ]);
    const csv = [headers, ...rows].map((row) => row.map((field) => `"${field.replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sinala-ocorrencias.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
}
