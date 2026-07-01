import api from "@/shared/services/api.client";
import type { AxiosError } from "axios";

async function messageFromBlobError(data: unknown): Promise<string | null> {
  if (!(data instanceof Blob)) return null;
  try {
    const text = await data.text();
    const json = JSON.parse(text) as { message?: string | string[] };
    if (!json.message) return null;
    return Array.isArray(json.message) ? json.message.join(", ") : json.message;
  } catch {
    return null;
  }
}

function filenameFromContentDisposition(header?: string): string | null {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const plainMatch = header.match(/filename="?([^";]+)"?/i);
  return plainMatch?.[1] ?? null;
}

export async function downloadApiFile(
  url: string,
  params: Record<string, string | number | undefined>,
  fallbackFilename: string,
) {
  try {
    const res = await api.get(url, {
      params,
      responseType: "blob",
    });

    const blob = new Blob([res.data], {
      type: res.headers["content-type"] || "application/octet-stream",
    });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download =
      filenameFromContentDisposition(res.headers["content-disposition"]) ||
      fallbackFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  } catch (error) {
    const axiosError = error as AxiosError<Blob>;
    const blobMessage = await messageFromBlobError(axiosError.response?.data);
    if (blobMessage) {
      throw new Error(blobMessage);
    }
    throw error;
  }
}
