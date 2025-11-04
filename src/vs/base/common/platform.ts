/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from '../../nls.js';

export const LANGUAGE_DEFAULT = 'en';

let _isWindows = false;
let _isMacintosh = false;
let _isLinux = false;
let _isLinuxSnap = false;
let _isNative = false;
let _isWeb = false;
let _isElectron = false;
let _isIOS = false;
let _isCI = false;
let _isMobile = false;
let _locale: string | undefined = undefined;
let _language: string = LANGUAGE_DEFAULT;
let _platformLocale: string = LANGUAGE_DEFAULT;
let _translationsConfigFile: string | undefined = undefined;
let _userAgent: string | undefined = undefined;

export interface IProcessEnvironment {
	[key: string]: string | undefined;
}

/**
 * This interface is intentionally not identical to node.js
 * process because it also works in sandboxed environments
 * where the process object is implemented differently. We
 * define the properties here that we need for `platform`
 * to work and nothing else.
 */
export interface INodeProcess {
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

interface INavigator {
	userAgent: string;
	maxTouchPoints?: number;
	language: string;
}
declare const navigator: INavigator;

// Native environment
if (typeof nodeProcess === 'object') {
	_isWindows = (nodeProcess.platform === 'win32');
	_isMacintosh = (nodeProcess.platform === 'darwin');
	_isLinux = (nodeProcess.platform === 'linux');
	_isLinuxSnap = _isLinux && !!nodeProcess.env['SNAP'] && !!nodeProcess.env['SNAP_REVISION'];
	_isElectron = isElectronProcess;
	_isCI = !!nodeProcess.env['CI'] || !!nodeProcess.env['BUILD_ARTIFACTSTAGINGDIRECTORY'] || !!nodeProcess.env['GITHUB_WORKSPACE'];
	_locale = LANGUAGE_DEFAULT;
	_language = LANGUAGE_DEFAULT;
	const rawNlsConfig = nodeProcess.env['VSCODE_NLS_CONFIG'];
	if (rawNlsConfig) {
		try {
			const nlsConfig: nls.INLSConfiguration = JSON.parse(rawNlsConfig);
			_locale = nlsConfig.userLocale;
			_platformLocale = nlsConfig.osLocale;
			_language = nlsConfig.resolvedLanguage || LANGUAGE_DEFAULT;
			_translationsConfigFile = nlsConfig.languagePack?.translationsConfigFile;
		} catch (e) {
		}
	}
	_isNative = true;
}

// Web environment
else if (typeof navigator === 'object' && !isElectronRenderer) {
	_userAgent = navigator.userAgent;
	_isWindows = _userAgent.indexOf('Windows') >= 0;
	_isMacintosh = _userAgent.indexOf('Macintosh') >= 0;
	_isIOS = (_userAgent.indexOf('Macintosh') >= 0 || _userAgent.indexOf('iPad') >= 0 || _userAgent.indexOf('iPhone') >= 0) && !!navigator.maxTouchPoints && navigator.maxTouchPoints > 0;
	_isLinux = _userAgent.indexOf('Linux') >= 0;
	_isMobile = _userAgent?.indexOf('Mobi') >= 0;
	_isWeb = true;
	_language = nls.getNLSLanguage() || LANGUAGE_DEFAULT;
	_locale = navigator.language.toLowerCase();
	_platformLocale = _locale;
}

// Unknown environment
else {
	console.error('Unable to resolve platform.');
}

export const enum Platform {
	Web,
	Mac,
	Linux,
	Windows
}

let _platform: Platform = Platform.Web;
if (_isMacintosh) {
	_platform = Platform.Mac;
} else if (_isWindows) {
	_platform = Platform.Windows;
} else if (_isLinux) {
	_platform = Platform.Linux;
}

export const isWindows = _isWindows;
export const isMacintosh = _isMacintosh;

/**
 * The language used for the user interface. The format of
 * the string is all lower case (e.g. zh-tw for Traditional
 * Chinese or de for German)
 */
export const language = _language;

export namespace Language {

	export function value(): string {
		return language;
	}

	export function isDefaultVariant(): boolean {
		if (language.length === 2) {
			return language === 'en';
		} else if (language.length >= 3) {
			return language[0] === 'e' && language[1] === 'n' && language[2] === '-';
		} else {
			return false;
		}
	}

	export function isDefault(): boolean {
		return language === 'en';
	}
}

export const setTimeout0IsFaster = (typeof $globalThis.postMessage === 'function' && !$globalThis.importScripts);

let _isLittleEndian = true;
let _isLittleEndianComputed = false;
