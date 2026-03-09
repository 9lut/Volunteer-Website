export interface User {
    id: string;
    email: string;
    password: string;
    role: 'admin' | 'president' | 'student';
    name?: string;
    status: 'active' | 'disabled';
    createdAt: Date;
    updatedAt: Date;
    clubId?: string;
}

export interface Club {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
}

export interface Activity {
    id: number;
    name: string;
    description?: string;
    location?: string;
    clubId?: string;
    maxParticipants: number;
    startDate?: Date;
    endDate?: Date;
    registrationDeadline?: Date;
    status: 'draft' | 'approved' | 'completed';
    imageUrl?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
}

export interface Registration {
    id: string;
    userId: string;
    activityId: number;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: Date;
    registeredAt: Date;
    rejectionReason?: string;
}

export interface Session {
    id: string;
    userId: string;
    createdAt: Date;
}