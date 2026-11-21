import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IncidentCategory, INCIDENT_CATEGORIES, ANGOLA_PROVINCES } from '../../core/models/incident';
import { IncidentService } from '../../core/services/incident.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { MapViewComponent } from '../../shared/components/map-view';
import { AnalyticsChartComponent } from '../../shared/components/analytics-chart';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [FormsModule, MapViewComponent, AnalyticsChartComponent, SinalaIconComponent],
  template: `
    <section>
      <div class="page-head"><div><span class="overline">ANÁLISE TERRITORIAL</span><h1>Distribuição geográfica</h1><p>Explore padrões agregados nos relatos de conectividade.</p></div><span class="demo-tag"><i></i> Dados comunitários</span></div>
      <div class="demo-banner"><lucide-icon name="info"></lucide-icon>As concentrações no mapa representam relatos da comunidade e não confirmam indisponibilidade de rede.</div>
      <div class="metric-row"><article><span class="metric-icon"><lucide-icon name="map-pin"></lucide-icon></span><div><small>Províncias com relatos</small><strong>{{ provincesActive() }} <i>/ 21</i></strong></div></article><article><span class="metric-icon blue"><lucide-icon name="radio"></lucide-icon></span><div><small>Relatos no filtro</small><strong>{{ filtered().length }}</strong></div></article><article><span class="metric-icon amber"><lucide-icon name="activity"></lucide-icon></span><div><small>Zona com mais relatos</small><strong class="top-zone">{{ topProvince() }}</strong></div></article><article><span class="metric-icon green"><lucide-icon name="clock-3"></lucide-icon></span><div><small>Em acompanhamento</small><strong>{{ reviewing() }}</strong></div></article></div>
      <section class="map-panel sinala-card"><div class="panel-head"><div><h2>Mapa de concentração</h2><p>Agregação por município · dados aproximados</p></div><div class="filters"><select class="form-select" aria-label="Filtrar província" [ngModel]="province()" (ngModelChange)="province.set($event)"><option value="">Todas as províncias</option>@for (item of provinceOptions; track item) {<option [value]="item">{{ item }}</option>}</select><select class="form-select" aria-label="Filtrar categoria" [ngModel]="category()" (ngModelChange)="category.set($event)"><option value="">Todas as categorias</option>@for (item of categories; track item) {<option [value]="item">{{ item }}</option>}</select><select class="form-select" aria-label="Filtrar período" [ngModel]="period()" (ngModelChange)="period.set($event)"><option value="all">Qualquer data</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select></div></div><div class="map-container"><app-map-view [incidents]="filtered()"></app-map-view><div class="map-key"><span><i class="dot cyan"></i>Em acompanhamento</span><span><i class="dot green"></i>Encerrado</span></div></div>      <div class="map-source">Contorno de Angola · Localizações aproximadas por município</div></section>
      <div class="charts"><section class="chart-panel sinala-card"><div class="panel-head"><div><h2>Relatos por categoria</h2><p>Distribuição no conjunto filtrado</p></div></div><app-analytics-chart title="Relatos por categoria" type="bar" [labels]="categoryLabels()" [values]="categoryValues()"></app-analytics-chart></section><section class="chart-panel sinala-card"><div class="panel-head"><div><h2>Relatos por operador</h2><p>Distribuição reportada pela comunidade</p></div></div><app-analytics-chart title="Relatos por operador" type="pie" [labels]="providerLabels()" [values]="providerValues()"></app-analytics-chart></section></div>
    </section>
  `,
  styles: [`
    :host { display:block; }.page-head { display:flex; align-items:end; justify-content:space-between; gap:12px; margin-bottom:15px; }.overline { color:#8d97a8; font-size:8px; font-weight:800; letter-spacing:1px; }.page-head h1 { margin:7px 0 5px; color:#00163f; font-size:26px; letter-spacing:-.8px; }.page-head p { margin:0; color:#8993a3; font-size:10px; }
    .demo-tag { display:flex; align-items:center; gap:7px; color:#929baa; font-size:9px; }.demo-tag i { width:6px; height:6px; border-radius:50%; background:#0090f0; }.demo-banner { display:flex; align-items:center; gap:8px; margin-bottom:13px; padding:10px 12px; border:1px solid #f1e4c9; border-radius:7px; background:#fffaf0; color:#9d7c40; font-size:9px; }.demo-banner lucide-icon { width:14px; height:14px; flex:0 0 14px; }
    .metric-row { display:grid; grid-template-columns:repeat(4,1fr); gap:9px; margin-bottom:13px; }.metric-row article { display:flex; align-items:center; gap:10px; padding:12px; border:1px solid #e8edf1; border-radius:8px; background:#fff; }.metric-icon { width:31px; height:31px; flex:0 0 31px; display:grid; place-items:center; border-radius:9px; background:#e9f3ff; color:#0060c0; }.metric-icon.blue { background:#eaf2ff; color:#003090; }.metric-icon.amber { background:#fff4e5; color:#d19a3f; }.metric-icon.green { background:#e8f7ef; color:#319a6e; }.metric-icon lucide-icon { width:15px; height:15px; }.metric-row small,.metric-row strong { display:block; }.metric-row small { color:#909aaa; font-size:8px; }.metric-row strong { margin-top:4px; color:#00163f; font-size:17px; }.metric-row strong i { color:#9aa3b0; font-size:9px; font-style:normal; }.metric-row .top-zone { font-size:12px; }
    .map-panel,.chart-panel { border:1px solid #e8edf1; border-radius:9px; }.map-panel { overflow:hidden; }.panel-head { display:flex; justify-content:space-between; align-items:start; gap:12px; padding:15px; }.panel-head h2 { margin:0; color:#00163f; font-size:12px; }.panel-head p { margin:4px 0 0; color:#929baa; font-size:8px; }.filters { display:flex; gap:6px; }.form-select { width:135px; height:30px; border-color:#e5e9ef; border-radius:5px; color:#6b7689; font-size:8px; }.map-container { position:relative; height:440px; }.map-container app-map-view { height:100%; }.map-key { position:absolute; z-index:500; top:12px; left:12px; display:flex; gap:11px; padding:9px 10px; border:1px solid #e8edf1; border-radius:6px; background:#fff; box-shadow:0 3px 12px #00123a10; }.map-key span { display:flex; align-items:center; gap:5px; color:#788397; font-size:8px; }.dot { width:7px; height:7px; border-radius:50%; }.dot.cyan { background:#00a8f0; }.dot.green { background:#38a886; }.map-source { padding:9px 13px; border-top:1px solid #edf0f3; color:#9aa3b0; font-size:8px; }
    .charts { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:13px; }.chart-panel { padding-bottom:10px; }.chart-panel app-analytics-chart { padding:0 14px; }
    @media(max-width:900px) { .metric-row { grid-template-columns:1fr 1fr; }.panel-head { flex-direction:column; }.filters { width:100%; flex-wrap:wrap; }.form-select { flex:1; min-width:130px; }.map-container { height:380px; } }
    @media(max-width:600px) { .page-head { align-items:flex-start; flex-direction:column; }.metric-row { gap:7px; }.metric-row article { padding:9px; }.metric-row small { font-size:7px; }.charts { grid-template-columns:1fr; }.map-container { height:340px; }.map-key { flex-direction:column; gap:7px; } }
  `],
})
export class AdminAnalyticsComponent {
  private readonly incidentService = inject(IncidentService);
  readonly analytics = inject(AnalyticsService);
  readonly provinceOptions = ANGOLA_PROVINCES;
  readonly categories = INCIDENT_CATEGORIES;
  readonly province = signal('');
  readonly category = signal<IncidentCategory | ''>('');
  readonly period = signal('all');
  readonly filtered = computed(() => {
    const records = this.incidentService.filter({ province: this.province(), category: this.category() });
    if (this.period() === 'all') return records;
    return records.filter((incident) => Date.now() - new Date(incident.createdAt).getTime() <= Number(this.period()) * 86400000);
  });
  readonly provincesActive = computed(() => new Set(this.filtered().map((incident) => incident.province)).size);
  readonly topProvince = computed(() => {
    const counts = new Map<string, number>();
    for (const incident of this.filtered()) counts.set(incident.province, (counts.get(incident.province) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  });
  readonly reviewing = computed(() => this.filtered().filter((incident) => incident.status === 'Em análise').length);
  readonly categoryLabels = computed(() => {
    const counts = new Map<string, number>();
    for (const incident of this.filtered()) counts.set(incident.category, (counts.get(incident.category) ?? 0) + 1);
    return [...counts.keys()];
  });
  readonly categoryValues = computed(() => {
    const counts = new Map<string, number>();
    for (const incident of this.filtered()) counts.set(incident.category, (counts.get(incident.category) ?? 0) + 1);
    return [...counts.values()];
  });
  readonly providerLabels = computed(() => [...new Set(this.filtered().map((incident) => incident.provider || 'Não indicado'))]);
  readonly providerValues = computed(() => this.providerLabels().map((provider) =>
    this.filtered().filter((incident) => (incident.provider || 'Não indicado') === provider).length,
  ));
}
