/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commonPrefixLength, commonSuffixLength } from '../../../../base/common/strings.js';
import { OffsetRange } from '../ranges/offsetRange.js';
import { BaseEdit, BaseReplacement } from './edit.js';


abstract class BaseStringEdit<T extends BaseStringReplacement<T> = BaseStringReplacement<any>, TEdit extends BaseStringEdit<T, TEdit> = BaseStringEdit<any, any>> extends BaseEdit<T, TEdit> {


	public apply(base: string): string {
		const resultText: string[] = [];
		let pos = 0;
		for (const edit of this.replacements) {
			resultText.push(base.substring(pos, edit.replaceRange.start));
			resultText.push(edit.newText);
			pos = edit.replaceRange.endExclusive;
		}
		resultText.push(base.substring(pos));
		return resultText.join('');
	}
}

abstract class BaseStringReplacement<T extends BaseStringReplacement<T> = BaseStringReplacement<any>> extends BaseReplacement<T> {
	constructor(
		range: OffsetRange,
		public readonly newText: string
	) {
		super(range);
	}

	getNewLength(): number { return this.newText.length; }

	override toString(): string {
		return `${this.replaceRange} -> ${JSON.stringify(this.newText)}`;
	}

	replace(str: string): string {
		return str.substring(0, this.replaceRange.start) + this.newText + str.substring(this.replaceRange.endExclusive);
	}

	/**
	 * Checks if the edit would produce no changes when applied to the given text.
	 */
	isNeutralOn(text: string): boolean {
		return this.newText === text.substring(this.replaceRange.start, this.replaceRange.endExclusive);
	}

	removeCommonSuffixPrefix(originalText: string): StringReplacement {
		const oldText = originalText.substring(this.replaceRange.start, this.replaceRange.endExclusive);

		const prefixLen = commonPrefixLength(oldText, this.newText);
		const suffixLen = Math.min(
			oldText.length - prefixLen,
			this.newText.length - prefixLen,
			commonSuffixLength(oldText, this.newText)
		);

		const replaceRange = new OffsetRange(
			this.replaceRange.start + prefixLen,
			this.replaceRange.endExclusive - suffixLen,
		);
		const newText = this.newText.substring(prefixLen, this.newText.length - suffixLen);

		return new StringReplacement(replaceRange, newText);
	}

	normalizeEOL(eol: '\r\n' | '\n'): StringReplacement {
		const newText = this.newText.replace(/\r\n|\n/g, eol);
		return new StringReplacement(this.replaceRange, newText);
	}


	public removeCommonSuffix(source: string): T {
		const oldText = this.replaceRange.substring(source);

		const suffixLen = commonSuffixLength(oldText, this.newText);
		if (suffixLen === 0) {
			return this as unknown as T;
		}
		return this.slice(this.replaceRange.deltaEnd(-suffixLen), new OffsetRange(0, this.newText.length - suffixLen));
	}

	public toEdit(): StringEdit {
		return new StringEdit([this]);
	}

	public toJson(): ISerializedStringReplacement {
		return ({
			txt: this.newText,
			pos: this.replaceRange.start,
			len: this.replaceRange.length,
		});
	}
}


/**
 * Represents a set of replacements to a string.
 * All these replacements are applied at once.
*/
export class StringEdit extends BaseStringEdit<StringReplacement, StringEdit> {

	constructor(replacements: readonly StringReplacement[]) {
		super(replacements);
	}

	protected override _createNew(replacements: readonly StringReplacement[]): StringEdit {
		return new StringEdit(replacements);
	}
}


/**
 * Warning: Be careful when changing this type, as it is used for serialization!
*/
interface ISerializedStringReplacement {
	txt: string;
	pos: number;
	len: number;
}

export class StringReplacement extends BaseStringReplacement<StringReplacement> {

	override equals(other: StringReplacement): boolean {
		return this.replaceRange.equals(other.replaceRange) && this.newText === other.newText;
	}

	override tryJoinTouching(other: StringReplacement): StringReplacement | undefined {
		return new StringReplacement(this.replaceRange.joinRightTouching(other.replaceRange), this.newText + other.newText);
	}

	override slice(range: OffsetRange, rangeInReplacement?: OffsetRange): StringReplacement {
		return new StringReplacement(range, rangeInReplacement ? rangeInReplacement.substring(this.newText) : this.newText);
	}
}