// server

import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as favicon from 'serve-favicon';
import * as cors from 'cors';
import * as mongodb from 'mongodb';
import * as gm from 'gm';

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

async function send(req: express.Request, res: express.Response): Promise<any> {
	const file = await files.findOne({_id: new mongodb.ObjectID(req.params.id)});

	if (file === null) {
		res.status(404).sendFile(__dirname + '/resources/dummy.png');
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
}

async function thumbnail(req: express.Request, res: express.Response): Promise<any> {
	const file = await files.findOne({_id: new mongodb.ObjectID(req.params.id)});

	if (file === null) {
		res.status(404).sendFile(__dirname + '/resources/dummy.png');
		return;
	}

	if (!/^image\/.*$/.test(file.type)) {
		res.sendFile(__dirname + '/resources/dummy.png');
		return;
	}

	let g = gm(file.data.buffer);

	if (req.query.size) {
		g = g.resize(req.query.size, req.query.size);
	}

	g
	.compress('jpeg')
	.quality(req.query.quality || 80)
	.toBuffer('jpeg', (err, img) => {
		if (err !== undefined && err !== null) {
			console.error(err);
			res.sendStatus(500);
			return;
		}

		res.header('Content-Type', 'image/jpeg');
		res.send(img);
	});
}

app.get('/:id/:name', async (req, res): Promise<void> => {
	if (req.query.thumbnail !== undefined) {
		thumbnail(req, res);
	} else {
		send(req, res);
	}
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
