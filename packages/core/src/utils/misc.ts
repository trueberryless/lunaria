import fs from 'fs';
import { platform } from 'os';
import { extname, resolve } from 'path';
import { parse } from 'ultramatter';

export function renderToString(data: any) {
	const { strings, values } = data;

	const value_list = [...values, '']; // + last empty part
	let output = '';
	for (let i = 0; i < strings.length; i++) {
		let v = value_list[i];
		if (v._$litType$ !== undefined) {
			v = renderToString(v); // embedded template
		} else if (v instanceof Array) {
			// array of strings or templates.
			let new_v = '';
			for (const inner_v of [...v]) {
				new_v += renderToString(inner_v);
			}
			v = new_v;
		}
		output += strings[i] + v;
	}
	return output;
}

export function getFrontmatterFromFile(absolutePath: string): Record<string, any> | undefined {
	const validFrontmatterFileExtensions = ['.yml', '.md', '.markdown', '.mdx', '.mdoc'];
	if (!validFrontmatterFileExtensions.includes(extname(absolutePath))) return undefined;

	const contents = fs.readFileSync(absolutePath, 'utf8');
	return parse(contents).frontmatter;
}

export function getFrontmatterProperty(absolutePath: string, property: string): any {
	const frontmatter = getFrontmatterFromFile(absolutePath);
	if (!frontmatter || typeof frontmatter[property] === 'undefined') return undefined;

	return frontmatter[property];
}

export function toUtcString(date: string) {
	return new Date(date).toISOString();
}

export function getTextFromFormat(
	format: string,
	placeholders: {
		[part: string]: string;
	}
) {
	let formatResult = format;
	Object.keys(placeholders).forEach((key) => {
		formatResult = formatResult.replace(key, placeholders[key] ?? '');
	});
	return formatResult;
}

export function getWindowsCompatibleImportPath(filePath: string) {
	return platform() === 'win32' ? 'file://' + resolve(filePath) : resolve(filePath);
}