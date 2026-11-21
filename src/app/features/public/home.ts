import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { INCIDENT_CATEGORIES } from '../../core/models/incident';
import { IncidentService } from '../../core/services/incident.service';
import { InViewDirective } from '../../shared/directives/in-view';
import { MapViewComponent } from '../../shared/components/map-view';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DatePipe, RouterLink, MapViewComponent, SinalaIconComponent, InViewDirective],
  template: `
    <div class="public-home">
      <!-- Cinematic hero ------------------------------------------------- -->
      <section class="hero" aria-labelledby="hero-title">
        <div class="hero-media" aria-hidden="true">
          <video
            class="hero-video"
            [attr.autoplay]="reducedMotion ? null : ''"
            [muted]="true"
            loop
            playsinline
            preload="metadata"
            poster="/assets/images/hero-antenna-poster.jpg"
          >
            <source class="video-desktop" src="/assets/videos/hero-antenna.mp4" type="video/mp4" media="(min-width: 641px)" />
            <source class="video-mobile" src="/assets/videos/hero-antenna-mobile.mp4" type="video/mp4" media="(max-width: 640px)" />
          </video>
          <div class="hero-veil"></div>
          <div class="hero-gridlines"></div>
          <div class="hero-beacon"></div>
        </div>

        <div class="shell hero-inner">
          <div class="hero-content">
            <p class="kicker kicker--light"><span class="live-dot"></span> Plataforma comunitária · Angola</p>
            <h1 id="hero-title">O mapa vivo da <span>conectividade</span> em Angola.</h1>
            <p class="hero-lede">
              A SINALA transforma experiências reais de Internet numa visão partilhada por zona —
              com privacidade, contexto e respeito pelos relatos de quem vive a rede todos os dias.
            </p>
            <div class="hero-actions">
              <a class="btn btn--signal" routerLink="/reportar">
                Reportar um problema <lucide-icon name="arrow-right"></lucide-icon>
              </a>
              <a class="btn btn--outline-light" routerLink="/mapa">
                <lucide-icon name="crosshair"></lucide-icon> Explorar o mapa
              </a>
            </div>
            <ul class="hero-assurances">
              <li><lucide-icon name="map-pin"></lucide-icon> Localização aproximada</li>
              <li><lucide-icon name="shield-check"></lucide-icon> Sem moradas pessoais</li>
            </ul>
          </div>
        </div>

        <div class="hero-footer">
          <div class="shell hero-footer-inner">
            <span class="hero-index">S/01 — REDE COMUNITÁRIA</span>
            <span class="hero-pulse"><span class="pulse-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span> Escuta activa da comunidade</span>
            <a class="scroll-cue" href="#proposito" aria-label="Descer para a secção sobre o propósito">
              <span>DESCER</span><i aria-hidden="true"></i>
            </a>
          </div>
        </div>
      </section>

      <!-- Live platform data -------------------------------------------- -->
      <section class="signal-strip" aria-label="Dados da plataforma">
        <div class="shell signal-strip-inner">
          <div class="strip-label">
            <span class="strip-symbol" aria-hidden="true"><lucide-icon name="activity"></lucide-icon></span>
            <span><strong>DADOS ABERTOS</strong><small>Construídos a partir de relatos públicos</small></span>
          </div>
          <dl class="strip-stats">
            <div><dt>Relatos registados</dt><dd>{{ incidents().length }}</dd></div>
            <div><dt>Províncias com relatos</dt><dd>{{ provinceCount() }}</dd></div>
            <div><dt>Categorias acompanhadas</dt><dd>{{ categories.length }}</dd></div>
          </dl>
        </div>
      </section>

      <!-- Purpose -------------------------------------------------------- -->
      <section class="intro" id="proposito" aria-labelledby="intro-title">
        <div class="shell intro-grid">
          <div class="section-index" appInView>
            <span class="eyebrow">01 / PROPÓSITO</span>
            <span class="index-rule" aria-hidden="true"></span>
          </div>
          <div class="intro-main">
            <h2 id="intro-title" class="display" appInView>Conectar pessoas.<br />Dar contexto ao sinal.</h2>
          </div>
        </div>

        <div class="principles" role="group" aria-label="Princípios da SINALA">
              <article class="principle-card" appInView>
                <div class="principle-card-media">
                  <img
                    src="/assets/images/purpose-listen.jpg"
                    alt="Crianças de uma comunidade reunidas à volta de um computador portátil."
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span class="principle-card-index" aria-hidden="true">01</span>
                <div class="principle-card-body">
                  <span class="principle-kicker">01 / ESCUTA</span>
                  <h3>Escutar primeiro</h3>
                  <p>O ponto de partida é a experiência de quem usa a Internet em cada comunidade.</p>
                </div>
              </article>

              <article class="principle-card" appInView>
                <div class="principle-card-media">
                  <img
                    src="/assets/images/purpose-protect.jpg"
                    alt="Mapa com pinos a marcar zonas aproximadas, sem identificar moradas."
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span class="principle-card-index" aria-hidden="true">02</span>
                <div class="principle-card-body">
                  <span class="principle-kicker">02 / PRIVACIDADE</span>
                  <h3>Proteger as pessoas</h3>
                  <p>Publicamos zonas aproximadas. Nunca moradas ou informações pessoais.</p>
                </div>
              </article>

              <article class="principle-card" appInView>
                <div class="principle-card-media">
                  <img
                    src="/assets/images/purpose-transparency.jpg"
                    alt="Registo de uma experiência num formulário, pronto a ser partilhado."
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span class="principle-card-index" aria-hidden="true">03</span>
                <div class="principle-card-body">
                  <span class="principle-kicker">03 / CLAREZA</span>
                  <h3>Ser transparente</h3>
                  <p>Um relato é uma experiência reportada — não um diagnóstico técnico confirmado.</p>
                </div>
              </article>
        </div>

        <div class="shell">
          <div class="network-figure" appInView aria-hidden="true">
            <div class="network-figure-top"><span>SINAL / COMUNIDADE</span><span>AGREGAÇÃO POR ZONA</span><span>CONTEXTO PARTILHADO</span></div>
            <svg viewBox="0 0 1200 130" preserveAspectRatio="none" focusable="false">
              <defs>
                <pattern id="netGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                  <path d="M60 0H0V60" fill="none" stroke="#dce5f0" stroke-width="1" />
                </pattern>
              </defs>
              <rect width="1200" height="130" fill="url(#netGrid)" opacity=".7" />
              <path class="net-track" d="M40 92 C 230 92, 250 34, 420 34 S 620 100, 780 100 S 1000 42, 1160 42" />
              <path class="net-track net-track--soft" d="M40 92 C 260 130, 340 118, 520 118 S 760 52, 940 52 S 1080 92, 1160 92" />
              <g class="net-nodes">
                <circle cx="40" cy="92" r="5" /><circle cx="420" cy="34" r="6" />
                <circle cx="780" cy="100" r="5" /><circle cx="1160" cy="42" r="7" />
              </g>
              <g class="net-cross">
                <circle cx="240" cy="66" r="2.5" /><circle cx="600" cy="72" r="2.5" />
                <circle cx="960" cy="70" r="2.5" />
              </g>
            </svg>
          </div>
        </div>
      </section>

      <!-- How it works --------------------------------------------------- -->
      <section class="process" id="como-funciona" aria-labelledby="process-title">
        <div class="shell">
          <header class="process-head" appInView>
            <div class="process-title-block">
              <span class="process-subheading">02 / PERCURSO</span>
              <h2 id="process-title">Da experiência<br />ao contexto.</h2>
            </div>
            <div class="process-aside">
              <p>Um percurso simples para partilhar, acompanhar e consultar relatos comunitários.</p>
              <a class="text-link text-link--light" routerLink="/reportar">Começar um relato <lucide-icon name="arrow-right"></lucide-icon></a>
            </div>
          </header>
          <div class="step-carousel" role="group" aria-label="Passos para participar na SINALA" appInView>
            <div class="carousel-frame">
              @for (slide of visibleSlides; track slide.index) {
                <article class="carousel-slide">
                  <div class="slide-media">
                    <img
                      [src]="slide.image"
                      [alt]="slide.alt"
                      width="787"
                      height="947"
                      [attr.fetchpriority]="slide.index === 0 ? 'high' : null"
                    />
                  </div>
                  <span class="slide-number" aria-hidden="true">{{ slide.number }}</span>
                  <div class="slide-content">
                    <h3>{{ slide.title }}</h3>
                    <ul class="slide-facts"><li>{{ slide.text }}</li></ul>
                  </div>
                </article>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- Infrastructure ------------------------------------------------- -->
      <section class="infrastructure" aria-labelledby="infra-title">
        <div class="infra-video" aria-hidden="true">
          <video
            appInView="video"
            [attr.autoplay]="reducedMotion ? null : ''"
            [muted]="true"
            loop
            playsinline
            preload="none"
            poster="/assets/images/network-cables-poster.jpg"
          >
            <source src="/assets/videos/network-cables.mp4" type="video/mp4" media="(min-width: 641px)" />
            <source src="/assets/videos/network-cables-mobile.mp4" type="video/mp4" media="(max-width: 640px)" />
          </video>
        </div>
        <div class="shell infra-content">
          <div class="infra-copy" appInView>
            <span class="infra-subheading">03 / SINAL &amp; DADOS</span>
            <h2 id="infra-title" appInView>A rede é feita de <span>pequenos sinais.</span></h2>
            <p class="lead">
              Por trás de cada ligação existe uma cadeia de equipamentos, cabos e decisões.
              A SINALA não mede essa infraestrutura — damos lugar às pessoas que a experienciam,
              para que o retrato seja mais completo.
            </p>
            <p class="infra-note"><lucide-icon name="info"></lucide-icon> As categorias ajudam a organizar relatos; não representam conclusões técnicas.</p>
          </div>
          <div class="category-panel" appInView>
            <span class="category-panel-title">O que pode ser relatado</span>
            <ul>
              @for (category of categories; track category) {
                <li><lucide-icon name="signal"></lucide-icon> {{ category }}</li>
              }
            </ul>
          </div>
        </div>
      </section>

      <!-- Community map --------------------------------------------------- -->
      <section class="map-section" aria-labelledby="map-section-title">
        <div class="shell">
          <header class="section-head" appInView>
            <div>
              <span class="eyebrow">04 / COBERTURA COMUNITÁRIA</span>
              <h2 id="map-section-title">O que está a acontecer perto de si?</h2>
              <p>Explore relatos por localização aproximada e acompanhe o estado de cada contributo.</p>
            </div>
            <a class="text-link" routerLink="/mapa">Abrir mapa completo <lucide-icon name="arrow-up-right"></lucide-icon></a>
          </header>

          <div class="map-panel" appInView>
            <header class="map-panel-head">
              <div><span class="panel-kicker">VISÃO COMUNITÁRIA</span><h3>Relatos no mapa</h3></div>
              <span class="panel-status"><i aria-hidden="true"></i> {{ incidents().length }} RELATOS</span>
            </header>
            <div class="map-frame">
              <app-map-view [incidents]="incidents()"></app-map-view>
              <p class="map-note"><lucide-icon name="info"></lucide-icon> Cada ponto representa um relato, não uma avaria confirmada.</p>
            </div>
            <footer class="map-panel-foot">
              <span>Localizações aproximadas · Silhueta de Angola (Natural Earth)</span>
              <a routerLink="/mapa">Explorar mapa <lucide-icon name="arrow-up-right"></lucide-icon></a>
            </footer>
          </div>
        </div>
      </section>

      <!-- Recent reports -------------------------------------------------- -->
      <section class="recent" aria-labelledby="recent-title">
        <div class="shell">
          <header class="section-head" appInView>
            <div>
              <span class="eyebrow">05 / CONTRIBUTOS</span>
              <h2 id="recent-title">Relatos recentes</h2>
              <p>Contribuições submetidas pela comunidade, apresentadas com contexto.</p>
            </div>
            <a class="text-link" routerLink="/ocorrencias">Ver todos os relatos <lucide-icon name="arrow-right"></lucide-icon></a>
          </header>
          <div class="recent-list">
            @for (incident of recent(); track incident.id) {
              <a class="report-row" [routerLink]="['/acompanhar']" [queryParams]="{ reference: incident.reference }">
                <span class="report-category"><lucide-icon name="signal"></lucide-icon>{{ incident.category }}</span>
                <span class="report-context">Relato comunitário recebido. A descrição detalhada não é publicada para proteger a privacidade.</span>
                <span class="report-place"><lucide-icon name="map-pin"></lucide-icon>{{ incident.municipality }}, {{ incident.province }} <time>{{ incident.createdAt | date:'d MMM y':'':'pt-PT' }}</time></span>
                <span
                  class="report-status"
                  [class.open]="statusClass(incident.status) === 'open'"
                  [class.review]="statusClass(incident.status) === 'review'"
                  [class.closed]="statusClass(incident.status) === 'closed'"
                >{{ incident.status }}</span>
                <lucide-icon class="report-arrow" name="arrow-up-right"></lucide-icon>
              </a>
            } @empty {
              <p class="empty-reports">Ainda não existem relatos públicos. A sua contribuição pode ser a primeira.</p>
            }
          </div>
        </div>
      </section>

      <!-- Closing CTA ----------------------------------------------------- -->
      <section class="closing" aria-labelledby="closing-title">
        <div class="shell closing-inner">
          <div appInView>
            <span class="eyebrow eyebrow--light">06 / PARTICIPE</span>
            <h2 id="closing-title">A sua zona<br />também conta.</h2>
            <p>O seu contributo pode ser o primeiro passo para uma conversa mais informada sobre conectividade.</p>
          </div>
          <a class="btn btn--signal btn--large" routerLink="/reportar">Fazer um relato <lucide-icon name="arrow-right"></lucide-icon></a>
        </div>
        <div class="shell">
          <p class="public-disclaimer"><lucide-icon name="info"></lucide-icon> As descrições detalhadas são reservadas à equipa responsável; relatos comunitários não confirmam falhas de serviço.</p>
        </div>
      </section>
    </div>
  `,
  styles: [],
})
export class HomeComponent {
  private readonly incidentService = inject(IncidentService);

  readonly incidents = this.incidentService.incidents;
  readonly categories = INCIDENT_CATEGORIES;
  readonly reducedMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  readonly recent = computed(() => this.incidents().slice(0, 3));
  readonly provinceCount = computed(() => new Set(this.incidents().map((incident) => incident.province)).size);

  readonly steps = [
    {
      number: '01',
      icon: 'radio',
      title: 'Conte o que acontece',
      text: 'Descreva a sua experiência com palavras simples.',
      image: '/assets/images/step-1-report.jpg',
      alt: 'Pessoa a escrever num computador portátil em casa',
    },
    {
      number: '02',
      icon: 'map-pin',
      title: 'Indique a zona',
      text: 'Partilhe uma localização aproximada, sem morada pessoal.',
      image: '/assets/images/step-2-location.jpg',
      alt: 'Mão a colocar um marcador num mapa',
    },
    {
      number: '03',
      icon: 'copy-check',
      title: 'Acompanhe o registo',
      text: 'Guarde a referência para consultar o estado do relato.',
      image: '/assets/images/step-3-track.jpg',
      alt: 'Pessoa a preencher um formulário numa prancheta',
    },
    {
      number: '04',
      icon: 'route',
      title: 'Veja o contexto',
      text: 'Explore os relatos públicos no mapa e nas listas.',
      image: '/assets/images/step-4-context.jpg',
      alt: 'Duas pessoas a trabalhar juntas num computador portátil',
    },
  ];

  readonly visibleSlides = this.steps.slice(0, 3).map((step, index) => ({ ...step, index }));

  statusClass(status: string): string {
    if (status === 'Encerrado') return 'closed';
    if (status === 'Em análise' || status === 'Classificado') return 'review';
    return 'open';
  }
}
