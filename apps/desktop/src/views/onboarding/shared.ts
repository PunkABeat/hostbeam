import type { Host } from "../../types/config";

export interface OnbHost extends Host {
  manual?: boolean;
}
export type TestState = "idle" | "testing" | "ok" | "fail";
export interface BeakSpec {
  style?: string;
  size?: number;
  offset?: number;
}
export interface ManualSpec {
  name: string;
  user: string;
  address: string;
  folder: string;
  online: boolean;
}
