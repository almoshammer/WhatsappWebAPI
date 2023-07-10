//@ts-check
const path = require('path');
const ejs = require('ejs');
const logger = require('morgan');
const express = require('express');

// import path from 'path'
// import ejs from 'ejs'
// import logger from 'morgan'
// import express from 'express'
// import { fileURLToPath } from 'url'

/**
 *
 * @param {object} app
 */

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);
module.exports = function (app) {

    app.use('/', express.static(path.join(process.cwd(), '.')));
    app.set('views', './src/views')
    app.use(express.static('./src/assets'));
    app.use(express.static('./src/cache'));
    app.use(express.static('./src'));
    app.use(express.static('.'));
    app.set('port', process.env.PORT || 9000);
    app.set('view engine', 'html');
    app.engine('html', ejs.renderFile);

    // @ts-ignore
    app.use(express.json({ extended: true, limit: '512mb' }));
    app.use(express.urlencoded({ extended: false }));
    //app.use(connectLiveReload());
    // app.use(express.static('/'));
    app.use(logger('dev'));
    //app.use(cors());
    //app.use('/',router);
};
