import { API_ENDPOINTS } from "@/config/api";
import apiClient from "@/lib/apiClient";

/**
 * 現在のユーザーを削除します。
 */
export const deleteCurrentUser = async (): Promise<void> => {
  await apiClient.delete(API_ENDPOINTS.userAccount);
};
