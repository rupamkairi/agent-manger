import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { HTMLAttributes } from "svelte/elements";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type WithElementRef<T, E extends HTMLElement = HTMLElement> = T & {
	ref?: E | null;
};

export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, "children"> : T;
export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, "child"> : T;
export type WithoutChildrenOrChild<T> = T extends { child?: unknown }
	? WithoutChildren<Omit<T, "child">>
	: WithoutChildren<T>;

export type WithoutRef<T> = T extends { ref?: unknown } ? Omit<T, "ref"> : T;

export type DivAttrs = HTMLAttributes<HTMLDivElement>;
