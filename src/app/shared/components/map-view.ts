import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { Incident } from '../../core/models/incident';
import { MapService } from '../../core/services/map.service';

@Component({
  selector: 'app-map-view',
  standalone: true,
  template: '<div #map class="map-canvas" role="application" aria-label="Mapa de reportes de conectividade em Angola. Use as setas do teclado para deslocar o mapa e as teclas de zoom para ampliar."></div>',
  styles: [`
    :host { display: block; min-height: 100%; }
    .map-canvas { width: 100%; height: 100%; min-height: 320px; background: #00163f; }
    :host ::ng-deep .leaflet-container { background: #00163f; font-family: 'Manrope', sans-serif; }
    :host ::ng-deep .leaflet-pane.leaflet-angolaShape-pane path { filter: drop-shadow(0 0 6px #00a8f055); }
    :host ::ng-deep .leaflet-control-zoom a {
      width: 32px;
      height: 32px;
      line-height: 30px;
      border-color: #ffffff2e !important;
      color: #eaf3ff !important;
      background: #002866e6 !important;
    }
    :host ::ng-deep .leaflet-control-zoom a:hover { color: #fff !important; background: #003090 !important; }
    :host ::ng-deep .leaflet-popup-content-wrapper {
      border-radius: 10px;
      box-shadow: 0 10px 30px #00163f24;
    }
    :host ::ng-deep .leaflet-popup-content { margin: 12px 14px; color: #274055; font-size: 12px; line-height: 1.55; }
    :host ::ng-deep .leaflet-popup-content strong { color: #00163f; }
    :host ::ng-deep .leaflet-popup-content p { margin: 4px 0; }
    :host ::ng-deep .leaflet-popup-content small { color: #8290a1; }
    :host ::ng-deep .sinala-map-marker { filter: drop-shadow(0 2px 4px #00163f40); }
  `],
})
export class MapViewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('map', { static: true }) private mapElement!: ElementRef<HTMLDivElement>;
  @Input() incidents: Incident[] = [];
  /** When omitted the map is fitted to Angola. When set it focuses a province inside Angola. */
  @Input() center?: [number, number];

  private map?: L.Map;
  private appliedCenter?: [number, number];
  private resizeObserver?: ResizeObserver;

  constructor(private readonly mapService: MapService) {}

  ngAfterViewInit(): void {
    this.map = this.mapService.createMap(this.mapElement.nativeElement, this.center);
    this.appliedCenter = this.center ? [...this.center] : undefined;
    this.mapService.addMarkers(this.map, this.incidents);
    window.setTimeout(() => this.map?.invalidateSize(), 50);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
      this.resizeObserver.observe(this.mapElement.nativeElement);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.map) return;

    if (changes['center'] && !this.isSameCenter(this.appliedCenter, this.center)) {
      if (this.center) {
        this.map.setView(this.center, 8, { animate: true });
        this.appliedCenter = [...this.center];
      } else {
        this.map.fitBounds(this.mapService.angolaBounds, { padding: [16, 16], animate: true });
        this.appliedCenter = undefined;
      }
    }

    if (changes['incidents']) this.mapService.addMarkers(this.map, this.incidents);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  updateIncidents(incidents: Incident[]): void {
    this.incidents = incidents;
    if (this.map) this.mapService.addMarkers(this.map, incidents);
  }

  private isSameCenter(a?: [number, number], b?: [number, number]): boolean {
    if (a === b) return true;
    return !!a && !!b && a[0] === b[0] && a[1] === b[1];
  }
}
