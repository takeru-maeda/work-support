import { toast } from "sonner";

interface ToastOptions {
  description?: string;
  richColors?: boolean;
  closeButton?: boolean;
}

/**
 * 成功トーストを表示します。
 *
 * @param title 見出しとなるメッセージ
 * @param options トーストのオプション
 */
export function showSuccessToast(
  title: string,
  options: ToastOptions = {},
): void {
  toast.success(title, {
    description: options.description,
    richColors: options.richColors ?? true,
    closeButton: options.closeButton ?? true,
  });
}

/**
 * エラートーストを表示します。
 *
 * @param title 見出しとなるメッセージ
 * @param options トーストのオプション
 */
export function showErrorToast(
  title: string,
  options: ToastOptions = {},
): void {
  toast.error(title, {
    description: options.description,
    richColors: options.richColors ?? true,
    closeButton: options.closeButton ?? true,
  });
}
