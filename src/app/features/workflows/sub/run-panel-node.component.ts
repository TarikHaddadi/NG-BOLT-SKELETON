import { Component, inject, signal } from '@angular/core';
import { DrawFlowBaseNode } from '@ng-draw-flow/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WfCanvasBus } from './wf-canvas-bus';
import { PipelineProgressComponent, PipelineWorkflowDTO } from './pipeline-progress.component';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-wf-run-panel-node',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule, TranslateModule, PipelineProgressComponent],
    template: `
<div class="run-panel">
  <div class="header">
    <div class="title">{{ 'workflow.runPanel.title' | translate : { default: 'Run' } }}</div>
    <button mat-stroked-button color="primary" (click)="triggerRun()" [disabled]="!graphOk()">
      <mat-icon>play_arrow</mat-icon>
      <span class="ml-2">{{ 'workflow.runPanel.run' | translate : { default: 'Run simulation' } }}</span>
    </button>
  </div>

  <div class="body" *ngIf="pipeline() as pipe">
    <app-pipeline-progress
      [workflow]="pipe"
      [runState]="runState()"
      (stageCancel)="stageCancel($event)"
      (pipelineCancel)="pipelineCancel()">
    </app-pipeline-progress>
  </div>

  <div class="empty" *ngIf="!pipeline()">
    {{ 'workflow.runPanel.empty' | translate : { default: 'No pipeline to run yet.' } }}
  </div>
</div>
  `,
    styles: [`
    .run-panel { padding: 10px; border-radius: 10px; background: var(--md-sys-color-surface); border: 2px solid var(--mat-primary) }
    .header { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom: 8px; }
    .title { font-weight: 600; }
    .ml-2 { margin-left: .5rem; }
    .hidden {   visibility: hidden;
  opacity: 0;
  pointer-events: none; }
  `]
})
export class WfRunPanelNodeComponent extends DrawFlowBaseNode {
  private bus = inject(WfCanvasBus);

  pipeline = signal<PipelineWorkflowDTO | null>(null);
  runState = signal<Record<string,'queued'|'running'|'success'|'error'|'skipped'>>({});
  graphOk  = signal<boolean>(false);

  constructor() {
    super();
    this.bus.pipeline$.subscribe(v => this.pipeline.set(v));
    this.bus.runState$.subscribe(v => this.runState.set(v));
    this.bus.graphValid$.subscribe(ok => this.graphOk.set(!!ok));
  }

  triggerRun(): void { this.bus.runRequested$.next({ nodeId: this.nodeId }); }
  stageCancel(e:{index:number;nodeIds:string[]}){ this.bus.stageCancel$.next(e); }
  pipelineCancel(){ this.bus.pipelineCancel$.next(); }
}