import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IncidentCategory, INCIDENT_CATEGORIES, ANGOLA_PROVINCES } from '../../core/models/incident';
import { IncidentService } from '../../core/services/incident.service';
import { MapViewComponent } from '../../shared/components/map-view';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

@Component({
  selector: 'app-connectivity-map',
  standalone: true,
  imports: [FormsModule, RouterLink, SinalaIconComponent, MapViewComponent],
  template: `
    <section class="page-wrap">
      <div class="page-head"><div><span class="overline">VISÃO GEOGRÁFICA</span><h1>Mapa de conectividade</h1><p>Explore os relatos da comunidade por zona. Os pontos são aproximados e indicativos.</p></div><a class="button button-primary" routerLink="/reportar"><lucide-icon name="plus"></lucide-icon>Adicionar reporte</a></div>
      <div class="map-stats"><div><span class="map-stat-icon"><lucide-icon name="radio"></lucide-icon></span><div><small>Relatos no mapa</small><strong>{{ filtered().length }}</strong></div></div><div><span class="map-stat-icon purple"><lucide-icon name="map-pin"></lucide-icon></span><div><small>Províncias activas</small><strong>{{ activeProvinces() }}</strong></div></div><div class="map-disclaimer"><lucide-icon name="info"></lucide-icon><span>Dados reportados pela comunidade; não são confirmações oficiais de indisponibilidade.</span></div></div>
      <section class="map-card sinala-card">
        <div class="map-toolbar">
          <div class="map-title"><span class="live-dot"></span><strong>ANGOLA</strong><small>Mapa comunitário</small></div>
          <div class="filters">
            <select class="form-select" aria-label="Filtrar por província" [ngModel]="province()" (ngModelChange)="province.set($event)"><option value="">Todas as províncias</option>@for (item of provinces; track item) { <option [value]="item">{{ item }}</option> }</select>
            <select class="form-select" aria-label="Filtrar por categoria" [ngModel]="category()" (ngModelChange)="category.set($event)"><option value="">Todas as categorias</option>@for (item of categories; track item) { <option [value]="item">{{ item }}</option> }</select>
            <select class="form-select date-select" aria-label="Filtrar por período" [ngModel]="period()" (ngModelChange)="period.set($event)"><option value="all">Qualquer data</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select>
            <button type="button" class="clear" (click)="clear()">Limpar</button>
          </div>
        </div>
        <div class="map-area"><app-map-view [incidents]="filtered()"></app-map-view><div class="map-overlay"><span><i class="marker open"></i>Em acompanhamento</span><span><i class="marker closed"></i>Encerrado</span></div><div class="map-caption"><lucide-icon name="map-pin"></lucide-icon> Localização aproximada · não são mostradas moradas pessoais</div></div>
        <div class="map-footer"><span>Contorno de Angola · Natural Earth</span><span>{{ filtered().length }} pontos apresentados</span></div>
      </section>
      <section class="bottom-note"><span class="note-icon"><lucide-icon name="shield-check"></lucide-icon></span><div><strong>Privacidade por desenho</strong><p>As localizações são aproximadas à zona ou município indicado. Os relatos não identificam endereços individuais nem confirmam problemas nos operadores.</p></div></section>
    </section>
  `,
  styles: [`
    :host { display:block; min-height:70vh; background:#f4f6f7; }
    .page-wrap { max-width:1320px; margin:auto; padding:38px 24px 60px; }
    .page-head { display:flex; justify-content:space-between; align-items:end; gap:16px; }
    .overline { color:#0060c0; font-size:11px; font-weight:800; letter-spacing:1.1px; }
    h1 { margin:8px 0 6px; color:#00163f; font-size:32px; letter-spacing:-1px; }
    .page-head p { margin:0; color:#62748a; font-size:11px; }
    .page-head .button { display:flex; align-items:center; gap:7px; min-height:37px; padding:0 13px; border-radius:7px; background:#00163f; border-color:#00163f; color:#fff; font-size:12px; font-weight:700; text-transform:none; white-space:nowrap; }.page-head lucide-icon { width:13px; height:13px; }
    .map-stats { display:flex; align-items:center; gap:28px; margin:23px 0 14px; }
    .map-stats > div:not(.map-disclaimer) { display:flex; align-items:center; gap:10px; }
    .map-stat-icon { width:34px; height:34px; display:grid; place-items:center; border-radius:9px; background:#e9f3ff; color:#0060c0; }.map-stat-icon lucide-icon { width:16px; height:16px; }.map-stat-icon.purple { background:#eef0ff; color:#003090; }
    .map-stats small, .map-stats strong { display:block; }.map-stats small { color:#62748a; font-size:11px; }.map-stats strong { margin-top:3px; color:#00163f; font-size:16px; }
    .map-disclaimer { display:flex; align-items:center; gap:7px; margin-left:auto; color:#8290a1; font-size:11px; max-width:410px; line-height:1.5; }.map-disclaimer lucide-icon { width:14px; height:14px; flex:0 0 14px; color:#0060c0; }
    .map-card { overflow:hidden; border:1px solid #dbe3e7; border-radius:10px; }
    .map-toolbar { display:flex; justify-content:space-between; align-items:center; gap:15px; padding:13px 15px; border-bottom:1px solid #e6edf0; }
    .map-title { display:flex; align-items:center; gap:8px; white-space:nowrap; }.map-title strong { color:#00163f; font-size:12px; letter-spacing:.6px; }.map-title small { color:#62748a; font-size:11px; }
    .live-dot { width:6px; height:6px; border-radius:50%; background:#0090f0; box-shadow:0 0 0 4px #0090f020; }
    .filters { display:flex; align-items:center; gap:7px; }
    .form-select { width:145px; height:34px; border-color:#dbe3e7; border-radius:6px; color:#4d6074; font-size:11px; }
    .clear { display:inline-flex; align-items:center; min-height:32px; border:0; background:none; color:#0060c0; font-size:11px; font-weight:700; cursor:pointer; }
    .map-area { position:relative; height:min(62vh, 570px); min-height:370px; }
    .map-area app-map-view { height:100%; }
    .map-overlay { position:absolute; z-index:500; top:14px; left:14px; display:flex; gap:13px; padding:10px 12px; border:1px solid #e7ebef; border-radius:7px; background:#fff; box-shadow:0 3px 12px #00163f12; }
    .map-overlay span { display:flex; align-items:center; gap:6px; color:#4d6074; font-size:12px; font-weight:600; }.marker { width:8px; height:8px; border:2px solid #fff; border-radius:50%; background:#00a8f0; box-shadow:0 0 0 1px #00a8f0; }.marker.closed { background:#38a886; box-shadow:0 0 0 1px #38a886; }
    .map-caption { position:absolute; z-index:500; left:14px; bottom:14px; display:flex; align-items:center; gap:6px; padding:8px 10px; border:1px solid #e7ebef; border-radius:6px; background:#fff; color:#62748a; font-size:12px; }.map-caption lucide-icon { width:12px; height:12px; color:#0090f0; }
    .map-footer { display:flex; justify-content:space-between; padding:10px 14px; border-top:1px solid #e6edf0; color:#62748a; font-size:12px; }
    .bottom-note { display:flex; align-items:flex-start; gap:10px; margin-top:15px; padding:14px; border-radius:8px; background:#e9f3ff; }.note-icon { width:28px; height:28px; flex:0 0 28px; display:grid; place-items:center; border-radius:8px; background:#d6eaff; color:#0060c0; }.note-icon lucide-icon { width:14px; height:14px; }.bottom-note strong { color:#003090; font-size:12px; }.bottom-note p { margin:4px 0 0; color:#62748a; font-size:11px; line-height:1.5; }
    @media(max-width:900px) { .map-toolbar { align-items:flex-start; flex-direction:column; }.filters { width:100%; flex-wrap:wrap; }.form-select { flex:1; min-width:140px; }.map-disclaimer { max-width:300px; } }
    @media(max-width:600px) { .page-wrap { padding:30px 14px 45px; }.page-head { align-items:flex-start; flex-direction:column; }.map-stats { flex-wrap:wrap; gap:12px 20px; }.map-disclaimer { width:100%; max-width:none; margin:0; }.map-area { height:60vh; min-height:340px; }.map-overlay { flex-direction:column; gap:7px; }.form-select { height:42px; font-size:16px; } }
  `],
})
export class ConnectivityMapComponent {
  private readonly incidentService = inject(IncidentService);
  readonly categories = INCIDENT_CATEGORIES;
  readonly provinces = ANGOLA_PROVINCES;
  readonly province = signal('');
  readonly category = signal<IncidentCategory | ''>('');
  readonly period = signal('all');
  readonly filtered = computed(() => {
    const list = this.incidentService.filter({ province: this.province(), category: this.category() });
    if (this.period() === 'all') return list;
    return list.filter((incident) => Date.now() - new Date(incident.createdAt).getTime() <= Number(this.period()) * 86400000);
  });
  readonly activeProvinces = computed(() => new Set(this.filtered().map((incident) => incident.province)).size);

  clear(): void {
    this.province.set('');
    this.category.set('');
    this.period.set('all');
  }
}
