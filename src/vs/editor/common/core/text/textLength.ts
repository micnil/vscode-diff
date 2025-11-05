/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Represents a non-negative length of text in terms of line and column count.
*/
export class TextLength {
	constructor(
		public readonly lineCount: number,
		public readonly columnCount: number
	) { }
}
