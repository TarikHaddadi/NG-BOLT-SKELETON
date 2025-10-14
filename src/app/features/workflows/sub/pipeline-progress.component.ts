import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { TranslateModule } from '@ngx-translate/core';
import {MatMenuModule} from '@angular/material/menu';
import { WorkflowNodeDataBase } from '@cadai/pxs-ng-core/interfaces';

type Status = 'queued' | 'running' | 'success' | 'error' | 'skipped';

export interface PipelineWorkflowDTO {
  name: string;
  nodes: { id: string; type: string; data?: WorkflowNodeDataBase }[];
  edges: { id: string; source: string; target: string }[];
  meta?: {createdAt: string, version:string};
}

interface StageNode {
  id: string;
  label: string;
  type: string;
}

@Component({
  selector: 'app-pipeline-progress',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule, MatButtonModule, TranslateModule, MatMenuModule],
  template: `
    <div class="pipe" [class.compact]="compact">
      <div class="pipe-header">

        <div class="controls">
          <button mat-flat-button
                  class="accent"
                  (click)="onCancelPipeline()"
                  [disabled]="!canCancelPipeline()"
                  [matTooltip]='"workflow.runPanel.cancel_pipe" | translate'>
            <mat-icon>cancel</mat-icon>
            {{"workflow.runPanel.cancel_pipe" | translate}}
          </button>
        </div>

        <div class="legend" *ngIf="showLegend">
          <span class="lg lg-queued"><i></i>{{"workflow.runPanel.queued" | translate}}</span>
          <span class="lg lg-running"><i></i>{{"workflow.runPanel.running" | translate}}</span>
          <span class="lg lg-success"><i></i>{{"workflow.runPanel.success" | translate}}</span>
          <span class="lg lg-error"><i></i>{{"workflow.runPanel.error" | translate}}</span>
          <span class="lg lg-skipped"><i></i>{{"workflow.runPanel.skipped" | translate}}</span>
        </div>
      </div>

      <div class="stages" *ngIf="stages().length">
        <div class="stage" *ngFor="let col of stages(); let i = index">
          <div class="nodes">
            <div class="node"
                *ngFor="let n of col"
                [class.is-input]="n.type==='input'"
                [class.is-result]="n.type==='result'"
                [class.queued]="statusOf(n.id)==='queued'"
                [class.running]="statusOf(n.id)==='running'"
                [class.success]="statusOf(n.id)==='success'"
                [class.error]="statusOf(n.id)==='error'"
                [class.skipped]="statusOf(n.id)==='skipped'">

                @if(n.type!=='result' && n.type!=='input') {
                  <div class="emblem">
                    <span class="dot"></span>
                    <mat-icon class="icon" *ngIf="statusOf(n.id)==='queued'">hourglass_empty</mat-icon>
                    <mat-icon class="icon" *ngIf="statusOf(n.id)==='running'">play_arrow</mat-icon>
                    <mat-icon class="icon" *ngIf="statusOf(n.id)==='success'">check_circle</mat-icon>
                    <mat-icon class="icon" *ngIf="statusOf(n.id)==='error'">error</mat-icon>
                  </div>
                  <div class="label" [matTooltip]="n.label">{{ n.label }}</div>
                  <div class="run-shimmer" *ngIf="statusOf(n.id)==='running'"></div>
                  <div class="stage-actions">
                    <button mat-mini-fab
                            class="accent"
                            (click)="onCancelStage(i)"
                            [disabled]="!canCancelStage(i)"
                            [matTooltip]='"workflow.runPanel.cancel_stage" | translate'>
                      <mat-icon>block</mat-icon>
                    </button>
                  </div>
              } @else {
                <button mat-mini-fab
                  *ngIf="n.type==='result'"
                  color="primary"
                  class="primary"
                  (click)="onCancelStage(i)"
                  [matTooltip]='"workflow.runPanel.results" |translate'
                  [matMenuTriggerFor]="menu">
                  <mat-icon>more_horiz</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item>
                    <mat-icon>chat_paste_go</mat-icon>
                    <span>{{"workflow.runPanel.go_chat" |translate}}</span>
                  </button>
                  <button mat-menu-item>
                    <mat-icon>save_as</mat-icon>
                    <span>{{"workflow.runPanel.export" |translate}}</span>
                  </button>
                  <button mat-menu-item>
                    <mat-icon>delete</mat-icon>
                    <span>{{"delete" |translate}}</span>
                  </button>
                </mat-menu>
              }
            </div>
          </div>
        </div>
      </div>
      <div class="empty" *ngIf="!stages().length">{{"no_stages" | translate}}</div>
    </div>
  `,
  styles: [`
:host { margin: 18px; display: block; }

/* ========= THEME / TOKENS ========= */
.pipe {
  --c-muted:   #cfd8dc;
  --c-fg:      #263238;
  --c-bg:      #ffffff;

  --c-queued:  #90a4ae;
  --c-running: #1e88e5;
  --c-ok:      #2e7d32;
  --c-err:     #e53935;
  --c-skip:    #9e9e9e;

  --node-radius: 30px;
  --node-pad-y: 8px;
  --node-pad-x: 10px;
  --gap-x: 24px;
  --gap-y: 10px;

  color: var(--c-fg);
}

:host-context(.dark) .pipe {
  --c-bg:      #0f1115;
  --c-fg:      #e3eaf1;
  --c-muted:   #33424e;
  --c-queued:  #6c7a86;
  --c-running: #69a8ff;
  --c-ok:      #4caf50;
  --c-err:     #ff6b6b;
  --c-skip:    #9aa6b2;
  border-color: #2a3640;
}

.pipe.compact {
  --node-radius: 30px;
  --node-pad-y: 6px;
  --node-pad-x: 8px;
  --gap-x: 20px;
  --gap-y: 8px;
}

/* ========= HEADER ========= */
.pipe-header {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.title { font-weight: 600; font-size: 14px; }

/* Header controls */
.controls {
  margin-left: auto;
  display: inline-flex;
  gap: 8px;
}

/* Légende */
.legend { display: inline-flex; gap: 10px; font-size: 12px; color:#607d8b; }
.legend .lg { display: inline-flex; align-items: center; gap: 6px; }
.legend .lg i { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.legend .lg-queued i { background: var(--c-queued); }
.legend .lg-running i { background: var(--c-running); }
.legend .lg-success i { background: var(--c-ok); }
.legend .lg-error i { background: var(--c-err); }
.legend .lg-skipped i { background: var(--c-skip); }

/* ========= COLONNES (FLEX) ========= */
.stages {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--gap-x);
}

.stage {
  position: relative;
  display: flex;
  flex-direction: column;
}

/* actions stage */
.stage-actions {
  display: flex; align-items: center; justify-content: space-between;
}
.stage-title { font-size: 12px; color: #607d8b; font-weight: 600; }

/* pile de nodes */
.nodes {
  display: flex;
  flex-direction: column;
  gap: var(--gap-y);
  position: relative;
  z-index: 2;
}

/* ========= NODE ========= */
.node {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e0e0e0;
  border-radius: var(--node-radius);
  padding: 0  0 0 var(--node-pad-x) ;
  background: var(--c-bg);
  overflow: hidden;
}

.node .emblem {
  flex: 0 0 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.node .emblem .dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--c-muted);
}
.node .emblem .icon {
  font-size: 23px; width: 28px; height: 28px; opacity: .9;
  display: flex; align-items: center; justify-content: center;
}
.node .label {
  flex: 1 1 auto;
  min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-size: 18px;
}

/* Shimmer pendant running */
.run-shimmer {
  position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 0%, rgba(30,136,229,.06) 35%, transparent 70%);
  animation: shimmer 1.2s linear infinite;
  pointer-events: none;
}
@keyframes shimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }

/* status */
.node.queued  { border-color: color-mix(in srgb, var(--c-queued) 45%, #e0e0e0); }
.node.running { border-color: var(--c-running); box-shadow: 0 0 0 2px color-mix(in srgb, var(--c-running) 20%, transparent); }
.node.success { border-color: var(--c-ok);      box-shadow: 0 0 0 2px color-mix(in srgb, var(--c-ok) 18%, transparent); }
.node.error   { border-color: var(--c-err);     box-shadow: 0 0 0 2px color-mix(in srgb, var(--c-err) 18%, transparent); }
.node.skipped { border-color: var(--c-skip); color: #616161; opacity: .9; }

.node.queued  .bar, .node.queued  .emblem .dot { background: var(--c-queued); }
.node.running .bar, .node.running .emblem .dot { background: var(--c-running); }
.node.success .bar, .node.success .emblem .dot { background: var(--c-ok); }
.node.error   .bar, .node.error   .emblem .dot { background: var(--c-err); }
.node.skipped .bar, .node.skipped .emblem .dot { background: var(--c-skip); }

.node.is-input { background: var(--mat-success); border: none; display: none; }
.node.is-result { background-color:transparent; border: none; border-radius:0;box-shadow:none; overflow: visible }
.empty { color: #78909c; font-style: italic; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PipelineProgressComponent {
  @Input() set workflow(v: PipelineWorkflowDTO | null | undefined) { this._wf.set(v ?? null); }
  @Input() set runState(v: Record<string, Status> | null | undefined) { this._run.set(v ?? {}); }
  @Input() compact = true;
  @Input() showLegend = true;
  @Input() applyCancelLocally = true;

  @Output() pipelineCancel = new EventEmitter<void>();
  @Output() stageCancel = new EventEmitter<{ index: number; nodeIds: string[] }>();

  private _wf = signal<PipelineWorkflowDTO | null>(null);
  private _run = signal<Record<string, Status>>({});

  private readonly EXCLUDED = new Set(['input', 'result']);

  private isActionable = (t: string) => !this.EXCLUDED.has(t);

  stages = computed<StageNode[][]>(() => {
    const wf = this._wf();
    if (!wf) return [];

    const allNodes = wf.nodes;
    const allEdges = wf.edges;

    const inputs   = allNodes.filter(n => n.type === 'input');
    const results  = allNodes.filter(n => n.type === 'result');
    const actions  = allNodes.filter(n => this.isActionable(n.type));     // ★
    const actionIds = new Set(actions.map(n => n.id));

    const edges = allEdges.filter(e => actionIds.has(e.source) && actionIds.has(e.target));

    const indeg = new Map<string, number>();
    const adj = new Map<string, string[]>();
    actions.forEach(n => { indeg.set(n.id, 0); adj.set(n.id, []); });
    edges.forEach(e => {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push(e.target);
      indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
    });

    const labelOf = (id: string) =>
      (allNodes.find(n => n.id === id)?.data?.label ?? allNodes.find(n => n.id === id)?.id ?? id);
    const typeOf  = (id: string) => (allNodes.find(n => n.id === id)?.type ?? 'action');

    const layers: StageNode[][] = [];
    let frontier = actions.filter(n => (indeg.get(n.id) ?? 0) === 0).map(n => n.id);
    const remaining = new Set(actions.map(n => n.id));

    while (frontier.length) {
      const layer = frontier.slice();
      layers.push(layer.map(id => ({ id, label: labelOf(id), type: typeOf(id) })));
      frontier = [];
      for (const u of layer) {
        remaining.delete(u);
        for (const v of (adj.get(u) ?? [])) {
          indeg.set(v, (indeg.get(v) ?? 0) - 1);
          if ((indeg.get(v) ?? 0) === 0) frontier.push(v);
        }
      }
    }

    if (remaining.size) {
      layers.push([...remaining].map(id => ({ id, label: labelOf(id), type: typeOf(id) })));
    }

    const mk = (n:{ id: string; type: string; data?: WorkflowNodeDataBase; }): StageNode =>
      ({ id: n.id, type: n.type, label: (n.data?.label ?? n.id) });

    if (inputs.length)  layers.unshift(inputs.map(mk));
    if (results.length) layers.push(results.map(mk));

    return layers;
  });

  statusOf = (id: string): Status => {
    const wf = this._wf();
    if (!wf) return 'queued';
    const t = wf.nodes.find(n => n.id === id)?.type ?? 'action';
    if (!this.isActionable(t)) return 'skipped'; // ★
    return this._run()[id] ?? 'queued';
  };

  canCancelStage = (i: number): boolean => {
    const col = this.stages()[i] ?? [];
    return col
      .filter(n => this.isActionable(n.type))               // ★
      .some(n => ['queued', 'running'].includes(this.statusOf(n.id)));
  };

  canCancelPipeline = (): boolean => {
    const wf = this._wf(); if (!wf) return false;
    return wf.nodes
      .filter(n => this.isActionable(n.type))               // ★
      .some(n => ['queued', 'running'].includes(this.statusOf(n.id)));
  };

  onCancelStage(i: number): void {
    const actionableIds = (this.stages()[i] ?? [])
      .filter(n => this.isActionable(n.type))               // ★
      .map(n => n.id);

    this.stageCancel.emit({ index: i, nodeIds: actionableIds }); // ★

    if (!this.applyCancelLocally) return;

    const next = { ...this._run() };
    for (const id of actionableIds) {
      if (['queued', 'running'].includes(next[id] ?? 'queued')) {
        next[id] = 'skipped';
      }
    }
    this._run.set(next);
  }

  onCancelPipeline(): void {
    this.pipelineCancel.emit();

    if (!this.applyCancelLocally) return;

    const wf = this._wf(); if (!wf) return;
    const next = { ...this._run() };
    for (const n of wf.nodes) {
      if (!this.isActionable(n.type)) continue; 
      if (['queued', 'running'].includes(next[n.id] ?? 'queued')) {
        next[n.id] = 'skipped';
      }
    }
    this._run.set(next);
  }
}