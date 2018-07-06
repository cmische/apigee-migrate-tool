/*jslint node: true */
var request = require('request');
var apigee = require('../config.js');
var async = require('async');
var apps;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};
//require('request').debug = true
module.exports = function(grunt) {
	'use strict';

	grunt.registerMultiTask('importKeys', 'Import all app keys to org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_count =0;
		var files;
		url = url + "/v1/organizations/" + org + "/developers/";
		var done = this.async();
		var opts = {flatten: false};
		//var f = grunt.option('src');
		var f = 'data/apps/*/*';
		files = grunt.file.expand(opts,f);

		files.forEach(function(filepath) {
			var folders = filepath.split("/");
			var dev = folders[folders.length - 2];
			var app = grunt.file.readJSON(filepath);
			var credentials = app.credentials;
			for (var i = 0; i < credentials.length; i++) {
				var cKey = credentials[i].consumerKey;
				var cSecret = credentials[i].consumerSecret;
				var products = credentials[i].apiProducts;
				var key_payload = "<CredentialRequest><ConsumerKey>" + cKey + "</ConsumerKey><ConsumerSecret>" + cSecret + "</ConsumerSecret><Attributes></Attributes></CredentialRequest>";
				grunt.verbose.writeln(key_payload);
				var products_payload = {};
        var testKey = "" + cKey + "";

				var prods = [];
        var stageprods=[
          "Affiliate Services Protected - Stage",
          "Affiliate Services - Stage",
          "Public Services - Manual",
          "Public Services - Stage",
          "Public Services - Stage - Reviews",
          "Internal Services - Reviews",
          "Internal Services"
        ]
        for (var j = 0; j < products.length; j++) {
               if (stageprods.includes(products[j].apiproduct)) {
                 grunt.verbose.writeln("\nPushing product " + products[j].apiproduct + " to array.\n");
                 prods.push(products[j].apiproduct);
               }
        };

        grunt.verbose.writeln("\nProds are " + prods + "\n");
				products_payload['apiProducts'] = prods;
        grunt.verbose.writeln("\npassedckey is; " + cKey + "\n");
				var create_key_url = url + dev + "/apps/" + app.name + "/keys/";

				request.post({
				  url:     create_key_url + "create",
				  headers: {'Content-Type' : 'application/xml'},
				  body:    key_payload,
				  auth: {
    				    user: userid,
    				    pass: passwd,
    				    sendImmediately: true
                                  }
				}, function(error, response, body){
				  var status = 999;
				  if (response)
				  	status = response.statusCode;
				  grunt.verbose.writeln('Resp [' + status + '] for ' + dev + ' - ' + create_key_url + ' -> ' + body);
				  if (error || status!=201)
				  	grunt.verbose.error('ERROR Resp [' + status + '] for ' + dev + ' - ' + create_key_url + ' -> ' + body);
				});

				grunt.verbose.writeln("\nckey is; " + cKey + "\n");
				grunt.verbose.writeln("\ntestkey is; " + testKey + "\n");
				//urlencode the key
				var encodedcKey = encodeURI(cKey);
				grunt.verbose.writeln(create_key_url+ encodedcKey);
				grunt.verbose.writeln(JSON.stringify(products_payload));
 				request.post({
				  url:     create_key_url + encodedcKey,
				  headers: {'Content-Type' : 'application/json'},
				  body:    JSON.stringify(products_payload),
				  auth: {
    				    user: userid,
    				    pass: passwd,
    				    sendImmediately: true
                                  }
				}, function(error, response, body){
				  var status = 999;
				  if (response)
				  	status = response.statusCode;
				  grunt.verbose.writeln('Resp [' + status + '] for ' + dev + ' - ' + app.name + ' - ' + JSON.stringify(products_payload) + ' - ' + cKey + ' product assignment -> ' + body);
				  if (error || status!=200)
				  	grunt.verbose.error('ERROR Resp [' + status + '] for ' + dev + ' - ' + app.name + ' - ' + JSON.stringify(products_payload) + ' - ' + cKey + ' product assignment -> ' + body);
				});

				var done_cnt =0;
				for (var k = 0; k < prods.length; k++) {
				    	var approve_key_url = create_key_url + cKey + "/apiproducts/" + prods[k] + "?action=approve";
				        grunt.verbose.writeln("Approve products for key - " + approve_key_url);
	 				request.post({
            url: approve_key_url,
            auth: {
                user: userid,
                pass: passwd,
              sendImmediately: true
                  }
            }, function(error, response, body){
					    var status = 999;
					    if (response)
					  	  status = response.statusCode;
					    grunt.verbose.writeln('Resp [' + status + '] for ' + dev + ' - ' + app.name + ' - ' + JSON.stringify(products_payload) + ' - ' + cKey + ' - ' + approve_key_url + ' -> ' + body);
					    if (error || status!=204)
						  grunt.verbose.error('ERROR Resp [' + status + '] for ' + dev + ' - ' + app.name + ' - ' +  JSON.stringify(products_payload) + ' - ' + cKey + ' - ' + approve_key_url + ' -> ' + body);
					    done_cnt++;
					});
				}
				grunt.verbose.writeln("Keys migrated for app " + app.name);
			};
		});
	});

	grunt.registerMultiTask('deleteKeys', 'Delete all app keys from org ' + apigee.to.org + " [" + apigee.to.version + "]", function() {
		var url = apigee.to.url;
		var org = apigee.to.org;
		var userid = apigee.to.userid;
		var passwd = apigee.to.passwd;
		var done_flag =false;
		var file_count = 0;
		var files;
		url = url + "/v1/organizations/" + org + "/developers/";
		var done = this.async();
		var opts = {flatten: false};
		var f = grunt.option('src');
		if (f)
		{
			grunt.verbose.writeln('src pattern = ' + f);
			files = grunt.file.expand(opts,f);
		}
		else
		{
			files = this.filesSrc;
		}
		var done = this.async();

		files.forEach(function(filepath) {
			var folders = filepath.split("/");
			var dev = folders[folders.length - 2];
			var app = grunt.file.readJSON(filepath);
			var credentials = app.credentials;
			for (var i = 0; i < credentials.length; i++) {
				var cKey = credentials[i].consumerKey;
				//urlencode the key
				cKey = encodeURI(cKey);
				var delete_key_url = url + dev + "/apps/" + app.name + "/keys/" + cKey;
				grunt.verbose.writeln(delete_key_url);
				request.del(delete_key_url , function(error, response, body){
				  var status = 999;
				  if (response)
				  	status = response.statusCode;
				  grunt.verbose.writeln('Resp [' + status + '] for ' + this.cKey + ' deletion -> ' + body);
				  if (error || status!=200)
				  	grunt.verbose.error('ERROR Resp [' + status + '] for ' + this.cKey + ' deletion -> ' + body);
				  if (i == credentials.length)
				  	file_count++;
				  if ((file_count == files.length) && (i == credentials.length))
				  	done();
				}.bind( {cKey: cKey}) ).auth(userid, passwd, true);
			};
		});
	});

};
