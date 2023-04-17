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
    education_level: EducationLevel;
    subjects: Subject[];
    access_level: number;
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
    images: Image[];
};

declare type Lesson = {
    id: string;
    title: string;
    subject: Subject;
    educationLevel: EducationLevel;
    description: string;
    learningObjectives: LearningObjective[];
};

declare type ChatEntry = {
    role: string;
    content: string;
};
