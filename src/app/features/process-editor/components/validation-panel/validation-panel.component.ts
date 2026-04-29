import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiagramValidationIssue } from '../../models/diagram-validation-issue.model';

@Component({
  selector: 'app-validation-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './validation-panel.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
  `]
})
export class ValidationPanelComponent {
  @Input() issues: DiagramValidationIssue[] = [];
  @Input() visible = true;

  @Output() closeRequested = new EventEmitter<void>();

  get errors(): DiagramValidationIssue[] {
    return this.issues.filter(issue => issue.severity === 'error');
  }

  get warnings(): DiagramValidationIssue[] {
    return this.issues.filter(issue => issue.severity === 'warning');
  }

  get hasErrors(): boolean {
    return this.errors.length > 0;
  }

  get hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  get hasIssues(): boolean {
    return this.issues.length > 0;
  }
}