import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { Incident } from '../../core/models/incident';
import { MapService } from '../../core/services/map.service';

@Component({
  selector: 'app-map-view',
  standalone: true,
  template: '<div #map class="map-canvas" role="application" aria-label="Mapa de reportes de conectividade"></div>',
  styles: [`
    :host { display: block; min-height: 100%; }
    .map-canvas { width: 100%; height: 100%; min-height: 320px; background: #e7eef0; }
    :host ::ng-deep .leaflet-popup-content-wrapper { border-radius: 12px; }
    :host ::ng-deep .leaflet-popup-content { line-height: 1.5; }
    :host ::ng-deep .leaflet-popup-content p { margin: 4px 0; }
  `],
})
export class MapViewComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('map', { static: true }) private mapElement!: ElementRef<HTMLDivElement>;
  @Input() incidents: Incident[] = [];
  @Input() center: [number, number] = [-8.8, 17.8];

  private map?: L.Map;

  constructor(private readonly mapService: MapService) {}

  ngAfterViewInit(): void {
    this.map = this.mapService.createMap(this.mapElement.nativeElement, this.center);
    this.mapService.addMarkers(this.map, this.incidents);
    window.setTimeout(() => this.map?.invalidateSize(), 50);
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (!this.map) return;
    this.map.setView(this.center, this.center[0] === -8.8 ? 5 : 10);
    this.mapService.addMarkers(this.map, this.incidents);
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  updateIncidents(incidents: Incident[]): void {
    this.incidents = incidents;
    if (this.map) this.mapService.addMarkers(this.map, incidents);
  }
}
