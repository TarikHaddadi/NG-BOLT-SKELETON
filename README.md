# AI Product – Angular 19 Skeleton

> 🚀 Modern Angular 19 project template with runtime environment configs, standalone components, NgRx state management, dynamic forms, internationalization, and full CI/CD support.

---

## 🧱 Project Overview

This repository provides a scalable, production-ready **Angular 19** setup using best practices including:

- ✅ **Standalone component architecture**
- 🌐 **Runtime environment configuration** via `public/assets/config.json`
- 🔄 **NgRx** for reactive global state management
- 🧩 **Dynamic Forms** system via reusable `FieldConfig` pattern
- 🌍 **Internationalization** with `@ngx-translate`
- 🎨 **Angular Material + CDK** UI framework
- 🦾 **CI/CD-ready** structure (Azure Pipelines & GitLab CI support)

---


## 📦 Tech Stack

- **Angular 19** with Standalone Components
- **NgRx** Store, Effects, Devtools
- **Angular Material + CDK**
- **RxJS 7.8**
- **@ngx-translate** for i18n
- **Signal-based ThemeService**
- **Strict TypeScript + ESLint**
- **Docker + CI/CD ready**

---

## 📦 Dependencies

### Framework & Core

- **Angular 19** (`@angular/core`, `@angular/common`, etc.)
- **Standalone APIs** (`bootstrapApplication`, `ApplicationConfig`)
- **RxJS 7.8**

### UI & Layout

- `@angular/material` – Material Design UI components
- `@angular/cdk` – Layout utilities
- `@angular/flex-layout` – Responsive layout engine

### State Management

- `@ngrx/store`, `@ngrx/effects`, `@ngrx/store-devtools`
- `ngrx-store-localstorage` – persistent global state

### Forms & UX

- **Reactive Forms**
- **Custom DynamicFormComponent**
- `FieldConfigService` for reusable, schema-based field configuration

### Internationalization (i18n)

- `@ngx-translate/core`
- `@ngx-translate/http-loader`
- JSON-based language files (`public/assets/i18n/`)

---

Only config.json is loaded by the app, so CI/CD pipelines copy the correct version based on branch or env.
# Development build & serve
```
npm start                 # = ng serve
```
# Static builds
```
npm run build             # = ng build --configuration=development
npm run buildUat
npm run buildProd
```

# Watch mode
npm run watch

# Testing & Linting
npm run test
npm run lint

## 🚀 CI/CD Support
CI pipelines dynamically inject the correct config.json during build:

## 🗂️ Assets And Translations (styles, i18n)

All static assets live under `public/assets` and are served at runtime from `/assets` (thanks to the `angular.json` mapping). This lets us ship **styles**, **i18n files**, **icons**, and a **runtime environment config** without rebuilding the app.

### Angular CLI mapping

```jsonc
// angular.json -> architect.build.options.assets
[
  { "glob": "**/*", "input": "public/assets", "output": "assets" },
  { "glob": "favicon.ico", "input": "public", "output": "/" }
]
```

- Build/serve outputs everything from `public/assets/**` to `/assets/**` in `dist/`.
- Unit tests also serve assets (see `architect.test.options.assets`).

### Styles

Global styles are included by Angular CLI:

```jsonc
// angular.json -> architect.build.options.styles
[
  "src/styles.scss",
  "src/styles/main.scss"
]
```

You can also keep additional CSS under `public/assets/theme/` and link or swap them at runtime:

```html
<!-- src/index.html -->
<link id="theme-style" rel="stylesheet" href="assets/theme/light.css" />
```

> Tip: swap the `href` at runtime to toggle themes without a rebuild.

### i18n (ngx-translate)

Place translation files under `public/assets/i18n`:

```
public/assets/i18n/en.json
public/assets/i18n/fr.json
```

Configure the HTTP loader to read from `/assets/i18n/`:

```ts
// app.config.ts (or app.module.ts for non-standalone setups)
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';

export function httpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, 'assets/i18n/', '.json');
}

// In your providers/imports:
TranslateModule.forRoot({
  loader: { provide: TranslateLoader, useFactory: httpLoaderFactory, deps: [HttpClient] }
});
```

Usage in templates: `{{ 'home.title' | translate }}`



## ⚙️ Runtime Environment Config

Instead of Angular's build-time `environment.ts`, this project loads configuration **at runtime** via:

```ts
fetch('assets/config.json')
```

## ⚙️Available Configs
```text
public/assets/config.dev.json
public/assets/config.uat.json
public/assets/config.prod.json
```

Keep deploy-time environment in `public/assets/config.json` (copied to `/assets/config.json` at build). Example:

```json
{
  "name": "dev",
  "production": false,
  "apiUrl": "https://dev.api.yourdomain.com"
}
```

Minimal typed access:

```ts
export interface AppConfig {
  name: 'dev' | 'uat' | 'prod';
  production: boolean;
  apiUrl: string;
}

export class ConfigService {
  private config!: AppConfig;

  async load(): Promise<void> {
    const res = await fetch('assets/config.json');
    this.config = (await res.json()) as AppConfig;
  }

  get<T extends keyof AppConfig>(key: T): AppConfig[T] {
    return this.config[key];
  }

  all(): AppConfig {
    return this.config;
  }
}
```

Bootstrap-time load (example):

```ts
const cfg = new ConfigService();
await cfg.load();
// provide it in DI or attach to app initializer before bootstrap
```

**Why this setup?**  
- Change envs by swapping `config.json` on the server/CDN—**no rebuild**.
- Keep assets versioned and cacheable under `/assets`.
- Keep global styles & themes outside the bundle when needed.


## 📁 Project Structure Highlights

| Path                                                     | Purpose                                             |
|----------------------------------------------------------|-----------------------------------------------------|
| `public/assets/config.*.json`                            | Runtime environment configs (`dev`, `uat`, `prod`)  |
| `src/app/core/services/config.service.ts`                | Loads runtime config before app bootstrap           |
| `src/app/core/services/field-config.service.ts`          | Generates reusable form field configs               |
| `src/app/shared/forms/dynamic-form.component.ts`         | Reusable dynamic form renderer                      |
| `src/app/store/`                                         | NgRx store, actions, reducers, and selectors        |
| `src/app/layout/`                                        | App layout structure: toolbar, sidenav, content     |
| `src/app/app.config.ts`                                  | Angular 19 `ApplicationConfig` & DI providers       |
| `src/app/app.routes.ts`                                  | Routing config using standalone components          |

---

## 🎨 Theming Support

This project includes a fully dynamic theming system that allows runtime switching between **light** and **dark** modes with the following structure:

### ✅ How It Works

- The app injects a `<link id="theme-style">` tag that is updated at runtime to switch between `light.css` and `dark.css` themes
- The `ThemeService` handles:
  - Toggling between modes via a signal
  - Saving the user's preference to `localStorage`
  - Updating the `<html>` tag with `light` or `dark` class
- The SCSS root includes a base Material theme using the `@use '@angular/material' as mat;` system, but the main theme variables are controlled via pre-generated Material tokens

### 📁 Theme File Structure

Theme CSS files are stored in:
```text
public/assets/theme/
├── light.css ← default light theme (Material Theme Generator)
└── dark.css ← dark theme variant
```


# Commit & Release Guide

## ✅ Commits (Conventional Commits)

**Format**

```
type(scope?): subject
```

**Types:** `feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `build` | `ci` | `chore` | `revert`

**Examples**

```bash
feat(auth): add refresh token flow
fix(ui): prevent double submit on Enter
docs(readme): add quick start
refactor(forms): split dynamic fields into subcomponents
```

**Mechanism**

Commit messages are auto-checked at commit time; non-conforming messages are rejected.

---

## 🚀 Versioning & Releases

Use these commands to bump the version (SemVer), tag it, and generate **JSON** release notes:

```bash
npm run release:patch   # 1.0.0 -> 1.0.1
npm run release:minor   # 1.0.0 -> 1.1.0
npm run release:major   # 1.0.0 -> 2.0.0
```

**Optional custom release commit message** (`%s` becomes the version):

```bash
npm run release:patch -- -m "chore(release): v%s – short note"
```

### What happens under the hood

- Bumps `package.json` via **standard-version**
- Creates a Git tag: `vX.Y.Z`
- Generates machine-readable notes at:  
  `release-notes/release-vX.Y.Z.json`
- Commits the JSON notes
- Pushes `HEAD` + tags (via `release:push`)

### No-push workflow

```bash
npm run release:patch:nopush
npm run release:minor:nopush
npm run release:major:nopush
# then:
npm run release:push
```

### JSON notes

The generated JSON includes basic stats and grouped sections (features, fixes, breaking changes, etc.) derived from Conventional Commits.



## 📐 Features Used

- ✅ **Angular 19 Standalone APIs**
- ✅ **Runtime config injection** via `ConfigService`
- ✅ **NgRx** for scalable and reactive global state
- ✅ **Reactive Forms** with dynamic schema rendering
- ✅ **Internationalization (i18n)** via `@ngx-translate`
- ✅ **Angular Material** UI with responsive layout
- ✅ Integrated **Toasts**, **Dialogs**, and **Tooltips**
- ✅ Strict **TypeScript** config (`strict: true`) with ESLint
- ✅ **CI/CD-ready** with Azure Pipelines & GitLab CI support

---

## 📦 Future Ideas

- ✅ Add **Docker support** with runtime `config.json` injection
- 🔒 Add **Auth module** with JWT/session token handling
- 🧪 Add **E2E tests** using Cypress or Playwright

---

## 🧠 Notes

This project uses Angular strict mode (`strict: true`) and TypeScript with:

- `resolveJsonModule`
- `esModuleInterop`
- `strictTemplates`
- `noImplicitReturns`
- `noFallthroughCasesInSwitch`

---

## 🧑‍💻 Author

**AI Product Skeleton**  
Built by **Tarik Haddadi** using Angular 19 and modern best practices (2025).

