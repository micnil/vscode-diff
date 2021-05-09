// Updated from commit ff75a560bc968b4f80636f26aa1a546c4cb4613f - vscode/src/vs/base/common/strings.ts
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from './charCode';

/**
 * Returns first index of the string that is not whitespace.
 * If string is empty or contains only whitespaces, returns -1
 */
 export function firstNonWhitespaceIndex(str: string): number {
	for (let i = 0, len = str.length; i < len; i++) {
		const chCode = str.charCodeAt(i);
		if (chCode !== CharCode.Space && chCode !== CharCode.Tab) {
			return i;
		}
	}
	return -1;
}

/**
 * Returns last index of the string that is not whitespace.
 * If string is empty or contains only whitespaces, returns -1
 */
 export function lastNonWhitespaceIndex(str: string, startIndex: number = str.length - 1): number {
	for (let i = startIndex; i >= 0; i--) {
		const chCode = str.charCodeAt(i);
		if (chCode !== CharCode.Space && chCode !== CharCode.Tab) {
			return i;
		}
	}
	return -1;
}