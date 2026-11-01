// Shared by the TypeScript tests and the Gleam parity runner.
export const slugCases = [
	{
		name: "uses the filename, not the article title",
		filePath: "content/post/y-combinator.md",
		expected: "y-combinator",
	},
	{
		name: "preserves nested directories",
		filePath: "content/post/math/vectors.md",
		expected: "math/vectors",
	},
	{
		name: "handles an index nested multiple directories deep",
		filePath: "content/post/math/algebra/index.md",
		expected: "math/algebra",
	},
	{
		name: "uses the containing directory for a nested index",
		filePath: "content/post/math/index.md",
		expected: "math",
	},
	{
		name: "currently names a root index after the post directory",
		filePath: "content/post/index.md",
		expected: "post",
	},
	{
		name: "does not treat an index suffix in a filename as a directory index",
		filePath: "content/post/my-index.md",
		expected: "my-index",
	},
	{
		name: "removes only the final Markdown extension",
		filePath: "content/post/guide.md.notes.md",
		expected: "guide.md.notes",
	},
	{
		name: "preserves filename case",
		filePath: "content/post/Gitlet.md",
		expected: "Gitlet",
	},
	{
		name: "treats only lowercase index as special",
		filePath: "content/post/math/INDEX.md",
		expected: "math/INDEX",
	},
	{
		name: "preserves Unicode directory and file names",
		filePath: "content/post/数学/向量.md",
		expected: "数学/向量",
	},
];
