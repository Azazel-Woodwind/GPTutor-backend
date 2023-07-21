enum EducationLevel {
    KS3 = "ks3",
    GCSE = "gcse",
    ALEVEL = "a-level",
}

enum Subject {
    MATHEMATICS = "mathematics",
    PHYSICS = "physics",
    CHEMISTRY = "chemistry",
    BIOLOGY = "biology",
}

type User = {
    id: string;
    email: string;
    password?: string;
    first_name: string;
    last_name: string;
    education_level: EducationLevel;
    subjects?: Subject[];
    access_level: number;
    usage_plan: string;
    usage_plans: { max_daily_tokens: number };
    daily_token_usage: number;
    req_audio_data: boolean;
    user_metadata: any;
};

type Message = {
    role: string;
    content: string;
    rawContent?: string;
};

type WaitingListMember = {
    first_name: string;
    email: string;
    education_level: EducationLevel;
    is_student: boolean;
    subjects: Subject[];
};

type Instruction = {
    instruction: string;
    media_link: string | null;
    number: number;
};

type LearningObjective = {
    description: string | null;
    number: number;
    instructions: Instruction[];
};

type Lesson = {
    id: string;
    title: string;
    caption: string;
    subject: Subject;
    education_level: EducationLevel;
    learning_objectives: LearningObjective[];
    is_published: boolean;
    author_id: string;
    is_verified: boolean;
    created_at: string;
    exam_boards: string[];
};

type ChatEntry = {
    role: string;
    content: string;
};

type ServerToClientEvents = {
    noArg: () => void;
    basicEmit: (a: number, b: string, c: Buffer) => void;
    withAck: (d: string, callback: (e: number) => void) => void;
};

type ClientToServerEvents = {
    hello: () => void;
};

type InterServerEvents = {
    ping: () => void;
};

type Context = {
    path: string;
};
