import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Incident, IncidentCategory, IncidentStatus } from '../models/incident';

type NewIncident = Omit<Incident, 'id' | 'reference' | 'createdAt' | 'status' | 'aiClassification' | 'history' | 'hasAttachment'>;

@Injectable({ providedIn: 'root' })
export class IncidentService {
  private readonly http = inject(HttpClient);
  private readonly incidentState = signal<Incident[]>([]);
  private publicRequest: Promise<void> | null = null;
  readonly incidents = this.incidentState.asReadonly();
  readonly loading = signal(false);
  readonly error = signal('');
  readonly accountIncidents = signal<Incident[]>([]);
  readonly accountLoading = signal(false);
  readonly accountError = signal('');
  readonly total = computed(() => this.incidents().length);
  readonly receivedToday = computed(() => {
    const today = this.dayKey(new Date());
    return this.incidents().filter((incident) => this.dayKey(new Date(incident.createdAt)) === today).length;
  });

  loadPublic(): Promise<void> {
    if (this.publicRequest) return this.publicRequest;
    this.publicRequest = this.fetchIncidents(`${environment.apiBaseUrl}/incidents`)
      .catch((error: unknown) => {
        this.publicRequest = null;
        throw error;
      });
    return this.publicRequest;
  }

  async loadAdmin(): Promise<void> {
    this.incidentState.set([]);
    await this.fetchIncidents(`${environment.apiBaseUrl}/admin/incidents`);
  }

  async switchToPublic(): Promise<void> {
    this.incidentState.set([]);
    this.accountIncidents.set([]);
    this.publicRequest = null;
    await this.loadPublic();
  }

  async loadAccount(): Promise<void> {
    this.accountLoading.set(true);
    this.accountError.set('');
    try {
      const incidents = await firstValueFrom(this.http.get<Incident[]>(
        `${environment.apiBaseUrl}/account/incidents`, { withCredentials: true },
      ));
      this.accountIncidents.set(incidents);
    } catch (error: unknown) {
      this.accountIncidents.set([]);
      this.accountError.set('Não foi possível carregar os seus reportes. Tente novamente.');
      console.error('SINALA account request failed.', error);
      throw error;
    } finally {
      this.accountLoading.set(false);
    }
  }

  async findByReference(reference: string): Promise<Incident | null> {
    try {
      return await firstValueFrom(this.http.get<Incident>(
        `${environment.apiBaseUrl}/incidents/${encodeURIComponent(reference.trim())}`,
      ));
    } catch (error: unknown) {
      if (this.httpStatus(error) === 404) return null;
      throw error;
    }
  }

  async createIncident(input: NewIncident, attachment?: File): Promise<Incident> {
    const body = new FormData();
    body.set('category', input.category);
    body.set('provider', input.provider);
    body.set('description', input.description);
    body.set('province', input.province);
    body.set('municipality', input.municipality);
    body.set('neighborhood', input.neighborhood);
    if (attachment) body.set('attachment', attachment, attachment.name);

    try {
      const created = await firstValueFrom(this.http.post<Incident>(
        `${environment.apiBaseUrl}/incidents`, body, { withCredentials: true },
      ));
      this.incidentState.update((incidents) => [created, ...incidents]);
      this.error.set('');
      return created;
    } catch (error: unknown) {
      this.error.set('Não foi possível enviar o relato. Confirme a ligação à API e à base de dados.');
      throw error;
    }
  }

  async updateStatus(reference: string, status: IncidentStatus): Promise<Incident> {
    const updated = await firstValueFrom(this.http.patch<Incident>(
      `${environment.apiBaseUrl}/admin/incidents/${encodeURIComponent(reference)}/status`,
      { status },
      { withCredentials: true },
    ));
    this.incidentState.update((incidents) => incidents.map((incident) =>
      incident.reference === updated.reference ? updated : incident,
    ));
    this.error.set('');
    return updated;
  }

  filter(options: { query?: string; province?: string; category?: IncidentCategory | '' }): Incident[] {
    const query = options.query?.trim().toLocaleLowerCase('pt-PT') ?? '';
    return this.incidents().filter((incident) =>
      (!options.province || incident.province === options.province)
      && (!options.category || incident.category === options.category)
      && (!query || `${incident.reference} ${incident.category} ${incident.province} ${incident.municipality} ${incident.provider}`
        .toLocaleLowerCase('pt-PT').includes(query)),
    );
  }

  private async fetchIncidents(url: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const incidents = await firstValueFrom(this.http.get<Incident[]>(url, { withCredentials: true }));
      this.incidentState.set(incidents);
    } catch (error: unknown) {
      this.error.set('Não foi possível carregar os relatos. Confirme a ligação à API e à base de dados.');
      console.error('SINALA API request failed.', error);
      throw error;
    } finally {
      this.loading.set(false);
    }
  }

  private httpStatus(error: unknown): number | undefined {
    return typeof error === 'object' && error !== null && 'status' in error
      ? Number(error.status)
      : undefined;
  }

  private dayKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
