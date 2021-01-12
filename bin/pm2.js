#! /usr/bin/env node

const { Cli } = require('../dist/cli/cli');

process.title = 'echo-server';

(new Cli).start();
