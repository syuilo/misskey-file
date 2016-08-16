export interface IConfig {
	maintainer: string;
	port: number;
	https: {
		enable: boolean;
		key: string;
		cert: string;
		ca: string;
	};
	mongodb: {
		host: string;
		port: number;
		db: string;
		user: string;
		pass: string;
	};
}
