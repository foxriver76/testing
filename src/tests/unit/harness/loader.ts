import { isObject } from "alcalzone-shared/typeguards";
import Module from "module";
import * as path from "path";

export function createMockRequire(originalRequire: NodeRequire, mocks: Record<string, NodeModule>, relativeToFile?: string) {
	let relativeToDir: string | undefined;
	if (relativeToFile != undefined) {
		relativeToDir = path.dirname(relativeToFile);
	}
	return function fakeRequire(filename: string) {
		// Resolve relative paths relative to the require-ing module
		if (relativeToDir != undefined && filename.startsWith(".")) {
			filename = path.join(relativeToDir, filename);
		}
		if (filename in mocks) return mocks[filename].exports;
		return originalRequire(filename);
	};
}

/**
 * Creates a module that is loaded instead of another one with the same name
 */
function createMockModule(id: string, mocks: Record<string, any>) {
	const ret = new Module(id);
	ret.exports = mocks;
	return ret;
}

/**
 * Builds a proxy around a global object with the given properties or methods
 * proxied to their given replacements
 */
function buildProxy(global: any, mocks: Record<string, any>) {
	return new Proxy(global, {
		get: (target, name) => {
			if (name in mocks) return mocks[name as any];
			const ret = target[name];
			// Bind original functions to the target to avoid illegal invocation errors
			if (typeof ret === "function") return ret.bind(target);
			return ret;
		},
	});
}

/**
 * Returns true if the source code is intended to run in strict mode. Does not detect
 * "use strict" if it occurs in a nested function.
 */
function detectStrictMode(code: string) {
	// Taken from rewirejs

	// remove all comments before testing for "use strict"
	const multiLineComment = /^\s*\/\*.*?\*\//;
	const singleLineComment = /^\s*\/\/.*?[\r\n]/;

	let singleLine: boolean = false;
	let multiLine: boolean = false;

	// tslint:disable-next-line: no-conditional-assignment
	while ((singleLine = singleLineComment.test(code)) || (multiLine = multiLineComment.test(code))) {
		if (!!singleLine) {
			code = code.replace(singleLineComment, "");
		}
		if (!!multiLine) {
			code = code.replace(multiLineComment, "");
		}
	}

	const strictModeRegex = /^\s*(?:"use strict"|'use strict')[ \t]*(?:[\r\n]|;)/;
	return strictModeRegex.test(code);
}

/**
 * Monkey-patches module code before executing it by wrapping it in an IIFE whose arguments are modified (proxied) globals
 * @param code The code to monkey patch
 * @param globals A dictionary of globals and their properties to be replaced
 */
export function monkeyPatchGlobals(code: string, globals: Record<string, Record<string, any>>) {
	const codeIsStrict = detectStrictMode(code);
	const prefix: string = `${codeIsStrict ? '"use strict"; ' : ""}((${Object.keys(globals).join(", ")}) => {`;
	const patchedArguments = Object.keys(globals)
		.map(glob => {
			const patchObj = globals[glob];
			const patches = Object.keys(patchObj).map(fn => `${fn}: ${patchObj[fn]}`);
			return `buildProxy(${glob}, {${patches.join(", ")}})`;
		});
	const postfix: string = `
})(${patchedArguments.join(", ")});
${buildProxy}`;
	return prefix + code + postfix;
}

/** A test-safe replacement for process.exit that throws a specific error instead */
export function fakeProcessExit(code: number = 0) {
	const err = new Error(`process.exit was called with code ${code}`);
	// @ts-ignore
	err.processExitCode = code;
	throw err;
}

/**
 * Replaces NodeJS's default loader for .js-files with the given one and returns the original one
 */
export function replaceJsLoader(loaderFunction: NodeExtensions[string]): NodeExtensions[string] {
	const originalJsLoader = require.extensions[".js"];
	require.extensions[".js"] = loaderFunction;
	return originalJsLoader;
}

/**
 * Replaces a replaced loader for .js-files with the original one
 */
export function restoreJsLoader(originalJsLoader: NodeExtensions[string]) {
	require.extensions[".js"] = originalJsLoader;
}

export interface HarnessOptions {
	/** Mocks for loaded modules. This should be a dictionary of module name to module.exports */
	mockedModules?: Record<string, any>;
	/** Whether the main module should believe that it was not required */
	fakeNotRequired?: boolean;
	/** Patches for global objects like `process` */
	globalPatches?: Record<string, Record<string, any>>;
}

/**
 * Loads the given module into the test harness and returns the module's `module.exports`.
 */
export function loadModuleInHarness(moduleFilename: string, options: HarnessOptions = {}) {
	let originalJsLoader: NodeExtensions[string];
	originalJsLoader = replaceJsLoader((module: any, filename: string) => {
		// If we want to replace some modules with mocks, we need to change the module's require function
		if (isObject(options.mockedModules)) {
			const mockModules: Record<string, any> = {};
			for (const mod of Object.keys(options.mockedModules)) {
				mockModules[mod] = createMockModule(mod, options.mockedModules[mod]);
			}
			module.require = createMockRequire(module.require.bind(module), mockModules, filename);
		}
		if (options.fakeNotRequired && path.normalize(filename) === path.normalize(moduleFilename)) {
			module.parent = null;
		}
		// If necessary, edit the source code before executing it
		if (isObject(options.globalPatches)) {
			const originalCompile = module._compile;
			module._compile = (code: string, _filename: string) => {
				code = monkeyPatchGlobals(code, options.globalPatches!);

				// Restore everything to not break the NodeJS internals
				module._compile = originalCompile;
				module._compile(code, _filename);
			};
		}
		// Call the original loader
		originalJsLoader(module, filename);
	});

	// Make sure the main file is not already loaded into the require cache
	if (moduleFilename in require.cache) delete require.cache[moduleFilename];
	// And load the module
	const moduleExport: unknown = require(moduleFilename);

	// Restore the js loader so we don't fuck up more things
	restoreJsLoader(originalJsLoader!);

	return moduleExport;
}
