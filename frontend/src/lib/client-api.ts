import { CLIENT_API_BASE } from "@/lib/config";
import type { CompareResponse, DetectionMode, PredictResponse } from "@/types/prediction";

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public offline = false,
  ) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${CLIENT_API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("Could not reach the detection API.", undefined, true);
  }
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") detail = data.detail;
      else if (Array.isArray(data.detail)) detail = data.detail.map((d: { msg: string }) => d.msg.replace("Value error, ", "")).join("; ");
    } catch {
      /* non-JSON body */
    }
    throw new ApiError(detail, res.status, res.status >= 500 && res.status !== 503 ? true : false);
  }
  return res.json() as Promise<T>;
}

export const predict = (text: string, model: string, mode: DetectionMode, signal?: AbortSignal) =>
  post<PredictResponse>("/predict", { text, model, mode }, signal);

export const compareModels = (text: string, mode: DetectionMode, signal?: AbortSignal) =>
  post<CompareResponse>("/predict/compare", { text, mode }, signal);
