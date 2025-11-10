import useSWR from "swr";

import { getWorkRecords } from "@/services/reports";
import type {
  WorkRecordListQuery,
  WorkRecordListResponse,
} from "@shared/schemas/workRecords";
import { useUserStore } from "@/store/user";

export const useEffortListData = (
  query: WorkRecordListQuery | null,
  fetcher = getWorkRecords,
): {
  data: WorkRecordListResponse | undefined;
  error: unknown;
  isLoading: boolean;
} => {
  const { data, error, isLoading } = useSWR(
    getKey(query),
    () => (query ? fetcher(query) : Promise.resolve(undefined)),
    {
      keepPreviousData: true,
    },
  );

  return {
    data,
    error,
    isLoading,
  };
};

function getKey(query: WorkRecordListQuery | null): string {
  const userId: string | undefined = useUserStore.getState().user?.id;
  if (!userId) throw new Error("User not authenticated");
  const base: string = `work-records_${userId}`;
  if (!query) return base;
  return `${base}_${JSON.stringify(query)}`;
}
