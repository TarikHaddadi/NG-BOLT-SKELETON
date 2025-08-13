import { HttpInterceptorFn } from "@angular/common/http";

export interface CoreOptions  {
  theme?: 'light' | 'dark';
  i18n?: {
    prefix?: string;
    suffix?: string;
    fallbackLang?: string;
    lang?: string;
  };
  /** Extra HttpInterceptorFn(s) to insert between auth and error interceptors */
  interceptors?: HttpInterceptorFn[];
};