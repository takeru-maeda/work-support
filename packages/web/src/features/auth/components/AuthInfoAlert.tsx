interface AuthInfoAlertProps {
  message: string;
}

export function AuthInfoAlert({ message }: Readonly<AuthInfoAlertProps>) {
  if (!message) return null;

  return (
    <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-600 dark:bg-emerald-950/20">
      {message}
    </div>
  );
}
