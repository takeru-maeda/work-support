CREATE TYPE log_level AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');

CREATE TABLE projects (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE TABLE tasks (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    project_id BIGINT REFERENCES projects(id) NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, name)
);

CREATE TABLE work_records (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    task_id BIGINT REFERENCES tasks(id) NOT NULL,
    work_date DATE NOT NULL,
    hours NUMERIC(4,2) NOT NULL,
    estimated_hours NUMERIC(4,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE missions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
    content TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE goals (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    weight NUMERIC(5, 2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
    progress NUMERIC(5, 2) NOT NULL CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE goal_progress_histories (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    goal_id BIGINT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    progress NUMERIC(5, 2) NOT NULL CHECK (progress >= 0 AND progress <= 100),
    recorded_at DATE NOT NULL
);

CREATE TABLE access_logs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id),
    ip_address INET,
    path TEXT NOT NULL,
    status_code INT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INT
);

CREATE TABLE info_logs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    access_log_id BIGINT REFERENCES access_logs(id) NOT NULL,
    level log_level NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE error_logs (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    access_log_id BIGINT REFERENCES access_logs(id) NOT NULL,
    level log_level NOT NULL,
    message TEXT NOT NULL,
    stack_trace TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX projects_user_id_idx ON projects (user_id);
CREATE INDEX tasks_project_id_idx ON tasks (project_id);
CREATE INDEX work_records_user_id_work_date_idx ON work_records (user_id, work_date);
CREATE INDEX goals_user_id_idx ON goals (user_id);
CREATE INDEX goal_progress_histories_goal_id_recorded_at_idx ON goal_progress_histories (goal_id, recorded_at);
CREATE INDEX access_logs_user_id_idx ON access_logs (user_id);
CREATE INDEX access_logs_received_at_idx ON access_logs (received_at);
CREATE INDEX access_logs_path_idx ON access_logs (path);
CREATE INDEX access_logs_status_code_idx ON access_logs (status_code);
CREATE INDEX info_logs_access_log_id_idx ON info_logs (access_log_id);
CREATE INDEX error_logs_access_log_id_idx ON error_logs (access_log_id);
