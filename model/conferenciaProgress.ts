type SalaProgress = {
  checked: number;
  total: number;
  updatedAt: number;
};

const progressBySala: Record<string, SalaProgress> = {};

export type SalaStatus = "pendente" | "em andamento" | "finalizado";

export function setSalaProgress(sala: string, checked: number, total: number) {
  if (!sala) return;
  progressBySala[sala] = {
    checked: Math.max(0, checked),
    total: Math.max(0, total),
    updatedAt: Date.now(),
  };
}
//fsdfsdf
export function getSalaStatus(sala: string): SalaStatus {
  const progress = progressBySala[sala];
  if (!progress || progress.total === 0) return "pendente";
  if (progress.checked <= 0) return "pendente";
  if (progress.checked >= progress.total) return "finalizado";
  return "em andamento";
}

export function clearSalaProgress(sala: string) {
  if (!sala) return;
  delete progressBySala[sala];
}
