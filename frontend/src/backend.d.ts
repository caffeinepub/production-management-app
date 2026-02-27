import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Operator {
    id: OperatorId;
    name: string;
}
export type MachineId = bigint;
export interface NewOperatorFields {
    name: string;
}
export type OperatorId = bigint;
export interface Machine {
    id: MachineId;
    name: string;
}
export interface ProductionEntry {
    id: EntryId;
    cycleTime: {
        minutes: bigint;
        seconds: bigint;
    };
    punchOut: bigint;
    productId: ProductId;
    downtimeTime: {
        minutes: bigint;
        seconds: bigint;
    };
    totalRunTime: {
        hours: bigint;
        minutes: bigint;
        seconds: bigint;
    };
    punchIn: bigint;
    operatorId: OperatorId;
    dutyTime: {
        hours: bigint;
        minutes: bigint;
        seconds: bigint;
    };
    timestamp: bigint;
    twelveHourTarget: bigint;
    downtimeReason: string;
    tenHourTarget: bigint;
    numberOfPartsProduced: bigint;
    quantityProduced: bigint;
    machineId: MachineId;
    totalOperatorHours: {
        hours: bigint;
        minutes: bigint;
        seconds: bigint;
    };
}
export type EntryId = bigint;
export interface NewProductFields {
    cycleTime: bigint;
    name: string;
    loadingTime: bigint;
    unloadingTime: bigint;
    piecesPerCycle: bigint;
}
export type ProductId = bigint;
export interface NewMachineFields {
    name: string;
}
export interface Product {
    id: ProductId;
    cycleTime: bigint;
    name: string;
    loadingTime: bigint;
    unloadingTime: bigint;
    piecesPerCycle: bigint;
}
export interface UserProfile {
    name: string;
    role: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addMachine(fields: NewMachineFields): Promise<void>;
    addOperator(fields: NewOperatorFields): Promise<void>;
    addProduct(productData: NewProductFields): Promise<ProductId>;
    addProductionEntry(machineId: MachineId, operatorId: OperatorId, productId: ProductId, cycleTime: {
        minutes: bigint;
        seconds: bigint;
    }, quantityProduced: bigint, downtimeReason: string, downtimeTime: {
        minutes: bigint;
        seconds: bigint;
    }, punchIn: bigint, punchOut: bigint, timestamp: bigint | null): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteMachine(id: MachineId): Promise<void>;
    deleteOperator(id: OperatorId): Promise<void>;
    deleteProduct(id: ProductId): Promise<void>;
    deleteProductionEntry(entryId: EntryId): Promise<void>;
    getAllMachines(): Promise<Array<Machine>>;
    getAllMachinesSortedByName(): Promise<Array<Machine>>;
    getAllOperators(): Promise<Array<Operator>>;
    getAllOperatorsSortedByName(): Promise<Array<Operator>>;
    getAllProducts(): Promise<Array<Product>>;
    getAllProductsSortedByLoadingTime(): Promise<Array<Product>>;
    getAllProductsSortedByName(): Promise<Array<Product>>;
    getAllProductsSortedByPiecesPerCycle(): Promise<Array<Product>>;
    getAllProductsSortedByUnloadingTime(): Promise<Array<Product>>;
    getAllProductsUnsorted(): Promise<Array<Product>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getProductById(id: ProductId): Promise<Product | null>;
    getSortedProductionEntries(sortBy: string): Promise<Array<ProductionEntry>>;
    getSortedProducts(sortBy: string): Promise<Array<Product>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateMachine(id: MachineId, name: string): Promise<void>;
    updateOperator(id: OperatorId, name: string): Promise<void>;
    updateProduct(id: ProductId, productData: NewProductFields): Promise<void>;
}
