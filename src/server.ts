// server

import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as favicon from 'serve-favicon';
import * as cors from 'cors';
import * as mongodb from 'mongodb';

import config from './config';

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
		key: fs.readFileSync(config.https.key),
		cert: fs.readFileSync(config.https.cert),
		ca: fs.readFileSync(config.https.ca)
	}, app) :
	http.createServer(app);

/**
 * Server listen
 */
server.listen(config.port, () => {
	process.send('listening');
});
