import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	readConfig,
	writeConfig,
	type LunariaConfig,
	type LunariaUserConfig,
} from '../../config/index.js';
import { bold, confirm, error, handleCancel, highlight, sync as s, select } from '../console.js';
import { getFormattedTime } from '../helpers.js';
import type { PackageJson, SyncOptions } from '../types.js';

/** Packages that we support sync with. */
const supportedPackages = ['vitepress'];

export async function sync(options: SyncOptions) {
	const syncStartTime = performance.now();

	if (!options.package) console.log(s('Looking for syncable packages...'));

	const configPath = options.config ?? './lunaria.config.json';
	const skipQuestions = options['skip-questions'] ?? false;
	const selectedPackage = options.package ?? (await getPackage());

	if (!selectedPackage) {
		console.error(error("Failed to find your project's packages"));
		process.exit(1);
	}

	switch (selectedPackage) {
		case 'vitepress':
			console.log(s(`Syncing with ${highlight('VitePress')}...`));
			const { vitepress } = await import('./vitepress.js');
			await vitepress(configPath, skipQuestions);
			break;
		default:
			console.error(error(`The selected package ${selectedPackage} is not supported`));
			break;
	}

	const syncEndTime = performance.now();

	console.log(s(`${bold('Complete!')} Synced in ${getFormattedTime(syncStartTime, syncEndTime)}`));
}

async function getPackage() {
	const { dependencies, devDependencies } = loadPackageJson();

	const allPackages = [
		...(dependencies ? Object.keys(dependencies) : []),
		...(devDependencies ? Object.keys(devDependencies) : []),
	];

	const foundPackages = allPackages.filter((pkg) => supportedPackages.includes(pkg));

	if (foundPackages.length < 1) {
		console.log(s('Lunaria currently does not support sync with your project'));
		process.exit(0);
	}

	if (foundPackages.length > 1) {
		const options = foundPackages.map((pkg) => ({ value: pkg }));

		const selected = await select({
			message: s('Found several packages Lunaria can sync with, which do you want to use?'),
			options: options,
			initialValue: options[0]?.value,
		});

		handleCancel(selected);

		return String(selected);
	}

	return foundPackages[0];
}

function loadPackageJson() {
	const resolvedPath = resolve('./package.json');

	try {
		const packageJson: PackageJson = JSON.parse(readFileSync(resolvedPath, 'utf-8'));

		if (!packageJson.dependencies || !packageJson.devDependencies) {
			console.error(
				error('Failed to find a dependencies or devDependencies field in your package.json\n')
			);
			process.exit(1);
		}

		return packageJson;
	} catch (e) {
		console.error(error('Failed to load your package.json\n'));
		throw e;
	}
}

export async function updateConfig(
	configPath: string,
	defaultLocale: LunariaConfig['defaultLocale'] | undefined,
	locales: LunariaConfig['locales'] | undefined,
	file: LunariaUserConfig['files'][number],
	skip: boolean
) {
	const config = await readConfig(configPath);

	if (defaultLocale) {
		let answer: boolean = true;
		if (!skip) {
			const updateDefaultLocale = await confirm({
				message: s('Update defaultLocale?'),
				initialValue: true,
			});

			handleCancel(updateDefaultLocale);

			answer = Boolean(updateDefaultLocale);
		}

		if (answer || skip) config.defaultLocale = defaultLocale;
	}

	if (locales) {
		let answer: boolean = true;
		if (!skip) {
			const updateLocales = await confirm({
				message: s('Update locales?'),
				initialValue: true,
			});

			handleCancel(updateLocales);

			answer = Boolean(updateLocales);
		}

		if (answer || skip) config.locales = locales;
	}

	if (file) {
		let answer: boolean = true;
		if (!skip) {
			const updateFiles = await confirm({
				message: s('Update files?'),
				initialValue: true,
			});

			handleCancel(updateFiles);

			answer = Boolean(updateFiles);
		}

		const otherFiles =
			config.files?.filter((f: { location: string }) => f.location !== file.location) ?? [];

		if (answer || skip) config.files = [file, ...otherFiles];
	}

	writeConfig(configPath, config);
}