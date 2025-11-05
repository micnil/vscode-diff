/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Range } from '../range.js';

export class TextReplacement {
	constructor(
		public readonly range: Range,
		public readonly text: string,
	) {
	}
}

