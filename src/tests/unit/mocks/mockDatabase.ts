// tslint:disable:unified-signatures

import { composeObject, extend } from "alcalzone-shared/objects";
import { isArray } from "alcalzone-shared/typeguards";
import { str2regex } from "../../../lib/str2regex";
import { MockAdapter } from "./mockAdapter";

const objectTemplate = Object.freeze({
	type: "state",
	common: { name: "an object" },
	native: {},
} as ioBroker.Object);

const stateTemplate = Object.freeze({
	ack: false,
	val: 0,
} as ioBroker.State);

/**
 * A minimalistic version of ioBroker's Objects and States DB that just operates on a Map
 */
export class MockDatabase {

	public objects = new Map<string, ioBroker.Object>();
	public states = new Map<string, ioBroker.State>();

	public clearObjects() {
		this.objects.clear();
	}
	public clearStates() {
		this.states.clear();
	}
	public clear() {
		this.clearObjects();
		this.clearStates();
	}

	public publishObject(obj: ioBroker.PartialObject) {
		if (obj._id == null) throw new Error("An object must have an ID");
		if (obj.type == null) throw new Error("An object must have a type");

		const completeObject = extend({}, objectTemplate, obj) as ioBroker.Object;
		this.objects.set(obj._id!, completeObject);
	}
	public publishObjects(...objects: ioBroker.PartialObject[]) {
		objects.forEach(this.publishObject.bind(this));
	}
	public publishStateObjects(...objects: ioBroker.PartialObject[]) {
		objects
			.map(obj => extend({}, obj, { type: "state" }))
			.forEach(this.publishObject.bind(this))
			;
	}
	public publishChannelObjects(...objects: ioBroker.PartialObject[]) {
		objects
			.map(obj => extend({}, obj, { type: "channel" }))
			.forEach(this.publishObject.bind(this))
			;
	}
	public publishDeviceObjects(...objects: ioBroker.PartialObject[]) {
		objects
			.map(obj => extend({}, obj, { type: "device" }))
			.forEach(this.publishObject.bind(this))
			;
	}

	public deleteObject(obj: ioBroker.PartialObject): void;
	public deleteObject(objID: string): void;
	public deleteObject(objOrID: string | ioBroker.PartialObject): void {
		this.objects.delete(typeof objOrID === "string" ? objOrID : objOrID._id!);
	}

	public publishState(id: string, state: Partial<ioBroker.State> | null | undefined) {
		// if (typeof id !== "string") throw new Error("The id must be given!");
		if (state == null) {
			this.deleteState(id);
			return;
		}
		const completeState = extend({}, stateTemplate, state) as ioBroker.State;
		this.states.set(id, completeState);
	}
	public deleteState(id: string) {
		this.states.delete(id);
	}

	public hasObject(id: string): boolean;
	public hasObject(namespace: string, id: string): boolean;
	public hasObject(namespaceOrId: string, id?: string): boolean {
		id = namespaceOrId + (id ? "." + id : "");
		return this.objects.has(id);
	}

	public getObject(id: string): ioBroker.Object | undefined;
	public getObject(namespace: string, id: string): ioBroker.Object | undefined;
	public getObject(namespaceOrId: string, id?: string): ioBroker.Object | undefined {
		// combines getObject and getForeignObject into one
		id = namespaceOrId + (id ? "." + id : "");
		return this.objects.get(id);
	}

	public hasState(id: string): boolean;
	public hasState(namespace: string, id: string): boolean;
	public hasState(namespaceOrId: string, id?: string): boolean {
		id = namespaceOrId + (id ? "." + id : "");
		return this.states.has(id);
	}

	public getState(id: string): ioBroker.State | undefined;
	public getState(namespace: string, id: string): ioBroker.State | undefined;
	public getState(namespaceOrId: string, id?: string): ioBroker.State | undefined {
		// combines getObject and getForeignObject into one
		id = namespaceOrId + (id ? "." + id : "");
		return this.states.get(id);
	}

	public getObjects(pattern: string, type?: ioBroker.ObjectType): Record<string, ioBroker.Object>;
	public getObjects(namespace: string, pattern: string, type?: ioBroker.ObjectType): Record<string, ioBroker.Object>;
	public getObjects(namespaceOrPattern: string, patternOrType?: string | ioBroker.ObjectType, type?: ioBroker.ObjectType): Record<string, ioBroker.Object> {
		// combines getObjects and getForeignObjects into one
		let pattern: string;
		if (type != null) {
			pattern = namespaceOrPattern + (patternOrType ? "." + patternOrType : "");
		} else if (patternOrType != null) {
			if (["state", "channel", "device"].indexOf(patternOrType) > -1) {
				type = patternOrType as ioBroker.ObjectType;
				pattern = namespaceOrPattern;
			} else {
				pattern = namespaceOrPattern + "." + patternOrType;
			}
		} else {
			pattern = namespaceOrPattern;
		}

		const idRegExp = str2regex(pattern);

		return composeObject(
			[...this.objects.entries()]
				.filter(([id]) => idRegExp.test(id))
				.filter(([, obj]) => type == null || obj.type === type),
		);
	}

	public getStates(pattern: string) {
		// combines getStates and getForeignStates into one
		const idRegExp = str2regex(pattern);
		return composeObject(
			[...this.states.entries()]
				.filter(([id]) => idRegExp.test(id)),
		) as Record<string, ioBroker.State>;
	}
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
export function createAsserts(db: MockDatabase, adapter: MockAdapter) {
	function normalizeID(id: string | string[]) {
		if (isArray(id)) id = id.join(".");
		// Test if this ID is fully qualified
		if (!/^[a-z0-9\-_]+\.\d+\./.test(id)) {
			id = adapter.namespace + "." + id;
		}
		return id;
	}
	const ret = {
		assertObjectExists(id: string | string[]) {
			id = normalizeID(id);
			db.hasObject(id).should.equal(true, `The object "${adapter.namespace}.${id}" does not exist but it was expected to!`);
		},
		assertStateExists(id: string | string[]) {
			id = normalizeID(id);
			db.hasState(id).should.equal(true, `The state "${adapter.namespace}.${id}" does not exist but it was expected to!`);
		},
		assertStateHasValue(id: string | string[], value: any) {
			ret.assertStateProperty(id, "val", value);
		},
		assertStateIsAcked(id: string | string[], ack: boolean = true) {
			ret.assertStateProperty(id, "ack", ack);
		},
		assertStateProperty(id: string | string[], property: string, value: any) {
			id = normalizeID(id);
			ret.assertStateExists(id);
			db.getState(id)!
				.should.be.an("object")
				.that.has.property(property, value)
				;
		},
		assertObjectCommon(id: string | string[], common: ioBroker.ObjectCommon) {
			id = normalizeID(id);
			ret.assertObjectExists(id);
			const dbObj = db.getObject(id)!;
			dbObj.should.be.an("object")
				.that.has.property("common");
			dbObj.common.should.be.an("object")
				.that.nested.include(common);
		},
		assertObjectNative(id: string | string[], native: object) {
			id = normalizeID(id);
			ret.assertObjectExists(id);
			const dbObj = db.getObject(id)!;
			dbObj.should.be.an("object")
				.that.has.property("native");
			dbObj.native.should.be.an("object")
				.that.nested.include(native);
		},
	};
	return ret;
}
