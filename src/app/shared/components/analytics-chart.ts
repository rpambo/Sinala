import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ECharts, EChartsCoreOption } from 'echarts/core';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-analytics-chart',
  standalone: true,
  template: `
    <div #chart class="chart-canvas" aria-hidden="true"></div>
    <table class="sr-only">
      <caption>{{ title }}</caption>
      <thead><tr><th scope="col">Categoria</th><th scope="col">Valor</th></tr></thead>
      <tbody>
        @for (label of labels; track $index) {
          <tr><th scope="row">{{ label }}</th><td>{{ values[$index] }}</td></tr>
        }
      </tbody>
    </table>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .chart-canvas { width: 100%; height: 250px; }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; padding: 0; border: 0; clip: rect(0, 0, 0, 0); white-space: nowrap; }
  `],
})
export class AnalyticsChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() title = 'Gráfico de análise';
  @Input() type: 'line' | 'bar' | 'pie' = 'line';
  @Input() labels: string[] = [];
  @Input() values: number[] = [];
  @ViewChild('chart', { static: true }) private chartElement!: ElementRef<HTMLDivElement>;

  private chart?: ECharts;
  private observer?: ResizeObserver;

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartElement.nativeElement);
    this.observer = new ResizeObserver(() => this.chart?.resize());
    this.observer.observe(this.chartElement.nativeElement);
    this.render();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    this.render();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.chart?.dispose();
  }

  private render(): void {
    if (!this.chart) return;
    const palette = ['#5cc8ff', '#00a8f0', '#0090f0', '#8fb4d8', '#e8b05f'];
    const option: EChartsCoreOption = this.type === 'pie'
      ? {
          color: palette,
          tooltip: { trigger: 'item' },
          legend: { bottom: 0, textStyle: { color: '#cbd6eb' } },
          series: [{
            type: 'pie',
            radius: ['55%', '78%'],
            center: ['50%', '45%'],
            label: { show: false },
            data: this.labels.map((name, index) => ({ name, value: this.values[index] ?? 0 })),
          }],
        }
      : {
          color: [this.type === 'line' ? '#00a8f0' : '#5cc8ff'],
          grid: { left: 36, right: 16, top: 20, bottom: 30 },
          tooltip: { trigger: 'axis' },
          xAxis: {
            type: 'category',
            data: this.labels,
            boundaryGap: this.type === 'bar',
            axisLabel: { color: '#b8c7dd' },
            axisLine: { lineStyle: { color: '#1e3b68' } },
          },
          yAxis: {
            type: 'value',
            axisLabel: { color: '#b8c7dd' },
            splitLine: { lineStyle: { color: '#1e3b68' } },
          },
          series: [{
            type: this.type,
            data: this.values,
            smooth: this.type === 'line',
            symbolSize: 7,
            lineStyle: { width: 3 },
            areaStyle: this.type === 'line' ? { color: 'rgba(0,144,240,.10)' } : undefined,
            itemStyle: { borderRadius: this.type === 'bar' ? [6, 6, 0, 0] : 0 },
          }],
        };
    this.chart.setOption(option, true);
  }
}
