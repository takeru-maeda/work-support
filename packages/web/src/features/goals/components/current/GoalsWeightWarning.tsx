interface GoalsWeightWarningProps {
  totalWeight: number;
  isBalanced: boolean;
}

export function GoalsWeightWarning({
  totalWeight,
  isBalanced,
}: Readonly<GoalsWeightWarningProps>) {
  if (isBalanced) return null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1">
      <p className="text-sm text-yellow-600 dark:text-yellow-400">
        ⚠️ トータルウェイト: {totalWeight}%
      </p>
      <p className="text-sm text-yellow-600 dark:text-yellow-400">
        (100%になるようにしてください)
      </p>
    </div>
  );
}
