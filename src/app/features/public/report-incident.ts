import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IncidentCategory } from '../../core/models/incident';
import { ANGOLA_PROVINCES, INCIDENT_CATEGORIES } from '../../core/models/incident';
import { MapService } from '../../core/services/map.service';
import { IncidentService } from '../../core/services/incident.service';
import { NotificationService } from '../../core/services/notification.service';
import { MapViewComponent } from '../../shared/components/map-view';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

@Component({
  selector: 'app-report-incident',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MapViewComponent, SinalaIconComponent],
  template: `
    <section class="report-shell">
      <header class="report-heading">
        <div><span class="eyebrow"><i></i> CONTRIBUIÇÃO COMUNITÁRIA · ANGOLA</span><h1>Reportar problema de conectividade</h1><p>O seu relato ajuda a construir um mapa mais claro da experiência de rede no país.</p></div>
        <span class="privacy-chip"><lucide-icon name="shield-check"></lucide-icon> Privacidade por concepção</span>
      </header>
      @if (submittedReference()) {
        <section class="success-panel">
          <span class="success-icon"><lucide-icon name="circle-check-big"></lucide-icon></span><span class="eyebrow">RELATO REGISTADO</span>
          <h2>Obrigado por contribuir.</h2><p>O seu relato foi registado. Guarde esta referência para acompanhar o estado:</p>
          <strong class="reference">{{ submittedReference() }}</strong>
          <div class="success-actions"><a class="action-primary" [routerLink]="['/acompanhar']" [queryParams]="{ reference: submittedReference() }">Acompanhar relato <lucide-icon name="arrow-right"></lucide-icon></a><button type="button" class="action-secondary" (click)="startNew()">Registar outro</button></div>
          <small>Este relato é uma experiência comunitária e não confirma uma avaria técnica.</small>
        </section>
      } @else {
        <div class="wizard-layout">
          <main class="wizard-main">
            <nav class="stepper" aria-label="Etapas do relato">
              @for (label of stepLabels; track label; let i = $index) {
                <div class="step-node" [class.current]="step() === i + 1" [class.done]="step() > i + 1">
                  <span>{{ step() > i + 1 ? '✓' : '0' + (i + 1) }}</span><small>{{ label }}</small>
                </div>
                @if (i < stepLabels.length - 1) { <span class="step-line" [class.done]="step() > i + 1"></span> }
              }
            </nav>
            <form [formGroup]="form" (ngSubmit)="submit()" class="wizard-card">
              @if (step() === 1) {
                <div class="section-title"><span>ETAPA 01 / 04</span><h2>O que está a acontecer?</h2><p>Escolha a situação que melhor descreve a sua experiência.</p></div>
                <div class="category-grid" role="group" aria-label="Tipo de problema">
                  @for (category of categories; track category) {
                    <button type="button" class="category-choice" [class.chosen]="form.controls.category.value === category" [attr.aria-pressed]="form.controls.category.value === category" (click)="selectCategory(category)">
                      <lucide-icon [name]="category === 'Sem ligação' ? 'wifi-off' : 'signal'"></lucide-icon><span>{{ category }}</span>
                    </button>
                  }
                </div>
                @if (invalid('category')) { <small class="error">Seleccione uma categoria para continuar.</small> }
                <div class="signal-note"><lucide-icon name="info"></lucide-icon><span>Descreva apenas o que observou. Um relato não significa que a falha esteja confirmada pelo operador.</span></div>
              } @else if (step() === 2) {
                <div class="section-title"><span>ETAPA 02 / 04</span><h2>Onde acontece?</h2><p>Indique uma zona aproximada, não uma morada pessoal.</p></div>
                <div class="location-fields">
                  <div><label for="province">Província <b>*</b></label><select id="province" class="uk-select" formControlName="province" (change)="updateMapCenter()"><option value="">Seleccione a província</option>@for (province of provinces; track province) { <option [value]="province">{{ province }}</option> }</select>@if (invalid('province')) { <small class="error">Seleccione a província.</small> }</div>
                  <div><label for="municipality">Município <b>*</b></label><input id="municipality" class="uk-input" formControlName="municipality" placeholder="Ex.: Maianga">@if (invalid('municipality')) { <small class="error">Indique o município.</small> }</div>
                </div>
                <label for="neighborhood">Bairro <small>OPCIONAL</small></label><input id="neighborhood" class="uk-input" formControlName="neighborhood" placeholder="Ex.: Alvalade">
                <div class="map-preview-head"><span><lucide-icon name="map-pin"></lucide-icon> ZONA APROXIMADA</span><small>O ponto exacto não é publicado</small></div>
                <div class="map-preview"><app-map-view [incidents]="[]" [center]="mapCenter()"></app-map-view><span><lucide-icon name="crosshair"></lucide-icon> Centro provincial aproximado</span></div>
                <div class="signal-note"><lucide-icon name="shield-check"></lucide-icon><span>A localização pública é aproximada. Não recolhemos coordenadas precisas nem moradas pessoais.</span></div>
              } @else if (step() === 3) {
                <div class="section-title"><span>ETAPA 03 / 04</span><h2>Partilhe mais contexto</h2><p>Detalhes observáveis ajudam a organizar os relatos por padrão.</p></div>
                <label for="provider">Operadora <small>OPCIONAL</small></label><select id="provider" formControlName="provider" class="uk-select"><option value="">Prefiro não indicar</option><option>Unitel</option><option>Africell</option><option>Movicel</option><option>ZAP Fibra</option><option>TVCABO</option><option>Outra</option></select>
                <label for="description">Descrição do problema <b>*</b></label><textarea id="description" rows="5" formControlName="description" class="uk-textarea" placeholder="Quando começou? Acontece sempre ou em certos momentos? Não inclua nomes, contactos ou outros dados pessoais." [class.invalid]="invalid('description')"></textarea>
                <div class="field-footer"><span>{{ form.controls.description.value.length }}/500 caracteres</span>@if (invalid('description')) { <small class="error">Escreva pelo menos 12 caracteres.</small> }</div>
                <label class="upload-box" for="attachment"><lucide-icon name="paperclip"></lucide-icon><span><strong>{{ fileName() || 'Adicionar imagem de contexto' }}</strong><small>Opcional · JPEG, PNG ou WebP · até 5 MB</small></span><input id="attachment" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" (change)="onFile($event)"></label>
                @if (errorMessage()) { <small class="error">{{ errorMessage() }}</small> }
              } @else {
                <div class="section-title"><span>ETAPA 04 / 04</span><h2>Reveja antes de enviar</h2><p>Confirme o resumo e a declaração de privacidade.</p></div>
                <div class="review-card">
                  <div><span>TIPO DE RELATO</span><strong>{{ form.controls.category.value || '—' }}</strong></div>
                  <div><span>LOCALIZAÇÃO APROXIMADA</span><strong>{{ form.controls.municipality.value || '—' }}, {{ form.controls.province.value || '—' }}<small>{{ form.controls.neighborhood.value || 'Bairro não indicado' }}</small></strong></div>
                  <div><span>OPERADORA</span><strong>{{ form.controls.provider.value || 'Não indicada' }}</strong></div>
                  <div><span>DESCRIÇÃO</span><strong class="review-description">{{ form.controls.description.value || '—' }}</strong></div>
                  <div><span>ANEXO</span><strong>{{ fileName() || 'Sem anexo' }}</strong></div>
                </div>
                <label class="consent"><input type="checkbox" formControlName="consent"><span>Confirmo que este relato descreve a minha experiência e não inclui informações pessoais.</span></label>
                @if (submitted() && form.controls.consent.invalid) { <small class="error">Confirme a declaração para enviar.</small> }
                @if (errorMessage()) { <p class="error">{{ errorMessage() }}</p> }
              }
              <footer class="wizard-actions">
                @if (step() > 1) { <button type="button" class="action-secondary" (click)="previous()"><lucide-icon name="arrow-left"></lucide-icon> Voltar</button> } @else { <span></span> }
                @if (step() < 4) { <button type="button" class="action-primary" (click)="next()">Continuar <lucide-icon name="arrow-right"></lucide-icon></button> }
                @else { <button type="submit" class="action-primary" [disabled]="loading()">{{ loading() ? 'A enviar…' : 'Enviar relato' }} <lucide-icon name="arrow-right"></lucide-icon></button> }
              </footer>
            </form>
            <p class="form-disclaimer"><lucide-icon name="info"></lucide-icon> Relatos comunitários são indicativos e não representam confirmação técnica de avaria.</p>
          </main>
          <aside class="report-aside">
            <section class="radar-card">
              <div class="aside-heading"><span><i></i> SINALA RADAR</span><small>RELATOS COMUNITÁRIOS</small></div>
              <div class="radar-visual"><div class="radar-ring ring-one"></div><div class="radar-ring ring-two"></div><div class="radar-ring ring-three"></div><span class="radar-center"><lucide-icon name="radio"></lucide-icon></span><i class="radar-ping p1"></i><i class="radar-ping p2"></i><i class="radar-ping p3"></i></div>
              <strong class="radar-state">A observar relatos</strong><p>Indicadores de interface ilustrativos. Não representam medições de rede em tempo real.</p>
              <div class="radar-stats"><span>ESTADO DO SERVIÇO <b>Reportes comunitários</b></span><span>CONFIRMAÇÃO TÉCNICA <b>Não disponível</b></span></div>
            </section>
            <section class="aside-card"><span class="aside-icon"><lucide-icon name="shield-check"></lucide-icon></span><h3>Privacidade em primeiro lugar</h3><p>Partilhe apenas a zona aproximada. Evite nomes, números de telefone e moradas na descrição.</p><div class="privacy-foot"><lucide-icon name="lock-keyhole"></lucide-icon> O relato é guardado de forma segura.</div></section>
            <section class="aside-card process-card"><span class="aside-overline">O QUE ACONTECE A SEGUIR</span><ol><li><b>01</b><span>É criada uma referência única para acompanhar o relato.</span></li><li><b>02</b><span>O registo aparece no mapa com localização aproximada.</span></li><li><b>03</b><span>Relatos semelhantes podem ser agrupados para análise.</span></li></ol></section>
          </aside>
        </div>
      }
    </section>
  `,
  styles: [],
})
export class ReportIncidentComponent {
  private readonly incidentService = inject(IncidentService);
  private readonly notifications = inject(NotificationService);
  private readonly mapService = inject(MapService);
  readonly form = new FormGroup({
    category: new FormControl<IncidentCategory | ''>('', { validators: [Validators.required] }),
    provider: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(12), Validators.maxLength(500)] }),
    province: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    municipality: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(2)] }),
    neighborhood: new FormControl('', { nonNullable: true }),
    consent: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
  });
  readonly categories = INCIDENT_CATEGORIES;
  readonly provinces = ANGOLA_PROVINCES;
  readonly stepLabels = ['Problema', 'Localização', 'Contexto', 'Revisão'];
  readonly step = signal(1);
  readonly mapCenter = signal<[number, number]>([-8.8, 17.8]);
  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly submittedReference = signal('');
  readonly fileName = signal('');
  readonly attachment = signal<File | undefined>(undefined);
  readonly errorMessage = signal('');

  invalid(control: keyof typeof this.form.controls): boolean {
    return this.form.controls[control].invalid && this.form.controls[control].touched;
  }

  selectCategory(category: IncidentCategory): void {
    this.form.controls.category.setValue(category);
    this.form.controls.category.markAsTouched();
  }

  updateMapCenter(): void {
    const province = this.form.controls.province.value;
    if (province) this.mapCenter.set(this.mapService.approximateCoordinates(province));
  }

  next(): void {
    if (this.step() === 1) {
      this.form.controls.category.markAsTouched();
      if (this.form.controls.category.invalid) return;
    } else if (this.step() === 2) {
      this.form.controls.province.markAsTouched();
      this.form.controls.municipality.markAsTouched();
      if (this.form.controls.province.invalid || this.form.controls.municipality.invalid) return;
    } else if (this.step() === 3) {
      this.form.controls.description.markAsTouched();
      if (this.form.controls.description.invalid) return;
    }
    this.step.update((value) => Math.min(value + 1, 4));
  }

  previous(): void {
    this.errorMessage.set('');
    this.step.update((value) => Math.max(value - 1, 1));
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.fileName.set('');
      this.attachment.set(undefined);
      this.errorMessage.set('Escolha uma imagem com até 5 MB.');
      input.value = '';
      return;
    }
    this.errorMessage.set('');
    this.fileName.set(file.name);
    this.attachment.set(file);
  }

  async submit(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { category, provider, description, province, municipality, neighborhood } = this.form.getRawValue();
    if (!category || !province || !municipality) {
      this.errorMessage.set('Preencha os campos obrigatórios para continuar.');
      return;
    }

    this.loading.set(true);
    try {
      const [latitude, longitude] = this.mapService.approximateCoordinates(province);
      const incident = await this.incidentService.createIncident({
        category,
        provider,
        description,
        province,
        municipality,
        neighborhood,
        latitude,
        longitude,
      }, this.attachment());
      this.submittedReference.set(incident.reference);
      this.notifications.show('Relato enviado com sucesso.');
    } catch (error) {
      console.error('Não foi possível enviar o relato.', error);
      this.errorMessage.set('Não foi possível enviar o relato. Confirme a ligação à API e tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  startNew(): void {
    this.form.reset();
    this.step.set(1);
    this.mapCenter.set([-8.8, 17.8]);
    this.submitted.set(false);
    this.submittedReference.set('');
    this.fileName.set('');
    this.attachment.set(undefined);
    this.errorMessage.set('');
  }
}
