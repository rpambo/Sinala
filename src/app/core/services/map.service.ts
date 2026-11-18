import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { Incident } from '../models/incident';

@Injectable({ providedIn: 'root' })
export class MapService {
  private readonly provinceCenters: Record<string, [number, number]> = {
    Luanda: [-8.8383, 13.2344],
    Benguela: [-12.5763, 13.4055],
    Huíla: [-14.9177, 13.4925],
    Huambo: [-12.7761, 15.7392],
    Cabinda: [-5.5500, 12.2000],
    Namibe: [-15.1961, 12.1522],
    Uíge: [-7.6087, 15.0613],
    Malanje: [-9.5402, 16.3410],
  };

  approximateCoordinates(province: string): [number, number] {
    return this.provinceCenters[province] ?? this.provinceCenters['Luanda'];
  }

  createMap(element: HTMLElement, center: [number, number] = [-8.8, 17.8]): L.Map {
    const map = L.map(element, { scrollWheelZoom: false, zoomControl: true })
      .setView(center, 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map);
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
        fillColor: incident.status === 'Encerrado' ? '#38a886' : '#20b9ca',
        fillOpacity: 0.95,
      });

      const popup = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = incident.category;
      const location = document.createElement('p');
      location.textContent = `${incident.municipality}, ${incident.province}`;
      const reference = document.createElement('small');
      reference.textContent = `${incident.reference} · dados de demonstração`;
      popup.append(title, location, reference);
      marker.bindPopup(popup).addTo(map);
    }
  }
}
