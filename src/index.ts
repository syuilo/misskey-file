//////////////////////////////////////////////////
// ENTORY POINT
//////////////////////////////////////////////////

/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2014-2016 syuilo
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

Error.stackTraceLimit = Infinity;

/**
 * Module dependencies
 */
import * as os from 'os';
import * as cluster from 'cluster';
import { logInfo, logDone, logWarn, logFailed } from 'log-cool';
import * as chalk from 'chalk';
const Git = require('nodegit');
const portUsed = require('tcp-port-used');
import yesno from './utils/cli/yesno';
import ProgressBar from './utils/cli/progressbar';
import config from './load-config';
import configGenerator from './config-generator';
import initdb from './db';

// init babel
require('babel-core/register');
require('babel-polyfill');

const env = process.env.NODE_ENV;
const isProduction = env === 'production';
const isDebug = !isProduction;

// Set process title
process.title = 'Misskey File';

// Start app
main();

/**
 * Init proccess
 */
function main(): void {
	// Master
	if (cluster.isMaster) {
		master();
	}
	// Workers
	else {
		worker();
	}
}

/**
 * Init master proccess
 */
async function master(): Promise<void> {
	console.log(chalk.bold('Misskey File <aoi>'));

	// Get repository info
	const repository = await Git.Repository.open(__dirname + '/../');
	const commit = await repository.getHeadCommit();
	console.log(`commit: ${commit.sha()}`);
	console.log(`        ${commit.date()}`);

	if (isDebug) {
		logWarn('It is not in the Production mode. Do not use in the Production environment.');
	}

	logInfo(`environment: ${env}`);

	// Get machine info
	const totalmem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
	const freemem = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
	logInfo(`MACHINE: ${os.hostname()}`);
	logInfo(`MACHINE: CPU: ${os.cpus().length}core`);
	logInfo(`MACHINE: MEM: ${totalmem}GB (available: ${freemem}GB)`);

	// Load config
	let conf: any;
	try {
		conf = config();
	} catch (e) {
		if (e.code !== 'ENOENT') {
			logFailed('Failed to load configuration');
			return process.exit();
		}

		logWarn('Config not found');
		if (await yesno('Do you want setup now?', true)) {
			await configGenerator();
			conf = config();
		} else {
			logFailed('Failed to load configuration');
			return process.exit();
		}
	}

	logDone('Success to load configuration');
	logInfo(`maintainer: ${conf.maintainer}`);

	// Check if a port is being used
	if (await portUsed.check(conf.port)) {
		logFailed(`Port: ${conf.port} is already used!`);
		return process.exit();
	}

	// Spawn workers
	spawn(() => {
		console.log(chalk.bold.green(`\nmisskey-file is now running.`));

		// Listen new workers
		cluster.on('fork', worker => {
			console.log(`Process forked: ${worker.id}`);
		});

		// Listen online workers
		cluster.on('online', worker => {
			console.log(`Process is now online: ${worker.id}`);
		});

		// Listen for dying workers
		cluster.on('exit', worker => {
			// Replace the dead worker,
			// we're not sentimental
			console.log(chalk.red(`${worker.id} died :(`));
			cluster.fork();
		});
	});
}

/**
 * Init worker proccess
 */
function worker(): void {
	// Init mongo
	initdb(config()).then(db => {
		(<any>global).db = db;

		// start server
		require('./server');
	}, err => {
		console.error(err);
		process.exit(0);
	});
}

/**
 * Spawn workers
 */
function spawn(callback: any): void {
	// Count the machine's CPUs
	const cpuCount = os.cpus().length;

	const progress = new ProgressBar(cpuCount, 'Workers');

	// Create a worker for each CPU
	for (let i = 0; i < cpuCount; i++) {
		const worker = cluster.fork();
		worker.on('message', (message: any) => {
			if (message === 'listening') {
				progress.increment();
			}
		});
	}

	// on all workers started
	progress.on('complete', () => {
		callback();
	});
}

// Dying away...
process.on('exit', () => {
	console.log('Bye.');
});
