require('dotenv').load();
const linebot = require('linebot');
const firebase = require("firebase");
const express = require('express');
//星座功能使用到的套件
const request = require("request");
const dateFormat = require('dateformat');
const cheerio = require("cheerio");

const bot = linebot({
    channelId: process.env.CHANNEL_ID,
    channelSecret: process.env.CHANNEL_SECRET,
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
});

firebase.initializeApp({
    apiKey: process.env.FIREBASE_apiKey,
    authDomain: process.env.FIREBASE_authDomain,
    databaseURL: process.env.FIREBASE_databaseURL,
    storageBucket: process.env.FIREBASE_storageBucket
});

const db = firebase.database();

const app = express();

const linebotParser = bot.parser();

app.get('/', function (req,res){
    res.send('hello world!');
});

app.post('/linewebhook', linebotParser);

try {
bot.on('message', function (event) {

    //判斷是否第一次發言，建立資料
    db.ref("/nodejs/user_id").child(event.source.userId).once("value", function(snapshot) {
        if (snapshot.val()==null){
            db.ref("/nodejs/user_id/"+event.source.userId).set({
                type: event.source.type,
                groupId: event.source.groupId || "null",
                name: "null",
                constellation: "null",
                subsciption: "null",
                yukisp4count: 0
            });
            console.log(event.source.userId+" data save!");
        }
    });

    //firebase
    if (typeof event.message.text !== 'undefined'){
        if (event.message.text.indexOf("!add")==-1){
            //讀取
            db.ref("/keywords").child(event.message.text).once("value", function(snapshot) {
                if (snapshot.val()!=null){
                    event.reply(snapshot.val());
                }
            });
        }else{
            //寫入
            var db_text = event.message.text.split(";",3);
            var arrData = {};
            arrData[db_text[1]] = db_text[2];
            db.ref("/keywords").update(arrData);
            event.reply("好喔~好喔~");
        }

        //修改自己名字
        if (event.message.text.indexOf("我叫")==0){
            //寫入
            var db_name = event.message.text.replace(/我叫/,"");
            db.ref("/nodejs/user_id/"+event.source.userId).update({name:db_name});
            event.reply("好喔~你叫 "+db_name);
        }
    }

    var star = ['牡羊今日運勢','金牛今日運勢','雙子今日運勢','巨蟹今日運勢','獅子今日運勢','處女今日運勢','天秤今日運勢','天蠍今日運勢','射手今日運勢','摩羯今日運勢','水瓶今日運勢','雙魚今日運勢'];
    var star_num = star.indexOf(event.message.text);
    if (star_num!=-1){
        request({
            url: "http://astro.click108.com.tw/daily_"+star_num+".php?iAcDay="+dateFormat(new Date(),'yyyy-mm-dd')+"&iAstro="+star_num,
            method: "GET"
        }, function(e,r,b) {
            var $ = cheerio.load(b);
            var result = [];
            var star_content = $("div.TODAY_CONTENT");
            event.reply($(star_content[0]).text());
        });
    }

    if (event.message.text=='test'){
        event.reply(event.message.text).then(function (data) {
            console.log('Success', data);
        }).catch(function (error) {
            console.log('Error', error);
        });
    }

    //現有指令查詢
    if (event.message.text=='/help'){
		var data = '現有指令：\n摩羯今日運勢\n等等吃啥\n又齊嫩\n===============\n!add;關鍵字;回應';
        event.reply(data);
    }

    //現有關鍵字
    if (event.message.text=='/help list'){
        db.ref("/keywords").once("value", function(snapshot) {
            var data = '現有關鍵字：\n';
            for (var key in snapshot.val()){
                data = data + key + '\n';
            }
            event.reply(data);
        });
	}
});
} catch (err) {}
  
app.listen(process.env.PORT || 8081, function (){
    console.log('LineBot is running.');
});
  