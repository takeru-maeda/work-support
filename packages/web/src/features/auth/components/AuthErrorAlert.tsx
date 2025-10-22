interface AuthErrorAlertProps {
  message: string;
}

export function AuthErrorAlert({ message }: Readonly<AuthErrorAlertProps>) {
  if (!message) return null;

  return (
    <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 dark:bg-red-950/20">
      {message}
    </div>
  );
}
