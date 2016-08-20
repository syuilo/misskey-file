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

const env = process.env.NODE_ENV;
const isProduction = env === 'production';
const isDebug = !isProduction;

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
	const file = fs.readFileSync(__dirname + '/resources/avatar.jpg');
	send(file, 'image/jpeg', req, res);
});

/**
 * Routing
 */
const db = <mongodb.Db>(<any>global).db;
const files = db.collection('drive_files');

async function raw(data: Buffer, type: string, download: boolean, res: express.Response): Promise<any> {
	if (isDebug && !download) {
		res.sendFile(__dirname + '/resources/bad-egg.png');
		return;
	}

	res.header('Content-Type', type);

	if (download) {
		res.header('Content-Disposition', 'attachment');
	}

	res.send(data);
}

async function thumbnail(data: Buffer, type: string, resize: number, quality: number, res: express.Response): Promise<any> {

	if (!/^image\/.*$/.test(type)) {
		res.sendFile(__dirname + '/resources/dummy.png');
		return;
	}

	let g = gm(data);

	if (resize) {
		g = g.resize(resize, resize);
	}

	g
	.compress('jpeg')
	.quality(quality || 80)
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

function send(data: Buffer, type: string, req: express.Request, res: express.Response): void {
	if (req.query.thumbnail !== undefined) {
		thumbnail(data, type, req.query.size, req.query.quality, res);
	} else {
		raw(data, type, req.query.download !== undefined, res);
	}
}

app.get('/:id', async (req, res): Promise<void> => {
	const file = await files.findOne({_id: new mongodb.ObjectID(req.params.id)});

	if (file === null) {
		res.status(404).sendFile(__dirname + '/resources/dummy.png');
		return;
	}

	send(file.data.buffer, file.type, req, res);
});

app.get('/:id/:name', async (req, res): Promise<void> => {
	const file = await files.findOne({_id: new mongodb.ObjectID(req.params.id)});

	if (file === null) {
		res.status(404).sendFile(__dirname + '/resources/dummy.png');
		return;
	}

	send(file.data.buffer, file.type, req, res);
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
