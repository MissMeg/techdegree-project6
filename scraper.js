'use strict';

const fs = require("fs");
let date = new Date(Date.now()).toLocaleDateString('en-US', { year: '2-digit', month: 'numeric', day: 'numeric' });
let dateString = date.toString().split('/').join('-');
const csv = require("fast-csv");
const ws = fs.createWriteStream(`data/${dateString}.csv`);
const http = require("http");
const cheerio = require("cheerio");
const data = [];

const checkDir = () => {
    if (!fs.existsSync('data')){
        fs.mkdirSync('data');
    }
};

checkDir();

const errMessage = (err) => {
    console.error(err.message);
    let date = new Date();
    let currentDate = date.toDateString();
    fs.appendFileSync('scraper-error.log', `${currentDate} ${err}`);
}

const getAttr = (body) => {
    let $ = cheerio.load(body);
    let counter = 0;
    $('.products li a').each((i, elem) => {
        let href = $(elem).attr('href');
        let url = `http://shirts4mike.com/${href}`;
        http.get(url, (res) => {
            let {statusCode} = res;
            let body = '';
            let err;
            counter++;
            if (statusCode !== 200) {
                err = new Error(`Request Failed. Status Code: ${statusCode}`);
                if (statusCode === 404) {
                    err = new Error(`Request Failed. Status Code: ${statusCode} Cannot connect to Mike's Shirts`);
                }
            } else {
                res.on('data', data => {
                    body += data.toString();
                });
                res.on('end', () => {
                    let $ = cheerio.load(body);
                    let price = $('.price').text();
                    let title = $('.shirt-details h1').text();
                    title = title.split(`${price} `)[1];
                    let shirtURL = $('.shirt-picture img').attr('src');
                    let imgURL = `http://shirts4mike.com/${shirtURL}`;
                    let time = new Date();
                    time = time.toLocaleTimeString('en-US');
                    data.push({Title: title, Price: price, ImgURL: imgURL, URL: url, Time: time});
                    if (counter === 8) {
                        csv.write(data, {headers: true}).pipe(ws);
                    }
                });
            }
            if (err) {
                errMessage(err);
            }
        });
    });
}

const getData = () => {
    http.get('http://shirts4mike.com/shirts.php', (res) => {
        let {statusCode} = res;
        let body = '';
        let err;
        if (statusCode !== 200) {
            err = new Error(`Request Failed. Status Code: ${statusCode}`);
            if (statusCode === 404) {
                err = new Error(`Request Failed. Status Code: ${statusCode} Cannot connect to Mike's Shirts`);
            }
        } else {
            res.on('data', data => {
                body += data.toString();
            });
            res.on('end', () => {
                getAttr(body);
            });
        }
        if (err) {
            errMessage(err);
        }
    });
}

getData();
