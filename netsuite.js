const crypto = require('crypto');
const https = require('https');

String.prototype.shuffle = function () {
	var a = this.split(""),
	n = a.length;

	for(var i = n - 1; i > 0; i--) {
		var j = Math.floor(Math.random() * (i + 1));
		var tmp = a[i];
		a[i] = a[j];
		a[j] = tmp;
	}
	return a.join("");
}

Object.prototype.asort = function () {
	return Object.keys(this).sort().reduce(
	(obj, key) => { 
		obj[key] = this[key]; 
		return obj;
		}, 
		{}
	);
}

module.exports = class NetSuite {
	constructor(options){
		this.baseUrl = 'https://' + options.netsuite_account + '.suitetalk.api.netsuite.com/services/rest/record/v1';
		this.baseUrlSuiteql = 'https://' + options.netsuite_account + '.suitetalk.api.netsuite.com/services/rest/query/v1';
		this.signatureMethod = 'HMAC-SHA256';
		this.version = '1.0';
		this.account = options.netsuite_account;
		this.consumerKey = options.netsuite_consumer_key;
		this.tokenId = options.netsuite_token_id;
		this.consumerSecret = options.netsuite_consumer_secret;
		this.tokenSecret = options.netsuite_token_secret;
		this.realm = options.netsuite_account.replace("-","_").toLocaleUpperCase();
	}

	_sign(httpMethod, path='', parameters={}){

		let base_url = this.baseUrl;
		if(path == '/suiteql' ) base_url = this.baseUrlSuiteql;

		httpMethod = httpMethod.toLocaleUpperCase();
		this.nonce = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".shuffle().slice(0,20);
		this.timestamp = Math.floor(new Date().getTime() / 1000);

		let oauth_params = {
			"oauth_consumer_key" 	 	: this.consumerKey,
			"oauth_nonce" 	 			: this.nonce,
			"oauth_signature_method"  	: this.signatureMethod,
			"oauth_timestamp" 	 		: this.timestamp,
			"oauth_token" 	 			: this.tokenId,
			"oauth_version" 	 		: this.version,
		};


		parameters = parameters.asort();
		let queryParameters_url = Object.keys(parameters).map( (k) =>{ return k+'='+encodeURIComponent(parameters[k]) }).join("&") ;
		let url = base_url + path + ( queryParameters_url.length ? '?'+queryParameters_url  : '');
		let all_parameters = ({ ...oauth_params, ...parameters  }).asort();
		let all_parameters_string = Object.keys(all_parameters).map( (k) =>{ return k+'='+encodeURIComponent(all_parameters[k]).replace("%7E","~") }).join("&") ;
		let base_string = httpMethod + '&' + encodeURIComponent(base_url + path) + "&" + encodeURIComponent(all_parameters_string);
		let key = this.consumerSecret + '&' + this.tokenSecret;
		let signature = encodeURIComponent(Buffer.from(crypto.createHmac('sha256', key).update(base_string).digest('binary'),'latin1').toString('base64')); 
		let header = {
			Authorization: `OAuth realm="${this.realm}",oauth_consumer_key="${this.consumerKey}",oauth_token="${this.tokenId}",oauth_signature_method="HMAC-SHA256",oauth_timestamp="${this.timestamp}",oauth_nonce="${this.nonce}",oauth_version="${this.version}",oauth_signature="${signature}"`,
			Cookie: "NS_ROUTING_VERSION=LAGGING",
			"Content-Type" : "application/json"
		};

		return {url,header}
	}

	rest(httpMethod='GET', path, parameters={},data){

		let p = this._sign(httpMethod, path, parameters);


		// let _url = new URL(p.url);

		const options = {
			// host: _url.hostname,
			// port: 443,
			// protocol : _url.protocol,
			// path: _url.pathname,
			method: httpMethod,
			headers: p.header
		};

		let content='';

		return new Promise(function(resolve, reject) {

			if( typeof path == 'undefined') return reject('path missing');
			if( httpMethod == 'POST' && typeof data == 'undefined' ) return reject('data missing');

			const req = https.request(p.url,options, (res) => {
				
				res.setEncoding('utf8');
				res.on('data', (chunk) => {
					content += chunk;
				});
				res.on('end', () => {
					return resolve(content);
				});
			});


			req.on('error', error => {
				return reject(error);
			});

			if(typeof data !== 'undefined')
				req.write(data);
			req.end();
		})
	}

	suiteql(q, parameters={}){

		let httpMethod = 'POST';
		let path = '/suiteql';
		let p = this._sign(httpMethod, path, parameters);
		let data = q.replace(/\r?\n|\r/g, " ").trim();
		p.header.Prefer= 'transient';


		// console.log(p);
		// process.exit(0);

		const options = {
			// host: _url.hostname,
			// port: 443,
			// protocol : _url.protocol,
			// path: _url.pathname,
			method: httpMethod,
			headers: p.header
		};

		let content='';

		return new Promise(function(resolve, reject) {

			if( typeof q == 'undefined') return reject('query missing');

			const req = https.request(p.url,options, (res) => {
				// console.log(`STATUS: ${res.statusCode}`);
				// console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
				
				res.setEncoding('utf8');
				res.on('data', (chunk) => {
					// console.log(`BODY: ${chunk}`);
					content += chunk;
				});
				res.on('end', () => {
					// console.log('No more data in response.');
					return resolve(content);
				});
			});


			req.on('error', error => {
				return reject(error);
			});

			req.write( JSON.stringify({q:data}) );
			req.end();
		})
	}

	get(path,parameters={}){
		return this.rest('GET',path,parameters);
	}

	post(path,data){
		return this.rest('POST',path,{},data);
	}
	patch(path,data){
		return this.rest('PATCH',path,{},data);
	}
}