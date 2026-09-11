import type {
  ApprovalMode,
  EnvironmentStatus,
  HeliconEvent,
  ProjectView,
  SessionView,
  TranscriptItem,
  UserInputAnswerItem,
} from "./types.js";

export type { UserInputAnswerItem };

export type EventHandler = (event: HeliconEvent) => void;

export interface HeliconClient {
  probeEnvironment(): Promise<EnvironmentStatus>;
  listProjects(): Promise<ProjectView[]>;
  setPinned(cwd: string, pinned: boolean): Promise<void>;
  listSessions(cwd?: string): Promise<SessionView[]>;
  startSession(cwd: string, approvalMode?: ApprovalMode, modelId?: string): Promise<SessionView>;
  resumeSession(sessionId: string): Promise<{ session: SessionView; items: TranscriptItem[] }>;
  sendTurn(sessionId: string, text: string): Promise<{ turnId: string | null }>;
  steerTurn(sessionId: string, turnId: string, text: string): Promise<void>;
  interruptTurn(sessionId: string, turnId?: string): Promise<void>;
  cancelTurn(sessionId: string, turnId: string): Promise<void>;
  decideApproval(
    sessionId: string,
    approvalId: string,
    requirementId: unknown,
    choiceId: string,
    feedback?: string | null,
  ): Promise<void>;
  listModels(sessionId?: string): Promise<unknown>;
  setSessionModel(sessionId: string, model: unknown): Promise<void>;
  setSessionApprovalMode(sessionId: string, mode: ApprovalMode): Promise<void>;
  answerUserInput(
    sessionId: string,
    userInputId: string,
    answers: UserInputAnswerItem[],
  ): Promise<void>;
  onEvent(handler: EventHandler): void;
}
