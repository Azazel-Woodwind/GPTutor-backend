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

declare type User = {
    id: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    education_level: EducationLevel;
    subjects: Subject[];
    access_level: number;
    usage_plan: string;
    max_daily_tokens: number;
    daily_token_usage: number;
};

declare type Message = {
    role: string;
    content: string;
};

declare type WaitingListMember = {
    first_name: string;
    email: string;
    education_level: EducationLevel;
    is_student: boolean;
    subjects: Subject[];
};

declare type Image = {
    link: string;
    description: string;
};

declare type LearningObjective = {
    title: string;
    description: string;
    images: Image[];
};

declare type Lesson = {
    id: string;
    title: string;
    caption: string;
    subject: Subject;
    educationLevel: EducationLevel;
    learningObjectives: LearningObjective[];
};

declare type ChatEntry = {
    role: string;
    content: string;
};

declare type ServerToClientEvents = {
    noArg: () => void;
    basicEmit: (a: number, b: string, c: Buffer) => void;
    withAck: (d: string, callback: (e: number) => void) => void;
};

declare type ClientToServerEvents = {
    hello: () => void;
};

declare type InterServerEvents = {
    ping: () => void;
};

declare type Context = {
    path: string;
};
