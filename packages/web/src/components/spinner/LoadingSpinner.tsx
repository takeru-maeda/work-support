import { Spinner } from "./Spinner";

interface LoadingSpinnerProps {
  loading: boolean;
  label?: string;
}
const LoadingSpinner = ({
  loading,
  label = "保存中...",
}: LoadingSpinnerProps) => {
  return (
    loading && (
      <div className="flex items-center gap-3">
        <Spinner variant="grid" size="sm" className="[&>div]:bg-chart-2/80" />
        <span className="text-sm text-chart-2/80">{label}</span>
      </div>
    )
  );
};

export default LoadingSpinner;
