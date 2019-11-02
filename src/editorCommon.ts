// Updated from commit a71065a - vscode/src/vs/editor/common/editorCommon.ts
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * A change
 */
export interface IChange {
	readonly originalStartLineNumber: number;
	readonly originalEndLineNumber: number;
	readonly modifiedStartLineNumber: number;
	readonly modifiedEndLineNumber: number;
}
/**
 * A character level change.
 */
export interface ICharChange extends IChange {
	readonly originalStartColumn: number;
	readonly originalEndColumn: number;
	readonly modifiedStartColumn: number;
	readonly modifiedEndColumn: number;
}
/**
 * A line change
 */
export interface ILineChange extends IChange {
	readonly charChanges: ICharChange[] | undefined;
}