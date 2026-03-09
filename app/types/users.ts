export type UserRole = 'admin' | 'manager' | 'user';

export interface User {
    id: number;
    name: string;
    email: string;
    document: string | null;
    phone: string | null;
    role: UserRole;
    active: boolean;
    defaultCompanyId: number | null;
    createdAt: string;
}

export interface UserCompanyEntry {
    id: number;
    userId: number;
    companyId: number;
    companyName: string;
    role: UserRole;
    active: boolean;
}

export const USER_ROLE_OPTS = [
    { value: 'admin', label: 'Administrador' },
    { value: 'manager', label: 'Gerente' },
    { value: 'user', label: 'Usuário' }
];
