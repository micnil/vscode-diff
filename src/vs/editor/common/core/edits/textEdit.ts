/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { assertFn, checkAdjacentItems } from '../../../../base/common/assert.js';
import { Range } from '../range.js';

export class TextEdit {
	constructor(
		public readonly replacements: readonly TextReplacement[]
	) {
		assertFn(() => checkAdjacentItems(replacements, (a, b) => a.range.getEndPosition().isBeforeOrEqual(b.range.getStartPosition())));
	}
}

export class TextReplacement {
	constructor(
		public readonly range: Range,
		public readonly text: string,
	) {
	}
}

