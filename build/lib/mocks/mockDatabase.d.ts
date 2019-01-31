/// <reference types="iobroker" />
import { MockAdapter } from "./mockAdapter";
/**
 * A minimalistic version of ioBroker's Objects and States DB that just operates on a Map
 */
export declare class MockDatabase {
    objects: Map<string, ioBroker.Object>;
    states: Map<string, ioBroker.State>;
    clearObjects(): void;
    clearStates(): void;
    clear(): void;
    publishObject(obj: ioBroker.PartialObject): void;
    publishObjects(...objects: ioBroker.PartialObject[]): void;
    publishStateObjects(...objects: ioBroker.PartialObject[]): void;
    publishChannelObjects(...objects: ioBroker.PartialObject[]): void;
    publishDeviceObjects(...objects: ioBroker.PartialObject[]): void;
    deleteObject(obj: ioBroker.PartialObject): void;
    deleteObject(objID: string): void;
    publishState(id: string, state: Partial<ioBroker.State> | null | undefined): void;
    deleteState(id: string): void;
    hasObject(id: string): boolean;
    hasObject(namespace: string, id: string): boolean;
    getObject(id: string): ioBroker.Object | undefined;
    getObject(namespace: string, id: string): ioBroker.Object | undefined;
    hasState(id: string): boolean;
    hasState(namespace: string, id: string): boolean;
    getState(id: string): ioBroker.State | undefined;
    getState(namespace: string, id: string): ioBroker.State | undefined;
    getObjects(pattern: string, type?: ioBroker.ObjectType): Record<string, ioBroker.Object>;
    getObjects(namespace: string, pattern: string, type?: ioBroker.ObjectType): Record<string, ioBroker.Object>;
    getStates(pattern: string): Record<string, ioBroker.State>;
}
/**
 * Returns a collection of predefined assertions to be used in unit tests
 * Those include assertions for:
 * * State exists
 * * State has a certain value, ack flag, object property
 * * Object exists
 * * Object has a certain common or native part
 * @param db The mock database to operate on
 * @param adapter The mock adapter to operate on
 */
export declare function createAsserts(db: MockDatabase, adapter: MockAdapter): {
    assertObjectExists(prefix: string, suffix?: string | undefined): void;
    assertStateExists(prefix: string, suffix?: string | undefined): void;
    assertStateHasValue(prefix: string, suffix: string | undefined, value: any): void;
    assertStateIsAcked(prefix: string, suffix: string | undefined, ack?: boolean): void;
    assertStateProperty(prefix: string, suffix: string | undefined, property: string, value: any): void;
    assertObjectCommon(prefix: string, suffix: string | undefined, common: ioBroker.ObjectCommon): void;
    assertObjectNative(prefix: string, suffix: string | undefined, native: object): void;
};