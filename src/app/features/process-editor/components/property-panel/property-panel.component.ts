import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as joint from '@joint/core';
import { JOINT_META } from '../../utils/joint-metadata';

import {
  NodeBusinessConfig,
  createDefaultNodeBusinessConfig
} from '../../models/node-business-config.model';

import {
  DepartmentConfig,
  createDefaultDepartmentConfig
} from '../../models/department-config.model';

@Component({
  selector: 'app-property-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './property-panel.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }
  `]
})
export class PropertyPanelComponent implements OnChanges {
  @Input() selectedNode: joint.dia.Cell | null = null;

  @Output() deleteRequested = new EventEmitter<void>();
  @Output() labelChanged = new EventEmitter<string>();
  @Output() departmentNameChanged = new EventEmitter<string>();
  @Output() viewFormRequested = new EventEmitter<string>();

  labelValue = '';
  nodeType = '';
  isLane = false;
  isLink = false;
  isAction = false;

  businessConfig: NodeBusinessConfig | null = null;
  departmentConfig: DepartmentConfig | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedNode']) {
      this.syncFromSelectedNode();
    }
  }

  private syncFromSelectedNode(): void {
    if (!this.selectedNode) {
      this.resetState();
      return;
    }

    this.nodeType = this.selectedNode.get(JOINT_META.NODE_TYPE) ?? 'desconocido';
    this.isLane = this.selectedNode.get(JOINT_META.IS_LANE) === true;
    this.isLink = this.nodeType === 'link';
    this.isAction = this.nodeType === 'action';

    this.labelValue = this.extractLabelText(this.selectedNode);

    this.syncBusinessConfig();
    this.syncDepartmentConfig();
  }

  private syncBusinessConfig(): void {
    if (!this.selectedNode || !this.isAction) {
      this.businessConfig = null;
      return;
    }

    let config = this.selectedNode.get(JOINT_META.BUSINESS_CONFIG) as NodeBusinessConfig | undefined;

    if (!config) {
      config = createDefaultNodeBusinessConfig();
      this.selectedNode.set(JOINT_META.BUSINESS_CONFIG, config);
    }

    this.businessConfig = structuredClone(config);
  }

  private syncDepartmentConfig(): void {
    if (!this.selectedNode || !this.isLane) {
      this.departmentConfig = null;
      return;
    }

    let config = this.selectedNode.get(JOINT_META.DEPARTMENT_CONFIG) as DepartmentConfig | undefined;

    if (!config) {
      config = createDefaultDepartmentConfig(this.labelValue || 'Departamento');
      this.selectedNode.set(JOINT_META.DEPARTMENT_CONFIG, config);
    }

    this.departmentConfig = structuredClone(config);
  }

  private extractLabelText(cell: joint.dia.Cell): string {
    const nodeType = cell.get(JOINT_META.NODE_TYPE);

    if (nodeType === 'link') {
      const link = cell as joint.dia.Link;
      return link.label(0)?.attrs?.['labelText']?.text ?? '';
    }

    return (
      cell.attr('label/text') ??
      cell.attr('text/text') ??
      ''
    );
  }

  private resetState(): void {
    this.labelValue = '';
    this.nodeType = '';
    this.isLane = false;
    this.isLink = false;
    this.isAction = false;
    this.businessConfig = null;
    this.departmentConfig = null;
  }

  onLabelInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.labelValue = value;
    this.labelChanged.emit(value);
  }

  onDepartmentNameInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.labelValue = value;

    if (this.departmentConfig) {
      this.departmentConfig = {
        ...this.departmentConfig,
        name: value
      };

      this.commitDepartmentConfig();
    }

    this.departmentNameChanged.emit(value);
  }

  onDepartmentDescriptionInput(event: Event): void {
    if (!this.departmentConfig) return;

    const value = (event.target as HTMLTextAreaElement).value;

    this.departmentConfig = {
      ...this.departmentConfig,
      description: value
    };

    this.commitDepartmentConfig();
  }

  onDepartmentAllowTaskPoolChange(event: Event): void {
    if (!this.departmentConfig) return;

    const checked = (event.target as HTMLInputElement).checked;

    this.departmentConfig = {
      ...this.departmentConfig,
      allowTaskPool: checked
    };

    this.commitDepartmentConfig();
  }

  onDepartmentAllowSelfAssignChange(event: Event): void {
    if (!this.departmentConfig) return;

    const checked = (event.target as HTMLInputElement).checked;

    this.departmentConfig = {
      ...this.departmentConfig,
      allowSelfAssign: checked
    };

    this.commitDepartmentConfig();
  }

  onDepartmentAllowReassignChange(event: Event): void {
    if (!this.departmentConfig) return;

    const checked = (event.target as HTMLInputElement).checked;

    this.departmentConfig = {
      ...this.departmentConfig,
      allowReassign: checked
    };

    this.commitDepartmentConfig();
  }

  onBusinessDescriptionInput(event: Event): void {
    if (!this.businessConfig) return;

    const value = (event.target as HTMLTextAreaElement).value;

    this.businessConfig = {
      ...this.businessConfig,
      description: value
    };

    this.commitBusinessConfig();
  }

  onAssignmentTargetTypeChange(event: Event): void {
    if (!this.businessConfig) return;

    const value = (event.target as HTMLSelectElement).value as NodeBusinessConfig['assignment']['targetType'];

    this.businessConfig = {
      ...this.businessConfig,
      assignment: {
        ...this.businessConfig.assignment,
        targetType: value
      }
    };

    this.commitBusinessConfig();
  }

  onAssignmentModeChange(event: Event): void {
    if (!this.businessConfig) return;

    const value = (event.target as HTMLSelectElement).value as NodeBusinessConfig['assignment']['assignmentMode'];

    this.businessConfig = {
      ...this.businessConfig,
      assignment: {
        ...this.businessConfig.assignment,
        assignmentMode: value
      }
    };

    this.commitBusinessConfig();
  }

  onAllowSelfAssignChange(event: Event): void {
    if (!this.businessConfig) return;

    const checked = (event.target as HTMLInputElement).checked;

    this.businessConfig = {
      ...this.businessConfig,
      assignment: {
        ...this.businessConfig.assignment,
        allowSelfAssign: checked
      }
    };

    this.commitBusinessConfig();
  }

  onAllowReassignChange(event: Event): void {
    if (!this.businessConfig) return;

    const checked = (event.target as HTMLInputElement).checked;

    this.businessConfig = {
      ...this.businessConfig,
      assignment: {
        ...this.businessConfig.assignment,
        allowReassign: checked
      }
    };

    this.commitBusinessConfig();
  }

  onFormRequiredChange(event: Event): void {
    if (!this.businessConfig) return;

    const checked = (event.target as HTMLInputElement).checked;

    this.businessConfig = {
      ...this.businessConfig,
      form: {
        ...this.businessConfig.form,
        required: checked
      },
      rules: {
        ...this.businessConfig.rules,
        requiresForm: checked
      }
    };

    this.commitBusinessConfig();
  }

  onSlaEnabledChange(event: Event): void {
    if (!this.businessConfig) return;

    const checked = (event.target as HTMLInputElement).checked;

    this.businessConfig = {
      ...this.businessConfig,
      sla: {
        ...this.businessConfig.sla,
        enabled: checked
      }
    };

    this.commitBusinessConfig();
  }

  onSlaDurationInput(event: Event): void {
    if (!this.businessConfig) return;

    const value = Number((event.target as HTMLInputElement).value);

    this.businessConfig = {
      ...this.businessConfig,
      sla: {
        ...this.businessConfig.sla,
        durationHours: Number.isFinite(value) && value > 0 ? value : 1
      }
    };

    this.commitBusinessConfig();
  }

  onCanCompleteChange(event: Event): void {
    this.updateActionFlag('canComplete', event);
  }

  onCanApproveChange(event: Event): void {
    this.updateActionFlag('canApprove', event);
  }

  onCanRejectChange(event: Event): void {
    this.updateActionFlag('canReject', event);
  }

  onCanReturnChange(event: Event): void {
    this.updateActionFlag('canReturn', event);
  }

  onRequiresAttachmentChange(event: Event): void {
    if (!this.businessConfig) return;

    const checked = (event.target as HTMLInputElement).checked;

    this.businessConfig = {
      ...this.businessConfig,
      rules: {
        ...this.businessConfig.rules,
        requiresAttachment: checked
      }
    };

    this.commitBusinessConfig();
  }

  onRequiresObservationOnRejectChange(event: Event): void {
    if (!this.businessConfig) return;

    const checked = (event.target as HTMLInputElement).checked;

    this.businessConfig = {
      ...this.businessConfig,
      rules: {
        ...this.businessConfig.rules,
        requiresObservationOnReject: checked
      }
    };

    this.commitBusinessConfig();
  }

  private updateActionFlag(
    key: keyof NodeBusinessConfig['actions'],
    event: Event
  ): void {
    if (!this.businessConfig) return;

    const checked = (event.target as HTMLInputElement).checked;

    this.businessConfig = {
      ...this.businessConfig,
      actions: {
        ...this.businessConfig.actions,
        [key]: checked
      }
    };

    this.commitBusinessConfig();
  }

  private commitBusinessConfig(): void {
    if (!this.selectedNode || !this.businessConfig) return;

    this.selectedNode.set(
      JOINT_META.BUSINESS_CONFIG,
      structuredClone(this.businessConfig)
    );
  }

  private commitDepartmentConfig(): void {
    if (!this.selectedNode || !this.departmentConfig) return;

    this.selectedNode.set(
      JOINT_META.DEPARTMENT_CONFIG,
      structuredClone(this.departmentConfig)
    );
  }

  get hasAssociatedForm(): boolean {
    return !!this.businessConfig?.form?.formId;
  }

  get associatedFormId(): string | null {
    return this.businessConfig?.form?.formId ?? null;
  }

  onViewAssociatedForm(): void {
    const formId = this.associatedFormId;

    if (!formId) {
      return;
    }

    this.viewFormRequested.emit(formId);
  }
}