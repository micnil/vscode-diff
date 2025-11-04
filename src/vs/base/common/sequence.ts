/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from './event.js';

export interface ISplice<T> {
	readonly start: number;
	readonly deleteCount: number;
	readonly toInsert: readonly T[];
}

export interface ISpliceable<T> {
	splice(start: number, deleteCount: number, toInsert: readonly T[]): void;
}

export interface ISequence<T> {
	readonly elements: T[];
	readonly onDidSplice: Event<ISplice<T>>;
}
