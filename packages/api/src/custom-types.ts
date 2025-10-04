import { User } from '@supabase/supabase-js';
import { Tables } from '../../shared/src/types/db';

export interface HonoEnv {
  Variables: {
    user?: User; // SupabaseのUser型
    start: number; // 処理開始時間
    accessLog: Tables<'access_logs'>; // 今のリクエストのアクセスログ
  };
  Bindings: {
    SUPABASE_URL: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    DEVELOPER_EMAIL: string;
    API_KEY: string;
    RESEND_API_KEY: string;
    APP_EMAIL: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_REDIRECT_URI: string;
  };
}
