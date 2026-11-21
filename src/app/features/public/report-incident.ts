import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
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
    <section class="report-shell" [attr.aria-busy]="loading()">
      <header class="report-heading">
        <div class="heading-copy">
          <span class="eyebrow"><i aria-hidden="true"></i> CONTRIBUIÇÃO COMUNITÁRIA · ANGOLA</span>
          <h1>Reportar problema de conectividade</h1>
          <p>O seu relato ajuda a construir um mapa mais claro da experiência de rede em Angola.</p>
        </div>
        <span class="privacy-chip"><lucide-icon name="shield-check"></lucide-icon> Privacidade por concepção</span>
      </header>

      @if (submittedReference()) {
        <section class="success-panel" role="status" aria-live="polite">
          <span class="success-icon"><lucide-icon name="circle-check-big"></lucide-icon></span>
          <span class="eyebrow">RELATO REGISTADO</span>
          <h2 #successTitle tabindex="-1">Obrigado por contribuir.</h2>
          <p>O seu relato foi registado. Guarde esta referência para acompanhar o estado:</p>
          <div class="reference">
            <span>{{ submittedReference() }}</span>
            <button type="button" class="copy-button" (click)="copyReference()">
              <lucide-icon [name]="copied() ? 'check-check' : 'copy-check'"></lucide-icon>
              {{ copied() ? 'Copiado' : 'Copiar' }}
            </button>
          </div>
          <div class="success-actions">
            <a class="action-primary" [routerLink]="['/acompanhar']" [queryParams]="{ reference: submittedReference() }">
              Acompanhar relato <lucide-icon name="arrow-right"></lucide-icon>
            </a>
            <button type="button" class="action-secondary" (click)="startNew()">Registar outro</button>
          </div>
          <small>Este relato é uma experiência comunitária e não confirma uma avaria técnica.</small>
        </section>
      } @else {
        <div class="wizard-layout">
          <div class="wizard-main">
            <nav class="stepper" aria-label="Etapas do relato">
              <ol>
                @for (label of stepLabels; track label; let i = $index) {
                  <li class="step-node" [class.current]="step() === i + 1" [class.done]="step() > i + 1">
                    @if (step() > i + 1) {
                      <button
                        type="button"
                        class="step-button"
                        (click)="goToStep(i + 1)"
                        [attr.aria-label]="'Voltar à etapa ' + (i + 1) + ': ' + label"
                      >
                        <span class="step-index"><lucide-icon name="check-check"></lucide-icon></span>
                        <span class="step-label">{{ label }}</span>
                      </button>
                    } @else {
                      <span class="step-button" [attr.aria-current]="step() === i + 1 ? 'step' : null">
                        <span class="step-index">0{{ i + 1 }}</span>
                        <span class="step-label">{{ label }}</span>
                      </span>
                    }
                  </li>
                }
              </ol>
            </nav>

            <form [formGroup]="form" (ngSubmit)="submit()" class="wizard-card" [attr.aria-busy]="loading()">
              <p class="step-count" aria-live="polite">Etapa {{ step() }} de 4 · {{ stepLabels[step() - 1] }}</p>

              @if (errorMessage()) {
                <div #formAlert class="form-alert" role="alert" tabindex="-1">
                  <lucide-icon name="circle-alert"></lucide-icon>
                  <span>{{ errorMessage() }}</span>
                </div>
              }

              <div class="section-title">
                <h2 #stepTitle tabindex="-1">{{ stepTitles[step() - 1] }}</h2>
                <p>{{ stepDescriptions[step() - 1] }}</p>
              </div>

              @if (step() === 1) {
                <fieldset class="category-grid" [attr.aria-invalid]="invalid('category')">
                  <legend class="sr-only">Tipo de problema</legend>
                  @for (category of categories; track category) {
                    <label class="category-choice" [class.chosen]="form.controls.category.value === category">
                      <input type="radio" name="category" formControlName="category" [value]="category" />
                      <span class="choice-icon"><lucide-icon [name]="categoryIcon(category)"></lucide-icon></span>
                      <span class="choice-label">{{ category }}</span>
                    </label>
                  }
                </fieldset>
                @if (invalid('category')) {
                  <p id="category-error" class="field-error">Seleccione uma categoria para continuar.</p>
                }
                <div class="note"><lucide-icon name="info"></lucide-icon><span>Descreva apenas o que observou. Um relato não significa que a falha esteja confirmada pelo operador.</span></div>
              } @else if (step() === 2) {
                <div class="location-fields">
                  <div class="field">
                    <label for="province">Província <b aria-hidden="true">*</b></label>
                    <select
                      id="province"
                      class="form-select"
                      formControlName="province"
                      (change)="updateMapCenter()"
                      [class.invalid]="invalid('province')"
                      [attr.aria-invalid]="invalid('province')"
                      [attr.aria-describedby]="invalid('province') ? 'province-error' : null"
                    >
                      <option value="">Seleccione a província</option>
                      @for (province of provinces; track province) { <option [value]="province">{{ province }}</option> }
                    </select>
                    @if (invalid('province')) { <p id="province-error" class="field-error">Seleccione a província.</p> }
                  </div>
                  <div class="field">
                    <label for="municipality">Município <b aria-hidden="true">*</b></label>
                    <input
                      id="municipality"
                      class="form-control"
                      formControlName="municipality"
                      placeholder="Ex.: Maianga"
                      [class.invalid]="invalid('municipality')"
                      [attr.aria-invalid]="invalid('municipality')"
                      [attr.aria-describedby]="invalid('municipality') ? 'municipality-error' : null"
                    />
                    @if (invalid('municipality')) { <p id="municipality-error" class="field-error">Indique o município.</p> }
                  </div>
                </div>
                <div class="field">
                  <label for="neighborhood">Bairro <small>OPCIONAL</small></label>
                  <input id="neighborhood" class="form-control" formControlName="neighborhood" placeholder="Ex.: Alvalade" />
                </div>
                <div class="map-block">
                  <div class="map-preview-head">
                    <span><lucide-icon name="map-pin"></lucide-icon> {{ mapCaption() }}</span>
                    <small>O ponto exacto não é publicado</small>
                  </div>
                  <div class="map-preview">
                    <app-map-view [incidents]="[]" [center]="mapCenter()"></app-map-view>
                    <span class="map-badge"><lucide-icon name="crosshair"></lucide-icon> Centro aproximado</span>
                  </div>
                </div>
                <div class="note"><lucide-icon name="shield-check"></lucide-icon><span>A localização pública é aproximada. Não recolhemos coordenadas precisas nem moradas pessoais.</span></div>
              } @else if (step() === 3) {
                <div class="field">
                  <label for="provider">Operadora <small>OPCIONAL</small></label>
                  <select id="provider" formControlName="provider" class="form-select">
                    <option value="">Prefiro não indicar</option>
                    <option>Unitel</option>
                    <option>Africell</option>
                    <option>Movicel</option>
                    <option>ZAP Fibra</option>
                    <option>TVCABO</option>
                    <option>Outra</option>
                  </select>
                </div>
                <div class="field">
                  <div class="label-row">
                    <label for="description">Descrição do problema <b aria-hidden="true">*</b></label>
                    <span class="char-count">{{ descriptionLength() }}/500</span>
                  </div>
                  <textarea
                    id="description"
                    rows="5"
                    maxlength="500"
                    formControlName="description"
                    class="form-textarea"
                    placeholder="Quando começou? Acontece sempre ou em certos momentos?"
                    [class.invalid]="invalid('description')"
                    [attr.aria-invalid]="invalid('description')"
                    [attr.aria-describedby]="invalid('description') ? 'description-error description-hint' : 'description-hint'"
                  ></textarea>
                  <p id="description-hint" class="field-hint">Não inclua nomes, contactos ou outros dados pessoais.</p>
                  @if (invalid('description')) { <p id="description-error" class="field-error">Escreva pelo menos 12 caracteres.</p> }
                </div>
                <div class="field">
                  <label class="upload-box" for="attachment" [class.has-file]="!!fileName()">
                    <input
                      #attachmentInput
                      id="attachment"
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      (change)="onFile($event)"
                      aria-describedby="attachment-hint"
                    />
                    <span class="upload-icon"><lucide-icon name="paperclip"></lucide-icon></span>
                    <span class="upload-copy">
                      <strong>{{ fileName() || 'Adicionar imagem de contexto' }}</strong>
                      <small>{{ fileName() ? fileSizeLabel() : 'JPEG, PNG ou WebP · até 5 MB' }}</small>
                    </span>
                    @if (fileName()) { <span class="upload-change">Alterar</span> }
                  </label>
                  <p id="attachment-hint" class="field-hint">Opcional. Evite fotografias com pessoas, matrículas ou documentos.</p>
                  @if (fileName()) {
                    <button type="button" class="remove-file" (click)="clearAttachment()">
                      <lucide-icon name="x"></lucide-icon> Remover imagem
                    </button>
                  }
                  @if (fileError()) { <p class="field-error" role="alert">{{ fileError() }}</p> }
                </div>
              } @else {
                <dl class="review-card">
                  <div><dt>Tipo de relato</dt><dd>{{ form.controls.category.value || '—' }}</dd></div>
                  <div>
                    <dt>Localização aproximada</dt>
                    <dd>{{ form.controls.municipality.value || '—' }}, {{ form.controls.province.value || '—' }}<small>{{ form.controls.neighborhood.value || 'Bairro não indicado' }}</small></dd>
                  </div>
                  <div><dt>Operadora</dt><dd>{{ form.controls.provider.value || 'Não indicada' }}</dd></div>
                  <div><dt>Anexo</dt><dd>{{ fileName() || 'Sem anexo' }}</dd></div>
                  <div class="review-wide"><dt>Descrição</dt><dd class="review-description">{{ form.controls.description.value || '—' }}</dd></div>
                </dl>
                <label class="consent" [class.invalid]="submitted() && form.controls.consent.invalid">
                  <input
                    id="consent"
                    type="checkbox"
                    formControlName="consent"
                    [attr.aria-invalid]="submitted() && form.controls.consent.invalid"
                    [attr.aria-describedby]="submitted() && form.controls.consent.invalid ? 'consent-error' : null"
                  />
                  <span>Confirmo que este relato descreve a minha experiência e não inclui informações pessoais.</span>
                </label>
                @if (submitted() && form.controls.consent.invalid) {
                  <p id="consent-error" class="field-error">Confirme a declaração para enviar.</p>
                }
              }

              <footer class="wizard-actions">
                @if (step() > 1 && !loading()) {
                  <button type="button" class="action-secondary" (click)="previous()">
                    <lucide-icon name="arrow-left"></lucide-icon> Voltar
                  </button>
                } @else { <span></span> }
                @if (step() < 4) {
                  <button type="button" class="action-primary" (click)="next()">
                    Continuar <lucide-icon name="arrow-right"></lucide-icon>
                  </button>
                } @else {
                  <button type="submit" class="action-primary" [disabled]="loading()">
                    {{ loading() ? 'A enviar…' : 'Enviar relato' }}
                    @if (!loading()) { <lucide-icon name="arrow-right"></lucide-icon> }
                  </button>
                }
              </footer>
            </form>
            <p class="form-disclaimer"><lucide-icon name="info"></lucide-icon> Relatos comunitários são indicativos e não representam confirmação técnica de avaria.</p>
          </div>

          <aside class="report-aside" aria-label="Orientações para o relato">
            <section class="aside-card aside-card--trust">
              <span class="aside-icon"><lucide-icon name="shield-check"></lucide-icon></span>
              <h3>Privacidade em primeiro lugar</h3>
              <p>Partilhe apenas a zona aproximada. A descrição deve focar-se no que observou.</p>
              <ul class="trust-list">
                <li><lucide-icon name="check-check"></lucide-icon> Sem nomes ou números de telefone</li>
                <li><lucide-icon name="check-check"></lucide-icon> Sem moradas exactas ou coordenadas</li>
                <li><lucide-icon name="check-check"></lucide-icon> Imagem opcional e sem dados pessoais</li>
              </ul>
            </section>
            <section class="aside-card">
              <span class="aside-overline">O QUE ACONTECE A SEGUIR</span>
              <ol class="process-list">
                <li><b>01</b><span>É criada uma referência única para acompanhar o relato.</span></li>
                <li><b>02</b><span>O registo aparece no mapa com localização aproximada.</span></li>
                <li><b>03</b><span>Relatos semelhantes podem ser agrupados para análise.</span></li>
              </ol>
            </section>
            <section class="aside-card aside-card--help">
              <span class="aside-icon"><lucide-icon name="file-search"></lucide-icon></span>
              <h3>Já fez um relato?</h3>
              <p>Use a referência recebida para consultar o estado atual do registo.</p>
              <a class="aside-link" [routerLink]="['/acompanhar']">Acompanhar relato <lucide-icon name="arrow-up-right"></lucide-icon></a>
            </section>
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

  private readonly stepTitle = viewChild<ElementRef<HTMLElement>>('stepTitle');
  private readonly successTitle = viewChild<ElementRef<HTMLElement>>('successTitle');
  private readonly attachmentInput = viewChild<ElementRef<HTMLInputElement>>('attachmentInput');
  private readonly formAlert = viewChild<ElementRef<HTMLElement>>('formAlert');

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
  readonly stepTitles = ['O que está a acontecer?', 'Onde acontece?', 'Partilhe mais contexto', 'Reveja antes de enviar'];
  readonly stepDescriptions = [
    'Escolha a situação que melhor descreve a sua experiência.',
    'Indique uma zona aproximada, não uma morada pessoal.',
    'Detalhes observáveis ajudam a organizar os relatos por padrão.',
    'Confirme o resumo e a declaração de privacidade.',
  ];
  readonly step = signal(1);
  readonly mapCenter = signal<[number, number] | undefined>(undefined);
  readonly loading = signal(false);
  readonly submitted = signal(false);
  readonly submittedReference = signal('');
  readonly fileName = signal('');
  readonly fileSizeLabel = signal('');
  readonly attachment = signal<File | undefined>(undefined);
  readonly fileError = signal('');
  readonly errorMessage = signal('');
  readonly copied = signal(false);

  private readonly categoryIcons: Record<IncidentCategory, string> = {
    'Internet lenta': 'gauge',
    'Sem ligação': 'wifi-off',
    'Interrupções frequentes': 'activity',
    'Cobertura insuficiente': 'signal',
    Instabilidade: 'network',
    Outro: 'circle-alert',
  };

  invalid(control: keyof typeof this.form.controls): boolean {
    return this.form.controls[control].invalid && this.form.controls[control].touched;
  }

  categoryIcon(category: IncidentCategory): string {
    return this.categoryIcons[category];
  }

  descriptionLength(): number {
    return this.form.controls.description.value.length;
  }

  mapCaption(): string {
    const province = this.form.controls.province.value;
    return province ? `Pré-visualização · ${province}` : 'Pré-visualização · Angola';
  }

  updateMapCenter(): void {
    const province = this.form.controls.province.value;
    this.mapCenter.set(province ? this.mapService.approximateCoordinates(province) : undefined);
  }

  next(): void {
    if (this.step() === 1) {
      this.form.controls.category.markAsTouched();
      if (this.form.controls.category.invalid) return this.focusFirstInvalid();
    } else if (this.step() === 2) {
      this.form.controls.province.markAsTouched();
      this.form.controls.municipality.markAsTouched();
      if (this.form.controls.province.invalid || this.form.controls.municipality.invalid) return this.focusFirstInvalid();
    } else if (this.step() === 3) {
      this.form.controls.description.markAsTouched();
      if (this.form.controls.description.invalid) return this.focusFirstInvalid();
    }
    this.errorMessage.set('');
    this.step.update((value) => Math.min(value + 1, 4));
    this.focusStep();
  }

  goToStep(target: number): void {
    if (target < 1 || target >= this.step()) return;
    this.errorMessage.set('');
    this.step.set(target);
    this.focusStep();
  }

  previous(): void {
    this.errorMessage.set('');
    this.step.update((value) => Math.max(value - 1, 1));
    this.focusStep();
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      this.fileName.set('');
      this.fileSizeLabel.set('');
      this.attachment.set(undefined);
      this.fileError.set('Escolha uma imagem JPEG, PNG ou WebP com até 5 MB.');
      input.value = '';
      return;
    }
    this.fileError.set('');
    this.fileName.set(file.name);
    this.fileSizeLabel.set(this.formatFileSize(file.size));
    this.attachment.set(file);
  }

  clearAttachment(): void {
    this.fileName.set('');
    this.fileSizeLabel.set('');
    this.fileError.set('');
    this.attachment.set(undefined);
    const input = this.attachmentInput();
    if (input) input.nativeElement.value = '';
  }

  async copyReference(): Promise<void> {
    const reference = this.submittedReference();
    if (!reference || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(reference);
      this.copied.set(true);
    } catch {
      this.copied.set(false);
    }
  }

  async submit(): Promise<void> {
    if (this.loading()) return;
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return this.focusFirstInvalid();

    const { category, provider, description, province, municipality, neighborhood } = this.form.getRawValue();
    if (!category || !province || !municipality) {
      this.errorMessage.set('Preencha os campos obrigatórios para continuar.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
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
      this.focusAfterRender(this.successTitle);
    } catch (error) {
      console.error('Não foi possível enviar o relato.', error);
      this.errorMessage.set('Não foi possível enviar o relato. Confirme a ligação à API e tente novamente.');
      this.focusAfterRender(this.formAlert);
    } finally {
      this.loading.set(false);
    }
  }

  startNew(): void {
    this.form.reset({
      category: '',
      provider: '',
      description: '',
      province: '',
      municipality: '',
      neighborhood: '',
      consent: false,
    });
    this.step.set(1);
    this.mapCenter.set(undefined);
    this.submitted.set(false);
    this.submittedReference.set('');
    this.fileName.set('');
    this.fileSizeLabel.set('');
    this.fileError.set('');
    this.errorMessage.set('');
    this.copied.set(false);
    this.attachment.set(undefined);
  }

  private focusStep(): void {
    this.focusAfterRender(this.stepTitle);
  }

  private focusAfterRender(target: () => ElementRef<HTMLElement> | undefined): void {
    window.setTimeout(() => target()?.nativeElement.focus(), 0);
  }

  private focusFirstInvalid(): void {
    const candidates: Array<[boolean, string]> = [
      [this.step() === 1, '.category-choice input'],
      [this.step() === 2 && this.form.controls.province.invalid, '#province'],
      [this.step() === 2 && this.form.controls.municipality.invalid, '#municipality'],
      [this.step() === 3 && this.form.controls.description.invalid, '#description'],
      [this.step() === 4 && this.form.controls.consent.invalid, '#consent'],
    ];
    const selector = candidates.find(([needed]) => needed)?.[1];
    if (!selector) return;
    window.setTimeout(() => {
      document.querySelector<HTMLElement>(`app-report-incident .wizard-card ${selector}`)?.focus();
    }, 0);
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
