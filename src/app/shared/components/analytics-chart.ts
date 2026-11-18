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
  template: '<div #chart class="chart-canvas" role="img" [attr.aria-label]="title"></div>',
  styles: [':host { display: block; min-width: 0; } .chart-canvas { width: 100%; height: 250px; }'],
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
    const palette = ['#21b8c8', '#536ae8', '#8bd8d4', '#98a3b8', '#e8b05f'];
    const option: EChartsCoreOption = this.type === 'pie'
      ? {
          color: palette,
          tooltip: { trigger: 'item' },
          legend: { bottom: 0, textStyle: { color: '#687286' } },
          series: [{
            type: 'pie',
            radius: ['55%', '78%'],
            center: ['50%', '45%'],
            label: { show: false },
            data: this.labels.map((name, index) => ({ name, value: this.values[index] ?? 0 })),
          }],
        }
      : {
          color: [this.type === 'line' ? '#20b9ca' : '#536ae8'],
          grid: { left: 36, right: 16, top: 20, bottom: 30 },
          tooltip: { trigger: 'axis' },
          xAxis: {
            type: 'category',
            data: this.labels,
            boundaryGap: this.type === 'bar',
            axisLabel: { color: '#8992a4' },
            axisLine: { lineStyle: { color: '#e8edf2' } },
          },
          yAxis: {
            type: 'value',
            axisLabel: { color: '#8992a4' },
            splitLine: { lineStyle: { color: '#edf1f4' } },
          },
          series: [{
            type: this.type,
            data: this.values,
            smooth: this.type === 'line',
            symbolSize: 7,
            lineStyle: { width: 3 },
            areaStyle: this.type === 'line' ? { color: 'rgba(32,185,202,.10)' } : undefined,
            itemStyle: { borderRadius: this.type === 'bar' ? [6, 6, 0, 0] : 0 },
          }],
        };
    this.chart.setOption(option, true);
  }
}
