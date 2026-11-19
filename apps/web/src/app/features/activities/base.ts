import { Directive, input, output, signal } from '@angular/core';

export type SubmitFn = (answers: any) => Promise<any>;

/** Shared submit/busy/error/result handling for all activity renderers. */
@Directive()
export abstract class ActivityBase<R = any> {
  content = input.required<any>();
  draft = input<any>(null);
  initialResult = input<R | null>(null);
  submitFn = input.required<SubmitFn>();
  continueLabel = input('Continue');
  finished = output<R>();
  draftChange = output<any>();

  busy = signal(false);
  error = signal('');
  result = signal<R | null>(null);

  protected async send(answers: any) {
    if (this.busy()) return;
    this.busy.set(true); this.error.set('');
    try { this.result.set(await this.submitFn()(answers)); }
    catch (e: any) { this.error.set(e?.message ?? 'Could not submit. Please try again.'); }
    finally { this.busy.set(false); }
  }
  next() { const r = this.result(); if (r) this.finished.emit(r); }
}
