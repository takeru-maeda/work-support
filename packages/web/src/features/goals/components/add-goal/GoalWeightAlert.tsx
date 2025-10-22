interface GoalWeightAlertProps {
  isExceeded: boolean;
}

export function GoalWeightAlert({ isExceeded }: Readonly<GoalWeightAlertProps>) {
  if (!isExceeded) return null;

  return (
    <div className="mb-6 rounded-lg border border-destructive bg-destructive/10 p-4">
      <p className="text-sm font-medium text-destructive">
        トータルウェイトが100%を超えています。調整してください。
      </p>
    </div>
  );
}
