import type { Readiness } from "../api/accountingReadinessApi";

export type ReadinessState =
  | { status: "loading" }
  | { status: "ready"; value: Readiness }
  | { status: "error" };

export type ReadinessAction =
  | { type: "start" }
  | { type: "success"; value: Readiness }
  | { type: "failure" };

export const initialReadinessState: ReadinessState = { status: "loading" };

export function readinessReducer(
  _state: ReadinessState,
  action: ReadinessAction,
): ReadinessState {
  if (action.type === "success")
    return { status: "ready", value: action.value };
  if (action.type === "failure") return { status: "error" };
  return { status: "loading" };
}
