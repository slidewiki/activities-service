/* This module is used for configurating the mongodb connection*/
'use strict';

const co = require('./common');

let host = 'localhost';
//read mongo URL from /etc/hosts
const fs = require('fs');
try {
  const lines = fs.readFileSync('/etc/hosts').toString().split('\n');
  lines.filter((line) => line.includes('mongodb')).forEach((line) => {
    const entries = line.split(' ');
    host = entries[entries.length - 1];
    console.log('Using ' + host + ' as database host.');
  });
} catch (e) {
  console.log('Exception: Windows or no read rights to read /etc/hosts (bad)');
}
//read mongo URL from ENV
host = (!co.isEmpty(process.env.DATABASE_URL)) ? process.env.DATABASE_URL : host;
if(host !== 'localhost')
  console.log('Using ' + host + ' as database host.');

let port = 27017;
//read mongo port from ENV
if (!co.isEmpty(process.env.DATABASE_PORT)){
  port = process.env.DATABASE_PORT;
  console.log('Using ' + port + ' as database port.');
}

let JWTSerial = '69aac7f95a9152cd4ae7667c80557c284e413d748cca4c5715b3f02020a5ae1b';
if (!co.isEmpty(process.env.JWT_SERIAL)){
  JWTSerial = process.env.JWT_SERIAL;
}

let slidewikiDbName = 'slidewiki';
if (process.env.NODE_ENV === 'test') {
  slidewikiDbName = 'slidewiki_test';
}


module.exports = {

  MongoDB: {
    PORT: port,
    HOST: host,
    NS: 'local',
    SLIDEWIKIDATABASE: slidewikiDbName
  },

  JWT: {
    SERIAL: JWTSerial,
    HEADER: '----jwt----',
    ALGORITHM:  'HS512'
  },

  // TODO setup defaults / env variables for the LRS connection parameters

  /*
  LRS: {
    endpoint: 'http://localhost/data/xAPI/',
    username: '4a329c5713654db2a6aa41260af684e3dc31ee6d',
    password: '883244eb455a9666233f6c0dc1cdda15a0ac2dd7',
    allowFail: false,
  },
  */

  /*
  LRS: {
    endpoint: 'http://localhost:8081/data/xAPI',
    username: 'a9a90415ab9aaa531efb5ca9ee5e1998901b4edb',
    password: '8e0f88a9a40efa60e3dd7aa4dd5eee3c79855594',
    allowFail: false,
  },
  */

  LRS: {
    endpoint: 'https://learninglocker.experimental.slidewiki.org/data/xAPI',
    username: '65314590b80412fd6c8bc081c3b2f9cf2e2d62c1',
    password: 'f49decea58e1cd8f1dd10e168fc74631c980450f',
    allowFail: false,
  },

};
