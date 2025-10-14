import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SeoComponent } from '@cadai/pxs-ng-core/shared';
import { LayoutService, ToolbarActionsService } from '@cadai/pxs-ng-core/services';
import { TranslateModule } from '@ngx-translate/core';
import { ActionDefinitionLite, ToolbarAction, WorkflowEdge, WorkflowNode } from '@cadai/pxs-ng-core/interfaces';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { WorkflowCanvasDfComponent } from './sub/workflow-canvas.component';

@Component({
    selector: 'app-workflows',
    standalone: true,
    imports: [
        SeoComponent,
        CommonModule,
        TranslateModule,
        MatButtonModule,
        WorkflowCanvasDfComponent
    ],
    templateUrl: './workflows.component.html',
    styleUrls: ['./workflows.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkflowsComponent {
    private router = inject(Router);
    private toolbar = inject(ToolbarActionsService);
    private destroyRef = inject(DestroyRef);

    nodes: WorkflowNode[] = [{
        id: 'input-node',
        type: 'input',
        x: 0, y: 0,
        data: { label: 'Input' },
        ports: { inputs: [], outputs: [{ id: 'out', label: 'out', type: 'json' }] },
    },{
        id: 'result-node',
        type: 'result',
        x: 760, y: 0,
        data: { label: 'Result' },
        ports: { inputs: [{ id: 'in', label: 'in', type: 'json' }], outputs: [] },
    }];
    edges: WorkflowEdge[] = [];
    availableActions: ActionDefinitionLite[] = [
        { type: 'chat-basic', params: {icon: "chat"} },
        { type: 'compare',params: {icon: "compare"}  },
        { type: 'summarize',params: {icon: "article_shortcut"}  },
        { type: 'extract',params: {icon: "tag"}  },
        { type: 'jira',params: {icon: "confirmation_number", class:"accent"}  },
    ];

    constructor(
        private layoutService: LayoutService
    ) {

        const newWorkflow: ToolbarAction = {
            id: 'new_workflow',
            icon: 'add',
            tooltip: 'new_workflow',
            click: () => this.router.navigate(["/workflows/new"]),
            variant: "flat",
            label: 'new_workflow',
            class: "primary"
        };
        this.toolbar.scope(this.destroyRef, [newWorkflow]);
    }

    public onTitleChange(title: string): void {
        this.layoutService.setTitle(title);
    }

    onChange(e: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) {
        console.log(e)
        this.nodes = e.nodes;
        this.edges = e.edges;
    }
}
