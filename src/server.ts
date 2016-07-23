//////////////////////////////////////////////////
// FILE SERVER
//////////////////////////////////////////////////

import * as cluster from 'cluster';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as favicon from 'serve-favicon';
import * as cors from 'cors';

import config from './config';

const worker = cluster.worker;

console.log(`Init ${worker.id} server...`);

/**
 * Init app
 */
const app = express();

app.disable('x-powered-by');
app.locals.compileDebug = false;
app.locals.cache = true;
app.set('view engine', 'pug');
app.set('views', __dirname + '/web/');

app.use(favicon(`${__dirname}/resources/favicon.ico`));
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * CORS
 */
app.use(cors());

/**
 * Statics
 */
app.use('/resources', express.static(__dirname + '/resources'));

app.get('/', (req, res) => {
	res.render('index');
});

/**
 * Routing
 */
const db = (<any>global).db;
const files = db.collection('drive_files');
app.get('/:id', async (req, res) => {
	const file = await files.findOne({_id: req.params.id});
	res.send(file.data);
});

/**
 * Create server
 */
const server = config.https.enable ?
	https.createServer({
		key: fs.readFileSync(config.https.keyPath),
		cert: fs.readFileSync(config.https.certPath)
	}, app) :
	http.createServer(app);

/**
 * Server listen
 */
server.listen(config.bindPort, config.bindIp, () => {
	const h = server.address().address;
	const p = server.address().port;

	console.log(
		`\u001b[1;32m${worker.id} is now listening at ${h}:${p}\u001b[0m`);
});
