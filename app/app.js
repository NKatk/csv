const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const csvToJson = require('csvtojson');
const stringify = require('csv-stringify');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const config = require('config');

//config
const PORT = config.get('express.port');
const MULTERDIR = config.get('multer');
const URLMONGO = config.get('mongoose.url');
const SETTMONGO = config.get('mongoose.settings');
const SchemaData =  new Schema({
    UserName: String,
    FirstName: String,
    LastName: String,
    Age: Number
}, {versionKey: false});

const upload = multer(MULTERDIR);
const app = express();
mongoose.connect(URLMONGO, SETTMONGO, (err)=>{
    if (err) return console.error("DB didn't connect, Error: ", err.message);
    console.log('DB connected.');
});
const UsersCSV = mongoose.model("UsersCSV", SchemaData);


app.use(express.static(path.join(__dirname + '/public/')));

app.get('/', (req, res)=>{
    res.sendFile('index.html');
});

//получение на сайт csv
app.post('/api/takecsv', upload.single('filecsv'), async(req, res)=>{
    if (!req.file.originalname.match(/\.(csv)$/)) {
        fs.unlink(req.file.path, (err)=>{
            if (err) console.error('Error', err);
        });
        return res.status(415).json({error: 'Only csv files are allowed!'});
    }

    const data = await csvToJson().fromFile(req.file.path);

    UsersCSV.insertMany(data, (err, result)=>{
        if(err){
            console.error(err);
        }
        fs.unlink(req.file.path, (err)=>{
            if (err) console.error('Error', err);
        });
        res.status(200).json({success: "Файл загружен"});
    });
});

//отправка json на клиент
app.post('/api/takejson', (req, res)=>{
    UsersCSV.find({}, (err, result) => {
        if (err) return console.log(err);
        res.json(result).status(200);
    })
});

//отправка csv для сохранения
app.post('/api/downloadcsv', (req, res)=>{
    UsersCSV.find({}, (err, result) => {
        if (err) return console.log(err);

        stringify(result, { header: true, columns: [ 'UserName', 'FirstName', 'LastName', 'Age' ] }, (err, output)=>{
            if(err) return console.error(err);
            res.end(output).status(200);
        })
    });
});

app.get('*', (req, res)=>{
    res.sendFile('./public/index.html');
});

app.listen(PORT, (err)=>{
    if (err) throw err;
    console.log(`Start server on port ${PORT}`);
});