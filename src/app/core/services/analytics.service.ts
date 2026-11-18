import { Injectable, computed, inject } from '@angular/core';
import { IncidentService } from './incident.service';

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly incidentService = inject(IncidentService);

  readonly categories = computed(() => {
    const counts = new Map<string, number>();
    for (const incident of this.incidentService.incidents()) {
      counts.set(incident.category, (counts.get(incident.category) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]);
  });

  readonly provinces = computed(() => {
    const counts = new Map<string, number>();
    for (const incident of this.incidentService.incidents()) {
      counts.set(incident.province, (counts.get(incident.province) ?? 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]);
  });

  readonly underReview = computed(() =>
    this.incidentService.incidents().filter((incident) => incident.status === 'Em análise').length,
  );
}
