/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

let _isWindows = false;
let _userAgent: string | undefined = undefined;

interface IProcessEnvironment {
	[key: string]: string | undefined;
}

/**
 * This interface is intentionally not identical to node.js
 * process because it also works in sandboxed environments
 * where the process object is implemented differently. We
 * define the properties here that we need for `platform`
 * to work and nothing else.
 */
interface INodeProcess {
	platform: string;
	arch: string;
	env: IProcessEnvironment;
	versions?: {
		node?: string;
		electron?: string;
		chrome?: string;
	};
	type?: string;
	cwd: () => string;
}

declare const process: INodeProcess;

const $globalThis: any = globalThis;

let nodeProcess: INodeProcess | undefined = undefined;
if (typeof $globalThis.vscode !== 'undefined' && typeof $globalThis.vscode.process !== 'undefined') {
	// Native environment (sandboxed)
	nodeProcess = $globalThis.vscode.process;
} else if (typeof process !== 'undefined' && typeof process?.versions?.node === 'string') {
	// Native environment (non-sandboxed)
	nodeProcess = process;
}

const isElectronProcess = typeof nodeProcess?.versions?.electron === 'string';
const isElectronRenderer = isElectronProcess && nodeProcess?.type === 'renderer';

// Native environment
if (typeof nodeProcess === 'object') {
	_isWindows = (nodeProcess.platform === 'win32');
}

// Web environment
else if (typeof navigator === 'object' && !isElectronRenderer) {
	_userAgent = navigator.userAgent;
	_isWindows = _userAgent.indexOf('Windows') >= 0;
}


export const isWindows = _isWindows;
