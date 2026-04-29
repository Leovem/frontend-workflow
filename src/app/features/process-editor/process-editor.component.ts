import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import * as joint from '@joint/core';
import { Observable, of, switchMap, catchError, finalize, tap } from 'rxjs';

import { WorkflowCanvasService } from './services/workflow-canvas.service';
import { LaneManagerService } from './services/lane-manager.service';
import { NodeFactoryService } from './services/node-factory.service';
import { DiagramValidationService } from './services/diagram-validation.service';
import { DiagramPersistenceService } from './services/diagram-persistence.service';
import { ActivityDiagramValidationService } from './services/activitydiagram-validation.service';

import { PaletteComponent } from './components/palette/palette.component';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { PropertyPanelComponent } from './components/property-panel/property-panel.component';
import { ValidationPanelComponent } from './components/validation-panel/validation-panel.component';

import { DiagramNodeType } from './models/diagram-node-type.type';
import { DiagramValidationIssue } from './models/diagram-validation-issue.model';
import { JOINT_META } from './utils/joint-metadata';
import { DiagramAiMapperService } from './services/diagram-ai-mapper.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AiApiService } from '../../core/services/ai-api.service';
import { DiagramAiResponse } from './models/ai-diagram.models';
import { DiagramAiApplyService } from './services/diagram-ai-apply.service';
import { AiChatMessage } from './models/ai-chat-message.model';
import { CollaborationService } from '../../core/services/collaboration.service';
import { CollaborativeDiagramState } from '../../models/collaborative-diagram.model';
import { WorkflowProjectService } from '../../core/services/workflow-project.service';
import { NodeBusinessConfig, createDefaultNodeBusinessConfig } from './models/node-business-config.model';
import { WorkflowConfigurationValidationService } from './services/workflow-configuration-validation.service';
import { WorkflowAIContextService } from './services/workflow-ai-context.service';
import { WorkflowAiApiService } from '../../core/services/workflow-ai-api.service';
import { WorkflowFormApiService } from '../../core/services/workflow-form-api.service';
import { AIGeneratedWorkflowForm, SaveWorkflowFormRequest, WorkflowFormDefinition } from './models/workflow-form.model';
import { WorkflowProcessApiService } from '../../core/services/workflow-process-api.service';
import { WorkflowProcessEditorResponse } from './models/workflow-process.model';
import {
  DepartmentConfig,
  createDefaultDepartmentConfig
} from './models/department-config.model';



@Component({
  selector: 'app-process-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaletteComponent,
    ToolbarComponent,
    PropertyPanelComponent,
    ValidationPanelComponent
  ],
  templateUrl: './process-editor.component.html',
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    .canvas-viewport {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .canvas-viewport::-webkit-scrollbar {
      display: none;
    }
  `]
})
export class ProcessEditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasViewport', { static: true })
  canvasViewport!: ElementRef<HTMLDivElement>;

  @ViewChild('canvasSurface', { static: true })
  canvasSurface!: ElementRef<HTMLDivElement>;

  @ViewChild('canvasContainer', { static: true })
  canvasContainer!: ElementRef<HTMLDivElement>;

  @ViewChild('horizontalTrack', { static: true })
  horizontalTrack!: ElementRef<HTMLDivElement>;

  @ViewChild('verticalTrack', { static: true })
  verticalTrack!: ElementRef<HTMLDivElement>;

  private readonly canvasService = inject(WorkflowCanvasService);
  private readonly laneManager = inject(LaneManagerService);
  private readonly nodeFactory = inject(NodeFactoryService);
  private readonly validationService = inject(DiagramValidationService);
  private readonly persistenceService = inject(DiagramPersistenceService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly activityValidation = inject(ActivityDiagramValidationService);
  private readonly aiMapper = inject(DiagramAiMapperService);
  private readonly aiApi = inject(AiApiService);
  private readonly aiApply = inject(DiagramAiApplyService);
  private readonly collaborationService = inject(CollaborationService);
  private readonly projectService = inject(WorkflowProjectService);
  private readonly route = inject(ActivatedRoute);
  private readonly workflowValidation = inject(WorkflowConfigurationValidationService);
  private readonly workflowAIContext = inject(WorkflowAIContextService);
  private readonly workflowAiApi = inject(WorkflowAiApiService);
  private readonly workflowFormApi = inject(WorkflowFormApiService);
  private readonly workflowProcessApi = inject(WorkflowProcessApiService);


  processName = 'Nuevo Proceso de Negocio';
  lastSaved = 'Sin guardar';

  selectedNode: joint.dia.Cell | null = null;
  validationIssues: DiagramValidationIssue[] = [];
  showValidationPanel = false;

  validationErrorsCount = 0;
  validationWarningsCount = 0;

  isPaletteOpen = false;
  isPropertiesOpen = false;

  selectedTool: DiagramNodeType = 'action';
  isLinkMode = false;

  //variables forms fastapi
  processId: string | null = null;
  processVersionId: string | null = null;
  processDescription = '';
  versionNumber: number | null = null;
  versionStatus: string | null = null;
  //variables process
  selectedFormPreview: WorkflowFormDefinition | null = null;
  showFormPreviewPanel = false;
  formPreviewLoading = false;
  formEditMode = false;
  formSaving = false;
  //ai promts - variables

  aiPrompt = '';
  aiBusy = false;
  aiMessages: AiChatMessage[] = [];

  paper!: joint.dia.Paper;

  zoomPercent = 100;
  private zoomLevel = 1;
  private readonly minZoom = 0.4;
  private readonly maxZoom = 2.5;

  // Tamaño lógico del diagrama
  private logicalWidth = 2400;
  private logicalHeight = 1600;

  // ─────────────────────────────────────────────────────────────────────────────
  // Colaboración Yjs + MongoDB
  // ─────────────────────────────────────────────────────────────────────────────

  private projectId!: string;
  private isApplyingRemote = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private localGraphListenerRegistered = false;

  // Tamaño visual de la superficie según zoom
  surfaceWidth = 2400;
  surfaceHeight = 1600;

  // Scrollbars custom
  horizontalThumbLeft = 0;
  horizontalThumbWidth = 40;

  verticalThumbTop = 0;
  verticalThumbHeight = 40;

  private isDraggingHorizontalThumb = false;
  private isDraggingVerticalThumb = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartScrollLeft = 0;
  private dragStartScrollTop = 0;
  private scrollbarFramePending = false;

  private cleanupFns: Array<() => void> = [];

  // ─────────────────────────────────────────────────────────────────────────────
  // Colaboración Yjs + MongoDB
  // ─────────────────────────────────────────────────────────────────────────────

  private get graph(): joint.dia.Graph {
    return this.canvasService.getGraph();
  }

  private loadProjectAndStartCollaboration(): void {
    this.projectService.findById(this.projectId).subscribe({
      next: (project) => {
        const snapshot = project.diagramSnapshot as CollaborativeDiagramState | null | undefined;

        if (this.hasDiagramContent(snapshot)) {
          this.safeLoadDiagramFromState(snapshot);
        }

        this.collaborationService.connect(
          project.collaborationRoomId || project.id
        );

        this.listenRemoteChanges();
        this.listenLocalChanges();

        this.lastSaved = `Proyecto cargado: ${new Date().toLocaleTimeString()}`;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error cargando proyecto:', error);
        this.lastSaved = 'Error al cargar proyecto';
        this.cdr.detectChanges();
      }
    });
  }

  private hasDiagramContent(state: CollaborativeDiagramState | null | undefined): state is CollaborativeDiagramState {
    return !!(
      state &&
      (
        (state.lanes?.length ?? 0) > 0 ||
        (state.nodes?.length ?? 0) > 0 ||
        (state.links?.length ?? 0) > 0
      )
    );
  }

  private listenRemoteChanges(): void {
    const subscription = this.collaborationService.diagramChanged$.subscribe((state) => {
      if (!state) return;

      this.safeLoadDiagramFromState(state);
    });

    this.cleanupFns.push(() => subscription.unsubscribe());
  }

  private listenLocalChanges(): void {
    if (this.localGraphListenerRegistered) return;

    this.localGraphListenerRegistered = true;

    const onLocalGraphChange = () => {
      if (this.isApplyingRemote) return;
      if (!this.projectId) return;

      const state = this.exportDiagramState();

      this.collaborationService.updateDiagram(state);
      this.scheduleSnapshotSave(state);

      this.lastSaved = `Modificado: ${new Date().toLocaleTimeString()}`;
    };

    this.graph.on(
      'add remove change:position change:size change:attrs change:source change:target change:vertices',
      onLocalGraphChange
    );

    this.cleanupFns.push(() => {
      this.graph.off(
        'add remove change:position change:size change:attrs change:source change:target change:vertices',
        onLocalGraphChange
      );
    });
  }

  private safeLoadDiagramFromState(state: CollaborativeDiagramState): void {
    this.isApplyingRemote = true;

    try {
      this.loadDiagramFromState(state);
      this.selectedNode = null;
      this.resetSelectionStyles();
      this.hideAllLinkTools();
      this.runValidation();
    } finally {
      setTimeout(() => {
        this.isApplyingRemote = false;

        this.refreshCanvasSize();
        this.updateCustomScrollbars();
        this.cdr.detectChanges();
      });
    }
  }

  private exportDiagramState(): CollaborativeDiagramState {
    const cells = this.graph.getCells();

    return {
      lanes: cells
        .filter((cell: joint.dia.Cell) => this.isLaneCell(cell))
        .map((cell: joint.dia.Cell) => cell.toJSON()),

      nodes: cells
        .filter((cell: joint.dia.Cell) => this.isRegularNodeCell(cell))
        .map((cell: joint.dia.Cell) => cell.toJSON()),

      links: cells
        .filter((cell: joint.dia.Cell) => cell.isLink())
        .map((cell: joint.dia.Cell) => cell.toJSON())
    };
  }

  private loadDiagramFromState(state: CollaborativeDiagramState): void {
    this.graph.clear();

    this.graph.fromJSON({
      cells: [
        ...(state.lanes ?? []),
        ...(state.nodes ?? []),
        ...(state.links ?? [])
      ]
    });
  }

  private scheduleSnapshotSave(state: CollaborativeDiagramState): void {
    if (!this.projectId) return;

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.projectService.updateSnapshot(this.projectId, state).subscribe({
        next: () => {
          this.lastSaved = `Guardado: ${new Date().toLocaleTimeString()}`;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error guardando snapshot:', error);
          this.lastSaved = 'Error al guardar';
          this.cdr.detectChanges();
        }
      });
    }, 1000);
  }

  private isLaneCell(cell: joint.dia.Cell): boolean {
    return (
      cell.get('type') === 'custom.Lane' ||
      cell.get(JOINT_META.NODE_TYPE) === 'lane' ||
      cell.get('isLane') === true
    );
  }

  private isRegularNodeCell(cell: joint.dia.Cell): boolean {
    return cell.isElement() && !this.isLaneCell(cell);
  }

  //formularios

  private ensureDraftProcess(): Observable<WorkflowProcessEditorResponse> {
    if (this.processId && this.processVersionId) {
      return of({
        processId: this.processId,
        processVersionId: this.processVersionId,
        name: this.processName,
        description: this.processDescription,
        versionNumber: this.versionNumber ?? 1,
        versionStatus: this.versionStatus ?? 'DRAFT'
      });
    }

    return this.workflowProcessApi.createProcess({
      name: this.processName?.trim() || 'Proceso sin nombre',
      description: this.processDescription
    }).pipe(
      tap((response) => {
        this.applyProcessEditorData(response);
      })
    );
  }

  private applyProcessEditorData(response: WorkflowProcessEditorResponse): void {
    this.processId = response.processId;
    this.processVersionId = response.processVersionId;
    this.processName = response.name;
    this.processDescription = response.description ?? '';
    this.versionNumber = response.versionNumber;
    this.versionStatus = response.versionStatus;
  }

  private pushAiAssistantMessage(text: string): void {
    this.aiMessages.push({
      role: 'assistant',
      text
    });

    this.isAiAssistantOpen = true;
  }

  generateAllFormsWithAI(): void {
    const graph = this.canvasService.getGraph();

    const context = this.workflowAIContext.buildContext(
      graph,
      this.processName
    );

    if (context.activities.length === 0) {
      this.pushAiAssistantMessage(
        'No hay actividades en el diagrama para generar formularios.'
      );
      return;
    }

    this.aiBusy = true;

    this.ensureDraftProcess().pipe(
      switchMap((processData) => {
        return this.workflowAiApi.generateForms(context).pipe(
          switchMap((aiResponse) => {
            const formsToSave = aiResponse.forms.map((form) =>
              this.mapAIFormToSaveRequest(form)
            );

            return this.workflowFormApi.saveBulk({
              processId: processData.processId,
              processVersionId: processData.processVersionId,
              forms: formsToSave
            });
          })
        );
      }),
      catchError((error: unknown) => {
        console.error(error);

        this.pushAiAssistantMessage(
          'Ocurrió un error al generar o guardar los formularios con IA.'
        );

        return of([] as WorkflowFormDefinition[]);
      }),
      finalize(() => {
        this.aiBusy = false;
      })
    ).subscribe((savedForms: WorkflowFormDefinition[]) => {
      if (!savedForms.length) {
        return;
      }

      this.applySavedFormsToGraph(savedForms);
      this.runValidation();

      this.pushAiAssistantMessage(
        `Se generaron y guardaron ${savedForms.length} formularios correctamente.`
      );
    });
  }

  private mapAIFormToSaveRequest(
    form: AIGeneratedWorkflowForm
  ): SaveWorkflowFormRequest {
    return {
      nodeId: form.nodeId,
      title: form.title,
      description: form.description ?? '',
      generatedByAI: true,
      fields: form.fields.map((field, index) => ({
        label: field.label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder ?? '',
        options: field.options ?? [],
        order: index + 1
      }))
    };
  }

  private applySavedFormsToGraph(forms: WorkflowFormDefinition[]): void {
    const graph = this.canvasService.getGraph();

    const updatedNodes: Array<{
      nodeId: string;
      formId: string;
      formTitle: string;
    }> = [];

    for (const form of forms) {
      const node = graph.getCell(form.nodeId);

      if (!node || !node.isElement()) {
        console.warn('No se encontró nodo para el formulario:', form);
        continue;
      }

      if (node.get(JOINT_META.NODE_TYPE) !== 'action') {
        console.warn('El formulario pertenece a un nodo que no es action:', form);
        continue;
      }

      const currentBusinessConfig = node.get(
        JOINT_META.BUSINESS_CONFIG
      ) as NodeBusinessConfig | undefined;

      const businessConfig =
        currentBusinessConfig ?? createDefaultNodeBusinessConfig();

      node.set(JOINT_META.BUSINESS_CONFIG, {
        ...businessConfig,
        form: {
          ...businessConfig.form,
          formId: form.id,
          required: true
        },
        rules: {
          ...businessConfig.rules,
          requiresForm: true
        }
      });

      updatedNodes.push({
        nodeId: form.nodeId,
        formId: form.id,
        formTitle: form.title
      });
    }

    console.group('Formularios IA aplicados al graph');
    console.log('Formularios guardados:', forms);
    console.log('Nodos actualizados:', updatedNodes);
    console.log('Graph actualizado:', graph.toJSON());
    console.groupEnd();
  }

  enableFormEditMode(): void {
    if (!this.selectedFormPreview) {
      return;
    }

    this.formEditMode = true;
  }

  cancelFormEditMode(): void {
    if (!this.selectedFormPreview?.id) {
      this.formEditMode = false;
      return;
    }

    this.openFormPreview(this.selectedFormPreview.id);
    this.formEditMode = false;
  }

  onFormTitleInput(event: Event): void {
    if (!this.selectedFormPreview) return;

    const value = (event.target as HTMLInputElement).value;

    this.selectedFormPreview = {
      ...this.selectedFormPreview,
      title: value
    };
  }

  onFormDescriptionInput(event: Event): void {
    if (!this.selectedFormPreview) return;

    const value = (event.target as HTMLTextAreaElement).value;

    this.selectedFormPreview = {
      ...this.selectedFormPreview,
      description: value
    };
  }

  onFormFieldLabelInput(fieldId: string, event: Event): void {
    this.updateFormField(fieldId, {
      label: (event.target as HTMLInputElement).value
    });
  }

  onFormFieldTypeChange(fieldId: string, event: Event): void {
    this.updateFormField(fieldId, {
      type: (event.target as HTMLSelectElement).value as any
    });
  }

  onFormFieldRequiredChange(fieldId: string, event: Event): void {
    this.updateFormField(fieldId, {
      required: (event.target as HTMLInputElement).checked
    });
  }

  onFormFieldPlaceholderInput(fieldId: string, event: Event): void {
    this.updateFormField(fieldId, {
      placeholder: (event.target as HTMLInputElement).value
    });
  }

  onFormFieldOptionsInput(fieldId: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;

    const options = value
      .split(',')
      .map(option => option.trim())
      .filter(option => option.length > 0);

    this.updateFormField(fieldId, { options });
  }

  private updateFormField(
    fieldId: string,
    patch: Partial<WorkflowFormDefinition['fields'][number]>
  ): void {
    if (!this.selectedFormPreview) return;

    this.selectedFormPreview = {
      ...this.selectedFormPreview,
      fields: this.selectedFormPreview.fields.map(field =>
        field.id === fieldId
          ? { ...field, ...patch }
          : field
      )
    };
  }

  addFormField(): void {
    if (!this.selectedFormPreview) return;

    const nextOrder = this.selectedFormPreview.fields.length + 1;

    this.selectedFormPreview = {
      ...this.selectedFormPreview,
      fields: [
        ...this.selectedFormPreview.fields,
        {
          id: `temp_${crypto.randomUUID()}`,
          label: 'Nuevo campo',
          type: 'text',
          required: false,
          placeholder: '',
          options: [],
          order: nextOrder
        }
      ]
    };
  }

  removeFormField(fieldId: string): void {
    if (!this.selectedFormPreview) return;

    const fields = this.selectedFormPreview.fields
      .filter(field => field.id !== fieldId)
      .map((field, index) => ({
        ...field,
        order: index + 1
      }));

    this.selectedFormPreview = {
      ...this.selectedFormPreview,
      fields
    };
  }

  saveFormChanges(): void {
    if (!this.selectedFormPreview) return;

    const form = this.selectedFormPreview;

    this.formSaving = true;

    this.workflowFormApi.updateForm(form.id, {
      title: form.title,
      description: form.description ?? '',
      generatedByAI: form.generatedByAI,
      fields: form.fields.map((field, index) => ({
        id: field.id?.startsWith('temp_') ? undefined : field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        placeholder: field.placeholder ?? '',
        options: field.options ?? [],
        order: index + 1
      }))
    }).subscribe({
      next: (updatedForm) => {
        this.selectedFormPreview = updatedForm;
        this.formEditMode = false;

        this.pushAiAssistantMessage(
          `Formulario "${updatedForm.title}" actualizado correctamente.`
        );
      },
      error: (error) => {
        console.error('Error al guardar formulario:', error);

        this.pushAiAssistantMessage(
          'No se pudo guardar el formulario editado.'
        );
      },
      complete: () => {
        this.formSaving = false;
      }
    });
  }

  //Mapper e IA

  isAiAssistantOpen = true;

  toggleAiAssistant(): void {
    this.isAiAssistantOpen = !this.isAiAssistantOpen;
  }

  closeAiAssistant(): void {
    this.isAiAssistantOpen = false;
  }

  testMapper(): void {
    const graph = this.canvasService.getGraph();
    const graphJson = graph.toJSON();
    const diagram = this.aiMapper.fromGraphJson(graphJson);

    console.log('GRAPH JSON RAW:', graphJson);
    console.log('AI PAYLOAD:', diagram);
    console.log('AI PAYLOAD PRETTY:', JSON.stringify(diagram, null, 2));
  }

  testAiInstruct(): void {
    const graph = this.canvasService.getGraph();
    const diagram = this.aiMapper.fromGraphJson(graph.toJSON());

    this.aiApi.instruct({
      prompt: 'Corrige errores ortográficos en las etiquetas y devuelve operaciones seguras.',
      diagram
    }).subscribe({
      next: (response: DiagramAiResponse) => {
        console.log('AI RESPONSE:', response);

        this.aiApply.applyResponse(graph, response);

        console.log('Operaciones IA aplicadas al diagrama.');
      },
      error: (error: HttpErrorResponse) => {
        console.error('AI ERROR:', error);
      }
    });
  }

  runAiPrompt(): void {
    const prompt = this.aiPrompt.trim();

    if (!prompt || this.aiBusy) return;

    const graph = this.canvasService.getGraph();
    const diagram = this.aiMapper.fromGraphJson(graph.toJSON());

    this.aiMessages.push({
      role: 'user',
      text: prompt
    });

    this.aiPrompt = '';
    this.aiBusy = true;

    this.aiApi.instruct({
      prompt,
      diagram
    }).subscribe({
      next: (response: DiagramAiResponse) => {
        this.aiMessages.push({
          role: 'assistant',
          text: [
            response.message,
            ...(response.notes ?? [])
          ].join('\n')
        });

        this.aiApply.applyResponse(graph, response);
        this.aiBusy = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('AI ERROR:', error);

        this.aiMessages.push({
          role: 'assistant',
          text: 'No se pudo procesar la instrucción con IA.'
        });

        this.aiBusy = false;
      }
    });
  }


  // ─────────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    this.paper = this.canvasService.setupPaper(
      this.canvasContainer.nativeElement,
      this.logicalWidth,
      this.logicalHeight
    );

    this.initializeDiagram();
    this.setupSelectionEvents(this.paper);
    this.setupDragAndDrop();
    this.registerViewportControls();
    this.registerGraphValidationHooks();

    this.projectId = this.route.snapshot.paramMap.get('projectId') ?? '';

    if (!this.projectId) {
      console.error('No se encontró projectId en la ruta');
      this.lastSaved = 'Proyecto no encontrado';
      this.cdr.detectChanges();
      return;
    }

    this.loadProjectAndStartCollaboration();

    setTimeout(() => {
      this.syncCustomScrollbars();
      this.refreshCanvasSize();
      this.resetView();
      this.cdr.detectChanges();
    });
  }


  ngOnDestroy(): void {
    this.hideAllLinkTools();

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.cleanupFns.forEach((fn) => fn());
    this.cleanupFns = [];

    this.collaborationService.disconnect();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.handleViewportResize();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isLinkMode) {
      this.disableLinkMode();
    }
  }

  @HostListener('document:pointermove', ['$event'])
  onGlobalPointerMove(event: PointerEvent): void {
    const viewport = this.canvasViewport?.nativeElement;
    const hTrack = this.horizontalTrack?.nativeElement;
    const vTrack = this.verticalTrack?.nativeElement;

    if (!viewport || !hTrack || !vTrack) return;

    if (this.isDraggingHorizontalThumb) {
      const deltaX = event.clientX - this.dragStartX;
      const maxScrollLeft = Math.max(1, viewport.scrollWidth - viewport.clientWidth);
      const maxThumbLeft = Math.max(1, hTrack.clientWidth - this.horizontalThumbWidth);

      viewport.scrollLeft = this.dragStartScrollLeft + (deltaX / maxThumbLeft) * maxScrollLeft;
      this.updateCustomScrollbars();
    }

    if (this.isDraggingVerticalThumb) {
      const deltaY = event.clientY - this.dragStartY;
      const maxScrollTop = Math.max(1, viewport.scrollHeight - viewport.clientHeight);
      const maxThumbTop = Math.max(1, vTrack.clientHeight - this.verticalThumbHeight);

      viewport.scrollTop = this.dragStartScrollTop + (deltaY / maxThumbTop) * maxScrollTop;
      this.updateCustomScrollbars();
    }
  }

  @HostListener('document:pointerup')
  onGlobalPointerUp(): void {
    this.isDraggingHorizontalThumb = false;
    this.isDraggingVerticalThumb = false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Panels
  // ─────────────────────────────────────────────────────────────────────────────

  togglePalette(): void {
    this.isPaletteOpen = !this.isPaletteOpen;
  }

  openPalette(): void {
    this.isPaletteOpen = true;
  }

  closePalette(): void {
    this.isPaletteOpen = false;
  }

  toggleProperties(): void {
    this.isPropertiesOpen = !this.isPropertiesOpen;
  }

  openProperties(): void {
    this.isPropertiesOpen = true;
  }

  closeProperties(): void {
    this.isPropertiesOpen = false;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Init
  // ─────────────────────────────────────────────────────────────────────────────

  private initializeDiagram(): void {
    const graph = this.canvasService.getGraph();
    const lanes = this.laneManager.getLanes(graph);

    if (lanes.length) {
      this.runValidation();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────────────────────

  runValidation(): void {
    const graph = this.canvasService.getGraph();

    const diagramIssues = this.activityValidation.validate(graph);
    const workflowIssues = this.workflowValidation.validate(graph);

    this.validationIssues = [
      ...diagramIssues,
      ...workflowIssues
    ];

    this.validationErrorsCount = this.validationIssues.filter(
      issue => issue.severity === 'error'
    ).length;

    this.validationWarningsCount = this.validationIssues.filter(
      issue => issue.severity === 'warning'
    ).length;
  }

  openValidationPanel(): void {
    this.runValidation();
    this.showValidationPanel = true;

    console.table(this.validationIssues);
  }

  hideValidationPanel(): void {
    this.showValidationPanel = false;
  }

  get validationErrorCount(): number {
    return this.validationIssues.filter(issue => issue.severity === 'error').length;
  }

  get validationWarningCount(): number {
    return this.validationIssues.filter(issue => issue.severity === 'warning').length;
  }

  private registerGraphValidationHooks(): void {
    const graph = this.canvasService.getGraph();

    const onGraphAdd = (cell: joint.dia.Cell) => {
      if (cell.get(JOINT_META.NODE_TYPE) === 'link') {
        this.lastSaved = `Modificado: ${new Date().toLocaleTimeString()}`;
        this.runValidation();
      }
    };

    const onGraphRemove = (cell: joint.dia.Cell) => {
      if (cell.get(JOINT_META.NODE_TYPE) === 'link') {
        this.lastSaved = `Modificado: ${new Date().toLocaleTimeString()}`;
        this.runValidation();
      }
    };

    graph.on('add', onGraphAdd);
    graph.on('remove', onGraphRemove);

    this.cleanupFns.push(() => {
      graph.off('add', onGraphAdd);
      graph.off('remove', onGraphRemove);
    });
  }


  // ─────────────────────────────────────────────────────────────────────────────
  // Diagram actions
  // ─────────────────────────────────────────────────────────────────────────────

  onNodeSelected(type: DiagramNodeType): void {
    this.selectedTool = type;

    if (type === 'link') {
      this.enableLinkMode();
      return;
    }

    this.disableLinkMode();
    this.onAddNode(type);
  }

  private enableLinkMode(): void {
    this.isLinkMode = true;
    this.canvasService.setLinkMode(true);
  }

  private disableLinkMode(): void {
    this.isLinkMode = false;
    this.canvasService.setLinkMode(false);
  }

  addDepartment(name = 'NUEVO DEPARTAMENTO'): void {
    this.laneManager.addLane(this.canvasService.getGraph(), name);
    this.refreshCanvasSize();
    this.lastSaved = `Departamento añadido: ${name}`;
    this.runValidation();
  }

  onAddNode(type: DiagramNodeType): void {
    if (type === 'link') {
      this.enableLinkMode();
      return;
    }

    const firstLane = this.laneManager.getLanes(this.canvasService.getGraph())[0] ?? null;
    if (!firstLane) return;

    const lanePos = firstLane.position();
    const viewport = this.canvasViewport.nativeElement;

    const centerX = viewport.scrollLeft + viewport.clientWidth / 2;
    const centerY = viewport.scrollTop + viewport.clientHeight / 2;

    const worldX = centerX / this.zoomLevel;
    const worldY = centerY / this.zoomLevel;

    this.createAndInsertNode(
      type,
      Math.max(lanePos.x + 120, worldX),
      Math.max(lanePos.y + 80, worldY)
    );
  }

  onAddNodeAt(type: DiagramNodeType, x: number, y: number): void {
    if (type === 'link') {
      this.enableLinkMode();
      return;
    }

    this.createAndInsertNode(type, x, y);
  }

  private createAndInsertNode(type: DiagramNodeType, x: number, y: number): void {
    if (type === 'link') {
      this.enableLinkMode();
      return;
    }

    const graph = this.canvasService.getGraph();
    const lane = this.laneManager.getLaneAtPoint(graph, x, y);
    const validation = this.validationService.validateNewNode(graph, type, lane);

    if (!validation.valid || !lane) {
      this.validationIssues = [
        {
          severity: 'error',
          code: 'NODE_INSERT_INVALID',
          message: validation.message ?? 'No se pudo insertar el nodo.'
        }
      ];
      this.showValidationPanel = true;
      return;
    }

    const adjusted = this.getAdjustedPosition(type, x, y);
    const node = this.nodeFactory.createNode(type, adjusted.x, adjusted.y);
    node.addTo(graph);

    this.laneManager.embedNodeInLane(node, lane);
    this.refreshCanvasSize();
    this.lastSaved = `Modificado: ${new Date().toLocaleTimeString()}`;
    this.runValidation();
  }

  private getAdjustedPosition(type: DiagramNodeType, x: number, y: number): { x: number; y: number } {
    switch (type) {
      case 'decision':
        return { x: x - 30, y: y - 30 };
      case 'initial':
      case 'activityFinal':
      case 'flowFinal':
        return { x: x - 15, y: y - 15 };
      case 'sync':
        return { x: x - 40, y: y - 5 };
      case 'action':
      default:
        return { x: x - 50, y: y - 25 };
    }
  }

  deleteSelectedNode(): void {
    if (!this.selectedNode) return;

    this.hideAllLinkTools();
    this.selectedNode.remove();
    this.selectedNode = null;
    this.refreshCanvasSize();
    this.runValidation();
  }

  updateSelectedLaneName(value: string): void {
    if (!this.selectedNode || !this.selectedNode.isElement()) {
      return;
    }

    if (this.selectedNode.get(JOINT_META.IS_LANE) !== true) {
      return;
    }

    const name = value.trim() || 'Departamento';

    this.selectedNode.attr('label/text', name);
    this.selectedNode.attr('text/text', name);

    const currentDepartmentConfig =
      this.selectedNode.get(JOINT_META.DEPARTMENT_CONFIG) as
      | DepartmentConfig
      | undefined;

    const shouldRegenerateDepartmentId =
      !currentDepartmentConfig ||
      currentDepartmentConfig.departmentId.startsWith('dep_nuevo_departamento') ||
      currentDepartmentConfig.departmentId.startsWith('dep_departamento');

    const nextDepartmentConfig: DepartmentConfig = shouldRegenerateDepartmentId
      ? createDefaultDepartmentConfig(name)
      : {
        ...currentDepartmentConfig,
        name
      };

    this.selectedNode.set(
      JOINT_META.DEPARTMENT_CONFIG,
      nextDepartmentConfig
    );

    this.syncLaneDepartmentToChildren(this.selectedNode);

    this.lastSaved = `Modificado: ${new Date().toLocaleTimeString()}`;
    this.runValidation();
  }

  private syncLaneDepartmentToChildren(lane: joint.dia.Element): void {
    const departmentConfig = lane.get(
      JOINT_META.DEPARTMENT_CONFIG
    ) as DepartmentConfig | undefined;

    if (!departmentConfig) {
      return;
    }

    for (const cell of lane.getEmbeddedCells()) {
      if (!cell.isElement()) {
        continue;
      }

      if (cell.get(JOINT_META.NODE_TYPE) !== 'action') {
        continue;
      }

      const businessConfig = cell.get(
        JOINT_META.BUSINESS_CONFIG
      ) as NodeBusinessConfig | undefined;

      if (!businessConfig) {
        continue;
      }

      cell.set(JOINT_META.BUSINESS_CONFIG, {
        ...businessConfig,
        assignment: {
          ...businessConfig.assignment,
          targetType: businessConfig.assignment?.targetType ?? 'DEPARTMENT',
          departmentId: departmentConfig.departmentId,
          departmentName: departmentConfig.name,
          roleId:
            businessConfig.assignment?.roleId ??
            departmentConfig.defaultRoleId
        }
      });
    }
  }

  updateSelectedNodeLabel(value: string): void {
    if (!this.selectedNode) {
      return;
    }

    const nodeType = this.selectedNode.get(JOINT_META.NODE_TYPE);

    if (nodeType === 'link') {
      const link = this.selectedNode as joint.dia.Link;

      link.label(0, {
        attrs: {
          labelText: {
            text: value
          }
        }
      });

      this.lastSaved = `Modificado: ${new Date().toLocaleTimeString()}`;
      this.runValidation();
      return;
    }

    if (!this.selectedNode.isElement()) {
      return;
    }

    this.selectedNode.attr('label/text', value);
    this.selectedNode.attr('text/text', value);

    this.lastSaved = `Modificado: ${new Date().toLocaleTimeString()}`;
    this.runValidation();
  }

  //Process 

  saveProcess(): void {
    const serialized = this.persistenceService.save(this.canvasService.getGraph());
    const graphJson = JSON.parse(serialized);

    console.log('JSON OBJ:', graphJson);
    console.log('JSON PRETTY:', JSON.stringify(graphJson, null, 2));

    this.ensureDraftProcess().pipe(
      switchMap((processData) => {
        return this.workflowProcessApi.saveDraftVersion(
          processData.processVersionId,
          { graphJson }
        );
      }),
      catchError((error: unknown) => {
        console.error('Error al guardar proceso:', error);
        this.lastSaved = 'Error al guardar';
        return of(null);
      })
    ).subscribe((response) => {
      if (!response) {
        return;
      }

      this.lastSaved = `Guardado: ${new Date().toLocaleTimeString()}`;

      console.log('Proceso guardado en Spring Boot:', response);
    });
  }

  private loadFormsForCurrentVersion(processVersionId: string): void {
    this.workflowFormApi.findByProcessVersion(processVersionId).subscribe({
      next: (forms) => {
        console.log('Formularios cargados:', forms);
      },
      error: (error) => {
        console.error('Error al cargar formularios:', error);
      }
    });
  }

  loadProcessForEditing(processId: string): void {
    this.workflowProcessApi.findEditorData(processId).subscribe({
      next: (response) => {
        this.applyProcessEditorData(response);

        if (response.graphJson) {
          this.canvasService.getGraph().fromJSON(response.graphJson as any);
          this.runValidation();

          this.lastSaved = `Cargado: ${new Date().toLocaleTimeString()}`;
        }

        this.loadFormsForCurrentVersion(response.processVersionId);

        console.log('Proceso cargado:', response);
      },
      error: (error) => {
        console.error('Error al cargar proceso:', error);
      }
    });
  }

  publishCurrentVersion(): void {
    this.runValidation();

    if (this.validationErrorCount > 0) {
      this.showValidationPanel = true;

      this.pushAiAssistantMessage(
        'No se puede publicar el proceso porque tiene errores de validación.'
      );

      return;
    }

    this.ensureDraftProcess().pipe(
      switchMap((processData) => {
        const serialized = this.persistenceService.save(this.canvasService.getGraph());
        const graphJson = JSON.parse(serialized);

        return this.workflowProcessApi.saveDraftVersion(
          processData.processVersionId,
          { graphJson }
        ).pipe(
          switchMap(() =>
            this.workflowProcessApi.publishVersion(processData.processVersionId)
          )
        );
      }),
      catchError((error: unknown) => {
        console.error('Error al publicar versión:', error);

        this.pushAiAssistantMessage(
          'No se pudo publicar la versión del proceso.'
        );

        return of(null);
      })
    ).subscribe((publishedVersion) => {
      if (!publishedVersion) {
        return;
      }

      this.versionStatus = publishedVersion.status;
      this.lastSaved = `Publicado: ${new Date().toLocaleTimeString()}`;

      this.pushAiAssistantMessage(
        `La versión ${publishedVersion.versionNumber} fue publicada correctamente.`
      );
    });
  }

  openFormPreview(formId: string): void {
    this.formPreviewLoading = true;
    this.showFormPreviewPanel = true;
    this.selectedFormPreview = null;

    this.workflowFormApi.findById(formId).subscribe({
      next: (form) => {
        this.selectedFormPreview = form;
      },
      error: (error) => {
        console.error('Error al cargar formulario:', error);

        this.pushAiAssistantMessage(
          'No se pudo cargar el formulario asociado a esta actividad.'
        );

        this.showFormPreviewPanel = false;
      },
      complete: () => {
        this.formPreviewLoading = false;
      }
    });
  }

  closeFormPreview(): void {
    this.showFormPreviewPanel = false;
    this.selectedFormPreview = null;
    this.formPreviewLoading = false;
  }

  generateAI(): void {
    console.log('Generar IA');
  }

  clearAll(): void {
    this.disableLinkMode();
    this.hideAllLinkTools();
    this.canvasService.clear();
    this.selectedNode = null;
    this.validationIssues = [];
    this.showValidationPanel = false;
    this.resetSelectionStyles();
    this.initializeDiagram();
    this.refreshCanvasSize();
    this.resetView();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Selection
  // ─────────────────────────────────────────────────────────────────────────────

  private setupSelectionEvents(paper: joint.dia.Paper): void {
    paper.on('element:pointerclick', (cellView: joint.dia.ElementView) => {
      this.resetSelectionStyles();
      this.hideAllLinkTools();
      this.selectedNode = cellView.model;
      this.highlightSelectedElement(cellView.model);
      this.openProperties();
    });

    paper.on('link:pointerclick', (linkView: joint.dia.LinkView) => {
      this.resetSelectionStyles();
      this.hideAllLinkTools();
      this.selectedNode = linkView.model;
      this.highlightSelectedLink(linkView.model);
      this.showLinkTools(linkView);
      this.openProperties();
    });

    paper.on('blank:pointerclick', () => {
      this.resetSelectionStyles();
      this.hideAllLinkTools();
      this.selectedNode = null;
    });
  }

  private resetSelectionStyles(): void {
    const graph = this.canvasService.getGraph();

    graph.getLinks().forEach((link) => {
      link.attr('line/strokeWidth', 2);
      link.attr('line/stroke', '#64748b');
    });

    graph.getElements().forEach((element) => {
      const currentStrokeWidth = element.attr('body/strokeWidth');
      if (currentStrokeWidth != null) {
        element.attr('body/strokeWidth', 1.5);
      }
    });
  }

  private highlightSelectedElement(element: joint.dia.Cell): void {
    if (!(element instanceof joint.dia.Element)) return;

    const currentStrokeWidth = element.attr('body/strokeWidth');
    if (currentStrokeWidth != null) {
      element.attr('body/strokeWidth', 3);
    }
  }

  private highlightSelectedLink(link: joint.dia.Cell): void {
    if (!(link instanceof joint.dia.Link)) return;

    link.attr('line/strokeWidth', 3);
    link.attr('line/stroke', '#2563eb');
  }

  private showLinkTools(linkView: joint.dia.LinkView): void {
    this.hideAllLinkTools();

    const tools = new joint.dia.ToolsView({
      tools: [
        new joint.linkTools.SourceArrowhead(),
        new joint.linkTools.TargetArrowhead(),
        new joint.linkTools.Vertices(),
        new joint.linkTools.Remove({ distance: '50%' })
      ]
    });

    linkView.addTools(tools);
    linkView.showTools();
  }

  private hideAllLinkTools(): void {
    const graph = this.canvasService.getGraph();

    graph.getLinks().forEach((link) => {
      const view = this.paper?.findViewByModel(link) as joint.dia.LinkView | null;
      if (!view) return;

      view.hideTools();
      view.removeTools();
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Drag & drop
  // ─────────────────────────────────────────────────────────────────────────────

  private setupDragAndDrop(): void {
    const viewport = this.canvasViewport.nativeElement;

    const onDragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    };

    const onDrop = (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer?.getData('nodeType') as DiagramNodeType | '';
      if (!type) return;

      const point = this.getViewportAdjustedPoint(event.clientX, event.clientY);
      this.onAddNodeAt(type, point.x, point.y);
    };

    viewport.addEventListener('dragover', onDragOver);
    viewport.addEventListener('drop', onDrop);

    this.cleanupFns.push(() => viewport.removeEventListener('dragover', onDragOver));
    this.cleanupFns.push(() => viewport.removeEventListener('drop', onDrop));
  }

  private getViewportAdjustedPoint(clientX: number, clientY: number): { x: number; y: number } {
    const viewport = this.canvasViewport.nativeElement;
    const rect = viewport.getBoundingClientRect();

    const localX = clientX - rect.left + viewport.scrollLeft;
    const localY = clientY - rect.top + viewport.scrollTop;

    return {
      x: localX / this.zoomLevel,
      y: localY / this.zoomLevel
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Canvas size
  // ─────────────────────────────────────────────────────────────────────────────

  private refreshCanvasSize(): void {
    const graph = this.canvasService.getGraph();

    this.logicalWidth = this.laneManager.getCanvasWidth(graph);
    this.logicalHeight = this.laneManager.getCanvasHeight(graph);

    this.canvasService.resizePaper(this.logicalWidth, this.logicalHeight);
    this.updateSurfaceSize();
  }

  private updateSurfaceSize(): void {
    this.surfaceWidth = Math.round(this.logicalWidth * this.zoomLevel);
    this.surfaceHeight = Math.round(this.logicalHeight * this.zoomLevel);

    if (this.paper) {
      this.paper.scale(this.zoomLevel, this.zoomLevel);
    }

    requestAnimationFrame(() => this.updateCustomScrollbars());
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Viewport: zoom
  // ─────────────────────────────────────────────────────────────────────────────

  private registerViewportControls(): void {
    const viewport = this.canvasViewport.nativeElement;

    const onWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;

      event.preventDefault();

      const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
      this.zoomAtPoint(zoomFactor, event.clientX, event.clientY);
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    this.cleanupFns.push(() => viewport.removeEventListener('wheel', onWheel));
  }

  private zoomAtPoint(factor: number, clientX: number, clientY: number): void {
    const viewport = this.canvasViewport.nativeElement;
    const rect = viewport.getBoundingClientRect();

    const pointX = clientX - rect.left;
    const pointY = clientY - rect.top;

    const worldX = (viewport.scrollLeft + pointX) / this.zoomLevel;
    const worldY = (viewport.scrollTop + pointY) / this.zoomLevel;

    const nextZoom = this.clamp(this.zoomLevel * factor, this.minZoom, this.maxZoom);
    if (nextZoom === this.zoomLevel) return;

    this.zoomLevel = nextZoom;
    this.zoomPercent = Math.round(this.zoomLevel * 100);

    this.updateSurfaceSize();

    requestAnimationFrame(() => {
      viewport.scrollLeft = worldX * this.zoomLevel - pointX;
      viewport.scrollTop = worldY * this.zoomLevel - pointY;
      this.updateCustomScrollbars();
    });
  }

  zoomIn(): void {
    const viewport = this.canvasViewport.nativeElement;
    const rect = viewport.getBoundingClientRect();

    this.zoomAtPoint(1.1, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  zoomOut(): void {
    const viewport = this.canvasViewport.nativeElement;
    const rect = viewport.getBoundingClientRect();

    this.zoomAtPoint(0.9, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  resetView(): void {
    this.zoomLevel = 1;
    this.zoomPercent = 100;
    this.updateSurfaceSize();

    requestAnimationFrame(() => {
      const viewport = this.canvasViewport.nativeElement;
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
      this.updateCustomScrollbars();
    });
  }

  private handleViewportResize(): void {
    const viewport = this.canvasViewport?.nativeElement;
    if (!viewport) return;

    const oldRect = viewport.getBoundingClientRect();
    if (!oldRect.width || !oldRect.height) return;

    const centerWorldX = (viewport.scrollLeft + oldRect.width / 2) / this.zoomLevel;
    const centerWorldY = (viewport.scrollTop + oldRect.height / 2) / this.zoomLevel;

    requestAnimationFrame(() => {
      const nextRect = viewport.getBoundingClientRect();
      if (!nextRect.width || !nextRect.height) return;

      viewport.scrollLeft = Math.max(0, centerWorldX * this.zoomLevel - nextRect.width / 2);
      viewport.scrollTop = Math.max(0, centerWorldY * this.zoomLevel - nextRect.height / 2);
      this.updateCustomScrollbars();
    });
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom scrollbars
  // ─────────────────────────────────────────────────────────────────────────────

  private syncCustomScrollbars(): void {
    const viewport = this.canvasViewport.nativeElement;

    const onViewportScroll = () => {
      this.updateCustomScrollbars();
    };

    viewport.addEventListener('scroll', onViewportScroll);
    this.cleanupFns.push(() => viewport.removeEventListener('scroll', onViewportScroll));
  }

  private scheduleScrollbarUpdate(): void {
    if (this.scrollbarFramePending) return;

    this.scrollbarFramePending = true;

    requestAnimationFrame(() => {
      this.scrollbarFramePending = false;
      this.updateCustomScrollbars();
    });
  }

  private updateCustomScrollbars(): void {
    const viewport = this.canvasViewport?.nativeElement;
    const hTrack = this.horizontalTrack?.nativeElement;
    const vTrack = this.verticalTrack?.nativeElement;

    if (!viewport || !hTrack || !vTrack) return;

    const viewW = viewport.clientWidth;
    const viewH = viewport.clientHeight;
    const scrollW = viewport.scrollWidth;
    const scrollH = viewport.scrollHeight;

    const hTrackW = hTrack.clientWidth;
    const vTrackH = vTrack.clientHeight;

    const minThumb = 28;

    // Horizontal
    if (scrollW <= viewW) {
      this.horizontalThumbWidth = hTrackW;
      this.horizontalThumbLeft = 0;
    } else {
      const ratio = viewW / scrollW;
      const thumbW = Math.max(minThumb, hTrackW * ratio);
      const maxThumbLeft = Math.max(0, hTrackW - thumbW);
      const maxScrollLeft = Math.max(1, scrollW - viewW);

      this.horizontalThumbWidth = thumbW;
      this.horizontalThumbLeft = (viewport.scrollLeft / maxScrollLeft) * maxThumbLeft;
    }

    // Vertical
    if (scrollH <= viewH) {
      this.verticalThumbHeight = vTrackH;
      this.verticalThumbTop = 0;
    } else {
      const ratio = viewH / scrollH;
      const thumbH = Math.max(minThumb, vTrackH * ratio);
      const maxThumbTop = Math.max(0, vTrackH - thumbH);
      const maxScrollTop = Math.max(1, scrollH - viewH);

      this.verticalThumbHeight = thumbH;
      this.verticalThumbTop = (viewport.scrollTop / maxScrollTop) * maxThumbTop;
    }

    this.cdr.detectChanges();
  }

  onHorizontalTrackPointerDown(event: PointerEvent): void {
    const viewport = this.canvasViewport.nativeElement;
    const track = this.horizontalTrack.nativeElement;
    const rect = track.getBoundingClientRect();

    const clickX = event.clientX - rect.left;
    const thumbCenter = this.horizontalThumbLeft + this.horizontalThumbWidth / 2;

    if (clickX < this.horizontalThumbLeft || clickX > this.horizontalThumbLeft + this.horizontalThumbWidth) {
      const delta = clickX < thumbCenter ? -viewport.clientWidth * 0.8 : viewport.clientWidth * 0.8;
      viewport.scrollLeft += delta;
      this.scheduleScrollbarUpdate();
    }
  }

  onVerticalTrackPointerDown(event: PointerEvent): void {
    const viewport = this.canvasViewport.nativeElement;
    const track = this.verticalTrack.nativeElement;
    const rect = track.getBoundingClientRect();

    const clickY = event.clientY - rect.top;
    const thumbCenter = this.verticalThumbTop + this.verticalThumbHeight / 2;

    if (clickY < this.verticalThumbTop || clickY > this.verticalThumbTop + this.verticalThumbHeight) {
      const delta = clickY < thumbCenter ? -viewport.clientHeight * 0.8 : viewport.clientHeight * 0.8;
      viewport.scrollTop += delta;
      this.scheduleScrollbarUpdate();
    }
  }

  onHorizontalThumbPointerDown(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const viewport = this.canvasViewport.nativeElement;

    this.isDraggingHorizontalThumb = true;
    this.dragStartX = event.clientX;
    this.dragStartScrollLeft = viewport.scrollLeft;
  }

  onVerticalThumbPointerDown(event: PointerEvent): void {
    event.preventDefault();
    event.stopPropagation();

    const viewport = this.canvasViewport.nativeElement;

    this.isDraggingVerticalThumb = true;
    this.dragStartY = event.clientY;
    this.dragStartScrollTop = viewport.scrollTop;
  }
}