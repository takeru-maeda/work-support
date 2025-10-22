import { useCallback } from "react";
import useSWR from "swr";

import { API_ENDPOINTS } from "@/config/api";
import apiClient from "@/lib/apiClient";
import {
  GetMissionResponseSchema,
  UpdateMissionRequestSchema,
  UpdateMissionResponseSchema,
  type MissionGetResponse,
} from "@shared/schemas/missions";
import type { Mission } from "../types";

export function useMission() {
  const fetcher = useCallback(async () => {
    const response = await apiClient.get(API_ENDPOINTS.missions);
    return GetMissionResponseSchema.parse(response.data);
  }, []);

  const { data, error, isLoading, mutate, isValidating } =
    useSWR<MissionGetResponse>(API_ENDPOINTS.missions, fetcher);

  const mission: Mission | null = data?.mission ?? null;

  const updateMissionContent = useCallback(
    async (content: string) => {
      const payload = UpdateMissionRequestSchema.parse({ content });
      const response = await apiClient.put(API_ENDPOINTS.missions, payload);
      const parsed = UpdateMissionResponseSchema.parse(response.data);

      await mutate({ mission: parsed.mission }, { revalidate: false });

      return parsed.mission;
    },
    [mutate],
  );

  const reload = useCallback(() => mutate(), [mutate]);

  return {
    mission,
    isLoading,
    isValidating,
    error,
    updateMission: updateMissionContent,
    reload,
  };
}
