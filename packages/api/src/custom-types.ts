import { Tables } from "../../shared/src/types/db";

export interface HonoEnv {
  Variables: {
    user?: AuthenticatedUser;
    start: number; // 処理開始時間
    accessLog: Tables<"access_logs">; // 今のリクエストのアクセスログ
  };
  Bindings: {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    SUPABASE_JWT_SECRET: string;
    DEVELOPER_EMAIL: string;
    API_KEY: string;
    RESEND_API_KEY: string;
    APP_EMAIL: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_REDIRECT_URI: string;
  };
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}
