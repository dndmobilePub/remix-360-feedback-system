import type { Choice, Feedback } from "../types";

export type ChoiceKey = "workRehire" | "personalRehire";

const legacy = (f: Feedback): Choice | undefined =>
  f.rehire === true ? "좋아요" : f.rehire === false ? "싫어요" : undefined;

export const choiceOf = (f: Feedback, key: ChoiceKey): Choice | undefined => f[key] ?? legacy(f);

export const tally = (list: Feedback[], key: ChoiceKey) => ({
  like: list.filter((f) => choiceOf(f, key) === "좋아요").length,
  neutral: list.filter((f) => choiceOf(f, key) === "그저그래요").length,
  dislike: list.filter((f) => choiceOf(f, key) === "싫어요").length,
});

export const pct = (n: number, total: number) => (total > 0 ? (Math.round((n / total) * 1000) / 10).toFixed(1) : "0.0");
