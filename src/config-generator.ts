import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as inquirer from 'inquirer';
import {IConfig} from './iconfig';
import {configPath, configDirPath} from './meta';

export default async function(): Promise<void> {
	const as: any = await inquirer.prompt([
		{
			type: 'input',
			name: 'maintainer',
			message: 'Maintainer name(and email address):'
		},
		{
			type: 'input',
			name: 'port',
			message: 'Listen port:'
		},
		{
			type: 'confirm',
			name: 'https',
			message: 'Use TLS?',
			default: false
		},
		{
			type: 'input',
			name: 'https_key',
			message: 'Path of tls key:',
			when: (ctx: any): boolean => ctx.https
		},
		{
			type: 'input',
			name: 'https_cert',
			message: 'Path of tls cert:',
			when: (ctx: any): boolean => ctx.https
		},
		{
			type: 'input',
			name: 'https_ca',
			message: 'Path of tls ca:',
			when: (ctx: any): boolean => ctx.https
		},
		{
			type: 'input',
			name: 'mongo_host',
			message: 'MongoDB\'s host:',
			default: 'localhost'
		},
		{
			type: 'input',
			name: 'mongo_port',
			message: 'MongoDB\'s port:',
			default: '27017'
		},
		{
			type: 'input',
			name: 'mongo_db',
			message: 'MongoDB\'s db:',
			default: 'misskey'
		},
		{
			type: 'input',
			name: 'mongo_user',
			message: 'MongoDB\'s user:'
		},
		{
			type: 'password',
			name: 'mongo_pass',
			message: 'MongoDB\'s password:'
		}
	]);

	const conf: IConfig = {
		maintainer: as.maintainer,
		port: parseInt(as.port, 10),
		https: {
			enable: as.https,
			key: as.https_key || null,
			cert: as.https_cert || null,
			ca: as.https_ca || null
		},
		mongodb: {
			host: as.mongo_host,
			port: parseInt(as.mongo_port, 10),
			db: as.mongo_db,
			user: as.mongo_user,
			pass: as.mongo_pass
		}
	};

	console.log('Thanks, writing...');

	try {
		fs.mkdirSync(configDirPath);
		fs.writeFileSync(configPath, yaml.dump(conf));
		console.log('Well done.');
	} catch (e) {
		console.error(e);
	}
};
