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
    <p className="text-sm text-warning">
      ⚠️ トータルウェイト: {totalWeight}% (100%になるようにしてください)
    </p>
  );
}
