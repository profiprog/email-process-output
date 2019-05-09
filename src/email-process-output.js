#!/usr/bin/env node
"use strict";

const spawn = require('child_process').spawn;
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

let escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
let escape = str => str.replace(/[&<>]/g, c => escapeMap[c]);

let colorMap = {
  '0;30': 'black',          '30': 'black',           '1;30': 'darkgray',     
  '0;31': 'red',            '31': 'red',             '1;31': 'orangered',     
  '0;32': 'green',          '32': 'green',           '1;32': 'lightgreen',   
  '0;33': 'orange',         '33': 'orange',          '1;33': 'yellow',        
  '0;34': 'blue',           '34': 'blue',            '1;34': 'lightblue',    
  '0;35': 'rebeccapurple',  '35': 'rebeccapurple',   '1;35': 'purple',  
  '0;36': 'cyan',           '36': 'cyan',            '1;36': 'lightcyan',    
  '0;37': 'lightgray',      '37': 'lightgray',       '1;37': 'white',         
  '0': null
};
let tag = code => {
	let color = colorMap[code];
	if (color === null) return [ '', '' ];
	if (color === undefined) return [ `<span style="color:cadetblue;" title="unknown code: ${code}">`, '</span>' ];
	return [ `<span style="color:${color};">`, '</span>' ];
};
let closeTag = '';
let html = line => {
	return escape(line).split(/\x1b/g).map((t,i) => {
		if (i) {
			let m = t.match(/\[([\d;]+)m/),
			    tags = tag(m ? m[1] : '?');

			t = closeTag + tags[0] + (m ? t.substr(m[0].length) : t);
			closeTag = tags[1];
		}
		return t.replace(/\t/g, '        ').replace(/  /g, "&nbsp; ");
	}).join('');
};

let echo = (out, stdout) => data => {
	let str = data.toString();
	let lines = str.split(/\r?\n/g);
	if (lines.length > 1 && lines[lines.length - 1].length === 0) lines.pop();
	lines.map(_=> ({raw:_,html:html(_)})).forEach(_ => out(_.html+"<br/>\n") && stdout(_.raw));
};

function runProc(out, cmd, ...args) {
	out(`<p style="background-color: #313131;
color: darkgray;
font-family: monospace;
font-size: 8pt;
padding: 6px;">`);
	return new Promise((resolve, reject) => {
		let prc = spawn(cmd,  args);
		prc.stdout.setEncoding('utf8');
		prc.stdout.registerHandler('data', echo(out, console.log));
		prc.stderr.registerHandler('data', echo(out, console.error));
		prc.registerHandler('error', echo(out, console.error));
		prc.registerHandler('close', function (code) {
			out('</p>');
			if (code) reject(code);
			else resolve();
		});
	});
}

module.exports = runProc;

let stdout = log => new Promise(resolve => { console.log(log);  resolve(); });

let opts = {
	username: "\x1b[0;33musername\x1b[0m - GMail account",
	password: "\x1b[0;33mpass-or-file\x1b[0m - password or filepath cotaining password",
	config: "\x1b[0;33mconfig-file\x1b[0m - json file having default options",
	from: "\x1b[0;33msender\x1b[0m - like \"User Name\" <user.name@gmail.com>",
	to: "\x1b[0;33mrecipients\x1b[0m - comma separated list",
	cc: "\x1b[0;33mrecipients\x1b[0m - comma separated list",
	bcc: "\x1b[0;33mhidden-recipients\x1b[0m - comma separated list",
	replyTo: "\x1b[0;33mreply-adderss\x1b[0m - like \"Cron\" <automat@gmail.com>",
	subject: "\x1b[0;33msubject\x1b[0m - default value is command with args",
	template: "\x1b[0;33mtemplate\x1b[0m - \"prefix HTML code \x1b[35m{}\x1b[0m suffix HTML code\"",
	ignore: "\x1b[0;33msuccess\x1b[0m|\x1b[0;33mempty\x1b[0m - do not send email if process not exited with error code"
		+ " or if process does not produce any output",
	echo: "echo stdout and stderr (disable quite mode)"
};
let conf = {};
function email(log) {
	return new Promise((resolve, reject) => {
		let mailerOpts = {
			service: "gmail",
			auth: { user: conf.username || conf.from, pass: conf.password }
		};
		nodemailer.createTransport(mailerOpts).sendMail({
			from: conf.from || mailerOpts.auth.user,
			to: conf.to || mailerOpts.auth.user,
			cc: conf.cc,
			bcc: conf.bcc,
			replyTo: conf.replyTo || conf.from || mailerOpts.auth.user,
			subject: conf.subject,
			html: conf.template ? conf.template.replace('{}', log) : log
		}, function (error, info) {
			if (error) reject(error);
			else resolve('Email sent: ' + info.response);
		});
	});
}

function fail(msg, exitCode = 1) {
	console.error("Error: " + msg);
	process.exit(exitCode);
}

let helpOpts = [ '--help', '-h', '-?' ];
const optsSep = '\n    ';
function printHelp() {
	console.log("Usage:", `\x1b[1;37m${path.basename(process.argv[1])}\x1b[0m`, "[OPTONS] COMMAND [...ARGS]");
	console.log("Options:" + optsSep + Object.keys(opts).map(param => `\x1b[1;37m--${param}\x1b[0m ${opts[param]||'?'}`).join(optsSep));
	process.exit(0);
}

if (require.main === module) {
	let cmd = process.argv.slice(2);
	let action = stdout;
	let echo = false;
	let ignore = '';
	while (cmd.length && cmd[0].charAt(0) === '-') {
		if (cmd[0] === '--') { cmd.shift(); break; }
		if (helpOpts.indexOf(cmd[0]) >= 0) printHelp();
		let prop = cmd[0].substr(2);
		if (prop === 'echo') { cmd.shift(); echo = true; continue; }
		if (prop === 'ignore') {
			if (['success','empty'].indexOf(ignore = cmd[1]) < 0)
				fail(`Invalid argument \x1b[31m${cmd[1]}\x1b[0m of option --ignore!`);
			cmd.splice(0, 2);
			continue;
		}
		if (opts.hasOwnProperty(prop)) {
			conf[prop] = cmd.splice(0, 2)[1];
			action = email;
			continue;
		}
		fail("Unknowm option " + cmd[0], 404);
	}
	if (conf.config) {
		if (!fs.existsSync(conf.config)) fail("Not found confing file: " + conf.config, 404);
		let jsonConfig = require(path.resolve(conf.config));
		for (let param in jsonConfig) if (jsonConfig.hasOwnProperty(param)) {
			if (!opts.hasOwnProperty(param)) {
				if (echo) console.warn(`Unknown property .${param} in config file: ${conf.config}. (is ignored)`);
			}
			if (!conf.hasOwnProperty(param)) {
				conf[param] = jsonConfig[param]
			}
		}
	}
	if (conf.subject === undefined) conf.subject = cmd.map(_ => _.replace(/ /g, '\\ ')).join(" ");
	if (conf.password && fs.existsSync(conf.password)) conf.password = fs.readFileSync(conf.password, "utf8").toString();
	let result = [];
	let out = line => { result.push(line); return echo; };
	runProc(out, ...cmd).catch(_ => _).then(exitCode => {
		if (!exitCode && ignore === 'success') return;
		if (result.length === 2 && ignore === 'empty') return;
		action(result.join('')).catch(e => {
			console.error(e);
			process.exit(exitCode || 12);
		}).then(_ => {
			process.exit(exitCode);
		});
	});
}
