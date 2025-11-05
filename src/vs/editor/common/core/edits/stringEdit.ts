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
	public static readonly empty = new StringEdit([]);

	public static create(replacements: readonly StringReplacement[]): StringEdit {
		return new StringEdit(replacements);
	}

	/**
	 * The replacements are applied in order!
	 * Equals `StringEdit.compose(replacements.map(r => r.toEdit()))`, but is much more performant.
	*/


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
	public static fromJson(data: ISerializedStringReplacement): StringReplacement {
		return new StringReplacement(OffsetRange.ofStartAndLength(data.pos, data.len), data.txt);
	}

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

/**
 * Represents data associated to a single edit, which survives certain edit operations.
*/
interface IEditData<T> {
	join(other: T): T | undefined;
}

export class VoidEditData implements IEditData<VoidEditData> {
	join(other: VoidEditData): VoidEditData | undefined {
		return this;
	}
}

/**
 * Represents a set of replacements to a string.
 * All these replacements are applied at once.
*/
export class AnnotatedStringEdit<T extends IEditData<T>> extends BaseStringEdit<AnnotatedStringReplacement<T>, AnnotatedStringEdit<T>> {
	public static readonly empty = new AnnotatedStringEdit<never>([]);

	public static create<T extends IEditData<T>>(replacements: readonly AnnotatedStringReplacement<T>[]): AnnotatedStringEdit<T> {
		return new AnnotatedStringEdit(replacements);
	}

	public static single<T extends IEditData<T>>(replacement: AnnotatedStringReplacement<T>): AnnotatedStringEdit<T> {
		return new AnnotatedStringEdit([replacement]);
	}

	public static replace<T extends IEditData<T>>(range: OffsetRange, replacement: string, data: T): AnnotatedStringEdit<T> {
		return new AnnotatedStringEdit([new AnnotatedStringReplacement(range, replacement, data)]);
	}

	public static insert<T extends IEditData<T>>(offset: number, replacement: string, data: T): AnnotatedStringEdit<T> {
		return new AnnotatedStringEdit([new AnnotatedStringReplacement(OffsetRange.emptyAt(offset), replacement, data)]);
	}

	public static delete<T extends IEditData<T>>(range: OffsetRange, data: T): AnnotatedStringEdit<T> {
		return new AnnotatedStringEdit([new AnnotatedStringReplacement(range, '', data)]);
	}

	public static compose<T extends IEditData<T>>(edits: readonly AnnotatedStringEdit<T>[]): AnnotatedStringEdit<T> {
		if (edits.length === 0) {
			return AnnotatedStringEdit.empty;
		}
		let result = edits[0];
		for (let i = 1; i < edits.length; i++) {
			result = result.compose(edits[i]);
		}
		return result;
	}

	constructor(replacements: readonly AnnotatedStringReplacement<T>[]) {
		super(replacements);
	}

	protected override _createNew(replacements: readonly AnnotatedStringReplacement<T>[]): AnnotatedStringEdit<T> {
		return new AnnotatedStringEdit<T>(replacements);
	}

	public toStringEdit(filter?: (replacement: AnnotatedStringReplacement<T>) => boolean): StringEdit {
		const newReplacements: StringReplacement[] = [];
		for (const r of this.replacements) {
			if (!filter || filter(r)) {
				newReplacements.push(new StringReplacement(r.replaceRange, r.newText));
			}
		}
		return new StringEdit(newReplacements);
	}
}

export class AnnotatedStringReplacement<T extends IEditData<T>> extends BaseStringReplacement<AnnotatedStringReplacement<T>> {
	public static insert<T extends IEditData<T>>(offset: number, text: string, data: T): AnnotatedStringReplacement<T> {
		return new AnnotatedStringReplacement<T>(OffsetRange.emptyAt(offset), text, data);
	}

	public static replace<T extends IEditData<T>>(range: OffsetRange, text: string, data: T): AnnotatedStringReplacement<T> {
		return new AnnotatedStringReplacement<T>(range, text, data);
	}

	public static delete<T extends IEditData<T>>(range: OffsetRange, data: T): AnnotatedStringReplacement<T> {
		return new AnnotatedStringReplacement<T>(range, '', data);
	}

	constructor(
		range: OffsetRange,
		newText: string,
		public readonly data: T
	) {
		super(range, newText);
	}

	override equals(other: AnnotatedStringReplacement<T>): boolean {
		return this.replaceRange.equals(other.replaceRange) && this.newText === other.newText && this.data === other.data;
	}

	tryJoinTouching(other: AnnotatedStringReplacement<T>): AnnotatedStringReplacement<T> | undefined {
		const joined = this.data.join(other.data);
		if (joined === undefined) {
			return undefined;
		}
		return new AnnotatedStringReplacement(this.replaceRange.joinRightTouching(other.replaceRange), this.newText + other.newText, joined);
	}

	slice(range: OffsetRange, rangeInReplacement?: OffsetRange): AnnotatedStringReplacement<T> {
		return new AnnotatedStringReplacement(range, rangeInReplacement ? rangeInReplacement.substring(this.newText) : this.newText, this.data);
	}
}

