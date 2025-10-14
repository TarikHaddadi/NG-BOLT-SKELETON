import { Component, OnDestroy, inject, signal, OnInit, DoCheck } from '@angular/core';
import {
  DfConnectorPosition,
  DfDataInitialNode,
  DfInputComponent,
  DfOutputComponent,
  DrawFlowBaseNode,
} from '@ng-draw-flow/core';
import {
  InspectorActionType,
  PaletteType,
  WorkflowNodeDataBase,
  WorkflowNodeDataBaseParams,
  WorkflowPorts,
} from '@cadai/pxs-ng-core/interfaces';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { FieldConfig } from '@cadai/pxs-ng-core/interfaces';
import { FieldConfigService } from '@cadai/pxs-ng-core/services';
import { WfCanvasBus } from './wf-canvas-bus';
import { ACTION_FORMS, makeFallback } from './action-forms';
import { debounceTime, distinctUntilChanged, map, Subscription } from 'rxjs';
import { DynamicFormComponent } from '@cadai/pxs-ng-core/shared';

function normalizeActionKey(x: unknown): string {
  // to string
  let k = (x ?? '').toString().trim();
  // snake/space -> hyphen
  k = k.replace(/[\s_]+/g, '-');
  // camelCase -> kebab-case
  k = k.replace(/([a-z0-9])([A-Z])/g, '$1-$2');
  // collapse repeats + lowercase
  k = k.replace(/-+/g, '-').toLowerCase();
  return k;
}

export interface DfDataInitialNodeData extends DfDataInitialNode {
  __missingIn: boolean;
  __missingOut: boolean;
}
function coerceModel(raw: unknown): WorkflowNodeDataBase {
  const data = (raw ?? {}) as WorkflowNodeDataBase;
  const type = (data.type ?? data.aiType ?? 'input') as PaletteType;
  const ports = data.ports;
  return { type, ports, params: data.params, aiType: data.aiType, label: data.label };
}


@Component({
  selector: 'app-wf-node',
  standalone: true,
  imports: [
    DfInputComponent,
    DfOutputComponent,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
    ReactiveFormsModule,
    DynamicFormComponent,
  ],
  template: `
    <div class="wf-node"
         [attr.data-node-id]="nodeId"
         [class.input]="visualType() === 'input'"
         [class.result]="visualType() === 'result'"
         [class.action]="visualType()!=='input' && visualType()!=='result'"
     [attr.data-missing]="hasMissingIn() + '-' + hasMissingOut()"
         [class.error-in]="hasMissingIn()"
     [class.error-out]="hasMissingOut()">

      <!-- Left ports -->
      <div class="ports left">
        @for (p of inPorts(); track p.id) {
          <df-input [position]="positions.Left"
                    [connectorData]="{ nodeId: nodeId, connectorId: p.id, single: false }"></df-input>
        }
      </div>

      <!-- Right ports -->
      <div class="ports right">
        @for (p of outPorts(); track p.id) {
          <df-output [position]="positions.Right"
                     [connectorData]="{ nodeId: nodeId, connectorId: p.id, single: false }"></df-output>
        }
      </div>
  @if(visualType() === 'input') {
        <div class="inline-editor" [class.hidden]="!expanded()">
          <app-dynamic-form
            [form]="formInputs"
            [config]="configInputs">
          </app-dynamic-form>
          
        </div>
      }
      <!-- Header -->
      <div class="header">
        @if(visualType() !== 'input' && visualType() !== 'result') {
          <div class="title">
            <mat-icon class="icon">{{getIcon()}}</mat-icon>
            {{ displayLabel() | translate }}
          </div>
        }

        @if(visualType() === 'input') {
          <button mat-mini-fab class="success" color="success" aria-label="start" matTooltip="play workflow" (click)="runSchedule()" [disabled]="runDisabled()"
    [attr.aria-disabled]="runDisabled()">
            <mat-icon>play_arrow</mat-icon>
          </button>
        } @else if(visualType() === 'result') {
          <button mat-mini-fab class="primary" color="neutral" aria-label="results" matTooltip="Go to results" (click)="displayRUnsPanel($event)">
            <mat-icon>forward</mat-icon>
          </button>
        } @else {
          <button mat-icon-button type="button" (click)="toggleExpanded()"
                  [attr.aria-expanded]="expanded()">
            <mat-icon>{{ expanded() ? 'expand_less' : 'expand_more' }}</mat-icon>
          </button>
        }
      </div>

      @if(visualType() !== 'input' && visualType() !== 'result') {
        <div class="inline-editor" [class.hidden]="!expanded()">
          <app-dynamic-form
            [form]="form"
            [config]="config">
          </app-dynamic-form>
        </div>
      }
    
    </div>
  `,
  styles: [`
    .wf-node {
      --df-connector-color: var(--mat-accent);
      --df-connector-color-hover: #ffe066;
      min-height: 44px;
      min-width: 420px;
      border-radius: 10px;
      padding: 8px 12px 10px;
      position: relative;
      user-select: none;
    }
    .wf-node.input {
      border: 3px solid  var(--mat-success, #2e7d32);
      background-color:var(--md-sys-color-surface);
      display: flex; flex-direction: column;align-items:end; justify-content:space-between; min-width: 40px;
    }
    .wf-node.result {
      background: var(--mat-accent, #7b1fa2);
      display: flex; align-items:center; justify-content:space-between; min-width: 40px;
    }
    .wf-node.action { background-color: var(--md-sys-color-surface);border: 2px solid var(--mat-primary, #1976d2); }

    .wf-node.is-selected { outline: 2px solid #42a5f5; outline-offset: 2px; }

    .header { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .title { font-weight: 600; color: var(--mat-primary, #fff); display: flex; align-items:center; justify-content:"start" }
    .title .icon { margin-right:5px;}
    .ports.left, .ports.right {
      position:absolute; top: 17px; bottom: 10px;
      display:flex; flex-direction:column; gap:10px; height:15px;
    }
    .ports.left{ left:-8px; }
    .ports.right{ right:-8px; }

    .inline-editor {
      margin-top: 8px;
      background: rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 8px;
    }
    .inline-editor.hidden { display:none; }
    .wf-node.error-in,
    .wf-node.error-out {
      border: 2px solid #e53935 !important;
      box-shadow: 0 0 0 2px rgba(229,57,53,0.15);
    }

    /* Optional: accent the specific side that’s missing */
    .wf-node.error-in .ports.left  { filter: drop-shadow(0 0 2px rgba(229,57,53,0.8)); }
    .wf-node.error-out .ports.right{ filter: drop-shadow(0 0 2px rgba(229,57,53,0.8)); }

    /* Or a subtle red stripe */
    .wf-node.error-in::before,
    .wf-node.error-out::after {
      content: '';
      position: absolute; top: 0; bottom: 0; width: 3px;
      background: #e53935;
    }
    .wf-node.error-in::before  { left: -6px; }
    .wf-node.error-out::after  { right: -6px; }
  `],
})
export class WfNodeComponent extends DrawFlowBaseNode implements OnDestroy, OnInit, DoCheck {
  private bus = inject(WfCanvasBus);
  private fb = inject(FormBuilder);
  private fields = inject(FieldConfigService);
  graphValidSig = signal<boolean>(false);

  positions = DfConnectorPosition;
  expanded = signal<boolean>(true);
  form: FormGroup = this.fb.group({});
  config: FieldConfig[] = [];
  formInputs: FormGroup = this.fb.group({});
  configInputs: FieldConfig[] = [];
  private subs = new Subscription();
  private valueChangesHooked = false;

  private lastModelRef: unknown = null;
  private lastModelKey = '';
  private lastFlagsKey = '';

  private get safeModel() {
    return coerceModel(this.model);
  }
  missingInSig = signal<boolean>(false);
  missingOutSig = signal<boolean>(false);


  visualType(): PaletteType | undefined {
    return this.safeModel.type;
  }

  displayLabel(): string {
    const t = (this.safeModel.type ?? '').toLowerCase();
    if (t === 'input' || t === 'result') return t.charAt(0).toUpperCase() + t.slice(1);
    const nice: Record<InspectorActionType, string> = {
      'chat-basic': 'chat-basic',
      compare: 'compare', summarize: 'summarize', extract: 'extract', jira: 'jira', "run-panel": "run-panel"
    };
    return nice[t as InspectorActionType];
  }

  getIcon(): string {
    const data = this.safeModel;
    return data?.params?.icon ?? '';
  }
  inPorts(): WorkflowPorts['inputs'] {
    return this.safeModel.ports?.inputs ?? [];
  }
  outPorts(): WorkflowPorts['outputs'] {
    return this.safeModel.ports?.outputs ?? [];
  }
  toggleExpanded(): void {
    const next = !this.expanded();
    this.expanded.set(next);
    this.bus.nodeToggleExpand$.next({ nodeId: this.nodeId, expanded: next });
  }

  ngOnInit(): void {
    queueMicrotask(() => this.tryBuildFromModel());

    this.subs.add(
      this.bus.nodeConnectivity$.subscribe(({ nodeId, missingIn, missingOut }) => {
        if (nodeId !== this.nodeId) return;
        const changed = (this.missingInSig() !== missingIn) || (this.missingOutSig() !== missingOut);
        if (changed) {
          this.missingInSig.set(missingIn);
          this.missingOutSig.set(missingOut);
          this.markForCheck();
        }
      })
    );

    this.subs.add(
      this.bus.graphValid$.subscribe(ok => {
        this.graphValidSig.set(!!ok);
        this.markForCheck();
      })
    );
  }

  hasMissingIn(): boolean { return this.missingInSig(); }
  hasMissingOut(): boolean { return this.missingOutSig(); }

  runDisabled(): boolean {
    const anyMissing = this.hasMissingIn() || this.hasMissingOut();
    const anyInvalidForm = this.form?.invalid ?? false;
    return !this.graphValidSig() || anyMissing || anyInvalidForm;
  }

  ngDoCheck(): void {
    const currentRef = this.model;
    const currentKey = this.resolveActionKey();

    const m = this.model || {};
    const d = m?.['data'] || {};
    const flagsKey = `${d?.__missingIn ? 1 : 0}-${d?.__missingOut ? 1 : 0}`;
    if (
      currentRef !== this.lastModelRef ||
      currentKey !== this.lastModelKey
    ) {
      this.tryBuildFromModel();
    }

    if (flagsKey !== this.lastFlagsKey) {
      this.lastFlagsKey = flagsKey;
      this.markForCheck();
    }

    this.lastModelRef = currentRef;
    this.lastModelKey = currentKey;
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  private tryBuildFromModel(): void {
    const vt = this.visualType();
    if (vt === 'result') {
      this.config = [];
      this.lastModelRef = this.model;
      this.lastModelKey = '';
      return;
    } else if (vt === 'input') {
      this.configInputs = [
        this.fields.getFileField({
          name: 'files',
          label: 'form.labels.files',
          multiple: true,
          accept: '.pdf,.docx,image/*',
          // maxFiles: 3,
          //maxTotalSize: 1 * 1024 * 1024,  // 1 MB total
          required: true,
          validators: [Validators.required],
        })
      ];
      this.lastModelRef = this.model;
      this.lastModelKey = '';
      return;
    }

    const key = this.resolveActionKey();
    this.lastModelRef = this.model;
    this.lastModelKey = key;

    const spec = ACTION_FORMS[key];
    if (!spec) {
      this.config = makeFallback(this.fields);
    } else {
      const built = spec.make(this.fields);
      this.config = (built ?? []).filter(Boolean) as FieldConfig[];
      if (!this.config.length) {
        this.config = makeFallback(this.fields);
      }
    }

    const dataAny = (this.safeModel?.params ?? {}) as WorkflowNodeDataBaseParams;
    const defaults = spec?.defaults ?? {};
    const RESERVED = new Set(['ui', '__missingIn', '__missingOut']);
    const current = Object.fromEntries(
      Object.entries(dataAny).filter(([k]) => !RESERVED.has(k))
    );
    const initial = { ...defaults, ...current };
    this.form.reset({}, { emitEvent: false });
    if (Object.keys(initial).length) {
      queueMicrotask(() => this.form.patchValue(initial, { emitEvent: false }));
    }

    if (!this.valueChangesHooked) {
      this.valueChangesHooked = true;
      this.subs.add(
        this.form.valueChanges
          .pipe(
            map(v => JSON.stringify(v ?? {})),
            distinctUntilChanged(),
            debounceTime(150),
            map(json => JSON.parse(json))
          )
          .subscribe(params => {
            if (!params || typeof params !== 'object') return;
            const RESERVED = new Set(['ui', '__missingIn', '__missingOut']);
            const payload = Object.fromEntries(
              Object.entries(params).filter(([k]) => !RESERVED.has(k))
            );

            this.bus.nodeParamsChanged$.next({ nodeId: this.nodeId, params: payload });
          })
      );
    }

    this.markForCheck();
  }

  private resolveActionKey(): string {
    const data = this.safeModel;
    const keyRaw = data.aiType ?? this.safeModel.type ?? '';
    return normalizeActionKey(keyRaw);
  }

  runSchedule(): void {
    this.bus.runRequested$.next({ nodeId: this.nodeId });
  }

  displayRUnsPanel(ev?: MouseEvent): void {
    ev?.stopPropagation();
    this.bus.toggleRunPanel$.next({ anchorNodeId: this.nodeId });
  }
}
