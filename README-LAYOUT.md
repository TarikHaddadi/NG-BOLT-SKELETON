# Core SDK — Layout Toolbar Actions (Dynamic Per‑Page Buttons)

> _Last updated: 2025‑09‑11_

This document explains how to add **dynamic toolbar actions** (e.g., Back, Export, Delete) to the main `AppLayoutComponent` so that **each routed page** can publish its own buttons without touching the layout code.

Works with **Angular 16–19+**, standalone components, Material 3, NgRx, and ngx-translate.

---

## TL;DR

- Add a small `ToolbarActionsService` that exposes an `actions$` stream and methods to set/clear actions.
- The **layout** subscribes to `actions$` and renders the buttons on the right side of the `<mat-toolbar>`.
- **Pages** (Dashboard, Details, …) publish their own actions in `ngOnInit()` and they are **auto-cleared on destroy**.

---

## 1) Service — `ToolbarActionsService`

Create the service anywhere under your Core SDK (e.g., `libs/core/src/lib/layout/toolbar-actions.service.ts`).

```ts
import { DestroyRef, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ThemePalette } from '@angular/material/core';

export type ButtonVariant = 'icon' | 'stroked' | 'raised' | 'flat';

export interface ToolbarAction {
  id: string;
  icon?: string; // e.g. 'arrow_back', 'download'
  label?: string; // visible text for non-icon variants
  tooltip?: string; // hover tooltip or i18n text
  color?: ThemePalette; // 'primary' | 'accent' | 'warn'
  variant?: ButtonVariant; // defaults to 'icon'
  visible$?: Observable<boolean>;
  disabled$?: Observable<boolean>;
  click: () => void; // handler
}

@Injectable({ providedIn: 'root' })
export class ToolbarActionsService {
  private readonly _actions = new BehaviorSubject<ToolbarAction[]>([]);
  readonly actions$ = this._actions.asObservable();

  set(actions: ToolbarAction[] = []) {
    this._actions.next(actions);
  }
  add(...actions: ToolbarAction[]) {
    this._actions.next([...this._actions.value, ...actions]);
  }
  remove(id: string) {
    this._actions.next(this._actions.value.filter((a) => a.id !== id));
  }
  clear() {
    this._actions.next([]);
  }

  /** Scope helper: set actions and auto-clear when the caller is destroyed */
  scope(destroyRef: DestroyRef, actions: ToolbarAction[] = []) {
    this.set(actions);
    destroyRef.onDestroy(() => this.clear());
  }
}
```

---

## 2) Layout — render actions in `AppLayoutComponent`

Inject the service **once** and read the stream. Keep your change detection strategy as `OnPush`.

```ts
// app-layout.component.ts (excerpt)
import { Component, inject } from '@angular/core';
import { ToolbarActionsService } from './toolbar-actions.service'; // adjust path

export class AppLayoutComponent {
  public toolbarActions$ = inject(ToolbarActionsService).actions$;
}
```

Update the toolbar template to place actions on the right:

```html
<mat-toolbar color="primary">
  <button mat-icon-button (click)="sidenav.toggle()">
    <mat-icon>menu</mat-icon>
  </button>

  <span class="title">{{ title$ | async }}</span>
  <span class="spacer"></span>

        <div class="custom-btns">
        @for (a of (toolbarActions$ | async) ?? []; track a.id) {
          @if ((a.visible$ | async) ?? true) {
            @if ((a.variant ?? 'icon') === 'icon') {
              <button
                mat-icon-button
                [color]="a.color || 'primary'"
                [class]="a.class || ''"
                [matTooltip]="a.tooltip || '' | translate"
                [disabled]="a.disabled$ | async"
                (click)="a.click()"
              >
                <mat-icon [color]="a.color || 'primary'" [class]="a.class || ''">{{
                  a.icon
                }}</mat-icon>
              </button>
            } @else if (a.variant === 'stroked') {
              <button
                mat-stroked-button
                [color]="a.color || 'primary'"
                [class]="a.class || ''"
                [matTooltip]="a.tooltip || '' | translate"
                [disabled]="a.disabled$ | async"
                (click)="a.click()"
              >
                @if (a.icon) {
                  <mat-icon [color]="a.color || 'primary'" [class]="a.class || ''">
                    {{ a.icon }}</mat-icon
                  >
                }
                {{ a.label | translate }}
              </button>
            } @else if (a.variant === 'raised') {
              <button
                mat-raised-button
                [color]="a.color || 'primary'"
                [class]="a.class || ''"
                [matTooltip]="a.tooltip || '' | translate"
                [disabled]="a.disabled$ | async"
                (click)="a.click()"
              >
                @if (a.icon) {
                  <mat-icon [color]="a.color || 'primary'" [class]="a.class || ''">{{
                    a.icon
                  }}</mat-icon>
                }
                {{ a.label | translate }}
              </button>
            } @else {
              <button
                mat-flat-button
                [color]="a.color || 'primary'"
                [class]="a.class || ''"
                [matTooltip]="a.tooltip || '' | translate"
                [disabled]="a.disabled$ | async"
                (click)="a.click()"
              >
                @if (a.icon) {
                  <mat-icon [color]="a.color || 'primary'" [class]="a.class || ''">{{
                    a.icon
                  }}</mat-icon>
                }
                {{ a.label | translate }}
              </button>
            }
          }
        }
      </div>
</mat-toolbar>
```

Minimal styles:

```scss
mat-toolbar {
  display: flex;
  align-items: center;
}
.spacer {
  flex: 1 1 auto;
}
.title {
  margin-left: 0.5rem;
  font-weight: 600;
}
```

> **Note:** In your posted layout you already have the toolbar and title; just add the `spacer` and `@for` block above.

---

## 3) Pages — publishing actions

Example Dashboard page setting **Back**, **Export**, and **Delete** actions. Buttons are removed automatically when the component is destroyed.

```ts
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { Location } from '@angular/common';
import { map } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { ToolbarActionsService, ToolbarAction } from '../layout/toolbar-actions.service';
import { AppSelectors } from '@cadai/pxs-ng-core/store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `<p>Dashboard</p>`,
})
export class DashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private toolbar = inject(ToolbarActionsService);
  private i18n = inject(TranslateService);
  private location = inject(Location);
  private store = inject(Store);

  private selectedCount$ = this.store.select(AppSelectors.ItemsSelectors.selectSelectedCount);

  ngOnInit(): void {
    
    const back: ToolbarAction = {
      id: 'back',
      icon: 'arrow_back',
      tooltip: 'back', // use keys , since the component already uses translates pipes
      class:"primary",
      color: 'primary',
      click: () => this.location.back(),
      variant:"icon",
      label:'back' // use keys , since the component already uses translates pipes
    };

    const exportCsv: ToolbarAction = {
      id: 'export',
      icon: 'download',
      tooltip: 'export', // use keys , since the component already uses translates pipes
      color: 'primary',
      click: () => {},
      variant:"flat",
      label:'export', // use keys , since the component already uses translates pipes
      class:"primary"
    };

    const deleteSel: ToolbarAction = {
      id: 'delete',
      icon: 'delete',
      tooltip: 'delete', // use keys , since the component already uses translates pipes
      color: 'warn',
      class:"primary",
      click: () => {},
      variant:"stroked",
      label:'delete' // use keys , since the component already uses translates pipes
    };

    const refreshSel: ToolbarAction = {
      id: 'refresh',
      icon: 'refresh',
      tooltip: 'refresh', // use keys , since the component already uses translates pipes
      color: 'accent',
      class:"accent",
      click: () => {},
      variant:"raised",
      label:'refresh' // use keys , since the component already uses translates pipes
    };

    // Publish actions for this page and auto-clear on destroy
    this.toolbar.scope(this.destroyRef, [back, exportCsv, deleteSel, refreshSel]);
  }

  private exportToCsv() {
    /* ... */
  }
  private deleteSelected() {
    /* ... */
  }
}
```

---

## API Reference

### `ToolbarAction`

| Property    | Type                                        | Required | Description                               |
| ----------- | ------------------------------------------- | -------- | ----------------------------------------- | -------- | -------- |
| `id`        | `string`                                    | ✅       | Stable ID for tracking/removal.           |
| `icon`      | `string`                                    |          | Material Icon name.                       |
| `label`     | `string`                                    |          | Text for non-icon variants.               |
| `tooltip`   | `string`                                    |          | Tooltip/i18n text.                        |
| `color`     | `ThemePalette`                              |          | `'primary'                                | 'accent' | 'warn'`. |
| `variant`   | `'icon' \| 'stroked' \| 'raised' \| 'flat'` |          | Defaults to `'icon'`.                     |
| `visible$`  | `Observable<boolean>`                       |          | Stream to show/hide. Defaults to visible. |
| `disabled$` | `Observable<boolean>`                       |          | Disable button reactively.                |
| `click`     | `() => void`                                | ✅       | Click handler.                            |

### `ToolbarActionsService`

- `actions$: Observable<ToolbarAction[]>` — current actions for the layout to render.
- `set(actions: ToolbarAction[])` — replace the whole set.
- `add(...actions: ToolbarAction[])` — append actions.
- `remove(id: string)` — remove by id.
- `clear()` — remove all.
- `scope(destroyRef, actions)` — set now and auto-`clear()` on component destroy.

---

## Patterns & Recipes

### A) Role‑based visibility (Keycloak/NgRx)

```ts
const isAdmin$ = this.store
  .select(AppSelectors.AuthSelectors.selectRoles)
  .pipe(map((roles) => roles?.includes('ROLE_admin') ?? false));

const adminSettings: ToolbarAction = {
  id: 'admin-settings',
  icon: 'admin_panel_settings',
  tooltip: this.i18n.instant('admin.settings'),
  visible$: isAdmin$,
  click: () => this.openAdminSettings(),
};
```

### B) Live disabled state (e.g., selection count)

```ts
const deleteSel: ToolbarAction = {
  id: 'delete',
  icon: 'delete',
  color: 'warn',
  disabled$: this.selectedCount$.pipe(map((c) => c === 0)),
  click: () => this.deleteSelected(),
};
```

## 🧑‍💻 Author

**Angular Product Skeleton** — _Tarik Haddadi_  
Angular 19+, standalone APIs, runtime configs, optional NgRx, optional Keycloak.
