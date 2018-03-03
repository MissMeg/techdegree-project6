'use strict';

//use NodeJS's built-in file r/w
const fs = require("fs");
//set the date for the file name - returns 1/12/18
let date = new Date(Date.now()).toLocaleDateString('en-US', { year: '2-digit', month: 'numeric', day: 'numeric' });
// change date to 1-12-18 since / cannot be used in a file name
let dateString = date.toString().split('/').join('-');
//require csv to create the csv file of the scraped data
const csv = require("fast-csv");
//create the csv file in the correct folder and with the correct date name
const ws = fs.createWriteStream(`data/${dateString}.csv`);
//use NodeJS's built-in http.get method for getting the page info
const http = require("http");
//use Cheerio for the scraping
const cheerio = require("cheerio");
//create an array to hold the scraped data
const data = [];


//check if there is a data folder and create one if there is not
const checkDir = () => {
    if (!fs.existsSync('data')){
        fs.mkdirSync('data');
    }
};

//call the function
checkDir();

//send an error message to the console and log it to the scraper-error.log file
const errMessage = (err) => {
    console.error(err.message);
    let date = new Date();
    let currentDate = date.toDateString();
    fs.appendFileSync('scraper-error.log', `${currentDate} ${err}`);
}

//get the attributes from the page
const getAttr = (body) => {
    //load the body into cheerio
    let $ = cheerio.load(body);
    //start the counter
    let counter = 0;
    //for each product, get the t-shirt's href link
    $('.products li a').each((i, elem) => {
        let href = $(elem).attr('href');
        //set the url for each tshirt
        let url = `http://shirts4mike.com/${href}`;
        //get the info from each tshirt's individual page
        http.get(url, (res) => {
            //get the page status
            let {statusCode} = res;
            let body = '';
            let err;
            //count up for each iteration = know when the async program is done to then write the file
            counter++;
            //create error if the status is not 200
            if (statusCode !== 200) {
                err = new Error(`Request Failed. Status Code: ${statusCode}`);
                if (statusCode === 404) {
                    err = new Error(`Request Failed. Status Code: ${statusCode} Cannot connect to Mike's Shirts`);
                }
            } else {
                //place the data into the body as a string
                res.on('data', data => {
                    body += data.toString();
                });
                res.on('end', () => {
                    //load each page into cheerio
                    let $ = cheerio.load(body);
                    //get the tshirt price
                    let price = $('.price').text();
                    //get the tshirt title
                    let title = $('.shirt-details h1').text();
                    //get rid of the price from the title string
                    title = title.split(`${price} `)[1];
                    //get the shirturl for the image
                    let shirtURL = $('.shirt-picture img').attr('src');
                    //set the url for the image
                    let imgURL = `http://shirts4mike.com/${shirtURL}`;
                    //get the date
                    let time = new Date();
                    //set as time only from the date 
                    time = time.toLocaleTimeString('en-US');
                    //push the data into the data array
                    data.push({Title: title, Price: price, ImgURL: imgURL, URL: url, Time: time});
                    //if all 8 shirts have been added to the array, then write the data file
                    if (counter === 8) {
                        csv.write(data, {headers: true}).pipe(ws);
                    }
                });
            }
            //if there was an error, call the error function
            if (err) {
                errMessage(err);
                console.log(err);
            }
        });
    });
}

//get data through the product page
const getData = () => {
    //get data from the url
    http.get('http://shirts4mike.com/shirts.php', (res) => {
        //set the status code here
        let {statusCode} = res;
        //set the body and err
        let body = '';
        let err;
        //if the statuscode is not 200, then create an error
        if (statusCode !== 200) {
            err = new Error(`Request Failed. Status Code: ${statusCode}`);
            if (statusCode === 404) {
                err = new Error(`Request Failed. Status Code: ${statusCode} Cannot connect to Mike's Shirts`);
            }
        } else {
            //place the data into the body string
            res.on('data', data => {
                body += data.toString();
            });
            //use the gathered data/body to get the necessary info using the getAttr function
            res.on('end', () => {
                getAttr(body);
            });
        }
        //if this function through an error, then call the error function
        if (err) {
            errMessage(err);
            console.log(err);
        }
    });
}

//call the function
getData();
