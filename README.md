# node-netsuite
NetSuite REST API and SuiteQL helper module for node


# install

```
npm install wb6/node-netsuite
```

# usage

```node
const NetSuite = require('node-netsuite');
require('dotenv').config();


const ns_options = {
	netsuite_account: process.env.NETSUITE_ACCOUNT ,
	netsuite_consumer_key: process.env.NETSUITE_CONSUMER_KEY ,
	netsuite_consumer_secret: process.env.NETSUITE_CONSUMER_SECRET ,
	netsuite_token_id: process.env.NETSUITE_TOKEN_ID ,
	netsuite_token_secret: process.env.NETSUITE_TOKEN_SECRET ,
};


(async () => {

	let ns = new NetSuite(ns_options);

	let sales_order = await ns.get('/salesOrder/12345');
	console.log(sales_order);

	let suiteql_result = await ns.suiteql(`SELECT count(*) 
		FROM transaction
		`);

	console.log(suiteql_result);



	await ns.patch('/salesOrder/12345','{"custbodyparameter":true}');


})();
```
