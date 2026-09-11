export type ApprovalMode = "allowAll" | "denyUnmatched" | "onRequest" | "promptUnmatched";

export interface ProjectView {
  cwd: string;
  displayName: string;
  pinned: boolean;
}

export interface SessionView {
  sessionId: string;
  cwd: string;
  title: string;
  status: string;
  turnCount: number;
  modelId: string | null;
  origin: "helicon" | "tui";
}

export interface TranscriptItem {
  itemId: string;
  kind: string;
  text: string;
  status: "running" | "final";
}

export interface ApprovalChoiceView {
  choiceId: string;
  label: string;
  acceptsFeedback: boolean;
}

export interface ApprovalRequestView {
  approvalId: string;
  sessionId: string;
  requirementId: unknown;
  subject: string;
  choices: ApprovalChoiceView[];
}

export interface UserInputQuestionView {
  questionId: string;
  prompt: string;
  mode: "single" | "multiple" | "freeText";
  options: string[];
}

export interface UserInputPromptView {
  userInputId: string;
  sessionId: string;
  questions: UserInputQuestionView[];
}

export interface EnvironmentStatus {
  platform: string;
  wslAvailable: boolean;
  defaultDistro: string | null;
  museFound: boolean;
  musePath: string | null;
}

export interface UserInputAnswerItem {
  questionId: string;
  selectedLabel?: string;
  selectedLabels?: string[];
  freeText?: string;
  note?: string;
}

export type HeliconEvent =
  | { type: "delta"; sessionId: string; itemId: string; kind: string; text: string }
  | { type: "item-final"; sessionId: string; itemId: string; kind: string; text: string }
  | { type: "turn-terminal"; sessionId: string; turnId: string; terminal: string }
  | { type: "approval"; approval: ApprovalRequestView }
  | { type: "approval-resolved"; approvalId: string }
  | { type: "user-input"; prompt: UserInputPromptView }
  | { type: "sessions-changed"; cwd: string };
