import { useWorkRecords } from "@/services/reports";
import type {
  WorkRecordListQuery,
  WorkRecordListResponse,
} from "@shared/schemas/workRecords";

export const useEffortListData = (
  query: WorkRecordListQuery | null,
): {
  data: WorkRecordListResponse | undefined;
  error: unknown;
  isLoading: boolean;
} => {
  const { data, error, isLoading } = useWorkRecords(query);

  return {
    data,
    error,
    isLoading,
  };
};
