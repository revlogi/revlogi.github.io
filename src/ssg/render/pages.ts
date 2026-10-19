import { renderLayout } from "./layout";
import { renderTemplate } from "./template";

export function renderAbout(): string {
	return renderLayout({ title: "About", path: "/about/" }, renderTemplate("about"));
}

export function renderFriends(): string {
	return renderLayout({ title: "Friends", path: "/friends/" }, renderTemplate("friends"));
}

export function renderLinks(html: string): string {
	return renderLayout({ title: "Links", path: "/links/" }, renderTemplate("links", { html }));
}
