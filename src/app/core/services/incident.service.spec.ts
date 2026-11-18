import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Incident } from '../models/incident';
import { IncidentService } from './incident.service';

describe('IncidentService', () => {
  let service: IncidentService;
  let http: HttpTestingController;
  const incident: Incident = {
    id: 'report-1',
    reference: 'SNL-2026-ABCDE23456789',
    category: 'Internet lenta',
    description: 'A velocidade da ligação diminui durante a noite.',
    provider: 'Unitel',
    province: 'Luanda',
    municipality: 'Maianga',
    neighborhood: '',
    latitude: -8.8383,
    longitude: 13.2344,
    createdAt: new Date().toISOString(),
    status: 'Recebido',
    aiClassification: 'A aguardar análise',
    history: [{ status: 'Recebido', date: new Date().toISOString(), note: 'Reporte submetido.' }],
    hasAttachment: false,
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(IncidentService);
    http = TestBed.inject(HttpTestingController);
    const loading = service.loadPublic();
    http.expectOne('/api/incidents').flush([incident]);
    await loading;
  });

  afterEach(() => http.verify());

  it('uses persisted reports for totals and filters', () => {
    expect(service.total()).toBe(1);
    expect(service.filter({ province: 'Luanda', category: 'Internet lenta', query: 'unitel' })).toEqual([incident]);
  });

  it('looks up a report from the API without changing its reference', async () => {
    const lookup = service.findByReference('  snl-2026-abcde23456789 ');
    http.expectOne('/api/incidents/snl-2026-abcde23456789').flush(incident);

    await expectAsync(lookup).toBeResolvedTo(incident);
  });

  it('posts new reports as multipart data and adds the saved response to the list', async () => {
    const attachment = new File(['image'], 'context.png', { type: 'image/png' });
    const create = service.createIncident({
      category: 'Sem ligação',
      description: 'Sem acesso ao serviço na zona.',
      provider: '',
      province: 'Luanda',
      municipality: 'Maianga',
      neighborhood: '',
      latitude: -8.8383,
      longitude: 13.2344,
    }, attachment);
    const request = http.expectOne('/api/incidents');

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(jasmine.any(FormData));
    expect((request.request.body as FormData).get('attachment')).toEqual(jasmine.objectContaining({
      name: attachment.name,
      type: attachment.type,
    }));
    request.flush(incident);

    await expectAsync(create).toBeResolvedTo(incident);
    expect(service.total()).toBe(2);
  });

  it('persists administrative status changes through the API', async () => {
    const updated = { ...incident, status: 'Classificado' as const };
    const update = service.updateStatus(incident.reference, 'Classificado');
    const request = http.expectOne(`/api/admin/incidents/${incident.reference}/status`);

    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'Classificado' });
    request.flush(updated);

    await expectAsync(update).toBeResolvedTo(updated);
    expect(service.incidents()[0].status).toBe('Classificado');
  });
});
