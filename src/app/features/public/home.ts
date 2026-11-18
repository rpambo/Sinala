import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IncidentService } from '../../core/services/incident.service';
import { MapViewComponent } from '../../shared/components/map-view';
import { SinalaIconComponent } from '../../shared/components/lucide-icon';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [DatePipe, RouterLink, MapViewComponent, SinalaIconComponent],
  template: `
    <div class="public-home">
      <section class="hero-section">
        <div class="hero-copy">
          <span class="eyebrow"><i></i> CONECTIVIDADE EM ANGOLA</span>
          <h1>A Internet, <span>vista por quem a vive.</span></h1>
          <p>Partilhe problemas de conectividade na sua zona. A SINALA organiza experiências comunitárias para que possam ser acompanhadas com contexto.</p>
          <div class="hero-actions">
            <a class="primary-action" routerLink="/reportar">Reportar problema <lucide-icon name="arrow-right"></lucide-icon></a>
            <a class="secondary-action" routerLink="/ocorrencias">Ver relatos</a>
          </div>
          <div class="hero-principles">
            <span><lucide-icon name="map-pin"></lucide-icon> Zona aproximada</span>
            <span><lucide-icon name="shield-check"></lucide-icon> Sem moradas pessoais</span>
          </div>
        </div>

        <figure class="hero-art">
          <img src="/images/sinala-community.webp" alt="Três pessoas em Luanda a partilhar um telefone e informações sobre conectividade." width="1536" height="1024" fetchpriority="high">
          <figcaption><span class="art-caption-icon"><lucide-icon name="radio"></lucide-icon></span><span><strong>A comunidade no centro</strong><small>Experiências reais merecem ser ouvidas.</small></span></figcaption>
        </figure>
      </section>

      <section class="purpose-section" aria-labelledby="purpose-title">
        <header class="purpose-heading">
          <span class="eyebrow">O QUE NOS MOVE</span>
          <h2 id="purpose-title">Uma rede mais conectada começa por escutar.</h2>
          <p>A SINALA dá espaço às experiências das pessoas e ajuda a torná-las visíveis, sem confundir relatos com diagnósticos técnicos.</p>
        </header>
        <div class="purpose-grid">
          <article class="purpose-card">
            <div class="purpose-art community-art"><span class="purpose-orbit"></span><span class="purpose-art-icon"><lucide-icon name="radio"></lucide-icon></span></div>
            <span class="purpose-kicker">MISSÃO</span>
            <h3>Dar voz às experiências locais.</h3>
            <p>Reunir relatos sobre conectividade e organizá-los por zona, mantendo as pessoas no centro.</p>
          </article>
          <article class="purpose-card">
            <div class="purpose-art map-art"><span class="purpose-orbit"></span><span class="purpose-art-icon"><lucide-icon name="map-pin"></lucide-icon></span></div>
            <span class="purpose-kicker">VISÃO</span>
            <h3>Construir uma visão partilhada.</h3>
            <p>Contribuir para uma leitura mais clara dos desafios de Internet vividos nas comunidades.</p>
          </article>
          <article class="purpose-card">
            <div class="purpose-art trust-art"><span class="purpose-orbit"></span><span class="purpose-art-icon"><lucide-icon name="shield-check"></lucide-icon></span></div>
            <span class="purpose-kicker">VALORES</span>
            <h3>Agir com respeito e transparência.</h3>
            <p>Proteger a privacidade e apresentar cada relato com contexto, sem afirmar causas que não foram verificadas.</p>
          </article>
        </div>
      </section>

      <section class="journey-section" id="como-funciona" aria-labelledby="journey-title">
        <header class="journey-heading">
          <span class="eyebrow">DA EXPERIÊNCIA AO CONTEXTO</span>
          <h2 id="journey-title">Cada contributo ajuda a completar o retrato.</h2>
          <p>Um percurso simples para partilhar, acompanhar e consultar relatos comunitários.</p>
        </header>
        <ol class="journey-list">
          <li><span class="journey-number">01</span><span class="journey-icon"><lucide-icon name="radio"></lucide-icon></span><h3>Conte o que acontece</h3><p>Descreva a sua experiência com palavras simples.</p></li>
          <li><span class="journey-number">02</span><span class="journey-icon"><lucide-icon name="map-pin"></lucide-icon></span><h3>Indique a zona</h3><p>Partilhe uma localização aproximada, sem morada pessoal.</p></li>
          <li><span class="journey-number">03</span><span class="journey-icon"><lucide-icon name="copy-check"></lucide-icon></span><h3>Acompanhe o relato</h3><p>Guarde a referência para consultar o estado do registo.</p></li>
          <li><span class="journey-number">04</span><span class="journey-icon"><lucide-icon name="route"></lucide-icon></span><h3>Veja o contexto</h3><p>Explore os relatos públicos no mapa e nas listas.</p></li>
        </ol>
      </section>

      <section class="map-section" aria-labelledby="map-section-title">
        <header class="map-section-heading">
          <div><span class="eyebrow">MAPA DA COMUNIDADE</span><h2 id="map-section-title">O que está a acontecer perto de si?</h2><p>Explore relatos por localização e acompanhe o estado de cada contribuição.</p></div>
          <a class="all-reports-link" routerLink="/mapa">Ver mapa completo <lucide-icon name="arrow-up-right"></lucide-icon></a>
        </header>
        <section class="map-card" aria-label="Mapa comunitário">
          <header class="map-card-heading">
            <div><span class="map-kicker">VISÃO COMUNITÁRIA</span><h2>Relatos no mapa</h2></div>
            <span class="demo-label"><i></i> RELATOS REGISTADOS</span>
          </header>
          <div class="map-area">
            <app-map-view [incidents]="incidents()"></app-map-view>
            <span class="map-note"><i></i> Cada ponto representa um relato, não uma avaria confirmada.</span>
          </div>
          <footer class="map-card-footer">
            <span><strong>{{ incidents().length }}</strong> relatos registados</span>
            <a routerLink="/mapa">Abrir mapa <lucide-icon name="arrow-up-right"></lucide-icon></a>
          </footer>
        </section>
      </section>

      <section class="recent-section">
        <div class="recent-heading">
          <div><span class="eyebrow">CONTRIBUTOS DA COMUNIDADE</span><h2>Relatos recentes</h2><p>Contribuições submetidas pela comunidade.</p></div>
          <a class="all-reports-link" routerLink="/ocorrencias">Ver todos os relatos <lucide-icon name="arrow-right"></lucide-icon></a>
        </div>
        <div class="recent-grid">
          @for (incident of recent(); track incident.id) {
            <a class="report-card" [routerLink]="['/acompanhar']" [queryParams]="{ reference: incident.reference }">
              <div class="report-card-top"><span class="report-category"><lucide-icon name="signal"></lucide-icon>{{ incident.category }}</span><span class="report-status" [class]="statusClass(incident.status)">{{ incident.status }}</span></div>
              <p>Relato comunitário recebido. A descrição detalhada não é publicada para proteger a privacidade.</p>
              <div class="report-location"><span><lucide-icon name="map-pin"></lucide-icon>{{ incident.municipality }}, {{ incident.province }}</span><time>{{ incident.createdAt | date:'d MMM y':'':'pt-PT' }}</time></div>
              <span class="report-reference">{{ incident.reference }} <lucide-icon name="arrow-up-right"></lucide-icon></span>
            </a>
          } @empty { <p class="empty-reports">Ainda não existem relatos públicos. A sua contribuição pode ser a primeira.</p> }
        </div>
      </section>

      <section class="closing-banner">
        <div><span class="eyebrow">A SUA ZONA TAMBÉM CONTA</span><h2>Ajude a dar visibilidade ao que acontece.</h2><p>O seu contributo pode ser o primeiro passo para uma conversa mais informada.</p></div>
        <a class="closing-action" routerLink="/reportar">Fazer um relato <lucide-icon name="arrow-right"></lucide-icon></a>
      </section>
      <p class="public-disclaimer"><lucide-icon name="info"></lucide-icon> As descrições detalhadas são reservadas à equipa responsável; relatos comunitários não confirmam falhas de serviço.</p>
    </div>
  `,
  styles: [],
})
export class HomeComponent {
  private readonly incidentService = inject(IncidentService);
  readonly incidents = this.incidentService.incidents;
  readonly recent = computed(() => this.incidents().slice(0, 3));

  statusClass(status: string): string {
    if (status === 'Encerrado') return 'closed';
    if (status === 'Em análise' || status === 'Classificado') return 'review';
    return 'open';
  }
}
