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
      <div class="page-head"><div><span class="overline">VISÃO GEOGRÁFICA</span><h1>Mapa de conectividade</h1><p>Explore os relatos da comunidade por zona. Os pontos são aproximados e indicativos.</p></div><a class="uk-button uk-button-primary" routerLink="/reportar"><lucide-icon name="plus"></lucide-icon>Adicionar reporte</a></div>
      <div class="map-stats"><div><span class="map-stat-icon"><lucide-icon name="radio"></lucide-icon></span><div><small>Relatos no mapa</small><strong>{{ filtered().length }}</strong></div></div><div><span class="map-stat-icon purple"><lucide-icon name="map-pin"></lucide-icon></span><div><small>Províncias activas</small><strong>{{ activeProvinces() }}</strong></div></div><div class="map-disclaimer"><lucide-icon name="info"></lucide-icon><span>Dados reportados pela comunidade; não são confirmações oficiais de indisponibilidade.</span></div></div>
      <section class="map-card uk-card uk-card-default">
        <div class="map-toolbar">
          <div class="map-title"><span class="live-dot"></span><strong>ANGOLA</strong><small>Mapa comunitário</small></div>
          <div class="filters">
            <select class="uk-select" aria-label="Filtrar por província" [ngModel]="province()" (ngModelChange)="province.set($event)"><option value="">Todas as províncias</option>@for (item of provinces; track item) { <option [value]="item">{{ item }}</option> }</select>
            <select class="uk-select" aria-label="Filtrar por categoria" [ngModel]="category()" (ngModelChange)="category.set($event)"><option value="">Todas as categorias</option>@for (item of categories; track item) { <option [value]="item">{{ item }}</option> }</select>
            <select class="uk-select date-select" aria-label="Filtrar por período" [ngModel]="period()" (ngModelChange)="period.set($event)"><option value="all">Qualquer data</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option></select>
            <button type="button" class="clear" (click)="clear()">Limpar</button>
          </div>
        </div>
        <div class="map-area"><app-map-view [incidents]="filtered()"></app-map-view><div class="map-overlay"><span><i class="marker open"></i>Em acompanhamento</span><span><i class="marker closed"></i>Encerrado</span></div><div class="map-caption"><lucide-icon name="map-pin"></lucide-icon> Localização aproximada · não são mostradas moradas pessoais</div></div>
        <div class="map-footer"><span>Base cartográfica: OpenStreetMap</span><span>{{ filtered().length }} pontos apresentados</span></div>
      </section>
      <section class="bottom-note"><span class="note-icon"><lucide-icon name="shield-check"></lucide-icon></span><div><strong>Privacidade por desenho</strong><p>As localizações são aproximadas à zona ou município indicado. Os relatos não identificam endereços individuais nem confirmam problemas nos operadores.</p></div></section>
    </section>
  `,
  styles: [`
    :host { display:block; min-height:70vh; background:#f7f9fb; }
    .page-wrap { max-width:1320px; margin:auto; padding:38px 24px 60px; }
    .page-head { display:flex; justify-content:space-between; align-items:end; gap:16px; }
    .overline { color:#229ca5; font-size:9px; font-weight:800; letter-spacing:1.1px; }
    h1 { margin:8px 0 6px; color:#101a33; font-size:32px; letter-spacing:-1px; }
    .page-head p { margin:0; color:#7f899a; font-size:11px; }
    .page-head .uk-button { display:flex; align-items:center; gap:7px; min-height:37px; padding:0 13px; border-radius:7px; background:#0a122a; border-color:#0a122a; color:#fff; font-size:10px; font-weight:700; text-transform:none; white-space:nowrap; }.page-head lucide-icon { width:13px; height:13px; }
    .map-stats { display:flex; align-items:center; gap:28px; margin:23px 0 14px; }
    .map-stats > div:not(.map-disclaimer) { display:flex; align-items:center; gap:10px; }
    .map-stat-icon { width:34px; height:34px; display:grid; place-items:center; border-radius:9px; background:#e8f8f8; color:#159ca5; }.map-stat-icon lucide-icon { width:16px; height:16px; }.map-stat-icon.purple { background:#eef0ff; color:#6270da; }
    .map-stats small, .map-stats strong { display:block; }.map-stats small { color:#8792a3; font-size:9px; }.map-stats strong { margin-top:3px; color:#1c2841; font-size:16px; }
    .map-disclaimer { display:flex; align-items:center; gap:7px; margin-left:auto; color:#8290a1; font-size:9px; max-width:410px; line-height:1.5; }.map-disclaimer lucide-icon { width:14px; height:14px; flex:0 0 14px; color:#249ba4; }
    .map-card { overflow:hidden; border:1px solid #e6ebf0; border-radius:10px; }
    .map-toolbar { display:flex; justify-content:space-between; align-items:center; gap:15px; padding:13px 15px; border-bottom:1px solid #edf0f3; }
    .map-title { display:flex; align-items:center; gap:8px; white-space:nowrap; }.map-title strong { color:#28344c; font-size:10px; letter-spacing:.6px; }.map-title small { color:#9aa3b0; font-size:9px; }
    .live-dot { width:6px; height:6px; border-radius:50%; background:#27b99a; box-shadow:0 0 0 4px #27b99a20; }
    .filters { display:flex; align-items:center; gap:7px; }
    .uk-select { width:145px; height:34px; border-color:#e4e9ee; border-radius:6px; color:#5e6a7f; font-size:9px; }
    .clear { border:0; background:none; color:#249ba4; font-size:9px; font-weight:700; cursor:pointer; }
    .map-area { position:relative; height:min(62vh, 570px); min-height:370px; }
    .map-area app-map-view { height:100%; }
    .map-overlay { position:absolute; z-index:500; top:14px; left:14px; display:flex; gap:13px; padding:10px 12px; border:1px solid #e7ebef; border-radius:7px; background:#fff; box-shadow:0 3px 12px #0a122a12; }
    .map-overlay span { display:flex; align-items:center; gap:6px; color:#687388; font-size:8px; font-weight:600; }.marker { width:8px; height:8px; border:2px solid #fff; border-radius:50%; background:#20b9ca; box-shadow:0 0 0 1px #20b9ca; }.marker.closed { background:#38a886; box-shadow:0 0 0 1px #38a886; }
    .map-caption { position:absolute; z-index:500; left:14px; bottom:14px; display:flex; align-items:center; gap:6px; padding:8px 10px; border:1px solid #e7ebef; border-radius:6px; background:#fff; color:#7c8798; font-size:8px; }.map-caption lucide-icon { width:12px; height:12px; color:#219ba5; }
    .map-footer { display:flex; justify-content:space-between; padding:10px 14px; border-top:1px solid #edf0f3; color:#98a1af; font-size:8px; }
    .bottom-note { display:flex; align-items:flex-start; gap:10px; margin-top:15px; padding:14px; border-radius:8px; background:#eff8f7; }.note-icon { width:28px; height:28px; flex:0 0 28px; display:grid; place-items:center; border-radius:8px; background:#dff3f1; color:#1d9ca3; }.note-icon lucide-icon { width:14px; height:14px; }.bottom-note strong { color:#3e6e72; font-size:10px; }.bottom-note p { margin:4px 0 0; color:#6f8c90; font-size:9px; line-height:1.5; }
    @media(max-width:900px) { .map-toolbar { align-items:flex-start; flex-direction:column; }.filters { width:100%; flex-wrap:wrap; }.uk-select { flex:1; min-width:140px; }.map-disclaimer { max-width:300px; } }
    @media(max-width:600px) { .page-wrap { padding:30px 14px 45px; }.page-head { align-items:flex-start; flex-direction:column; }.map-stats { flex-wrap:wrap; gap:12px 20px; }.map-disclaimer { width:100%; max-width:none; margin:0; }.map-area { height:60vh; min-height:340px; }.map-overlay { flex-direction:column; gap:7px; }.date-select { display:none; } }
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
