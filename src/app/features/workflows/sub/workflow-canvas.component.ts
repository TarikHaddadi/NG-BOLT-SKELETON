
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  DfArrowhead,
  DfConnectionPoint,
  DfConnectionType,
  DfDataConnection,
  DfDataInitialNode,
  DfDataModel,
  DfDataNode,
  DfEvent,
  dfPanZoomOptionsProvider,
  NgDrawFlowComponent,
  provideNgDrawFlowConfigs,
} from '@ng-draw-flow/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  ActionDefinitionLite,
  FieldConfig,
  InspectorActionType,
  PaletteType,
  ToolbarAction,
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeDataBase,
} from '@cadai/pxs-ng-core/interfaces';
import { FieldConfigService, ToastService, ToolbarActionsService } from '@cadai/pxs-ng-core/services';
import { MatTooltipModule } from '@angular/material/tooltip';

import { WfNodeComponent } from './action-node.component';
import { DynamicFormComponent } from '@cadai/pxs-ng-core/shared';
import { WfCanvasBus } from './wf-canvas-bus';
import { PipelineWorkflowDTO } from './pipeline-progress.component';
import { MatIconModule } from '@angular/material/icon';
import { WfRunPanelNodeComponent } from './run-panel-node.component';

/** ===== Helpers & constants ===== */
const EXEC_TYPES = new Set<PaletteType>([
  'input', 'result', 'chat-basic', 'compare', 'summarize', 'extract', 'jira'
]);

function defaultPortsFor(type: string): WorkflowNode['ports'] {
  if (type === 'input') return { inputs: [], outputs: [{ id: 'out', label: 'out', type: 'json' }] };
  if (type === 'result') return { inputs: [{ id: 'in', label: 'in', type: 'json' }], outputs: [] };
  if (type === 'run-panel') return { inputs: [], outputs: [] };
  return {
    inputs: [{ id: 'in', label: 'in', type: 'json' }],
    outputs: [{ id: 'out', label: 'out', type: 'json' }],
  };
}

function isExecutableNode(n: WorkflowNode): boolean {
  return EXEC_TYPES.has(n.type as PaletteType);
}

function filterForRuntime(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const keptNodes = nodes.filter(isExecutableNode);
  const keepIds = new Set(keptNodes.map(n => n.id));
  const keptEdges = edges.filter(e => keepIds.has(e.source) && keepIds.has(e.target));
  return { nodes: keptNodes, edges: keptEdges };
}

// ---- Types ----
type Primitive = string | number | boolean | null;
type WithParams<P> = Omit<WorkflowNodeDataBase, 'params'> & { params?: P };

// Binary things we want to strip/cache
type Binary = File | Blob;

// What params may contain: plain values, objects/arrays, binaries or arrays of binaries
export type WithFiles =
  | Primitive
  | Binary
  | Binary[]
  | { [k: string]: WithFiles }
  | WithFiles[];

// Placeholders used in sanitized output
export interface FilePlaceholder { __file: true; name: string; size: number; type: string };
export interface BlobPlaceholder { __blob: true; size: number; type: string };
type BinaryPlaceholder =
  | { __file: true; name: string; size: number; type: string }
  | { __blob: true; size: number; type: string };
// Recursively replace File/Blob/(File[]) with placeholders
export type ReplaceBinary<T> =
  T extends File ? FilePlaceholder :
  T extends Blob ? BlobPlaceholder :
  T extends (infer U)[] ? ReplaceBinary<U>[] :
  T extends object ? { [K in keyof T]: ReplaceBinary<T[K]> } :
  T;


// ---- Type guards ----
function isFile(v: unknown): v is File {
  return typeof File !== 'undefined' && v instanceof File;
}
function isBlob(v: unknown): v is Blob {
  return typeof Blob !== 'undefined' && v instanceof Blob;
}
function isArrayOfFiles(v: unknown): v is File[] {
  return Array.isArray(v) && v.length > 0 && isFile(v[0]);
}
type Sanitized<T> =
  ReplaceBinary<NonNullable<T>> |
  (undefined extends T ? undefined : never);

// Make the event type allow undefined for params
export interface  NodeParamsChangedEvent<T extends WithFiles | undefined = WithFiles | undefined> {
  nodeId: string;
  params: T;
};


/** ===== Component ===== */
@Component({
  selector: 'app-workflow-canvas-df',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    DragDropModule,
    MatButtonModule,
    NgDrawFlowComponent,
    DynamicFormComponent,
    TranslateModule,
    MatTooltipModule,
    MatIconModule
  ],
  providers: [
    dfPanZoomOptionsProvider({
      leftPosition: 350,
    }),
    provideNgDrawFlowConfigs({
      nodes: {
        input: WfNodeComponent,
        result: WfNodeComponent,
        'chat-basic': WfNodeComponent,
        'chat-on-file': WfNodeComponent,
        compare: WfNodeComponent,
        summarize: WfNodeComponent,
        extract: WfNodeComponent,
        jira: WfNodeComponent,
        'run-panel': WfRunPanelNodeComponent,
      },
      connection: {
        type: DfConnectionType.SmoothStep,
        arrowhead: { type: DfArrowhead.ArrowClosed, height: 5, width: 5 },
        curvature: 10,
      },
    }),
  ],
  templateUrl: './workflow-canvas-df.component.html',
  styleUrls: ['./workflow-canvas-df.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowCanvasDfComponent implements OnInit {
  @ViewChild('flow', { static: true }) flow!: NgDrawFlowComponent;
  @ViewChild('flowEl', { static: true, read: ElementRef })
  private flowElementRef!: ElementRef<HTMLElement>;

  private suppressExternal = false;
  translate = inject(TranslateService);

  /** ===== Inputs from parent (exec-only) ===== */
  @Input({ required: true })
  set nodes(value: WorkflowNode[] | null | undefined) {
    if (this.suppressExternal) return;

    const incoming = (value ?? []).filter(isExecutableNode);

    // ignore accidental clears
    if (incoming.length === 0 && this.execNodes().length > 0) return;

    // if parent is sending exactly what we already have (topology-wise), ignore
    const sigNew = this.makeTopoSig(incoming, this._edges());
    if (sigNew === this.lastIncomingSig || sigNew === this.lastTopoSig) return;
    this.lastIncomingSig = sigNew;

    const current = this.execNodes();
    const currentById = new Map(current.map(n => [n.id, n]));
    const incomingById = new Map(incoming.map(n => [n.id, n]));

    // initial load: accept all
    if (current.length === 0) {
      const mergedExec = incoming.map(v => {
        const existing = currentById.get(v.id);
        return existing ? { ...v, x: existing.x, y: existing.y } : v;
      });
      this.execNodes.set(mergedExec);
      this.publishGraphValidity();
      return;
    }

    // merge-only: update existing IDs, do NOT add new ones from parent unless not racing a local change
    const mergedExec = current.map(n => {
      const inc = incomingById.get(n.id);
      if (!inc) return n;
      return { ...inc, x: n.x, y: n.y }; // keep our layout
    });

    const justChangedLocally = Date.now() - this.lastLocalChangeAt < 300;
    if (!justChangedLocally) {
      for (const [id, inc] of incomingById) {
        if (!currentById.has(id)) mergedExec.push({ ...inc });
      }
    }

    this.execNodes.set(mergedExec);
    this.publishGraphValidity();
  }

  @Input({ required: true })
  set edges(value: WorkflowEdge[] | null | undefined) {
    if (this.suppressExternal) return;
    const incoming = value ?? [];

    if (incoming.length === 0 && this._edges().length > 0) return;
    const cur = this._edges();
    if (incoming.length === cur.length && incoming.every((e, i) => e.id === cur[i].id)) return;

    this._edges.set(incoming);

    // recompute UI flags using *all* nodes:
    const nodesWithUi = this.withUiConnectivity(this.allNodes(), incoming);
    const nextExec = nodesWithUi.filter(isExecutableNode);
    const nextUi = nodesWithUi.filter(n => !isExecutableNode(n));
    this.execNodes.set(nextExec);
    this.uiNodes.set(nextUi);

    this.emitConnectivity(nodesWithUi, incoming);
    this.publishGraphValidity();
  }

  @Input() set disabled(value: boolean) {
    this.disabledSig.set(!!value);
  }
  @Input() set availableActions(value: ActionDefinitionLite[]) {
    this.availableActionsSig.set(value ?? []);
  }

  @Output() OnCanvasChange = new EventEmitter<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }>();

  /** ===== Local state (signals) ===== */
  disabledSig = signal<boolean>(false);
  availableActionsSig = signal<ActionDefinitionLite[]>([]);
  isPaletteDragging = signal<boolean>(false);
  showPalette = signal(false);

  private execNodes = signal<WorkflowNode[]>([]); // exec-only
  private uiNodes = signal<WorkflowNode[]>([]);   // UI-only (run-panel, overlays, etc.)
  private allNodes = computed(() => [...this.execNodes(), ...this.uiNodes()]);

  private _edges = signal<WorkflowEdge[]>([]);
  private zoom = signal<number>(1);
  private pan = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  // inspector / header form
  public form!: FormGroup;
  public fieldConfig: FieldConfig[] = [];
  private toolbar = inject(ToolbarActionsService);
  private destroyRef = inject(DestroyRef);

  // selection
  selectedNodeId = signal<string | null>(null);

  // run simulation
  pipelineDto = signal<PipelineWorkflowDTO | null>(null);
  runState = signal<Record<string, 'queued' | 'running' | 'success' | 'error' | 'skipped'>>({});
  private sim = {
    running: false,
    indeg: new Map<string, number>(),
    ready: [] as string[],
    timers: new Map<string, number>(),
    cancelled: new Set<string>(),
    pipelineCancelled: false,
  };

  // sync guards
  private lastIncomingSig = '';
  private lastTopoSig = '';
  private lastLocalChangeAt = 0;

  // Close menu on ESC
  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.setSelectedNode(null);
  }

  /** ===== DrawFlow model mapping ===== */
  dfModel = computed<DfDataModel>(() => {
    const nodes = this.allNodes() ?? [];
    const edges = this._edges() ?? [];

    // degree maps
    const outDeg = new Map<string, number>(), inDeg = new Map<string, number>();
    nodes.forEach(n => { outDeg.set(n.id, 0); inDeg.set(n.id, 0); });
    edges.forEach(e => {
      outDeg.set(e.source, (outDeg.get(e.source) ?? 0) + 1);
      inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    });

    const nodesArr: DfDataInitialNode[] = nodes.map((n) => {
      const ports = n.ports ?? defaultPortsFor(n.type);

      const needsIn = (ports.inputs?.length ?? 0) > 0 && n.type !== 'input';
      const needsOut = (ports.outputs?.length ?? 0) > 0 && n.type !== 'result';
      const hasIn = (inDeg.get(n.id) ?? 0) > 0;
      const hasOut = (outDeg.get(n.id) ?? 0) > 0;

      const paramsUi = n.data?.params?.ui ?? {};

      const dataForDf = { ...n.data };

      return {
        id: n.id,
        data: {
          type: n.type,
          ...dataForDf,
          ui: paramsUi,
          ports,
          __missingIn: needsIn && !hasIn,
          __missingOut: needsOut && !hasOut,
        },
        position: { x: n.x, y: n.y },
       /*  startNode: n.type === 'input',
        endNode: n.type === 'result', */
      };
    });

    const conns: DfDataConnection[] = edges.map((e) => ({
      source: { nodeId: e.source, connectorType: DfConnectionPoint.Output, connectorId: e.sourcePort },
      target: { nodeId: e.target, connectorType: DfConnectionPoint.Input, connectorId: e.targetPort },
    }));

    return { nodes: nodesArr, connections: conns };
  });
  private fileCache = new Map<string, Record<string, Binary | Binary[]>>();

  private handleNodeParamsChanged = <T extends WithFiles | undefined>(
    { nodeId, params }: NodeParamsChangedEvent<T>
  ): void => {
    let safeParams: Sanitized<T>;
    if (params === undefined) {
      safeParams = undefined as Sanitized<T>;
    } else {
      const p = params as NonNullable<T>;
      const sanitized = this.extractFiles(nodeId, p) as ReplaceBinary<NonNullable<T>>;
      safeParams = sanitized as Sanitized<T>;
    }

    this.updateNodeById(
      nodeId,
      (n) => {
        const prev = (n.data ?? {}) as WithParams<unknown>;
        const merged = {
          ...(prev.params ?? {}),     // ✅ keep existing
          ...(safeParams as object ?? {})
        };
        const next: WithParams<typeof merged> = { ...prev, params: merged };
        return { ...n, data: next as WorkflowNodeDataBase };
      },
      { emitToParentIfExec: true }
    );
  };

  constructor(
    private bus: WfCanvasBus,
    private readonly fb: FormBuilder,
    private readonly fields: FieldConfigService,
    private toast: ToastService,
  ) {

    this.bus.nodeParamsChanged$.subscribe((e) =>
      this.handleNodeParamsChanged(e as NodeParamsChangedEvent<WithFiles>)
    );
    this.bus.nodeToggleExpand$.subscribe(({ nodeId, expanded }) => {
      this.updateNodeById(
        nodeId,
        (n) => {
          return {
          ...n,
          data: {
            ...n.data,
            // write to params.ui.expanded (that's what the node reads)
            params: {
              ...(n.data?.params ?? {}),
              ui: {
                ...(n.data?.params?.ui ?? {}),
                expanded,
              },
            },
          },
        }
        },
        { emitToParentIfExec: false }
      );
    });


    // run pipeline
    this.bus.runRequested$.subscribe(() => this.startPipelineFromCurrent());

    // toggle run panel (pure UI node)
    this.bus.toggleRunPanel$.subscribe(({ anchorNodeId }) => this.toggleRunPanel(anchorNodeId));

    // cancellations
    this.bus.stageCancel$.subscribe(e => this.handleStageCancel(e));
    this.bus.pipelineCancel$.subscribe(() => this.handlePipelineCancel());

    // toolbar
    const saveWorkflow: ToolbarAction = {
      id: 'save_workflow',
      icon: 'save',
      tooltip: 'save_workflow',
      click: () => this.submit(),
      variant: 'flat',
      label: 'SAVE',
      class: 'primary'
    };
    const draftWorkflow: ToolbarAction = {
      id: 'draft_workflow',
      icon: 'edit_document',
      tooltip: 'draft_workflow',
      click: () => this.submit(),
      variant: 'flat',
      label: 'Draft',
      class: 'accent'
    };
    const publishWorkflow: ToolbarAction = {
      id: 'publish_workflow',
      icon: 'publish',
      tooltip: 'publish_workflow',
      click: () => this.submit(),
      variant: 'flat',
      label: 'Publish',
      class: 'success'
    };
    this.toolbar.scope(this.destroyRef, [saveWorkflow, draftWorkflow, publishWorkflow]);
  }

  ngOnInit(): void {
    this.form = this.fb.group({});
    this.fieldConfig = [
      this.fields.getTextField({
        name: 'workflowName',
        label: 'form.labels.name',
        placeholder: 'form.placeholders.name',
        validators: [Validators.required, Validators.minLength(2), Validators.maxLength(80)],
        errorMessages: {
          required: 'form.errors.input.required',
          minlength: 'form.errors.input.minlength',
          maxlength: 'form.errors.input.maxlength',
        },
        color: 'primary',
        layoutClass: 'primary',
        helperText: ''
      }),
    ];

    queueMicrotask(() => this.publishGraphValidity());
  }

  /** ===== UI-only run panel ===== */
  private toggleRunPanel(anchorNodeId?: string) {
    const RUN_PANEL_ID = 'run-panel-node';
    const ui = this.uiNodes();
    const idx = ui.findIndex(n => n.id === RUN_PANEL_ID || n.type === 'run-panel');

    if (idx >= 0) {
      const nextUi = ui.slice();
      nextUi.splice(idx, 1);
      this.uiNodes.set(nextUi);

      const withUi = this.withUiConnectivity(this.allNodes(), this._edges());
      this.execNodes.set(withUi.filter(isExecutableNode));
      this.uiNodes.set(withUi.filter(n => !isExecutableNode(n)));
      return;
    }

    const all = this.allNodes();
    const anchor = all.find(n => n.id === anchorNodeId) || all.find(n => n.type === 'result');
    const rp: WorkflowNode = {
      id: RUN_PANEL_ID,
      type: 'run-panel',
      x: anchor?.x ?? 460, y: anchor ? anchor.y + 160 : 100,
      data: { label: 'Run' },
      ports: { inputs: [], outputs: [] },
    };

    this.uiNodes.set([...ui, rp]);

    const withUi = this.withUiConnectivity(this.allNodes(), this._edges());
    this.execNodes.set(withUi.filter(isExecutableNode));
    this.uiNodes.set(withUi.filter(n => !isExecutableNode(n)));
  }

  private humanLabelFor(t: PaletteType): string {
    if (t === 'input' || t === 'result') return t.charAt(0).toUpperCase() + t.slice(1);
    const pretty: Record<InspectorActionType, string> = {
      'chat-basic': 'chat',
      compare: 'compare',
      summarize: 'summarize',
      extract: 'extract',
      jira: 'jira',
      'run-panel': 'run',
    };
    return pretty[t].toLocaleLowerCase();
  }

  /** ===== Validation & normalization ===== */
  private publishGraphValidity(): void {
    const nodes = this.execNodes();
    const edges = this._edges();
    const err = this.validateGraph(nodes, edges);
    this.bus.graphValid$.next(!err);
  }

  private validateGraph(nodesArg: WorkflowNode[] | null | undefined,
    edgesArg: WorkflowEdge[] | null | undefined): string | null {
    const nodes = (nodesArg ?? []).filter(isExecutableNode);
    const edges = (edgesArg ?? []).filter(e =>
      nodes.some(n => n.id === e.source) && nodes.some(n => n.id === e.target)
    );
    const inputs = nodes.filter(n => n.type === 'input');
    const results = nodes.filter(n => n.type === 'result');
    if (inputs.length !== 1) return this.translate.instant('workflow.errors.exactlyOneInput');
    if (results.length !== 1) return this.translate.instant('workflow.errors.exactlyOneResult');

    const outMap = new Map<string, WorkflowEdge[]>(), inMap = new Map<string, WorkflowEdge[]>();
    for (const n of nodes) { outMap.set(n.id, []); inMap.set(n.id, []); }
    for (const e of edges) { outMap.get(e.source)!.push(e); inMap.get(e.target)!.push(e); }

    for (const n of nodes) {
      const ports = n.ports ?? defaultPortsFor(n.type);
      const hasIn = (inMap.get(n.id)?.length ?? 0) > 0;
      const hasOut = (outMap.get(n.id)?.length ?? 0) > 0;
      const needsIn = (ports.inputs?.length ?? 0) > 0 && n.type !== 'input';
      const needsOut = (ports.outputs?.length ?? 0) > 0 && n.type !== 'result';
      if (needsIn && !hasIn) return this.translate.instant('workflow.errors.nodeMissingInput', { id: n.data?.label ?? n.id });
      if (needsOut && !hasOut) return this.translate.instant('workflow.errors.nodeMissingOutput', { id: n.data?.label ?? n.id });
    }

    // Acyclic check
    const indeg = new Map<string, number>();
    nodes.forEach(n => indeg.set(n.id, 0));
    edges.forEach(e => indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1));
    const q: string[] = []; indeg.forEach((d, id) => { if (d === 0) q.push(id); });
    let visited = 0;
    while (q.length) {
      const id = q.shift()!;
      visited++;
      for (const e of outMap.get(id) ?? []) {
        const t = e.target;
        indeg.set(t, (indeg.get(t) ?? 0) - 1);
        if ((indeg.get(t) ?? 0) === 0) q.push(t);
      }
    }
    if (visited !== nodes.length) return this.translate.instant('workflow.errors.cycleDetected');
    return null;
  }

  private normalize(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    const cleanNodes:WorkflowNode[] = nodes.map(n => ({
      id: n.id,
      type: n.type,
      x: Math.round(n.x ?? 0),
      y: Math.round(n.y ?? 0),
      data: {
        label: n.data?.label ?? '',
        aiType: n.data?.aiType,
        params: n.data?.params ?? {},
        ui: undefined,
      },
      ports: n.ports ?? defaultPortsFor(n.type),
    }));

    const cleanEdges = edges.map(e => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourcePort: e.sourcePort,
      targetPort: e.targetPort,
      label: e.label ?? '',
    }));

    return { cleanNodes, cleanEdges };
  }

  private withUiConnectivity(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    const outMap = new Map<string, number>(), inMap = new Map<string, number>();
    nodes.forEach(n => { outMap.set(n.id, 0); inMap.set(n.id, 0); });
    edges.forEach(e => {
      outMap.set(e.source, (outMap.get(e.source) ?? 0) + 1);
      inMap.set(e.target, (inMap.get(e.target) ?? 0) + 1);
    });

    return nodes.map(n => {
      const ports = n.ports ?? defaultPortsFor(n.type);
      const hasIn = (inMap.get(n.id) ?? 0) > 0;
      const hasOut = (outMap.get(n.id) ?? 0) > 0;

      const needsIn = (ports.inputs?.length ?? 0) > 0 && n.type !== 'input';
      const needsOut = (ports.outputs?.length ?? 0) > 0 && n.type !== 'result';

      const __missingIn = needsIn && !hasIn;
      const __missingOut = needsOut && !hasOut;

      const prevParams = (n.data?.params?.ui ?? {}) as Record<string, unknown>;

      return {
        ...n,
        data: {
          ...n.data,
          params: {
            ...prevParams,
            __missingIn,
            __missingOut,
          },
        },
      } as WorkflowNode;
    });
  }

  /** ===== Canvas events ===== */
  onScale(z: number): void {
    this.zoom.set(z);
  }

  onPan(ev: unknown): void {
    const p = ev as Partial<{ x: number; y: number }>;
    if (typeof p?.x === 'number' && typeof p?.y === 'number') {
      this.pan.set({ x: p.x, y: p.y });
    }
  }

  onDrop(ev: CdkDragDrop<unknown, unknown, unknown>): void {
    if (this.disabledSig()) return;

    const action = ev.item?.data as ActionDefinitionLite | undefined;
    if (!action) return;

    const client = ev.dropPoint;
    const { x, y } = client;

    const id = crypto?.randomUUID?.() ?? 'node-' + Math.random().toString(36).slice(2, 9);
    const node: WorkflowNode = {
      id,
      type: action.type,
      x, y,
      data: {
        label: this.humanLabelFor(action.type),
        aiType: action.type as InspectorActionType,
        params: { ...action.params, ui: { expanded: true } },
      },
      ports: defaultPortsFor(action.type),
    };

    if (action.type === 'run-panel') {
      if (this.uiNodes().some(n => n.type === 'run-panel')) return;
      const uiNext = [...this.uiNodes(), node];
      this.uiNodes.set(uiNext);
      return;
    }

    const execNext = [...this.execNodes(), node];
    const withUi = this.withUiConnectivity([...execNext, ...this.uiNodes()], this._edges());
    this.execNodes.set(execNext);

    this.suppressExternal = true;
    this.OnCanvasChange.emit({ nodes: execNext, edges: this._edges() });
    queueMicrotask(() => (this.suppressExternal = false));

    this.emitConnectivity(withUi, this._edges());
    this.publishGraphValidity();
  }

  onModelChange = (m: DfDataModel): void => {
    const prevExec = this.execNodes();
    const prevUi = this.uiNodes();

    const noNodes = !m?.nodes || m.nodes.length === 0;
    const noConns = !m?.connections || m.connections.length === 0;

    // edges: rebuild when provided, else keep previous
    const nextEdges: WorkflowEdge[] = noConns
      ? this._edges()
      : m.connections.map(c => ({
        id: this.makeEdgeId(c.source.nodeId, c.source.connectorId, c.target.nodeId, c.target.connectorId),
        source: c.source.nodeId,
        target: c.target.nodeId,
        sourcePort: c.source.connectorId,
        targetPort: c.target.connectorId,
        label: '',
        style: { marker: 'solid', stroke: '#607d8b', strokeWidth: 2 },
      }));
    this.upsertEdges(nextEdges);

    // build DF nodes merged with previous (stable fields)
    const prevById = new Map<string, WorkflowNode>([...prevExec, ...prevUi].map(n => [n.id, n]));
    const fromDf: WorkflowNode[] = noNodes ? [] : m.nodes!.map(raw => {
      const prev = prevById.get(raw.id);
      const rawData = (raw as DfDataNode).data ?? {};
      const pos = (raw as DfDataNode).position ?? { x: prev?.x ?? 0, y: prev?.y ?? 0 };
      const type = rawData.type as PaletteType ?? prev?.type;
      const ports = rawData?.['ports'] ?? prev?.ports ?? defaultPortsFor(type);

      const data = { ...(prev?.data ?? {}), ...rawData, type };
      return { id: raw.id, type, x: pos.x, y: pos.y, data, ports };
    });

    // DF is authoritative for exec nodes only
    const dfExec = fromDf.filter(isExecutableNode);

    // merge into current buckets by id
    const mergeMap = new Map<string, WorkflowNode>(fromDf.map(n => [n.id, n] as [string, WorkflowNode]));
    const mergeById = (list: WorkflowNode[]) => list.map(n => mergeMap.get(n.id) ?? n);
    let nextExec = mergeById(prevExec);
    let nextUi = mergeById(prevUi);

    // additions: exec only
    for (const n of dfExec) {
      if (!prevById.has(n.id)) nextExec = [...nextExec, n];
    }

    // recompute UI flags and project back to buckets
    const union = [...nextExec, ...nextUi];
    const withUi = this.withUiConnectivity(union, nextEdges);
    const byId = new Map(withUi.map(n => [n.id, n]));
    nextExec = nextExec.map(n => byId.get(n.id) ?? n);
    nextUi = nextUi.map(n => byId.get(n.id) ?? n);

    // commit
    this.execNodes.set(nextExec);
    this.uiNodes.set(nextUi);
    this.emitConnectivity(withUi, nextEdges);
    this.publishGraphValidity();

    // emit to parent only when topology/layout changed
    const sig = this.makeTopoSig(nextExec, nextEdges);
    if (sig !== this.lastTopoSig) {
      this.lastTopoSig = sig;
      this.suppressExternal = true;
      this.emitExecOnly(nextExec, nextEdges);
      queueMicrotask(() => (this.suppressExternal = false));
    }
  };

  onNodeSelected(e: unknown): void {
    const nodeId = (e as { id?: string; nodeId?: string }).id ?? (e as { nodeId?: string }).nodeId ?? null;
    this.setSelectedNode(nodeId);
  }

  onNodeMoved(_evt: unknown): void {
    console.log(_evt);
    // no-op for now
  }

  onConnectionSelected(_evt: unknown): void {
    console.log(_evt);
    // no-op for now
  }

  onConnectionCreated(evt: DfEvent<DfDataConnection>): void {
    const t = evt?.target?.target, s = evt?.target?.source;
    if (!s || !t) return;

    const all = this.allNodes();
    const srcNode = all.find(n => n.id === s.nodeId);
    const tgtNode = all.find(n => n.id === t.nodeId);

    const isInputResultPair =
      srcNode && tgtNode &&
      (
        (srcNode.type === 'input' && tgtNode.type === 'result') ||
        (srcNode.type === 'result' && tgtNode.type === 'input')
      );

    if (isInputResultPair) {
      this.toast.show(
        this.translate.instant('workflow.errors.noDirectInputToResult') ||
        'You cannot connect Input directly to Result.',
        'Dismiss'
      );
      //  this.tryRemoveDfConnection(s, t);
      this.publishGraphValidity();
      return;
    }

    const id = this.makeEdgeId(s.nodeId, s.connectorId, t.nodeId, t.connectorId);
    if (this._edges().some(e => e.id === id)) return;

    const nextEdge: WorkflowEdge = {
      id,
      source: s.nodeId,
      target: t.nodeId,
      sourcePort: s.connectorId,
      targetPort: t.connectorId,
      label: '',
      style: { marker: 'solid', stroke: '#607d8b', strokeWidth: 2 },
    };

    const after = [...this._edges(), nextEdge];
    this._edges.set(after);

    const combined = [...this.execNodes(), ...this.uiNodes()];
    const withUi = this.withUiConnectivity(combined, after);

    this.emitConnectivity(withUi, after);
    this.publishGraphValidity();

    this.suppressExternal = true;
    this.OnCanvasChange.emit({ nodes: this.execNodes(), edges: after });
    queueMicrotask(() => (this.suppressExternal = false));
  }


  onConnectionDeleted(evt: DfEvent<DfDataConnection>): void {
    const t = evt?.target?.target, s = evt?.target?.source;
    if (!s || !t) return;
    const id = this.makeEdgeId(s.nodeId, s.connectorId, t.nodeId, t.connectorId);

    const after = this._edges().filter(e => e.id !== id);
    this._edges.set(after);

    const combined = [...this.execNodes(), ...this.uiNodes()];
    const withUi = this.withUiConnectivity(combined, after);

    this.emitConnectivity(withUi, after);
    this.publishGraphValidity();

    this.suppressExternal = true;
    this.OnCanvasChange.emit({ nodes: this.execNodes(), edges: after });
    queueMicrotask(() => (this.suppressExternal = false));
  }

  /** ===== Selection helpers ===== */
  setSelectedNode(id: string | null): void {
    const host = this.flowElementRef?.nativeElement;
    if (!host) {
      this.selectedNodeId.set(id);
      return;
    }

    const prev = this.selectedNodeId();
    if (prev) {
      const prevEl = host.querySelector(`[data-node-id="${prev}"]`) as HTMLElement | null;
      prevEl?.classList.remove('is-selected');
    }

    this.selectedNodeId.set(id);
    if (id) {
      const el = host.querySelector(`[data-node-id="${id}"]`) as HTMLElement | null;
      el?.classList.add('is-selected');
    }
  }

  /** ===== Node deletion ===== */
  onDeleteNode(evt: DfEvent<DfDataNode>): void {
    const id = evt?.target.id;

    if (!id) return;

    // UI-only node?
    const ui = this.uiNodes();
    const uiIdx = ui.findIndex(n => n.id === id);
    if (uiIdx >= 0) {
      const nextUi = ui.slice();
      nextUi.splice(uiIdx, 1);
      this.uiNodes.set(nextUi);

      const combined = [...this.execNodes(), ...nextUi];
      const withUi = this.withUiConnectivity(combined, this._edges());
      this.emitConnectivity(withUi, this._edges());

      if (this.selectedNodeId() === id) this.setSelectedNode(null);
      return;
    }

    const exec = this.execNodes();
    const node = exec.find(n => n.id === id);
    if (!node) return;
    if (this.isTerminal(id)) return; // protect input/result

    const nextExec = exec.filter(n => n.id !== id);
    const nextEdges = this._edges().filter(e => e.source !== id && e.target !== id);

    this.execNodes.set(nextExec);
    this._edges.set(nextEdges);

    const combined = [...nextExec, ...this.uiNodes()];
    const withUi = this.withUiConnectivity(combined, nextEdges);
    this.emitConnectivity(withUi, nextEdges);
    this.publishGraphValidity();

    // mark local change + pre-bump topo signature to avoid blink on parent echo
    this.lastLocalChangeAt = Date.now();
    this.lastTopoSig = this.makeTopoSig(nextExec, nextEdges);

    if (this.selectedNodeId() === id) this.setSelectedNode(null);

    this.suppressExternal = true;
    this.OnCanvasChange.emit({ nodes: nextExec, edges: nextEdges });
    queueMicrotask(() => (this.suppressExternal = false));
  }

  isTerminal(id: string | null): boolean {
    if (!id) return false;
    const n = this.execNodes().find(x => x.id === id);
    return !!n && (n.type === 'input' || n.type === 'result');
  }

  /** ===== Submit ===== */
  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.show(this.translate.instant('form.errors.fixFields'), 'Dismiss');
      return;
    }

    const nodes = this.execNodes();
    const edges = this._edges();
    const graphErr = this.validateGraph(nodes, edges);
    if (graphErr) {
      this.toast.show(graphErr, 'Dismiss');
      return;
    }

    const { cleanNodes, cleanEdges } = this.normalize(nodes, edges);

    const dto = {
      name: this.form.value.workflowName as string,
      nodes: cleanNodes,
      edges: cleanEdges,
      meta: { createdAt: new Date().toISOString(), version: 1 },
    };

    console.log(dto);
  }

  /** ===== Connectivity notifications ===== */
  private emitConnectivity(nodes: WorkflowNode[], edges: WorkflowEdge[]): void {
    const out = new Map<string, number>(), inn = new Map<string, number>();
    nodes.forEach(n => { out.set(n.id, 0); inn.set(n.id, 0); });
    edges.forEach(e => {
      out.set(e.source, (out.get(e.source) ?? 0) + 1);
      inn.set(e.target, (inn.get(e.target) ?? 0) + 1);
    });

    for (const n of nodes) {
      const ports = n.ports ?? defaultPortsFor(n.type);
      const needsIn = (ports.inputs?.length ?? 0) > 0 && n.type !== 'input';
      const needsOut = (ports.outputs?.length ?? 0) > 0 && n.type !== 'result';
      const missingIn = needsIn && ((inn.get(n.id) ?? 0) === 0);
      const missingOut = needsOut && ((out.get(n.id) ?? 0) === 0);
      this.bus.nodeConnectivity$.next({ nodeId: n.id, missingIn, missingOut });
    }
  }

  /** ===== Run simulation bits (unchanged logic) ===== */
  simulateRun(): void {
    const wf = this.pipelineDto();
    if (!wf) return;

    this.sim.running = true;
    this.sim.indeg.clear();
    this.sim.ready.length = 0;
    this.sim.timers.forEach(id => clearTimeout(id));
    this.sim.timers.clear();
    this.sim.cancelled.clear();
    this.sim.pipelineCancelled = false;

    const next = { ...this.runState() };
    wf.nodes.forEach(n => next[n.id] = 'queued');
    this.runState.set(next);
    this.bus.runState$.next(next);

    wf.nodes.forEach(n => this.sim.indeg.set(n.id, 0));
    wf.edges.forEach(e => this.sim.indeg.set(e.target, (this.sim.indeg.get(e.target) ?? 0) + 1));
    this.sim.ready.push(...wf.nodes.filter(n => (this.sim.indeg.get(n.id) ?? 0) === 0).map(n => n.id));

    const unlockChildren = (u: string) => {
      for (const e of wf.edges) {
        if (e.source === u) {
          const d = (this.sim.indeg.get(e.target) ?? 0) - 1;
          this.sim.indeg.set(e.target, d);
          if (d === 0) this.sim.ready.push(e.target);
        }
      }
    };

    const step = () => {
      if (!this.sim.running) return;
      if (this.sim.pipelineCancelled) return;
      if (this.sim.ready.length === 0) { this.sim.running = false; return; }

      const id = this.sim.ready.shift()!;
      if (this.sim.cancelled.has(id)) {
        const cur = { ...this.runState() };
        cur[id] = 'skipped';
        this.runState.set(cur);
        this.bus.runState$.next(cur);
        unlockChildren(id);
        queueMicrotask(step);
        return;
      }

      {
        const cur = { ...this.runState() };
        cur[id] = 'running';
        this.runState.set(cur);
        this.bus.runState$.next(cur);
      }

      const to = window.setTimeout(() => {
        this.sim.timers.delete(id);
        if (this.sim.pipelineCancelled || this.sim.cancelled.has(id)) {
          const cur = { ...this.runState() };
          cur[id] = 'skipped';
          this.runState.set(cur);
          this.bus.runState$.next(cur);
        } else {
          const cur = { ...this.runState() };
          cur[id] = 'success';
          this.runState.set(cur);
          this.bus.runState$.next(cur);
        }
        unlockChildren(id);
        step();
      }, 1400);

      this.sim.timers.set(id, to);
    };

    step();
  }

  handleStageCancel(e: { index: number; nodeIds: string[] }) {
    const wf = this.pipelineDto();
    if (!wf || !e?.nodeIds?.length) return;

    const state = { ...this.runState() };
    const removeFromReady = (id: string) => {
      const idx = this.sim.ready.indexOf(id);
      if (idx >= 0) this.sim.ready.splice(idx, 1);
    };
    const unlockChildren = (u: string) => {
      for (const edge of wf.edges) {
        if (edge.source === u) {
          const d = (this.sim.indeg.get(edge.target) ?? 0) - 1;
          this.sim.indeg.set(edge.target, d);
          if (d === 0) this.sim.ready.push(edge.target);
        }
      }
    };

    for (const id of e.nodeIds) {
      this.sim.cancelled.add(id);
      const to = this.sim.timers.get(id);
      if (to) {
        clearTimeout(to);
        this.sim.timers.delete(id);
      }
      removeFromReady(id);

      if (state[id] === 'queued' || state[id] === 'running') {
        state[id] = 'skipped';
        unlockChildren(id);
      }
    }
    this.runState.set(state);
    this.bus.runState$.next(state);
  }

  handlePipelineCancel() {
    this.sim.pipelineCancelled = true;
    this.sim.timers.forEach(id => clearTimeout(id));
    this.sim.timers.clear();

    const state = { ...this.runState() };
    Object.keys(state).forEach(id => {
      if (state[id] === 'queued' || state[id] === 'running') {
        state[id] = 'skipped';
      }
    });
    this.runState.set(state);
    this.bus.runState$.next(state);

    this.sim.running = false;
  }

  private startPipelineFromCurrent() {
    const filtered = filterForRuntime(this.execNodes(), this._edges());
    const { cleanNodes, cleanEdges } = this.normalize(filtered.nodes, filtered.edges);

    const dto :PipelineWorkflowDTO= {
      name: (this.form.value.workflowName as string) || 'Untitled workflow',
      nodes: cleanNodes,
      edges: cleanEdges,
      meta: { createdAt: new Date().toISOString(), version: "1" },
    };

    this.pipelineDto.set(dto);
    this.bus.pipeline$.next(dto);

    const initial: Record<string, 'queued' | 'running' | 'success' | 'error' | 'skipped'> = {};
    for (const n of cleanNodes) initial[n.id] = 'queued';
    this.runState.set(initial);
    this.bus.runState$.next(initial);

    this.simulateRun();
  }

  /** ===== Small utils ===== */
  private makeEdgeId(srcNode: string, srcPort: string, tgtNode: string, tgtPort: string) {
    return `e-${srcNode}__${srcPort}--${tgtNode}__${tgtPort}`;
  }

  private upsertEdges(edges: WorkflowEdge[]) {
    const map = new Map<string, WorkflowEdge>();
    for (const e of edges) map.set(e.id, e);
    this._edges.set([...map.values()]);
  }

  private emitExecOnly(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    const { nodes: outNodes, edges: outEdges } = filterForRuntime(nodes, edges);
    this.suppressExternal = true;
    this.OnCanvasChange.emit({ nodes: outNodes, edges: outEdges });
    queueMicrotask(() => (this.suppressExternal = false));
  }

  private updateNodeById(nodeId: string, updater: (n: WorkflowNode) => WorkflowNode, opts?: { emitToParentIfExec?: boolean }) {
    const exec = this.execNodes();
    const iExec = exec.findIndex(n => n.id === nodeId);
    if (iExec >= 0) {
      const nextExec = exec.slice();
      nextExec[iExec] = updater(nextExec[iExec]);
      this.execNodes.set(nextExec);
      this.refreshConnectivityAndValidity();
      if (opts?.emitToParentIfExec !== false) this.pushExecToParent();
      return;
    }

    const ui = this.uiNodes();
    const iUi = ui.findIndex(n => n.id === nodeId);
    if (iUi >= 0) {
      const nextUi = ui.slice();
      nextUi[iUi] = updater(nextUi[iUi]);
      this.uiNodes.set(nextUi);
      this.refreshConnectivityAndValidity();
    }
  }

  private refreshConnectivityAndValidity() {
    const withUi = this.withUiConnectivity(this.allNodes(), this._edges());
    this.execNodes.set(withUi.filter(isExecutableNode));
    this.uiNodes.set(withUi.filter(n => !isExecutableNode(n)));
    this.publishGraphValidity();
  }

  private pushExecToParent() {
    this.suppressExternal = true;
    this.emitExecOnly(this.execNodes(), this._edges());
    queueMicrotask(() => (this.suppressExternal = false));
  }

  private stripBinary(v: Binary | Binary[]): BinaryPlaceholder | BinaryPlaceholder[] {
    if (Array.isArray(v)) {
      // v: Binary[]
      return (v as Binary[]).map(f => this.stripBinary(f) as BinaryPlaceholder);
    }
    // v: Binary
    if (v instanceof File) {
      return { __file: true, name: v.name, size: v.size, type: v.type };
    }
    return { __blob: true, size: v.size, type: v.type };
  }

  private extractFiles<T extends WithFiles | undefined>(nodeId: string, params: T): ReplaceBinary<NonNullable<T>> | undefined {
    if (params === undefined || params === null || typeof params !== 'object') {
      return params as ReplaceBinary<NonNullable<T>>;
    }

    const files: Record<string, Binary | Binary[]> = {};

    const walk = (obj: unknown, path: string[] = []): unknown => {
      if (isFile(obj) || isBlob(obj) || isArrayOfFiles(obj)) {
        const key = path.join('.');
        files[key] = obj as Binary | Binary[];
        return this.stripBinary(obj as Binary | Binary[]);
      }
      if (Array.isArray(obj)) return obj.map((x, i) => walk(x, [...path, i.toString()]));
      if (obj !== null && typeof obj === 'object') {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(obj as Record<string, unknown>)) {
          out[k] = walk((obj as Record<string, unknown>)[k], [...path, k]);
        }
        return out;
      }
      return obj;
    };

    const sanitized = walk(params) as ReplaceBinary<NonNullable<T>>;
    if (Object.keys(files).length) this.fileCache.set(nodeId, files);
    return sanitized;
  }

  private makeTopoSig(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    const ns = [...nodes]
      .map(n => ({ id: n.id, t: n.type, x: n.x | 0, y: n.y | 0 }))
      .sort((a, b) => a.id.localeCompare(b.id));
    const es = [...edges]
      .map(e => ({ id: e.id, s: e.source, sp: e.sourcePort, t: e.target, tp: e.targetPort }))
      .sort((a, b) => a.id.localeCompare(b.id));
    return JSON.stringify({ ns, es });
  }

  private sanitizeParams<T extends WithFiles | undefined>(params: T): ReplaceBinary<NonNullable<T>> | undefined {
    if (params === undefined || params === null || typeof params !== 'object') {
      return params as unknown as ReplaceBinary<NonNullable<T>>;
    }

    const walk = (obj: unknown): unknown => {
      if (isFile(obj) || isBlob(obj) || isArrayOfFiles(obj)) {
        return this.stripBinary(obj as Binary | Binary[]);
      }
      if (Array.isArray(obj)) return obj.map(walk);
      if (obj && typeof obj === 'object') {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(obj as Record<string, unknown>)) {
          out[k] = walk((obj as Record<string, unknown>)[k]);
        }
        return out;
      }
      return obj;
    };

    return walk(params) as ReplaceBinary<NonNullable<T>>;
  }
}
