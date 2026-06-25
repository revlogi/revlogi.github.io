import { renderLayout } from "./layout";

export function renderAbout(): string {
	return renderLayout(
		{ title: "About" },
		`<h1>About</h1>
<div class="prose" style="max-width:none">
<p>Hi, I'm a first-year student at USTB and currently learning the basics of computer science. Hope to make some interesting stuff and share what I learnt here. You can find me on <a href="https://github.com/revlogi">github</a> or <a href="https://www.zhihu.com/people/corrupt-huan-ying">zhihu</a>.</p>
</div>`,
	);
}

export function renderFriends(): string {
	return renderLayout(
		{ title: "Friends" },
		`<h1>Friends</h1>
<ul class="friends-list">
  <li><a href="https://wdlin233.github.io">wdlin</a></li>
  <li><a href="https://siriuns.netlify.app">Siriuns</a></li>
</ul>`,
	);
}
