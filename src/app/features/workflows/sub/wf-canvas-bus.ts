import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { PipelineWorkflowDTO } from './pipeline-progress.component';
import { WorkflowNodeDataBaseParams } from '@cadai/pxs-ng-core/interfaces';


@Injectable({ providedIn: 'root' })
export class WfCanvasBus {
  nodeParamsChanged$ = new Subject<{ nodeId: string; params?: WorkflowNodeDataBaseParams}>();
  nodeToggleExpand$ = new Subject<{ nodeId: string; expanded: boolean }>();
  nodeConnectivity$ = new Subject<{ nodeId: string; missingIn: boolean; missingOut: boolean }>();
  runRequested$ = new Subject<{ nodeId: string }>();
  graphValid$ = new BehaviorSubject<boolean>(false);
  pipeline$ = new BehaviorSubject<PipelineWorkflowDTO | null>(null);
  runState$ = new BehaviorSubject<Record<string, 'queued' | 'running' | 'success' | 'error' | 'skipped'>>({});
  stageCancel$ = new Subject<{ index: number; nodeIds: string[] }>();
  pipelineCancel$ = new Subject<void>();
  toggleRunPanel$ = new Subject<{ anchorNodeId?: string }>();
}
