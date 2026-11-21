import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { ANGOLA_BOUNDARY } from '../data/angola-boundary';
import { Incident } from '../models/incident';

@Injectable({ providedIn: 'root' })
export class MapService {
  private readonly provinceCenters: Record<string, [number, number]> = {
    Luanda: [-8.8383, 13.2344],
    Benguela: [-12.5763, 13.4055],
    Huíla: [-14.9177, 13.4925],
    Huambo: [-12.7761, 15.7392],
    Cabinda: [-5.55, 12.2],
    Namibe: [-15.1961, 12.1522],
    Uíge: [-7.6087, 15.0613],
    Malanje: [-9.5402, 16.341],
  };

  private readonly boundaryBounds = this.createBoundaryBounds();

  /** Geographic extent of Angola, derived from the real boundary geometry. */
  get angolaBounds(): L.LatLngBounds {
    return this.boundaryBounds;
  }

  approximateCoordinates(province: string): [number, number] {
    return this.provinceCenters[province] ?? this.provinceCenters['Luanda'];
  }

  createMap(element: HTMLElement, center?: [number, number]): L.Map {
    const map = L.map(element, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: false,
      minZoom: 4,
      maxZoom: 11,
      maxBounds: this.boundaryBounds.pad(0.15),
      maxBoundsViscosity: 1,
      zoomSnap: 0.25,
      worldCopyJump: false,
    });

    this.addAngolaShape(map);

    if (center) {
      map.setView(center, 8);
    } else {
      map.fitBounds(this.boundaryBounds, { padding: [24, 24] });
    }

    return map;
  }

  addMarkers(map: L.Map, incidents: Incident[]): void {
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    for (const incident of incidents) {
      const marker = L.circleMarker([incident.latitude, incident.longitude], {
        radius: 8,
        color: '#ffffff',
        weight: 2,
        fillColor: incident.status === 'Encerrado' ? '#38a886' : '#00a8f0',
        fillOpacity: 0.95,
        className: 'sinala-map-marker',
      });

      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = incident.category;
      const location = document.createElement('p');
      location.textContent = `${incident.municipality}, ${incident.province}`;
      const reference = document.createElement('small');
      reference.textContent = `${incident.reference} · relato da comunidade`;
      popup.append(title, location, reference);
      marker.bindPopup(popup, { maxWidth: 260 }).addTo(map);
    }
  }

  private createBoundaryBounds(): L.LatLngBounds {
    const points: L.LatLngTuple[] = [];
    for (const polygon of ANGOLA_BOUNDARY.coordinates) {
      for (const ring of polygon) {
        for (const point of ring) points.push([point[1], point[0]]);
      }
    }
    return L.latLngBounds(points);
  }

  private addAngolaShape(map: L.Map): void {
    const shapePane = map.createPane('angolaShape');
    shapePane.style.zIndex = '250';
    shapePane.style.pointerEvents = 'none';

    L.geoJSON(ANGOLA_BOUNDARY, {
      pane: 'angolaShape',
      interactive: false,
      style: {
        color: '#00a8f0',
        weight: 2,
        opacity: 1,
        fillColor: '#002866',
        fillOpacity: 1,
      },
    }).addTo(map);
  }
}
