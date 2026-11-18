import { Injectable } from '@angular/core';
import { Incident } from '../models/incident';

export interface SimilarIncident {
  incident: Incident;
  similarity: number;
}

@Injectable({ providedIn: 'root' })
export class AiAnalysisService {
  findSimilar(incident: Incident, incidents: Incident[]): SimilarIncident[] {
    return incidents
      .filter((candidate) => candidate.id !== incident.id)
      .map((candidate) => ({
        incident: candidate,
        similarity: (candidate.category === incident.category ? 55 : 0)
          + (candidate.province === incident.province ? 25 : 0)
          + (candidate.provider === incident.provider ? 20 : 0),
      }))
      .filter((candidate) => candidate.similarity >= 25)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }

  summarize(incidents: Incident[]): string {
    if (!incidents.length) return 'Ainda não existem reportes suficientes para resumir.';
    const mainCategory = incidents.reduce((best, item, _, all) =>
      all.filter((candidate) => candidate.category === item.category).length
        > all.filter((candidate) => candidate.category === best.category).length ? item : best,
    );
    return `${incidents.length} reportes registados. “${mainCategory.category}” é a categoria mais frequente no conjunto actual.`;
  }
}
