"use strict";
// wotan-disable async-function-assignability
// wotan-disable no-unused-expression
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const adapterTools_1 = require("../../lib/adapterTools");
const startMockAdapter_1 = require("./harness/startMockAdapter");
/**
 * Tests the adapter startup in offline mode (with mocks, no JS-Controller)
 * This is meant to be executed in a mocha context.
 */
function testAdapterWithMocks(adapterDir, options = {}) {
    function assertValidExitCode(allowedExitCodes, exitCode) {
        if (exitCode == undefined)
            return;
        // Ensure that a valid exit code was returned. By default, only 0 is allowed
        chai_1.expect(allowedExitCodes).contains(exitCode, `process.exit was called with the unexpected exit code ${exitCode}!`);
    }
    const adapterConfig = adapterTools_1.loadAdapterConfig(adapterDir);
    const instanceObjects = adapterTools_1.loadInstanceObjects(adapterDir);
    const supportsCompactMode = adapterTools_1.adapterShouldSupportCompactMode(adapterDir);
    describe(`Test the adapter (in a mocked environment)`, () => __awaiter(this, void 0, void 0, function* () {
        let mainFilename;
        before(() => __awaiter(this, void 0, void 0, function* () {
            mainFilename = yield adapterTools_1.locateAdapterMainFile(adapterDir);
        }));
        it("The adapter starts in normal mode", () => __awaiter(this, void 0, void 0, function* () {
            const { adapterMock, databaseMock, processExitCode, terminateReason } = yield startMockAdapter_1.startMockAdapter(mainFilename, {
                config: adapterConfig,
                instanceObjects,
                additionalMockedModules: options.additionalMockedModules,
                defineMockBehavior: options.defineMockBehavior,
            });
            assertValidExitCode(options.allowedExitCodes || [0], processExitCode);
            // TODO: Test that the unload callback is called
        }));
        if (supportsCompactMode) {
            it("The adapter starts in compact mode", () => __awaiter(this, void 0, void 0, function* () {
                const { adapterMock, databaseMock, processExitCode, terminateReason } = yield startMockAdapter_1.startMockAdapter(mainFilename, {
                    compact: true,
                    config: adapterConfig,
                    instanceObjects,
                    additionalMockedModules: options.additionalMockedModules,
                    defineMockBehavior: options.defineMockBehavior,
                });
                // In compact mode, only "adapter.terminate" may be called
                chai_1.expect(processExitCode, "In compact mode, process.exit() must not be called!").to.be.undefined;
                // TODO: Test that the unload callback is called (if terminateReason is undefined)
            }));
        }
        // Call the user's tests
        if (typeof options.defineAdditionalTests === "function") {
            options.defineAdditionalTests();
        }
    }));
}
exports.testAdapterWithMocks = testAdapterWithMocks;
