//学生查看实验报告和成绩的界面路由文件

var express = require('express'),
    router = express.Router(),
    Exp = require('../models/experiment.js'),
    Score = require('../models/score.js');
router.get('/', function (req, res) {
    if (req.cookies.islogin) {
        console.log('cookies:' + req.cookies.islogin);
        req.session.username = req.cookies.islogin;
    }
    if (req.session.username) {
        console.log('session:' + req.session.username);
        res.locals.username = req.session.username;
    }
    if (req.session.userrole) {
        console.log('role:' + req.session.userrole);
        res.locals.userrole = req.session.userrole;
    }
    else {
        res.redirect('/');
        return;
    }

    var courseid = 0;
    if (req.query != null) {
        if (req.query.courseid != null && req.query.courseid != -1)
            courseid = req.query.courseid;
    }
    try {
        Exp.getUserData(req.session.user_id, courseid, function (err, result1) {
            if (err) console.log('getUserData err:' + err);
            if (req.query != null) {
                if (req.query.year != null) year = req.query.year;
                else year =result1[0].year;
            }
            var yearDetail=[];
            for(var i=0;i<result1.length;i++){
                yearDetail.push(result1[i].year);
            }
            //此时取出的实验批次，是根据时间排序最近的批次
            Score.getOrdertimes(req.session.user_id, year, courseid, function (err, ordertimes) {
                if (err) console.log('getOrdertimes err:' + err);
                Score.getexp_timespanscore(req.session.user_id, year, courseid, function (err, exp) {
                    if (err) console.log('getexp_timespanscore err:' + err);
                    // console.log('查看实验报告的exp:' + exp);
                    Score.countAutoscore(req.session.user_id, year, courseid, function (err, score) {
                        if (err) console.log('countAutoscore err:' + err);
                        // console.log('查看实验报告的results:' + score);
                        Exp.getUserDataByYear(req.session.user_id, courseid,year, function (err, result) {
                            if (err) console.log('getUserDataByYear err:' + err);
                            res.render('lookupReport', { title: '查看实验报告', year:yearDetail,result: result, ordertimes: ordertimes, exp: exp, score: score });
                        });
                    })
                });
            });
        });
    }
    catch (e) {
        console.log("查看实验报告getUserData err");
        return res.end('页面加载异常');
    }
});

router.post('/show', function(req, res) {
    try {
        Exp.getUserData(req.session.user_id, courseid, function (err, result1) {
            if (err) console.log('getUserData err:' + err);
            var year = result1[0].year;
            var yearDetail=[];
            for(var i=result1.length-1;i>=0;i--){
                yearDetail.push(result1[i].year);
            }
            //此时取出的实验批次，是根据时间排序最近的批次
            Score.getOrdertimes(req.session.user_id, year, courseid, function (err, ordertimes) {
                if (err) console.log('getOrdertimes err:' + err);
                Score.getexp_timespanscore(req.session.user_id, year, courseid, function (err, exp) {
                    if (err) console.log('getexp_timespanscore err:' + err);
                    // console.log('查看实验报告的exp:' + exp);
                    Score.countAutoscore(req.session.user_id, year, courseid, function (err, score) {
                        if (err) console.log('countAutoscore err:' + err);
                        // console.log('查看实验报告的results:' + score);
                        Exp.getUserData(req.session.user_id, courseid, function (err, result) {
                            if (err) console.log('getUserData err:' + err);
                            res.render('lookupReport', { title: '查看实验报告', year:yearDetail,result: result, ordertimes: ordertimes, exp: exp, score: score });
                        });
                    })
                });
            });
        });
    }
    catch (e) {
        console.log("查看实验报告getUserData err");
        return res.end('页面加载异常');
    }
});
module.exports = router;