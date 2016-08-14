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
import * as mongodb from 'mongodb';

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

app.get('/default-avatar.jpg', (req, res) => {
	res.sendFile(__dirname + '/resources/avatar.jpg');
});

/**
 * Routing
 */
const db = <mongodb.Db>(<any>global).db;
const files = db.collection('drive_files');

app.get('/:id/:name', async (req, res): Promise<void> => {
	const file = await files.findOne({_id: new mongodb.ObjectID(req.params.id)});

	if (file === null) {
		res.status(404).sendFile(__dirname + '/resources/not-found.png');
		return;
	}

	res.header({
		'Content-Type': file.type,
		'Content-Length': file.datasize
	});

	if (req.query.download) {
		res.header('Content-Disposition', 'attachment');
	}

	res.send(file.data.buffer);
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
